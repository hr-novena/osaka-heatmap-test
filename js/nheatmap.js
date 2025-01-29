var heatmapData = [];

var map;
var heatmapLayer;
var croatiaFeature;
var mask;

var pins = [];
var pinData = [];
var pinsVisible = true;

var maxTemp;
var minTemp;



// GeoJSON URL for world countries
//var geojsonURL = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';
var geojsonURL = './data/custom.geo.json';

window.addEventListener('resize', adjustZoom);

document.addEventListener('DOMContentLoaded', function () {

  initializeMap(); // Initialize the map 
  adjustZoom(); // Initial call to set the zoom level based on the initial size

});

function initializeMap() {
  // Initialize the map centered on Croatia
  map = L.map('map', {
    zoomControl: false, // Disable zoom control
    scrollWheelZoom: false, // Disable scroll wheel zoom
    dragging: false, // Disable dragging
    touchZoom: false, // Disable touch zoom
    doubleClickZoom: false, // Disable double click zoom
    boxZoom: false, // Disable box zoom
    keyboard: false // Disable keyboard interactions
  }).setView([44.3, 16.3], 7); // Adjust coordinates and zoom as needed

}

function adjustZoom() {
  var mapWidth = document.getElementById('map').offsetWidth;
  var newZoom = 7;

  if (mapWidth < 600) {
    newZoom = 6;
  }
  if (mapWidth < 400) {
    newZoom = 5;
  }
  if (mapWidth < 300) {
    newZoom = 4;
  }
}

// Style for Croatia
function styleCroatia(feature) {
  return {
    fillColor: '#000000', // Black fill color
    fillOpacity: 0,
    color: '#FFFFFF',     // White border color
    weight: 2,
    opacity: 1
  };
}


// Load GeoJSON data
fetch(geojsonURL)
  .then(response => response.json())
  .then(data => {
    // Find Croatia's feature
    croatiaFeature = data.features.find(function (feature) {
      return feature.properties.name === "Croatia";
    });

    // Create a world polygon
    var worldPolygon = {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-180, -90],
          [-180, 90],
          [180, 90],
          [180, -90],
          [-180, -90]
        ]]
      }
    };

    // Create a mask by subtracting Croatia from the world polygon
    mask = turf.difference(worldPolygon, croatiaFeature);

    // Add the mask layer to the map
    L.geoJSON(mask, {
      style: {
        fillColor: '#000000', // Black mask
        fillOpacity: 0,
        color: '#000000',
        opacity: 1
      }
    }).addTo(map);

    // Add Croatia to the map
    L.geoJSON(croatiaFeature, {
      style: styleCroatia, onEachFeature: function (feature, layer) {
        if (layer._path) {
          layer._path.classList.add('blur-croatia');
        }
      }
    }).addTo(map);

    // After adding the map layers, fetch and display the heatmap
    fetchTemperatureData();
  })
  .catch(error => console.error('Error loading GeoJSON data:', error));

function fetchTemperatureData() {
  var proxyURL = 'https://api.allorigins.win/get?url=';
  var dataURL = encodeURIComponent('https://vrijeme.hr/hrvatska_n.xml');

  fetch(proxyURL + dataURL)
    .then(response => response.json())
    .then(data => {
      console.log('XML data temperature:', data.contents)
      var xmlText = data.contents;
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(xmlText, "application/xml");

      var datumTermine = xmlDoc.getElementsByTagName('DatumTermin')[0];
      var datum = datumTermine.getElementsByTagName('Datum')[0].textContent;
      var termin = datumTermine.getElementsByTagName('Termin')[0].textContent;

      // Display Datum and Termin on the UI
      document.getElementById('datumDisplay').textContent = datum;
      document.getElementById('terminDisplay').textContent = termin;

      var stations = xmlDoc.getElementsByTagName('Grad');

      heatmapData = []; // Array to store data for the heatmap

      var stations = Array.from(xmlDoc.getElementsByTagName('Grad'));

      // Sort stations by temperature before the for loop
      stations.sort((a, b) => {
        var tempA = parseFloat(a.getElementsByTagName('Temp')[0].textContent.replace(',', '.'));
        var tempB = parseFloat(b.getElementsByTagName('Temp')[0].textContent.replace(',', '.'));
        return tempA - tempB;
      });

      for (var i = 0; i < stations.length; i++) {
        var station = stations[i];

        var gradIme = station.getElementsByTagName('GradIme')[0].textContent;

        var lat = parseFloat(station.getElementsByTagName('Lat')[0].textContent);
        var lon = parseFloat(station.getElementsByTagName('Lon')[0].textContent);
        var tempText = station.getElementsByTagName('Temp')[0].textContent;
        var vlagaText = station.getElementsByTagName('Vlaga')[0].textContent;
        var tlakText = station.getElementsByTagName('Tlak')[0].textContent;
        var vjetarBrzinaText = station.getElementsByTagName('VjetarBrzina')[0].textContent;
        var temp = parseFloat(tempText.replace(',', '.')); // Replace comma with dot if necessary

        var stationData = {
          lat: lat,
          lon: lon,
          temp: temp,
          stationName: gradIme,
          vlaga: vlagaText,
          tlak: tlakText,
          vjetarBrzina: vjetarBrzinaText
        };

        createPin(stationData); // Create a pin for each station

        // Check if data is valid
        if (!isNaN(lat) && !isNaN(lon) && !isNaN(temp)) {
          console.log(gradIme + ' (' + lat + ', ' + lon + '): ' + temp);
          heatmapData.push([lat, lon, temp]);

          var stationInfo = document.createElement('p');
          stationInfo.textContent = gradIme + /* ' (' + lat + ', ' + lon + '): ' */':' + temp;
          document.getElementById('stations-info').appendChild(stationInfo);
        }
      }

      // Find the highest temperature in heatmapData
      maxTemp = Math.max(...heatmapData.map(data => data[2]));

      // Find the lowest temperature in heatmapData
      minTemp = Math.min(...heatmapData.map(data => data[2]));

      maxTemp = maxTemp + 0;

      console.log('Max temperature:', maxTemp);
      console.log('Min temperature:', minTemp);

      // Display temperatures on the page
      document.getElementById('max-temp').textContent = maxTemp;
      document.getElementById('min-temp').textContent = minTemp;

      // Create the heatmap layer
      heatmapLayer = L.idwLayer(heatmapData, {
        mask: croatiaFeature,
        opacity: 1,
        cellSize: 4,
        exp: 3,
        max: maxTemp, // Adjust max temperature based on data
        gradient: {
          0.0: 'blue',
          0.5: 'lime',
          1.0: 'red'
        }
      }).addTo(map);
    })
    .catch(error => console.error('Error fetching XML data:', error));
}

