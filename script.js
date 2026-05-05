const weatherUpdateInterval = 1000 * 1;
const timeUpdateInterval = 1000;
const clockChangeDelayAfterSound = 200;
const typeTransition = 5000;

const backgroundAudio = document.getElementById("backgroundAudio");
const clockChangeAudio = document.getElementById("clockChangeAudio");

const app = document.getElementById("app");
const weatherData = document.getElementById("weatherData");
// const commandBox = document.getElementById("commandBox");
const cityCenters = [
  { name: "NOI", lat: 28.5355, lon: 77.391 },
  { name: "FBD", lat: 28.4089, lon: 77.3178 },
  { name: "DEL", lat: 28.6139, lon: 77.209 },
  { name: "GGN", lat: 28.4595, lon: 77.0266 },
];
const clockFullPath = "resources/clocks/";
let cityTimeZone = "Asia/Kolkata"; // default
const segmentNames = ["A", "B", "C", "D", "E", "F", "G"];
const countryMap = {
  India: "IN",
  "United States of America": "US",
  "United States": "US",
  "United Kingdom": "UK",
  Japan: "JP",
  Singapore: "SG",
  Australia: "AU",
  France: "FR",
  Germany: "DE",
  Italy: "IT",
  "United Arab Emirates": "AE",
};
const cityMap = {
  Faridabad: "FBD",
  "New Delhi": "DEL",
  Delhi: "DEL",
  Gurugram: "GGN",
  Noida: "NOI",
  Mumbai: "BOM",
  Bengaluru: "BLR",

  "San Francisco": "SF",
  "New York": "NYC",
  "Los Angeles": "LA",
  Chicago: "CHI",
  Seattle: "SEA",

  London: "LDN",
  Manchester: "MAN",

  Dubai: "DXB",
  "Abu Dhabi": "AUH",

  Tokyo: "TYO",
  Singapore: "SG",

  Sydney: "SYD",
  Melbourne: "MEL",

  Paris: "PAR",
  Berlin: "BER",
  Rome: "ROM",
};
const displayChars = {
  0: ["A", "B", "C", "D", "E", "F"],
  1: ["B", "C"],
  2: ["A", "B", "D", "E", "G"],
  3: ["A", "B", "C", "D", "G"],
  4: ["B", "C", "F", "G"],
  5: ["A", "C", "D", "F", "G"],
  6: ["A", "C", "D", "E", "F", "G"],
  7: ["A", "B", "C"],
  8: ["A", "B", "C", "D", "E", "F", "G"],
  9: ["A", "B", "C", "D", "F", "G"],
};

const defaultClock = clocks[0].types;

let cityLocalTime = new Date();
let lastWeatherFetchTime = new Date();
let enableAnimation = true;
let ampm = false;
let selectedClock = "Cycle";

// 🔥 GLOBAL FIX
let weatherType = "Clear";
let cityTimeOffset = 0; // 🌍 seconds offset from API
function setupClock(clock) {
  function clipSeg(seg) {
    if (seg == null || seg.length < 4) return "100% 100% 100% 100%";
    return (
      (seg[1] / clock.height) * 100 +
      "% " +
      (100 - (seg[0] / clock.width) * 100) +
      "% " +
      (100 - (seg[3] / clock.height) * 100) +
      "% " +
      (seg[2] / clock.width) * 100 +
      "%"
    );
  }

  let innerClock =
    "<video " +
    (enableAnimation ? "autoplay " : "") +
    ' muted loop><source src="' +
    clockFullPath +
    clock.backgroundPath +
    '"></video>';

  for (const displayIndex in clock.displays) {
    for (const segmentName of segmentNames) {
      innerClock +=
        '<img style="clip-path: inset(' +
        clipSeg(clock.displays[displayIndex][segmentName]) +
        ");" +
        clock.imgStyle +
        '" class="display_' +
        displayIndex +
        "_segment_" +
        segmentName +
        '" src="' +
        clockFullPath +
        clock.clockPath +
        '">';
    }
  }

  const clockObject = document.createElement("div");

  clockObject.innerHTML =
    innerClock +
    '<img style="clip-path: inset(' +
    clipSeg(clock.dot) +
    ");" +
    clock.imgStyle +
    '" class="dot" src="' +
    clockFullPath +
    clock.clockPath +
    '">';

  app.append(clockObject);

  setTimeout(() => {
    const appChildren = Array.from(app.children);
    if (appChildren[appChildren.length - 1] !== clockObject) return;
    for (const child of appChildren) {
      if (child !== clockObject) app.removeChild(child);
    }
  }, typeTransition);

  clockDisplayed = clock;
}
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function changeObjectsVisibility(className, visible) {
  for (object of document.getElementsByClassName(className)) {
    object.style.display = visible ? "block" : "none";
  }
}

