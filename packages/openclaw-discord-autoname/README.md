# @xuwenhao83/openclaw-discord-autoname

OpenClaw plugin that renames Discord threads after agent replies.

## Behavior

- Runs on Discord `agent_end`.
- Renames the thread after the first completed reply.
- Renames again only after the session token count increases by the configured token interval.
- Generates a short title with any OpenAI-compatible Chat Completions API.
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
        },
        "config": {
          "baseUrl": "https://api.openai.com/v1",
          "apiKeyEnv": "OPENAI_API_KEY",
          "model": "gpt-4o-mini",
          "prompt": "根据以下的对话片段，总结出一个5到10个字以内的精确短标题作为Discord讨论串的名字。只需输出最终标题文本，绝不能包含引号、标点符号、前缀、说明等任何多余字符。\n\n对话片段：\n{conversation}",
          "tokenInterval": 50000
        }
      }
    }
  }
}
```

Config fields:

- `baseUrl`: OpenAI-compatible API base URL. Examples: `https://api.openai.com/v1`, `https://api.siliconflow.cn/v1`, or a LiteLLM proxy URL.
- `apiKeyEnv`: environment variable that contains the API key. Defaults to `OPENAI_API_KEY`.
- `apiKey`: inline API key. Prefer `apiKeyEnv` for shared configs.
- `model`: Chat Completions model used for title generation. Defaults to `gpt-4o-mini`.
- `prompt`: prompt template. Use `{conversation}` where recent messages should be inserted.
- `tokenInterval`: token increase required before renaming an already-renamed thread. Defaults to `50000`.
- `maxInputChars`: max recent conversation characters sent to the title model. Defaults to `3000`.
- `maxOutputTokens`: max output tokens for the title model. Defaults to `20`.
- `temperature`: title model temperature. Defaults to `0.3`.

## Environment

The gateway environment must provide:

- `DISCORD_BOT_TOKEN`
- the API key env configured by `apiKeyEnv`, for example `OPENAI_API_KEY`, `SILICONFLOW_API_KEY`, or `LITELLM_API_KEY`

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
