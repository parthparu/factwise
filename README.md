# FeverTrack

A prototype built for the **FactWise Junior TPM Campus Assessment** — a temperature tracking and discharge administration app for a virus quarantine & treatment facility.

**Live demo:** https://factwise-parth.vercel.app

## The problem

A quarantine facility with 74 beds needs nurses to measure every patient's temperature daily and doctors to visit every patient daily, but today it's all tracked on paper. Nobody can tell who's been measured, who's been visited, or who's ready to be discharged (patients are cleared after 3 consecutive fever-free days), and there's no way to track the facility's treatment success rate against an 85% benchmark.

## What this app does

Three role-based views, each scoped to what that role actually needs:

- **Nurse** — record a patient's vitals (temperature plus SpO2, heart rate, blood pressure, respiratory rate, AVPU), see who still needs today's reading, and page the attending doctor directly on a fever spike.
- **Doctor** — a daily rounds worklist, each patient's temperature trend and auto-computed fever-free streak, and discharge eligibility computed solely from the 3-day fever-free rule (per the brief — vitals beyond temperature are shown as informational context only, never gating).
- **Admin** — an interactive 74-bed floor map, a doctor-approved discharge queue that requires a second admin sign-off before a bed is freed, a facility-wide audit log, and CSV/report exports.

Business rules that aren't obvious from the screens (a missed day resets the fever-free streak rather than being skipped, discharge requires both doctor approval and admin confirmation, a bed can't be double-booked, etc.) are documented in the submitted assessment answers.

Demo data persists in the browser's `localStorage`, seeded with ~45 patients across a mix of states (stable, fever-spiking, discharge-ready, overdue). Use "Reset demo data" on the home page to restore the seed.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- No backend — state lives in `localStorage` via a React context (`src/lib/store.tsx`)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```

## Project structure

```
src/
  app/
    page.tsx          # role-selection landing page
    nurse/             # nurse roster + per-patient vitals entry
    doctor/             # doctor worklist + per-patient rounds/discharge
    admin/              # bed census, KPIs, audit log, patient intake
  components/           # shared Header, Badge
  lib/
    types.ts            # Patient, VitalsReading, DoctorVisit, PageEvent
    constants.ts         # fever threshold, discharge rule, capacity, etc.
    logic.ts              # pure business logic (streaks, eligibility, stats)
    store.tsx              # React context + localStorage persistence + seed data
```

## Deployment

Deployed on [Vercel](https://vercel.com). Any push to `main` redeploys automatically.
