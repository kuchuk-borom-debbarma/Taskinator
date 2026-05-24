import { KafkaBus } from './KafkaBus.ts';
import { MemoryBus } from './MemoryBus.ts';
import type { Bus } from './types.ts';

export * from './AggregatorService.ts';
export * from './constants.ts';
export * from './types.ts';

const eventBus: Bus =
    process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_BUS === 'true'
        ? new MemoryBus()
        : new KafkaBus();

export default eventBus;
