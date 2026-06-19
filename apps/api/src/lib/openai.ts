/**
 * OpenAI chat helper.
 *
 * Διαβάζει το κλειδί ΜΟΝΟ από το secret `env.OPENAI_API_KEY` — ποτέ
 * hardcoded. Αν δεν υπάρχει κλειδί ή αποτύχει η κλήση, επιστρέφει null
 * ώστε ο caller να κάνει fallback στο Cloudflare Workers AI.
 *
 * Το secret ορίζεται με:  wrangler secret put OPENAI_API_KEY --env production
 */
export async function openaiChat(
  env: { OPENAI_API_KEY?: string },
  prompt: string,
  opts: { system?: string; model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  const messages: { role: string; content: string }[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });
  return openaiChatMessages(env, messages, opts);
}

/**
 * Όπως το openaiChat αλλά δέχεται ολόκληρο messages array (system + history
 * + user) — για multi-turn chat (π.χ. AI Hiring Chat).
 */
export async function openaiChatMessages(
  env: { OPENAI_API_KEY?: string },
  messages: { role: string; content: string }[],
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  const key = env.OPENAI_API_KEY;
  if (!key) return null; // χωρίς secret → ο caller κάνει fallback

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: opts.model || 'gpt-4o-mini',
        messages,
        max_tokens: opts.maxTokens ?? 900,
        temperature: opts.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn('[openai] HTTP', res.status, detail.slice(0, 200));
      return null;
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content.trim() : null;
  } catch (err) {
    console.warn('[openai] error', err);
    return null;
  }
}
