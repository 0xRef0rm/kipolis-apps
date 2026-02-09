import "reflect-metadata";
import { AppDataSource } from "./config/database";
import { Responder } from "./entities/Responder";
import { Region } from "./entities/Region";
import * as bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

async function fullSeed() {
    try {
        await AppDataSource.initialize();
        console.log("Database initialized for Full Seeding");

        const responderRepo = AppDataSource.getRepository(Region).manager.getRepository(Responder);
        const regionRepo = AppDataSource.getRepository(Region);

        // 1. SEED ADMIN
        const adminBadge = "OPERATOR-01";
        const adminPass = "KIPOLIS2026";
        const passwordHash = await bcrypt.hash(adminPass, 12);

        let admin = await responderRepo.findOneBy({ badge_number: adminBadge });
        if (!admin) {
            admin = responderRepo.create({
                name: "SYSTEM OPERATOR CENTRAL",
                phone: "0000000000",
                badge_number: adminBadge,
                password_hash: passwordHash,
                type: "admin",
                department: "COMMAND CENTER",
                status: "available",
                is_active: true,
                device_id: "CONSOLE_WEB_BROWSER"
            });
            await responderRepo.save(admin);
            console.log("✓ SuperAdmin Created");
        }

        // 2. SEED REGIONS (Jakarta, Purwakarta, Cirebon)
        const regions = [
            {
                name: "JAKARTA_CENTRAL",
                local_emergency_number: "021-110",
                fire_department_number: "021-113",
                ambulance_number: "021-119",
                boundary: "POLYGON((106.81 -6.16, 106.84 -6.16, 106.84 -6.19, 106.81 -6.19, 106.81 -6.16))"
            },
            {
                name: "PURWAKARTA_CITY",
                local_emergency_number: "0264-123456",
                fire_department_number: "0264-113",
                ambulance_number: "0264-119",
                boundary: "POLYGON((107.42 -6.53, 107.46 -6.53, 107.46 -6.57, 107.42 -6.57, 107.42 -6.53))"
            },
            {
                name: "CIREBON_HUB",
                local_emergency_number: "0231-654321",
                fire_department_number: "0231-113",
                ambulance_number: "0231-119",
                boundary: "POLYGON((108.54 -6.69, 108.58 -6.69, 108.58 -6.73, 108.54 -6.73, 108.54 -6.69))"
            }
        ];

        for (const r of regions) {
            let existing = await regionRepo.findOneBy({ name: r.name });
            if (!existing) {
                await AppDataSource.query(
                    `INSERT INTO regions (id, name, local_emergency_number, fire_department_number, ambulance_number, boundary, is_active, created_at, updated_at) 
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, ST_GeomFromText($5, 4326), true, now(), now())`,
                    [r.name, r.local_emergency_number, r.fire_department_number, r.ambulance_number, r.boundary]
                );
                console.log(`✓ Region Seeded: ${r.name}`);
            }
        }

        console.log("\n========================================");
        console.log("SEEDING COMPLETE");
        console.log(`Dashboard Login: ${adminBadge} / ${adminPass}`);
        console.log("========================================\n");

        await AppDataSource.destroy();
    } catch (error) {
        console.error("Error during seeding:", error);
    }
}

fullSeed();
