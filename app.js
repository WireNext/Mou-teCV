// URLs dels fitxers GTFS
const GTFS_URLS = {
    calendar: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/calendar.csv',
    routes: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/routes.csv',
    shapes: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/shapes.csv',
    stop_times: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/stop_times.csv',
    trips: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/trips.csv'
};

const EMT_ZIP_URL = 'https://opendata.vlci.valencia.es/dataset/ab058cf8-ad3e-4d9c-ac89-0c6367ecf351/resource/c81b69e6-c082-44dc-acc6-66fc417b4e66/download/google_transit2026-09-25.zip';

// Iconos personalizados
const cercaniasIcon = L.icon({
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Cercanias_Logo.svg',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11]
});

const busIcon = L.icon({
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Bus-logo.svg',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
});

// Estado global de capas
let map;
let shapesLayerGroup;
let cercaniasLayerGroup;
let emtLayerGroup;

// Estado global para Cercanías
let validStationCodes = new Set();
let stationsMap = new Map();
let activeServices = new Set();
let routesMap = new Map();
let tripsMap = new Map();
let stopTimesByStation = new Map();
let shapePointsMap = new Map();
let routeToShapesMap = new Map();

// Estado global para EMT Bus
let emtStopsMap = new Map();
let emtRoutesMap = new Map();
let emtTripsMap = new Map();
let emtActiveServices = new Set();
let emtStopTimes = new Map();
let emtShapePointsMap = new Map();
let emtRouteToShapesMap = new Map();

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initNavigation();
    initModal();
    initFilterControls();
    loadAllDataFast();
});

function initMap() {
    map = L.map('map', {
        renderer: L.canvas(),
        preferCanvas: true
    }).setView([39.4699, -0.3763], 9);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Grups de capes
    shapesLayerGroup = L.layerGroup().addTo(map);
    cercaniasLayerGroup = L.layerGroup().addTo(map); // Cercanías activat per defecte
    emtLayerGroup = L.layerGroup();                   // EMT desactivat per defecte
}

function initFilterControls() {
    const chkCercanias = document.getElementById('chk-cercanias');
    const chkEmt = document.getElementById('chk-emt');

    chkCercanias.addEventListener('change', (e) => {
        if (e.target.checked) {
            map.addLayer(cercaniasLayerGroup);
        } else {
            map.removeLayer(cercaniasLayerGroup);
            shapesLayerGroup.clearLayers();
        }
    });

    chkEmt.addEventListener('change', (e) => {
        if (e.target.checked) {
            map.addLayer(emtLayerGroup);
        } else {
            map.removeLayer(emtLayerGroup);
            shapesLayerGroup.clearLayers();
        }
    });
}

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            
            navButtons.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(target).classList.add('active');

            if (target === 'view-map' && map) {
                setTimeout(() => map.invalidateSize(), 100);
            }
        });
    });
}

function initModal() {
    const modal = document.getElementById('station-modal');
    const closeBtn = document.getElementById('close-modal');
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
}

async function loadAllDataFast() {
    const statusBadge = document.getElementById('data-status');

    try {
        // --- 1. Cercanías ---
        statusBadge.textContent = 'Carregant estacions de Cercanías...';
        const responseLocal = await fetch('./estaciones-cercanias-valencia.csv');
        if (!responseLocal.ok) throw new Error("No s'ha trobat estaciones-cercanias-valencia.csv");
        
        const localCsvText = await responseLocal.text();
        parseLocalStations(localCsvText);
        renderStationsOnMap();

        statusBadge.textContent = 'Carregant GTFS de Cercanías...';
        const [calText, routesText, tripsText] = await Promise.all([
            fetch(GTFS_URLS.calendar).then(r => r.text()),
            fetch(GTFS_URLS.routes).then(r => r.text()),
            fetch(GTFS_URLS.trips).then(r => r.text())
        ]);

        determineActiveServices(calText);
        parseRoutes(routesText);
        parseTrips(tripsText);

        statusBadge.textContent = 'Filtre d\'horaris Cercanías...';
        await parseStopTimesStream(GTFS_URLS.stop_times);

        fetch(GTFS_URLS.shapes)
            .then(r => r.text())
            .then(shapesText => parseShapesData(shapesText))
            .catch(err => console.warn("Error en carregar shapes:", err));

        // --- 2. EMT València ---
        statusBadge.textContent = 'Carregant autobús EMT...';
        await loadEMTData();

        statusBadge.textContent = 'Completat';
        statusBadge.style.background = '#dcfce7';
        statusBadge.style.color = '#166534';

    } catch (err) {
        console.error(err);
        statusBadge.textContent = 'Error de càrrega';
        statusBadge.style.background = '#fee2e2';
        statusBadge.style.color = '#991b1b';
    }
}

// ==========================================
// PARSERS & RENDER CERCANÍAS
// ==========================================