function changeDisplay(displayIndex, segments) {
  for (const segment of segmentNames) {
    changeObjectsVisibility(
      "display_" + displayIndex + "_segment_" + segment,
      segments.includes(segment),
    );
  }
}

let clockTypes = defaultClock;
let clockDisplayed;
let lastMinutes;

function updateClock(force) {
  // ✅ smooth running local time
  const now = new Date();

  // convert to target timezone properly
  const date = new Date(
    now.toLocaleString("en-US", { timeZone: cityTimeZone }),
  );

  const minutes = date.getMinutes();
  const hours = date.getHours();

  if (force) changeClock();

  if (lastMinutes != minutes) {
    lastMinutes = minutes;
    setTimeout(() => {
      changeClock();
    }, clockChangeDelayAfterSound);
    clockChangeAudio.play();
  }

  function changeClock() {
    if (selectedClock == "Cycle") {
      let closestHour = 0;
      let closestClock;

      for (const type of clockTypes) {
        if (type.startingHour > closestHour) {
          closestClock = type;
          closestHour = type.startingHour;
        }
      }

      closestHour = 0;

      for (const type of clockTypes) {
        if (type.startingHour <= hours && type.startingHour > closestHour) {
          closestClock = type;
          closestHour = type.startingHour;
        }
      }

      if (clockDisplayed != closestClock || force) {
        setupClock(closestClock);
        clockDisplayed = closestClock;
      }
    }

    let hoursCorrected = ampm ? hours % 12 || 12 : hours;

    changeDisplay(0, displayChars[minutes % 10]);
    changeDisplay(1, displayChars[(minutes / 10) >> 0]);
    changeDisplay(2, displayChars[hoursCorrected % 10]);
    changeDisplay(3, displayChars[(hoursCorrected / 10) >> 0]);
  }
}

let enableWeather = true;
// let api = "2b9b2d6819b968ff5143e6d3d6aa3446";
let enableWeatherLog = true;
let requests = 0;
let mode = "auto"; // "auto" or "manual"
let manualCity = "";
let manualModeActive = false;
let pressTimer = null;
const REFRESH_INTERVAL = 1 * 60 * 1000; // 1 minute

setInterval(() => {
  if (mode === "auto") {
    updateWeatherAuto();
  } else {
    fetchWeatherByCity(manualCity);
  }
}, REFRESH_INTERVAL);

function updateWeatherAuto(retry = 0) {
  if (mode !== "auto") return; // ✅ ADD THIS (CRITICAL)

  console.log("AUTO TRIGGERED");

  weatherData.innerHTML = "<span style='color:#0ff'>AUTO DETECTING...</span>";

  fetch("https://ipwho.is/")
    .then((res) => res.json())
    .then((data) => {
      if (mode !== "auto") return; // ✅ ADD THIS

      if (!data || !data.success || !data.latitude) {
        throw new Error("ipwho failed");
        weatherData.innerHTML =
          "<span style='color:#f66'>IP FAILED → USING DEFAULT</span>";
      }

      handleAutoLocation(data.latitude, data.longitude, data.city);
    })
    .catch(() => {
      if (mode !== "auto") return; // ✅ ADD HERE

      console.log("ipwho failed → trying backup");

      // 🔥 BACKUP API
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((data) => {
          if (mode !== "auto") return; // ✅ ADD THIS

          if (!data || !data.latitude) {
            throw new Error("backup failed");
            weatherData.innerHTML =
              "<span style='color:#f66'>IP FAILED → USING DEFAULT</span>";
          }

          handleAutoLocation(data.latitude, data.longitude, data.city);
        })
        .catch((err) => {
          if (mode !== "auto") return;

          console.log("AUTO ERROR:", err);

          weatherData.innerHTML =
            "<span style='color:#f66'>AUTO FAILED → USING DEFAULT</span>";

          // 🕒 Get time (prefer city time if available)
          const now = cityLocalTime ? new Date(cityLocalTime) : new Date();
          const hour = now.getHours();
          const day = now.getDay(); // 0 = Sunday, 6 = Saturday

          const isWeekend = day === 0 || day === 6;

          // 📅 Weekend → Faridabad always
          if (isWeekend) {
            window.autoDetectedCity = "FBD";
            fetchWeather(28.4333, 77.3167);
            return;
          }

          // 📆 Weekday logic
          if (hour < 9) {
            // 🌅 Before 9 AM → Faridabad
            window.autoDetectedCity = "FBD";
            fetchWeather(28.4333, 77.3167);
          } else {
            // ☀️ After 9 AM → Noida
            window.autoDetectedCity = "NOI";
            fetchWeather(28.57, 77.32);
          }
        });
    });
}

