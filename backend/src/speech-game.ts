import * as R from "remeda";
import {
  ApiGameSpeechDraftSchema,
  ApiGameSpeechParseResponseSchema,
  type ApiGameSpeechDraft,
  type ApiGameSpeechParseResponse,
  type ApiGameSpeechUnmatched,
} from "@poker-hub/db";
import { groqChatJson, groqTranscribe } from "./groq";

type CatalogEntry = { id: string; name: string };

type Catalogs = {
  players: CatalogEntry[];
  locations: CatalogEntry[];
  groups: CatalogEntry[];
};

const emptyDraft: ApiGameSpeechDraft = {
  date: null,
  buyIn: null,
  chipsPerPlayer: null,
  groupId: null,
  locationId: null,
  playerIds: [],
  extraBuyIns: [],
  cashOut: {},
};

function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseJsonContent(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  return JSON.parse(raw) as unknown;
}

function asObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function parseLooseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function asPositive(value: number | null): number | null {
  return value !== null && value > 0 ? value : null;
}

function asNonNegative(value: number | null): number | undefined {
  return value !== null && value >= 0 ? value : undefined;
}

function findByName(
  catalog: CatalogEntry[],
  spoken: string,
): CatalogEntry | undefined {
  const needle = normalizeName(spoken);
  if (!needle) return undefined;
  const exact = catalog.find((entry) => normalizeName(entry.name) === needle);
  if (exact) return exact;
  const firstNameHits = R.filter(
    catalog,
    (entry) => normalizeName(entry.name).split(/\s+/)[0] === needle,
  );
  return firstNameHits.length === 1 ? firstNameHits[0] : undefined;
}

