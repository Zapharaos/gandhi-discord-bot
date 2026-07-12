![GitHub License](https://img.shields.io/github/license/zapharaos/gandhi-discord-bot)
![GitHub Release](https://img.shields.io/github/v/release/zapharaos/gandhi-discord-bot)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/zapharaos/gandhi-discord-bot/node.yml)
[![codecov](https://codecov.io/gh/Zapharaos/gandhi-discord-bot/graph/badge.svg?token=BL7YP0GTK9)](https://codecov.io/gh/Zapharaos/gandhi-discord-bot)

# Gandhi Discord Bot

This project is a voice activity tracker for a Discord bot. It tracks various user activities in voice channels and produces statistics.

## Features

It tracks the following user activities in voice channels:
- movement actions: join, leave, switch
- mute/unmute actions
- deafen/undeafen actions
- screen sharing start/stop actions
- camera on/off actions

It provides the following statistics:
- time spent connected
- time spent muted
- time spent deafened
- time spent screen sharing
- time spent with camera on
- a yearly calendar heatmap for each time statistic mentioned above (per user or per guild)
- daily streaks (how many days in a row the user has been active)
- maximum stats (the longest/highest value for each statistic)
- event counters (how many times the user has triggered an event inside a voice channel)

## Download

Click on [this link](https://discord.com/oauth2/authorize?client_id=1345799506217930876) to add the bot to your server. Enable the required permissions and you're good to go!

The first step is to configure your server settings using the following command:
- `/serversettings [stats] [logs] [logchannel]` - Configure server settings for stats tracking and event logs.

You can enable/disable stats tracking, enable/disable event logs, and set the log channel all in one command. For example:
- `/serversettings stats:ON logs:ON logchannel:#bot-logs` - Enable everything and set the log channel
- `/serversettings stats:OFF` - Disable stats tracking only
- `/serversettings logs:OFF` - Disable event logs only

Additionally, each user can configure their own personal settings:
- `/usersettings [stats] [logs] [private]` - Configure your personal settings for stats tracking, event logs, and privacy.

Stats and event logs are **opt-in per user**: by default you are not tracked, and you must explicitly enable each feature for yourself before anything is recorded. Both settings are independent.

For example:
- `/usersettings stats:ON` - Opt-in to stats tracking for yourself
- `/usersettings logs:ON` - Opt-in to event logs for yourself
- `/usersettings stats:OFF` - Opt back out of stats tracking
- `/usersettings logs:OFF` - Opt back out of event logs
- `/usersettings private:ON` - Enable private mode (hide from others)

**Note:** Both server and user settings must be enabled for a feature to work. The server must allow stats/logs *and* the user must have opted in; if either side has it disabled, the feature is disabled for that user.

**Private Mode:** When enabled, other users cannot:
- Target you with commands like `/stats`, `/biggusdickus`, or `/heatmap`
- See your data in ranking lists (`/rank`) or inactive user lists (`/list-inactives`)
- However, you can still run all commands and see your own data in the results (responses are private to you)

Now every user's actions in voice channels will be tracked and/or logged based on your settings.

## Commands

The following commands are available:
- `/serversettings [stats] [logs] [logchannel]` - Configure server settings for stats tracking and event logs.
- `/usersettings [stats] [logs] [private]` - Configure your personal settings for stats tracking, event logs, and privacy (private response).
- `/myservers` - Lists every server where we hold stats data linked to you, with the tracking status for each (private response).
- `/reset-stats [scope]` - Resets your stats to zero on this server or all servers; keeps your settings and daily history (private response, asks for confirmation).
- `/delete-data [scope]` - Permanently deletes all data linked to you (stats, daily history, settings) on this server or all servers (private response, asks for confirmation).
- `/export [scope]` - Exports a copy of all data linked to you as a JSON file, for this server or all servers (private response; gzip-compressed if large).
- `/stats [user]` - Returns the stats for a specific user (default: yourself).
- `/rank [stat]` - Returns the server ranking for a specific stat (default: time connected).
- `/heatmap [target] [target-all] [stat] [format]` - Returns the yearly calendar heatmap (default: yourself, time connected, png).
- `/list-inactive [days]` - Returns the list of inactive users (default: 100 days).

## Data & Privacy

The bot only stores the minimum needed to produce statistics: aggregated per-user/per-guild counters and time totals (`user_stats`), a per-day activity history (`daily_stats`), and your personal settings. No message content is stored. In-progress voice sessions (`start_timestamps`) are transient live state — the elapsed time is committed to your stats only once the session ends (or on a graceful shutdown, see below).

**Opt-in by design.** Nothing about a user is recorded until *both* the server enables the feature *and* the user opts in via `/usersettings`. By default a user is not tracked.

**Data preservation and lifecycle.** Your data lives only as long as it is relevant:
- **Leaving a server:** when a member leaves (or is removed from) a guild, all data linked to that user on that guild — stats, daily history and start timestamps — is automatically deleted. Nothing is kept behind after you leave.
- **Restart safety:** restarts never inflate your totals. On a graceful shutdown (e.g. `SIGINT`/`SIGTERM`) the bot flushes in-progress sessions, saving the time elapsed so far. On startup it discards any stale live state (which would otherwise count downtime as activity) and re-seeds currently-connected members from "now" by scanning the voice channels. The net effect is that only the gap between stop and start is lost — never a whole session, and never inflated by the downtime. Sessions that could not be flushed (a crash or `SIGKILL`) are covered by the startup re-seed. This reconciliation only runs in production; in development the live state is preserved across restarts.
- **Backups:** the database can be backed up on a schedule (see [Database Backups](#database-backups)). Backups are stored locally by the server operator and are the only place historical copies of the data may persist.

**Your rights over your data.** Every user can inspect and manage their own data at any time, without needing an admin. All of these commands reply privately (only you see the response) and are scoped to either the current server or all servers you share with the bot:
- `/myservers` — **list**: see every server where the bot holds data linked to you, and the tracking status for each. This is your data-access overview.
- `/reset-stats [scope]` — **reset**: zero out your aggregated stats while keeping your settings and daily history. Asks for confirmation; the reset totals cannot be recovered.
- `/delete-data [scope]` — **delete/erasure**: permanently remove *all* data linked to you (stats, daily history and settings). Asks for confirmation; you revert to the default "not tracked" state.
- `/export [scope]` — **export/portability**: download a copy of everything the bot holds about you as a JSON file (gzip-compressed automatically if it is too large for a single Discord upload).

For the `scope` option, the default is the current server; choosing "all servers" applies the action across every server you share with the bot (use it from a DM to act globally).

## Development

First follow the official Discord documentation [here](https://discord.com/developers/docs/quick-start/getting-started) to setup a bot, get the credentials and update the .env file.

This repository is an [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) monorepo:

```
packages/core   # @gandhi/core — shared pure domain layer (DB types, models, helpers)
apps/bot        # the Discord bot (depends on @gandhi/core)
apps/web-api    # @gandhi/web-api — read-only web + WebSocket service (depends on @gandhi/core)
apps/web-ui     # Angular front-end (PrimeNG + Tailwind + ngx-translate); own toolchain
```

`packages/core`, `apps/bot` and `apps/web-api` are npm workspaces installed from
the repo root. `apps/web-ui` is intentionally **not** a workspace member — it is a
self-contained Angular app with its own `node_modules` and toolchain, so install
and build it from its own folder (`cd apps/web-ui && npm install`).

The shared `data/`, `var/` and `.env` live at the repository root, and the root
`package.json` scripts (`build`, `start`, `migrate`, …) are the canonical entry
points — run them from the repo root so `dotenv` and the SQLite path resolve
correctly. This layout lets a future web service (`apps/*`) reuse `@gandhi/core`
and be deployed independently of the bot.

This project uses Node and optionally Docker.

### The three services at a glance

| Service | Folder | Default port | Role |
|---|---|---|---|
| `bot` | `apps/bot` | `3000` (`PORT`) | The Discord bot — the only process that **writes** to SQLite |
| `web-api` | `apps/web-api` | `3001` (`WEB_PORT`) | Read-only HTTP + WebSocket API |
| `web-ui` | `apps/web-ui` | `8080` (`WEB_UI_PORT`) prod / `4200` dev | Angular front-end |

The bot works on its own; the web-api and web-ui are optional and can be added
(and redeployed) independently.

### 1. Configure

```bash
cp .env.sample .env
# then fill in the bot credentials and, if you want the web dashboard,
# the "Web service" / "Web front-end" blocks (see the sections below).
```

### 2. Run everything with Docker (recommended)

`docker compose up` builds and starts all three services and runs the DB
migrations for you:

```bash
docker compose build --progress=plain
docker compose up            # bot + web-api + web-ui
docker compose up bot        # or just the bot
```

The dashboard is then at `http://localhost:${WEB_UI_PORT:-8080}`.

### 3. Or run locally without Docker

The bot alone:

```bash
npm install       # installs the workspace (core + bot + web-api)
npm run migrate   # create the database and run migrations
npm run generate  # (optional) regenerate the TS DB models after a schema change
npm run start     # build @gandhi/core + the bot, then run it
```

To also run the web dashboard in dev, use three terminals from the repo root:

```bash
npm run start:web                 # terminal 1 — web-api on :3001
cd apps/web-ui && npm install && npm start   # terminal 2 — Angular dev server on :4200
# terminal 3 is your already-running bot (npm run start)
```

Open `http://localhost:4200` — the Angular dev server proxies `/api`, `/auth`
and `/ws` to the web-api on `:3001` (see `apps/web-ui/proxy.conf.json`).

## Web service (`apps/web-api`)

A read-only HTTP + WebSocket service (Fastify) that lets users view their own
stats through a web front-end, plus a per-server (admin) view for server
managers. It is deployed **independently of the bot**: it shares only the
SQLite file — opened
**read-only** at the app level, since the bot is the sole writer — and receives
the bot's live events over an internal WebSocket. You can redeploy the web
service without touching the bot, and vice versa.

Setup:

1. In the [Discord Developer Portal](https://discord.com/developers/applications),
   under **OAuth2**, add the redirect URI `${WEB_BASE_URL}/auth/callback` and note
   the **Client ID** / **Client Secret**.
2. Fill the `# Web service` block in `.env` (see `.env.sample`): `WEB_BASE_URL`,
   `WEB_FRONTEND_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `SESSION_SECRET`, `INTERNAL_WS_TOKEN`, and (dev only) `WEB_CORS_ORIGIN`.
3. Run it:

```bash
docker compose up web-api      # with Docker (recommended)
npm run start:web              # or directly (builds @gandhi/core first)
```

Endpoints (all `/api/*` require an authenticated session cookie):

| Route | Purpose |
|---|---|
| `GET /auth/login` · `GET /auth/callback` · `POST /auth/logout` | Discord OAuth2 login/logout |
| `GET /health` · `GET /api/status` | Liveness. `/health` = this service only (Docker probe); `/api/status` = whole stack (web + db + **bot**), **public** |
| `GET /api/me` | Current user + their guilds (with `hasData` / `isAdmin` flags) |
| `GET /api/stats/global` · `GET /api/stats/guild/:guildId` | Aggregated stats (with live session folded in) |
| `GET /api/timeline?guildId=&stat=&from=&to=` | Daily series for the heatmap |
| `GET /api/export?guildId=&format=json\|csv` | Download the user's data (JSON = all tables, CSV = long-format daily stats) |
| `GET /api/admin/guild/:id/overview` · `.../members` · `.../timeline` | Server-wide admin view (requires admin on the guild) |
| `WS /ws` | Authenticated browser stream (live voice events) |
| `WS /internal/events?token=` | Internal endpoint the bot pushes events to |

Admin routes require the caller to have `ADMINISTRATOR` / `MANAGE_GUILD` on the
target guild (from the Discord `guilds` OAuth scope). **Privacy policy:** members
who enabled private mode are counted in the server-wide totals but never named in
the leaderboard or per-member list — a `hiddenCount` reports how many were
withheld.

Live updates flow bot → web-api → browser: set `WEB_INTERNAL_WS_URL`
(e.g. `ws://web-api:3001/internal/events`) and a shared `INTERNAL_WS_TOKEN` on the
bot to enable it. Leaving `WEB_INTERNAL_WS_URL` unset makes the bot run
standalone — the dashboard still works, just without real-time pushes.

## Web front-end (`apps/web-ui`)

An [Angular](https://angular.dev/) SPA (standalone components, PrimeNG + Tailwind,
`ngx-translate` for en/fr) that renders the dashboard: per-server and global
stat cards, a GitHub-style contribution heatmap, and live updates over the
WebSocket. It talks only to `apps/web-api`.

```bash
cd apps/web-ui
npm install
npm start                 # dev server on :4200, proxies /api,/auth,/ws to :3001
npm run build             # production build -> dist/gandhi-web-ui/browser
docker compose up web-ui  # or serve it with nginx (reverse-proxies to web-api)
```

In the nginx-fronted (Docker) setup the SPA is served **same-origin** with the
API, so no CORS is needed; point `WEB_BASE_URL` / `WEB_FRONTEND_URL` at the
front-end's public origin (e.g. `http://localhost:8080`).

## Health & monitoring

Every service reports liveness, and the dashboard shows the bot's health directly:

- **Bot** — serves `GET /health` on `PORT` (returns `503` until the Discord
  client is ready, `200` after), used as its Docker healthcheck. It also writes a
  heartbeat (guild count, gateway ping, uptime) to the `bot_status` table every
  ~15s.
- **web-api** — `GET /health` is its own liveness (Docker probe). `GET /api/status`
  is a **public** endpoint that reports the whole stack: the web service, whether
  the database is readable, and the bot's health (derived from the heartbeat —
  "online" means ready *and* a heartbeat within the last 45s). It never 500s, so
  it's a safe probe.
- **web-ui** — a green/red **bot indicator** in the header polls `/api/status`
  every 20s (hover for guild count, ping and last-seen time).

`docker compose ps` shows all three services' healthcheck state.

### Monitoring with Uptime Kuma

The bot and the web-api each expose their own `/health` on a separate port, so
they can be monitored as **two independent HTTP monitors** (expected status `200`):

| Monitor | Same Docker network | Kuma outside the stack |
|---|---|---|
| Bot | `http://bot:3000/health` | `http://<host>:3000/health` |
| web-api | `http://web-api:3001/health` | `http://<host>:3001/health` |

If Uptime Kuma runs in the same compose/network, use the service names
(`bot`, `web-api`) and you don't need to publish those ports publicly. Otherwise
the ports (`PORT`, `WEB_PORT`) are already mapped to the host. The bot briefly
returns `503` during startup (until the Discord client is ready) — that's
expected, the monitor turns green once it's connected.

## Security & deployment

The web service is built to run behind a TLS-terminating reverse proxy and to
expose the smallest possible surface:

- **Read-only database.** `web-api` opens the SQLite file read-only
  (`PRAGMA query_only`); the bot is the sole writer and enables WAL, so the two
  processes never contend. They only need to share the `./data` volume — deploy
  them on the same host, independently of each other.
- **Secrets.** Generate strong values for `SESSION_SECRET` (cookie signing) and
  `INTERNAL_WS_TOKEN` (bot → web-api event channel), e.g. `openssl rand -hex 32`.
  Never commit them; they are read from the environment.
- **TLS & cookies.** Put a reverse proxy (Caddy, Traefik, nginx) in front,
  terminating HTTPS. Set `WEB_BASE_URL` / `WEB_FRONTEND_URL` to the public
  `https://` origin — the session cookie is then issued `Secure`, `HttpOnly`,
  `SameSite=Lax` and signed. The service already sets `trustProxy`.
- **Hardening built in.** Security headers ([helmet](https://github.com/fastify/fastify-helmet)),
  rate limiting (300 req/min per IP, `/health` exempt), a capped body size, and
  JSON-schema validation on all inputs. Errors return a generic shape and never
  leak internals.
- **Least-privilege data access.** Every `/api/*` route is scoped to the
  authenticated user and only ever returns that user's own data. The `guilds`
  OAuth scope is used solely to flag which servers the user may administer (for
  the upcoming admin view). Sessions live in memory only — a `web-api` restart
  just means users log in again.
- **OAuth redirect URI** must exactly match `${WEB_BASE_URL}/auth/callback` in
  the Discord Developer Portal.

## Tests

The project uses [Jest](https://jestjs.io/) (via `ts-jest`) for unit tests. Test files live in `apps/bot/tests/` and follow the `*.test.ts` naming convention.

```bash
npm test              # Run all tests with a coverage report
npx jest path/to/file # Run a single test file
npx jest --watch      # Re-run tests on change
```

`npm test` runs Jest with `--coverage`, producing a `coverage/` report (including `coverage/lcov.info`, which is uploaded to [Codecov](https://about.codecov.io/) in CI).

The suite covers the pure business-logic layer — the bot utilities (`apps/bot/src/utils`) and the shared `@gandhi/core` helpers and database models (`packages/core/src`), which include the time math, live-stat aggregation and voice-state transitions. Controllers and services are intentionally excluded from the unit tests, as they require a live SQLite binding; they are better exercised through integration tests.

Tests run automatically in CI on every pull request against `main` or `develop` (see [`.github/workflows/node.yml`](.github/workflows/node.yml)), alongside linting and the build. All three must pass before merging.

## Database Backups

If you want, you can setup a cron job to run the backup script periodically.
```bash
chmod +x scripts/docker-db-backup.sh # Make the script executable
realpath scripts/docker-db-backup.sh # Get the full path to the script
```

Use the output of the last command to setup a cron job. For example, to run the script every week at 5 AM:
```bash
crontab -e # This will open the crontab file in your default editor
0 5 * * 1 /realpath/to/docker-db-backup.sh # Add this line to the file and save it
```

If you want to watch the logs of the cron job, you can update the cronjob line :
```bash
crontab -e
0 5 * * 1 /realpath/to/docker-db-backup.sh 2>&1 | logger -t gandhi-bot-docker-db-backup

# Then, to read logs, you can run the following commands:
grep 'gandhi-bot-docker-db-backup' /var/log/syslog
journalctl | grep 'gandhi-bot-docker-db-backup'
```

Now the database will be backed up every week on Monday at 5 AM. The backups will be stored inside the project's `var/db-backups` directory where you can also find the script's execution logs.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.