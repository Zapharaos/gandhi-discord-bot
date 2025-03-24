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

## Development

First follow the official Discord documentation [here](https://discord.com/developers/docs/quick-start/getting-started) to setup a bot, get the credentials and update the .env file.

This project uses Node and optionally Docker.

To run the bot with Docker (recommended), use the following command:
```bash
docker compose up -d
```

To run the bot without Docker, use the following command:
```bash
npm run build # If you only want to build the project
npm run start # If you want to build and run the project
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.