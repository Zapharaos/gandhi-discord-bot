import {Kysely} from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("user_stats")
        .addColumn("time_camera", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("last_activity", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("daily_streak", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("total_joins", "integer", (col) => col.defaultTo(0))
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("user_stats")
        .dropColumn("time_camera")
        .dropColumn("last_activity")
        .dropColumn("daily_streak")
        .dropColumn("total_joins")
        .execute()
}