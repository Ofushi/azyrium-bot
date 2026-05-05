const { ActivityType } = require('discord.js');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`[Bot] Online as ${client.user.tag}`);
    console.log(`[Bot] Plugins: ${client.plugins.size} | Commands: ${client.commands.size}`);
    client.user.setActivity('🎮 Azyrium Server', { type: ActivityType.Playing });
  },
};
