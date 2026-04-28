const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const XP_PER_MESSAGE = 10;
const COOLDOWN_MS    = 30 * 1000;

function xpForLevel(level) { return 100 * level * level; }

function levelFromXP(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS levels (
      user_id TEXT PRIMARY KEY,
      user_tag TEXT,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      last_xp_at BIGINT DEFAULT 0
    );
  `);
}

async function getUser(userId, userTag) {
  const res = await pool.query('SELECT * FROM levels WHERE user_id = $1', [userId]);
  if (res.rows.length === 0) {
    await pool.query('INSERT INTO levels (user_id, user_tag, xp, level, last_xp_at) VALUES ($1, $2, 0, 1, 0)', [userId, userTag]);
    return { user_id: userId, user_tag: userTag, xp: 0, level: 1, last_xp_at: 0 };
  }
  return res.rows[0];
}

async function addXP(userId, userTag) {
  const user = await getUser(userId, userTag);
  if (Date.now() - parseInt(user.last_xp_at) < COOLDOWN_MS) return null;
  const newXP    = parseInt(user.xp) + XP_PER_MESSAGE;
  const newLevel = levelFromXP(newXP);
  const levelUp  = newLevel > parseInt(user.level);
  await pool.query('UPDATE levels SET xp = $1, level = $2, last_xp_at = $3, user_tag = $4 WHERE user_id = $5', [newXP, newLevel, Date.now(), userTag, userId]);
  return { xp: newXP, level: newLevel, levelUp, oldLevel: parseInt(user.level) };
}

module.exports = {
  name: 'levels',
  version: '1.0.0',
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('🏆 Check your level and XP')
        .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),

      async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const target = interaction.options.getUser('user') ?? interaction.user;

        try {
          const user     = await getUser(target.id, target.tag);
          const xp       = parseInt(user.xp);
          const level    = parseInt(user.level);
          const xpNext   = xpForLevel(level + 1);
          const xpCurr   = xpForLevel(level);
          const progress = Math.floor(((xp - xpCurr) / (xpNext - xpCurr)) * 100);
          const filled   = Math.floor(progress / 10);
          const bar      = '█'.repeat(filled) + '░'.repeat(10 - filled);

          await interaction.editReply({ embeds: [new EmbedBuilder()
            .setTitle(`🏆 ${target.username}'s Rank`)
            .setColor(0x5865f2)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: '⭐ Level',    value: `**${level}**`,            inline: true },
              { name: '✨ XP',       value: `**${xp}** / ${xpNext}`,   inline: true },
              { name: '📊 Progress', value: `\`${bar}\` ${progress}%`, inline: false },
            ).setTimestamp()] });
        } catch (err) {
          await interaction.editReply({ content: '❌ Error fetching rank.' });
        }
      },
    },
    {
      data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏅 Show the top 10 most active players'),

      async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        try {
          const rows    = (await pool.query('SELECT * FROM levels ORDER BY xp DESC LIMIT 10')).rows;
          const medals  = ['🥇', '🥈', '🥉'];
          const desc    = rows.map((r, i) => `${medals[i] ?? `**${i + 1}.**`} <@${r.user_id}> — Level **${r.level}** (${r.xp} XP)`).join('\n');
          await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🏅 Leaderboard — Top 10').setDescription(desc || 'No data yet.').setColor(0xfee75c).setTimestamp()] });
        } catch {
          await interaction.editReply({ content: '❌ Error fetching leaderboard.' });
        }
      },
    },
  ],

  events: [{
    name: 'messageCreate',
    async execute(message, client) {
      if (message.author.bot || !message.guild) return;
      try {
        const result = await addXP(message.author.id, message.author.tag);
        if (!result?.levelUp) return;

        const channel = client.channels.cache.get(process.env.LEVELS_COMMAND_CHANNEL_ID);
        if (!channel) return;

        await channel.send({ embeds: [new EmbedBuilder()
          .setTitle('⭐ Level Up!')
          .setDescription(`${message.author} reached **Level ${result.level}**!`)
          .setColor(0x5865f2).setTimestamp()] });
      } catch {}
    },
  }],

  async init() { await initDB(); },
};
