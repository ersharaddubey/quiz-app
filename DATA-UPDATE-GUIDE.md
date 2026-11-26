# Question Bank Data Update Guide

This guide defines the data format for adding exam practice questions and verified previous-year questions (PYQs) to Quiz App.

## 1. Before preparing data

1. In Admin, create/seed the exam categories and subjects first. The importer matches category and subject names exactly (case-insensitive); it does not create missing categories or subjects.
2. Use only question content that you own, have permission to use, or that is licensed for the intended use. Keep the original source/paper URL and exam details.
3. Never mark an AI-generated or generic-trivia question as a PYQ.
4. Imported questions are saved with `verified: false`. The importer preserves PYQ metadata but does not independently verify the paper, answer key, or translation. Admin review is required before a record can appear in the verified PYQ bank.
5. The general question endpoint currently includes imported practice questions even when `verified: false`; therefore use only quality-checked/licensed data sources for automatic imports. The verified PYQ endpoint filter requires both `isPreviousYearQuestion: true` and `verified: true`.

## 2. Supported exam categories

Seed categories include: UPSC, SSC, Banking, Railways, Defence, Teaching, State PSC, Police, Insurance, PSU & Others, Judicial, Engineering, Medical, Agriculture.

Common seeded subjects include: Quantitative Aptitude, Reasoning Ability, English Language, General Awareness, General Knowledge, Current Affairs, Computer Awareness, General Science, History, Geography, Polity, Economy.

Use the exact category/subject names shown in Admin. Different exams may use different subject sets.

## 3. JSON format for automated imports

Configure `QUESTION_SOURCE_URLS` (comma-separated HTTPS JSON URLs) or `QUESTION_API_URLS`. A source may return a JSON array, or an object containing `questions`, `results`, `data`, or `items`.

Example record (illustrative structure only; do not copy it as a real exam question):

```json
{
  "question": "Question text in English",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "categoryName": "SSC",
  "subjectName": "General Knowledge",
  "difficulty": "Medium",
  "explanation": "Answer explanation",
  "questionHi": "हिंदी में प्रश्न",
  "optionsHi": ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"],
  "explanationHi": "हिंदी में समाधान",
  "questionLanguage": "both",
  "examName": "SSC CGL",
  "examYear": 2025,
  "paperName": "Tier-I, Shift 1",
  "pyqSourceUrl": "https://official-or-authorized-source.example/paper.pdf",
  "isPreviousYearQuestion": true
}
```

Field rules:
- `question`: required, 8–1200 characters.
- `options`: 2–6 distinct non-empty strings.
- `correctAnswer`: zero-based index (first option is 0).
- `categoryName` and `subjectName`: required; must match existing active records.
- `difficulty`: Easy, Medium, or Hard (other values default to Medium).
- `optionsHi`: optional; must have the same number of entries as `options`, otherwise it is discarded.
- `questionLanguage`: `en`, `hi`, or `both`.
- PYQ provenance fields are preserved. Imported records always remain `verified: false`; an admin must check the original paper and answer key before marking them verified.
- For a non-PYQ practice question, omit PYQ fields or set `isPreviousYearQuestion` to false.

## 4. CSV template

Use `backend/data/question-bank-template.csv` as the column template. Keep `options` and `optionsHi` as JSON arrays inside their cells, and use zero-based `correctAnswer`. CSV upload is not currently a direct bulk-import endpoint; convert the validated rows to the JSON format above or provide the file for conversion before import.

## 5. What data to send for the first update

Please provide separate files/folders for:
- SSC: CGL, CHSL, MTS, GD, CPO (exam, year, tier/paper, shift)
- UPSC / State PSC: Prelims, subject and year
- Banking: IBPS PO/Clerk/SO, SBI PO/Clerk, RBI
- Railways: NTPC, Group D, ALP, JE
- Defence / Police: NDA, CDS, AFCAT, Agniveer, SI/Constable
- Teaching: CTET, State TET, KVS, NVS
- Current Affairs: date, topic, source URL, answer source
- Job alerts: recruiting body, official notification URL, application dates, source date

For every PYQ file, include the original paper/source URL and answer key. If a source does not provide an answer key, leave the answer unverified rather than guessing.

## 6. Safe first import checklist

1. Confirm the backend has the latest feature branch deployed.
2. Set `MONGO_URI`, `JWT_SECRET`, `QUESTION_IMPORT_SECRET`, and (if used) the question source / AI variables in backend hosting.
3. Add GitHub Actions secrets `BACKEND_URL` and `QUESTION_IMPORT_SECRET` with matching values.
4. Trigger the question import workflow manually once.
5. Check Admin → Automation import history for fetched, inserted, duplicate, skipped and error counts.
6. Review imported questions and correct answers. Verify PYQ source/year/paper independently before marking verified.
7. Do not treat importer success as factual verification or proof that every exam syllabus is covered.

Generate secrets locally with `openssl rand -hex 32`. Never paste production secrets into chat, GitHub source files, or data spreadsheets.
