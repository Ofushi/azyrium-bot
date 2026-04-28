const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'modhelp',
  version: '1.0.0',
  commands: [{
    data: new SlashCommandBuilder()
      .setName('modhelp')
      .setDescription('⚔️ Display all moderation commands')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setTitle('⚔️ Moderation Commands')
        .setDescription('All available moderation commands and their required permissions.')
        .setColor(0x5865f2)
        .addFields(
          { name: '🔨 /ban @user [reason] [days]',      value: 'Bans a member. Sends a DM. Days (0–7) deletes recent messages.\n> **Permission:** Ban Members' },
          { name: '👢 /kick @user [reason]',             value: 'Kicks a member. Sends a DM.\n> **Permission:** Kick Members' },
          { name: '🔇 /mute @user [duration] [reason]',  value: 'Timeouts a member. Duration in minutes (max 40320 = 28 days).\n> **Permission:** Moderate Members' },
          { name: '🧹 /clear [amount]',                  value: 'Deletes 1–100 messages in the current channel.\n> **Permission:** Administrator only' },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    },
  }],
};
