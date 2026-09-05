import { db, insertMessage } from "../db.js";
import { sendTemplate } from "./whatsapp.js";

const DELAY_MS = Number(process.env.BROADCAST_DELAY_MS || 1200);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createBroadcast({ name, templateName, languageCode, variables, contactIds }) {
  const info = db
    .prepare(
      `INSERT INTO broadcasts (name, template_name, language_code, variables, total)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, templateName, languageCode || "en_US", JSON.stringify(variables || []), contactIds.length);

  const broadcastId = info.lastInsertRowid;
  const insertRecipient = db.prepare(
    "INSERT INTO broadcast_recipients (broadcast_id, contact_id) VALUES (?, ?)"
  );
  const tx = db.transaction((ids) => {
    for (const contactId of ids) insertRecipient.run(broadcastId, contactId);
  });
  tx(contactIds);

  runBroadcast(broadcastId).catch((err) => {
    console.error(`Broadcast ${broadcastId} failed to run:`, err);
  });

  return db.prepare("SELECT * FROM broadcasts WHERE id = ?").get(broadcastId);
}

async function runBroadcast(broadcastId) {
  const broadcast = db.prepare("SELECT * FROM broadcasts WHERE id = ?").get(broadcastId);
  if (!broadcast) return;

  db.prepare("UPDATE broadcasts SET status = 'sending' WHERE id = ?").run(broadcastId);

  const variables = JSON.parse(broadcast.variables || "[]");
  const recipients = db
    .prepare(
      `SELECT br.id AS recipient_id, c.id AS contact_id, c.wa_id, c.opted_in
       FROM broadcast_recipients br
       JOIN contacts c ON c.id = br.contact_id
       WHERE br.broadcast_id = ? AND br.status = 'pending'`
    )
    .all(broadcastId);

  for (const recipient of recipients) {
    if (!recipient.opted_in) {
      db.prepare(
        "UPDATE broadcast_recipients SET status = 'skipped', error = 'contact opted out' WHERE id = ?"
      ).run(recipient.recipient_id);
      continue;
    }
    try {
      const result = await sendTemplate(
        recipient.wa_id,
        broadcast.template_name,
        broadcast.language_code,
        variables
      );
      const waMessageId = result?.messages?.[0]?.id || null;
      db.prepare(
        `UPDATE broadcast_recipients SET status = 'sent', wa_message_id = ?, sent_at = datetime('now')
         WHERE id = ?`
      ).run(waMessageId, recipient.recipient_id);
      insertMessage({
        contact_id: recipient.contact_id,
        direction: "out",
        body: `[broadcast:${broadcast.name}] template=${broadcast.template_name}`,
        wa_message_id: waMessageId,
        status: "sent",
      });
      db.prepare("UPDATE broadcasts SET sent = sent + 1 WHERE id = ?").run(broadcastId);
    } catch (err) {
      db.prepare(
        "UPDATE broadcast_recipients SET status = 'failed', error = ? WHERE id = ?"
      ).run(err.message, recipient.recipient_id);
      db.prepare("UPDATE broadcasts SET failed = failed + 1 WHERE id = ?").run(broadcastId);
    }
    await sleep(DELAY_MS);
  }

  db.prepare("UPDATE broadcasts SET status = 'completed' WHERE id = ?").run(broadcastId);
}

export function getBroadcast(id) {
  const broadcast = db.prepare("SELECT * FROM broadcasts WHERE id = ?").get(id);
  if (!broadcast) return null;
  const recipients = db
    .prepare(
      `SELECT br.*, c.wa_id, c.name FROM broadcast_recipients br
       JOIN contacts c ON c.id = br.contact_id WHERE br.broadcast_id = ?`
    )
    .all(id);
  return { ...broadcast, recipients };
}

export function listBroadcasts() {
  return db.prepare("SELECT * FROM broadcasts ORDER BY id DESC").all();
}
