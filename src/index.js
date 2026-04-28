require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.plugins  = new Collection();

function registerEvent(event) {
  const handler = (...args) => event.execute(...args, client);
  event.once ? client.once(event.name, handler) : client.on(event.name, handler);
}

function loadCommands() {
  const dir = path.join(__dirname, 'commands');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(dir, file));
    if (cmd?.data?.name && cmd?.execute) {
      client.commands.set(cmd.data.name, cmd);
    }
  }
}

function loadEvents() {
  const dir = path.join(__dirname, 'events');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const event = require(path.join(dir, file));
    registerEvent(event);
  }
}

function loadPlugins() {
  const dir = path.join(__dirname, 'plugins');
  if (!fs.existsSync(dir)) return;

  const folders = fs.readdirSync(dir).filter(f =>
    fs.statSync(path.join(dir, f)).isDirectory()
  );

  for (const folder of folders) {
    const indexPath = path.join(dir, folder, 'index.js');
    if (!fs.existsSync(indexPath)) continue;

    try {
      const plugin = require(indexPath);
      if (!plugin.name) throw new Error('Missing required field: name');

      if (plugin.commands) {
        for (const cmd of plugin.commands) {
          client.commands.set(cmd.data.name, cmd);
        }
      }

      if (plugin.events) {
        for (const event of plugin.events) {
          registerEvent(event);
        }
      }

      if (typeof plugin.init === 'function') plugin.init(client);

      client.plugins.set(plugin.name, plugin);
      console.log(`[Plugin] Loaded: ${plugin.name} v${plugin.version ?? '1.0.0'}`);
    } catch (err) {
      console.error(`[Plugin] Failed to load '${folder}': ${err.message}`);
    }
  }
}

loadCommands();
loadEvents();
loadPlugins();

client.login(process.env.BOT_TOKEN).catch(err => {
  console.error('[Bot] Login failed:', err.message);
  process.exit(1);
});