function handleAutoLocation(lat, lon, cityName) {
  if (mode !== "auto") return; // ✅ ADD THIS (CRITICAL)

  console.log("AUTO LOCATION:", cityName);

  currentIndex = 0;

  const city = cityName?.toLowerCase() || "";

  // 🔥 NCR SMART FIX
  if (city.includes("faridabad")) {
    window.autoDetectedCity = "FBD";
    return fetchWeather(28.4089, 77.3178);
  }

  if (city.includes("noida")) {
    window.autoDetectedCity = "NOI";
    return fetchWeather(28.5355, 77.391);
  }

  if (city.includes("delhi")) {
    window.autoDetectedCity = "DEL";
    return fetchWeather(28.6139, 77.209);
  }

  if (city.includes("gurgaon") || city.includes("gurugram")) {
    window.autoDetectedCity = "GGN";
    return fetchWeather(28.4595, 77.0266);
  }
  if (city.includes("ghaziabad")) {
    window.autoDetectedCity = "GZB";
    return fetchWeather(lat, lon); // use real lat/lon
  }

  // fallback to distance
  let closestCity = cityCenters[0];
  let minDistance = Infinity;

  for (const city of cityCenters) {
    const dist = getDistance(lat, lon, city.lat, city.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = city;
    }
  }

  window.autoDetectedCity = closestCity.name;
  fetchWeather(closestCity.lat, closestCity.lon);
}

function fetchIPLocation() {
  fetch("https://ipapi.co/json/")
    .then((res) => res.json())
    .then((data) => {
      fetchWeather(data.latitude, data.longitude);
    })
    .catch(() => {
      fetchWeather(28.4089, 77.3178); // fallback
    });
}

function useIPLocation() {
  fetch("https://ipapi.co/json/")
    .then((res) => res.json())
    .then((data) => {
      fetchWeather(data.latitude, data.longitude);
    });
}
const locationSelector = document.createElement("div");
locationSelector.id = "locationSelector";
locationSelector.style.position = "fixed";
locationSelector.style.bottom = "120px";
locationSelector.style.left = "50%";
locationSelector.style.transform = "translateX(-50%)";

locationSelector.style.display = "none";
locationSelector.style.flexDirection = "row";
locationSelector.style.flexWrap = "wrap"; // ✅ NEW
locationSelector.style.justifyContent = "center";

locationSelector.style.maxWidth = "80%"; // reduce width a bit
locationSelector.style.maxHeight = "120px"; // ✅ limit height
locationSelector.style.overflowY = "auto"; // ✅ scroll if too many

locationSelector.style.padding = "12px 16px";
locationSelector.style.gap = "12px";

locationSelector.style.width = "auto";
locationSelector.style.maxWidth = "90%";

locationSelector.style.background = "rgba(0,0,0,0.45)";
locationSelector.style.backdropFilter = "blur(8px)";
locationSelector.style.borderRadius = "10px";

locationSelector.style.border = "1px solid rgba(255,255,255,0.15)";
locationSelector.style.boxShadow = "0 0 20px rgba(0,0,0,0.5)";

locationSelector.style.fontFamily = "Minecraft";
locationSelector.style.fontSize = "14px";
locationSelector.style.color = "#ccc";

