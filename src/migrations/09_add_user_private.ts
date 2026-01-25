import {Kysely} from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("user_stats")
        .addColumn("private", "integer", (col) => col.defaultTo(0).notNull())
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("user_stats")
        .dropColumn("private")
        .execute();
}