function parseLocalStations(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(';');
        const code = row[0] ? row[0].trim() : '';
        if (code) {
            validStationCodes.add(code);
            stationsMap.set(code, {
                CÓDIGO: code,
                DESCRIPCION: row[1] || 'Estació',
                LATITUD: row[2] || '0',
                LONGITUD: row[3] || '0',
                POBLACION: row[6] || '',
                isBus: false
            });
        }
    }
}

function determineActiveServices(csvText) {
    const today = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = days[today.getDay()];
    
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const currentDateInt = parseInt(`${yyyy}${mm}${dd}`, 10);

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return;
    
    const headers = lines[0].split(',').map(h => h.trim());
    const serviceIdx = headers.indexOf('service_id');
    const dayIdx = headers.indexOf(currentDayName);
    const startIdx = headers.indexOf('start_date');
    const endIdx = headers.indexOf('end_date');

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length <= endIdx) continue;

        const serviceId = row[serviceIdx].trim();
        const runsToday = row[dayIdx].trim() === '1';
        const startDate = parseInt(row[startIdx], 10);
        const endDate = parseInt(row[endIdx], 10);

        if (runsToday && currentDateInt >= startDate && currentDateInt <= endDate) {
            activeServices.add(serviceId);
        }
    }
}

function parseRoutes(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < 2) continue;

        const routeId = row[0].trim();
        routesMap.set(routeId, {
            shortName: row[1] ? row[1].trim() : 'Línia',
            longName: row[2] ? row[2].trim() : '',
            color: row[4] ? `#${row[4].trim()}` : '#d97706',
            textColor: row[5] ? `#${row[5].trim()}` : '#ffffff'
        });
    }
}

function parseTrips(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < 4) continue;

        const routeId = row[0].trim();
        const serviceId = row[1].trim();
        const tripId = row[2].trim();
        const shapeId = row[5] ? row[5].trim() : '';

        if (activeServices.has(serviceId)) {
            tripsMap.set(tripId, {
                routeId: routeId,
                headsign: row[3] ? row[3].trim() : '',
                shapeId: shapeId
            });

            if (shapeId) {
                if (!routeToShapesMap.has(routeId)) {
                    routeToShapesMap.set(routeId, new Set());
                }
                routeToShapesMap.get(routeId).add(shapeId);
            }
        }
    }
}

async function parseStopTimesStream(url) {
    const response = await fetch(url);
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    
    let leftover = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = leftover + decoder.decode(value, { stream: true });
        const lines = chunk.split(/\r?\n/);
        
        leftover = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            const cols = line.split(',');
            if (cols.length < 4) continue;

            const tripId = cols[0].trim();
            const stopId = cols[3].trim();

            if (validStationCodes.has(stopId) && tripsMap.has(tripId)) {
                if (!stopTimesByStation.has(stopId)) {
                    stopTimesByStation.set(stopId, []);
                }
                stopTimesByStation.get(stopId).push({
                    tripId: tripId,
                    departureTime: cols[2].trim()
                });
            }
        }
    }
}

function parseShapesData(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 4) continue;

        const shapeId = cols[0].trim();
        const lat = parseFloat(cols[1]);
        const lon = parseFloat(cols[2]);
        const seq = parseInt(cols[3], 10);

        if (!isNaN(lat) && !isNaN(lon)) {
            if (!shapePointsMap.has(shapeId)) {
                shapePointsMap.set(shapeId, []);
            }
            shapePointsMap.get(shapeId).push({ lat, lon, seq });
        }
    }
}

function renderStationsOnMap() {
    cercaniasLayerGroup.clearLayers();
    stationsMap.forEach(st => {
        const lat = parseFloat(st.LATITUD.replace(',', '.'));
        const lon = parseFloat(st.LONGITUD.replace(',', '.'));

        if (lat && lon) {
            const marker = L.marker([lat, lon], { icon: cercaniasIcon });
            marker.on('click', () => showStationDetails(st));
            cercaniasLayerGroup.addLayer(marker);
        }
    });
}

// ==========================================
// PARSERS & RENDER EMT
// ==========================================

