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
INSERT INTO doctor_specialties (clinic_id, doctor_id, specialty_id) SELECT c.id, d.id, s.id FROM doctors d, specialties s, clinics c WHERE d.clinic_id=c.id AND s.clinic_id=c.id AND c.name='Clinica Test';
INSERT INTO services (clinic_id, doctor_id, name, duration_min) SELECT c.id, d.id, 'Consulta', 30 FROM clinics c, doctors d WHERE d.clinic_id=c.id AND c.name='Clinica Test';
-- day_of_week: 0=domingo ... 6=sábado. Se pueden cargar varias franjas por día (ej. 09-13 y 16-20).
INSERT INTO availability_rules (clinic_id, doctor_id, day_of_week, start_time, end_time) SELECT c.id, d.id, 1, '09:00', '13:00' FROM clinics c, doctors d WHERE d.clinic_id=c.id AND c.name='Clinica Test';
INSERT INTO availability_rules (clinic_id, doctor_id, day_of_week, start_time, end_time) SELECT c.id, d.id, 1, '16:00', '20:00' FROM clinics c, doctors d WHERE d.clinic_id=c.id AND c.name='Clinica Test';
INSERT INTO patients (clinic_id, name, phone, dni) SELECT id, 'Juan Perez', '+5491100000000', '30123456' FROM clinics WHERE name='Clinica Test';
```

La API key de prueba es: `test-api-key-123`

### 2. Probar endpoints

Los bodies y query params van en **camelCase** (`doctorId`, `startsAt`). Si mandás campos desconocidos o en snake_case, la API devuelve 400.

```bash
K="x-api-key: test-api-key-123"
API=http://localhost:3000/api/v1

# Especialidades y médicos
curl -H "$K" $API/specialties
curl -H "$K" $API/specialties/{specialty_id}/doctors

# Servicios del médico (con duración) y campos que el paciente necesita para reservar
curl -H "$K" $API/doctors/{doctor_id}/services

# Horarios libres (lunes 2026-10-12). No incluye ausencias, turnos tomados ni horarios que ya pasaron
curl -H "$K" "$API/doctors/{doctor_id}/slots?date=2026-10-12&serviceId={service_id}"

# Paciente: buscar por teléfono o DNI (hay que mandar uno de los dos)
curl -H "$K" "$API/patients?phone=%2B5491100000000"
curl -H "$K" "$API/patients?dni=30123456"

# Paciente: buscar o crear por teléfono (dni opcional, acepta "30.123.456")
curl -X POST -H "$K" -H "Content-Type: application/json" -d '{"name":"Juan Perez","phone":"+5491100000000","dni":"30123456"}' $API/patients

# Paciente: completar o actualizar datos
curl -X PATCH -H "$K" -H "Content-Type: application/json" -d '{"dni":"30123456"}' $API/patients/{patient_id}

# Próximos turnos del paciente (para cancelar o reprogramar)
curl -H "$K" $API/patients/{patient_id}/appointments

# Crear turno (usar el startUtc que devuelve /slots)
curl -X POST -H "$K" -H "Content-Type: application/json" -d '{"doctorId":"...","patientId":"...","serviceId":"...","startsAt":"2026-10-12T12:00:00Z"}' $API/appointments

# Cancelar turno
curl -X POST -H "$K" $API/appointments/{id}/cancel

