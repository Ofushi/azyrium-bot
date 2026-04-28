# Aeterna — Discord Bot

A modular, production-ready Discord bot built for the **NightfallCraft — The Casket of Reveries** Minecraft server. Built with [discord.js v14](https://discord.js.org/) and a clean plugin architecture.

---

## Features

| Plugin | Description |
|---|---|
| `role-reactions` | Assign roles via emoji reactions |
| `tickets` | Support ticket system with transcripts |
| `contestation` | Player dispute system with DM contract |
| `moderation` | Ban, kick, mute, clear |
| `automod` | Automatic profanity filter with progressive sanctions |
| `infractions` | View and reset player infractions |
| `minecraft-status` | Live Minecraft server status with auto-updating message |
| `ai-chat` | Aeterna AI powered by Groq (Llama 3) |
| `giveaway` | Giveaway system with automatic winner selection |
| `levels` | XP and level system with leaderboard |
| `welcome` | Welcome message on member join |
| `modhelp` | Display all moderation commands |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A Groq API key ([console.groq.com](https://console.groq.com)) — free tier available
- A PostgreSQL database (Railway, Supabase, etc.)

### Installation

```bash
git clone https://github.com/your-username/discord-bot.git
cd discord-bot
npm install
cp .env.example .env
```

Edit `.env` with your credentials, then deploy slash commands:

```bash
node src/deploy-commands.js
```

Start the bot:

```bash
npm start
```

### Production (PM2)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

---

## Configuration

All configuration is done via environment variables. See `.env.example` for the full list.

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Discord bot token |
| `CLIENT_ID` | Discord application ID |
| `GUILD_ID` | Your server ID |
| `DATABASE_URL` | PostgreSQL connection string |
| `GROQ_API_KEY` | Groq API key for Aeterna AI |
| `INFO_LINKS` | Links for `/info` — format: `Label=URL,Label=URL` |
| `ROLE_REACTION_MAP` | Role reactions — format: `MSG_ID:EMOJI=ROLE_ID` |
| `TICKET_CATEGORY_ID` | Category for ticket channels |
| `TICKET_SUPPORT_ROLE_ID` | Role pinged on new tickets |
| `TICKET_LOG_CHANNEL_ID` | Channel for ticket transcripts |
| `MINECRAFT_HOST` | Minecraft server IP |
| `MINECRAFT_PORT` | Minecraft server port (default: 25565) |
| `CONTESTATION_LOG_CHANNEL_ID` | Channel for contestation logs |
| `CONTESTATION_ADMIN_ROLE_ID` | Role pinged on new contestations |
| `WELCOME_CHANNEL_ID` | Channel for welcome messages |
| `AI_TALK_CHANNEL_ID` | Channel for Aeterna community chat |
| `AI_STAFF_CHANNEL_ID` | Channel for Aeterna staff chat |
| `LEVELS_COMMAND_CHANNEL_ID` | Channel for level-up notifications |
| `AUTOMOD_LOG_CHANNEL_ID` | Channel for automod logs |

---

## Plugin System

To create a plugin, add a folder in `src/plugins/` with an `index.js` file:

```js
module.exports = {
  name: 'my-plugin',       // required
  version: '1.0.0',

  commands: [/* slash commands */],
  events:   [/* discord.js events */],

  init(client) { /* runs once on startup */ },
  async onButton(interaction, client)     { /* button handlers */ },
  async onModal(interaction, client)      { /* modal handlers */ },
  async onSelectMenu(interaction, client) { /* select menu handlers */ },
};
```

The bot loads all plugins automatically on startup — no registration needed.

---

## Project Structure

```
src/
├── index.js              # Entry point and plugin loader
├── deploy-commands.js    # Deploys slash commands to Discord
├── commands/             # Core slash commands
│   └── info.js
├── events/               # Core event handlers
│   ├── ready.js
│   └── interactionCreate.js
└── plugins/              # Plugin directory
    ├── ai-chat/
    ├── automod/
    ├── contestation/
    ├── giveaway/
    ├── infractions/
    ├── levels/
    ├── minecraft-status/
    ├── moderation/
    ├── modhelp/
    ├── role-reactions/
    ├── tickets/
    └── welcome/
```

---

## License

MIT
