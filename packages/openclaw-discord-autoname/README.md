# @xuwenhao83/openclaw-discord-autoname

OpenClaw plugin that renames Discord threads after agent replies.

## Behavior

- Runs on Discord `agent_end`.
- Renames the thread after the first completed reply.
- Renames again only after the session token count increases by more than 50k tokens.
- Generates a short Chinese title with SiliconFlow `deepseek-ai/DeepSeek-V4-Flash`.
- Patches the Discord thread name through Discord API v10.

## Install

```bash
openclaw plugins install @xuwenhao83/openclaw-discord-autoname
```

Enable the plugin:

```json
{
  "plugins": {
    "entries": {
      "discord-autoname": {
        "enabled": true,
        "hooks": {
          "allowConversationAccess": true
        }
      }
    }
  }
}
```

## Environment

The gateway environment must provide:

- `DISCORD_BOT_TOKEN`
- `SILICONFLOW_API_KEY`

## Discord Permissions

The Discord bot must be able to access the target thread and needs `Manage Threads`.
For some channel layouts, `Manage Channels` may also be required. Private threads
must include the bot.

## Verify

```bash
openclaw config validate --json
openclaw gateway restart
```

Then send a message in a new Discord thread. The gateway log should include:

```text
[discord-autoname] Successfully renamed thread ...
```
