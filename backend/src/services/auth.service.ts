import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Responder } from "../entities/Responder";
import { AuditLog } from "../entities/AuditLog";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

/**
 * Auth Service - Mission Critical Security logic
 */
export class AuthService {
    private userRepository = AppDataSource.getRepository(User);
    private responderRepository = AppDataSource.getRepository(Responder);
    private auditRepository = AppDataSource.getRepository(AuditLog);

    private readonly JWT_SECRET = process.env.JWT_SECRET || "kipolis-super-secret-key-2026";
    private readonly SALT_ROUNDS = 12;

    private generateToken(payload: { id: string; type: 'victim' | 'responder' | 'admin'; role?: string }): string {
        return jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: "24h",
            issuer: "KIPOLIS_CENTRAL_AUTH"
        });
    }

    private async logAudit(data: {
        user_id?: string;
        user_type: string;
        action: string;
        details?: any;
        device_id?: string;
        ip?: string;
    }) {
        const log = this.auditRepository.create({
            user_id: data.user_id,
            user_type: data.user_type,
            action: data.action,
            details: data.details,
            device_id: data.device_id,
            ip_address: data.ip
        });
        await this.auditRepository.save(log);
    }

    /**
     * [VICTIM] Login with OTP + Device Binding
     */
    async victimLogin(data: { phone: string; otp: string; device_id?: string; ip?: string }): Promise<any> {
        let user = await this.userRepository.findOneBy({ phone: data.phone });
        const isNewUser = !user;

        if (isNewUser) {
            user = this.userRepository.create({
                phone: data.phone,
                name: "Citizen_" + data.phone.slice(-4),
                status: "active"
            });
            await this.userRepository.save(user);
        }

        // Mock OTP Check
        if (data.otp !== "123456" && process.env.NODE_ENV !== "test") {
            await this.logAudit({
                user_id: user?.id,
                user_type: 'victim',
                action: 'LOGIN_FAILED_OTP',
                device_id: data.device_id,
                ip: data.ip
            });
            throw new Error("Invalid OTP");
        }

        // Update Security Info
        if (user) {
            user.last_login_at = new Date();
            user.login_attempts = 0;
            await this.userRepository.save(user);

            // Audit Trail
            await this.logAudit({
                user_id: user.id,
                user_type: 'victim',
                action: isNewUser ? 'REGISTER' : 'LOGIN',
                device_id: data.device_id,
                ip: data.ip,
                details: { method: 'OTP' }
            });

            const token = this.generateToken({ id: user.id, type: 'victim' });

            return {
                token,
                user: { id: user.id, phone: user.phone, name: user.name }
            };
        }
        throw new Error("Login failed");
    }

    /**
     * [RESPONDER] Register (Admin only)
     */
    async registerResponder(adminId: string, data: any): Promise<Responder> {
        const existing = await this.responderRepository.findOneBy({ badge_number: data.badge_number });
        if (existing) throw new Error("Badge number already registered");

        const password_hash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

        const responder = this.responderRepository.create({
            badge_number: data.badge_number,
            name: data.name,
            phone: data.phone,
            type: data.type,
            department: data.department,
            password_hash: password_hash,
            status: "off_duty",
            is_active: true
        });

        const saved = await this.responderRepository.save(responder);

        await this.logAudit({
            user_id: adminId,
            user_type: 'system',
            action: 'RESPONDER_REGISTERED',
            details: { target_responder: saved.id, badge: saved.badge_number }
        });

        return saved;
    }

    /**
     * [RESPONDER] Login with Hardware Binding
     */
    async responderLogin(data: { identifier: string; password: string; device_id: string; ip?: string }): Promise<any> {
        const responder = await this.responderRepository.createQueryBuilder("r")
            .where("r.badge_number = :id OR r.phone = :id", { id: data.identifier })
            .addSelect("r.password_hash")
            .getOne();

        if (!responder) throw new Error("Credentials mismatch");

        // Device Binding Logic
        if (responder.device_id && responder.device_id !== data.device_id) {
            await this.logAudit({
                user_id: responder.id,
                user_type: 'responder',
                action: 'SECURITY_ALERT_DEVICE_MISMATCH',
                device_id: data.device_id,
                details: { expected: responder.device_id, current: data.device_id }
            });
            throw new Error("Account is bound to another hardware device. Contact admin.");
        }

        const isMatch = await bcrypt.compare(data.password, (responder as any).password_hash!);
        if (!isMatch) {
            await this.responderRepository.increment({ id: responder.id }, "login_attempts", 1);
            await this.logAudit({ user_id: responder.id, user_type: 'responder', action: 'LOGIN_FAILED_CRED', device_id: data.device_id });
            throw new Error("Credentials mismatch");
        }

        // First time binding
        if (!responder.device_id) {
            responder.device_id = data.device_id;
            await this.logAudit({ user_id: responder.id, user_type: 'responder', action: 'DEVICE_BOUND', device_id: data.device_id });
        }

        responder.login_attempts = 0;
        responder.last_login_at = new Date();
        await this.responderRepository.save(responder);

        await this.logAudit({ user_id: responder.id, user_type: 'responder', action: 'LOGIN', device_id: data.device_id, ip: data.ip });

        const token = this.generateToken({
            id: responder.id,
            type: 'responder',
            role: responder.type
        });

        return {
            token,
            responder: { id: responder.id, name: responder.name, badge: responder.badge_number, type: responder.type }
        };
    }
}
