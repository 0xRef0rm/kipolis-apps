import "reflect-metadata";
import { AppDataSource } from "./config/database";
import { User } from "./entities/User";
import { Responder } from "./entities/Responder";
import dotenv from "dotenv";

dotenv.config();

async function seed() {
    try {
        await AppDataSource.initialize();
        console.log("Database initialized");

        const userRepo = AppDataSource.getRepository(User);
        const responderRepo = AppDataSource.getRepository(Responder);

        // 1. Create Test User (Victim)
        let testUser = await userRepo.findOneBy({ phone: "08123456789" });
        if (!testUser) {
            testUser = userRepo.create({
                id: "1c2837f7-a66d-4dc9-9217-1be3e1ef2031", // Fixed ID for testing
                phone: "08123456789",
                name: "Budi Victim",
                email: "budi@example.com",
                status: "active"
            });
            await userRepo.save(testUser);
            console.log("Test user created");
        } else {
            console.log("Test user already exists");
        }

        // 2. Create Test Responder (Police)
        let testResponder = await responderRepo.findOneBy({ phone: "08987654321" });
        if (!testResponder) {
            testResponder = responderRepo.create({
                id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6", // Fixed ID for testing
                phone: "08987654321",
                name: "Aiptu Bambang",
                type: "police",
                status: "available",
                badge_number: "POL-123",
                department: "Polsek Gambir",
                current_latitude: -6.175392, // Near Monas
                current_longitude: 106.827153,
                is_active: true
            });
            await responderRepo.save(testResponder);

            // Set PostGIS location
            await AppDataSource.query(
                `UPDATE responders SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE id = $3`,
                [testResponder.current_longitude, testResponder.current_latitude, testResponder.id]
            );

            console.log("Test responder created");
        } else {
            console.log("Test responder already exists");
        }

        await AppDataSource.destroy();
        console.log("Seeding complete!");
    } catch (error) {
        console.error("Error seeding data:", error);
    }
}

seed();
