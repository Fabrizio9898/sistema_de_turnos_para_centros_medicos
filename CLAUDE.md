# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Multi-tenant clinic appointment backend: NestJS 11 on Fastify, TypeORM, PostgreSQL 16, TypeScript. Single package (pnpm), no monorepo. The README is in Spanish and has a step-by-step local setup plus SQL to seed a test clinic.

## Commands

```bash
docker compose up -d          # Postgres 16 on localhost:5432 (db clinic_backend, postgres/postgres)
cp .env.example .env          # DATABASE_URL, API_KEY_PEPPER, PORT, CORS_ORIGIN
pnpm install
pnpm run migration:run        # also migration:generate / migration:revert (via src/data-source.ts)
pnpm run start:dev            # watch mode; health check at GET /api/v1/health

pnpm run lint                 # eslint, --max-warnings 0
pnpm run typecheck
pnpm test                     # unit tests: src/**/*.spec.ts
pnpm test -- src/appointments/appointment.service.spec.ts   # single file
pnpm test -- -t "throws NotFoundException"                  # single test by name
pnpm run test:e2e             # test/**/*.e2e.spec.ts, needs DATABASE_URL
```

The e2e test (`test/migrations/init-schema.e2e.spec.ts`) runs `DELETE FROM` on clinics, doctors, patients, services and appointments. Don't point it at a database whose data you want to keep.

## Architecture

- **Bootstrap (`src/main.ts`)**: global prefix `api/v1`, a global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted` + `transform` (unknown body or query fields are rejected), CORS from `CORS_ORIGIN` (comma-separated), and pino logging.
- **Tenancy and auth (`src/auth/`)**: `ApiKeyGuard` is registered globally as `APP_GUARD`, so every route needs an `x-api-key` header unless it has `@Public()`. The guard hashes the key as `sha256(key + API_KEY_PEPPER)`, looks up `clinics.api_key_hash` and attaches the full `Clinic` entity to `request.clinic`. Controllers get it through `@CurrentClinic()`. **Every service query has to filter by `clinicId`**, because nothing else isolates tenants on reads. On writes, composite FKs (migration `EnforceSameClinicReferences`) make the DB reject a row whose doctor, patient, service or specialty belongs to another clinic, and an appointment whose service belongs to another doctor. A new table that references a clinic-owned row should add the same `(x_id, clinic_id)` FK. Read env vars lazily (inside functions), not at module top level: modules are imported before `ConfigModule` loads `.env`.
- **Modules**: one feature module per folder (`catalog`, `availability`, `appointments`, `patients`, `webhook`, `health`). Each folder holds its controllers, service, DTO classes and `*.spec.ts`. Several controllers share the `doctors` prefix (`catalog/doctor.controller.ts` for `/services`, `availability` for `/slots`). All entities live in `src/entities/`.
- **Two entity registrations**: the app uses `autoLoadEntities` through each module's `TypeOrmModule.forFeature`. The TypeORM CLI uses the explicit entity list in `src/data-source.ts`. When you add an entity, update both. `synchronize` is off, so every schema change needs a migration in `src/database/migrations/`.
- **Booking validation (two layers)**:
  1. `AvailabilityService.assertBookable` runs before every create and reschedule. It checks that the time is in the future, that `[startsAt, startsAt + durationMin)` fits inside one of the doctor's working windows, and that there is no overlapping `time_off` or non-cancelled appointment. On reschedule, pass the appointment's own id so it doesn't count as a conflict.
  2. A Postgres `EXCLUDE USING gist` constraint (`no_double_booking`) on `(doctor_id, tstzrange(starts_at, ends_at))` where `status <> 'cancelled'` is the final guard against concurrent requests. `AppointmentService.saveOrConflict` turns error `23P01` into a 409.
  
  Bookings don't have to land on the `/slots` grid.
- **Time handling**: every column is `timestamptz` (UTC). `availability_rules` hold a weekday (`0` = Sunday) and local `time` values. There can be several rules (windows) per day. Postgres returns times as `HH:mm:ss`, and `24:00` is valid. Get a date's weekday from the calendar date (`dayOfWeek()`, via `getUTCDay`), never by converting midnight between timezones. Local→UTC conversion uses `clinic.timezone` with `date-fns-tz`. `/slots` omits slots that have already started.
- **Required patient fields**: `clinics.patient_required_fields` and `doctors.patient_required_fields` (`text[]`) are combined, then checked at booking time through `missingPatientFields()`. A missing field returns 422 `{ missingFields }`. `GET /doctors/:id/services` exposes the combined list so the bot can collect the fields first. To make a new patient field requirable, add the column and DTO fields, then add the field to `PATIENT_FIELDS` in `src/patients/patient-fields.ts`.
- **Patients**: `dni` is nullable, normalized to digits only and unique per clinic. `GET /patients` needs `phone` or `dni`. A query with neither would match an arbitrary patient, because TypeORM drops `undefined` from `where`. `POST /patients` finds or creates by phone. Unique violations (`23505`) map to 409.
- **Webhooks**: `WebhookService` uses plain `axios` (not `@nestjs/axios`, which is ESM-only and breaks Jest). It POSTs `appointment.created` / `.cancelled` / `.rescheduled` to `clinics.webhook_url` when that column is set. It has a 5s timeout and logs failures without rethrowing them, so a webhook failure never fails the request.
- **Payments**: the `payment_link` / `payment_status` columns exist but nothing uses them yet.

## Testing conventions

Unit tests construct services directly with plain `jest.fn()` repository mocks passed in as `as never`. They don't use `Test.createTestingModule`. To freeze time, use `jest.spyOn(Date, "now")`; the availability code reads `Date.now()`. Keep test dates on known weekdays (for example, 2026-10-13 is a Tuesday). `fast-check` is available for property-based tests.

## Known gaps (per README)

Not built yet: rate limiting, a global error handler (stack traces may leak), e2e tests that have actually been run against a real DB, a seed script, and admin endpoints (clinics, doctors, rules and time off are loaded with SQL).

