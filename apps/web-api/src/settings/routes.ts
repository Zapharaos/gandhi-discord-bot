import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { getSettings, updateSettings, type SettingsPatch } from './service';

const guildIdPattern = '^[0-9]{5,25}$';

const patchBodySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        // Optional: absent = apply globally to every server the user shares with the bot.
        guildId: { type: 'string', pattern: guildIdPattern },
        stats: { type: 'boolean' },
        logs: { type: 'boolean' },
        private: { type: 'boolean' },
    },
};

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
    // Read the caller's per-server settings.
    app.get('/api/settings', { preHandler: requireAuth }, async (request) => {
        const session = request.authSession!;
        return { guilds: await getSettings(session) };
    });

    // Update the caller's OWN settings (their opt-in flags). This is the only
    // write path in the web service; everything else is read-only.
    app.patch<{ Body: { guildId?: string } & SettingsPatch }>(
        '/api/settings',
        { preHandler: requireAuth, schema: { body: patchBodySchema } },
        async (request) => {
            const session = request.authSession!;
            const { guildId, ...patch } = request.body;
            const result = await updateSettings(session, patch, guildId);
            return { ...result, guilds: await getSettings(session) };
        },
    );
}
