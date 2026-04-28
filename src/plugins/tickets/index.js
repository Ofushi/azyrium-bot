const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ChannelType,
  PermissionFlagsBits, AttachmentBuilder,
} = require('discord.js');

const ticketCommand = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎟️ Ticket management')
    .addSubcommand(sub => sub.setName('open').setDescription('Open a support ticket')
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('close').setDescription('Close this ticket'))
    .addSubcommand(sub => sub.setName('setup').setDescription('Send the ticket panel here')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'open')  return openTicket(interaction, client);
    if (sub === 'close') return closeTicket(interaction, client);
    if (sub === 'setup') return sendPanel(interaction);
  },
};

async function sendPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🎟️ Support Tickets')
    .setDescription('Click the button below to open a support ticket.')
    .setColor(0x5865f2);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:open_panel')
      .setLabel('Open a Ticket')
      .setEmoji('🎟️')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function openTicket(interaction, client, fromButton = false) {
  try {
    const guild        = interaction.guild;
    const user         = interaction.user;
    const reason       = fromButton ? 'Opened via panel' : interaction.options.getString('reason');
    const categoryId   = process.env.TICKET_CATEGORY_ID;
    const supportRoleId = process.env.TICKET_SUPPORT_ROLE_ID;

    const existing = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase().replace(/\s/g, '-')}`);
    if (existing) {
      return interaction.reply({ content: `❌ You already have an open ticket: ${existing}`, flags: 64 });
    }

    const permissionOverwrites = [
      { id: guild.id,       deny:  [PermissionFlagsBits.ViewChannel] },
      { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
      { id: user.id,        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ];

    if (supportRoleId) {
      permissionOverwrites.push({
        id: supportRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${user.username.toLowerCase().replace(/\s+/g, '-')}`,
      type: ChannelType.GuildText,
      topic: `Ticket for ${user.id} | Reason: ${reason}`,
      parent: categoryId || null,
      permissionOverwrites,
    });

    const embed = new EmbedBuilder()
      .setTitle('🎟️ Ticket Opened')
      .setDescription(`Hello ${user}, support will be with you shortly.\n\n**Reason:** ${reason}`)
      .setColor(0x57f287)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:close')
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: supportRoleId ? `<@&${supportRoleId}>` : '',
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({ content: `✅ Ticket created: ${channel}`, flags: 64 });
  } catch (err) {
    console.error('[tickets] openTicket error:', err.message);
    try { await interaction.reply({ content: '❌ Failed to create ticket.', flags: 64 }); } catch {}
  }
}

async function closeTicket(interaction, client) {
  try {
    const channel = interaction.channel;
    if (!channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: '❌ This is not a ticket channel.', flags: 64 });
    }

    await interaction.reply('🔒 Closing this ticket in 5 seconds...');

    const messages   = await channel.messages.fetch({ limit: 100 });
    const transcript = [...messages.values()]
      .reverse()
      .map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`)
      .join('\n');

    const logChannelId = process.env.TICKET_LOG_CHANNEL_ID;
    if (logChannelId) {
      const logChannel = client.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🎟️ Ticket Closed')
          .setDescription(`**Channel:** ${channel.name}\n**Closed by:** ${interaction.user.tag}`)
          .setColor(0xed4245)
          .setTimestamp();

        const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), {
          name: `transcript-${channel.name}.txt`,
        });

        await logChannel.send({ embeds: [logEmbed], files: [attachment] });
      }
    }

    setTimeout(async () => {
      try { await channel.delete(); } catch (err) {
        console.error('[tickets] Failed to delete channel:', err.message);
      }
    }, 5000);
  } catch (err) {
    console.error('[tickets] closeTicket error:', err.message);
    try { await interaction.reply({ content: '❌ Failed to close ticket.', flags: 64 }); } catch {}
  }
}

async function onButton(interaction, client) {
  if (interaction.customId === 'ticket:open_panel') return openTicket(interaction, client, true);
  if (interaction.customId === 'ticket:close')      return closeTicket(interaction, client);
}

module.exports = {
  name: 'tickets',
  version: '1.0.0',
  commands: [ticketCommand],
  onButton,
};