locationSelector.style.zIndex = "99999";
document.body.appendChild(locationSelector);
function renderLocationSelector() {
  locationSelector.innerHTML = "";

  locations.forEach((loc, index) => {
    const btn = document.createElement("span");
    btn.style.pointerEvents = "auto";
    btn.style.cursor = "pointer";
    btn.style.padding = "4px 10px";
    btn.style.borderRadius = "6px";
    btn.style.transition = "all 0.2s ease";
    btn.style.letterSpacing = "1px";

    btn.innerText = `[${loc.name}]`;
    btn.style.cursor = "pointer";
    btn.style.margin = "0 6px";

    // highlight active
    if (index === currentIndex) {
      btn.style.color = "#00eaff";
      btn.style.textShadow = "0 0 8px #00eaff";
    }

    btn.onmouseenter = () => {
      btn.style.color = "#fff";
      btn.style.transform = "scale(1.1)";
    };

    btn.onmouseleave = () => {
      btn.style.transform = "scale(1)";
      btn.style.color = index === currentIndex ? "#00eaff" : "#ccc";
    };
    btn.onclick = (e) => {
      e.stopPropagation();

      currentIndex = index;

      if (loc.value === "auto") {
        mode = "auto";
        manualCity = "";
        updateWeatherAuto();
      } else {
        mode = "manual";
        manualCity = loc.value;

        window.autoDetectedCity = null;

        // 🔥 ADD THIS LINE (VERY IMPORTANT)
        weatherData.innerHTML = "<span style='color:#0ff'>LOADING...</span>";

        fetchWeatherByCity(loc.value);
      }

      hideLocationSelector();
    };

    locationSelector.appendChild(btn);
  });
}

function showLocationSelector() {
  renderLocationSelector();
  locationSelector.style.display = "flex";

  clearTimeout(window.selectorTimeout);
  window.selectorTimeout = setTimeout(() => {
    hideLocationSelector();
  }, 6000); // auto hide
}

function hideLocationSelector() {
  locationSelector.style.display = "none";
}

const locations = [
  { name: "AUTO", value: "auto" },

  // 🇮🇳 INDIA
  { name: "NOIDA", value: "noida,IN" },
  { name: "DELHI", value: "new delhi,IN" },
  { name: "MUMBAI", value: "mumbai,IN" },
  { name: "BANGALORE", value: "bengaluru,IN" },
  { name: "FARIDABAD", value: "faridabad,IN" },
  { name: "GURGAON", value: "gurgaon,IN" },

  // 🇬🇧 UK
  { name: "LONDON", value: "london,GB" },
  { name: "MANCHESTER", value: "manchester,GB" },

  // 🇺🇸 USA
  { name: "NEW YORK", value: "new york,US" },
  { name: "LOS ANGELES", value: "los angeles,US" },
  { name: "CHICAGO", value: "chicago,US" },
  { name: "SAN FRANCISCO", value: "san francisco,US" },
  { name: "SEATTLE", value: "seattle,US" },

  // 🇦🇪 UAE
  { name: "DUBAI", value: "dubai,AE" },
  { name: "ABU DHABI", value: "abu dhabi,AE" },

  // 🇯🇵 JAPAN
  { name: "TOKYO", value: "tokyo,JP" },

  // 🇸🇬 SINGAPORE
  { name: "SINGAPORE", value: "singapore,SG" },

  // 🇦🇺 AUSTRALIA
  { name: "SYDNEY", value: "sydney,AU" },
  { name: "MELBOURNE", value: "melbourne,AU" },

  // 🇫🇷 / 🇩🇪 / 🇮🇹 EUROPE
  { name: "PARIS", value: "paris,FR" },
  { name: "BERLIN", value: "berlin,DE" },
  { name: "ROME", value: "rome,IT" },
];
let currentIndex = 0;

function cycleLocation() {
  currentIndex = (currentIndex + 1) % locations.length;

  const selected = locations[currentIndex];

  if (selected.value === "auto") {
    mode = "auto";
    manualCity = "";
    updateWeatherAuto();
  } else {
    mode = "manual";
    manualCity = selected.value;
    fetchWeatherByCity(selected.value);
  }
}
document.addEventListener("click", (e) => {
  if (e.target.id === "modeToggle") {
    e.stopPropagation();
    if (manualModeActive) {
      cycleLocation();
    }
  }
});
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest("#locationSelector")) return;

  weatherData.style.opacity = "0.7"; // subtle feedback

  pressTimer = setTimeout(() => {
    weatherData.style.opacity = "1";
    manualModeActive = true;
    showLocationSelector();
  }, 250);
});