# Reprogramar turno
curl -X POST -H "$K" -H "Content-Type: application/json" -d '{"startsAt":"2026-10-12T13:00:00Z"}' $API/appointments/{id}/reschedule
```

### 3. Flujo WhatsApp / n8n

1. `GET /patients?phone=`. Si el paciente no existe, `POST /patients`.
2. `GET /specialties`, después `GET /specialties/:id/doctors`, después `GET /doctors/:id/services`.
3. Si `patientRequiredFields` incluye datos que el paciente no tiene (por ejemplo `dni`), pedírselos y guardarlos con `PATCH /patients/:id`.
4. `GET /doctors/:id/slots?date=&serviceId=`. El paciente elige un horario y se llama a `POST /appointments` con ese `startUtc`.
5. Para cancelar o reprogramar: `GET /patients/:id/appointments`, después `POST /appointments/:id/cancel` o `/reschedule`.

Errores al reservar o reprogramar:

| HTTP | Motivo |
|---|---|
| 400 | El horario ya pasó, o está fuera del horario de atención del médico (también si la duración del servicio no entra en la franja) |
| 404 | El médico, el paciente o el servicio no existe en la clínica, o el servicio no es de ese médico |
| 409 | El turno está ocupado, el médico tiene una ausencia (`time_offs`) o el turno ya estaba cancelado |
| 422 | Al paciente le faltan datos obligatorios: `{"missingFields":["dni"]}` |

### 4. Configurar los datos obligatorios del paciente

Cada clínica y cada médico definen qué datos del paciente son obligatorios para reservar. Al reservar se exigen los de los dos. Por ahora los valores posibles son `name`, `phone` y `dni`.

```sql
-- Toda la clínica exige DNI
UPDATE clinics SET patient_required_fields = '{name,phone,dni}' WHERE name='Clinica Test';
-- Solo este médico exige DNI
UPDATE doctors SET patient_required_fields = '{dni}' WHERE name='Dr. Garcia';
```

Para agregar un dato nuevo (por ejemplo `email`): crear la columna en `patients` con una migración, agregar el campo a la entidad `Patient` y a los DTOs de paciente, y sumarlo a `PATIENT_FIELDS` en `src/patients/patient-fields.ts`.

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
| `GET /api/v1/doctors/:id/services` | ✅ |
| `GET /api/v1/patients?phone=` / `?dni=` | ✅ |
| `POST /api/v1/patients` | ✅ |
| `PATCH /api/v1/patients/:id` | ✅ |
| `GET /api/v1/patients/:id/appointments` (próximos turnos) | ✅ |
| Validación de horario, ausencias y duración al reservar y reprogramar | ✅ |
| Datos obligatorios del paciente configurables por clínica y por médico | ✅ |
| Webhook saliente (al crear, cancelar o reprogramar un turno) | ✅ |
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
- **Fechas en UTC:** todas las columnas son `timestamptz`. Los horarios de atención (`availability_rules`) se cargan en hora local de la clínica (`clinics.timezone`, por defecto `America/Argentina/Buenos_Aires`) y se convierten con `date-fns-tz`. La API recibe y devuelve horas en UTC; `/slots` además devuelve la hora local (`start`/`end`).
- **Validación al reservar:** además del constraint de la base, al crear o reprogramar se verifica que el turno sea en el futuro, que entre completo (con la duración del servicio) en una franja del médico y que el médico no tenga una ausencia. No hace falta que coincida exactamente con la grilla de `/slots`.
- **Datos obligatorios del paciente:** se definen en `clinics.patient_required_fields` y `doctors.patient_required_fields`. Se validan al reservar (responde 422 con `missingFields`), no al crear el paciente, para que el bot pueda pedirlos de a uno.
- **API key por clínica:** header `x-api-key`, hash SHA-256 con pepper (env `API_KEY_PEPPER`). Una key activa por clínica.
- **Sin pagos:** `payment_link` y `payment_status` existen como campos nullables, sin lógica de pago.
- **Webhook saliente opcional:** si `clinics.webhook_url` está configurado, se hace un POST al crear, cancelar o reprogramar un turno (`appointment.created`, `appointment.cancelled`, `appointment.rescheduled`). Tiene un timeout de 5s y, si falla, solo se registra en el log.

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

**Endpoints:** `/api/v1/specialties`, `/api/v1/specialties/:id/doctors`, `/api/v1/doctors/:id/services`, `/api/v1/doctors/:id/slots`, `/api/v1/appointments` (POST, cancel, reschedule), `/api/v1/patients` (GET por phone o dni, POST, PATCH, `/:id/appointments`). Todos requieren `x-api-key` excepto `/api/v1/health`. Los bodies van en camelCase.

**Decisiones clave:**
- Doble reserva imposible con constraint `EXCLUDE USING gist` en Postgres
- Fechas en UTC (`timestamptz`), display en `America/Argentina/Buenos_Aires`
- Sin pagos (campos `payment_link`/`payment_status` nullables)
- Webhook saliente opcional al crear, cancelar o reprogramar un turno
- Al reservar se valida el horario del médico, las ausencias y la duración
- DNI opcional; los datos obligatorios del paciente se configuran por clínica y por médico

**Pendiente:** rate limiting, error handler global, tests e2e, seed de datos.

**README completo:** `C:\Users\USUARIO\bookingApps\clinic-backend\README.md`

---
