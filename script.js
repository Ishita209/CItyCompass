let map;
let userLat;
let userLon;

let markers = [];

navigator.geolocation.getCurrentPosition(success, error, {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
});

const hospitalIcon = L.icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
  iconSize: [32, 32]
});

const restaurantIcon = L.icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  iconSize: [32, 32]
});

const atmIcon = L.icon({
  iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  iconSize: [32, 32]
});

function success(position) {

  userLat = position.coords.latitude;
  userLon = position.coords.longitude;

  initializeMap();
}

function error() {
  alert("Location access denied.");
}

// -----------------------------
// TEMPORARY MANUAL LOCATION
// BHOPAL
// -----------------------------

// userLat = 23.2599;
// userLon = 77.4126;

// initializeMap();

// -----------------------------
// MAP INITIALIZATION
// -----------------------------

function initializeMap() {

  map = L.map('map').setView([userLat, userLon], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // USER / CITY MARKER

  L.marker([userLat, userLon])
    .addTo(map)
    .bindPopup("Your Location")
    .openPopup();
}

// -----------------------------
// FIND NEARBY PLACES
// -----------------------------

async function findNearby(placeType) {

  document.getElementById("placesList").innerHTML = "";

  document.getElementById("loading").innerText =
    "Fetching nearby places...";

  // CLEAR OLD MARKERS

  markers.forEach(marker => map.removeLayer(marker));

  markers = [];

  let query = "";

  // -----------------------------
  // HOSPITALS
  // -----------------------------

  if (placeType === "hospital") {

    query = `
    [out:json];
    (
      node["amenity"="hospital"](around:10000,${userLat},${userLon});
      node["amenity"="clinic"](around:10000,${userLat},${userLon});
      node["healthcare"](around:10000,${userLat},${userLon});
    );
    out;
    `;
  }

  // -----------------------------
  // RESTAURANTS
  // -----------------------------

  else if (placeType === "restaurant") {

    query = `
    [out:json];
    (
      node["amenity"="restaurant"](around:10000,${userLat},${userLon});
      node["amenity"="fast_food"](around:10000,${userLat},${userLon});
      node["amenity"="cafe"](around:10000,${userLat},${userLon});
    );
    out;
    `;
  }

  // -----------------------------
  // ATMS
  // -----------------------------

  else if (placeType === "atm") {

    query = `
    [out:json];
    (
      node["amenity"="atm"](around:10000,${userLat},${userLon});
      node["amenity"="bank"](around:10000,${userLat},${userLon});
    );
    out;
    `;
  }

  // -----------------------------
  // FETCH DATA
  // -----------------------------

  const url =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(query);

  const response = await fetch(url);

  const data = await response.json();

  console.log(data);

  // -----------------------------
  // CREATE MARKERS
  // -----------------------------

  let selectedIcon;

  if (placeType === "hospital") {
    selectedIcon = hospitalIcon;
  }

  else if (placeType === "restaurant") {
    selectedIcon = restaurantIcon;
  }

  else if (placeType === "atm") {
    selectedIcon = atmIcon;
  }

  // -----------------------------
  // STORE PLACES
  // -----------------------------

  let placesArray = [];

  data.elements.forEach(place => {

    const lat = place.lat;
    const lon = place.lon;

    const distance = calculateDistance(
      userLat,
      userLon,
      lat,
      lon
    );

    placesArray.push({
      place,
      lat,
      lon,
      distance
    });

  });

  // -----------------------------
  // SORT BY DISTANCE
  // -----------------------------

  placesArray.sort((a, b) => a.distance - b.distance);

  // -----------------------------
  // DISPLAY SORTED RESULTS
  // -----------------------------

  placesArray.forEach(item => {

    const placeName =
      item.place.tags.name || placeType;

    const marker = L.marker(
      [item.lat, item.lon],
      {
        icon: selectedIcon
      }
    )
      .addTo(map)
      .bindPopup(placeName);

    markers.push(marker);

    marker.on('click', function () {

      map.setView([item.lat, item.lon], 17);

    });

    document.getElementById("placesList").innerHTML += `
  <div class="place-item"
       onclick="zoomToPlace(${item.lat}, ${item.lon})">

    <strong>
      ${placeName}
    </strong>

    <br>

    ${item.distance} km away

    <br><br>

    <button onclick="
      openDirections(
        ${item.lat},
        ${item.lon},
        event
      )
    ">
      Get Directions
    </button>

  </div>
`;

  });

  document.getElementById("loading").innerText = "";
}

function zoomToPlace(lat, lon) {

  map.setView([lat, lon], 18);

}
function calculateDistance(lat1, lon1, lat2, lon2) {

  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return (R * c).toFixed(2);
}

function openDirections(lat, lon, event) {

  // PREVENT place-item click

  event.stopPropagation();

  const url =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

  window.open(url, "_blank");
}

async function searchCity() {

  const city =
    document.getElementById("cityInput").value;

  if (!city) {
    alert("Please enter a city name");
    return;
  }

  document.getElementById("loading").innerText =
    "Searching city...";

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&q=${city}`;

  const response = await fetch(url);

  const data = await response.json();

  if (data.length === 0) {

    document.getElementById("loading").innerText = "";

    alert("City not found");

    return;
  }

  userLat = parseFloat(data[0].lat);
  userLon = parseFloat(data[0].lon);

  // MOVE MAP

  map.setView([userLat, userLon], 14);

  // CLEAR OLD MARKERS

  markers.forEach(marker => map.removeLayer(marker));

  markers = [];

  // ADD CITY MARKER

  const cityMarker = L.marker([userLat, userLon])
    .addTo(map)
    .bindPopup(city)
    .openPopup();

  markers.push(cityMarker);

  document.getElementById("loading").innerText = "";
}

function toggleTheme() {

  document.body.classList.toggle("dark-mode");

  const button =
    document.getElementById("themeToggle");

  if (
    document.body.classList.contains("dark-mode")
  ) {
    button.innerHTML = "☀️";
  }

  else {
    button.innerHTML = "🌙";
  }
}