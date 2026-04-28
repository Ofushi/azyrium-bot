const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function replyEmbed(interaction, { color, title, description }) {
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
  if (interaction.deferred) return interaction.editReply({ embeds: [embed] });
  return interaction.reply({ embeds: [embed], flags: 64 });
}

const banCommand = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7).setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const days   = interaction.options.getInteger('days') ?? 0;

    if (!target)        return replyEmbed(interaction, { color: 0xed4245, title: '❌ Error', description: 'User not found.' });
    if (!target.bannable) return replyEmbed(interaction, { color: 0xed4245, title: '❌ Error', description: 'I cannot ban this user.' });

    try {
      await target.send({ embeds: [new EmbedBuilder().setTitle(`🔨 You have been banned from ${interaction.guild.name}`).setDescription(`**Reason:** ${reason}\n**By:** ${interaction.user.tag}`).setColor(0xed4245).setTimestamp()] }).catch(() => {});
      await target.ban({ reason, deleteMessageDays: days });
      await replyEmbed(interaction, { color: 0xed4245, title: '🔨 Member Banned', description: `**${target.user.tag}** has been banned.\n**Reason:** ${reason}` });
    } catch (err) {
      await replyEmbed(interaction, { color: 0xed4245, title: '❌ Error', description: err.message });
    }
  },
};

const kickCommand = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('👢 Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target)         return replyEmbed(interaction, { color: 0xed4245, title: '❌ Error', description: 'User not found.' });
    if (!target.kickable) return replyEmbed(interaction, { color: 0xed4245, title: '❌ Error', description: 'I cannot kick this user.' });

    try {
      await target.send({ embeds: [new EmbedBuilder().setTitle(`👢 You have been kicked from ${interaction.guild.name}`).setDescription(`**Reason:** ${reason}\n**By:** ${interaction.user.tag}`).setColor(0xffa500).setTimestamp()] }).catch(() => {});
      await target.kick(reason);
      await replyEmbed(interaction, { color: 0xffa500, title: '👢 Member Kicked', description: `**${target.user.tag}** has been kicked.\n**Reason:** ${reason}` });
    } catch (err) {
      await replyEmbed(interaction, { color: 0xed4245, title: '❌ Error', description: err.message });
    }
  },
};

const muteCommand = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('🔇 Timeout a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Member to mute').setRequired(true))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    const target   = interaction.options.getMember('user');
    const duration = interaction.options.getInteger('duration');
    const reason   = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target)            return replyEmbed(interaction, { color: 0xed4245, title: '❌ Error', description: 'User not found.' });
    if (!target.moderatable) return replyEmbed(interaction, { color: 0xed4245, title: '❌ Error', description: 'I cannot mute this user.' });

    try {
      await target.timeout(duration * 60 * 1000, reason);
      await target.send({ embeds: [new EmbedBuilder().setTitle(`🔇 You have been muted in ${interaction.guild.name}`).setDescription(`**Duration:** ${duration} minute(s)\n**Reason:** ${reason}\n**By:** ${interaction.user.tag}`).setColor(0xfee75c).setTimestamp()] }).catch(() => {});
      await replyEmbed(interaction, { color: 0xfee75c, title: '🔇 Member Muted', description: `**${target.user.tag}** muted for **${duration}** minute(s).\n**Reason:** ${reason}` });
    } catch (err) {
      await replyEmbed(interaction, { color: 0xed4245, title: '❌ Error', description: err.message });
    }
  },
};

const clearCommand = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('🧹 Delete messages in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply({ flags: 64 });

    try {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      let toDelete = [];
      let lastId;

      while (toDelete.length < amount) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const batch = await interaction.channel.messages.fetch(options);
        if (batch.size === 0) break;
        for (const msg of batch.values()) {
          if (toDelete.length >= amount) break;
          toDelete.push(msg);
        }
        lastId = batch.last()?.id;
        if (batch.size < 100) break;
      }

      const recent = toDelete.filter(m => m.createdTimestamp > twoWeeksAgo);
      const old    = toDelete.filter(m => m.createdTimestamp <= twoWeeksAgo);
      let deleted  = 0;

      if (recent.length >= 2) {
        const bulked = await interaction.channel.bulkDelete(recent, true);
        deleted += bulked.size;
      } else if (recent.length === 1) {
        try { await recent[0].delete(); deleted++; } catch {}
      }

      for (const msg of old) {
        try { await msg.delete(); deleted++; await new Promise(r => setTimeout(r, 500)); } catch {}
      }

      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🧹 Messages Deleted').setDescription(`Successfully deleted **${deleted}** message(s).`).setColor(0x57f287).setTimestamp()] });
    } catch (err) {
      console.error('[clear] Error:', err.message);
      await interaction.editReply({ content: `❌ Error: ${err.message}` });
    }
  },
};

module.exports = {
  name: 'moderation',
  version: '1.3.0',
  commands: [banCommand, kickCommand, muteCommand, clearCommand],
};
