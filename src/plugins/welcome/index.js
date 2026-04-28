const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'welcome',
  version: '1.0.0',
  events: [
    {
      name: 'guildMemberAdd',
      async execute(member) {
        const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
        if (!channel) return;

        const embed = new EmbedBuilder()
          .setTitle('👋 Welcome on the server!')
          .setDescription(`Hey ${member}, welcome to **${member.guild.name}**!`)
          .setColor(0x5865f2)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      },
    },
  ],
};
