const { EmbedBuilder } = require('discord.js');

const MEMBER_ROLE_ID = '1496848213833945178';

module.exports = {
  name: 'welcome',
  version: '1.1.0',
  events: [
    {
      name: 'guildMemberAdd',
      async execute(member) {
        // Assign member role
        try {
          await member.roles.add(MEMBER_ROLE_ID);
        } catch (err) {
          console.error('[welcome] Failed to assign member role:', err.message);
        }

        // Send welcome message
        const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
        if (!channel) return;

        const embed = new EmbedBuilder()
          .setTitle('👋 Welcome on the server!')
          .setDescription(`Hey ${member}, welcome to **${member.guild.name}**!`)
          .setColor(0x5865f2)
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      },
    },
  ],
};