document.addEventListener("pointerup", () => {
  clearTimeout(pressTimer);
  weatherData.style.opacity = "1";
});

document.addEventListener("mouseup", () => {
  clearTimeout(pressTimer);
});

function resetToAutoAfterDelay() {
  setTimeout(() => {
    manualModeActive = false;
    mode = "auto";
    manualCity = "";
    currentIndex = 0;
    updateWeatherAuto();
  }, 3600000); // 1 hour
}

function fetchWeatherByCity(city) {
  if (!city) return;

  const requestMode = mode;

  const API_KEY = "c0cd0e0d8100415095a203056260305";

  console.log("MANUAL FETCH:", city);

  fetch(
    `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city}&days=1&aqi=no&alerts=no`,
  )
    .then((r) => r.json())
    .then((data) => {
      console.log("API RESPONSE:", data);

      // ❌ If API failed → STOP LOADING
      if (!data || !data.current || !data.location) {
        weatherData.innerHTML = "<span style='color:red'>INVALID CITY</span>";
        return;
      }

      // ❌ Prevent AUTO override
      if (requestMode !== "manual") return;

      const current = data.current;
      const location = data.location;

      let condition = current.condition.text.toLowerCase();
      let isRaining = current.precip_mm > 0;

      let fakeId = 800;

      if (condition.includes("thunder")) fakeId = 200;
      else if (condition.includes("snow")) fakeId = 600;
      else if (
        isRaining ||
        condition.includes("rain") ||
        condition.includes("drizzle")
      )
        fakeId = 500;
      else if (condition.includes("cloud") || condition.includes("overcast"))
        fakeId = 802;
      else if (condition.includes("fog") || condition.includes("mist"))
        fakeId = 701;
      else fakeId = 800;
      const formatted = {
        weather: [{ id: fakeId }],
        clouds: { all: current.cloud },
        main: {
          temp: current.temp_c,
          humidity: current.humidity,
        },
        uv: current.uv,
        conditionText: current.condition.text,
        wind: {
          speed: current.wind_kph / 3.6,
        },
        visibility: current.vis_km * 1000,
        name: location.name,
        sys: {
          country: location.country,
        },
        precip: current.precip_mm,
        chance_of_rain: data.forecast.forecastday[0].day.daily_chance_of_rain,
        localtime: location.localtime,
        tz_id: location.tz_id,
      };

      console.log("MANUAL WEATHER OK:", formatted.name);

      renderWeather(formatted); // ✅ THIS MUST RUN
    })
    .catch((err) => {
      console.log("FETCH ERROR:", err);
      weatherData.innerHTML = "<span style='color:red'>FETCH FAILED</span>";
    });
}
function fetchWeather(lat, lon) {
  const API_KEY = "c0cd0e0d8100415095a203056260305";
  const requestMode = mode;
  fetch(
    `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=1&aqi=no&alerts=no`,
  )
    .then((r) => r.json())
    .then((data) => {
      if (requestMode !== "auto") return;
      // 🔴 CRITICAL CHECK
      if (!data || !data.current || !data.location) {
        console.log("WEATHER API FAILED:", data);
        return;
      }

      const current = data.current;
      const location = data.location;

      let condition = current.condition.text.toLowerCase();
      let isRaining = current.precip_mm > 0;

      let fakeId = 800;

      if (condition.includes("thunder")) fakeId = 200;
      else if (condition.includes("snow")) fakeId = 600;
      else if (
        isRaining ||
        condition.includes("rain") ||
        condition.includes("drizzle")
      )
        fakeId = 500;
      else if (condition.includes("cloud") || condition.includes("overcast"))
        fakeId = 802;
      else if (condition.includes("fog") || condition.includes("mist"))
        fakeId = 701;
      else fakeId = 800;

      // 🔮 Next hour forecast
      const now = new Date();
      let nextHourIndex = now.getHours() + 1;
      if (nextHourIndex >= 24) nextHourIndex = 23;

      const nextHour = data.forecast.forecastday[0].hour[nextHourIndex];

      // ✅ ONLY use forecast if current is clear
      // if (fakeId === 800 && nextHour) {
      //   const nextCondition = nextHour.condition.text.toLowerCase();

      //   if (nextCondition.includes("rain")) fakeId = 500;
      //   else if (nextCondition.includes("snow")) fakeId = 600;
      // }

      const formatted = {
        weather: [{ id: fakeId }],
        clouds: { all: current.cloud },
        main: {
          temp: current.temp_c,
          humidity: current.humidity,
        },
        uv: current.uv,
        conditionText: current.condition.text,
        wind: {
          speed: current.wind_kph / 3.6,
        },
        visibility: current.vis_km * 1000,
        name: location.name,
        sys: {
          country: location.country,
        },
        timezone: 0,

        precip: current.precip_mm,
        chance_of_rain: data.forecast.forecastday[0].day.daily_chance_of_rain,

        localtime: location.localtime,
        tz_id: location.tz_id,
      };

      console.log("AUTO WEATHER OK:", formatted.name);

      renderWeather(formatted);
    })
    .catch((err) => {
      console.log("FETCH ERROR:", err);
    });
}

