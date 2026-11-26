# Govt Exam Quiz App - MERN + React Native

Complete Objective Quiz Application for Government Exams (SSC, Banking, UPSC, Railways, Defence etc.)

## Structure
- `backend/`     : Node.js + Express + MongoDB
- `admin/`       : React Admin Panel
- `mobile/`      : React Native (Expo) App

## Features (v2)
- **Home page**: Auto-sliding banners + Exam categories + Subjects grid
- **Admin**: Manage Categories (exams), Subjects, Syllabus/Topics, Questions, Banners
- Seed buttons for default Govt exams (SSC, Banking, UPSC, Railways...) and common subjects
- Questions linked to Category + Subject + optional Syllabus
- Mobile: Select exam → subjects → start quiz

## Setup

### 1. Backend
```bash
cd backend
npm install
npm run dev
```

Create admin:
```bash
curl -X POST http://localhost:5001/api/auth/setup
```

Default login: **admin@quiz.com** / **admin123**

### 2. Admin Panel
```bash
cd admin
npm install
npm start
```
Open http://localhost:3000

**First time steps in Admin:**
1. Go to **Categories** tab → click **Seed Govt Exams**
2. Go to **Subjects** tab → click **Seed Common Subjects**
3. Go to **Banners / Slider** → click **Seed Default Banners**
4. Add Syllabus (optional) and Questions

### 3. Mobile App
```bash
cd mobile
npm install
npx expo start
```

For production APKs, set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your deployed HTTPS backend URL. See `README-DEPLOYMENT.md`.

## API Endpoints

### Auth
- POST `/api/auth/login`
- POST `/api/auth/setup`

### Categories (Exams)
- GET `/api/categories`
- POST `/api/categories` (auth)
- PUT `/api/categories/:id` (auth)
- DELETE `/api/categories/:id` (auth)
- POST `/api/categories/seed` (auth)

### Subjects
- GET `/api/subjects?category=ID`
- POST `/api/subjects` (auth)
- PUT `/api/subjects/:id` (auth)
- DELETE `/api/subjects/:id` (auth)
- POST `/api/subjects/seed` (auth)

### Syllabus
- GET `/api/syllabus?subject=ID&category=ID`
- POST `/api/syllabus` (auth)
- PUT `/api/syllabus/:id` (auth)
- DELETE `/api/syllabus/:id` (auth)

### Banners (Slider)
- GET `/api/banners`
- POST `/api/banners` (auth)
- PUT `/api/banners/:id` (auth)
- DELETE `/api/banners/:id` (auth)
- POST `/api/banners/seed` (auth)

### Questions
- GET `/api/questions?category=ID&subject=ID&difficulty=Easy`
- POST `/api/questions` (auth)
- PUT `/api/questions/:id` (auth)
- DELETE `/api/questions/:id` (auth)


## Government Exam Modules (new feature branch)

The feature branch `feature/government-exam-modules` adds backend foundations for:
- Daily current affairs with Hindi/English language, topic, source URL/date and draft/published workflow.
- Government job alerts with official notification URL, application dates, admit-card/result links and admin CRUD.
- Mock tests with exam category, duration, positive/negative marking, admin CRUD, public test listing, answer-safe question delivery and server-side scoring.
- Optional PYQ provenance fields on questions (exam name, year, paper, language and PYQ flag); existing records remain valid.

### New API endpoints
- `GET /api/current-affairs?language=hi&topic=Economy&limit=30` (published only)
- `GET /api/current-affairs/admin/all` (admin)
- `POST/PUT/DELETE /api/current-affairs` (admin; update/delete use `:id`)
- `GET /api/job-alerts?category=ID` (published only)
- `GET /api/job-alerts/admin/all` and admin `POST/PUT/DELETE /api/job-alerts`
- `GET /api/mock-tests?category=ID` (published tests)
- `GET /api/mock-tests/:id` (published test, correct answers excluded)
- `POST /api/mock-tests/:id/submit` (server-side scoring and negative marking)
- Admin `GET /api/mock-tests/admin/all` and `POST/PUT/DELETE /api/mock-tests`

