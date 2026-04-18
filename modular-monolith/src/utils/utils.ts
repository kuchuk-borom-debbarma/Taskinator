export const getTimeString = () => {
    return new Date().toISOString();
};

export const getTime = () => {
    return Date.now();
};

export const encodeCursor = (timeValue: string | number, id: string): string => {
    // timeValue can be an ISO string or a microsecond epoch
    const str = `${timeValue}|${id}`;
    return Buffer.from(str).toString('base64url');
};

export const decodeCursor = (cursor: string): { timeValue: string, id: string } => {
    try {
        const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
        const [timeValue, id] = decoded.split('|');
        return { timeValue: timeValue || '', id: id || '' };
    } catch {
        return { timeValue: '', id: '' };
    }
};
