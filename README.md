# Clinic Backend

Backend multi-tenant para clínicas y consultorios médicos. Un solo package, NestJS + Fastify + TypeORM + PostgreSQL.

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

## Requisitos

- Node.js 18+
- PostgreSQL 16+ (necesario por el constraint `EXCLUDE USING gist`)

## Cómo levantar

1. Crear la DB en Postgres:
   ```sql
   CREATE DATABASE clinic_backend;
   ```

2. Crear `.env` en la raíz:
   ```
   DATABASE_URL=postgres://usuario:password@localhost:5432/clinic_backend
   API_KEY_PEPPER=un-secreto-largo
   PORT=3000
   CORS_ORIGIN=http://localhost:5173
   ```

3. Instalar dependencias y correr migration:
   ```bash
   pnpm install
   pnpm run migration:run
   ```

4. Levantar:
   ```bash
   pnpm run start:dev
   ```

## Cómo probar a mano

### 1. Crear una clínica (admin)

```sql
INSERT INTO clinics (name, api_key_hash)
VALUES ('Mi Clínica', 'hash-de-tu-api-key');
```

El hash se calcula como: `SHA-256(api_key + API_KEY_PEPPER)`.

### 2. Crear doctor con especialidad y horario

```sql
-- Especialidad
INSERT INTO specialties (clinic_id, name)
VALUES ('{clinic_id}', 'Cardiología');

-- Doctor
INSERT INTO doctors (clinic_id, name)
VALUES ('{clinic_id}', 'Dr. García');

-- Doctor tiene especialidad
INSERT INTO doctor_specialties (doctor_id, specialty_id)
VALUES ('{doctor_id}', '{specialty_id}');

-- Servicio con duración
INSERT INTO services (clinic_id, doctor_id, name, duration_min)
VALUES ('{clinic_id}', '{doctor_id}', 'Consulta', 30);

-- Horario: lunes (day_of_week=1) de 09:00 a 17:00
INSERT INTO availability_rules (clinic_id, doctor_id, day_of_week, start_time, end_time)
VALUES ('{clinic_id}', '{doctor_id}', 1, '09:00', '17:00');
```

### 3. Crear paciente

```sql
INSERT INTO patients (clinic_id, name, phone)
VALUES ('{clinic_id}', 'Juan Pérez', '+5491100000000');
```

### 4. Probar endpoints

```bash
# Health
curl http://localhost:3000/api/v1/health

# Especialidades
curl -H "x-api-key: tu-api-key" http://localhost:3000/api/v1/specialties

# Horarios libres (lunes 2026-10-06)
curl -H "x-api-key: tu-api-key" \
  "http://localhost:3000/api/v1/doctors/{doctor_id}/slots?date=2026-10-06&service_id={service_id}"

# Crear turno
curl -X POST -H "x-api-key: tu-api-key" -H "Content-Type: application/json" \
  -d '{
    "doctor_id": "{doctor_id}",
    "patient_id": "{patient_id}",
    "service_id": "{service_id}",
    "starts_at": "2026-10-06T10:00:00Z"
  }' \
  http://localhost:3000/api/v1/appointments

# Cancelar turno
curl -X POST -H "x-api-key: tu-api-key" \
  http://localhost:3000/api/v1/appointments/{id}/cancel

# Reprogramar turno
curl -X POST -H "x-api-key: tu-api-key" -H "Content-Type: application/json" \
  -d '{"starts_at": "2026-10-06T11:00:00Z"}' \
  http://localhost:3000/api/v1/appointments/{id}/reschedule
```

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

- **Doble reserva imposible a nivel DB:** constraint `EXCLUDE USING gist` sobre `(doctor_id, tstzrange(starts_at, ends_t))` donde `status != 'cancelled'`. No se puede reservar dos veces el mismo médico en horarios solapados, sin importar cuántas requests simultáneas lleguen.
- **Fechas en UTC:** todas las columnas son `timestamptz`. La conversión a `America/Argentina/Buenos_Aires` se hace en el endpoint de slots con `date-fns-tz`.
- **API key por clínica:** header `x-api-key`, hash SHA-256 con pepper (env `API_KEY_PEPPER`). Una key activa por clínica.
- **Sin pagos:** `payment_link` y `payment_status` existen como campos nullables, sin lógica de pago.
- **Webhook saliente opcional:** si `clinics.webhook_url` está configurado, se hace POST al crear/cancelar un turno. Fire-and-forget con timeout de 5s.

## Pendiente

- Rate limiting
- Manejo de errores global (sin leak de stack traces)
- Tests e2e con DB real
- Seed de datos de ejemplo
