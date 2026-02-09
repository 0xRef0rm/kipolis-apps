import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { Region } from "./Region";

/**
 * Emergency Organization Entity - Master data for local emergency units
 * Stores data for Police Stations, Hospitals, Fire Stations, and Clinics per Region/City
 */
@Entity("emergency_organizations")
@Index(["type", "region_id"])
@Index(["status"])
export class EmergencyOrganization {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ length: 255 })
    name!: string;

    /**
     * Organization Type:
     * - police: Polsek/Polres/Polda
     * - fire_dept: Pemadam Kebakaran
     * - hospital: Rumah Sakit
     * - clinic: Klinik/Puskesmas
     */
    @Column({ length: 50 })
    type!: string;

    @Column({ length: 20 })
    phone!: string;

    @Column({ type: "text", nullable: true })
    address?: string;

    @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
    latitude?: number;

    @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
    longitude?: number;

    /**
     * PostGIS geometry point for spatial mapping in Command Center
     */
    @Column({
        type: "geometry",
        spatialFeatureType: "Point",
        srid: 4326,
        nullable: true
    })
    location?: string;

    @Column({ type: "uuid" })
    region_id!: string;

    @ManyToOne(() => Region)
    @JoinColumn({ name: "region_id" })
    region?: Region;

    /**
     * Operational Status: active, inactive, maintenance
     */
    @Column({ default: "active", length: 20 })
    status!: string;

    /**
     * Contact persons or additional hierarchy info
     */
    @Column({ type: "jsonb", nullable: true })
    metadata?: {
        head_of_unit?: string;
        bed_count?: number; // for hospitals
        vehicle_count?: number;
        alt_phone?: string;
    };

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
