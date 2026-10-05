import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("patients")
@Unique(["clinicId", "phone"])
export class Patient {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "clinic_id" })
  clinicId: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ name: "telegram_chat_id", nullable: true })
  telegramChatId: string | null;

  @Column({ name: "whatsapp_id", nullable: true })
  whatsappId: string | null;
}
