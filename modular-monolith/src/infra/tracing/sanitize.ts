const SECRET_KEY_PATTERN =
    /(password|password_hash|passwordRaw|password_raw|jwt|token|cookie|authorization|authHeader|secret|session)/i;

export function safeTraceData(value: unknown): Record<string, unknown> {
    return sanitizeValue(value, new WeakSet()) as Record<string, unknown>;
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string')
        return value.length > 500 ? `${value.slice(0, 500)}...` : value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
        return value.slice(0, 25).map((item) => sanitizeValue(item, seen));
    }
    if (typeof value !== 'object') return String(value);

    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
        if (SECRET_KEY_PATTERN.test(key)) {
            output[key] = '[REDACTED]';
            continue;
        }
        output[key] = sanitizeValue(nested, seen);
    }
    return output;
}
