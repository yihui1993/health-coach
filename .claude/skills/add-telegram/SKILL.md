---
name: add-telegram
description: Set up Telegram bot integration using the telegram@claude-plugins-official plugin. Guides through BotFather setup, plugin configuration, and verification.
allowed-tools: Bash, Read, Write
---

# Add Telegram Integration

This connects a Telegram bot to Claude Code so you can log health data by sending messages to your bot.

## Step 1 — Create a bot with BotFather

Tell the user:

> Open Telegram and search for **@BotFather**.
>
> Send `/newbot` and follow the prompts:
> 1. Give your bot a display name (e.g. "Health Coach")
> 2. Choose a username ending in `bot` (e.g. `myhealth_coach_bot`)
>
> BotFather will give you a **bot token** — a long string like `123456789:ABC-DEF1234ghIkl...`
>
> Copy that token and paste it here.

Wait for the user to provide the bot token.

## Step 2 — Ensure plugin is declared in settings.json

Check the current settings:
```bash
cat /Users/yihuima/health-coach/.claude/settings.json
```

If `telegram@claude-plugins-official` is not in the `plugins` array, add it:
```json
{
  "permissions": {
    "allow": ["Bash(*)", "Edit(*)", "Write(*)", "Read(*)", "Glob(*)", "Grep(*)", "MultiEdit(*)"]
  },
  "plugins": [
    "telegram@claude-plugins-official"
  ]
}
```

Write the updated settings.json if needed.

## Step 3 — Configure the plugin with the bot token

Tell the user to run this command in a terminal (outside Claude Code):

> ```
> claude mcp add telegram@claude-plugins-official
> ```
>
> When prompted, enter your bot token: `[their token]`

Alternatively, tell the user they can set the environment variable:
> ```
> export TELEGRAM_BOT_TOKEN=[their token]
> ```
> Add this to your `~/.zshrc` or `~/.bashrc` to make it permanent.

## Step 4 — Group chat support (optional)

If the user wants to use the bot in a Telegram group (not just direct messages):

> In Telegram, send `/mybots` to **@BotFather**:
> 1. Select your bot
> 2. Go to **Bot Settings** → **Group Privacy** → **Turn off**
>
> This lets the bot see all messages in groups, not just direct @mentions.

## Step 5 — Restart Claude Code

Tell the user:

> Close and reopen Claude Code (or run `claude` again in a new terminal) so the Telegram plugin loads with your bot token.

## Step 6 — Verify

Tell the user:

> Send a message to your bot in Telegram:
> **"had standard breakfast"**
>
> Claude should log the meal and reply with today's nutrition totals.
> If you get no response after 30 seconds, check that you restarted Claude Code after configuring the plugin.

## Notes

- The `telegram@claude-plugins-official` plugin handles all message routing — no custom bot code or server is needed in this project.
- The plugin delivers Telegram messages directly into Claude's conversation context and routes replies back to Telegram automatically.
- For debugging, check Claude Code logs if messages are not being received.
