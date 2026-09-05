const state = {
  password: sessionStorage.getItem("dashboard_password") || "",
  view: "inbox",
  contacts: [],
  activeContactId: null,
};

const loginScreen = document.getElementById("login-screen");
const appRoot = document.getElementById("app");
const viewRoot = document.getElementById("view-root");

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-dashboard-password": state.password,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) {
    sessionStorage.removeItem("dashboard_password");
    location.reload();
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("password").value;
  state.password = password;
  try {
    await api("/contacts");
    sessionStorage.setItem("dashboard_password", password);
    loginScreen.hidden = true;
    appRoot.hidden = false;
    render();
  } catch (err) {
    document.getElementById("login-error").textContent = "Incorrect password";
  }
});

document.querySelectorAll("nav button[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.view = btn.dataset.view;
    render();
  });
});

function render() {
  if (state.view === "inbox") return renderInbox();
  if (state.view === "contacts") return renderContacts();
  if (state.view === "broadcast") return renderBroadcast();
  if (state.view === "settings") return renderSettings();
}

// ---------- Inbox ----------
async function renderInbox() {
  state.contacts = await api("/contacts");
  viewRoot.innerHTML = `
    <div class="grid-two">
      <div id="contact-list"></div>
      <div id="chat-panel">
        <div id="chat-header">Select a conversation</div>
        <div id="chat-messages"></div>
        <form id="chat-composer" hidden>
          <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off" />
          <button class="btn" type="submit">Send</button>
        </form>
      </div>
    </div>
  `;
  const listEl = document.getElementById("contact-list");
  listEl.innerHTML = state.contacts
    .map(
      (c) => `
      <div class="contact-row" data-id="${c.id}">
        <div class="name">${escapeHtml(c.name || c.wa_id)}</div>
        <div class="sub">${escapeHtml(c.wa_id)} ${c.opted_in ? "" : "· opted out"}</div>
      </div>`
    )
    .join("") || `<div class="contact-row">No contacts yet. They'll appear once someone messages your WhatsApp number.</div>`;

  listEl.querySelectorAll(".contact-row[data-id]").forEach((row) => {
    row.addEventListener("click", () => openConversation(Number(row.dataset.id)));
  });

  if (state.activeContactId) openConversation(state.activeContactId);
}

async function openConversation(contactId) {
  state.activeContactId = contactId;
  document.querySelectorAll(".contact-row").forEach((r) => {
    r.classList.toggle("active", Number(r.dataset.id) === contactId);
  });
  const contact = state.contacts.find((c) => c.id === contactId);
  document.getElementById("chat-header").textContent = contact ? contact.name || contact.wa_id : "Conversation";

  const messages = await api(`/contacts/${contactId}/messages`);
  const messagesEl = document.getElementById("chat-messages");
  messagesEl.innerHTML = messages
    .map(
      (m) => `
      <div class="bubble ${m.direction}">
        ${escapeHtml(m.body)}
        <div class="meta">${m.direction === "out" && m.ai_generated ? "AI · " : ""}${new Date(m.created_at + "Z").toLocaleString()}</div>
      </div>`
    )
    .join("");
  messagesEl.scrollTop = messagesEl.scrollHeight;

  const composer = document.getElementById("chat-composer");
  composer.hidden = false;
  composer.onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const body = input.value.trim();
    if (!body) return;
    input.value = "";
    try {
      await api(`/contacts/${contactId}/messages`, { method: "POST", body: { body } });
      openConversation(contactId);
    } catch (err) {
      alert(`Failed to send: ${err.message}`);
    }
  };
}

