let nextGeminiKeyIndex = 0;
function getGeminiKeys() {
  const numbered = Object.keys(process.env).filter(n => /^GEMINI_API_KEY_\d+$/.test(n))
    .sort((a,b) => Number(a.split('_').pop()) - Number(b.split('_').pop())).map(n => process.env[n]);
  const pooled = String(process.env.GEMINI_API_KEYS || '').split(/[\n,;]+/);
  return [...new Set([...pooled, process.env.GEMINI_API_KEY, ...numbered].map(v => String(v || '').trim()).filter(Boolean))];
}
async function generateAIText(messages, options = {}) {
  const keys = getGeminiKeys();
  const errors = [];
  if (keys.length) {
    const model = String(process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
    const systemText = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }]
    }));
    const body = { contents, generationConfig: {
      temperature: options.temperature ?? 0.2, maxOutputTokens: options.maxTokens ?? 1600,
      responseMimeType: 'application/json'
    }};
    if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };
    const start = nextGeminiKeyIndex % keys.length;
    for (let offset = 0; offset < keys.length; offset++) {
      const index = (start + offset) % keys.length;
      try {
        const response = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[index] },
          body: JSON.stringify(body), signal: AbortSignal.timeout(options.timeoutMs || 60000)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) { errors.push('Gemini key #' + (index + 1) + ' HTTP ' + response.status + ': ' + String(payload.error?.message || '').slice(0,160)); continue; }
        const output = (payload.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
        if (!output) { errors.push('Gemini key #' + (index + 1) + ' empty response'); continue; }
        nextGeminiKeyIndex = (index + 1) % keys.length;
        return output;
      } catch (e) { errors.push('Gemini key #' + (index + 1) + ': ' + e.message); }
    }
  }
  const endpoint = process.env.QUESTION_AI_API_URL, apiKey = process.env.QUESTION_AI_API_KEY;
  if (endpoint && apiKey) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: String(process.env.QUESTION_AI_MODEL || 'openai/gpt-oss-20b').trim(),
          temperature: options.temperature ?? 0.2, max_tokens: options.maxTokens ?? 1600,
          messages, response_format: { type: 'json_object' }}),
        signal: AbortSignal.timeout(options.timeoutMs || 60000)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Groq HTTP ' + response.status + ': ' + String(payload.error?.message || '').slice(0,200));
      const output = payload.choices?.[0]?.message?.content || '';
      if (!output) throw new Error('Groq returned empty response');
      return output;
    } catch (e) { errors.push(e.message); }
  }
  throw new Error('All AI keys/providers failed: ' + errors.join(' | '));
}
module.exports = { generateAIText, getGeminiKeys };
