const API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;

function baseUrl() {
  return `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;
}

async function callGraph(path, body) {
  if (!TOKEN || !PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not configured");
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `WhatsApp API error (${res.status})`;
    const err = new Error(message);
    err.details = data;
    throw err;
  }
  return data;
}

export async function sendText(to, body) {
  return callGraph("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

export async function sendTemplate(to, templateName, languageCode, bodyParams = []) {
  const components = bodyParams.length
    ? [
        {
          type: "body",
          parameters: bodyParams.map((text) => ({ type: "text", text: String(text) })),
        },
      ]
    : [];
  return callGraph("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode || "en_US" },
      ...(components.length ? { components } : {}),
    },
  });
}

export async function markAsRead(waMessageId) {
  return callGraph("/messages", {
    messaging_product: "whatsapp",
    status: "read",
    message_id: waMessageId,
  });
}

export function extractIncoming(webhookBody) {
  const results = [];
  const entries = webhookBody?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const contactsByWaId = Object.fromEntries(
        (value.contacts || []).map((c) => [c.wa_id, c.profile?.name])
      );
      for (const message of value.messages || []) {
        results.push({
          type: "message",
          waId: message.from,
          name: contactsByWaId[message.from] || null,
          waMessageId: message.id,
          text:
            message.text?.body ??
            message.button?.text ??
            message.interactive?.button_reply?.title ??
            message.interactive?.list_reply?.title ??
            "[unsupported message type]",
          raw: message,
        });
      }
      for (const status of value.statuses || []) {
        results.push({
          type: "status",
          waMessageId: status.id,
          status: status.status,
          waId: status.recipient_id,
        });
      }
    }
  }
  return results;
}
