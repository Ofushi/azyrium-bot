module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[Command:${interaction.commandName}]`, err);
        const msg = { content: '❌ An error occurred while running this command.', flags: 64 };
        interaction.replied || interaction.deferred
          ? await interaction.followUp(msg)
          : await interaction.reply(msg);
      }
    }

    if (interaction.isButton()) {
      for (const [, plugin] of client.plugins) {
        if (typeof plugin.onButton === 'function') {
          await plugin.onButton(interaction, client);
        }
      }
    }

    if (interaction.isModalSubmit()) {
      for (const [, plugin] of client.plugins) {
        if (typeof plugin.onModal === 'function') {
          await plugin.onModal(interaction, client);
        }
      }
    }

    if (interaction.isStringSelectMenu()) {
      for (const [, plugin] of client.plugins) {
        if (typeof plugin.onSelectMenu === 'function') {
          await plugin.onSelectMenu(interaction, client);
        }
      }
    }
  },
};
