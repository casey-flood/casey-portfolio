# Chat worker

Proxy between the portfolio chat page and the Claude API.

## Deploy (one time)
1. `npm i -g wrangler` then `wrangler login` (free Cloudflare account).
2. `cd worker && wrangler deploy`
3. `wrangler secret put ANTHROPIC_API_KEY` and paste your API key.
4. Copy the deployed URL (e.g. https://casey-chat.<you>.workers.dev) into `src/data/chat.ts` as `CHAT_ENDPOINT`, then commit and push.
5. In Anthropic's console set a monthly spend limit. In Cloudflare, add a rate-limiting rule for the worker.

Edit `knowledge.md` to change what the bot knows. Anything in it can be extracted by a determined visitor, so keep it to public facts.
