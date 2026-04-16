// js/chat.js

const socket = io("/", {
  path: "/socket.io",
});

const sessionId = localStorage.getItem("session_id")
  || crypto.randomUUID();

localStorage.setItem("session_id", sessionId);

socket.emit("join", sessionId);

socket.on("message", (msg) => {
  renderMessage(msg);
});

function sendMessage(text) {
  socket.emit("message", {
    session_id: sessionId,
    text,
  });
}
