require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const channel = await client.channels.fetch(RULES_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle('📜 Server Rules')
    .setColor(0x5865f2)
    .setDescription('Please read and respect the following rules. Failure to comply may result in a mute or ban.')
    .addFields(
      {
        name: '1️⃣ Respect Everyone',
        value: 'Treat everyone with respect. Absolutely no harassment, witch hunting, sexism, racism, or hate speech will be tolerated.',
      },
      {
        name: '2️⃣ No Spam or Self-Promotion',
        value: 'No spam or self-promotion (server invites, advertisements, etc) without permission from a staff member. This includes DMing fellow members.',
      },
      {
        name: '3️⃣ No Age-Restricted or Obscene Content',
        value: 'No age-restricted or obscene content. This includes text, images, or links featuring nudity, sex, hard violence, or other graphically disturbing content.',
      },
      {
        name: '4️⃣ Be Polite',
        value: 'Be polite and kind to everyone in the server.',
      },
      {
        name: '5️⃣ Respect Discord ToS',
        value: 'Respect Discord\'s Terms of Service at all times.',
      },
      {
        name: '6️⃣ Same Nickname In-Game and on Discord',
        value: 'You must use the same nickname in-game and on Discord.',
      },
      {
        name: '7️⃣ SFW & Respectful Profile',
        value: 'Your profile must be SFW and respectful. No troll names, identity theft, insults in your username, or NSFW profile pictures. The moderation team has the right to sanction you if your profile is inappropriate.',
      },
      {
        name: '8️⃣ Do Not Bother Staff',
        value: 'Do not mention or DM any staff member for no reason or without authorization. If you have a problem, open a ticket — your request will be handled there.',
      },
      {
        name: '9️⃣ No Bug Abuse',
        value: 'Any bug abuse is strictly forbidden and will result in a ban.',
      },
      {
        name: '🔟 No Cheating',
        value: 'No cheating, X-Ray, Freecam, WorldDownloader, Baritone, Auto Clicker or any cheat of any sort. This will result in a ban.',
      },
      {
        name: '1️⃣1️⃣ No Forbidden Mods',
        value: 'Any mod or resource pack that gives you an advantage over other players is forbidden. Performance mods are authorized.',
      },
      {
        name: '1️⃣2️⃣ No Killing Outside PvP Zones',
        value: 'Killing a player outside of designated PvP zones is forbidden and will result in a temporary ban. No TP-Kill, no traps of any sort.',
      },
      {
        name: '1️⃣3️⃣ Report Issues',
        value: 'If you see something against the rules or something that makes you feel unsafe, let staff know. We want this server to be a welcoming space!',
      },
      {
        name: '1️⃣4️⃣ Help Each Other',
        value: 'Don\'t hesitate to help people — it will contribute to a good and healthy community.',
      },
    )
    .setFooter({ text: 'By participating in this server, you agree to these rules.' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  console.log('✅ Rules embed sent!');
  client.destroy();
});

client.login(process.env.BOT_TOKEN);