function createPin(data) {
  var pin = L.marker([data.lat, data.lon]).addTo(map);
  pin.bindTooltip(data.stationName + ': ' + data.temp + '°C', { permanent: false, direction: 'top' });
  pin.on('click', function() {
    var popupContent = `
      <div>
        <h3>${data.stationName}</h3>
        <p>Temperatura: ${data.temp}°C</p>
        <p>Vlažnost: ${data.vlaga}</p>
        <p>Tlak zraka: ${data.tlak}</p>
        <p>Vjetar brzina: ${data.vjetarBrzina}</p>
      </div>
    `;
    pin.bindPopup(popupContent).openPopup();
  });
  pins.push(pin);
  pinData.push(data);
  return pin;
}

function hideAllPins() {
  pins.forEach(function(pin) {
    map.removeLayer(pin);
  });
  pins = [];
  pinsVisible = false;
}

function showAllPins() {
  pinData.forEach(function(data) {
    createPin(data);
  });
  pinsVisible = true;
}

function togglePins() {
  if (pinsVisible) {
    hideAllPins();
  } else {
    showAllPins();
  }
}

function updateStopValue(index) {
  const stopValue = document.getElementById(`stop${index}`).value;
  document.getElementById(`stopValue${index}`).innerText = stopValue;
}

let colorCount = 1;

function addColorInput() {
  colorCount++;
  const colorInputs = document.getElementById('colorInputs');
  const newColorInput = document.createElement('div');
  newColorInput.innerHTML = `
        <label for="color${colorCount}">Color ${colorCount}:</label>
        <input type="color" id="color${colorCount}" name="color${colorCount}" value="#000000">
        <input type="range" id="stop${colorCount}" min="0" max="1" step="0.01" value="0" oninput="updateStopValue(${colorCount})">
        <span id="stopValue${colorCount}">0</span><br>
    `;
  colorInputs.appendChild(newColorInput);

}

function updateGradient() {
  const gradientStops = {};
  for (let i = 1; i <= colorCount; i++) {
    const color = document.getElementById(`color${i}`).value;
    const stop = document.getElementById(`stop${i}`).value;
    gradientStops[stop] = color;
  }
  const gradient = `linear-gradient(to right, ${Object.entries(gradientStops).map(([stop, color]) => `${color} ${stop * 100}%`).join(', ')})`;
  //document.getElementById('gradient-preview').style.background = gradient;

  if (heatmapLayer) {
    map.removeLayer(heatmapLayer); // Remove the existing heatmap layer
  }

  heatmapLayer = L.idwLayer(heatmapData, {
    mask: croatiaFeature,
    opacity: 1,
    cellSize: 4,
    exp: 3,
    max: maxTemp, // Adjust max temperature based on data
    gradient: gradientStops
  }).addTo(map);
}

function showGradientValues() {
  const gradientStops = {};
  for (let i = 1; i <= colorCount; i++) {
    const color = document.getElementById(`color${i}`).value;
    const stop = document.getElementById(`stop${i}`).value;
    gradientStops[stop] = color;
  }
  const gradientValues = JSON.stringify(gradientStops, null, 2);
  navigator.clipboard.writeText(gradientValues).then(() => {
    console.log('Gradient values copied to clipboard:', gradientValues);
  }).catch(err => {
    console.error('Failed to copy gradient values: ', err);
  });
}

function toggleStationsInfo() {
  const stationsInfo = document.getElementById('stations-info');
  if (stationsInfo.style.display === 'none') {
    stationsInfo.style.display = 'block';
  } else {
    stationsInfo.style.display = 'none';
  }
}
