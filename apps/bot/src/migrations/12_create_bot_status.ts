import {Kysely} from "kysely";

// Single-row (per shard) heartbeat table. The bot writes to it periodically; the
// read-only web service reads it to report whether the bot is alive, how many
// guilds it serves and its gateway latency. Keeping this in SQLite (rather than a
// cross-service HTTP ping) fits the existing "bot writes, web-api reads" split.
export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable("bot_status")
        .addColumn("shard_id", "integer", (col) => col.primaryKey())
        .addColumn("updated_at", "integer")
        .addColumn("ready", "integer")
        .addColumn("guild_count", "integer")
        .addColumn("ws_ping", "integer")
        .addColumn("started_at", "integer")
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable("bot_status").execute();
}
