import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Clinic } from './entities/clinic.entity';
import { Specialty } from './entities/specialty.entity';
import { Doctor } from './entities/doctor.entity';
import { DoctorSpecialty } from './entities/doctor-specialty.entity';
import { Service } from './entities/service.entity';
import { AvailabilityRule } from './entities/availability-rule.entity';
import { TimeOff } from './entities/time-off.entity';
import { Patient } from './entities/patient.entity';
import { Appointment } from './entities/appointment.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    Clinic,
    Specialty,
    Doctor,
    DoctorSpecialty,
    Service,
    AvailabilityRule,
    TimeOff,
    Patient,
    Appointment,
  ],
  migrations: [__dirname + '/database/migrations/*.js'],
  synchronize: false,
});
