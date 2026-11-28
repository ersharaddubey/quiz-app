const rotation = new Map();

function readKeys(prefix) {
  const numbered = Object.keys(process.env)
    .filter(name => new RegExp('^' + prefix + '_API_KEY_\\d+$').test(name))
    .sort((a, b) => Number(a.match(/(\d+)$/)[1]) - Number(b.match(/(\d+)$/)[1]))
    .map(name => process.env[name]);
  const pooled = [process.env[prefix + '_API_KEYS'], process.env[prefix + '_API_KEY']]
    .flatMap(value => String(value || '').split(/[\n,;]+/));
  return [...new Set([...pooled, ...numbered]
    .map(value => String(value || '').trim()).filter(Boolean))];
}

function getProviderConfigs() {
  const configs = [];
  const add = (name, keys, model, endpoint, kind = 'openai') => {
    if (keys.length) configs.push({ name, keys, model, endpoint, kind });
  };
  add('gemini', readKeys('GEMINI'), String(process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
    'https://generativelanguage.googleapis.com/v1beta/models/', 'gemini');
  add('openai', readKeys('OPENAI'), String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
    String(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions').trim());
  add('anthropic', readKeys('ANTHROPIC'), String(process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest').trim(),
    String(process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1/messages').trim(), 'anthropic');
  add('groq', readKeys('GROQ'), String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim(),
    String(process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions').trim());
  add('mistral', readKeys('MISTRAL'), String(process.env.MISTRAL_MODEL || 'mistral-small-latest').trim(),
    String(process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1/chat/completions').trim());
  add('together', readKeys('TOGETHER'), String(process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo').trim(),
    String(process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1/chat/completions').trim());
  if (process.env.QUESTION_AI_API_URL && process.env.QUESTION_AI_API_KEY) {
    configs.push({ name: 'legacy', keys: [String(process.env.QUESTION_AI_API_KEY).trim()],
      model: String(process.env.QUESTION_AI_MODEL || 'openai/gpt-oss-20b').trim(),
      endpoint: String(process.env.QUESTION_AI_API_URL).trim(), kind: 'openai' });
  }
  const order = String(process.env.AI_PROVIDER_ORDER || 'gemini,openai,anthropic,groq,mistral,together,legacy')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return configs.sort((a, b) => {
    const ai = order.indexOf(a.name), bi = order.indexOf(b.name);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
}

function hasConfiguredAIProviders() {
  return getProviderConfigs().length > 0;
}

const keyCooldowns = new Map();

function parseDurationMs(value) {
  if (!value) return 0;
  const raw = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw) * 1000;
  let total = 0, match;
  const pattern = /(\d+(?:\.\d+)?)(ms|s|m|h)/g;
  while ((match = pattern.exec(raw))) {
    const factor = match[2] === 'h' ? 3600000 : match[2] === 'm' ? 60000 : match[2] === 's' ? 1000 : 1;
    total += Number(match[1]) * factor;
  }
  return total;
}
function getRetryAfterMs(response) {
  const value = response.headers.get('retry-after');
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(1000, date - Date.now());
  }
  const resets = ['x-ratelimit-reset-requests','x-ratelimit-reset-tokens','ratelimit-reset']
    .map(name => parseDurationMs(response.headers.get(name))).filter(ms => ms > 0);
  return resets.length ? Math.max(...resets) : 0;
}
function makeProviderError(response, payload) {
  const detail = String(payload.error?.message || payload.message || '').slice(0, 180);
  const error = new Error('HTTP ' + response.status + ': ' + detail);
  error.status = response.status;
  error.retryAfterMs = getRetryAfterMs(response);
  error.isQuotaError = response.status === 429 || response.status === 529 ||
    (response.status === 403 && /quota|rate.?limit|resource exhausted|billing limit/i.test(detail));
  return error;
}
function getProviderQuotaStatus() {
  const now = Date.now();
  return getProviderConfigs().map(config => ({
    provider: config.name, configuredKeys: config.keys.length,
    keys: config.keys.map((_, index) => {
      const until = keyCooldowns.get(config.name + ':' + index) || 0;
      return { keyIndex: index + 1, available: until <= now,
        retryAfterSeconds: until > now ? Math.ceil((until - now) / 1000) : 0 };
    })
  }));
}

function extractJsonText(text) {
  return String(text || '').trim().replace(/^\x60{3}(?:json)?\s*/i, '').replace(/\s*\x60{3}$/, '');
}

async function callProvider(config, apiKey, messages, options) {
  const timeout = options.timeoutMs || 60000;
  if (config.kind === 'gemini') {
    const systemText = messages.filter(message => message.role === 'system').map(message => message.content).join('\n\n');
    const contents = messages.filter(message => message.role !== 'system').map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(message.content || '') }]
    }));
    const response = await fetch(config.endpoint + encodeURIComponent(config.model) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents, generationConfig: {
        temperature: options.temperature ?? 0.2, maxOutputTokens: options.maxTokens ?? 1600,
        responseMimeType: 'application/json'
      }, ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}) }),
      signal: AbortSignal.timeout(timeout)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw makeProviderError(response, payload);
    const output = (payload.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('').trim();
    if (!output) throw new Error('empty response');
    return output;
  }

  if (config.kind === 'anthropic') {
    const system = messages.filter(message => message.role === 'system').map(message => message.content).join('\n\n');
    const conversation = messages.filter(message => message.role !== 'system').map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user', content: String(message.content || '')
    }));
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey,
        'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: config.model, max_tokens: options.maxTokens ?? 1600,
        temperature: options.temperature ?? 0.2, ...(system ? { system } : {}), messages: conversation }),
      signal: AbortSignal.timeout(timeout)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw makeProviderError(response, payload);
    const output = (payload.content || []).filter(part => part.type === 'text').map(part => part.text).join('').trim();
    if (!output) throw new Error('empty response');
    return output;
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages,
      temperature: options.temperature ?? 0.2, max_tokens: options.maxTokens ?? 1600,
      response_format: { type: 'json_object' } }),
    signal: AbortSignal.timeout(timeout)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw makeProviderError(response, payload);
  const output = payload.choices?.[0]?.message?.content || '';
  if (!output) throw new Error('empty response');
  return output;
}

