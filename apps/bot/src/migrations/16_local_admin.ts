import {Kysely} from "kysely";

// A local "server manager" role, stored per user per guild, that grants access to
// the web server-settings without needing Discord Manage-Server permissions. Only
// the guild owner can grant it. `servers.owner_id` is cached by the bot so the web
// knows who the owner is.
export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("user_stats")
        .addColumn("local_admin", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("servers")
        .addColumn("owner_id", "text")
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable("user_stats").dropColumn("local_admin").execute();
    await db.schema.alterTable("servers").dropColumn("owner_id").execute();
}