### Content quality and source policy
- Only publish current-affairs items after checking the source and answer; source name, URL and source date are stored.
- Job alerts should use the recruiting body's official notification URL and should be rechecked before publishing.
- A PYQ must be labelled as such only when its exam/year/paper provenance has been checked. Generic trivia or AI-generated questions must not be labelled PYQ.
- Current-affairs and job-alert records are not auto-populated with invented content; the admin endpoints are ready for verified editorial content.


### Mobile screens and admin management
- Mobile Home shortcuts now open Current Affairs, PYQ Bank, Mock Tests and Government Job Alerts.
- Current Affairs screen supports Hindi/English filters and displays published source metadata.
- PYQ Bank filters by exam name and year. It returns only questions marked both as previous-year questions and verified.
- Mock Test flow includes a countdown, question navigation, submit and server-side score calculation with negative marking.
- Job Alerts display official notification, application end date, admit-card and result links when supplied.
- Admin Dashboard has management tabs for Current Affairs, Job Alerts and Mock Tests. These module forms accept a complete JSON record (Edit JSON); keep new records in draft until checked, then set `status: "published"` or `isPublished: true`.

### PYQ verification
When creating or editing a question in Admin, fill Exam name, Exam year and Paper/shift, check "Actual previous-year question", and check "I verified this question against the original paper/source" only after checking the original paper. Generic/AI-generated practice questions must not be labelled PYQ.

### Important implementation limits
- Current Affairs and Job Alerts are editorial CMS modules; no unverified external feed is auto-published. Admin must enter and verify source-backed records.
- Student accounts now support email/password registration and login. Student tokens are separate from admin access; student tokens are explicitly rejected by admin middleware.
- Authenticated mock-test attempts are stored and power per-student accuracy/score analytics, weekly leaderboard rankings and wrong-question revision lists. Sign in from the mobile My Progress shortcut before taking mock tests to save history.
- The student token currently remains in memory for the active app session. Students may need to sign in again after closing/restarting the app; secure persistent token storage is still required for a production-ready remembered session.
- Mock-test start creates an authenticated server-side session with an expiry timestamp. Submission validates ownership, expiry and single-use session status; the API does not return correct answers. This is a basic server-enforced time limit, not a complete anti-cheat system.
- Hindi/English selection is implemented for Current Affairs; full app-wide localization and paired translations for every question and option still require translated content and admin entry.


### Production hardening follow-up
- Student JWTs are now stored with Expo SecureStore (Android Keystore-backed encryption / iOS Keychain) and restored before navigation opens. The My Progress screen validates the restored token with `GET /api/students/me` and supports sign out.
- App language preference (Hindi/English) is stored securely and shared across the main Home, quiz, result, current-affairs, PYQ, mock-test, job-alert and student-progress screens.
- Admin question editor supports optional Hindi question text, all Hindi options, and Hindi explanation. Hindi options must be complete or left blank; existing English-only questions remain compatible.
- Questions may store `questionHi`, `optionsHi`, and `explanationHi`. Job alerts may store `titleHi`, `organizationHi`, and `descriptionHi`. Mobile screens use Hindi content when supplied and fall back to English otherwise.
- Current Affairs still uses separate Hindi/English records. Content translations must be entered and reviewed by an editor; no machine-generated translation is labelled verified automatically.
- Expo SecureStore is pinned to the SDK 58-compatible `~58.0.3` package. CI uses Node 22.13.1, which is required by the Expo SDK 58 / React Native 0.88 toolchain.
- Remaining release gates: real-device Android/iOS sign-in and restart test, live MongoDB/API end-to-end tests, and editorial population/review of Hindi content. Automatic verified government vacancy/current-affairs ingestion is not enabled because the project has no confirmed official feed registry; unverified data must not be auto-published.
