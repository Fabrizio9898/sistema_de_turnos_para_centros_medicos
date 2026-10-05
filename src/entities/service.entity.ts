import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clinic_id' })
  clinicId: string;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @Column()
  name: string;

  @Column({ name: 'duration_min' })
  durationMin: number;
}
