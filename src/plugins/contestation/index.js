const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');

module.exports = {
  name: 'contestation',
  version: '1.1.0',
  commands: [{
    data: new SlashCommandBuilder()
      .setName('contest')
      .setDescription('😡 File a contestation against a decision')
      .addStringOption(opt => opt.setName('subject').setDescription('Subject of your contestation').setRequired(true)),

    async execute(interaction) {
      const subject = interaction.options.getString('subject');

      const embed = new EmbedBuilder()
        .setTitle('📄 Contestation Contract')
        .setColor(0xfee75c)
        .setDescription(
          `Hello **${interaction.user.username}**,\n\n` +
          `You have filed a contestation:\n> *${subject}*\n\n` +
          '**By proceeding, you agree to:**\n' +
          '• Provide accurate and honest information\n' +
          '• Submit relevant client logs if requested\n' +
          "• Accept the staff's final decision\n\n" +
          'Click the button below to submit your contestation.'
        )
        .setFooter({ text: `Server: ${interaction.guild.name}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`contest:accept:${interaction.guild.id}:${encodeURIComponent(subject)}`)
          .setLabel('✅ I agree — Submit')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('contest:decline')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      try {
        const dm = await interaction.user.createDM();
        await dm.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '📩 A contract has been sent to your DMs.', flags: 64 });
      } catch {
        await interaction.reply({ content: '❌ Could not send a DM. Please enable DMs from server members.', flags: 64 });
      }
    },
  }],

  async onButton(interaction, client) {
    const id = interaction.customId;

    if (id === 'contest:decline') {
      return interaction.update({ content: '❌ Contestation cancelled.', embeds: [], components: [] });
    }

    if (id.startsWith('contest:accept:')) {
      const parts   = id.split(':');
      const guildId = parts[2];
      const subject = decodeURIComponent(parts.slice(3).join(':'));

      const modal = new ModalBuilder()
        .setCustomId(`contest:modal:${guildId}:${encodeURIComponent(subject)}`)
        .setTitle('📄 Contestation Details');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('description').setLabel('Full description').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1500)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('logs').setLabel('Client logs (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('Paste logs here...').setMaxLength(2000)
        )
      );

      await interaction.showModal(modal);
    }
  },

  async onModal(interaction, client) {
    if (!interaction.customId.startsWith('contest:modal:')) return;

    const parts       = interaction.customId.split(':');
    const guildId     = parts[2];
    const subject     = decodeURIComponent(parts.slice(3).join(':'));
    const description = interaction.fields.getTextInputValue('description');
    const logs        = interaction.fields.getTextInputValue('logs') || '—';
    const logChannelId = process.env.CONTESTATION_LOG_CHANNEL_ID;
    const adminRoleId  = process.env.CONTESTATION_ADMIN_ROLE_ID;

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

    await interaction.update({
      embeds: [new EmbedBuilder()
        .setTitle('✅ Contestation Submitted')
        .setDescription('Your contestation has been received. Staff will review it shortly.')
        .setColor(0x57f287).setTimestamp()],
      components: [],
    });
  },
};
