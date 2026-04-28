const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const net  = require('net');
const fs   = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'tracked.json');

function loadTracked() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch { return []; }
}

function saveTracked(entries) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(entries, null, 2));
}

function pingMinecraft(host, port = 25565, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    let buffer = Buffer.alloc(0);
    let stage  = 0;

    socket.connect(port, host, () => {
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port);
      const handshake = buildPacket(0x00, Buffer.concat([encodeVarInt(767), encodeString(host), portBuf, encodeVarInt(1)]));
      socket.write(Buffer.concat([handshake, buildPacket(0x00, Buffer.alloc(0))]));
      stage = 1;
    });

    socket.on('data', data => {
      buffer = Buffer.concat([buffer, data]);
      if (stage !== 1) return;
      try {
        const { value: pktLen, offset: o1 } = readVarInt(buffer, 0);
        if (buffer.length < o1 + pktLen) return;
        const { offset: o2 } = readVarInt(buffer, o1);
        const { value: jsonStr } = readString(buffer, o2);
        const d = JSON.parse(jsonStr);
        socket.destroy();
        resolve({
          version: d.version?.name ?? 'Unknown',
          description: (typeof d.description === 'string' ? d.description : d.description?.text ?? '').replace(/§[0-9a-fk-or]/gi, ''),
        });
      } catch {}
    });

    socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout')); });
    socket.on('error', reject);
  });
}

function encodeVarInt(val) {
  const buf = [];
  do { let b = val & 0x7f; val >>>= 7; if (val !== 0) b |= 0x80; buf.push(b); } while (val !== 0);
  return Buffer.from(buf);
}
function readVarInt(buf, offset) {
  let val = 0, shift = 0;
  while (true) { const b = buf[offset++]; val |= (b & 0x7f) << shift; if ((b & 0x80) === 0) break; shift += 7; }
  return { value: val, offset };
}
function encodeString(str) {
  const s = Buffer.from(str, 'utf8');
  return Buffer.concat([encodeVarInt(s.length), s]);
}
function readString(buf, offset) {
  const { value: len, offset: o } = readVarInt(buf, offset);
  return { value: buf.slice(o, o + len).toString('utf8'), offset: o + len };
}
function buildPacket(id, data) {
  const body = Buffer.concat([encodeVarInt(id), data]);
  return Buffer.concat([encodeVarInt(body.length), body]);
}

function buildEmbed(status, host, port) {
  if (!status) {
    return new EmbedBuilder()
      .setTitle('🧊 Minecraft Server Status')
      .setColor(0xed4245)
      .addFields(
        { name: '🌐 Address', value: `\`${host}:${port}\``, inline: true },
        { name: '🔴 Status',  value: 'Offline',             inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Last updated' });
  }
  return new EmbedBuilder()
    .setTitle('🧊 Minecraft Server Status')
    .setColor(0x44db5e)
    .addFields(
      { name: '🌐 Address', value: `\`${host}:${port}\``,  inline: true },
      { name: '🟢 Status',  value: 'Online',                inline: true },
      { name: '📦 Version', value: `\`${status.version}\``, inline: true },
      { name: '📋 MOTD',    value: status.description || '—', inline: false },
    )
    .setTimestamp()
    .setFooter({ text: 'Last updated' });
}

const trackedMessages = new Map();

async function restoreTracked(client) {
  for (const { channelId, messageId, host, port } of loadTracked()) {
    try {
      const channel = await client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      trackedMessages.set(messageId, { message, host, port, lastOnline: null });
    } catch {}
  }
  persistTracked();
}

function persistTracked() {
  saveTracked([...trackedMessages.entries()].map(([messageId, { message, host, port }]) => ({
    channelId: message.channelId, messageId, host, port,
  })));
}

async function pollAndUpdate() {
  for (const [messageId, entry] of trackedMessages) {
    const { message, host, port } = entry;
    let status = null;
    try { status = await pingMinecraft(host, port); } catch {}
    const online = status !== null;
    if (entry.lastOnline !== online) {
      try {
        await message.edit({ embeds: [buildEmbed(status, host, port)] });
        entry.lastOnline = online;
      } catch {}
    }
  }
}

module.exports = {
  name: 'minecraft-status',
  version: '2.1.0',
  commands: [{
    data: new SlashCommandBuilder()
      .setName('mc-status')
      .setDescription('🧊 Show Minecraft server status')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
      await interaction.deferReply();
      const host = process.env.MINECRAFT_HOST ?? 'Not configured';
      const port = parseInt(process.env.MINECRAFT_PORT ?? '25565');

      let status = null;
      try { status = await pingMinecraft(host, port); } catch {}

      await interaction.editReply({ embeds: [buildEmbed(status, host, port)] });

      const message = await interaction.fetchReply();
      trackedMessages.set(message.id, { message, host, port, lastOnline: status !== null });
      persistTracked();
    },
  }],

  async init(client) {
    client.once('clientReady', () => restoreTracked(client));
    setInterval(pollAndUpdate, 15 * 1000);
  },
};
