import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

/**
 * User Entity - Emergency Response System Users
 * Stores user profile information and emergency contacts
 */
@Entity("users")
@Index(["phone"]) // Index for fast phone lookup
@Index(["status"]) // Index for filtering active users
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    /**
     * Phone number - Primary identifier for emergency contacts
     * Must be unique and in international format (+62xxx)
     */
    @Column({ unique: true, length: 20 })
    phone!: string;

    /**
     * User's full name
     */
    @Column({ length: 200 })
    name!: string;

    /**
     * Email address (optional)
     */
    @Column({ nullable: true, length: 100 })
    email?: string;

    /**
     * Emergency contact phone number
     * Auto-notified when panic button is triggered
     */
    @Column({ nullable: true, length: 20 })
    emergency_contact_phone?: string;

    /**
     * Emergency contact name
     */
    @Column({ nullable: true, length: 200 })
    emergency_contact_name?: string;

    /**
     * User status: active, suspended, deleted
     */
    @Column({ default: "active", length: 20 })
    status!: string;

    @Column({ nullable: true, select: false }) // select: false agar hash tidak bocor ke query biasa
    password_hash?: string;

    @Column({ nullable: true, select: false })
    otp_hash?: string;

    @Column({ type: "timestamp", nullable: true })
    otp_expires_at?: Date;

    @Column({ type: "timestamp", nullable: true })
    last_login_at?: Date;

    @Column({ type: "integer", default: 0 })
    login_attempts!: number;

    /**
     * Last known latitude (for quick location reference)
     * Updated periodically from mobile app
     */
    @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
    last_latitude?: number;

    /**
     * Last known longitude (for quick location reference)
     */
    @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
    last_longitude?: number;

    /**
     * Timestamp of last location update
     */
    @Column({ type: "timestamp", nullable: true })
    last_location_update?: Date;

    /**
     * Device token for push notifications (FCM/APNS)
     */
    @Column({ type: "text", nullable: true })
    device_token?: string;

    /**
     * Device platform: ios, android
     */
    @Column({ nullable: true, length: 20 })
    device_platform?: string;

    /**
     * App version installed on device
     */
    @Column({ nullable: true, length: 20 })
    app_version?: string;

    /**
     * User preferences (JSON)
     * Stores settings like notification preferences, PIN, etc.
     */
    @Column({ type: "jsonb", nullable: true })
    preferences?: Record<string, any>;

    /**
     * Account creation timestamp
     */
    @CreateDateColumn()
    created_at!: Date;

    /**
     * Last update timestamp
     */
    @UpdateDateColumn()
    updated_at!: Date;
}
