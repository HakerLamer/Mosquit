(() => {
  const root = document.getElementById("adminContent");
  if (!root) return;

  const sections = Array.from(document.querySelectorAll(".admin-section"));
  const navItems = Array.from(document.querySelectorAll(".admin-nav__item[data-section]"));

  const showSection = (name) => {
    sections.forEach(s => s.classList.toggle("hidden", s.id !== `section-${name}`));
    navItems.forEach(i => i.classList.toggle("active", i.dataset.section === name));
    const title = document.getElementById("adminTitle");
    if (title) title.textContent = navItems.find(i => i.dataset.section === name)?.textContent.trim() || "Панель";
  };

  navItems.forEach(i => i.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(i.dataset.section);
  }));

  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    const sidebar = document.getElementById("adminSidebar");
    if (!sidebar) return;
    sidebar.style.display = sidebar.style.display === "none" ? "flex" : "none";
  });

  async function checkAuth() {
    try {
      const user = await api.get("/api/auth/me");
      if (user.role !== "admin") return (location.href = "/");
      const userEl = document.getElementById("adminUser");
      if (userEl) userEl.textContent = user.email;
    } catch {
      location.href = "/";
    }
  }

  async function loadStats() {
    try {
      const data = await api.get("/api/admin/stats");
      document.getElementById("statCars").textContent = data.cars_count ?? data.cars ?? "0";
      document.getElementById("statBookings").textContent = data.active_bookings ?? data.bookings ?? "0";
      document.getElementById("statChats").textContent = data.open_chats ?? "0";
      document.getElementById("statRevenue").textContent = `${Number(data.month_revenue ?? data.revenue ?? 0).toLocaleString("ru-RU")} ₽`;
    } catch {}
  }

  async function loadCars() {
    const tbody = document.getElementById("carsTableBody");
    if (!tbody) return;
    try {
      const cars = await api.get("/api/admin/cars");
      tbody.innerHTML = (cars || []).map(c => `
        <tr>
          <td><img src="${c.main_photo || '/assets/car-placeholder.svg'}" alt="${c.brand}" class="admin-thumb"></td>
          <td>${c.brand} ${c.model}</td>
          <td>${c.year || "—"}</td>
          <td>${c.car_class || "—"}</td>
          <td>${c.price_1day || "—"} ₽</td>
          <td>${c.is_available ? "Да" : "Нет"}</td>
          <td><button class="btn btn--ghost" data-del="${c.id}">Удалить</button></td>
        </tr>
      `).join("");

      tbody.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", async () => {
        if (!confirm("Удалить авто?")) return;
        await api.del(`/api/admin/cars/${btn.dataset.del}`);
        loadCars();
      }));
    } catch {
      tbody.innerHTML = '<tr><td colspan="7">Не удалось загрузить автомобили</td></tr>';
    }
  }

  async function loadBookings() {
    const tbody = document.getElementById("bookingsTableBody");
    if (!tbody) return;
    try {
      const data = await api.get("/api/admin/bookings");
      const rows = data.bookings || [];
      tbody.innerHTML = rows.map(b => `
        <tr>
          <td>${b.id}</td>
          <td>${b.brand || ""} ${b.model || ""}</td>
          <td>${b.user_name || "—"}</td>
          <td>${b.date_start || "—"} — ${b.date_end || "—"}</td>
          <td>${b.total_price || "—"} ₽</td>
          <td>${b.status}</td>
          <td>—</td>
        </tr>
      `).join("");
    } catch {
      tbody.innerHTML = '<tr><td colspan="7">Не удалось загрузить бронирования</td></tr>';
    }
  }

  async function loadUsers() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;
    try {
      const rows = await api.get("/api/admin/users");
      tbody.innerHTML = rows.map(u => `
        <tr>
          <td>${u.email}</td>
          <td>${u.role}</td>
          <td>${u.is_blocked ? "Заблокирован" : "Активен"}</td>
          <td>${new Date(u.created_at).toLocaleString("ru-RU")}</td>
          <td>—</td>
        </tr>
      `).join("");
    } catch {
      tbody.innerHTML = '<tr><td colspan="5">Не удалось загрузить пользователей</td></tr>';
    }
  }

  document.getElementById("adminLogout")?.addEventListener("click", async () => {
    try { await api.post("/api/auth/logout", {}); } catch {}
    location.href = "/";
  });

  checkAuth().then(() => {
    showSection("dashboard");
    loadStats();
    loadCars();
    loadBookings();
    loadUsers();
  });
})();
