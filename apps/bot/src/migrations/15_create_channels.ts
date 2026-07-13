import {Kysely} from "kysely";

// Cache each guild's text channels (id + name) so the web service can validate a
// log-channel id and render its name — it has no access to Discord. The bot keeps
// this fresh on ready and on channel create/update/delete (see ChannelController).
export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable("channels")
        .addColumn("guild_id", "text")
        .addColumn("channel_id", "text")
        .addColumn("name", "text")
        .addPrimaryKeyConstraint("channels_pkey", ["guild_id", "channel_id"])
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable("channels").ifExists().execute();
}
