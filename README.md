# Smart Academic Timetable — Backend (Student Module)

This is the student-facing half of the backend. It's built so the admin
module (built later) plugs into the exact same database and models —
anything an admin creates, updates, marks complete, or cancels shows up
instantly on the student side with no extra wiring.

## Setup

1. Install dependencies:
   ```
   cd backend
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — any long random string
   - `FIREBASE_SERVICE_ACCOUNT` — needed later for push notifications, can be left blank for now

3. Run it:
   ```
   npm run dev
   ```
   Server starts on `http://localhost:5000` (or whatever `PORT` you set).

## Data model notes

- **Department is hardcoded to "Computer Science"** for now. The register
  endpoint auto-creates that department in the DB the first time it's
  needed, so you don't have to seed it manually. When the admin module is
  built and more departments are added, nothing here needs to change.
- **Login is by matric number, not email.** Email is still stored (useful
  later for things like password reset), but `matricNumber` is what's used
  to authenticate.
- **Status field on Timetable** (`Pending`, `Ongoing`, `Cancelled`,
  `Completed`) is meant to be set by the admin side. The student dashboard
  just reads whatever value is there — it doesn't compute status itself.
- **History is a separate collection**, not just "old timetable entries."
  The intent (per the spec) is that when the admin taps "Complete" on a
  lecture, that action creates a new `History` document (with an optional
  PDF/image attachment) rather than just flipping a status flag — so the
  history record can carry its own attachment and exact date without
  disturbing the recurring weekly timetable entry.

## API Reference

### Auth

**POST `/api/auth/register`**
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "matricNumber": "CSC/2021/045",
  "level": 300,
  "semester": "First",
  "password": "yourpassword"
}
```
Department is not sent — it's fixed to Computer Science on the backend.

**POST `/api/auth/login`**
```json
{
  "matricNumber": "CSC/2021/045",
  "password": "yourpassword"
}
```
Both return a JWT in `data.token`. Send it on every request below as:
```
Authorization: Bearer <token>
```

### Student (all require the header above)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/student/dashboard` | Today's classes (course code, title, lecturer, venue, time, status) |
| GET | `/api/student/timetable` | Full Mon–Fri timetable, grouped by day, plus current date |
| GET | `/api/student/history` | Completed classes, each with optional PDF/image attachment |
| GET | `/api/student/tests-exams` | Upcoming tests/exams |
| GET | `/api/student/profile` | Logged-in student's profile |
| PUT | `/api/student/profile` | Update fullName, email, password, or fcmToken |

## Admin module

The admin side writes to the exact same collections the student side reads
from — there's no sync step, no separate database. The instant an admin
creates or edits something, it's visible to matching students on their next
request.

### Admin Auth

**POST `/api/admin/auth/register`**
```json
{
  "fullName": "Dr. Adeyemi",
  "email": "admin@example.com",
  "password": "yourpassword",
  "registrationKey": "must match ADMIN_REGISTRATION_KEY in .env"
}
```
Registration is locked behind `ADMIN_REGISTRATION_KEY` so students can't
self-register as admins. **The system only allows one admin account** —
once it's created, `/api/admin/auth/register` permanently rejects further
attempts, even with the correct key. If you ever need to change who the
admin is, that has to be done directly in the database (update the existing
admin's email/password, or delete the one admin document and re-register).

**POST `/api/admin/auth/login`**
```json
{ "email": "admin@example.com", "password": "yourpassword" }
```
Admins log in with email + password (students use matricNumber). Both
return a JWT — send it as `Authorization: Bearer <token>` on every route below.

### Admin routes (all require the admin JWT)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/admin/departments` | Create a department |
| GET | `/api/admin/departments` | List departments |
| POST | `/api/admin/timetable` | Create a timetable entry — instantly visible to matching students |
| GET | `/api/admin/timetable` | List entries (filter with `?department=&level=&semester=&day=`) |
| PUT | `/api/admin/timetable/:id` | Edit an entry |
| DELETE | `/api/admin/timetable/:id` | Delete an entry |
| PATCH | `/api/admin/timetable/:id/status` | Set status to `Pending`/`Ongoing`/`Cancelled` — this is what makes the student dashboard update live |
| POST | `/api/admin/timetable/:id/complete` | Marks complete: creates a `History` record (optionally with a PDF/image attached via the `file` form field), then resets the entry to `Pending` for its next weekly occurrence |
| POST | `/api/admin/tests-exams` | Create a test/exam entry |
| GET | `/api/admin/tests-exams` | List tests/exams (same filters as timetable) |
| PUT | `/api/admin/tests-exams/:id` | Edit |
| DELETE | `/api/admin/tests-exams/:id` | Delete |
| GET | `/api/admin/history` | View all completed-class records (audit view) |

### How "Mark Complete" actually behaves

Timetable entries are recurring (they just say "Monday, 10:00–12:00", not a
specific date). So marking one complete doesn't delete or permanently
change it — it:

1. Creates a new `History` document stamped with today's actual date, the
   class details, and the attachment if one was uploaded.
2. Resets that timetable entry's `status` back to `Pending`, so next Monday
   it shows up as a normal upcoming class again, not stuck as "Completed."

The student's History screen reads from the `History` collection directly,
independent of the recurring timetable.

### Uploaded files

Files uploaded via `/api/admin/timetable/:id/complete` (field name `file`,
PDF/JPG/PNG, 10MB max) are saved to `backend/uploads/` and served at
`http://localhost:5000/uploads/<filename>` — that's the exact URL stored in
`History.attachment.url` and read by the student side.

## What's intentionally not built yet

- **Push notification delivery** (the `Alert` model exists, but the cron job
  that checks `notifyAt` and calls Firebase hasn't been wired up yet).
- **Automatic status transitions** — status (`Pending` → `Ongoing`) is set
  manually by the admin via the status route, not on a timer. If you want
  it to flip to "Ongoing" automatically at `startTime`, that's a small
  cron job addition, not a schema change.
- **Admin management of other admins** (e.g. an admin dashboard listing all
  admin accounts) — not requested yet.
