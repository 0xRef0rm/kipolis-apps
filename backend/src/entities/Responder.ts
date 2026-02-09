import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, BeforeUpdate } from "typeorm";

/**
 * Responder Entity - First Responders (Police, Paramedics, Security)
 * Stores responder profiles, status, location, and performance metrics
 */
@Entity("responders")
@Index(["type", "status"]) // Find available responders by type
@Index(["status"]) // Filter by status (available, busy, etc.)
@Index(["phone"]) // Fast phone lookup
export class Responder {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    /**
     * Responder's full name
     */
    @Column({ length: 200 })
    name!: string;

    /**
     * Phone number (unique, for authentication and contact)
     */
    @Column({ unique: true, length: 20 })
    phone!: string;

    /**
     * Email address (optional)
     */
    @Column({ nullable: true, length: 100 })
    email?: string;

    /**
     * Badge number, employee ID, or identification number
     */
    @Column({ nullable: true, length: 50 })
    badge_number?: string;

    /**
     * Responder type: police, paramedic, security, firefighter, sar
     */
    @Column({ length: 50 })
    type!: string;

    /**
     * Department or organization
     * e.g., "Jakarta Pusat Police", "PMI Jakarta", "Security PT XYZ"
     */
    @Column({ nullable: true, length: 200 })
    department?: string;

    /**
     * Unit or team within department
     * e.g., "Mobile Patrol Unit 3", "Ambulance Team A"
     */
    @Column({ nullable: true, length: 100 })
    unit?: string;

    /**
     * Regional Node ID where the responder is assigned
     */
    @Column({ type: "uuid", nullable: true })
    @Index()
    region_id?: string;

    /**
     * Current status:
     * - available: Ready to accept incidents
     * - on_the_way: Navigating to incident
     * - busy: Handling incident
     * - off_duty: Not available
     */
    @Column({ default: "off_duty", length: 20 })
    status!: string;

    @Column({ nullable: true, select: false }) // select: false for security
    password_hash?: string;

    @Column({ type: "timestamp", nullable: true })
    last_login_at?: Date;

    @Column({ type: "integer", default: 0 })
    login_attempts!: number;

    @Column({ nullable: true })
    device_id?: string;

    /**
     * Current latitude (updated every 30s when on duty)
     */
    @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
    current_latitude?: number;

    /**
     * Current longitude (updated every 30s when on duty)
     */
    @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
    current_longitude?: number;

    /**
     * Timestamp of last location update
     */
    @Column({ type: "timestamp", nullable: true })
    last_location_update?: Date;

    /**
     * PostGIS geometry point for spatial queries
     * Enables "find nearest available responder" queries
     */
    @Column({
        type: "geometry",
        spatialFeatureType: "Point",
        srid: 4326,
        nullable: true
    })
    location?: string;

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
     * Total incidents handled (lifetime)
     */
    @Column({ type: "integer", default: 0 })
    total_incidents_handled!: number;

    /**
     * Average response time in minutes
     * Calculated from incident trigger to responder arrival
     */
    @Column({ type: "float", nullable: true })
    average_response_time_minutes?: number;

    /**
     * Performance rating (1-5 stars)
     * Based on operator/victim feedback
     */
    @Column({ type: "float", nullable: true })
    rating?: number;

    /**
     * Working hours schedule (JSONB)
     * Defines when responder is typically available
     */
    @Column({ type: "jsonb", nullable: true })
    working_hours?: {
        monday?: { start: string; end: string };
        tuesday?: { start: string; end: string };
        wednesday?: { start: string; end: string };
        thursday?: { start: string; end: string };
        friday?: { start: string; end: string };
        saturday?: { start: string; end: string };
        sunday?: { start: string; end: string };
    };

    /**
     * Responder capabilities/certifications (JSONB)
     * e.g., ["first_aid", "cpr", "firearms", "motorcycle"]
     */
    @Column({ type: "jsonb", nullable: true })
    capabilities?: string[];

    /**
     * Vehicle information (JSONB)
     * For tracking and identification
     */
    @Column({ type: "jsonb", nullable: true })
    vehicle_info?: {
        type?: string; // car, motorcycle, ambulance
        plate_number?: string;
        color?: string;
        model?: string;
    };

    /**
     * Account active status
     * false = suspended or deactivated
     */
    @Column({ type: "boolean", default: true })
    is_active!: boolean;

    /**
     * Last login timestamp
     */
    @Column({ type: "timestamp", nullable: true })
    last_login?: Date;

    /**
     * Additional metadata (flexible field)
     */
    @Column({ type: "jsonb", nullable: true })
    metadata?: Record<string, any>;

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

    @BeforeInsert()
    @BeforeUpdate()
    handleNameCase() {
        if (this.name) {
            this.name = this.name.toUpperCase();
        }
    }
}
