# Government Exam Data Sources & 6-Hour Update Operations

This repository maintains an official-source discovery registry at `backend/data/government-exam-sources.json`.

## Coverage

- Central recruitment/exam bodies: SSC, UPSC, RRB, IBPS, SBI, RBI, NTA, CTET/CBSE, KVS, NVS, AFCAT, Indian Army, Indian Navy, UGC, NABARD, SEBI, PIB and Employment News.
- State Public Service Commissions: all 28 states, with source links cross-checked against the UPSC State PSC directory and the UPPSC State PSC directory.
- Union Territories: all 8 administrations are represented. UT recruitment is usually department-specific; the registry does not invent a separate PSC where none is listed.
- Additional state recruitment boards include selected major boards. Add other state police, staff selection, education, judicial and department boards after confirming their official portal.

## Six-hour schedule

GitHub Actions uses UTC cron. The question importer already runs at minute 17 every 6 hours. Current-affairs and job-alert imports are scheduled separately at minute 47 every 6 hours to spread load.

- `.github/workflows/question-auto-update.yml`: calls `POST /api/automation/import`.
- `.github/workflows/current-affairs-auto-update.yml`: calls `POST /api/automation/current-affairs/import` and `POST /api/automation/job-alerts/import`.

The schedule checks configured sources; it cannot import from every portal automatically merely because a portal URL is listed. Most exam portals expose HTML/PDF notices, not stable public RSS/JSON feeds. Their URLs are recorded for discovery and review; feed URLs remain empty until an actual supported, terms-permitted feed is verified.

## Configure in backend hosting

Set these variables on the backend deployment (never commit secrets):

- `MONGO_URI`, `JWT_SECRET`
- `QUESTION_IMPORT_SECRET`
- `QUESTION_API_URLS` or `QUESTION_SOURCE_URLS` only for permitted JSON question feeds
- `QUESTION_AI_API_URL`, `QUESTION_AI_API_KEY`, `QUESTION_AI_MODEL` only if using AI-generated practice; AI output is practice, not verified PYQ
- `CURRENT_AFFAIRS_FEED_URLS`, `CURRENT_AFFAIRS_ALLOWED_HOSTS`, `CURRENT_AFFAIRS_IMPORT_SECRET`
- `JOB_ALERT_FEED_URLS`, `JOB_ALERT_ALLOWED_HOSTS`, `JOB_ALERT_IMPORT_SECRET`

Set matching GitHub Actions secrets: `BACKEND_URL`, `QUESTION_IMPORT_SECRET`, `CURRENT_AFFAIRS_IMPORT_SECRET`, `JOB_ALERT_IMPORT_SECRET`.

For RSS/Atom feeds, put comma-separated HTTPS feed URLs in the corresponding `*_FEED_URLS` variable and exact hostnames in `*_ALLOWED_HOSTS`. Only configure a feed after confirming it is published by the authority, works without login, and its terms permit ingestion. Do not put normal homepage URLs into an RSS variable.

## Data handling rules

1. Every imported item must preserve source URL, publisher, published date, retrieval time and import status wherever the target schema supports them.
2. Official recruitment notices, current affairs and AI-generated questions remain drafts/unverified until reviewed.
3. PYQ requires exam, year, paper/shift and original source evidence. A question from a trivia API or AI model must never be labelled PYQ.
4. If an agency does not publish public question papers or answer keys, use licensed material or clearly labelled memory-based practice; never claim official provenance.
5. Do not scrape login-protected candidate dashboards, defeat CAPTCHAs, bypass rate limits, ingest leaked papers, or republish copyrighted paid-prep content without permission.
6. A successful workflow run means the configured importer executed. It does not mean every exam has new data or that all records are verified.

## Source references used to build the directory

- UPSC State Public Service Commissions: https://upsc.gov.in/state-public-service-commissions/
- UPPSC State PSC directory: https://uppsc.up.nic.in/OuterPages/Other_PSC.aspx
- SSC official portal: https://ssc.gov.in/
- UPSC examination notifications: https://upsc.gov.in/exam-notification/

Re-check each authority's portal and feed terms before enabling a new automated feed.

## Existing MongoDB collection inventory

The current backend models define these application collections (Mongoose uses the pluralized model names unless an explicit collection name is configured):

- `Admin`: administrator accounts.
- `Banner`: home-screen banners.
- `Category`: exam-family categories (UPSC, SSC, Banking, Railways, Defence, Teaching, State PSC, Police, Insurance, PSU & Others, Judicial, Engineering, Medical, Agriculture).
- `Subject`: subjects linked to categories.
- `Syllabus`: subject/category-linked syllabus chapters and topics.
- `Question`: practice questions and PYQ provenance/verification metadata.
- `QuestionImportRun`: question importer run history.
- `CurrentAffair`: bilingual current-affairs drafts and published items.
- `JobAlert`: recruitment/admit-card/result notice drafts.
- `MockTest`: mock-test definitions and scoring rules.
- `MockTestSession`: timed test sessions and submission state.
- `MockTestAttempt`: submitted test attempts and score summaries.
- `Student`: student accounts and profile/progress aggregates.
- `StudentTopicProgress`: student topic accuracy and adaptive-learning signals.
- `StudyPlan`: daily study plans and completion state.

The source registry is currently a version-controlled JSON discovery catalogue, not a MongoDB collection. The existing question importer requires category and subject records to exist before questions can be saved. It does not auto-create every state/exam category from the registry. Seed or add the required categories/subjects in Admin before enabling a new exam-specific question feed.

## Verified Current Affairs RSS fallbacks

The backend importer now always includes these official PIB Press Release feeds in addition to any URLs configured in `CURRENT_AFFAIRS_FEED_URLS`:

- English: https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3
- Hindi: https://pib.gov.in/RssMain.aspx?ModId=6&Lang=2&Regid=3

Both feed variants are listed in PIB's own RSS directory. The importer still validates HTTPS and the exact `pib.gov.in` hostname, retries transient fetch failures, and records each failed feed separately. Configured feed URLs are retained; the fallback feeds do not replace them.
