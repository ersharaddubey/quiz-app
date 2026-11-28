# AI provider failover configuration

The backend supports automatic sequential failover for text-generation tasks used by:
- Automatic question generation
- Current-affairs MCQ drafting
- Government job-alert extraction

## Supported text providers

Configure one or more of these providers in the backend environment (local `.env` or Vercel **quiz-app-backend** Production variables):

| Provider | Key variables | Optional model variable |
|---|---|---|
| Gemini | `GEMINI_API_KEYS`, `GEMINI_API_KEY`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, ... | `GEMINI_MODEL` (default: `gemini-2.5-flash`) |
| OpenAI | `OPENAI_API_KEYS`, `OPENAI_API_KEY`, `OPENAI_API_KEY_1`, ... | `OPENAI_MODEL` (default: `gpt-4o-mini`) |
| Anthropic | `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY`, `ANTHROPIC_API_KEY_1`, ... | `ANTHROPIC_MODEL` (default: `claude-3-5-haiku-latest`) |
| Groq | `GROQ_API_KEYS`, `GROQ_API_KEY`, `GROQ_API_KEY_1`, ... | `GROQ_MODEL` (default: `llama-3.3-70b-versatile`) |
| Mistral | `MISTRAL_API_KEYS`, `MISTRAL_API_KEY`, `MISTRAL_API_KEY_1`, ... | `MISTRAL_MODEL` (default: `mistral-small-latest`) |
| Together | `TOGETHER_API_KEYS`, `TOGETHER_API_KEY`, `TOGETHER_API_KEY_1`, ... | `TOGETHER_MODEL` (default: `meta-llama/Llama-3.3-70B-Instruct-Turbo`) |

For a provider, the plural variable or singular variable accepts comma-, semicolon-, or newline-separated keys. Numbered variables are also supported. For example, use placeholders only in documentation:

```dotenv
GEMINI_API_KEYS=ROTATED_GEMINI_KEY_1,ROTATED_GEMINI_KEY_2
OPENAI_API_KEYS=ROTATED_OPENAI_KEY_1,ROTATED_OPENAI_KEY_2
GROQ_API_KEY=ROTATED_GROQ_KEY_1
ANTHROPIC_API_KEY=ROTATED_ANTHROPIC_KEY_1
MISTRAL_API_KEY=ROTATED_MISTRAL_KEY_1
TOGETHER_API_KEY=ROTATED_TOGETHER_KEY_1
AI_PROVIDER_ORDER=gemini,openai,anthropic,groq,mistral,together
```

The default order is Gemini, OpenAI, Anthropic, Groq, Mistral, Together, then the legacy `QUESTION_AI_API_URL` provider. Set `AI_PROVIDER_ORDER` to change the order.

## Failover behavior and limits

- Requests rotate the starting key within each provider.
- If a key/provider returns an HTTP error, network error, timeout, or empty response, the backend tries the next key and then the next provider.
- Keys are read only from environment variables; never commit real keys to Git.
- Multiple keys in the same cloud project/account may share quota. More keys do not create unlimited quota and cannot bypass provider billing or rate limits.
- Deepgram is a speech API; Replicate, fal.ai, Ideogram, and Stability are image-generation APIs. They are not text-model fallbacks for these three importers.
- Provider availability, model access, account billing, and model retirement remain controlled by each provider.

## Security

If a key was pasted into chat, committed to Git, or otherwise exposed, revoke it and create a replacement before adding it to the environment. Do not paste secrets into issues, logs, or chat.
