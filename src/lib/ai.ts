import { AIProvider } from '../types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callAI(provider: AIProvider, apiKey: string, prompt: string) {
  const tries = [1000, 2000, 4000];

  for (let i = 0; i < tries.length; i += 1) {
    try {
      const req = getProviderRequest(provider, apiKey, prompt);
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body) });
      if (!res.ok && (res.status === 429 || res.status >= 500) && i < tries.length - 1) {
        await delay(tries[i]);
        continue;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return JSON.parse(extract(provider, data));
    } catch (error) {
      if (i === tries.length - 1) throw error;
      await delay(tries[i]);
    }
  }
  throw new Error('AI request failed');
}

function extract(provider: AIProvider, result: any): string {
  if (provider === 'gemini') return result.candidates[0].content.parts[0].text;
  if (provider === 'anthropic') return result.content[0].text;
  return result.choices[0].message.content;
}

function getProviderRequest(provider: AIProvider, key: string, prompt: string) {
  if (provider === 'gemini') {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      headers: { 'Content-Type': 'application/json' },
      body: { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.7 } }
    };
  }
  if (provider === 'groq') {
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.7 }
    };
  }
  if (provider === 'openai') {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.7 }
    };
  }
  return {
    url: 'https://api.anthropic.com/v1/messages',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: { model: 'claude-3-5-haiku-20241022', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }
  };
}
