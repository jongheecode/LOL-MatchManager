import { GEMINI_API_KEY, GEMINI_MODEL } from './env.js';

export class GeminiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

interface GeminiCandidatePart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiCandidatePart[] } }[];
  promptFeedback?: { blockReason?: string };
}

/**
 * ONE Gemini generateContent call — no internal retry loop. Retry/budget/deadline are owned
 * entirely by the aiMatch orchestrator (a single shared attempt budget), so this function must
 * never loop. Structured output is forced via responseSchema + application/json.
 *
 * The API key goes in the `x-goog-api-key` header (never the URL query string).
 */
export async function callGeminiOnce<T>(
  system: string,
  user: string,
  schema: object,
  signal: AbortSignal,
): Promise<T> {
  if (!GEMINI_API_KEY) throw new GeminiError(401, 'GEMINI_API_KEY가 설정되지 않았습니다.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.2,
      maxOutputTokens: 1400,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    // Aborted (deadline) or network failure — surface as a retryable (non-4xx) error so the
    // orchestrator can decide, based on the shared deadline, whether any budget remains.
    throw new GeminiError(0, err instanceof Error ? err.message : 'network error');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new GeminiError(res.status, text);
  }

  const json = (await res.json()) as GeminiResponse;
  if (json.promptFeedback?.blockReason) {
    throw new GeminiError(422, `Gemini blocked: ${json.promptFeedback.blockReason}`);
  }
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new GeminiError(502, 'Gemini 응답이 비어 있습니다.');

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new GeminiError(502, 'Gemini 응답 JSON 파싱 실패');
  }
}

export type CallGeminiOnce = typeof callGeminiOnce;
