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
```

The shared `data/`, `var/` and `.env` live at the repository root, and the root
`package.json` scripts (`build`, `start`, `migrate`, …) are the canonical entry
points — run them from the repo root so `dotenv` and the SQLite path resolve
correctly. This layout lets a future web service (`apps/*`) reuse `@gandhi/core`
and be deployed independently of the bot.

This project uses Node and optionally Docker.

To run the bot with Docker (recommended), use the following command:
```bash
docker compose build --progress=plain
docker compose up
```

To run the bot without Docker, use the following command:
```bash
npm run migrate # To setup the database and run the migrations
npm run generate # To generate the database models for TypeScript
npm run build # To build the project
npm run start # To build and run the project
```

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