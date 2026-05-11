
import { encrypt, decrypt } from '../crypto';

export function toIsoDate(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
    if (value && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6).toISOString();
    }
    try {
        return new Date(value).toISOString();
    } catch {
        return null;
    }
}
