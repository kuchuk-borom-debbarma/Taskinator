import type { EventBusPort } from '../../contracts/index.ts';
import { KafkaBus } from './KafkaBus.ts';
import { MemoryBus } from './MemoryBus.ts';
import type { Bus } from './types.ts';

export * from './constants.ts';
export * from './types.ts';

const createBus = (): Bus => {
    const provider =
        process.env.EVENT_BUS_PROVIDER ||
        (process.env.NODE_ENV === 'test' ||
        process.env.USE_MEMORY_BUS === 'true'
            ? 'memory'
            : 'kafka');

    if (provider === 'memory') return new MemoryBus();
    if (provider === 'kafka') return new KafkaBus();

    throw new Error(`Unsupported EVENT_BUS_PROVIDER "${provider}"`);
};

const bus = createBus();

export const eventBusProvider: EventBusPort = {
    name: process.env.EVENT_BUS_PROVIDER || bus.constructor.name,
    bus,
    init: () => bus.init(),
    destroy: () => bus.destroy(),
};

const eventBus = eventBusProvider.bus;

export default eventBus;