// ---------- Contacts ----------
async function renderContacts() {
  const contacts = await api("/contacts");
  viewRoot.innerHTML = `
    <h2>Contacts (${contacts.length})</h2>
    <table>
      <thead><tr><th>Name</th><th>WhatsApp #</th><th>Tags</th><th>Status</th><th>Last message</th></tr></thead>
      <tbody>
        ${contacts
          .map(
            (c) => `
          <tr>
            <td>${escapeHtml(c.name || "—")}</td>
            <td>${escapeHtml(c.wa_id)}</td>
            <td>${escapeHtml(c.tags || "—")}</td>
            <td>${c.opted_in ? "Opted in" : "Opted out"}</td>
            <td>${c.last_message_at ? new Date(c.last_message_at + "Z").toLocaleString() : "—"}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// ---------- Broadcast ----------
async function renderBroadcast() {
  const broadcasts = await api("/broadcasts");
  viewRoot.innerHTML = `
    <h2>Broadcast</h2>
    <div class="card">
      <p class="hint">
        WhatsApp requires business-initiated broadcasts to use a pre-approved message template
        (create one in Meta Business Manager first). Only opted-in contacts will be sent to.
      </p>
      <form id="broadcast-form">
        <label>Broadcast name (internal)</label>
        <input type="text" id="b-name" required placeholder="e.g. September promo" />
        <label>Approved template name</label>
        <input type="text" id="b-template" required placeholder="e.g. order_update" />
        <label>Template language code</label>
        <input type="text" id="b-lang" value="en_US" />
        <label>Template body variables (comma separated, matches {{1}} {{2}}...)</label>
        <input type="text" id="b-vars" placeholder="e.g. John, 20% OFF" />
        <label>Only send to contacts tagged (optional, leave blank for all opted-in contacts)</label>
        <input type="text" id="b-tag" placeholder="e.g. vip" />
        <button class="btn" type="submit" style="margin-top:1rem;">Send broadcast</button>
        <div class="status-msg" id="broadcast-status"></div>
      </form>
    </div>

    <h2 style="margin-top:2rem;">History</h2>
    <table>
      <thead><tr><th>Name</th><th>Template</th><th>Status</th><th>Sent</th><th>Failed</th><th>Total</th><th>Created</th></tr></thead>
      <tbody>
        ${broadcasts
          .map(
            (b) => `
          <tr>
            <td>${escapeHtml(b.name)}</td>
            <td>${escapeHtml(b.template_name)}</td>
            <td>${escapeHtml(b.status)}</td>
            <td>${b.sent}</td>
            <td>${b.failed}</td>
            <td>${b.total}</td>
            <td>${new Date(b.created_at + "Z").toLocaleString()}</td>
          </tr>`
          )
          .join("") || `<tr><td colspan="7">No broadcasts sent yet.</td></tr>`}
      </tbody>
    </table>
  `;

  document.getElementById("broadcast-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("broadcast-status");
    statusEl.textContent = "Sending...";
    const variables = document
      .getElementById("b-vars")
      .value.split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    try {
      const result = await api("/broadcasts", {
        method: "POST",
        body: {
          name: document.getElementById("b-name").value,
          templateName: document.getElementById("b-template").value,
          languageCode: document.getElementById("b-lang").value || "en_US",
          variables,
          tag: document.getElementById("b-tag").value || undefined,
        },
      });
      statusEl.textContent = `Broadcast queued to ${result.total} contact(s).`;
      renderBroadcast();
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
    }
  });
}

// ---------- Settings ----------
async function renderSettings() {
  const settings = await api("/settings");
  viewRoot.innerHTML = `
    <h2>AI Settings</h2>
    <div class="card">
      <div class="toggle-row">
        <input type="checkbox" id="ai-enabled" ${String(settings.ai_enabled) === "true" ? "checked" : ""} />
        <label for="ai-enabled" style="margin:0;">Enable AI auto-reply</label>
      </div>
      <label>System prompt (defines your bot's persona &amp; instructions)</label>
      <textarea id="system-prompt">${escapeHtml(settings.system_prompt)}</textarea>
      <button class="btn" id="save-settings" style="margin-top:1rem;">Save</button>
      <div class="status-msg" id="settings-status"></div>
    </div>
  `;
  document.getElementById("save-settings").addEventListener("click", async () => {
    const statusEl = document.getElementById("settings-status");
    try {
      await api("/settings", {
        method: "PUT",
        body: {
          ai_enabled: document.getElementById("ai-enabled").checked,
          system_prompt: document.getElementById("system-prompt").value,
        },
      });
      statusEl.textContent = "Saved.";
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
    }
  });
}

// ---------- Boot ----------
(async function boot() {
  if (state.password) {
    try {
      await api("/contacts");
      loginScreen.hidden = true;
      appRoot.hidden = false;
      render();
      return;
    } catch {
      sessionStorage.removeItem("dashboard_password");
    }
  }
  loginScreen.hidden = false;
})();
