import {Kysely} from "kysely";

// Track whether the bot is currently a member of each server. The bot sets this
// on ready (reconciling every guild), on guildCreate/guildDelete, so the web
// service can list only the servers the user shares with the bot — without
// dropping the server's saved settings when the bot leaves.
export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("servers")
        .addColumn("bot_present", "integer", (col) => col.defaultTo(0).notNull())
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("servers")
        .dropColumn("bot_present")
        .execute();
}