async function generateAIText(messages, options = {}) {
  const errors = [];
  let earliestRetryAt = 0;
  for (const config of getProviderConfigs()) {
    const start = (rotation.get(config.name) || 0) % config.keys.length;
    for (let offset = 0; offset < config.keys.length; offset++) {
      const index = (start + offset) % config.keys.length;
      const stateKey = config.name + ':' + index;
      const cooldownUntil = keyCooldowns.get(stateKey) || 0;
      if (cooldownUntil > Date.now()) {
        earliestRetryAt = !earliestRetryAt ? cooldownUntil : Math.min(earliestRetryAt, cooldownUntil);
        errors.push(config.name + ' key #' + (index + 1) + ': cooling down');
        continue;
      }
      if (cooldownUntil) keyCooldowns.delete(stateKey);
      try {
        const output = await callProvider(config, config.keys[index], messages, options);
        rotation.set(config.name, (index + 1) % config.keys.length);
        keyCooldowns.delete(stateKey);
        return extractJsonText(output);
      } catch (error) {
        const retryMs = error.retryAfterMs || (error.isQuotaError ? 60000 :
          (error.status === 503 || error.status === 529 ? 15000 : 0));
        if (retryMs > 0) {
          const until = Date.now() + Math.min(retryMs, 86400000);
          keyCooldowns.set(stateKey, until);
          earliestRetryAt = !earliestRetryAt ? until : Math.min(earliestRetryAt, until);
        }
        errors.push(config.name + ' key #' + (index + 1) + ': ' + String(error.message || error).slice(0, 220));
      }
    }
  }
  const waitSeconds = earliestRetryAt ? Math.max(1, Math.ceil((earliestRetryAt - Date.now()) / 1000)) : 0;
  const error = new Error('All configured AI providers/keys failed or are rate-limited. ' +
    (waitSeconds ? 'Retry after approximately ' + waitSeconds + ' seconds. ' : '') +
    (errors.join(' | ') || 'no provider keys configured'));
  error.retryAfterSeconds = waitSeconds;
  throw error;
}

module.exports = { generateAIText, getProviderConfigs, hasConfiguredAIProviders, readKeys, getProviderQuotaStatus };
