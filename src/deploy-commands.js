require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];

const cmdDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(cmdDir, file));
  if (cmd?.data) commands.push(cmd.data.toJSON());
}

const pluginsDir = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginsDir)) {
  for (const folder of fs.readdirSync(pluginsDir).filter(f =>
    fs.statSync(path.join(pluginsDir, f)).isDirectory()
  )) {
    const p = path.join(pluginsDir, folder, 'index.js');
    if (!fs.existsSync(p)) continue;
    try {
      const plugin = require(p);
      if (plugin.commands) {
        for (const cmd of plugin.commands) commands.push(cmd.data.toJSON());
      }
    } catch {}
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} commands...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('All commands deployed.');
  } catch (err) {
    console.error('Deploy failed:', err.message);
  }
})();
