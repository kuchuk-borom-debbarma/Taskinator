import { sql } from 'kysely';
import { db } from './database/index';

async function setup() {
    console.log('[Setup] Optimizing Database Triggers...');

    try {
        await sql`
            CREATE OR REPLACE FUNCTION notify_outbox_event() RETURNS trigger AS $$
            BEGIN
                PERFORM pg_notify('outbox_event_notification', NEW.id::text);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `.execute(db);

        await sql`
            DROP TRIGGER IF EXISTS trigger_notify_outbox_event ON outbox_events;
        `.execute(db);

        await sql`
            CREATE TRIGGER trigger_notify_outbox_event
            AFTER INSERT ON outbox_events
            FOR EACH ROW EXECUTE FUNCTION notify_outbox_event();
        `.execute(db);

        console.log('[Setup] Successfully installed NOTIFY trigger on outbox_events table.');
    } catch (err) {
        console.error('[Setup] Failed to setup triggers:', err);
    } finally {
        process.exit(0);
    }
}

setup();
