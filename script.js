'use strict';

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////
// APLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  constructor() {
    // Get users position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._delete.bind(this));
    containerWorkouts.addEventListener('click', this._edit.bind(this));
    containerWorkouts.addEventListener('click', this._save.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if activity running, create running object

    if (type === 'running') {
      // check if data is valid
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker

    this._renderWorkoutMarker(workout);

    // render workout on list

    this._renderWorkout(workout);
    // hide form + clear input fields
    this._hideForm();

    // set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
    this.#markers.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === 'running')
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
    <btn class="delete__button"><ion-icon class="delete--btn" name="trash-outline"></ion-icon>
  </btn>
  <btn class="edit--btn"><ion-icon class="edit" name="create-outline"></ion-icon>
</btn>
    </li>`;

    if (workout.type === 'cycling')
      html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevationGain}</span>
    <span class="workout__unit">m</span>
  </div>
  <btn class="delete__button"><ion-icon class="delete--btn" name="trash-outline"></ion-icon>
</btn>
<btn class="edit--btn"><ion-icon class="edit" name="create-outline"></ion-icon>
</btn>
</li>
`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  _delete(e) {
    if (!e.target.classList.contains('delete--btn')) return;
    const parentbtn = e.target.parentNode;
    const id = parentbtn.parentNode.dataset.id;
    const data = JSON.parse(localStorage.getItem('workouts'));
    data.forEach((dat, i) => {
      if (dat.id === id) {
        this.#markers[i].remove();
        this.#markers.splice(i, 1);
      } else return;
    });
    const newData = data.filter((obj, i) => obj.id !== id);
    parentbtn.parentNode.remove();
    this.#workouts = newData;
    this._setLocalStorage();
  }

  _edit(e) {
    if (!e.target.parentNode.classList.contains('edit--btn')) return;
    const parentbtn = e.target.parentNode;
    const id = parentbtn.parentNode.dataset.id;

    let cadence, distance, duration, type, elevation;

    this.#workouts.forEach((workout, i) => {
      if (workout.id === id && workout.type === 'running') {
        cadence = workout.cadence;
        distance = workout.distance;
        duration = workout.duration;
        type = workout.type;
      }
      if (workout.id === id && workout.type === 'cycling') {
        elevation = workout.elevationGain;
        distance = workout.distance;
        duration = workout.duration;
        type = workout.type;
      }
    });

    let html = `<form class="form" onkeydown="return event.key != 'Enter';">
    <div class="form__row">
      <label class="form__label">Type</label>
      <input class="form__input form__input--type" value=${type} readonly/>
    </div>
    <div class="form__row">
      <label class="form__label">Distance</label>
      <input class="form__input form__input--distance" placeholder="km" value="${distance}"/>
    </div>
    <div class="form__row">
      <label class="form__label">Duration</label>
      <input
        class="form__input form__input--duration"
        placeholder="min" value="${duration}"
      />
    </div>`;

    if (type === 'running')
      html += `
    <div class="form__row">
      <label class="form__label">Cadence</label>
      <input
        class="form__input form__input--cadence"
        placeholder="step/min" value="${cadence}"
      />
    </div>

      <button class="save__btn form__btn"><ion-icon class="check__icon" name="checkmark-circle-outline"></ion-icon>
    </button>
  </form>`;

    if (type === 'cycling')
      html += `
    <div class="form__row">
      <label class="form__label">Elev Gain</label>
      <input
        class="form__input form__input--elevation"
        placeholder="meters" value="${elevation}"
      />
    </div>
    <button class="save__btn form__btn"><ion-icon class="check__icon" name="checkmark-circle-outline"></ion-icon>
  </button>
  </form>`;

    const parent = parentbtn.parentNode;

    parent.innerHTML = html;
    parent.classList.remove('workout');
    parent.firstChild.lastElementChild.classList.remove('form__btn');
  }

  _save(e) {
    if (!e.target.parentNode.classList.contains('save__btn')) return;
    e.preventDefault();
    const parentbtn = e.target.parentNode.parentNode.closest('li');
    const parentForm = e.target.parentNode.parentNode;
    const id = parentbtn.dataset.id;
    const inputDistance = parentForm.querySelector(
      '.form__input--distance'
    ).value;
    const inputDuration = parentForm.querySelector(
      '.form__input--duration'
    ).value;

    const inputOther =
      parentForm.querySelector('.form__input--cadence')?.value ??
      parentForm.querySelector('.form__input--elevation')?.value;

    this.#workouts.forEach((workout, i) => {
      if (workout.id === id && workout.type === 'running') {
        workout.cadence = +inputOther;
        workout.distance = +inputDistance;
        workout.duration = +inputDuration;
        workout.pace = +inputDuration / +inputDistance;
        this.#workouts[i] = workout;
      }
      if (workout.id === id && workout.type === 'cycling') {
        workout.elevationGain = +inputOther;
        workout.distance = +inputDistance;
        workout.duration = +inputDuration;
        workout.speed = +inputDistance / (+inputDuration / 60);
        this.#workouts[i] = workout;
      }
      parentbtn.remove();
      document.querySelectorAll('.workout').forEach(work => {
        work.remove();
      });
      this.#workouts.forEach(work => this._renderWorkout(work));

      this._setLocalStorage();
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
