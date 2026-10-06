# Clinic Backend

Backend multi-tenant para clínicas y consultorios médicos. NestJS + Fastify + TypeORM + PostgreSQL (Neon).

## Qué es

SaaS de gestión de turnos para clínicas. Cada clínica (tenant) tiene doctores, especialidades, servicios, pacientes y turnos. Los humanos se autentican con Clerk; las integraciones (n8n/WhatsApp) usan API key.

## Entidades

| Entidad | Tabla | Qué representa |
|---------|-------|----------------|
| `Clinic` | `clinics` | Tenant. Tiene name, timezone, webhook_url, api_key_hash |
| `Doctor` | `doctors` | Profesional médico. Pertenece a una clínica |
| `Specialty` | `specialties` | Especialidad médica dentro de una clínica |
| `DoctorSpecialty` | `doctor_specialties` | Relación N:N entre doctores y especialidades |
| `Service` | `services` | Servicio que ofrece un doctor (consulta, control, etc.) con duración |
| `AvailabilityRule` | `availability_rules` | Franja horaria semanal del doctor (día + hora inicio/fin) |
| `TimeOff` | `time_offs` | Ausencias del doctor (vacaciones, licencias) |
| `Patient` | `patients` | Paciente. No requiere cuenta de Clerk |
| `Appointment` | `appointments` | Turno. Relaciona doctor, paciente, servicio y horario |
| `User` | `users` | Cuenta Clerk vinculada a un rol interno (admin, clinic_admin, doctor) |

## Stack

- **Framework:** NestJS 11 + Fastify
- **ORM:** TypeORM 0.3
- **DB:** PostgreSQL 16 (Neon)
- **Auth humanos:** Clerk (Bearer token)
- **Auth máquinas:** API key (header `x-api-key`)
- **TypeScript:** strict mode

## Configuración

### 1. Variables de entorno

```bash
cp .env.example .env.development
cp .env.example .env.production
```

`.env.development` apunta al branch `dev` de Neon. `.env.production` apunta a `main`.

### 2. Migraciones

```bash
pnpm install
pnpm run migration:run:dev
```

### 3. Levantar

```bash
pnpm run start:dev
```

Health check: `GET /api/v1/health`

## Auth

### Humanos (Clerk)

El frontend envía `Authorization: Bearer <clerk_token>`. El `ClerkAuthGuard` valida el token, busca o crea el `User` interno y lo deja en `request.user`.

### Máquinas (API key)

Las integraciones envían `x-api-key: <key>`. El `ApiKeyGuard` hashea la key con `API_KEY_PEPPER` y busca la clínica. Deja `request.clinic` en el request.

## Endpoints

Todos bajo `/api/v1`. Los bodies van en camelCase.

### Catálogo

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/specialties` | API key | Especialidades de la clínica |
| GET | `/specialties/:id/doctors` | API key | Doctores por especialidad |
| GET | `/doctors/:id/services` | API key | Servicios del doctor + campos requeridos del paciente |
| GET | `/doctors/:id/slots?date=&serviceId=` | API key | Horarios libres |

### Pacientes

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/patients?phone=` o `?dni=` | API key | Buscar paciente |
| POST | `/patients` | API key | Buscar o crear por teléfono |
| PATCH | `/patients/:id` | API key | Actualizar datos |
| GET | `/patients/:id/appointments` | API key | Próximos turnos |

### Turnos

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/appointments` | API key | Crear turno |
| POST | `/appointments/:id/cancel` | API key | Cancelar |
| POST | `/appointments/:id/reschedule` | API key | Reprogramar |

### Usuarios (Clerk)

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/users/me` | Clerk | Usuario autenticado |

## Validación de turnos

Al crear o reprogramar se verifica:
- El horario es futuro
- El turno entra completo en una franja del médico
- No hay solapamiento con otros turnos ni ausencias
- El paciente tiene los datos obligatorios

La DB tiene un constraint `EXCLUDE USING gist` que hace imposible la doble reserva incluso con requests concurrentes.

## Estructura

```
src/
├── modules/
│   ├── auth/           # Clerk strategy, API key guard, decoradores
│   ├── availability/   # Horarios libres
│   ├── appointments/   # Crear, cancelar, reprogramar turnos
│   ├── catalog/        # Especialidades y médicos
│   ├── health/         # Health check
│   ├── patients/       # Buscar o crear pacientes
│   └── users/          # User entity + GET /users/me
├── entities/           # TypeORM entities (10 tablas)
├── guards/             # ClerkAuthGuard
├── providers/          # Clerk client
├── webhook/            # Webhook saliente
├── database/           # Migrations
├── data-source.ts      # TypeORM DataSource
├── app.module.ts       # Módulo raíz
└── main.ts             # Bootstrap
```

## Decisiones técnicas

- **Doble reserva imposible:** constraint `EXCLUDE USING gist` sobre `(doctor_id, tstzrange(starts_at, ends_at))` donde `status != 'cancelled'`
- **Fechas en UTC:** todas las columnas son `timestamptz`. Los horarios se cargan en hora local de la clínica y se convierten con `date-fns-tz`
- **API key por clínica:** hash SHA-256 con pepper (`API_KEY_PEPPER`)
- **Sin pagos:** `payment_link` y `payment_status` existen sin lógica de pago
- **Webhook saliente opcional:** POST al crear, cancelar o reprogramar un turno
- **Pacientes sin Clerk:** los pacientes no necesitan cuenta; pueden llegar por WhatsApp/n8n

## Pendiente

- Rate limiting
- Manejo de errores global (sin leak de stack traces)
- Tests e2e con DB real
- Seed de datos de ejemplo
- Endpoints de admin (clinics, doctors, rules, time off)
- Onboarding (crear User con role + clinicId/doctorId)
