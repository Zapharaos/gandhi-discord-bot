import type { FastifyInstance } from 'fastify';
import { getServiceStatus } from './service';

export async function registerStatusRoutes(app: FastifyInstance): Promise<void> {
    // Public liveness of the whole stack (web + db + bot), for the dashboard's
    // health indicator. No auth: it exposes no user data, only aggregate status.
    app.get('/api/status', async () => getServiceStatus());
}
