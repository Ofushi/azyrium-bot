const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');

module.exports = {
  name: 'contestation',
  version: '1.2.0',
  commands: [{
    data: new SlashCommandBuilder()
      .setName('contest')
      .setDescription('😡 File a contestation against a decision')
      .addStringOption(opt => opt.setName('subject').setDescription('Subject of your contestation').setRequired(true)),

    async execute(interaction) {
      const subject = interaction.options.getString('subject');

      const modal = new ModalBuilder()
        .setCustomId(`contest:modal:${interaction.guild.id}:${encodeURIComponent(subject)}`)
        .setTitle('📄 Contestation');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Full description of your contestation')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1500)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('logs')
            .setLabel('Client logs (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Paste your client logs here...')
            .setMaxLength(2000)
        )
      );

      await interaction.showModal(modal);
    },
  }],

  async onModal(interaction, client) {
    if (!interaction.customId.startsWith('contest:modal:')) return;

    const parts       = interaction.customId.split(':');
    const guildId     = parts[2];
    const subject     = decodeURIComponent(parts.slice(3).join(':'));
    const description = interaction.fields.getTextInputValue('description');
    const logs        = interaction.fields.getTextInputValue('logs') || '—';
    const logChannelId = process.env.CONTESTATION_LOG_CHANNEL_ID;
    const adminRoleId  = process.env.CONTESTATION_ADMIN_ROLE_ID;

    await interaction.reply({ content: '✅ Your contestation has been submitted. Staff will review it shortly.', flags: 64 });

    if (logChannelId) {
      try {
        const guild = client.guilds.cache.get(guildId);
        const logChannel = guild?.channels.cache.get(logChannelId);
        if (logChannel) {
          await logChannel.send({
            content: adminRoleId ? `<@&${adminRoleId}> — New contestation!` : '**New contestation:**',
            embeds: [new EmbedBuilder()
              .setTitle('😡 New Contestation Filed')
              .setColor(0xed4245)
              .addFields(
                { name: '👤 Player',      value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: '📋 Subject',     value: subject, inline: true },
                { name: '📝 Description', value: description },
                { name: '📁 Client Logs', value: '```\n' + logs.slice(0, 800) + '\n```' },
              ).setTimestamp()],
          });
        }
      } catch (err) {
        console.error('[contestation] Could not send to log channel:', err.message);
      }
    }
  },
};
