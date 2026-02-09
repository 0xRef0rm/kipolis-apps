import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const logDir = 'logs';

const transport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'kipolis-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
});

const auditTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[${timestamp}] AUDIT: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
});

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'kipolis-backend' },
    transports: [
        transport,
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

export const auditLogger = winston.createLogger({
    transports: [auditTransport],
});