function renderWeather(resp) {
  weatherData.style.opacity = "1"; // force visible
  console.log("RENDER:", resp.name, resp.sys.country);
  requests++;
  let precipPercent = resp.chance_of_rain || 0;

  if (!precipPercent || precipPercent === 0) {
    // fallback if API gives 0 but it's cloudy
    precipPercent = Math.round(resp.clouds.all * 0.7);
  }

  // 🌧️ RAIN INTENSITY
  const rainIntensity = resp.precip;

  let rainLevel = "none";
  if (rainIntensity === 0) rainLevel = "none";
  else if (rainIntensity < 0.5) rainLevel = "drizzle";
  else if (rainIntensity < 2) rainLevel = "light";
  else if (rainIntensity < 7) rainLevel = "moderate";
  else rainLevel = "heavy";
  let rainLabel = "";

if (rainLevel === "drizzle") rainLabel = "DRIZZLE";
else if (rainLevel === "light") rainLabel = "LIGHT RAIN";
else if (rainLevel === "moderate") rainLabel = "RAIN";
else if (rainLevel === "heavy") rainLabel = "HEAVY RAIN";

  // ☁️ CLOUD %
  const cloudinessRaw = resp.clouds.all;

  // 🎯 FINAL WEATHER TYPE (SINGLE SOURCE OF TRUTH)
  if (rainIntensity > 0.5) {
    weatherType = "Rain";
  } else if (cloudinessRaw <= 25) {
    weatherType = "Clear";
  } else if (cloudinessRaw <= 60) {
    weatherType = "LightClouds";
  } else {
    weatherType = "Clouds";
  }

  // ☁️ LABEL FOR UI
  let cloudLabel = "CLEAR";
  if (cloudinessRaw > 25 && cloudinessRaw <= 60) cloudLabel = "PARTLY CLOUDY";
  if (cloudinessRaw > 60) cloudLabel = "CLOUDY";

  // ✅ 🔥 STORE TIMEZONE HERE
  cityLocalTime = new Date(resp.localtime);
  cityTimeZone = resp.tz_id;
  lastWeatherFetchTime = new Date();

  const hour = cityLocalTime.getHours();

  let timeLabel = "";
  const isDay = hour >= 6 && hour < 19;
  if (hour >= 5 && hour < 8) timeLabel = "SUNRISE";
  else if (hour >= 8 && hour < 12) timeLabel = "MORNING";
  else if (hour >= 12 && hour < 16) timeLabel = "AFTERNOON";
  else if (hour >= 16 && hour < 19) timeLabel = "EVENING";
  else if (hour >= 19 && hour < 23) timeLabel = "NIGHT";
  else timeLabel = "MIDNIGHT";

  // 🔥 RESET FIRST (VERY IMPORTANT)
  clockTypes = defaultClock;

  let matched = false;

  for (const clock of clocks) {
    if (
      clock.weather.includes(weatherType) &&
      (!clock.time || clock.time.includes(isDay ? "day" : "night"))
    ) {
      clockTypes = clock.types;
      updateClock(true);
      matched = true;
      break;
    }
  }

  if (!matched) {
    clockTypes = defaultClock;
    updateClock(true);
  }
  let weatherLabel = "CLEAR";

  if (weatherType === "Rain") weatherLabel = "RAINING";
  else if (weatherType === "Snow") weatherLabel = "SNOWING";
  else if (weatherType === "Clouds") weatherLabel = "CLOUDY";

  let cloudText = "";

  if (resp.clouds.all <= 10) cloudText = "Clear Sky";
  else if (resp.clouds.all <= 30) cloudText = "Mostly Clear";
  else if (resp.clouds.all <= 60) cloudText = "Partly Cloudy";
  else if (resp.clouds.all <= 85) cloudText = "Cloudy";
  else cloudText = "Overcast";

  const cityCode =
    mode === "auto" && window.autoDetectedCity
      ? window.autoDetectedCity
      : cityMap[resp.name] || resp.name.slice(0, 3).toUpperCase();
  const countryCode = (
    countryMap[resp.sys.country] || resp.sys.country
  ).toUpperCase();
  const windKmh = (resp.wind.speed * 3.6).toFixed(2);
  weatherData.innerHTML = `
<span style="
position:fixed;top:57px;left:20px;right:20px;
display:flex;justify-content:space-between;
font-family:Minecraft;font-size:14px;
letter-spacing:1px;text-shadow:0 0 6px #000;
z-index:9999;
">

<!-- LEFT -->
<span style="color:#ffffff;">
<span id="modeToggle" style="cursor:pointer;">
${mode === "auto" ? `[AUTO]` : ""}</span>
[${cloudLabel}${cloudLabel === "CLEAR" ? "" : " · " + cloudinessRaw + "%"}]
 ${Math.round(resp.main.temp)}°C · UV ${resp.uv} ·
WIND ${windKmh} km/h 
</span>

<!-- RIGHT -->
<span style="color:#ffffff;">
<span style="color:#00eaff;">${cityCode}, ${countryCode}</span>  ${rainIntensity > 0 ? `· ${rainLabel} · ${rainIntensity.toFixed(2)}mm` : ""}
· RAIN CHANCE ${precipPercent}% · HUM ${resp.main.humidity}% · ${timeLabel}

</span>

</span>
`;
}

