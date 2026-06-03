import { v4 as uuid } from 'uuid';
import { getTimeString } from '../utils.ts';
import type { DomainEvent } from './types.ts';

export function createEvent(
    type: string,
    key: string | null,
    data: any,
    id?: string,
): DomainEvent {
    return {
        eventId: id || uuid(),
        type,
        key,
        data,
        timestamp: getTimeString(),
    };
}
