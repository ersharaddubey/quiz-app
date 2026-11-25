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
- Mock-test countdown is currently enforced in the mobile client; server-side attempt/session expiry and student-account result history are not yet implemented.
- Per-student leaderboard, cloud progress analytics, study planner/reminders and an AI tutor require a student identity/profile system and/or a configured AI provider. They are not included in this first feature branch.
- Hindi/English selection is implemented for Current Affairs; app-wide translated UI and paired translations for all questions are not yet implemented.
