
import { encrypt, decrypt } from '../crypto';

export function toIsoDate(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
    try {
        return new Date(value).toISOString();
    } catch {
        return null;
    }
}
