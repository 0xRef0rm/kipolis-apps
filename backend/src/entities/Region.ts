import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

/**
 * Region Entity - Defines geographical service areas (Kecamatan/Kabupaten)
 * Each incident is mapped to a region for localized dispatch and management
 */
@Entity("regions")
export class Region {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ length: 100 })
    @Index({ unique: true })
    name!: string;

    /**
     * Geographical boundary of the region (PostGIS Polygon)
     */
    @Column({
        type: "geometry",
        spatialFeatureType: "Polygon",
        srid: 4326,
        nullable: true
    })
    boundary?: string;

    /**
     * Local PSTN Emergency Number (e.g., direct line to Polsek/Polres)
     * Used for localized call bridging
     */
    @Column({ nullable: true, length: 20 })
    local_emergency_number?: string;

    /**
     * Local Specialized Emergency Numbers
     */
    @Column({ nullable: true })
    fire_department_number?: string; // Nomor Damkar Lokal

    @Column({ nullable: true })
    ambulance_number?: string; // Nomor Ambulans Lokal

    /**
     * Regional Command Center status
     */
    @Column({ default: true })
    is_active!: boolean;

    /**
     * Dispatcher contact info for this region
     */
    @Column({ type: "jsonb", nullable: true })
    contact_info?: {
        phone?: string;
        whatsapp?: string;
        email?: string;
        address?: string;
    };

    /**
     * Metadata for regional settings
     */
    @Column({ type: "jsonb", nullable: true })
    metadata?: Record<string, any>;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
