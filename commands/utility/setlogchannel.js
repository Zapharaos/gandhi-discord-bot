const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();

// Connect to SQLite database
const db = new sqlite3.Database(process.env.DB_PATH);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setlogchannel")
        .setDescription("Set the log channel for voice activity tracking")
        .addChannelOption(option =>
            option.setName("channel")
                .setDescription("Select a text channel for logs")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Only Admins can use this
    async execute(interaction) {
        const channel = interaction.options.getChannel("channel");

        if (channel.type !== 0) { // 0 = GUILD_TEXT
            return interaction.reply({ content: "❌ Please select a **text channel**!", ephemeral: true });
        }

        // Store the Guild ID and Log Channel ID in the database
        db.run(
            "INSERT INTO servers (guild_id, log_channel_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET log_channel_id = ?",
            [interaction.guild.id, channel.id, channel.id],
            (err) => {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: "❌ Database error occurred.", ephemeral: true });
                }
                interaction.reply(`✅ Log channel set to **${channel.name}**`);
            }
        );
    },
};
