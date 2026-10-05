import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('availability_rules')
export class AvailabilityRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinic_id' })
  clinicId: string;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @Column({ name: 'day_of_week' })
  dayOfWeek: number;

  @Column({ name: 'start_time' })
  startTime: string;

  @Column({ name: 'end_time' })
  endTime: string;
}
