(() => {
  const sessionsList = document.getElementById("sessionsList");
  const chatArea = document.getElementById("supportChatArea");
  if (!sessionsList || !chatArea) return;

  const statusFilter = document.getElementById("sessionStatusFilter");
  let currentSession = null;
  let socket;

  async function checkAuth() {
    try {
      const user = await api.get("/api/auth/me");
      if (!["support", "admin"].includes(user.role)) {
        location.href = "/";
        return false;
      }
      document.getElementById("adminUser")?.replaceChildren(document.createTextNode(user.email));
      return true;
    } catch {
      location.href = "/";
      return false;
    }
  }

  async function loadSessions() {
    try {
      const q = statusFilter?.value ? `?status=${statusFilter.value}` : "";
      const rows = await api.get(`/api/chat/sessions${q}`);
      sessionsList.innerHTML = rows.map(s => `
        <button class="admin-nav__item" data-session="${s.session_id}">
          <span>${s.user_label || s.session_id}</span>
          <small class="session-status">${s.status}</small>
        </button>
      `).join("");

      sessionsList.querySelectorAll("[data-session]").forEach(btn => btn.addEventListener("click", () => {
        openSession(btn.dataset.session);
      }));
    } catch {
      sessionsList.innerHTML = '<p>Не удалось загрузить чаты</p>';
    }
  }

  async function openSession(sessionId) {
    currentSession = sessionId;
    try {
      const rows = await api.get(`/api/chat/sessions/${sessionId}/messages`);
      renderMessages(rows);
      socket?.emit("support_join_session", sessionId);
    } catch {
      chatArea.innerHTML = '<div class="card">Не удалось загрузить сообщения</div>';
    }
  }

  function renderMessages(rows) {
    chatArea.innerHTML = `
      <div class="card support-chat-card">
        <div id="supportMessages" class="support-messages"></div>
        <div class="support-input-row">
          <input id="supportInput" class="form__input" placeholder="Сообщение..." />
          <button id="supportSend" class="btn btn--primary">Отправить</button>
        </div>
      </div>
    `;

    const box = document.getElementById("supportMessages");
    box.innerHTML = rows.map(m => `
      <div class="${m.role === 'user' ? 'support' : 'user'} support-message-row">
        <div class="card support-message-bubble">${m.text}</div>
      </div>
    `).join("");

    document.getElementById("supportSend")?.addEventListener("click", sendMessage);
    document.getElementById("supportInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  function sendMessage() {
    const input = document.getElementById("supportInput");
    if (!input || !currentSession || !input.value.trim()) return;
    const text = input.value.trim();
    socket?.emit("send_message", { sessionId: currentSession, text, role: "support" });
    input.value = "";
  }

  function initSocket() {
    socket = io("/");
    const token = localStorage.getItem("token");
    if (token) socket.emit("join_support", token);

    socket.on("new_message", (msg) => {
      if (msg.session_id !== currentSession) return;
      const box = document.getElementById("supportMessages");
      if (!box) return;
      box.insertAdjacentHTML("beforeend", `
        <div class="${msg.role === 'user' ? 'support' : 'user'} support-message-row">
          <div class="card support-message-bubble">${msg.text}</div>
        </div>
      `);
      box.scrollTop = box.scrollHeight;
    });

    socket.on("session_updated", () => loadSessions());
  }

  document.getElementById("adminLogout")?.addEventListener("click", async () => {
    try { await api.post("/api/auth/logout", {}); } catch {}
    location.href = "/";
  });

  statusFilter?.addEventListener("change", loadSessions);

  checkAuth().then(ok => {
    if (!ok) return;
    loadSessions();
    initSocket();
  });
})();
