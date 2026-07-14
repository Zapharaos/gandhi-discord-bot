import {Kysely} from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable("start_timestamps")
        .addColumn("guild_id", "text")
        .addColumn("user_id", "text")
        .addColumn("start_connected", "integer", (col) => col.defaultTo(0))
        .addColumn("start_muted", "integer", (col) => col.defaultTo(0))
        .addColumn("start_deafened", "integer", (col) => col.defaultTo(0))
        .addColumn("start_screen_sharing", "integer", (col) => col.defaultTo(0))
        .addColumn("start_camera", "integer", (col) => col.defaultTo(0))
        .addPrimaryKeyConstraint("start_timestamps_pkey", ["guild_id", "user_id"])
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable("start_timestamps").ifExists().execute()
}