import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mic, Square } from "lucide-react";
import * as R from "remeda";
import type {
  ApiGameCreate,
  ApiGameSpeechDraft,
  ApiGameSpeechUnmatched,
} from "@poker-hub/db";
import {
  usePlayersQuery,
  useGroupsQuery,
  useCreateGameMutation,
  useCreateBuyInMutation,
  useFinalizeGameMutation,
  useParseGameSpeechMutation,
  useSpeechStatusQuery,
  useLocationsQuery,
} from "@/api/hooks";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LocationCombobox } from "@/components/LocationCombobox";
import {
  chipBalanceMessage,
  formatChipCount,
  parseChipValue,
} from "@/lib/chip-balance";
import { cn } from "@/lib/utils";
import {
  Container,
  Lockup,
  Grid,
  FormControl,
  Button,
  Input,
  Label,
  Checkbox,
} from "@poker-hub/design-system";

const MAX_RECORDING_MS = 3 * 60 * 1000;

const reviewSchema = z.object({
  groupId: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    return val;
  }, z.union([z.undefined(), z.string().uuid("Grupo inválido")])),
  date: z.coerce.date(),
  locationId: z.string().nullable(),
  buyIn: z.number().positive("Entrada deve ser positiva"),
  chipsPerPlayer: z.number().positive("Número de fichas é obrigatório"),
  playerIds: z
    .array(z.string().uuid())
    .min(1, "Selecione pelo menos um jogador"),
  extraBuyInCounts: z.record(z.string(), z.number().min(0)),
  cashOut: z.record(z.string(), z.number().min(0)),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

