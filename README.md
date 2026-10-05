# Clinic Backend

Backend multi-tenant para clínicas y consultorios médicos. NestJS + Fastify + TypeORM + PostgreSQL.

## Guía rápida con Docker (paso a paso)

### 1. Iniciar Docker Desktop

Doble click en el ícono de Docker en la barra de tareas, o:

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

Esperar a que diga "Docker Desktop is running" (minuto 1 aprox).

### 2. Levantar la base de datos

```bash
cd C:\Users\USUARIO\bookingApps\clinic-backend
docker compose up -d
```

Eso crea y levanta un PostgreSQL en `localhost:5432`.

### 3. Crear el archivo `.env`

```bash
Copy-Item .env.example .env
```

Editar `.env` y dejar así:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/clinic_backend
API_KEY_PEPPER=dev-pepper
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

### 4. Instalar dependencias y crear las tablas

```bash
pnpm install
pnpm run migration:run
```

### 5. Levantar el backend

```bash
pnpm run start:dev
```

### 6. Probar

```bash
curl http://localhost:3000/api/v1/health
```

Debería responder: `{"status":"ok","timestamp":"..."}`

### 7. Parar todo

```bash
# Parar backend: Ctrl+C en la terminal
# Parar base de datos:
docker compose down
```

---

## Cómo probar el flujo completo

### 1. Crear datos de prueba (a mano en SQL)

Abrir una terminal contra la DB:

```bash
docker compose exec -it db psql -U postgres -d clinic_backend
```

Pegar esto (crea clínica, doctor, especialidad, horario y paciente de prueba):

```sql
INSERT INTO clinics (name, api_key_hash) VALUES ('Clinica Test', 'cea4ea36bed6b91b19d08af69b3f93b3047896c8f1da631b17626b184c816892');
INSERT INTO specialties (clinic_id, name) SELECT id, 'Cardiologia' FROM clinics WHERE name='Clinica Test';
INSERT INTO doctors (clinic_id, name) SELECT id, 'Dr. Garcia' FROM clinics WHERE name='Clinica Test';
INSERT INTO doctor_specialties (doctor_id, specialty_id) SELECT d.id, s.id FROM doctors d, specialties s, clinics c WHERE d.clinic_id=c.id AND s.clinic_id=c.id AND c.name='Clinica Test';
INSERT INTO services (clinic_id, doctor_id, name, duration_min) SELECT c.id, d.id, 'Consulta', 30 FROM clinics c, doctors d WHERE d.clinic_id=c.id AND c.name='Clinica Test';
INSERT INTO availability_rules (clinic_id, doctor_id, day_of_week, start_time, end_time) SELECT c.id, d.id, 1, '09:00', '17:00' FROM clinics c, doctors d WHERE d.clinic_id=c.id AND c.name='Clinica Test';
INSERT INTO patients (clinic_id, name, phone) SELECT id, 'Juan Perez', '+5491100000000' FROM clinics WHERE name='Clinica Test';
```

La API key de prueba es: `test-api-key-123`

### 2. Probar endpoints

```bash
# Especialidades
curl -H "x-api-key: test-api-key-123" http://localhost:3000/api/v1/specialties

# Horarios libres (lunes 2026-10-06)
curl -H "x-api-key: test-api-key-123" "http://localhost:3000/api/v1/doctors/{doctor_id}/slots?date=2026-10-06&service_id={service_id}"

# Crear turno
curl -X POST -H "x-api-key: test-api-key-123" -H "Content-Type: application/json" -d "{\"doctor_id\":\"...\",\"patient_id\":\"...\",\"service_id\":\"...\",\"starts_at\":\"2026-10-06T10:00:00Z\"}" http://localhost:3000/api/v1/appointments

# Cancelar turno
curl -X POST -H "x-api-key: test-api-key-123" http://localhost:3000/api/v1/appointments/{id}/cancel

# Reprogramar turno
curl -X POST -H "x-api-key: test-api-key-123" -H "Content-Type: application/json" -d "{\"starts_at\":\"2026-10-06T11:00:00Z\"}" http://localhost:3000/api/v1/appointments/{id}/reschedule
```

---

