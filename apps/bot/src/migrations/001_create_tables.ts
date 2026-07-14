import {Kysely} from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable("servers")
        .addColumn("guild_id", "text", (col) => col.primaryKey())
        .addColumn("log_channel_id", "text")
        .execute()

    await db.schema
        .createTable("user_stats")
        .addColumn("guild_id", "text")
        .addColumn("user_id", "text")
        .addColumn("time_connected", "integer", (col) => col.defaultTo(0))
        .addColumn("time_muted", "integer", (col) => col.defaultTo(0))
        .addColumn("time_deafened", "integer", (col) => col.defaultTo(0))
        .addColumn("time_screen_sharing", "integer", (col) => col.defaultTo(0))
        .addPrimaryKeyConstraint("user_stats_pkey", ["guild_id", "user_id"])
        .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable("servers").ifExists().execute()
    await db.schema.dropTable("user_stats").ifExists().execute()
}