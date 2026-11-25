# Quiz App – deployment fixes

## Fixes included
- Removed hard-coded private LAN IP from the mobile API client.
- Admin API now uses `REACT_APP_API_URL` instead of production localhost.
- Added network diagnostics and 30-second API timeouts.
- Added `/api/health` with MongoDB readiness status.
- Backend connects to MongoDB before opening its HTTP port.
- Removed the original `.env` and its default credentials from this ZIP.
- Added environment templates, Vercel SPA rewrite, and Render Blueprint.
- Disabled Android cleartext HTTP traffic.

## Deploy
1. Create MongoDB Atlas database/user and copy its connection string. Configure Atlas Network Access for Render.
2. Deploy backend on Render using `render.yaml` (or root `backend`, build `npm install`, start `npm start`). Set `MONGO_URI`, strong `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `CORS_ORIGIN` (exact Vercel URL).
3. Test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`; expect HTTP 200 and `ok: true`, database connected. Free instances can sleep.
4. Create initial admin once with `POST https://YOUR-RENDER-SERVICE.onrender.com/api/auth/setup`. This existing route has no setup-key protection; use strong credentials and disable/remove it after first admin creation.
5. Deploy Vercel with root `admin`, framework Create React App, build `npm run build`, output `build`, env `REACT_APP_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`. Redeploy after env changes.
6. Before production APK build, create `mobile/.env` with `EXPO_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`, then run `cd mobile && npm install && npx expo prebuild --platform android && cd android && ./gradlew assembleDebug`.

Debug APK output: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. For Play Store/release distribution, configure a private release keystore first; this project currently uses its generated debug signing setup for release too.

## Local development
Android emulator uses `http://10.0.2.2:5001/api` in Expo development mode. A physical phone needs your Mac LAN IP in `EXPO_PUBLIC_API_URL` while on the same Wi-Fi. Production must use the deployed HTTPS URL. Admin local development defaults to `http://localhost:5001/api`.

## Important scope
This ZIP contains source/configuration changes only. It does not deploy cloud services, create Atlas, or compile an APK. A real backend HTTPS URL must be configured before building a production APK.

## Automatic question updates (every 6 hours)

This repository includes a GitHub Actions workflow at `.github/workflows/question-auto-update.yml`. It calls the backend importer on a six-hour schedule and can also be started from the Actions tab with **Run workflow**.

### Required GitHub Actions secrets

In GitHub → Settings → Secrets and variables → Actions, add:

- `BACKEND_URL`: backend origin only, for example `https://your-service.onrender.com` (no trailing `/api`).
- `QUESTION_IMPORT_SECRET`: a long random secret; set the exact same value in the backend environment.

### Required backend environment

- `QUESTION_IMPORT_SECRET`: same random secret as GitHub Actions.
- `QUESTION_SOURCE_URLS`: comma-separated HTTPS raw JSON URLs from GitHub question datasets you have permission to reuse.
- `QUESTION_API_URLS`: optional comma-separated free/public API endpoints that return the same normalized JSON format. Each URL must return either a JSON array or `{ "questions": [...] }` (or `results` / `data` arrays). Each question should use `question`, `options`, zero-based `correctAnswer`, `categoryName`, `subjectName`, and optional `difficulty`, `explanation`, `id`, `syllabusName`.
- `MONGO_URI`, `JWT_SECRET` and existing deployment variables remain required.

Optional AI generation (OpenAI-compatible Chat Completions endpoint; the model name is provider-specific):

- `QUESTION_AI_API_URL`
- `QUESTION_AI_API_KEY`
- `QUESTION_AI_MODEL` (required by the chosen provider; specify a model that your provider account can access)
- `QUESTION_AI_BATCH_SIZE` (optional; default 25, maximum 100)

If AI settings are omitted, the GitHub dataset importer still runs. No paid/free AI provider is bundled: provider access and its pricing/limits depend on the API key you configure. Do not point this at an API unless its terms allow automated question generation and commercial use.

### Import behaviour and safety

- Existing questions are not deleted or rewritten.
- New imports are automatically published into the existing Questions collection only when question shape, options, answer index, and exact existing active category/subject mapping pass validation.
- Unmatched categories/subjects and malformed records are skipped; this importer does not create categories or subjects implicitly.
- A normalized SHA-256 question hash and a partial unique MongoDB index prevent repeated imports while leaving legacy records untouched.
- `verified` remains `false`: structural validation is not independent fact-checking. Imported items are live per the requested auto-publish mode, so periodically review factual accuracy, explanations, source licensing, and current-affairs freshness.
- Import history is available at `GET /api/automation/history` (admin JWT required). An admin can trigger `POST /api/automation/run-now`.
- The scheduled endpoint is `POST /api/automation/import` and requires `x-question-import-secret`.

### Deploy checklist

1. Deploy the backend code and set the environment variables above.
2. Confirm the MongoDB user can create indexes (Mongoose creates the new partial unique index on startup).
3. Add the two GitHub Actions secrets.
4. Add at least one licensed JSON source URL. Configure AI variables if desired.
5. Open GitHub → Actions → **ExamFoundery automatic question update** → **Run workflow** for the first test.
6. Check the workflow log and `GET /api/automation/history` before relying on the six-hour schedule.

GitHub scheduled workflows run in UTC and may be delayed during high load. The schedule is `17 */6 * * *` (00:17, 06:17, 12:17, 18:17 UTC).

## Automatic question imports (6-hour schedule)

Set these environment variables on the backend deployment (Production):

```env
QUESTION_IMPORT_SECRET=<unique random value; generate with openssl rand -hex 32>
QUESTION_API_URLS=https://opentdb.com/api.php?amount=50&type=multiple&encode=url3986
QUESTION_DEFAULT_CATEGORY=SSC
QUESTION_AI_API_URL=https://api.groq.com/openai/v1/chat/completions
QUESTION_AI_API_KEY=<your own Groq API key>
QUESTION_AI_MODEL=openai/gpt-oss-20b
QUESTION_AI_BATCH_SIZE=25
```

The Open Trivia DB adapter handles its `results[]`, `correct_answer`, and
`incorrect_answers` fields, decodes URL-encoded text, shuffles options, and
maps its broad trivia categories to existing subjects. Since Open Trivia DB
is general trivia rather than Indian exam PYQs, those questions are assigned
to the configured `QUESTION_DEFAULT_CATEGORY` (default `SSC`) and mapped to
an existing subject such as General Knowledge, History, Geography, Polity,
Computer Awareness, Quantitative Aptitude, or General Science.

The AI importer reads the active category and subject names from MongoDB and
includes those exact pairs in its prompt. It skips any response whose category
or subject does not match an active record. AI-created and imported questions
are structurally validated and inserted automatically, but are marked
`verified: false`; structural checks cannot independently prove factual
correctness. Do not label generated/imported questions as official PYQs.

`QUESTION_SOURCE_URLS` is optional. Only add a comma-separated raw JSON URL
when the dataset is compatible with this importer and its licence permits
commercial redistribution/use. No fabricated dataset URL is required.

Add the same `QUESTION_IMPORT_SECRET` value to GitHub Actions repository
secrets, plus `BACKEND_URL` set to the deployed backend base URL. The workflow
runs every six hours and can also be started manually from the Actions tab.
