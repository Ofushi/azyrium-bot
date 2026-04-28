/**
 * ╔═══════════════════════════════════════════════════════╗
 * ║         🧩 PLUGIN TEMPLATE — Read Me First            ║
 * ╠═══════════════════════════════════════════════════════╣
 * ║  1. Copy this folder to /src/plugins/your-plugin-name ║
 * ║  2. Fill in the fields below                          ║
 * ║  3. The bot loads it automatically on next start      ║
 * ╚═══════════════════════════════════════════════════════╝
 *
 * A plugin can export any combination of:
 *   - commands      → Slash commands
 *   - events        → Discord.js gateway events
 *   - init(client)  → Runs once on bot startup
 *   - onButton      → Handles button interactions
 *   - onModal       → Handles modal submissions
 *   - onSelectMenu  → Handles select menu choices
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// ─── Optional: slash command ──────────────────────────────────────────────────
const helloCommand = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('👋 Example plugin command — says hello'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('👋 Hello from example-plugin!')
          .setDescription(`Hi ${interaction.user}! This command comes from the example plugin.`)
          .setColor(0x5865f2),
      ],
      ephemeral: true,
    });
  },
};

// ─── Optional: event listeners ────────────────────────────────────────────────
const onMessageEvent = {
  name: 'messageCreate',          // Any Discord.js event name
  once: false,                    // true = fire once then unregister
  execute(message, client) {
    if (message.author.bot) return;
    // Example: react to every message containing "hello"
    if (message.content.toLowerCase().includes('hello')) {
      message.react('👋').catch(() => {});
    }
  },
};

// ─── Optional: button interaction handler ─────────────────────────────────────
async function onButton(interaction, client) {
  // Only handle buttons that belong to this plugin
  if (!interaction.customId.startsWith('example:')) return;

  if (interaction.customId === 'example:ping') {
    await interaction.reply({ content: '🏓 Pong from example plugin!', ephemeral: true });
  }
}

// ─── Optional: one-time init ─────────────────────────────────────────────────
function init(client) {
  console.log('[example-plugin] Initialized! Client is ready:', client.isReady());
  // You can start intervals, fetch data, etc. here
}

// ─── Plugin definition ────────────────────────────────────────────────────────
module.exports = {
  name: 'example-plugin',       // REQUIRED — unique plugin identifier
  version: '1.0.0',             // optional
  description: 'Template plugin for developers.',  // optional

  commands: [helloCommand],     // remove if no commands
  events: [onMessageEvent],     // remove if no events
  init,                         // remove if no init needed
  onButton,                     // remove if no buttons
  // onModal,                   // uncomment if handling modals
  // onSelectMenu,               // uncomment if handling select menus
};
