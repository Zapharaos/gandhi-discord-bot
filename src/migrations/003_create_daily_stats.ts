import {Kysely} from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable("daily_stats")
        .addColumn("guild_id", "text")
        .addColumn("user_id", "text")
        .addColumn("day_timestamp", "integer", (col) => col.defaultTo(0))
        .addColumn("time_connected", "integer", (col) => col.defaultTo(0))
        .addColumn("time_muted", "integer", (col) => col.defaultTo(0))
        .addColumn("time_deafened", "integer", (col) => col.defaultTo(0))
        .addColumn("time_screen_sharing", "integer", (col) => col.defaultTo(0))
        .addColumn("time_camera", "integer", (col) => col.defaultTo(0))
        .addPrimaryKeyConstraint("daily_stats_pkey", ["guild_id", "user_id", "day_timestamp"])
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable("daily_stats").ifExists().execute()
}