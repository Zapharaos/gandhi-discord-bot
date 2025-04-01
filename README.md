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
- total joins (how many times the user has joined a voice channel)

## Download

Click on [this link](https://discord.com/oauth2/authorize?client_id=1345799506217930876) to add the bot to your server. Enable the required permissions and you're good to go!

The first step is to set the log channel for the bot to log user activities inside voice channels. Use the following command:
- `/setlogchannel [text-channel]` - Set the log channel for voice-channel activity tracking.

Now every user's actions in voice channels will be logged in the specified channel.

## Commands

The following commands are available:
- `/setlogchannel [text-channel]` - Set the log channel for voice-channel activity tracking.
- `/stats [user]` - Returns the stats for a specific user (default: yourself).
- `/rank [stat]` - Returns the server ranking for a specific stat (default: time connected).
- `/heatmap [target] [target-all] [stat] [format]` - Returns the yearly calendar heatmap (default: yourself, time connected, png).
- `/list-inactive [days]` - Returns the list of inactive users (default: 100 days).

## Development

First follow the official Discord documentation [here](https://discord.com/developers/docs/quick-start/getting-started) to setup a bot, get the credentials and update the .env file.

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

If you want to watch the logs of the cron job, you can update the previous commands:
```bash
crontab -e # This will open the crontab file in your default editor
0 5 * * 1 /realpath/to/docker-db-backup.sh 2>&1 | logger -t gandhi-bot-docker-db-backup # Add this line to the file and save it
grep 'gandhi-bot-docker-db-backup' /var/log/syslog # To watch the related logs
```

Now the database will be backed up every week on Monday at 5 AM. The backups will be stored inside the project's `var/db-backups` directory where you can also find the script's execution logs.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.