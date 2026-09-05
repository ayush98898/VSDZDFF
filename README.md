# WhatsApp AI Broadcaster

Your own WhatsApp business chatbot — intelligent AI replies + broadcast messaging —
built on **Meta's official WhatsApp Cloud API** and **Claude**. No Wati/Interakt
subscription: you talk to Meta directly (which has a free tier) and run this
small self-hosted app yourself.

## What it does

- **AI auto-reply**: every inbound WhatsApp message is answered by Claude, using a
  per-business system prompt you control, with the last ~12 messages of context.
- **Broadcast**: send an approved WhatsApp template message to all (or a tagged
  subset of) opted-in contacts, with rate limiting and per-recipient delivery
  tracking.
- **Inbox dashboard**: see every conversation, reply manually, override the AI.
- **Opt-out compliance**: contacts who reply `STOP` are excluded from future
  broadcasts automatically (`START` re-subscribes).
- **Single SQLite file** for storage — no external database to run.

## Why Cloud API instead of an unofficial library

Tools like Wati/Interakt are themselves built on top of Meta's WhatsApp Cloud
API — they just add a markup on top of it. Meta's Cloud API is free to call;
you only pay Meta directly per conversation once you exceed the free monthly
tier, same as Wati/Interakt would pay behind the scenes. This project talks to
that same official API directly, so you get the same capability without the
SaaS fee, and without the ban risk of unofficial "fake browser" libraries.

## 1. Get WhatsApp Cloud API access (one-time Meta setup)

1. Create a Meta developer app at https://developers.facebook.com/apps →
   add the **WhatsApp** product.
2. Under **WhatsApp → API Setup** you'll get a temporary access token, a
   **Phone Number ID**, and a test phone number for development.
3. For production, add your own business phone number and generate a
   **permanent token** (System User token with `whatsapp_business_messaging`
   + `whatsapp_business_management` permissions) under
   **Business Settings → System Users**.
4. Create at least one **message template** (Meta → WhatsApp Manager →
   Message Templates) for broadcasting — WhatsApp requires business-initiated
   messages sent outside a 24-hour customer service window to use an approved
   template. Free-form AI replies work fine because they're always sent
   *within* that 24h window, in response to the user.

## 2. Configure this app

```bash
cp .env.example .env
```

Fill in:
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` — from step 1.
- `WEBHOOK_VERIFY_TOKEN` — any random string you make up.
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com.
- `DASHBOARD_PASSWORD` — password for your own web dashboard.

## 3. Run it

```bash
npm install
npm start
```

The app listens on `http://localhost:3000` and serves:
- `POST/GET /webhook` — WhatsApp Cloud API webhook endpoint
- `/` — the dashboard (Inbox / Contacts / Broadcast / AI Settings)

## 4. Expose the webhook to Meta

Meta needs a public HTTPS URL to reach `/webhook`. For local development,
use a tunnel:

```bash
ngrok http 3000
```

Then in your Meta app → WhatsApp → Configuration → Webhook:
- Callback URL: `https://<your-ngrok-domain>/webhook`
- Verify token: the same value as `WEBHOOK_VERIFY_TOKEN` in `.env`
- Subscribe to the `messages` field.

For production, deploy this app anywhere that gives you a stable HTTPS URL
(a small VPS, Fly.io, Render, Railway, etc.) and point the webhook there.

## 5. Try it

1. Message your WhatsApp business number from your phone.
2. It appears in the **Inbox** tab and Claude replies automatically.
3. Adjust the bot's persona in **AI Settings** (system prompt) any time.
4. To broadcast: create an approved template in Meta, then go to the
   **Broadcast** tab, enter the template name + variables, and send.

## Project layout

```
server/
  index.js            Express app entrypoint
  db.js               SQLite schema + helpers (better-sqlite3)
  services/
    whatsapp.js        WhatsApp Cloud API client (send text/template, webhook parsing)
    ai.js              Claude integration (system prompt, conversation history)
    broadcast.js        Rate-limited broadcast sender + delivery tracking
  routes/
    webhook.js          Inbound WhatsApp webhook (AI auto-reply, opt-out handling)
    api.js              Dashboard REST API (contacts, messages, broadcasts, settings)
public/                Vanilla JS/HTML/CSS dashboard (no build step)
```

## Notes & limits

- WhatsApp Cloud API's free tier includes a monthly quota of free service
  conversations; check current limits in your WhatsApp Manager. Broadcasts
  beyond that quota are billed by Meta per conversation, not by this app.
- Only pre-approved templates can be used to message a contact outside the
  24-hour window (this is a WhatsApp policy, not a limitation of this code).
- This app doesn't include HTTPS/TLS termination — put it behind a reverse
  proxy (Caddy, nginx) or your hosting provider's HTTPS layer in production.
