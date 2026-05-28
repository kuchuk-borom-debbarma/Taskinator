import { ContainerType, Tracer } from 'nodejs';

// Initialize Topo-Tracer globally for logical monolith boundary mapping
try {
    Tracer.init(
        { baseUrl: process.env.TOPO_TRACER_URL || 'http://localhost:3000' },
        {
            name: 'GraphQL Gateway',
            containerType: ContainerType.EXPRESS_API,
            id: 'gateway',
        },
    );

    // Pre-register every logical container up-front so that concurrent background
    // workers (outbox relay, event bus) never race on registerContainer at runtime.
    const containers = [
        {
            id: 'auth-module',
            name: 'Auth Module',
            containerType: 'Logical Domain Module',
        },
        {
            id: 'project-module',
            name: 'Project Module',
            containerType: 'Logical Domain Module',
        },
        {
            id: 'task-module',
            name: 'Task Module',
            containerType: 'Logical Domain Module',
        },
        {
            id: 'team-module',
            name: 'Team Module',
            containerType: 'Logical Domain Module',
        },
        {
            id: 'outbox-relay',
            name: 'Outbox Relay',
            containerType: 'Background Worker',
        },
        {
            id: 'event-bus',
            name: 'Event Bus',
            containerType: 'Message Broker Adapter',
        },
    ] as const;

    for (const c of containers) {
        Tracer.registerContainer(c);
    }

    console.log(
        '[Topo-Tracer] Initialized — pointing to backend at',
        process.env.TOPO_TRACER_URL || 'http://localhost:3000',
    );
    console.log(
        `[Topo-Tracer] Registered ${containers.length + 1} containers (gateway + modules)`,
    );
} catch (error) {
    console.error('[Topo-Tracer] Error initializing tracer', error);
}

// Gracefully flush and shut down Topo-Tracer on process exit
const gracefulShutdown = async () => {
    try {
        await Tracer.shutdown();
        console.log('[Topo-Tracer] Telemetry flushed & terminated');
    } catch (error) {
        console.error('[Topo-Tracer] Error during shutdown', error);
    }
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
