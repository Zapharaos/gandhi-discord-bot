# Gandhi Discord Bot

This project is a voice activity tracker for a Discord bot. It tracks various user activities in voice channels, produces statistics and ranks related.

## Features

It tracks the following user activities in voice channels:
- join/leave/switch actions
- mute/unmute actions
- deafen/undeafen actions
- screen sharing start/stop actions
- camera on/off actions

It provides the following statistics (same field for the ranks):
- time spent connected
- time spent muted
- time spent deafened
- time spent screen sharing
- time spent with camera on
- a yearly calendar heatmap for each time statistic mentioned above (per user or per guild)
- daily streaks (how many days in a row the user has been active)
- total joins (how many times the user has joined a voice channel)
- total time spent in voice channels

## Download

Click on [this link](https://discord.com/oauth2/authorize?client_id=1345799506217930876) to add the bot to your server. Enable the required permissions and you're good to go!

The first step is to set the log channel for the bot to log user activities. Use the following command:
- `/setlogchannel [channel]` - Set the log channel for the bot

Now every user's actions in voice channels will be logged in the specified channel.

## Commands

The following commands are available:
- `/setlogchannel [channel]` - Set the log channel for the bot.
- `/stats [user]` - Display user statistics (default to you).
- `/rank [stat]` - Display rank for a specific statistic (default to time_connected).
- `/heatmap [all] [user] [stat] [format]` - Display a heatmap for a specific statistic (default to you, time_connected, png).

## Development

First follow the official Discord documentation [here](https://discord.com/developers/docs/quick-start/getting-started) to setup a bot, get the credentials and update the .env file.

This project uses Node and optionally Docker.

To run the bot with Docker (recommended), use the following command:
```bash
docker compose up -d
```

To run the bot without Docker, use the following command:
```bash
node deploy-commands.js # Deploy the commands to discord
node migrate.js # Apply database migrations
node index.js # Run the bot
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.