import {Kysely} from "kysely";

// Track WHEN the bot joined/left each server (bot_present only says whether).
// joined_at is stamped on the first sync after this migration for servers the
// bot is already in, so pre-existing servers read as "joined at deploy time".
// left_at is stamped by guildDelete; a departure that happens while the bot is
// offline stays NULL (date unknown).
export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("servers")
        .addColumn("joined_at", "integer")
        .execute();
    await db.schema
        .alterTable("servers")
        .addColumn("left_at", "integer")
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable("servers").dropColumn("joined_at").execute();
    await db.schema.alterTable("servers").dropColumn("left_at").execute();
}
