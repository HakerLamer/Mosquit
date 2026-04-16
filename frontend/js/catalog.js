// js/catalog.js

document.addEventListener("DOMContentLoaded", async () => {
  loadCars();

  document.getElementById("filters").addEventListener("change", loadCars);
});

async function loadCars() {
  const params = new URLSearchParams({
    class: getValue("class"),
    gearbox: getValue("gearbox"),
    price_min: getValue("price_min"),
    price_max: getValue("price_max"),
  });

  const cars = await api.getCars(`?${params.toString()}`);
  renderCars(cars);
}

function renderCars(cars) {
  const container = document.getElementById("cars");

  container.innerHTML = cars.map(car => `
    <div class="card">
      <img src="${car.image}" loading="lazy"/>
      <h3>${car.brand} ${car.model}</h3>
      <p>${car.price_1day} ₽/сутки</p>
      <a href="/car.html?id=${car.id}">Подробнее</a>
    </div>
  `).join("");
}