function pickRecorderMime(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function parseDraftDate(value: string | null): Date {
  if (!value) return new Date();
  const day = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [year, month, date] = day.split("-").map(Number);
    return new Date(year, month - 1, date);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extraBuyInCountsFromDraft(
  draft: ApiGameSpeechDraft,
): Record<string, number> {
  return R.pipe(
    draft.extraBuyIns,
    R.groupBy((row) => row.playerId),
    R.mapValues((rows) => rows.length),
  );
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function SpeakGamePage() {
  const { data: speechStatus } = useSpeechStatusQuery();
  const { data: players = [] } = usePlayersQuery();
  const { data: groups = [] } = useGroupsQuery();
  const { data: locations = [] } = useLocationsQuery();
  const parseMut = useParseGameSpeechMutation();
  const createGameMut = useCreateGameMutation();
  const createBuyInMut = useCreateBuyInMutation();
  const finalizeMut = useFinalizeGameMutation();
  const navigate = useNavigate();

  const [step, setStep] = useState<"record" | "review">("record");
  const [transcript, setTranscript] = useState("");
  const [unmatched, setUnmatched] = useState<ApiGameSpeechUnmatched>({
    players: [],
    locations: [],
    groups: [],
  });
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    control,
    reset,
    formState: { errors },
  } = useForm<ReviewFormData>({
    defaultValues: {
      groupId: "",
      date: new Date(),
      locationId: null,
      buyIn: 0,
      chipsPerPlayer: 0,
      playerIds: [],
      extraBuyInCounts: {},
      cashOut: {},
    },
    resolver: zodResolver(reviewSchema),
    mode: "onChange",
  });

  const selectedIds = watch("playerIds") ?? [];
  const extraBuyInCounts = useWatch({ control, name: "extraBuyInCounts" }) ?? {};
  const cashOutValues = useWatch({ control, name: "cashOut" }) ?? {};
  const chipsPerPlayer = parseChipValue(watch("chipsPerPlayer"));

  const extraCount = R.sumBy(selectedIds, (id) => {
    const count = extraBuyInCounts[id];
    return Number.isFinite(count) && count > 0 ? count : 0;
  });
  const expectedTotal = (selectedIds.length + extraCount) * chipsPerPlayer;
  const enteredTotal = R.sumBy(selectedIds, (id) =>
    parseChipValue(cashOutValues[id]),
  );
  const balance = chipBalanceMessage(enteredTotal, expectedTotal);
  const hasUnmatched =
    unmatched.players.length > 0 ||
    unmatched.locations.length > 0 ||
    unmatched.groups.length > 0;
  const canSave =
    balance?.tone === "ok" &&
    !hasUnmatched &&
    selectedIds.length > 0 &&
    chipsPerPlayer > 0;

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function applyDraft(draft: ApiGameSpeechDraft) {
    const counts = extraBuyInCountsFromDraft(draft);
    const cashOut = Object.fromEntries(
      R.map(draft.playerIds, (id) => [id, draft.cashOut[id] ?? 0]),
    );
    const extraDefaults = Object.fromEntries(
      R.map(draft.playerIds, (id) => [id, 0]),
    );
    reset({
      groupId: draft.groupId ?? "",
      date: parseDraftDate(draft.date),
      locationId: draft.locationId,
      buyIn: draft.buyIn ?? 0,
      chipsPerPlayer: draft.chipsPerPlayer ?? 0,
      playerIds: draft.playerIds,
      extraBuyInCounts: {
        ...extraDefaults,
        ...counts,
      },
      cashOut,
    });
  }

  async function sendAudio(blob: Blob) {
    try {
      const result = await parseMut.mutateAsync(blob);
      setTranscript(result.transcript);
      setUnmatched(result.unmatched);
      applyDraft(result.draft);
      setStep("review");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao interpretar o áudio",
      );
    }
  }

  async function startRecording() {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError("Microfone não disponível neste dispositivo.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickRecorderMime();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopTracks();
        clearTimer();
        setRecording(false);
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size === 0) {
          toast.error("Nada foi gravado. Tente de novo.");
          return;
        }
        void sendAudio(blob);
      };
      recorder.start();
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setElapsedMs(elapsed);
        if (elapsed >= MAX_RECORDING_MS) {
          stopRecording();
        }
      }, 200);
    } catch {
      setMicError("Permissão do microfone negada.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  const togglePlayer = (id: string) => {
    const current = getValues("playerIds") ?? [];
    const next = current.includes(id)
      ? R.filter(current, (x) => x !== id)
      : [...current, id];
    setValue("playerIds", next, { shouldValidate: true });
    if (!current.includes(id)) {
      const extras = getValues("extraBuyInCounts") ?? {};
      const cashOut = getValues("cashOut") ?? {};
      setValue("extraBuyInCounts", { ...extras, [id]: extras[id] ?? 0 });
      setValue("cashOut", { ...cashOut, [id]: cashOut[id] ?? 0 });
    }
  };

  const mapUnmatchedPlayer = (spoken: string, playerId: string) => {
    setUnmatched((prev) => ({
      ...prev,
      players: R.filter(prev.players, (name) => name !== spoken),
    }));
    const current = getValues("playerIds") ?? [];
    if (!current.includes(playerId)) {
      togglePlayer(playerId);
    }
  };

  const dismissUnmatched = (
    kind: keyof ApiGameSpeechUnmatched,
    spoken: string,
  ) => {
    setUnmatched((prev) => ({
      ...prev,
      [kind]: R.filter(prev[kind], (name) => name !== spoken),
    }));
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (!canSave) return;
    const payload: ApiGameCreate = {
      buyIn: data.buyIn,
      chipsPerPlayer: data.chipsPerPlayer,
      playerIds: data.playerIds,
      locationId: data.locationId ?? undefined,
      date: data.date.toISOString(),
    };
    if (data.groupId) payload.groupId = data.groupId;

    const extraBuyIns = R.flatMap(data.playerIds, (playerId) => {
      const count = Math.max(0, Math.floor(data.extraBuyInCounts[playerId] ?? 0));
      return Array.from({ length: count }, () => ({ playerId }));
    });

    const cashOut = Object.fromEntries(
      R.map(data.playerIds, (id) => [id, parseChipValue(data.cashOut[id])]),
    );

    setSaving(true);
    try {
      const created = await createGameMut.mutateAsync(payload);
      for (const extra of extraBuyIns) {
        await createBuyInMut.mutateAsync({
          gameId: created.id,
          body: extra,
        });
      }
      await finalizeMut.mutateAsync({
        gameId: created.id,
        body: { cashOut },
      });
      toast.success("Partida registrada e finalizada!");
      navigate({ to: "/history" });
    } catch {
      toast.error("Falha ao salvar a partida. Confira o histórico.");
    } finally {
      setSaving(false);
    }
  };

  if (speechStatus && !speechStatus.available) {
    return (
      <Container size="md">
        <Lockup>
          <Lockup.Title>Falar a partida</Lockup.Title>
          <Lockup.Subtitle>
            A chave Groq não está configurada. Use o formulário para registrar.
          </Lockup.Subtitle>
        </Lockup>
        <Button asChild variant="outline">
          <Link to="/new-game">Voltar ao formulário</Link>
        </Button>
      </Container>
    );
  }

  const unmappedPlayers = R.filter(
    players,
    (player) => !selectedIds.includes(player.id),
  );

  return (
    <Container size="md">
      <div className="flex items-start justify-between gap-4">
        <Lockup>
          <Lockup.Title>Falar a partida</Lockup.Title>
          <Lockup.Subtitle>
            Conte o que aconteceu. Depois revise e salve.
          </Lockup.Subtitle>
        </Lockup>
        <Button asChild variant="outline">
          <Link to="/new-game">Formulário</Link>
        </Button>
      </div>

      {step === "record" && (
        <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-8">
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Exemplo: “Hoje na casa do Pedro, buy-in 50 reais, mil fichas.
            Jogaram João, Maria e Ana. João fez um rebuy. Cash-out: João 1800,
            Maria 700, Ana 500.”
          </p>
          <button
            type="button"
            onClick={recording ? stopRecording : () => void startRecording()}
            disabled={parseMut.isPending}
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-full border-2 transition-colors",
              recording
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-primary bg-primary/10 text-primary hover:bg-primary/20",
            )}
            aria-label={recording ? "Parar gravação" : "Começar a gravar"}
          >
            {recording ? (
              <Square className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </button>
          <p className="tabular-nums text-lg font-medium">
            {recording
              ? formatElapsed(elapsedMs)
              : parseMut.isPending
                ? "Interpretando…"
                : "Toque para gravar"}
          </p>
          {micError && (
            <p className="text-sm text-destructive">{micError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Máximo de 3 minutos. Pare quando terminar de falar.
          </p>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Transcrição
            </p>
            <p className="mt-2 text-sm">{transcript || "—"}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setStep("record");
                setElapsedMs(0);
              }}
            >
              Gravar de novo
            </Button>
          </div>

          {(unmatched.players.length > 0 ||
            unmatched.locations.length > 0 ||
            unmatched.groups.length > 0) && (
            <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-medium">
                Nomes não reconhecidos — vincule ou ignore antes de salvar.
              </p>
              {unmatched.players.map((name) => (
                <div
                  key={`p-${name}`}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="text-sm">{name}</span>
                  <select
                    className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) {
                        mapUnmatchedPlayer(name, event.target.value);
                      }
                    }}
                  >
                    <option value="">Vincular a um jogador…</option>
                    {unmappedPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissUnmatched("players", name)}
                  >
                    Ignorar
                  </Button>
                </div>
              ))}
              {unmatched.locations.map((name) => (
                <div
                  key={`l-${name}`}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="text-sm">Local: {name}</span>
                  <select
                    className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) {
                        setValue("locationId", event.target.value);
                        dismissUnmatched("locations", name);
                      }
                    }}
                  >
                    <option value="">Vincular a um local…</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissUnmatched("locations", name)}
                  >
                    Ignorar
                  </Button>
                </div>
              ))}
              {unmatched.groups.map((name) => (
                <div
                  key={`g-${name}`}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="text-sm">Grupo: {name}</span>
                  <select
                    className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) {
                        setValue("groupId", event.target.value);
                        dismissUnmatched("groups", name);
                      }
                    }}
                  >
                    <option value="">Vincular a um grupo…</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissUnmatched("groups", name)}
                  >
                    Ignorar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Grid cols={2}>
            <FormControl label="Grupo" className="md:col-span-2">
              <select
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                {...register("groupId")}
                aria-invalid={!!errors.groupId}
              >
                <option value="">Automático (pelo elenco de jogadores)</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </FormControl>
            <FormControl label="Data">
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Input
                    type="date"
                    className="bg-card"
                    value={toDateInputValue(field.value)}
                    onChange={(event) =>
                      field.onChange(parseDraftDate(event.target.value))
                    }
                  />
                )}
              />
            </FormControl>
            <FormControl label="Local">
              <Controller
                name="locationId"
                control={control}
                render={({ field }) => (
                  <LocationCombobox
                    value={field.value}
                    onChange={(id) => {
                      field.onChange(id);
                      if (id && unmatched.locations.length > 0) {
                        setUnmatched((prev) => ({ ...prev, locations: [] }));
                      }
                    }}
                  />
                )}
              />
            </FormControl>
            <FormControl label="Entrada (R$)">
              <Input
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                {...register("buyIn", { valueAsNumber: true })}
                className="bg-card"
              />
              {errors.buyIn && (
                <p className="text-sm text-destructive">{errors.buyIn.message}</p>
              )}
            </FormControl>
            <FormControl label="Número de fichas">
              <Input
                type="number"
                inputMode="numeric"
                step={50}
                min={1}
                {...register("chipsPerPlayer", { valueAsNumber: true })}
                className="bg-card"
              />
              {errors.chipsPerPlayer && (
                <p className="text-sm text-destructive">
                  {errors.chipsPerPlayer.message}
                </p>
              )}
            </FormControl>
          </Grid>

          <div className="space-y-3">
            <Label className="text-base">Jogadores, rebuys e cash-out</Label>
            {errors.playerIds && (
              <p className="text-sm text-destructive">
                {errors.playerIds.message}
              </p>
            )}
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-center text-sm",
                balance?.tone === "ok"
                  ? "border-success/40 bg-success/10"
                  : "border-border bg-muted/40",
              )}
            >
              <p className="text-muted-foreground">
                Total informado:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatChipCount(enteredTotal)}
                </span>{" "}
                /{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatChipCount(expectedTotal)}
                </span>{" "}
                fichas
              </p>
              {balance && (
                <p
                  className={cn(
                    "mt-1 font-medium",
                    balance.tone === "ok" ? "text-success" : "text-destructive",
                  )}
                >
                  {balance.text}
                </p>
              )}
            </div>
            {players.map((player) => {
              const selected = selectedIds.includes(player.id);
              return (
                <div
                  key={player.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    selected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => togglePlayer(player.id)}
                    />
                    <PlayerAvatar name={player.name} size="sm" />
                    <span className="flex-1 font-medium">{player.name}</span>
                  </div>
                  {selected && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <FormControl label="Rebuys extras">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          className="bg-card"
                          {...register(`extraBuyInCounts.${player.id}`, {
                            valueAsNumber: true,
                          })}
                        />
                      </FormControl>
                      <FormControl label="Cash-out (fichas)">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          className="bg-card"
                          {...register(`cashOut.${player.id}`, {
                            valueAsNumber: true,
                          })}
                        />
                      </FormControl>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleSubmit(onSubmit)}
            className="w-full sm:w-auto"
            size="lg"
            disabled={saving || parseMut.isPending || !canSave}
          >
            {saving ? "Salvando…" : "Salvar partida"}
          </Button>
        </div>
      )}
    </Container>
  );
}