function resolveId(
  raw: string | null | undefined,
  catalog: CatalogEntry[],
): string | null {
  if (!raw) return null;
  if (catalog.some((entry) => entry.id === raw)) return raw;
  return findByName(catalog, raw)?.id ?? null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return R.pipe(
    value,
    R.map((item) => (typeof item === "string" ? item.trim() : "")),
    R.filter((item) => item.length > 0),
  );
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

function collectPlayerMentions(
  obj: Record<string, unknown>,
  catalogs: Catalogs,
): {
  playerIds: string[];
  cashOut: Record<string, number>;
  extraBuyIns: { playerId: string; chips?: number }[];
  unmatchedPlayers: string[];
} {
  const playerIds: string[] = [];
  const cashOut: Record<string, number> = {};
  const extraBuyIns: { playerId: string; chips?: number }[] = [];
  const unmatchedPlayers: string[] = [];

  const addLabel = (label: string) => {
    const id = resolveId(label, catalogs.players);
    if (id) {
      playerIds.push(id);
      return id;
    }
    unmatchedPlayers.push(label);
    return null;
  };

  for (const label of stringList(obj.playerIds)) {
    addLabel(label);
  }

  const players = obj.players;
  if (Array.isArray(players)) {
    for (const row of players) {
      if (typeof row === "string") {
        addLabel(row);
        continue;
      }
      const rec = asObject(row);
      const label =
        pickString(rec, ["name", "playerId", "player", "id"]) ?? "";
      if (!label) continue;
      const id = addLabel(label);
      if (!id) continue;
      const cash = asNonNegative(
        parseLooseNumber(rec.cashOut ?? rec.cash_out ?? rec.chips),
      );
      if (cash !== undefined) cashOut[id] = cash;
      const extraCount = asNonNegative(
        parseLooseNumber(rec.extraBuyIns ?? rec.extra_buy_ins ?? rec.rebuys),
      );
      if (extraCount && extraCount > 0) {
        for (let i = 0; i < Math.floor(extraCount); i += 1) {
          extraBuyIns.push({ playerId: id });
        }
      }
    }
  }

  const cashOutRaw = obj.cashOut ?? obj.cash_out;
  if (cashOutRaw && typeof cashOutRaw === "object" && !Array.isArray(cashOutRaw)) {
    for (const [key, value] of Object.entries(asObject(cashOutRaw))) {
      const id = resolveId(key, catalogs.players);
      const amount = asNonNegative(parseLooseNumber(value));
      if (id && amount !== undefined) {
        playerIds.push(id);
        cashOut[id] = amount;
      } else if (!id) {
        unmatchedPlayers.push(key);
      }
    }
  }

  const extraRaw = obj.extraBuyIns ?? obj.extra_buy_ins;
  if (Array.isArray(extraRaw)) {
    for (const row of extraRaw) {
      const rec = asObject(row);
      const label =
        pickString(rec, ["playerId", "name", "player", "id"]) ?? "";
      const id = resolveId(label, catalogs.players);
      if (!id) continue;
      playerIds.push(id);
      const chips = asPositive(parseLooseNumber(rec.chips));
      extraBuyIns.push(chips ? { playerId: id, chips } : { playerId: id });
    }
  }

  return {
    playerIds: R.unique(playerIds),
    cashOut,
    extraBuyIns,
    unmatchedPlayers: R.unique(unmatchedPlayers),
  };
}

function sanitizeExtract(
  raw: unknown,
  catalogs: Catalogs,
): { draft: ApiGameSpeechDraft; unmatched: ApiGameSpeechUnmatched } {
  const obj = asObject(raw);
  const mentioned = collectPlayerMentions(obj, catalogs);

  const unmatchedLocations: string[] = [];
  let locationId = resolveId(
    pickString(obj, ["locationId", "location_id", "location"]),
    catalogs.locations,
  );
  for (const name of stringList(asObject(obj.unmatched).locations)) {
    const match = findByName(catalogs.locations, name);
    if (match) locationId = locationId ?? match.id;
    else unmatchedLocations.push(name);
  }
  const locationLabel = pickString(obj, ["location"]);
  if (!locationId && locationLabel) {
    const match = findByName(catalogs.locations, locationLabel);
    if (match) locationId = match.id;
    else unmatchedLocations.push(locationLabel);
  }

  const unmatchedGroups: string[] = [];
  let groupId = resolveId(
    pickString(obj, ["groupId", "group_id", "group"]),
    catalogs.groups,
  );
  for (const name of stringList(asObject(obj.unmatched).groups)) {
    const match = findByName(catalogs.groups, name);
    if (match) groupId = groupId ?? match.id;
    else unmatchedGroups.push(name);
  }
  const groupLabel = pickString(obj, ["group"]);
  if (!groupId && groupLabel) {
    const match = findByName(catalogs.groups, groupLabel);
    if (match) groupId = match.id;
    else unmatchedGroups.push(groupLabel);
  }

  for (const name of stringList(asObject(obj.unmatched).players)) {
    const match = findByName(catalogs.players, name);
    if (match) mentioned.playerIds.push(match.id);
    else mentioned.unmatchedPlayers.push(name);
  }

  const date = pickString(obj, ["date"]);
  const draftParsed = ApiGameSpeechDraftSchema.safeParse({
    date,
    buyIn: asPositive(parseLooseNumber(obj.buyIn ?? obj.buy_in)),
    chipsPerPlayer: asPositive(
      parseLooseNumber(obj.chipsPerPlayer ?? obj.chips_per_player),
    ),
    groupId,
    locationId,
    playerIds: R.unique(mentioned.playerIds),
    extraBuyIns: mentioned.extraBuyIns,
    cashOut: mentioned.cashOut,
  });

  return {
    draft: draftParsed.success ? draftParsed.data : emptyDraft,
    unmatched: {
      players: R.unique(mentioned.unmatchedPlayers),
      locations: R.unique(unmatchedLocations),
      groups: R.unique(unmatchedGroups),
    },
  };
}

function buildSystemPrompt(catalogs: Catalogs): string {
  return [
    "You extract a finished home poker session from a Portuguese transcript.",
    `Today's date in America/Sao_Paulo is ${todayInSaoPaulo()}.`,
    "Convert relative dates (hoje, ontem, sábado) to YYYY-MM-DD.",
    "buyIn is money in BRL. chipsPerPlayer and cashOut are chip counts, not money.",
    "Match people/places to the catalog names when possible. Use the spoken name if unsure.",
    "Never invent UUIDs. Prefer names over ids.",
    "extraBuyIns is how many extra rebuys after the initial stack (integer, default 0).",
    "Ignore first-person references like 'eu' unless a real name is given.",
    "Respond with a JSON object only, using this shape:",
    JSON.stringify({
      date: "YYYY-MM-DD or null",
      buyIn: 50,
      chipsPerPlayer: 1000,
      group: "catalog name or null",
      location: "catalog name or null",
      players: [
        { name: "catalog or spoken name", cashOut: 1200, extraBuyIns: 0 },
      ],
    }),
    `Player names: ${JSON.stringify(R.map(catalogs.players, (p) => p.name))}`,
    `Location names: ${JSON.stringify(R.map(catalogs.locations, (l) => l.name))}`,
    `Group names: ${JSON.stringify(R.map(catalogs.groups, (g) => g.name))}`,
  ].join("\n");
}

export async function parseGameSpeech(
  audio: File,
  catalogs: Catalogs,
): Promise<ApiGameSpeechParseResponse> {
  const transcript = await groqTranscribe(audio);
  if (!transcript) {
    throw new SpeechParseError("Empty transcript", 422);
  }

  let extracted: unknown = {};
  try {
    const content = await groqChatJson(
      buildSystemPrompt(catalogs),
      `Transcript:\n${transcript}`,
    );
    extracted = parseJsonContent(content);
  } catch (err) {
    console.error("Failed to extract game from transcript:", err);
    extracted = {};
  }

  const { draft, unmatched } = sanitizeExtract(extracted, catalogs);
  return ApiGameSpeechParseResponseSchema.parse({
    transcript,
    draft,
    unmatched,
  });
}

export class SpeechParseError extends Error {
  status: 422 | 502;
  constructor(message: string, status: 422 | 502) {
    super(message);
    this.status = status;
  }
}
