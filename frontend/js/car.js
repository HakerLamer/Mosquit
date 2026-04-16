(() => {
  const detailEl = document.getElementById("carDetail");
  if (!detailEl) return;

  const carId = new URLSearchParams(location.search).get("id");
  const breadcrumbCar = document.getElementById("breadcrumbCar");

  const bookingModal = document.getElementById("bookingModal");
  const bookingForm = document.getElementById("bookingForm");
  const bookingError = document.getElementById("bookingError");
  let currentCar = null;

  const dateStart = document.getElementById("bookingDateStart");
  const dateEnd = document.getElementById("bookingDateEnd");
  const summaryDays = document.getElementById("summaryDays");
  const summaryPriceDay = document.getElementById("summaryPriceDay");
  const summaryTotal = document.getElementById("summaryTotal");

  const openModal = () => bookingModal?.classList.remove("hidden");
  const closeModal = () => bookingModal?.classList.add("hidden");

  document.getElementById("bookingModalClose")?.addEventListener("click", closeModal);
  document.getElementById("bookingModalOverlay")?.addEventListener("click", closeModal);

  const calcSummary = () => {
    if (!currentCar || !dateStart?.value || !dateEnd?.value) return;
    const start = new Date(dateStart.value);
    const end = new Date(dateEnd.value);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const total = Number(currentCar.price_1day || 0) * days;
    if (summaryDays) summaryDays.textContent = `${days}`;
    if (summaryPriceDay) summaryPriceDay.textContent = `${currentCar.price_1day} ₽`;
    if (summaryTotal) summaryTotal.textContent = `${total.toLocaleString("ru-RU")} ₽`;
  };

  dateStart?.addEventListener("change", calcSummary);
  dateEnd?.addEventListener("change", calcSummary);

  const renderCar = (car) => {
    const image = (car.photos?.find(p => p.is_main)?.url) || car.main_photo || "/assets/car-placeholder.svg";
    if (breadcrumbCar) breadcrumbCar.textContent = `${car.brand} ${car.model}`;
    document.title = `${car.brand} ${car.model} — Mosquit`;

    detailEl.innerHTML = `
      <div class="car-detail__gallery">
        <img src="${image}" alt="${car.brand} ${car.model}" class="car-detail__main-image"/>
      </div>
      <div class="car-detail__info">
        <h1>${car.brand} ${car.model}, ${car.year || "—"}</h1>
        <p class="car-text-muted">${car.description || "Надёжный автомобиль для города и путешествий."}</p>
        <p class="car-price-lg">${car.price_1day} ₽ / сутки</p>
        <div class="car-detail__specs">
          <div>Класс: <b>${car.car_class || "—"}</b></div>
          <div>Кузов: <b>${car.body_type || "—"}</b></div>
          <div>КПП: <b>${car.gearbox_type || "—"}</b></div>
          <div>Привод: <b>${car.drive_type || "—"}</b></div>
        </div>
        <button class="btn btn--primary btn--full" id="bookNowBtn">Забронировать</button>
      </div>
    `;

    document.getElementById("bookNowBtn")?.addEventListener("click", openModal);
    const bookingName = document.getElementById("bookingCarName");
    if (bookingName) bookingName.textContent = `${car.brand} ${car.model}`;
  };

  bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentCar) return;

    const payload = {
      car_id: currentCar.id,
      user_name: document.getElementById("bookingName")?.value?.trim(),
      user_phone: document.getElementById("bookingPhone")?.value?.trim(),
      user_email: document.getElementById("bookingEmail")?.value?.trim(),
      date_start: dateStart?.value,
      date_end: dateEnd?.value,
    };

    try {
      bookingError?.classList.add("hidden");
      await api.post("/api/bookings", payload);
      closeModal();
      showToast("Бронирование отправлено");
      bookingForm.reset();
      calcSummary();
    } catch (err) {
      if (bookingError) {
        bookingError.classList.remove("hidden");
        bookingError.textContent = "Не удалось создать бронирование";
      }
    }
  });

  const loadCar = async () => {
    if (!carId) {
      detailEl.innerHTML = '<div class="card">Некорректная ссылка на автомобиль.</div>';
      return;
    }

    try {
      currentCar = await api.get(`/api/cars/${carId}`);
      renderCar(currentCar);
      calcSummary();
    } catch (err) {
      detailEl.innerHTML = '<div class="card">Автомобиль не найден.</div>';
    }
  };

  loadCar();
})();
