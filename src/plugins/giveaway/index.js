const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, PermissionFlagsBits,
} = require('discord.js');

const giveaways = new Map();

function formatDuration(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

function buildEmbed(prize, endAt, winners, entries, ended = false) {
  const remaining = endAt - Date.now();
  return new EmbedBuilder()
    .setTitle(`🎉 GIVEAWAY — ${prize}`)
    .setColor(ended ? 0xed4245 : 0x5865f2)
    .setDescription(ended ? '**This giveaway has ended!**' : `Click the button below to enter!\n\n⏰ **Ends in:** ${formatDuration(remaining)}`)
    .addFields(
      { name: '🏆 Winners', value: `${winners}`, inline: true },
      { name: '👥 Entries', value: `${entries}`, inline: true },
      { name: '⏰ End time', value: `<t:${Math.floor(endAt / 1000)}:F>`, inline: false },
    )
    .setTimestamp();
}

async function endGiveaway(messageId, client) {
  const giveaway = giveaways.get(messageId);
  if (!giveaway) return;
  clearInterval(giveaway.interval);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel) return;
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return;

  const entries = [...giveaway.entries];
  const winnerCount = Math.min(giveaway.winners, entries.length);
  const pool = [...entries];
  const winners = [];
  for (let i = 0; i < winnerCount; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`giveaway:enter:${messageId}`).setLabel(`Entries: ${entries.length}`).setEmoji('🎉').setStyle(ButtonStyle.Secondary).setDisabled(true)
  );

  await message.edit({ embeds: [buildEmbed(giveaway.prize, giveaway.endAt, giveaway.winners, entries.length, true)], components: [row] });

  if (winners.length === 0) {
    await channel.send({ content: `🎉 The giveaway for **${giveaway.prize}** ended with no participants.` });
  } else {
    const mentions = winners.map(id => `<@${id}>`).join(', ');
    await channel.send({
      content: `🎉 Congratulations ${mentions}! You won **${giveaway.prize}**!`,
      embeds: [new EmbedBuilder().setTitle('🏆 Giveaway Winner(s)!').setDescription(`**Prize:** ${giveaway.prize}\n**Winner(s):** ${mentions}`).setColor(0x57f287).setTimestamp()],
    });
  }

  giveaways.delete(messageId);
}

module.exports = {
  name: 'giveaway',
  version: '1.0.0',
  commands: [{
    data: new SlashCommandBuilder()
      .setName('giveaway')
      .setDescription('🎉 Giveaway management')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub => sub.setName('start').setDescription('Start a giveaway')
        .addStringOption(opt => opt.setName('prize').setDescription('Prize').setRequired(true))
        .addIntegerOption(opt => opt.setName('hours').setDescription('Hours').setMinValue(0).setRequired(false))
        .addIntegerOption(opt => opt.setName('minutes').setDescription('Minutes').setMinValue(0).setRequired(false))
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Seconds').setMinValue(0).setRequired(false))
        .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(10).setRequired(false)))
      .addSubcommand(sub => sub.setName('end').setDescription('End a giveaway immediately')
        .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))),

    async execute(interaction, client) {
      const sub = interaction.options.getSubcommand();

      if (sub === 'start') {
        const prize   = interaction.options.getString('prize');
        const hours   = interaction.options.getInteger('hours')   ?? 0;
        const minutes = interaction.options.getInteger('minutes') ?? 0;
        const seconds = interaction.options.getInteger('seconds') ?? 0;
        const winners = interaction.options.getInteger('winners') ?? 1;
        const durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

        if (durationMs <= 0) return interaction.reply({ content: '❌ Please specify a duration.', flags: 64 });

        const endAt = Date.now() + durationMs;
        await interaction.reply({ content: '🎉 Giveaway started!', flags: 64 });

        const msg = await interaction.channel.send({
          embeds: [buildEmbed(prize, endAt, winners, 0)],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`giveaway:enter:PLACEHOLDER`).setLabel('Enter (0)').setEmoji('🎉').setStyle(ButtonStyle.Primary)
          )],
        });

        await msg.edit({ components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`giveaway:enter:${msg.id}`).setLabel('Enter (0)').setEmoji('🎉').setStyle(ButtonStyle.Primary)
        )] });

        const giveaway = { channelId: interaction.channel.id, prize, endAt, winners, entries: new Set() };

        giveaway.interval = setInterval(async () => {
          if (Date.now() >= endAt) { await endGiveaway(msg.id, client); return; }
          try { await msg.edit({ embeds: [buildEmbed(prize, endAt, winners, giveaways.get(msg.id)?.entries.size ?? 0)] }); } catch {}
        }, 30 * 1000);

        giveaways.set(msg.id, giveaway);
        setTimeout(() => endGiveaway(msg.id, client), durationMs);
      }

      if (sub === 'end') {
        const messageId = interaction.options.getString('message_id');
        if (!giveaways.has(messageId)) return interaction.reply({ content: '❌ Giveaway not found.', flags: 64 });
        await endGiveaway(messageId, client);
        await interaction.reply({ content: '✅ Giveaway ended.', flags: 64 });
      }
    },
  }],

  async onButton(interaction, client) {
    if (!interaction.customId.startsWith('giveaway:enter:')) return;
    const messageId = interaction.customId.split(':')[2];
    const giveaway  = giveaways.get(messageId);

    if (!giveaway) return interaction.reply({ content: '❌ This giveaway has ended.', flags: 64 });

    const userId = interaction.user.id;
    if (giveaway.entries.has(userId)) {
      giveaway.entries.delete(userId);
      await interaction.reply({ content: '✅ You have been removed from the giveaway.', flags: 64 });
    } else {
      giveaway.entries.add(userId);
      await interaction.reply({ content: '🎉 You have entered the giveaway! Good luck!', flags: 64 });
    }

    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (message) {
      await message.edit({ components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`giveaway:enter:${messageId}`).setLabel(`Enter (${giveaway.entries.size})`).setEmoji('🎉').setStyle(ButtonStyle.Primary)
      )] });
    }
  },
};
