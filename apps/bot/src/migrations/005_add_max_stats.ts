import {Kysely} from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("user_stats")
        .addColumn("max_connected", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("max_muted", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("max_deafened", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("max_screen_sharing", "integer", (col) => col.defaultTo(0)).execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("max_camera", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("max_daily_streak", "integer", (col) => col.defaultTo(0))
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("user_stats")
        .dropColumn("max_connected")
        .dropColumn("max_muted")
        .dropColumn("max_deafened")
        .dropColumn("max_screen_sharing")
        .dropColumn("max_camera")
        .dropColumn("max_daily_streak")
        .execute();
}