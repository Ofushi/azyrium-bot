const { PermissionFlagsBits } = require('discord.js');

function parseMap() {
  const raw = process.env.ROLE_REACTION_MAP ?? '';
  const result = {};
  for (const block of raw.split(';')) {
    const [msgId, pairs] = block.split(':');
    if (!msgId || !pairs) continue;
    result[msgId.trim()] = {};
    for (const pair of pairs.split(',')) {
      const [emoji, roleId] = pair.split('=');
      if (emoji && roleId) result[msgId.trim()][emoji.trim()] = roleId.trim();
    }
  }
  return result;
}

async function handleReaction(reaction, user, add) {
  if (user.bot) return;
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  const map = parseMap();
  const msgConfig = map[reaction.message.id];
  if (!msgConfig) return;

  const roleId = msgConfig[reaction.emoji.name];
  if (!roleId) return;

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  try {
    if (add) await member.roles.add(roleId);
    else await member.roles.remove(roleId);
  } catch (err) {
    console.error('[role-reactions] Failed to modify role:', err.message);
  }
}

module.exports = {
  name: 'role-reactions',
  version: '1.0.0',
  events: [
    { name: 'messageReactionAdd',    execute: (r, u) => handleReaction(r, u, true)  },
    { name: 'messageReactionRemove', execute: (r, u) => handleReaction(r, u, false) },
  ],
};
