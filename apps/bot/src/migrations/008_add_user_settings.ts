import {Kysely} from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("user_stats")
        .addColumn("stats", "integer", (col) => col.defaultTo(1).notNull())
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("logs", "integer", (col) => col.defaultTo(1).notNull())
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("user_stats")
        .dropColumn("stats")
        .dropColumn("logs")
        .execute();
}
