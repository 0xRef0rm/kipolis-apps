import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity("audit_logs")
@Index(["user_id"])
@Index(["action"])
@Index(["created_at"])
export class AuditLog {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ nullable: true })
    user_id?: string; // ID Victim/Responder

    @Column({ length: 50 })
    user_type!: string; // 'victim', 'responder', 'system'

    @Column({ length: 100 })
    action!: string; // 'LOGIN', 'REGISTER', 'PANIC_TRIGGER', 'DISPATCH', 'DEVICE_BIND'

    @Column({ type: "jsonb", nullable: true })
    details?: any; // Simpan payload, browser info, device_id, etc.

    @Column({ nullable: true })
    ip_address?: string;

    @Column({ nullable: true })
    device_id?: string;

    @CreateDateColumn()
    created_at!: Date;
}
