import {Kysely, sql} from "kysely";

// Columns carried over from the old table into the rebuilt one, in a fixed order.
// Existing values (including each user's current stats/logs choice) are preserved.
const COLUMNS = [
    "guild_id", "user_id",
    "time_connected", "time_muted", "time_deafened", "time_screen_sharing", "time_camera",
    "last_activity", "daily_streak",
    "max_connected", "max_muted", "max_deafened", "max_screen_sharing", "max_camera", "max_daily_streak",
    "count_connected", "count_switch", "count_muted", "count_deafened", "count_screen_sharing", "count_camera",
    "stats", "logs", "private",
];

// SQLite cannot ALTER a column's default, so the only way to change it is to
// rebuild the table. `trackingDefault` sets the default for the `stats`/`logs`
// columns: 0 = opt-in required (up), 1 = the legacy opt-out behaviour (down).
async function rebuild(db: Kysely<unknown>, trackingDefault: 0 | 1): Promise<void> {
    await db.transaction().execute(async (trx) => {
        await trx.schema
            .createTable("user_stats_new")
            .addColumn("guild_id", "text")
            .addColumn("user_id", "text")
            .addColumn("time_connected", "integer", (col) => col.defaultTo(0))
            .addColumn("time_muted", "integer", (col) => col.defaultTo(0))
            .addColumn("time_deafened", "integer", (col) => col.defaultTo(0))
            .addColumn("time_screen_sharing", "integer", (col) => col.defaultTo(0))
            .addColumn("time_camera", "integer", (col) => col.defaultTo(0))
            .addColumn("last_activity", "integer", (col) => col.defaultTo(0))
            .addColumn("daily_streak", "integer", (col) => col.defaultTo(0))
            .addColumn("max_connected", "integer", (col) => col.defaultTo(0))
            .addColumn("max_muted", "integer", (col) => col.defaultTo(0))
            .addColumn("max_deafened", "integer", (col) => col.defaultTo(0))
            .addColumn("max_screen_sharing", "integer", (col) => col.defaultTo(0))
            .addColumn("max_camera", "integer", (col) => col.defaultTo(0))
            .addColumn("max_daily_streak", "integer", (col) => col.defaultTo(0))
            .addColumn("count_connected", "integer", (col) => col.defaultTo(0))
            .addColumn("count_switch", "integer", (col) => col.defaultTo(0))
            .addColumn("count_muted", "integer", (col) => col.defaultTo(0))
            .addColumn("count_deafened", "integer", (col) => col.defaultTo(0))
            .addColumn("count_screen_sharing", "integer", (col) => col.defaultTo(0))
            .addColumn("count_camera", "integer", (col) => col.defaultTo(0))
            .addColumn("stats", "integer", (col) => col.defaultTo(trackingDefault).notNull())
            .addColumn("logs", "integer", (col) => col.defaultTo(trackingDefault).notNull())
            .addColumn("private", "integer", (col) => col.defaultTo(0).notNull())
            .addPrimaryKeyConstraint("user_stats_new_pkey", ["guild_id", "user_id"])
            .execute();

        const cols = sql.join(COLUMNS.map((c) => sql.ref(c)));
        await sql`INSERT INTO user_stats_new (${cols}) SELECT ${cols} FROM user_stats`.execute(trx);

        await trx.schema.dropTable("user_stats").execute();
        await trx.schema.alterTable("user_stats_new").renameTo("user_stats").execute();
    });
}

export async function up(db: Kysely<unknown>): Promise<void> {
    // stats/logs become opt-in: new rows default to OFF unless the user turns them on.
    await rebuild(db, 0);
}

export async function down(db: Kysely<unknown>): Promise<void> {
    // Restore the legacy opt-out defaults (stats/logs ON by default).
    await rebuild(db, 1);
}
