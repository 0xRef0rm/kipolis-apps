import "reflect-metadata";
import { AppDataSource } from "./config/database";
import { AuthService } from "./services/auth.service";
import { AuditLog } from "./entities/AuditLog";
import dotenv from "dotenv";

dotenv.config();

async function runSecurityTest() {
    try {
        await AppDataSource.initialize();
        console.log("--- STARTING SECURITY & AUDIT TEST ---");

        const auth = new AuthService();
        const auditRepo = AppDataSource.getRepository(AuditLog);

        const testBadge = "POL-VERIFY-001";
        const deviceA = "DEVICE_IPHONE_15_PRO";
        const deviceB = "DEVICE_ANDROID_ROG_6";

        // 1. Cleanup old test data
        await AppDataSource.query(`DELETE FROM audit_logs`);
        await AppDataSource.query(`DELETE FROM responders WHERE badge_number = $1`, [testBadge]);

        // 2. Register Responder
        console.log("[Test] Registering Responder...");
        await auth.registerResponder("ADMIN_CONSOLE_01", {
            name: "Iptu Security",
            phone: "0899112233",
            badge_number: testBadge,
            password: "SecurePassword123",
            type: "police",
            department: "Cyber Crime"
        });

        // 3. First Login (Hardware Binding)
        console.log("[Test] First Login from Device A...");
        await auth.responderLogin({
            identifier: testBadge,
            password: "SecurePassword123",
            device_id: deviceA
        });
        console.log(">> Login Success. Token generated.");

        // 4. Second Login from Different Device (Tamper Attempt)
        console.log("[Test] Login attempt from Device B (Should fail)...");
        try {
            await auth.responderLogin({
                identifier: testBadge,
                password: "SecurePassword123",
                device_id: deviceB
            });
        } catch (err: any) {
            console.log(">> Expected Rejection:", err.message);
        }

        // 5. Verify Audit Logs
        console.log("\n--- AUDIT TRAIL VERIFICATION ---");
        const logs = await auditRepo.find({ order: { created_at: "ASC" } });
        (logs as any[]).forEach((log: any) => {
            console.log(`[${log.created_at.toISOString()}] ${log.action} | User: ${log.user_id} | Device: ${log.device_id}`);
            if (log.action === 'SECURITY_ALERT_DEVICE_MISMATCH') {
                console.log("   --> ALERT DETAILS:", JSON.stringify(log.details));
            }
        });

        await AppDataSource.destroy();
        console.log("\n--- TEST COMPLETE ---");
    } catch (error) {
        console.error("Test Error:", error);
    }
}

runSecurityTest();