async function loadEMTData() {
    const response = await fetch(EMT_ZIP_URL);
    if (!response.ok) throw new Error("Error en descarregar GTFS EMT");
    
    const zipBlob = await response.blob();
    const zip = await JSZip.loadAsync(zipBlob);

    const [calendarTxt, routesTxt, stopsTxt, tripsTxt, shapesTxt, stopTimesTxt] = await Promise.all([
        zip.file('calendar.txt')?.async('string') || zip.file('calendar.csv')?.async('string'),
        zip.file('routes.txt')?.async('string') || zip.file('routes.csv')?.async('string'),
        zip.file('stops.txt')?.async('string') || zip.file('stops.csv')?.async('string'),
        zip.file('trips.txt')?.async('string') || zip.file('trips.csv')?.async('string'),
        zip.file('shapes.txt')?.async('string') || zip.file('shapes.csv')?.async('string'),
        zip.file('stop_times.txt')?.async('string') || zip.file('stop_times.csv')?.async('string')
    ]);

    if (calendarTxt) parseEMTCalendar(calendarTxt);
    if (routesTxt) parseEMTRoutes(routesTxt);
    if (stopsTxt) parseEMTStops(stopsTxt);
    if (tripsTxt) parseEMTTrips(tripsTxt);
    if (shapesTxt) parseEMTShapes(shapesTxt);
    if (stopTimesTxt) parseEMTStopTimes(stopTimesTxt);

    renderEMTStopsOnMap();
}

function parseEMTCalendar(txt) {
    const today = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = days[today.getDay()];
    
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const currentDateInt = parseInt(`${yyyy}${mm}${dd}`, 10);

    const lines = txt.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const serviceIdx = headers.indexOf('service_id');
    const dayIdx = headers.indexOf(currentDayName);
    const startIdx = headers.indexOf('start_date');
    const endIdx = headers.indexOf('end_date');

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (cols.length <= endIdx) continue;

        const serviceId = cols[serviceIdx];
        const runsToday = cols[dayIdx] === '1';
        const startDate = parseInt(cols[startIdx], 10);
        const endDate = parseInt(cols[endIdx], 10);

        if (runsToday && currentDateInt >= startDate && currentDateInt <= endDate) {
            emtActiveServices.add(serviceId);
        }
    }
}

function parseEMTStops(txt) {
    const lines = txt.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const idIdx = headers.indexOf('stop_id');
    const nameIdx = headers.indexOf('stop_name');
    const latIdx = headers.indexOf('stop_lat');
    const lonIdx = headers.indexOf('stop_lon');

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (cols.length <= latIdx) continue;

        const id = cols[idIdx];
        emtStopsMap.set(id, {
            CÓDIGO: id,
            DESCRIPCION: cols[nameIdx] || 'Parada EMT',
            LATITUD: cols[latIdx],
            LONGITUD: cols[lonIdx],
            POBLACION: 'València (EMT)',
            isBus: true
        });
    }
}

function parseEMTRoutes(txt) {
    const lines = txt.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const idIdx = headers.indexOf('route_id');
    const shortIdx = headers.indexOf('route_short_name');
    const longIdx = headers.indexOf('route_long_name');
    const colorIdx = headers.indexOf('route_color');
    const textColorIdx = headers.indexOf('route_text_color');

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (cols.length <= idIdx) continue;

        const routeId = cols[idIdx];
        emtRoutesMap.set(routeId, {
            shortName: cols[shortIdx] || routeId,
            longName: cols[longIdx] || '',
            color: cols[colorIdx] ? `#${cols[colorIdx]}` : '#ef4444',
            textColor: cols[textColorIdx] ? `#${cols[textColorIdx]}` : '#ffffff'
        });
    }
}

function parseEMTTrips(txt) {
    const lines = txt.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const routeIdx = headers.indexOf('route_id');
    const serviceIdx = headers.indexOf('service_id');
    const tripIdx = headers.indexOf('trip_id');
    const headsignIdx = headers.indexOf('trip_headsign');
    const shapeIdx = headers.indexOf('shape_id');

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (cols.length <= tripIdx) continue;

        const serviceId = cols[serviceIdx];
        if (emtActiveServices.has(serviceId)) {
            const tripId = cols[tripIdx];
            const routeId = cols[routeIdx];
            const shapeId = cols[shapeIdx] || '';

            emtTripsMap.set(tripId, {
                routeId: routeId,
                headsign: cols[headsignIdx] || '',
                shapeId: shapeId
            });

            if (shapeId) {
                if (!emtRouteToShapesMap.has(routeId)) {
                    emtRouteToShapesMap.set(routeId, new Set());
                }
                emtRouteToShapesMap.get(routeId).add(shapeId);
            }
        }
    }
}

function parseEMTShapes(txt) {
    const lines = txt.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const idIdx = headers.indexOf('shape_id');
    const latIdx = headers.indexOf('shape_pt_lat');
    const lonIdx = headers.indexOf('shape_pt_lon');
    const seqIdx = headers.indexOf('shape_pt_sequence');

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (cols.length <= seqIdx) continue;

        const shapeId = cols[idIdx];
        const lat = parseFloat(cols[latIdx]);
        const lon = parseFloat(cols[lonIdx]);
        const seq = parseInt(cols[seqIdx], 10);

        if (!isNaN(lat) && !isNaN(lon)) {
            if (!emtShapePointsMap.has(shapeId)) {
                emtShapePointsMap.set(shapeId, []);
            }
            emtShapePointsMap.get(shapeId).push({ lat, lon, seq });
        }
    }
}

