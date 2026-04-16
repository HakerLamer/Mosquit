// js/support.js

let socket;
let currentSession = null;

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  loadChats();
  initSocket();
});


// 🔐 AUTH
async function checkAuth() {
  const user = await api.get("/api/auth/me");

  if (!["support", "admin"].includes(user.role)) {
    location.href = "/";
  }
}


// 📋 CHATS
async function loadChats() {
  const chats = await api.get("/api/support/chats");

  document.getElementById("chat-list").innerHTML =
    chats.map(c => `
      <div onclick="openChat('${c.session_id}')">
        ${c.session_id}
        <span>${c.status}</span>
      </div>
    `).join("");
}


// 📩 OPEN CHAT
async function openChat(sessionId) {
  currentSession = sessionId;

  const messages = await api.get(`/api/support/chats/${sessionId}`);
  renderMessages(messages);
}


// 🧾 RENDER
function renderMessages(messages) {
  const el = document.getElementById("chat");

  el.innerHTML = messages.map(m => `
    <div class="${m.role}">
      ${m.text}
    </div>
  `).join("");
}


// 📡 SOCKET
function initSocket() {
  socket = io("/");

  socket.on("chat:message", (msg) => {
    if (msg.session_id === currentSession) {
      appendMessage(msg);
    }
  });
}

function appendMessage(msg) {
  const el = document.getElementById("chat");

  el.innerHTML += `
    <div class="${msg.role}">
      ${msg.text}
    </div>
  `;
}


// ✉️ SEND
function sendMessage() {
  const text = getValue("message");

  socket.emit("chat:message", {
    session_id: currentSession,
    text,
  });

  setValue("message", "");
}


// 🔒 CLOSE
async function closeChat() {
  await api.post(`/api/support/chats/${currentSession}/close`);
  loadChats();
}
