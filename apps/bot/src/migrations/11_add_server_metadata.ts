import {Kysely} from "kysely";

// Cache the guild's display name and icon on the servers row so the web service —
// which has no access to the bot's live Discord cache — can render server names and
// icons. The bot keeps these fresh (see ServerController.updateMetadata).
export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("servers")
        .addColumn("guild_name", "text")
        .execute();

    await db.schema
        .alterTable("servers")
        .addColumn("guild_icon", "text")
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .alterTable("servers")
        .dropColumn("guild_name")
        .dropColumn("guild_icon")
        .execute();
}
