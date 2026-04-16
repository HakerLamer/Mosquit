// js/car.js

const id = new URLSearchParams(location.search).get("id");

document.addEventListener("DOMContentLoaded", async () => {
  const car = await api.getCar(id);
  renderCar(car);

  document.getElementById("booking-form")
    .addEventListener("submit", submitBooking);
});

function renderCar(car) {
  document.getElementById("title").innerText =
    `${car.brand} ${car.model}`;
}

async function submitBooking(e) {
  e.preventDefault();

  const data = {
    car_id: id,
    user_name: getValue("name"),
    user_phone: getValue("phone"),
    user_email: getValue("email"),
    date_start: getValue("start"),
    date_end: getValue("end"),
  };

  const res = await api.createBooking(data);
  alert("Бронирование создано!");
}
