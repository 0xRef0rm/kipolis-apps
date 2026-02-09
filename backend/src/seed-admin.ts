import "reflect-metadata";
import { AppDataSource } from "./config/database";
import { Responder } from "./entities/Responder";
import * as bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

async function seedAdmin() {
    try {
        await AppDataSource.initialize();
        console.log("Database initialized for Admin Seeding");

        const responderRepo = AppDataSource.getRepository(Responder);

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
                device_id: "CONSOLE_WEB_BROWSER" // Pre-binding for dashboard
            });
            await responderRepo.save(admin);
            console.log("\n========================================");
            console.log("SUPER ADMIN CREATED SUCCESSFULLY");
            console.log(`Badge ID: ${adminBadge}`);
            console.log(`Password: ${adminPass}`);
            console.log("========================================\n");
        } else {
            // Update password just in case user forgot
            admin.password_hash = passwordHash;
            await responderRepo.save(admin);
            console.log("\n========================================");
            console.log("ADMIN CREDENTIALS UPDATED");
            console.log(`Badge ID: ${adminBadge}`);
            console.log(`Password: ${adminPass}`);
            console.log("========================================\n");
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error("Error seeding admin:", error);
    }
}

seedAdmin();