function parseEMTStopTimes(txt) {
    const lines = txt.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const tripIdx = headers.indexOf('trip_id');
    const depIdx = headers.indexOf('departure_time');
    const stopIdx = headers.indexOf('stop_id');

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (cols.length <= stopIdx) continue;

        const tripId = cols[tripIdx];
        const stopId = cols[stopIdx];

        if (emtStopsMap.has(stopId) && emtTripsMap.has(tripId)) {
            if (!emtStopTimes.has(stopId)) {
                emtStopTimes.set(stopId, []);
            }
            emtStopTimes.get(stopId).push({
                tripId: tripId,
                departureTime: cols[depIdx]
            });
        }
    }
}

function renderEMTStopsOnMap() {
    emtLayerGroup.clearLayers();
    emtStopsMap.forEach(st => {
        const lat = parseFloat(st.LATITUD);
        const lon = parseFloat(st.LONGITUD);

        if (!isNaN(lat) && !isNaN(lon)) {
            const marker = L.marker([lat, lon], { icon: busIcon });
            marker.on('click', () => showStationDetails(st));
            emtLayerGroup.addLayer(marker);
        }
    });
}

// ==========================================
// RENDER DIBUJO RUTA Y DETALLES MODAL
// ==========================================

function renderShapesForStation(station) {
    shapesLayerGroup.clearLayers();

    const isBus = station.isBus;
    const targetStopTimes = isBus ? emtStopTimes : stopTimesByStation;
    const targetTripsMap = isBus ? emtTripsMap : tripsMap;
    const targetRoutesMap = isBus ? emtRoutesMap : routesMap;
    const targetRouteToShapesMap = isBus ? emtRouteToShapesMap : routeToShapesMap;
    const targetShapePointsMap = isBus ? emtShapePointsMap : shapePointsMap;

    const rawSchedules = targetStopTimes.get(station.CÓDIGO) || [];
    if (rawSchedules.length === 0) return;

    const stationRouteIds = new Set();
    rawSchedules.forEach(st => {
        const trip = targetTripsMap.get(st.tripId);
        if (trip && trip.routeId) {
            stationRouteIds.add(trip.routeId);
        }
    });

    stationRouteIds.forEach(routeId => {
        const route = targetRoutesMap.get(routeId);
        const routeColor = route ? route.color : (isBus ? '#ef4444' : '#d97706');
        const shapeIds = targetRouteToShapesMap.get(routeId);

        if (!shapeIds) return;

        shapeIds.forEach(shapeId => {
            const points = targetShapePointsMap.get(shapeId);
            if (!points || points.length === 0) return;

            points.sort((a, b) => a.seq - b.seq);
            const latLngs = points.map(p => [p.lat, p.lon]);

            L.polyline(latLngs, {
                color: routeColor,
                weight: isBus ? 3 : 4,
                opacity: 0.85
            }).addTo(shapesLayerGroup);
        });
    });
}

function getDestinationInfo(trip, route) {
    if (trip && trip.headsign && trip.headsign.length > 0) {
        return trip.headsign;
    }
    if (route && route.longName && route.longName.length > 0) {
        return route.longName;
    }
    return 'Destí no especificat';
}

async function showStationDetails(station) {
    const modal = document.getElementById('station-modal');
    document.getElementById('modal-station-name').textContent = station.DESCRIPCION;
    document.getElementById('modal-station-code').textContent = `Codi: ${station.CÓDIGO} | ${station.POBLACION}`;

    const listContainer = document.getElementById('modal-schedules-list');
    listContainer.innerHTML = `<div class="loading-spinner">Carregant horaris des del servidor...</div>`;

    modal.classList.add('active');

    try {
        // Petición ultrarrápida a nuestra Serverless Function de Vercel
        const response = await fetch(`/api/station?code=${station.CÓDIGO}&type=${station.isBus ? 'emt' : 'cercanias'}`);
        if (!response.ok) throw new Error("Error en obtenir les dades");

        const data = await response.json();
        listContainer.innerHTML = '';

        if (!data.schedules || data.schedules.length === 0) {
            listContainer.innerHTML = `<div class="schedule-row">No hi ha trens programats per a hui.</div>`;
            return;
        }

        data.schedules.forEach(st => {
            const row = document.createElement('div');
            row.className = 'schedule-row';
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; max-width: 75%;">
                    <span style="background-color: ${st.routeColor}; color: ${st.routeTextColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; flex-shrink: 0;">
                        ${st.routeShortName}
                    </span>
                    <span style="font-size: 0.85rem; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ➔ ${st.headsign}
                    </span>
                </div>
                <span class="schedule-time">${st.departureTime.substring(0, 5)} h</span>
            `;
            listContainer.appendChild(row);
        });

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="schedule-row">Error al carregar els horaris.</div>`;
    }
}