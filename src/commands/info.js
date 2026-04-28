const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('📌 Display useful server links'),

  async execute(interaction) {
    const rawLinks = process.env.INFO_LINKS ?? '';
    const links = rawLinks
      .split(',')
      .map(entry => {
        const [label, url] = entry.split('=');
        return label && url ? `[${label.trim()}](${url.trim()})` : null;
      })
      .filter(Boolean);

    const embed = new EmbedBuilder()
      .setTitle('📌 Server Information')
      .setColor(0x5865f2)
      .setDescription(links.length ? links.join('\n') : 'No links configured.')
      .setFooter({ text: `Requested by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
