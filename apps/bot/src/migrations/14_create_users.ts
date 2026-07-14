import {Kysely} from "kysely";

// Cache each tracked user's Discord identity (username, global display name, avatar
// hash) so the web service — which has no access to the bot's live Discord cache —
// can render real names and avatars in the leaderboard. The bot keeps these fresh
// on every voice event (see UserController.syncIdentity). Only ever surfaced for
// non-private members; private members are never itemised.
export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable("users")
        .addColumn("user_id", "text", (col) => col.primaryKey())
        .addColumn("username", "text")
        .addColumn("global_name", "text")
        .addColumn("avatar", "text")
        .addColumn("updated_at", "integer")
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable("users").ifExists().execute();
}
