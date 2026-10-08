# Student Academic Assistant

**Student Academic Assistant** is a full-stack, AI-powered web application designed as an all-in-one academic companion for college and university students. It consolidates examination tracking, automated milestone reminders, weekly class timetables, hierarchical lecture notes, homework and assignment deadlines, peer study groups, and AI-assisted study planning into a single workspace.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Prerequisites](#5-prerequisites)
6. [Installation and Setup](#6-installation-and-setup)
7. [Environment Variables](#7-environment-variables)
8. [Running the Application](#8-running-the-application)
9. [Usage](#9-usage)
10. [Architecture / How It Works](#10-architecture--how-it-works)
11. [API and External Services](#11-api-and-external-services)
12. [Database](#12-database)
13. [Authentication and Authorization](#13-authentication-and-authorization)
14. [AI / LLM Integration](#14-ai--llm-integration)
15. [Scripts and Commands](#15-scripts-and-commands)
16. [Testing](#16-testing)
17. [Troubleshooting](#17-troubleshooting)
18. [Development / Contribution](#18-development--contribution)
19. [Known Limitations](#19-known-limitations)
20. [Security Considerations](#20-security-considerations)
21. [License](#21-license)

---

## 1. Project Overview

Students frequently split their academic workflow across separate calendar apps, note-taking tools, messaging groups, and AI chat interfaces. **Student Academic Assistant** solves this fragmentation by connecting a student's schedule, syllabus, notes, and deadlines inside one platform:

* **Centralized Daily View**: Automatically identifies the current day of the week to display today's scheduled classes, live exam countdowns, and prioritized task reminders.
* **Proactive Exam & Deadline Alerts**: Computes remaining days for every scheduled exam and task, generating automatic 7-day, 3-day, 1-day, and exam-day alerts as well as overdue and due-tomorrow task warnings.
* **Context-Aware AI Assistance**: Server-side integration with the Gemini API (`@google/genai`) powers an AI Notes Assistant, an AI Timetable Analyzer and Multimodal Schedule Extractor, a multi-subject AI Doubt Assistant, and an AI Study Planner.
* **Real-Time Persistence & Collaboration**: Uses Firebase Authentication (Google Sign-In) and Cloud Firestore with real-time `onSnapshot` synchronization for personal academic records and campus-wide student study groups.

---

## 2. Features

### Authentication & Student Profile
* **Google Sign-In**: Authenticates students via Firebase Authentication (`signInWithPopup` with `GoogleAuthProvider`).
* **Automatic Profile Initialization**: Creates a default student profile document in Firestore on first login and allows editing full name, current semester, institution, department/major, and target daily self-study hours.
* **One-Click Sample Semester Loader**: Populates a realistic set of classes for the current day, upcoming exams (at 3, 7, and 14 days out), assignments, Semester 1 lecture notes, and a sample study group for immediate exploration.

### Main Dashboard
* **Today's Timetable**: Automatically detects the current weekday and lists all scheduled periods in chronological order with start/end times, subjects, instructors, and classrooms.
* **Upcoming Examinations & Countdowns**: Displays upcoming exams sorted by urgency with live day countdowns.
* **Important Academic Reminders & Priority Queue**: Surfaces top urgent alerts across exams and pending/overdue tasks.
* **Assignments & Submissions Summary**: Lists active academic tasks with one-click completion toggling.
* **Quick Actions**: Provides direct navigation buttons for *Add Exam*, *Add Assignment*, *Add Note*, *View Timetable*, *Ask AI*, and *Open Groups*.

### Exam Management & Automated Reminder System
* **Exam Scheduling**: Record exam name, subject, date, time, optional location, syllabus/topics, and preparation notes.
* **Automatic Countdown Calculation**: Dynamically computes days remaining relative to the current date.
* **Milestone Reminder Controls**: Configurable per-exam toggles for automatic alerts at **7 days before**, **3 days before**, **1 day before**, and **Exam day**, enriched with counts of syllabus topics and matching subject notes.

### Assignments, Homework & Task Reminders
* **Task Creation**: Create tasks across categories (`Assignment`, `Homework`, `Lab Record`, `Project`, `Submission`, `Study Task`) with due date, due time, description, and priority (`High`, `Medium`, `Low`).
* **Temporal State Classification**: Automatically categorizes tasks into `Completed`, `Pending` (due within 2 days), `Upcoming`, and `Overdue`, with live search and segmented status filtering.

### Academic Notes & AI Notes Assistant
* **Hierarchical Organization**: Filter notes by `Semester` → `Subject` → `Topic` or search by keyword.
* **Document & File Attachments**: Import `.txt` and `.md` file contents directly into notes, or attach `.pdf` and image files (up to 240 KB encoded as Data URLs) for download and multimodal AI analysis.
* **AI Notes Assistant**: Analyze the active note with preset actions (*Explain this topic from my notes*, *What are the important points?*, *Summarize this topic*, *Create practice questions*) or ask custom questions grounded in the student's saved notes. AI responses can be saved directly as new notes.

### Timetable Management & AI Schedule Analysis
* **Manual Class Entry**: Add periods by day of week (`Monday`–`Sunday`), period number (`1`–`20`), start/end time, subject, teacher, and classroom.
* **Multimodal Timetable Upload & Extraction**: Upload a timetable image or PDF to automatically extract structured class periods via Gemini and batch-save them to Firestore.
* **AI Timetable Summary**: Generates a structured analysis of the student's weekly schedule, including a headline summary for today, key schedule observations, busiest day identification, and recommended self-study windows.

### Collaborative Student Groups
* **Campus Study Groups**: Create and browse shared academic groups (`visibility: 'campus'`) organized by subject and semester.
* **Resource Sharing & Pinning**: Share `Note`, `Study Material`, `Important Question`, `Announcement`, and `Discussion` posts, import personal notes directly into a group post, attach study files, and pin important posts.
* **Creator Management Controls**: Group creators can edit the pinned group announcement banner, delete any post within their group, or delete the group.
* **Save to Personal Notes**: Any group post can be saved directly into a student's private Notes collection in one click.

### AI Academic Doubt Assistant, Study Planner & Progress
* **AI Doubt Assistant**: Multi-turn academic tutor supporting subject focus areas (`General Academics`, `Programming`, `Mathematics`, `Physics`, `Chemistry`, `Electronics`, `Artificial Intelligence`, `Machine Learning`, `Computer Science`) with an optional toggle to include the student's saved notes as context.
* **Student Academic Progress**: Displays an overall task completion progress bar, metric cards (*Completed Tasks*, *Pending Tasks*, *Overdue Tasks*, *Upcoming Exams*), and subject-by-subject readiness breakdowns.
* **AI Study Planner**: Synthesizes upcoming exams, syllabus topics, pending tasks, weekly timetable slots, saved note topics, and target daily study hours into a smart recommendation alert, a ranked priority deadline list, and a day-by-day preparation schedule that can be saved to the student's account.

### Notification Center
* **Unified Alerts**: Combines live smart reminders (exam milestones and task deadlines) with persistent account notifications stored in Firestore (`Read`/`Unread` toggling and deletion).

---

## 3. Technology Stack

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `^7.0.2` | Type-safe frontend and backend implementation |
| **Frontend UI** | React / React DOM | `^19.0.1` | Component-based single-page application |
| **Styling** | Tailwind CSS (`@tailwindcss/vite`) | `^4.3.3` | Utility-first styling and responsive layout |
| **Icons** | Lucide React | `^0.546.0` | Functional UI iconography |
| **Animation Library** | Motion | `^12.23.24` | Installed UI animation dependency |
| **Backend Server** | Express | `^4.21.2` | REST API endpoints for Gemini AI and static/Vite serving |
| **Runtime & Loader** | Node.js / `tsx` | `^4.21.0` (`tsx`) | TypeScript execution for the Express server |
| **Database & Auth** | Firebase Web SDK (`firebase`) | `^13.0.0` | Firebase Authentication (Google OAuth) & Cloud Firestore |
| **AI / LLM SDK** | Google Gen AI SDK (`@google/genai`) | `^2.4.0` | Server-side calls to Gemini (`gemini-3.8-flash`) |
| **Build Tool** | Vite (`@vitejs/plugin-react`) | `^8.3.0` | Frontend bundling and dev middleware |
| **Security Linting** | ESLint + `@firebase/eslint-plugin-security-rules` | `^10.12.0` / `^0.0.2` | Static analysis for `firestore.rules` |

---

## 4. Project Structure

```text
/
├── .env.example                      # Template for environment variables
├── eslint.config.js                  # ESLint flat config for Firestore security rules
├── firebase-applet-config.json       # Firebase client project & database configuration
├── firebase-blueprint.json           # Entity JSON schemas and Firestore collection mappings
├── firestore.rules                   # Production Cloud Firestore security rules
├── firestore.rules.test.ts           # Security invariant verification suite ("Dirty Dozen")
├── index.html                        # HTML entry point and Google Fonts imports
├── metadata.json                     # Application metadata and capability declarations
├── package.json                      # Scripts and dependency manifest
├── security_spec.md                  # Data invariants and adversarial payload specification
├── server.ts                         # Express server, Gemini API routes, and Vite middleware
├── tsconfig.json                     # TypeScript compiler configuration
├── vite.config.ts                    # Vite bundler and React/Tailwind plugin configuration
└── src/
    ├── App.tsx                       # Root application shell, auth state, and Firestore listeners
    ├── firebase.ts                   # Firebase initialization, error handler, and input sanitizers
    ├── index.css                     # Tailwind CSS import and typography base styles
    ├── main.tsx                      # React DOM root mounting
    ├── types.ts                      # TypeScript interfaces for entities and navigation state
    ├── assets/
    │   └── images/                   # Local visual assets for welcome hero, avatar, and groups banner
    ├── components/
    │   ├── AiAssistantView.tsx       # AI Doubt Assistant, AI Study Planner, and Progress view
    │   ├── DashboardView.tsx         # Central student dashboard (today's timetable, exams, tasks)
    │   ├── ExamsView.tsx             # Examination scheduling, countdowns, and reminder toggles
    │   ├── GroupsView.tsx            # Campus study groups and resource sharing feed
    │   ├── NotesView.tsx             # Semester/subject/topic notes manager and AI Notes Assistant
    │   ├── NotificationsAndSettingsView.tsx # Notification Center and Student Profile settings
    │   ├── TasksView.tsx             # Assignments, homework, and deadline tracker
    │   └── TimetableView.tsx         # Weekly timetable manager, file extractor, and AI analyzer
    ├── services/
    │   └── firestoreService.ts       # Sanitized Firestore CRUD operations and sample data seeder
    └── utils/
        └── academicUtils.ts          # Date math, countdown formatters, and smart reminder engine
```

---

## 5. Prerequisites

* **Node.js**: ES2022 / ESM-compatible Node.js runtime (`@types/node` `^22.14.0` configured). Note that `npm start` executes `node server.ts` directly, which requires Node.js 22.6+ with native TypeScript strip-types support (or running via `npm run dev` using `tsx`).
* **Package Manager**: `npm` (or `bun`, as `bun.lock` is present in the repository).
* **Google Gemini API Key**: A valid `GEMINI_API_KEY` is required for the server-side AI endpoints in `server.ts`.
* **Firebase Project**: Configured via `firebase-applet-config.json` with Firebase Authentication (Google Sign-In enabled) and Cloud Firestore.

---

## 6. Installation and Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and provide your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `GEMINI_API_KEY` to your valid Google Gemini API key.

3. **Verify Firebase Configuration**:
   Ensure `firebase-applet-config.json` in the project root contains your Firebase project configuration (`projectId`, `appId`, `apiKey`, `authDomain`, and `firestoreDatabaseId`).

---

## 7. Environment Variables

The following environment variables are referenced in the repository:

| Variable | Required | Referenced In | Purpose |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Yes | `server.ts`, `.env.example` | Authenticates server-side requests to the Google Gemini API (`@google/genai`). |
| `NODE_ENV` | No | `server.ts` | When set to `production`, `server.ts` serves static assets from `dist/`; otherwise, it mounts Vite in middleware mode. |
| `DISABLE_HMR` | No | `vite.config.ts` | When set to `'true'`, disables Vite Hot Module Replacement and file watching in `vite.config.ts`. |
| `APP_URL` | No | `.env.example` | Base URL where the application is hosted. |

---

## 8. Running the Application

### Development Mode

Start the full-stack Express + Vite development server on port `3000`:

```bash
npm run dev
```

Once started, open:

```text
http://localhost:3000
```

### Production Build & Start

1. Build the frontend assets into the `dist/` directory:
   ```bash
   npm run build
   ```

2. Start the server in production mode:
   ```bash
   NODE_ENV=production npm start
   ```

### Type Checking / Linting

Run the TypeScript compiler check across the codebase:

```bash
npm run lint
```

---

## 9. Usage

1. **Launch & Sign In**:
   * Start the app with `npm run dev` and open `http://localhost:3000`.
   * Click **Sign In with Google to Open Dashboard** on the welcome screen.
2. **Initialize or Seed Your Semester**:
   * Upon first sign-in, your student profile is automatically created for `Semester 1`.
   * On an empty workspace, click **Load Sample Academic Schedule** on the Dashboard (or **Load Sample Academic Data** in **Settings**) to populate sample classes for today, upcoming exams, assignments, notes, and a study group—or enter your own records using the Quick Actions bar.
3. **Manage Daily Classes & Timetable**:
   * Open **Timetable** to add periods manually for any day of the week, or click **Upload Timetable Image/PDF** to extract class slots automatically using AI.
   * Click **AI Timetable Summary** to generate schedule observations and recommended self-study windows.
4. **Track Exams & Assignments**:
   * Open **Exams** to add upcoming exam dates, syllabi, and custom reminder milestones (`7d`, `3d`, `1d`, `Exam day`).
   * Open **Tasks** to log homework, assignments, lab records, or projects and toggle completion status as you finish them.
5. **Take Notes & Use the AI Notes Assistant**:
   * Open **Notes** to write lecture notes organized by *Semester → Subject → Topic* or attach study files (`.txt`, `.md`, `.pdf`, or images).
   * Select any note and click one of the **AI Notes Assistant** actions (*Explain*, *Important points*, *Summarize*, *Create practice questions*) or ask a custom question.
6. **Collaborate in Student Groups**:
   * Open **Groups** to create a campus study group, share notes or important exam questions, pin key resources, or save a classmate's shared note to your personal notes.
7. **Resolve Doubts & Generate Study Plans**:
   * Open **AI Assistant** to ask step-by-step academic questions, or switch to **Study Planner & Progress** to generate and save a personalized day-by-day exam revision plan.

---

## 10. Architecture / How It Works

The application follows a unified full-stack architecture served from a single port (`3000`):

```text
Browser Client (React 19 + Tailwind CSS)
  │
  ├──► Firebase Authentication (Google Sign-In via Popup)
  │
  ├──► Cloud Firestore (Real-time onSnapshot listeners & sanitized writes)
  │      └── Enforced by Zero-Trust ABAC rules in firestore.rules
  │
  └──► Express Backend API (server.ts on Port 3000)
         ├── POST /api/ai/assistant
         ├── POST /api/ai/notes-assistant
         ├── POST /api/ai/timetable-analysis
         ├── POST /api/ai/timetable-extract
         └── POST /api/ai/study-planner
               │
               └──► Google Gemini API (@google/genai, model: gemini-3.8-flash)
```

1. **Client Layer (`src/`)**: Manages UI state, attaches real-time `onSnapshot` listeners to Firestore collections when `authReady && currentUser` is satisfied, computes client-side countdowns and smart reminders (`src/utils/academicUtils.ts`), and sanitizes all outgoing payloads (`src/services/firestoreService.ts`).
2. **Server Layer (`server.ts`)**: Runs an Express server on `0.0.0.0:3000` with a `15mb` JSON payload limit (to support base64 image/PDF attachments for AI analysis). In development, it mounts Vite middleware (`server: { middlewareMode: true, hmr: false, watch: null }`); in production, it serves the compiled SPA from `dist/`.

---

## 11. API and External Services

All backend AI routes are defined in `server.ts` and accept/return JSON:

| Endpoint | Method | Purpose | Request Body Fields | Response Format |
| :--- | :--- | :--- | :--- | :--- |
| `/api/ai/assistant` | `POST` | Answers student academic questions with concept summary, walkthrough, takeaways, and self-check question. | `{ question, subject?, contextNotes?, history? }` | `{ answer: string }` |
| `/api/ai/notes-assistant` | `POST` | Explains, summarizes, extracts key points, or generates practice questions from selected notes and optional PDF/image attachments. | `{ mode, customPrompt?, notes, attachmentDataUrl?, attachmentType? }` | `{ result: string }` |
| `/api/ai/timetable-analysis` | `POST` | Analyzes weekly timetable slots and returns structured schedule insights. | `{ slots, currentDay? }` | `{ todaySummary, highlights: string[], studyWindows: string[], busiestDay }` |
| `/api/ai/timetable-extract` | `POST` | Extracts structured timetable slots from an uploaded image/PDF (`fileDataUrl`) or raw text. | `{ fileDataUrl?, mimeType?, rawText? }` | `{ slots: Array<{ day, periodNumber, startTime, endTime, subject, teacher, classroom }> }` |
| `/api/ai/study-planner` | `POST` | Generates a smart academic alert, prioritized deadline queue, and day-by-day study schedule. | `{ exams?, tasks?, timetable?, notesSummary?, dailyStudyHours?, focusExamId? }` | `{ planTitle, targetSubject, targetDate, smartAlert, prioritizedDeadlines, dailySchedule }` |

---

## 12. Database

The application uses **Cloud Firestore** (configured via `firebase-applet-config.json` and modeled in `firebase-blueprint.json`).

### Firestore Collections

| Collection Path | Entity Schema | Access Scope | Description |
| :--- | :--- | :--- | :--- |
| `/users/{userId}` | `UserProfile` | Private (`ownerId == request.auth.uid`) | Student academic profile (`displayName`, `institution`, `department`, `semester`, `targetStudyHoursPerDay`). |
| `/exams/{examId}` | `Exam` | Private (`ownerId == request.auth.uid`) | Scheduled exams, syllabus, notes, and milestone reminder flags (`remind7Days`, `remind3Days`, `remind1Day`, `remindExamDay`). |
| `/tasks/{taskId}` | `AcademicTask` | Private (`ownerId == request.auth.uid`) | Homework, assignments, lab records, projects, priority, due date/time, and `completed` boolean. |
| `/notes/{noteId}` | `Note` | Private (`ownerId == request.auth.uid`) | Academic notes organized by `semester`, `subject`, and `topic`, with optional file attachment fields. |
| `/timetable/{slotId}` | `TimetableSlot` | Private (`ownerId == request.auth.uid`) | Weekly class periods (`day`, `periodNumber`, `startTime`, `endTime`, `subject`, `teacher`, `classroom`). |
| `/studyPlans/{planId}` | `StudyPlan` | Private (`ownerId == request.auth.uid`) | Saved AI-generated study schedules (`title`, `subject`, `targetDate`, `planContent`). |
| `/notifications/{notificationId}` | `NotificationItem` | Private (`ownerId == request.auth.uid`) | Stored student notifications with `category` and `read` status. |
| `/groups/{groupId}` | `StudentGroup` | Campus-wide read (`visibility == 'campus'`), Owner update/delete | Collaborative student study groups with pinned announcements. |
| `/groups/{groupId}/posts/{postId}` | `GroupPost` | Group-scoped read (`groupId == groupId`), Author update, Author or Group Owner delete | Notes, study materials, important questions, announcements, and discussions shared inside a group. |

---

## 13. Authentication and Authorization

* **Provider**: Firebase Authentication using Google OAuth (`GoogleAuthProvider` and `signInWithPopup` in `src/App.tsx`).
* **Session Management**: Managed on the client via Firebase's `onAuthStateChanged` observer. Firestore listeners are only attached after `authReady` is true and `currentUser` is non-null.
* **Authorization Rules (`firestore.rules`)**:
  * Global default-deny fallback (`match /{document=**} { allow read, write: if false; }`).
  * All write operations (`create`, `update`, `delete`) require a signed-in user with a verified email (`request.auth.token.email_verified == true`).
  * Every entity is validated against a strict schema blueprint function (`isValid[Entity]`) enforcing exact keys (`hasAll` and `hasOnly`), data types, string length caps, regex ID validation (`^[a-zA-Z0-9_\-]+$`), immutable `ownerId` and `createdAt` fields, and server timestamp equality (`request.time`).

---

## 14. AI / LLM Integration

* **SDK & Model**: Uses the official `@google/genai` SDK on the server (`server.ts`) configured with model `gemini-3.8-flash`.
* **Server-Side Isolation**: The Gemini client is instantiated exclusively in `server.ts` using `process.env.GEMINI_API_KEY`. The browser client never imports `@google/genai` or accesses the API key directly.
* **Structured JSON & Multimodal Capabilities**:
  * Uses `responseMimeType: 'application/json'` and `responseSchema` (`Type.OBJECT` / `Type.ARRAY`) in `/api/ai/timetable-analysis`, `/api/ai/timetable-extract`, and `/api/ai/study-planner` to guarantee structured JSON responses.
  * Supports multimodal `inlineData` parts (`image/*` and `application/pdf`) in `/api/ai/notes-assistant` and `/api/ai/timetable-extract`.

---

## 15. Scripts and Commands

Defined in `package.json`:

| Command | Script | Description |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Starts the Express backend server and Vite middleware on `http://localhost:3000`. |
| `npm run build` | `vite build` | Bundles the React frontend into the `dist/` folder for production. |
| `npm start` | `node server.ts` | Runs `server.ts` directly with Node.js. |
| `npm run preview` | `vite preview` | Previews the built frontend bundle locally using Vite. |
| `npm run clean` | `rm -rf dist server.js` | Removes build artifacts. |
| `npm run lint` | `tsc --noEmit` | Runs TypeScript type checking across the project without emitting files. |

Additional verification commands supported by the repository configuration:

* **Lint Firestore Security Rules**:
  ```bash
  npx eslint firestore.rules
  ```
* **Run the Security Specification Assertion Suite**:
  ```bash
  npx tsx firestore.rules.test.ts
  ```

---

## 16. Testing

* **Security Rules Specification Suite (`firestore.rules.test.ts`)**: Contains zero-dependency TypeScript assertions (`runDirtyDozenSecuritySuite()`) corresponding to the 12 adversarial test cases documented in `security_spec.md` (unverified email rejection, cross-user `ownerId` spoofing, shadow field injection, `ownerId` mutation, forged timestamps, oversized string bounds, malformed document IDs, cross-user reads, orphaned subcollection writes, value poisoning, and cross-group post mismatches).
* **Static Rules Linting (`eslint.config.js`)**: Uses `@firebase/eslint-plugin-security-rules` (`flat/recommended`) to lint `firestore.rules`.

---

## 17. Troubleshooting

* **AI Features Return a 500 Error**:
  * Verify that `GEMINI_API_KEY` is set in your `.env` file or runtime environment and that the Express server (`server.ts`) is running (`npm run dev`).
* **Firestore Permission Denied Errors**:
  * All Firestore errors are caught by `handleFirestoreError` in `src/firebase.ts` and logged to the console as a structured JSON object (`FirestoreErrorInfo`) containing the `operationType`, `path`, and `authInfo` (including `emailVerified`).
  * Ensure your Google account has a verified email address (`emailVerified: true`) and that `firestore.rules` have been deployed to the target Firestore database.
* **File Upload Size Limits in Notes & Groups**:
  * Because Firestore documents have a 1 MB total size limit and `firestore.rules` enforces `attachmentDataUrl.size() <= 350000`, direct PDF/image attachments in **Notes** and **Groups** are capped at 240 KB on the client. For larger files, upload `.txt`/`.md` files or paste text excerpts into the note body.

---

## 18. Development / Contribution

* **Adding or Modifying Firestore Entities**:
  1. Update the entity schema and path definition in `firebase-blueprint.json`.
  2. Update the corresponding TypeScript interface in `src/types.ts`.
  3. Add or update sanitized CRUD helpers in `src/services/firestoreService.ts` using `sanitizeString()` and `serverTimestamp()`.
  4. Update the `isValid[Entity]` validation helper and `match` block in `firestore.rules`, then run `npx eslint firestore.rules` and `npm run lint`.
* **Adding New AI Endpoints**:
  * Define new server-side routes in `server.ts` using the shared `ai.models.generateContent` client and call them from React components via `fetch('/api/ai/...')`.

---

## 19. Known Limitations

* **Attachment Storage**: Study document attachments in Notes and Group Posts are stored inline as base64 Data URLs within Firestore documents (capped at 240 KB raw file size / 350,000 characters) rather than in an external object storage bucket.
* **Authentication Providers**: Only Google Sign-In (`GoogleAuthProvider` via popup) is enabled in the client authentication flow.

---

## 20. Security Considerations

* **API Key Protection**: `GEMINI_API_KEY` is accessed strictly inside `server.ts` and is never exposed to client-side code or bundled by Vite.
* **Zero-Trust Firestore Rules**: `firestore.rules` enforces verified emails on all writes, strict field allowlists (`hasAll` / `hasOnly` and `affectedKeys().hasOnly()`), string length bounds synchronized with `firebase-blueprint.json`, immutable ownership and creation timestamps, server-enforced timestamps (`request.time`), and `resource.data` filtering on all `list` queries.
* **PII Isolation**: User profile documents in `/users/{userId}` store only academic metadata (no email, phone number, or physical address) and restrict read access strictly to the document owner (`isOwner(userId)`).

---

## 21. License

Source files include the `Apache-2.0` SPDX license identifier (`SPDX-License-Identifier: Apache-2.0`).
