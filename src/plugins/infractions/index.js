const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: (process.env.DATABASE_URL ?? '').replace('postgres://', 'postgresql://'),
  ssl: { rejectUnauthorized: false },
});

const SANCTIONS = ['1️⃣ Warning', '2️⃣ Last Warning', '3️⃣ Mute 10min', '4️⃣ Mute 1h', '5️⃣ Timeout 3h', '6️⃣ Ban 7 days'];

module.exports = {
  name: 'infractions',
  version: '1.1.0',
  commands: [{
    data: new SlashCommandBuilder()
      .setName('infractions')
      .setDescription('📊 View or reset a user\'s infractions')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addSubcommand(sub => sub.setName('view').setDescription('View a user\'s infractions')
        .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true)))
      .addSubcommand(sub => sub.setName('reset').setDescription('Reset a user\'s infractions')
        .addUserOption(opt => opt.setName('user').setDescription('User to reset').setRequired(true))),

    async execute(interaction) {
      const sub  = interaction.options.getSubcommand();
      const user = interaction.options.getUser('user');
      await interaction.deferReply({ flags: 64 });

      try {
        if (sub === 'view') {
          const res = await pool.query('SELECT * FROM infractions WHERE user_id = $1', [user.id]);
          const row = res.rows[0];
          const now = Date.now();

          if (!row || now >= parseInt(row.reset_at)) {
            return interaction.editReply({ embeds: [new EmbedBuilder()
              .setTitle(`📊 Infractions — ${user.username}`)
              .setDescription('This user has no active infractions this week.')
              .setColor(0x57f287).setTimestamp()] });
          }

          const count = parseInt(row.count);
          const next  = SANCTIONS[count] ?? '🔨 Ban 7 days (max reached)';

          return interaction.editReply({ embeds: [new EmbedBuilder()
            .setTitle(`📊 Infractions — ${user.username}`)
            .setColor(count >= 5 ? 0xed4245 : count >= 3 ? 0xffa500 : 0xfee75c)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: '⚠️ Infractions this week', value: `**${count}** / 6`, inline: true },
              { name: '🔄 Resets on', value: `<t:${Math.floor(parseInt(row.reset_at) / 1000)}:F>`, inline: true },
              { name: '⏭️ Next sanction', value: next, inline: false },
            ).setTimestamp()] });
        }

        if (sub === 'reset') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({ content: '❌ Only administrators can reset infractions.' });
          }
          await pool.query('DELETE FROM infractions WHERE user_id = $1', [user.id]);
          return interaction.editReply({ embeds: [new EmbedBuilder()
            .setTitle('✅ Infractions Reset')
            .setDescription(`Infractions for **${user.username}** have been reset.`)
            .setColor(0x57f287).setTimestamp()] });
        }
      } catch (err) {
        console.error('[infractions] error:', err.message);
        await interaction.editReply({ content: `❌ Database error: ${err.message}` });
      }
    },
  }],
};
