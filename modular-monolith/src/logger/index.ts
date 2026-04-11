export interface Logger {
    debug(message: string, ...meta: any[]): void;
    info(message: string, ...meta: any[]): void;
    warn(message: string, ...meta: any[]): void;
    error(message: string, ...meta: any[]): void;
}

export class LoggerImpl implements Logger {
    debug(message: string, ...meta: any[]): void {
        if (process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production') {
            console.log(
                `[DEBUG] ${new Date().toISOString()} - ${message}`,
                ...meta,
            );
        }
    }

    info(message: string, ...meta: any[]): void {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...meta);
    }

    warn(message: string, ...meta: any[]): void {
        console.warn(
            `[WARN] ${new Date().toISOString()} - ${message}`,
            ...meta,
        );
    }

    error(message: string, ...meta: any[]): void {
        console.error(
            `[ERROR] ${new Date().toISOString()} - ${message}`,
            ...meta,
        );
    }
}

export const logger = new LoggerImpl();
