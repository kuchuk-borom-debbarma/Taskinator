import { MemoryBus } from './MemoryBus.ts';
import { KafkaBus } from './KafkaBus.ts';
import type { Bus } from './types.ts';
export * from './types.ts';
export * from './constants.ts';

const eventBus: Bus =
    process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_BUS === 'true'
        ? new MemoryBus()
        : new KafkaBus();

export default eventBus;