## Estado actual

| Componente | Estado |
|---|---|
| Schema de DB (9 tablas + constraint anti-doble-reserva) | ✅ |
| Auth por API key (header `x-api-key`) | ✅ |
| `GET /api/v1/specialties` | ✅ |
| `GET /api/v1/specialties/:id/doctors` | ✅ |
| `GET /api/v1/doctors/:id/slots?date=&service_id=` | ✅ |
| `POST /api/v1/appointments` | ✅ |
| `POST /api/v1/appointments/:id/cancel` | ✅ |
| `POST /api/v1/appointments/:id/reschedule` | ✅ |
| `GET /api/v1/patients?phone=` | ✅ |
| `POST /api/v1/patients` | ✅ |
| Webhook saliente (al crear/cancelar turno) | ✅ |
| Rate limiting | ❌ |
| Manejo de errores global | ❌ |
| Tests e2e con DB real | ❌ (escritos, no corridos) |

## Estructura

```
src/
├── auth/           # API key guard, decorador @CurrentClinic
├── availability/   # Horarios libres
├── appointments/   # Crear, cancelar, reprogramar turnos
├── catalog/        # Especialidades y médicos
├── entities/       # TypeORM entities (9 tablas)
├── health/         # Health check
├── patients/       # Buscar o crear pacientes
├── webhook/        # Webhook saliente
├── database/       # Migrations
├── data-source.ts  # TypeORM DataSource
├── app.module.ts   # Módulo raíz
└── main.ts         # Bootstrap
```

## Decisiones técnicas

- **Doble reserva imposible a nivel DB:** constraint `EXCLUDE USING gist` sobre `(doctor_id, tstzrange(starts_at, ends_at))` donde `status != 'cancelled'`. No se puede reservar dos veces el mismo médico en horarios solapados, sin importar cuántas requests simultáneas lleguen.
- **Fechas en UTC:** todas las columnas son `timestamptz`. La conversión a `America/Argentina/Buenos_Aires` se hace en el endpoint de slots con `date-fns-tz`.
- **API key por clínica:** header `x-api-key`, hash SHA-256 con pepper (env `API_KEY_PEPPER`). Una key activa por clínica.
- **Sin pagos:** `payment_link` y `payment_status` existen como campos nullables, sin lógica de pago.
- **Webhook saliente opcional:** si `clinics.webhook_url` está configurado, se hace POST al crear/cancelar un turno. Fire-and-forget con timeout de 5s.

## Pendiente

- Rate limiting
- Manejo de errores global (sin leak de stack traces)
- Tests e2e con DB real
- Seed de datos de ejemplo

---

## Cómo seguir en otro chat

Si querés empezar otro chat con contexto 0, copiá este texto:

---

**Proyecto:** `C:\Users\USUARIO\bookingApps\clinic-backend`

**Stack:** NestJS 11 + Fastify + TypeORM + PostgreSQL 16 + TypeScript. Un solo package, sin monorepo.

**Qué es:** Backend multi-tenant para clínicas. Cada clínica (tenant) tiene doctores, especialidades, servicios, pacientes y turnos. Auth por API key en header `x-api-key`.

**Levantar:**
```bash
cd C:\Users\USUARIO\bookingApps\clinic-backend
docker compose up -d
pnpm run migration:run
pnpm run start:dev
```

**Endpoints:** `/api/v1/specialties`, `/api/v1/specialties/:id/doctors`, `/api/v1/doctors/:id/slots`, `/api/v1/appointments` (POST, cancel, reschedule), `/api/v1/patients` (GET, POST). Todos protegidos con `x-api-key` excepto `/api/v1/health`.

**Decisiones clave:**
- Doble reserva imposible con constraint `EXCLUDE USING gist` en Postgres
- Fechas en UTC (`timestamptz`), display en `America/Argentina/Buenos_Aires`
- Sin pagos (campos `payment_link`/`payment_status` nullables)
- Webhook saliente opcional al crear/cancelar turno

**Pendiente:** rate limiting, error handler global, tests e2e, seed de datos.

**README completo:** `C:\Users\USUARIO\bookingApps\clinic-backend\README.md`

---
