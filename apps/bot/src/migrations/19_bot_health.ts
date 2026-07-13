import {Kysely} from "kysely";

// Detailed bot health tracking, written by the bot's heartbeat loop:
//   • bot_metrics — one sample per minute (memory, event-loop lag, ws ping,
//     active sessions, command counters). Pruned after 14 days (~20k rows).
//   • bot_events — lifecycle/incident log (startup, shutdown, shard
//     disconnects/resumes, client errors, command errors). Pruned after 90 days.
// Both carry shard_id so a future multi-shard setup needs no migration.
export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable("bot_metrics")
        .addColumn("shard_id", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("sampled_at", "integer", (col) => col.notNull())
        .addColumn("ready", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("guild_count", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("ws_ping", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("rss_bytes", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("heap_used_bytes", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("loop_lag_mean_ms", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("loop_lag_max_ms", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("active_sessions", "integer", (col) => col.defaultTo(0).notNull())
        // Command counters cover the interval since the previous sample;
        // average latency = command_latency_ms_total / (commands_ok + commands_error).
        .addColumn("commands_ok", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("commands_error", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("command_latency_ms_total", "integer", (col) => col.defaultTo(0).notNull())
        // The composite PK doubles as the range-scan index for history queries.
        .addPrimaryKeyConstraint("bot_metrics_pk", ["shard_id", "sampled_at"])
        .execute();

    await db.schema
        .createTable("bot_events")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("shard_id", "integer", (col) => col.defaultTo(0).notNull())
        .addColumn("timestamp", "integer", (col) => col.notNull())
        .addColumn("type", "text", (col) => col.notNull())
        .addColumn("detail", "text")
        .execute();

    await db.schema
        .createIndex("bot_events_timestamp")
        .on("bot_events")
        .column("timestamp")
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable("bot_events").execute();
    await db.schema.dropTable("bot_metrics").execute();
}
