import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("patients")
@Unique(["clinicId", "phone"])
@Unique(["clinicId", "dni"])
export class Patient {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @Column()
  name!: string;

  @Column()
  phone!: string;

  @Column({ type: "varchar", nullable: true })
  dni!: string | null;

  @Column({ name: "telegram_chat_id", type: "varchar", nullable: true })
  telegramChatId!: string | null;

  @Column({ name: "whatsapp_id", type: "varchar", nullable: true })
  whatsappId!: string | null;
}
