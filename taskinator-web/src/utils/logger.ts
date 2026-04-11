/* eslint-disable no-console */
export const logger = {
    debug: (message: string, ...args: any[]) => {
        if (import.meta.env.DEV) {
            console.debug(`%c[DEBUG] ${message}`, 'color: #888', ...args);
        }
    },
    info: (message: string, ...args: any[]) => {
        console.info(`%c[INFO] ${message}`, 'color: #3b82f6; font-weight: bold', ...args);
    },
    warn: (message: string, ...args: any[]) => {
        console.warn(`[WARN] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
        console.error(`[ERROR] ${message}`, ...args);
    }
};
