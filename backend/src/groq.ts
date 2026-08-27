const GROQ_BASE = "https://api.groq.com/openai/v1";

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

function groqKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return key;
}

export async function groqTranscribe(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file, file.name || "recording.webm");
  body.append("model", "whisper-large-v3-turbo");
  body.append("language", "pt");
  body.append("response_format", "json");

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey()}` },
    body,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Groq transcription failed: ${err}`);
  }

  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

const DEFAULT_CHAT_MODELS = [
  process.env.GROQ_CHAT_MODEL?.trim(),
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
].filter((model): model is string => Boolean(model));

export async function groqChatJson(
  system: string,
  user: string,
): Promise<string> {
  let lastError = "Groq chat failed";
  for (const model of DEFAULT_CHAT_MODELS) {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      lastError = await res.text().catch(() => res.statusText);
      console.error(`Groq chat model ${model} failed:`, lastError);
      continue;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = (data.choices?.[0]?.message?.content ?? "").trim();
    if (content) return content;
    lastError = `Groq chat model ${model} returned empty content`;
    console.error(lastError);
  }
  throw new Error(lastError);
}
