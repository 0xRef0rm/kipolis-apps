import "reflect-metadata";
import { AppDataSource } from "./config/database";
import { IncidentService } from "./services/incident.service";
import { User } from "./entities/User";
import { Incident } from "./entities/Incident";
import dotenv from "dotenv";

dotenv.config();

const SCENARIOS = [
    { name: "JAKARTA_FIRE_CENTRAL", lat: -6.1754, lng: 106.8272, type: "fire_emergency" }, // Monas Area
    { name: "JAKARTA_MEDICAL_URGENT", lat: -6.1850, lng: 106.8320, type: "medical_emergency" },
    { name: "PURWAKARTA_STRUCTURE_FIRE", lat: -6.5510, lng: 107.4420, type: "fire_emergency" },
    { name: "CIREBON_PANIC_ACTIVE", lat: -6.7120, lng: 108.5620, type: "manual_panic" },
    { name: "JAKARTA_POLICE_REQ", lat: -6.1900, lng: 106.8400, type: "manual_panic" }
];

async function runSimulation() {
    try {
        await AppDataSource.initialize();
        console.log("🚀 PREPARING SIMULATION...");

        const userRepo = AppDataSource.getRepository(User);
        const incidentService = new IncidentService();
        const TEST_USER_ID = "1c2837f7-a66d-4dc9-9217-1be3e1ef2031";

        // 1. Prepare User (Ensure profiling is complete to pass security check)
        let user = await userRepo.findOneBy({ id: TEST_USER_ID });
        if (user) {
            user.nik = "SIM-123456789";
            user.blood_type = "B+";
            user.address = "Tactical Simulation Center, Sector 7";
            await userRepo.save(user);
            console.log("✓ Test User Profiling Completed (Security Check Passed)");
        } else {
            console.error("Test user not found. Run seed-full first.");
            return;
        }

        console.log("-------------------------------------------------");
        console.log("🛰️  INJECTING TACTICAL INCIDENTS...");

        for (const scene of SCENARIOS) {
            process.stdout.write(`[Sim] Injecting ${scene.name}... `);

            const incident = await incidentService.createIncident({
                user_id: TEST_USER_ID,
                latitude: scene.lat,
                longitude: scene.lng,
                trigger_type: scene.type,
                breadcrumbs: [
                    { latitude: scene.lat - 0.001, longitude: scene.lng - 0.001, timestamp: new Date().toISOString() },
                    { latitude: scene.lat - 0.0005, longitude: scene.lng - 0.0005, timestamp: new Date().toISOString() }
                ],
                device_info: {
                    platform: "SIMULATOR_NODE",
                    status: "MISSION_ACTIVE"
                }
            });

            console.log(`✅ ID: ${incident.id.slice(0, 8)} | Region: ${incident.region_id ? "IDENTIFIED" : "NONE"}`);

            // Wait 1.2s between injections
            await new Promise(r => setTimeout(r, 1200));
        }

        console.log("-------------------------------------------------");
        console.log("🏁 INJECTION COMPLETE. VIEW DASHBOARD NOW.");
        console.log("To clean up data later, run: npx ts-node src/simulate-incidents.ts --clean");

        if (process.argv.includes('--clean')) {
            console.log("\n🧹 CLEANING UP SIMULATED DATA...");
            await AppDataSource.getRepository(Incident).delete({ user_id: TEST_USER_ID });
            console.log("✓ All simulated incidents removed.");
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error("\n❌ Simulation Error:", error);
    }
}

runSimulation();
