import {Kysely} from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("servers")
        .addColumn("stats", "integer", (col) => col.defaultTo(1).notNull())
        .execute();

    await db.schema
        .alterTable("servers")
        .addColumn("logs", "integer", (col) => col.defaultTo(1).notNull())
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("servers")
        .dropColumn("stats")
        .dropColumn("logs")
        .execute();
}
