const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');

const LOG_CHANNEL_ID    = process.env.AUTOMOD_LOG_CHANNEL_ID ?? '1498019359942246631';
const INVITE_CODE       = 'wRctZMTB2E';
const BAN_DURATION_MS   = 7 * 24 * 60 * 60 * 1000;
const RESET_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS infractions (
      user_id TEXT PRIMARY KEY,
      user_tag TEXT,
      count INTEGER DEFAULT 0,
      reset_at BIGINT
    );
    CREATE TABLE IF NOT EXISTS pending_invites (
      user_id TEXT PRIMARY KEY,
      user_tag TEXT,
      send_at BIGINT
    );
  `);
}

async function getCount(userId, userTag) {
  const now = Date.now();
  const res = await pool.query('SELECT * FROM infractions WHERE user_id = $1', [userId]);
  if (res.rows.length === 0 || now >= parseInt(res.rows[0].reset_at)) {
    await pool.query(
      'INSERT INTO infractions (user_id, user_tag, count, reset_at) VALUES ($1, $2, 0, $3) ON CONFLICT (user_id) DO UPDATE SET count = 0, reset_at = $3, user_tag = $2',
      [userId, userTag, now + RESET_INTERVAL_MS]
    );
    return 0;
  }
  return res.rows[0].count;
}

async function addInfraction(userId, userTag) {
  const count = await getCount(userId, userTag);
  const newCount = count + 1;
  await pool.query('UPDATE infractions SET count = $1, user_tag = $2 WHERE user_id = $3', [newCount, userTag, userId]);
  return newCount;
}

async function processPendingInvites(client) {
  const res = await pool.query('SELECT * FROM pending_invites WHERE send_at <= $1', [Date.now()]);
  for (const row of res.rows) {
    try {
      const user = await client.users.fetch(row.user_id);
      await user.send({ embeds: [new EmbedBuilder()
        .setTitle('👋 Your ban has expired')
        .setDescription(`Hello **${user.username}**, your 7-day ban has expired.\n\nYou are welcome to rejoin:\nhttps://discord.gg/${INVITE_CODE}`)
        .setColor(0x57f287).setTimestamp()] });
    } catch {}
    await pool.query('DELETE FROM pending_invites WHERE user_id = $1', [row.user_id]);
  }
}

const BLACKLIST = [
  'putain','pute','merde','connard','connasse','salope','batard','bâtard',
  'enculé','encule','fdp','nique','niquer','pd','pédé','pede',
  'couille','couilles','bite','chier','branleur','branler',
  'con','conne','crétin','cretin','abruti','débile','debile',
  'bouffon','baltringue','ntm','trouduc','gueule',
  'fuck','fucker','fucking','shit','bitch','asshole','bastard',
  'cunt','dick','cock','pussy','slut','whore','nigger','nigga',
  'faggot','fag','retard','motherfucker','dumbass','jackass',
];

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function containsProfanity(text) {
  const n = normalize(text);
  return BLACKLIST.some(w => n.includes(normalize(w)));
}

async function logAction(guild, user, action, count) {
  try {
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!ch) return;
    const colors = { 'Warning': 0xfee75c, 'Last Warning': 0xffa500, 'Mute 10min': 0xffa500, 'Mute 1h': 0xed4245, 'Timeout 3h': 0xed4245, 'Ban 7 days': 0x000000 };
    await ch.send({ embeds: [new EmbedBuilder()
      .setTitle(`🤖 AutoMod — ${action}`)
      .setColor(colors[action] ?? 0x5865f2)
      .addFields(
        { name: '👤 User',       value: `${user.tag} (${user.id})`, inline: true },
        { name: '⚠️ Infraction', value: `#${count} this week`,       inline: true },
        { name: '📋 Reason',     value: 'Inappropriate language',    inline: false },
      ).setTimestamp()] });
  } catch {}
}

async function dm(user, embed) {
  try { await user.send({ embeds: [embed] }); } catch {}
}

async function applySanction(message, count) {
  const { member, author: user, guild } = message;

  if (count === 1) {
    await dm(user, new EmbedBuilder().setTitle('⚠️ Warning').setDescription(`Hello **${user.username}**, your message was deleted for inappropriate language.\n\nThis is your **first warning**.`).setColor(0xfee75c).setTimestamp());
    await logAction(guild, user, 'Warning', count);
  } else if (count === 2) {
    await dm(user, new EmbedBuilder().setTitle('🚨 Last Warning').setDescription(`Hello **${user.username}**, this is your **last warning**. Any further violation will result in a mute.`).setColor(0xffa500).setTimestamp());
    await logAction(guild, user, 'Last Warning', count);
  } else if (count === 3) {
    try {
      await member.timeout(10 * 60 * 1000, 'AutoMod');
      await dm(user, new EmbedBuilder().setTitle('🔇 Muted — 10 minutes').setDescription(`Hello **${user.username}**, you have been muted for **10 minutes**.`).setColor(0xffa500).setTimestamp());
      await logAction(guild, user, 'Mute 10min', count);
    } catch {}
  } else if (count === 4) {
    try {
      await member.timeout(60 * 60 * 1000, 'AutoMod');
      await dm(user, new EmbedBuilder().setTitle('🔇 Muted — 1 hour').setDescription(`Hello **${user.username}**, you have been muted for **1 hour**.`).setColor(0xed4245).setTimestamp());
      await logAction(guild, user, 'Mute 1h', count);
    } catch {}
  } else if (count === 5) {
    try {
      await member.timeout(3 * 60 * 60 * 1000, 'AutoMod');
      await dm(user, new EmbedBuilder().setTitle('⏳ Timeout — 3 hours').setDescription(`Hello **${user.username}**, you have been timed out for **3 hours**. One more violation = ban.`).setColor(0xed4245).setTimestamp());
      await logAction(guild, user, 'Timeout 3h', count);
    } catch {}
  } else {
    try {
      await dm(user, new EmbedBuilder().setTitle('🔨 Banned — 7 days').setDescription(`Hello **${user.username}**, you have been banned for **7 days**. You will receive an invite once your ban expires.`).setColor(0x000000).setTimestamp());
      await member.ban({ reason: 'AutoMod — repeated inappropriate language', deleteMessageDays: 1 });
      await pool.query('INSERT INTO pending_invites (user_id, user_tag, send_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET send_at = $3', [user.id, user.tag, Date.now() + BAN_DURATION_MS]);
      await logAction(guild, user, 'Ban 7 days', count);
    } catch {}
  }
}

async function onMessage(message, client) {
  if (message.author.bot || !message.guild) return;
  const member = message.member;
  if (!member) return;
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers) || member.permissions.has(PermissionFlagsBits.Administrator)) return;
  if (!containsProfanity(message.content)) return;
  try { await message.delete(); } catch { return; }
  const count = await addInfraction(message.author.id, message.author.tag);
  await applySanction(message, count);
}

module.exports = {
  name: 'automod',
  version: '3.0.0',
  events: [{ name: 'messageCreate', execute: onMessage }],
  async init(client) {
    await initDB();
    setInterval(() => processPendingInvites(client), 5 * 60 * 1000);
    processPendingInvites(client);
  },
};
