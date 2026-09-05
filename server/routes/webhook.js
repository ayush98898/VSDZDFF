import { Router } from "express";
import { upsertContact, insertMessage, recentHistory, db } from "../db.js";
import { extractIncoming, sendText, markAsRead } from "../services/whatsapp.js";
import { generateReply, isAiEnabled } from "../services/ai.js";

export const webhookRouter = Router();

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// Meta calls this once to verify the webhook URL.
webhookRouter.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

webhookRouter.post("/webhook", async (req, res) => {
  // Ack immediately - Meta expects a fast 200, processing continues after.
  res.sendStatus(200);

  const events = extractIncoming(req.body);
  for (const event of events) {
    try {
      if (event.type === "status") {
        db.prepare(
          "UPDATE messages SET status = ? WHERE wa_message_id = ?"
        ).run(event.status, event.waMessageId);
        continue;
      }
      await handleIncomingMessage(event);
    } catch (err) {
      console.error("Failed to process webhook event:", err);
    }
  }
});

async function handleIncomingMessage(event) {
  const contact = upsertContact({ wa_id: event.waId, name: event.name });
  insertMessage({
    contact_id: contact.id,
    direction: "in",
    body: event.text,
    wa_message_id: event.waMessageId,
    status: "received",
  });
  markAsRead(event.waMessageId).catch(() => {});

  const normalized = event.text.trim().toLowerCase();
  if (normalized === "stop" || normalized === "unsubscribe") {
    db.prepare("UPDATE contacts SET opted_in = 0 WHERE id = ?").run(contact.id);
    await replyAndLog(contact.id, event.waId, "You've been unsubscribed from broadcast messages. Reply START to opt back in.", false);
    return;
  }
  if (normalized === "start" || normalized === "subscribe") {
    db.prepare("UPDATE contacts SET opted_in = 1 WHERE id = ?").run(contact.id);
    await replyAndLog(contact.id, event.waId, "You're opted back in. Welcome back!", false);
    return;
  }

  if (!isAiEnabled()) return;

  try {
    const history = recentHistory(contact.id, 12);
    const reply = await generateReply(history.slice(0, -1), event.text);
    if (reply) {
      await replyAndLog(contact.id, event.waId, reply, true);
    }
  } catch (err) {
    console.error("AI reply failed:", err.message);
  }
}

async function replyAndLog(contactId, waId, body, aiGenerated) {
  const result = await sendText(waId, body);
  const waMessageId = result?.messages?.[0]?.id || null;
  insertMessage({
    contact_id: contactId,
    direction: "out",
    body,
    wa_message_id: waMessageId,
    status: "sent",
    ai_generated: aiGenerated ? 1 : 0,
  });
}
