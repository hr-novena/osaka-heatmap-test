var map;

var heatmapData = [];

document.addEventListener('DOMContentLoaded', function () {

  initializeMap(); // Initialize the map 
  addHeatmapLayer();
  //addSvgOverlay(); // Add SVG overlay
  //addImageOverlay(); // Add image overlay
  addMapClickListener(); // Add map click listener
});

function initializeMap() {
  // Initialize the map centered on Croatia
  map = L.map('map', {
    zoomDelta: 0.05,
    zoomSnap: 0,
    zoomControl: false, // Disable zoom control
    scrollWheelZoom: false, // Disable scroll wheel zoom
    dragging: true, // Disable dragging
    touchZoom: false, // Disable touch zoom
    doubleClickZoom: false, // Disable double click zoom
    boxZoom: false, // Disable box zoom
    keyboard: false // Disable keyboard interactions
  }).setView([0, 0], 8.8); // Adjust coordinates and zoom as needed
}

function addHeatmapLayer() 
{
  heatmapData = [];

  heatmapData.push([0.5410686180426414, 0.31860351562500006, 30]); //1
  heatmapData.push([0.4586743000357384, -0.21148681640625003, 10]); //2
  heatmapData.push([0.4614207935306211, -1.4419555664062502, 0]); //3
  heatmapData.push([-0.42571629769278674, -1.5161132812500002, 30]); //4
  heatmapData.push([-0.5685331504706715, -0.11810302734375001, 0]); //5

  heatmapLayer = L.idwLayer(heatmapData, {
    opacity: 1,
    cellSize: 5,
    exp: 3,
    max: 30, // Adjust max temperature based on data
    gradient: {
      0.0: 'blue',
      0.5: 'lime',
      1.0: 'red'
    }
  }).addTo(map);

}

function addSvgOverlay() {
  fetch('./assets/paviljon.svg')
    .then(response => response.text())
    .then(svgContent => {
      var parser = new DOMParser();
      var svgElement = parser.parseFromString(svgContent, "image/svg+xml").documentElement;

      var bounds = [[-1.0, -1.0], [1.0, 1.0]]; // Adjust bounds as needed
      L.svgOverlay(svgElement, bounds).addTo(map);
    })
    .catch(error => console.error('Error fetching SVG:', error));
}

function addImageOverlay() {
  var imageUrl = './assets/Subtract-4.png'; // Adjust image URL as needed
  var bounds = [[-0.88, -1.5], [0.88, 1.5]]; // Adjust bounds as needed
  var imageOverlay = L.imageOverlay(imageUrl, bounds).addTo(map);
  imageOverlay.bringToFront(); 
}


function addMapClickListener() {
  map.on('click', function(e) {
    console.log("Coordinates: " + e.latlng.lat + ", " + e.latlng.lng);
  });
}
