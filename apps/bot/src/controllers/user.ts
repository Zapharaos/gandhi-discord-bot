import {getDb} from '@services/database'
import {Logger} from '@services/logger';

export class UserController {

    /**
     * Cache a user's Discord identity so the web service can render real names and
     * avatars in the leaderboard. Called on every tracked voice event; best-effort.
     */
    static async syncIdentity(
        userId: string,
        username: string,
        globalName: string | null,
        avatar: string | null,
    ): Promise<void> {
        const db = await getDb();
        if (!db) return;
        try {
            const values = {
                username,
                global_name: globalName,
                avatar,
                updated_at: Date.now(),
            };
            await db
                .insertInto('users')
                .values({ user_id: userId, ...values })
                .onConflict((oc) => oc.column('user_id').doUpdateSet(values))
                .execute();
        } catch (err) {
            await Logger.error(`Error syncing user identity ${userId}`, err);
        }
    }
}
