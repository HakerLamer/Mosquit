(() => {
  const grid = document.getElementById("catalogGrid");
  if (!grid) return;

  const countEl = document.getElementById("catalogCount");
  const emptyState = document.getElementById("emptyState");

  const controls = {
    search: document.getElementById("searchInput"),
    priceMin: document.getElementById("priceMin"),
    priceMax: document.getElementById("priceMax"),
    sort: document.getElementById("sortSelect"),
    apply: document.getElementById("applyFilters"),
    reset: document.getElementById("resetFilters"),
    emptyReset: document.getElementById("emptyReset"),
  };

  const classesWrap = document.getElementById("classFilter");
  const gearboxWrap = document.getElementById("gearboxFilter");
  const bodyWrap = document.getElementById("bodyFilter");

  const qs = (wrap) => {
    if (!wrap) return "";
    const checked = wrap.querySelector("input:checked");
    return checked ? checked.value : "";
  };

  const buildParams = () => {
    const params = new URLSearchParams();
    if (controls.search?.value.trim()) params.set("search", controls.search.value.trim());
    if (controls.priceMin?.value) params.set("price_min", controls.priceMin.value);
    if (controls.priceMax?.value) params.set("price_max", controls.priceMax.value);
    if (controls.sort?.value) params.set("sort", controls.sort.value);

    const carClass = qs(classesWrap);
    const gearbox = qs(gearboxWrap);
    const body = qs(bodyWrap);
    if (carClass) params.set("class", carClass);
    if (gearbox) params.set("gearbox", gearbox);
    if (body) params.set("body", body);

    params.set("limit", "24");
    return params;
  };

  const renderCars = (cars = []) => {
    if (!cars.length) {
      grid.innerHTML = "";
      emptyState?.classList.remove("hidden");
      if (countEl) countEl.textContent = "0 автомобилей";
      return;
    }

    emptyState?.classList.add("hidden");
    if (countEl) countEl.textContent = `${cars.length} автомобилей`;

    grid.innerHTML = cars.map(car => {
      const image = car.main_photo || car.image || "/assets/car-placeholder.svg";
      return `
        <a href="/car.html?id=${car.id}" class="car-card">
          <img class="car-card__img" src="${image}" alt="${car.brand} ${car.model}">
          <h3>${car.brand} ${car.model}, ${car.year || "—"}</h3>
          <p>${car.price_1day ? `от ${car.price_1day} ₽ / сутки` : "Цена по запросу"}</p>
        </a>
      `;
    }).join("");
  };

  const loadCars = async () => {
    grid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    try {
      const params = buildParams();
      const data = await api.get(`/api/cars?${params.toString()}`);
      const cars = Array.isArray(data) ? data : (data?.cars || []);
      renderCars(cars);
    } catch (e) {
      renderCars([]);
    }
  };

  controls.apply?.addEventListener("click", loadCars);
  controls.sort?.addEventListener("change", loadCars);
  controls.search?.addEventListener("keydown", (e) => { if (e.key === "Enter") loadCars(); });
  controls.reset?.addEventListener("click", () => {
    [controls.search, controls.priceMin, controls.priceMax].forEach(el => { if (el) el.value = ""; });
    [classesWrap, gearboxWrap, bodyWrap].forEach(wrap => {
      wrap?.querySelectorAll("input[type=checkbox]").forEach(i => { i.checked = false; });
    });
    loadCars();
  });
  controls.emptyReset?.addEventListener("click", () => controls.reset?.click());

  [classesWrap, gearboxWrap, bodyWrap].forEach(wrap => {
    wrap?.addEventListener("change", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || t.type !== "checkbox") return;
      if (t.checked) {
        wrap.querySelectorAll("input[type=checkbox]").forEach(i => { if (i !== t) i.checked = false; });
      }
    });
  });

  loadCars();
})();
