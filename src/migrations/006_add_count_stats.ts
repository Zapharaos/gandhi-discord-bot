import {Kysely, sql} from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
    // Rename column
    await db.transaction().execute(async (trx) => {
        await trx.schema
            .alterTable('user_stats')
            .addColumn('count_connected', 'integer', (col) => col.defaultTo(0))
            .execute();

        // copy data from old column
        await trx
            .updateTable('user_stats' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .set({ count_connected: sql`total_joins`})
            .execute();

        await trx.schema
            .alterTable('user_stats')
            .dropColumn('total_joins')
            .execute();
    });

    await db.schema
        .alterTable("user_stats")
        .addColumn("count_switch", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("count_muted", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("count_deafened", "integer", (col) => col.defaultTo(0))
        .execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("count_screen_sharing", "integer", (col) => col.defaultTo(0)).execute();

    await db.schema
        .alterTable("user_stats")
        .addColumn("count_camera", "integer", (col) => col.defaultTo(0))
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    // Rename column
    await db.transaction().execute(async (trx) => {
        await trx.schema
            .alterTable('user_stats')
            .addColumn('total_joins', 'integer')
            .execute();

        // copy data from old column
        await trx
            .updateTable('user_stats' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .set({ total_joins: db.dynamic.ref('count_connected') as unknown as number })
            .execute();

        await trx.schema
            .alterTable('user_stats')
            .dropColumn('count_connected')
            .execute();
    });

    await db.schema
        .alterTable("user_stats")
        .dropColumn("max_connected")
        .dropColumn("count_muted")
        .dropColumn("count_deafened")
        .dropColumn("count_screen_sharing")
        .dropColumn("count_camera")
        .execute();
}