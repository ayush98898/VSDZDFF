import { Router } from "express";
import { db, insertMessage, recentHistory, getSetting, setSetting } from "../db.js";
import { sendText } from "../services/whatsapp.js";
import { createBroadcast, getBroadcast, listBroadcasts } from "../services/broadcast.js";

export const apiRouter = Router();

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "change_me";

apiRouter.use((req, res, next) => {
  const provided = req.get("x-dashboard-password") || req.query.password;
  if (provided !== DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: "Invalid or missing dashboard password" });
  }
  next();
});

apiRouter.get("/contacts", (req, res) => {
  const contacts = db
    .prepare("SELECT * FROM contacts ORDER BY COALESCE(last_message_at, created_at) DESC")
    .all();
  res.json(contacts);
});

apiRouter.get("/contacts/:id/messages", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM messages WHERE contact_id = ? ORDER BY id ASC")
    .all(req.params.id);
  res.json(rows);
});

apiRouter.post("/contacts/:id/messages", async (req, res) => {
  const contact = db.prepare("SELECT * FROM contacts WHERE id = ?").get(req.params.id);
  if (!contact) return res.status(404).json({ error: "Contact not found" });
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: "Message body is required" });

  try {
    const result = await sendText(contact.wa_id, body);
    const waMessageId = result?.messages?.[0]?.id || null;
    const message = insertMessage({
      contact_id: contact.id,
      direction: "out",
      body,
      wa_message_id: waMessageId,
      status: "sent",
    });
    res.json(message);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

apiRouter.get("/settings", (req, res) => {
  res.json({
    ai_enabled: getSetting("ai_enabled", process.env.AI_ENABLED ?? "true"),
    system_prompt: getSetting("system_prompt", process.env.AI_SYSTEM_PROMPT || ""),
  });
});

apiRouter.put("/settings", (req, res) => {
  const { ai_enabled, system_prompt } = req.body;
  if (ai_enabled !== undefined) setSetting("ai_enabled", ai_enabled ? "true" : "false");
  if (system_prompt !== undefined) setSetting("system_prompt", system_prompt);
  res.json({ ok: true });
});

apiRouter.get("/broadcasts", (req, res) => {
  res.json(listBroadcasts());
});

apiRouter.get("/broadcasts/:id", (req, res) => {
  const broadcast = getBroadcast(req.params.id);
  if (!broadcast) return res.status(404).json({ error: "Broadcast not found" });
  res.json(broadcast);
});

apiRouter.post("/broadcasts", (req, res) => {
  const { name, templateName, languageCode, variables, contactIds, tag } = req.body;
  if (!name || !templateName) {
    return res.status(400).json({ error: "name and templateName are required" });
  }

  let targetIds = contactIds;
  if (!targetIds || !targetIds.length) {
    const query = tag
      ? db.prepare("SELECT id FROM contacts WHERE opted_in = 1 AND tags LIKE ?").all(`%${tag}%`)
      : db.prepare("SELECT id FROM contacts WHERE opted_in = 1").all();
    targetIds = query.map((c) => c.id);
  }

  if (!targetIds.length) {
    return res.status(400).json({ error: "No matching opted-in contacts found" });
  }

  const broadcast = createBroadcast({
    name,
    templateName,
    languageCode,
    variables,
    contactIds: targetIds,
  });
  res.json(broadcast);
});
