import {Kysely} from "kysely";

// Per-day peak of concurrent voice sessions, sampled by the bot's heartbeat
// (~15s). One row per UTC day; the heartbeat only ever raises peak_sessions.
// Compact by design: a year of data is 365 rows.
export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable("daily_peaks")
        .addColumn("day_timestamp", "integer", (col) => col.primaryKey())
        .addColumn("peak_sessions", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("updated_at", "integer")
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable("daily_peaks").execute();
}
