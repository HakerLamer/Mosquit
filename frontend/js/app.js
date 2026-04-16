// js/app.js

function getValue(id) {
  return document.getElementById(id)?.value || "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function showLoader() {
  document.body.classList.add("loading");
}

function hideLoader() {
  document.body.classList.remove("loading");
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = text;

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}