let weatherVisible = true;

weatherData.style.opacity = "1";
weatherData.style.transition = "opacity 0.8s ease";

/* 🟢 CLICK TO TOGGLE (reliable in wallpaper engine) */
document.addEventListener("click", (e) => {
  if (e.target.id === "modeToggle") return; // 🔥 ignore mode clicks
  weatherVisible = !weatherVisible;
});

/* 🟢 POINTER MOVE (better than mousemove in WE) */
// document.addEventListener("pointermove", () => {
//   if (!weatherVisible) return;

//   weatherData.style.opacity = "1";

//   clearTimeout(window.hideWeatherTimeout);
//   window.hideWeatherTimeout = setTimeout(() => {
//     weatherData.style.opacity = "0";
//   }, 1200);
// });

setInterval(() => {
  if (!enableWeatherLog) return;

  weatherData.style.opacity = "1";
}, 1000);

setInterval(() => updateClock(false), timeUpdateInterval);
// setInterval(() => updateWeather(), weatherUpdateInterval);
// 🔥 FORCE instant UI (no blank state)
fetchWeather(28.5355, 77.391); // Noida fallback

// 🔥 then run AUTO (real location)
setTimeout(() => {
  if (mode === "auto") {
    updateWeatherAuto();
  }
}, 4000);

window.wallpaperPropertyListener = {
  applyUserProperties: function (properties) {
    if (properties.audioVolume) {
      backgroundAudio.volume = properties.audioVolume.value / 100;
    }

    if (properties.pistonVolume) {
      clockChangeAudio.volume = properties.pistonVolume.value / 100;
    }

    if (properties.selectedClock) {
      selectedClock = properties.selectedClock.value;
      updateWeather();
    }

    if (properties.enableAnimation) {
      enableAnimation = properties.enableAnimation.value;
      updateClock(true);
    }

    if (properties.enableWeather) {
      enableWeather = properties.enableWeather.value;
      updateWeather();
    }

    if (properties.api) {
      api = properties.api.value;
      updateWeather();
    }

    if (properties.city) {
      city = properties.city.value;
      updateWeather();
    }

    if (properties.enableWeatherLog) {
      enableWeatherLog = properties.enableWeatherLog.value;
      updateWeather();
    }

    if (properties.ampm) {
      ampm = properties.ampm.value;
      updateClock(true);
    }
  },
};
