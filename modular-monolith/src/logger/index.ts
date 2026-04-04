export interface Logger {
    info(message: string, ...meta: any[]): void;
    warn(message: string, ...meta: any[]): void;
    error(message: string, ...meta: any[]): void;
}

export class LoggerImpl implements Logger {
    info(message: string, ...meta: any[]): void {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...meta);
    }

    warn(message: string, ...meta: any[]): void {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...meta);
    }

    error(message: string, ...meta: any[]): void {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...meta);
    }
}

export const logger = new LoggerImpl();
