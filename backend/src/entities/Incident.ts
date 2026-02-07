import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";
import { Responder } from "./Responder";

/**
 * Incident Entity - Emergency Panic Button Activations
 * Stores all panic button triggers with location, evidence, and status tracking
 */
@Entity("incidents")
@Index(["user_id", "status"]) // Fast lookup for user's active incidents
@Index(["status", "created_at"]) // Fast lookup for recent active incidents
@Index(["created_at"]) // Time-based queries
export class Incident {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    /**
     * User who triggered the panic button
     */
    @Column("uuid")
    user_id!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user!: User;

    /**
     * Incident trigger location - Latitude
     */
    @Column("decimal", { precision: 10, scale: 7 })
    latitude!: number;

    /**
     * Incident trigger location - Longitude
     */
    @Column("decimal", { precision: 10, scale: 7 })
    longitude!: number;

    /**
     * PostGIS geometry point (for spatial queries)
     * Automatically populated from lat/long
     * Enables queries like "find nearest responder"
     */
    @Column({
        type: "geometry",
        spatialFeatureType: "Point",
        srid: 4326, // WGS84 coordinate system
        nullable: true
    })
    location?: string;

    /**
     * Incident status lifecycle:
     * - active: Panic button just triggered, needs immediate attention
     * - acknowledged: Operator has seen the incident
     * - dispatched: Responder has been assigned and notified
     * - resolved: Incident resolved, user is safe
     * - false_alarm: User cancelled or confirmed false alarm
     * - expired: No response after timeout period
     */
    @Column({ default: "active", length: 20 })
    status!: string;

    /**
     * Incident severity level (auto-calculated or operator-assigned)
     * - critical: Immediate danger, life-threatening
     * - high: Urgent situation
     * - medium: Potential threat
     * - low: Precautionary alert
     */
    @Column({ default: "high", length: 20 })
    severity!: string;

    /**
     * Trigger mechanism used:
     * - dead_mans_switch: Hold-to-stay button released
     * - hardware_key: Power button 5x or volume sequence
     * - voice_trigger: Voice keyword detected
     * - manual: User pressed panic button
     */
    @Column({ nullable: true, length: 50 })
    trigger_type?: string;

    /**
     * Breadcrumb trail (GPS history before incident)
     * Array of {lat, lng, timestamp} objects
     * Typically 15 minutes of location history
     */
    @Column({ type: "jsonb", nullable: true })
    breadcrumbs?: Array<{
        latitude: number;
        longitude: number;
        timestamp: string;
        accuracy?: number;
    }>;

    /**
     * Audio recording file path/URL
     * 30-second ambient audio captured after trigger
     */
    @Column({ type: "text", nullable: true })
    audio_file_url?: string;

    /**
     * Audio recording status: pending, uploading, uploaded, failed
     */
    @Column({ nullable: true, length: 20 })
    audio_status?: string;

    /**
     * Photo evidence file paths/URLs (JSON array)
     * Front and back camera captures
     */
    @Column({ type: "jsonb", nullable: true })
    photo_urls?: string[];

    /**
     * Photo upload status: pending, uploading, uploaded, failed
     */
    @Column({ nullable: true, length: 20 })
    photo_status?: string;

    /**
     * Operator notes and observations
     */
    @Column({ type: "text", nullable: true })
    notes?: string;

    /**
     * Assigned responder ID
     */
    @Column({ type: "uuid", nullable: true })
    responder_id?: string;

    @ManyToOne(() => Responder)
    @JoinColumn({ name: "responder_id" })
    responder?: Responder;

    /**
     * Timestamp when responder accepted the incident
     */
    @Column({ type: "timestamp", nullable: true })
    responder_accepted_at?: Date;

    /**
     * Timestamp when responder arrived at scene
     */
    @Column({ type: "timestamp", nullable: true })
    responder_arrived_at?: Date;

    /**
     * Response time in minutes (from trigger to arrival)
     */
    @Column({ type: "float", nullable: true })
    response_time_minutes?: number;

    /**
     * Responder's location trail (updated every 30s while en route)
     * Array of GPS coordinates showing responder's movement to incident
     */
    @Column({ type: "jsonb", nullable: true })
    responder_trail?: Array<{
        latitude: number;
        longitude: number;
        timestamp: string;
        speed?: number; // km/h
    }>;

    /**
     * Assigned operator/dispatcher ID (for Command Center)
     */
    @Column({ type: "uuid", nullable: true })
    assigned_operator_id?: string;

    /**
     * Timestamp when operator acknowledged the incident
     */
    @Column({ type: "timestamp", nullable: true })
    acknowledged_at?: Date;

    /**
     * Timestamp when responder was dispatched
     */
    @Column({ type: "timestamp", nullable: true })
    dispatched_at?: Date;

    /**
     * Timestamp when incident was resolved
     */
    @Column({ type: "timestamp", nullable: true })
    resolved_at?: Date;

    /**
     * Resolution details (how incident was resolved)
     */
    @Column({ type: "text", nullable: true })
    resolution_notes?: string;

    /**
     * Estimated Time of Arrival for responder (in minutes)
     */
    @Column({ type: "integer", nullable: true })
    eta_minutes?: number;

    /**
     * Nearest responder location at time of dispatch
     */
    @Column({ type: "jsonb", nullable: true })
    responder_location?: {
        latitude: number;
        longitude: number;
        distance_km?: number;
    };

    /**
     * Device information at time of trigger
     */
    @Column({ type: "jsonb", nullable: true })
    device_info?: {
        platform?: string;
        app_version?: string;
        battery_level?: number;
        network_type?: string;
    };

    /**
     * Additional metadata (flexible field for future extensions)
     */
    @Column({ type: "jsonb", nullable: true })
    metadata?: Record<string, any>;

    /**
     * Incident creation timestamp (panic button trigger time)
     */
    @CreateDateColumn()
    created_at!: Date;

    /**
     * Last update timestamp
     */
    @UpdateDateColumn()
    updated_at!: Date;
}
