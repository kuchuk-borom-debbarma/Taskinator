import type { TaskContext } from '../types.js';

/**
 * Resolves current and previous values for standard task fields.
 */
export function getTaskFieldValues(
    field: 'status' | 'priority' | 'title' | 'version',
    ctx: TaskContext,
): { currentValue: any; prevValue: any } {
    let prevKey: keyof TaskContext;
    let currentKey: keyof TaskContext;

    switch (field) {
        case 'status':
            prevKey = 'prev_status';
            currentKey = 'current_status';
            break;
        case 'priority':
            prevKey = 'prev_priority';
            currentKey = 'current_priority';
            break;
        case 'title':
            prevKey = 'prev_title';
            currentKey = 'current_title';
            break;
        case 'version':
            prevKey = 'prev_version';
            currentKey = 'current_version';
            break;
    }

    return {
        currentValue: ctx[currentKey],
        prevValue: ctx[prevKey],
    };
}
