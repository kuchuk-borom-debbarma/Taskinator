import { eventRelayProvider } from '../../events/relay.ts';

export const processOutboxBatch = async () => {
    await eventRelayProvider.processBatch();
};

export const startOutboxRelay = () => {
    eventRelayProvider.start();
};

export const stopOutboxRelay = () => {
    eventRelayProvider.stop();
};
