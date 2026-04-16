// js/admin.js

let currentCarId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  loadDashboard();
  loadCars();
  loadBookings();
  loadUsers();
  loadTheme();
  initSocket();
});


// 🔐 AUTH
async function checkAuth() {
  try {
    const user = await api.get("/api/auth/me");

    if (user.role !== "admin") {
      location.href = "/";
    }
  } catch {
    location.href = "/login.html";
  }
}


// 📊 DASHBOARD
async function loadDashboard() {
  const stats = await api.get("/api/admin/stats");

  document.getElementById("cars-count").innerText = stats.cars;
  document.getElementById("bookings-count").innerText = stats.bookings;
  document.getElementById("revenue").innerText = stats.revenue + " ₽";
}


// 🚗 CARS
async function loadCars() {
  const cars = await api.get("/api/admin/cars");
  renderCars(cars);
}

function renderCars(cars) {
  const el = document.getElementById("cars");

  el.innerHTML = cars.map(c => `
    <div class="card">
      <b>${c.brand} ${c.model}</b>
      <p>${c.price_1day} ₽</p>
      <button onclick="editCar(${c.id})">✏️</button>
      <button onclick="deleteCar(${c.id})">🗑</button>
    </div>
  `).join("");
}

async function saveCar() {
  const data = {
    vin: getValue("vin"),
    car_class: getValue("class"),
    price_1day: +getValue("price"),
  };

  if (currentCarId) {
    await api.put(`/api/admin/cars/${currentCarId}`, data);
  } else {
    await api.post("/api/admin/cars", data);
  }

  showToast("Сохранено");
  loadCars();
}

async function deleteCar(id) {
  if (!confirm("Удалить авто?")) return;

  await api.del(`/api/admin/cars/${id}`);
  loadCars();
}

async function editCar(id) {
  const car = await api.get(`/api/admin/cars/${id}`);
  currentCarId = id;

  setValue("vin", car.vin);
}


// 📸 UPLOAD
async function uploadPhotos() {
  const input = document.getElementById("photos");
  const formData = new FormData();

  [...input.files].forEach(f => formData.append("photos", f));

  await fetch(`/api/admin/cars/${currentCarId}/photos`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  showToast("Фото загружены");
}


// 📅 BOOKINGS
async function loadBookings() {
  const bookings = await api.get("/api/admin/bookings");

  const el = document.getElementById("bookings");

  el.innerHTML = bookings.map(b => `
    <div class="card">
      <b>${b.user_name}</b>
      <p>${b.status}</p>
      <select onchange="updateBooking(${b.id}, this.value)">
        <option>${b.status}</option>
        <option>подтверждена</option>
        <option>активна</option>
        <option>завершена</option>
      </select>
    </div>
  `).join("");
}

async function updateBooking(id, status) {
  await api.put(`/api/admin/bookings/${id}`, { status });
}


// 👥 USERS
async function loadUsers() {
  const users = await api.get("/api/admin/users");

  const el = document.getElementById("users");

  el.innerHTML = users.map(u => `
    <div>
      ${u.email}
      <select onchange="changeRole(${u.id}, this.value)">
        <option ${u.role==="user"?"selected":""}>user</option>
        <option ${u.role==="support"?"selected":""}>support</option>
        <option ${u.role==="admin"?"selected":""}>admin</option>
      </select>
    </div>
  `).join("");
}

async function changeRole(id, role) {
  await api.put(`/api/admin/users/${id}`, { role });
}


// 🎨 THEME
async function loadTheme() {
  const theme = await api.get("/api/settings/theme");

  Object.entries(theme).forEach(([k,v])=>{
    document.documentElement.style.setProperty(`--${k}`, v);
  });
}

async function saveTheme() {
  const data = {
    primary: getValue("primary"),
    accent: getValue("accent"),
  };

  await api.put("/api/admin/settings/theme", data);
  showToast("Тема обновлена");
}


// 💬 SOCKET
function initSocket() {
  const socket = io("/");

  socket.on("chat:new", () => {
    console.log("Новый чат");
  });
}
