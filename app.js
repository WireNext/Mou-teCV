// URLs dels fitxers GTFS
const GTFS_URLS = {
    calendar: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/calendar.csv',
    routes: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/routes.csv',
    shapes: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/shapes.csv',
    stop_times: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/stop_times.csv',
    trips: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/trips.csv'
};

// Variables globals d'estat
let map;
let shapesLayerGroup; // Capa per a afegir/esborrar línies dinàmicament
let validStationCodes = new Set();
let stationsMap = new Map();
let activeServices = new Set();
let routesMap = new Map();
let tripsMap = new Map();
let stopTimesByStation = new Map();

// Mapeigs de geometries (shapes)
let shapePointsMap = new Map();  // shape_id -> [{lat, lon, seq}]
let routeToShapesMap = new Map(); // route_id -> Set(shape_id)

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initNavigation();
    initModal();
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

    // Inicialitzem el grup de capes per a les línies
    shapesLayerGroup = L.layerGroup().addTo(map);
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
        // 1. Carregar CSV local d'estacions (separat per ';')
        statusBadge.textContent = 'Carregant estacions...';
        const responseLocal = await fetch('./estaciones-cercanias-valencia.csv');
        if (!responseLocal.ok) throw new Error("No s'ha trobat estaciones-cercanias-valencia.csv");
        
        const localCsvText = await responseLocal.text();
        parseLocalStations(localCsvText);
        renderStationsOnMap();

        // 2. Descarregar fitxers GTFS secundaris en PARAL·LEL
        statusBadge.textContent = 'Carregant dades GTFS...';
        const [calText, routesText, tripsText] = await Promise.all([
            fetch(GTFS_URLS.calendar).then(r => r.text()),
            fetch(GTFS_URLS.routes).then(r => r.text()),
            fetch(GTFS_URLS.trips).then(r => r.text())
        ]);

        // 3. Processar metadades lleugeres
        determineActiveServices(calText);
        parseRoutes(routesText);
        parseTrips(tripsText);

        // 4. Carregar i filtrar stop_times.csv mitjançant STREAMS
        statusBadge.textContent = 'Filtre d\'horaris en curs...';
        await parseStopTimesStream(GTFS_URLS.stop_times);

        // 5. Enmagatzemar geometries de shapes.csv en memòria (sense dibuixar encara)
        statusBadge.textContent = 'Carregant línies...';
        fetch(GTFS_URLS.shapes)
            .then(r => r.text())
            .then(shapesText => parseShapesData(shapesText))
            .catch(err => console.warn("Error en carregar shapes:", err));

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
                POBLACION: row[6] || ''
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

            // Mapegem quines shapes corresponen a quina ruta (route_id)
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
    stationsMap.forEach(st => {
        const lat = parseFloat(st.LATITUD.replace(',', '.'));
        const lon = parseFloat(st.LONGITUD.replace(',', '.'));

        if (lat && lon) {
            const marker = L.circleMarker([lat, lon], {
                radius: 6,
                fillColor: '#d97706',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(map);

            marker.on('click', () => showStationDetails(st));
        }
    });
}

// Dibuixa les línies específiques de l'estació seleccionada amb el seu color corresponent
function renderShapesForStation(stationCode) {
    shapesLayerGroup.clearLayers(); // Neteja línies anteriors

    const rawSchedules = stopTimesByStation.get(stationCode) || [];
    if (rawSchedules.length === 0) return;

    // Obtenir quines rutes (línies) passen per aquesta estació
    const stationRouteIds = new Set();
    rawSchedules.forEach(st => {
        const trip = tripsMap.get(st.tripId);
        if (trip && trip.routeId) {
            stationRouteIds.add(trip.routeId);
        }
    });

    // Per a cada línia de l'estació, pintar les seues geometries
    stationRouteIds.forEach(routeId => {
        const route = routesMap.get(routeId);
        const routeColor = route ? route.color : '#d97706';
        const shapeIds = routeToShapesMap.get(routeId);

        if (!shapeIds) return;

        shapeIds.forEach(shapeId => {
            const points = shapePointsMap.get(shapeId);
            if (!points || points.length === 0) return;

            // Ordenar els punts segons el camp sequence (seq)
            points.sort((a, b) => a.seq - b.seq);
            const latLngs = points.map(p => [p.lat, p.lon]);

            // Dibuixar la polilínia amb el color de la ruta de routes.csv
            L.polyline(latLngs, {
                color: routeColor,
                weight: 4,
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

function showStationDetails(station) {
    // 1. Dibuixar només les línies d'aquesta estació
    renderShapesForStation(station.CÓDIGO);

    // 2. Obrir el modal amb la informació
    const modal = document.getElementById('station-modal');
    document.getElementById('modal-station-name').textContent = station.DESCRIPCION;
    document.getElementById('modal-station-code').textContent = `Codi: ${station.CÓDIGO} | ${station.POBLACION}`;

    const listContainer = document.getElementById('modal-schedules-list');
    listContainer.innerHTML = '';

    const rawSchedules = stopTimesByStation.get(station.CÓDIGO) || [];

    if (rawSchedules.length === 0) {
        listContainer.innerHTML = '<div class="schedule-row">No hi ha trens programats per a hui en aquesta estació.</div>';
    } else {
        const now = new Date();
        const currentHHMMSS = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

        const upcomingSchedules = rawSchedules.filter(st => st.departureTime >= currentHHMMSS);
        const displayList = upcomingSchedules.length > 0 ? upcomingSchedules : rawSchedules;

        displayList.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

        displayList.slice(0, 15).forEach(st => {
            const trip = tripsMap.get(st.tripId);
            const route = trip ? routesMap.get(trip.routeId) : null;

            const routeName = route ? route.shortName : 'Rodalia';
            const routeColor = route ? route.color : '#d97706';
            const routeTextColor = route ? route.textColor : '#ffffff';
            const destination = getDestinationInfo(trip, route);

            const row = document.createElement('div');
            row.className = 'schedule-row';
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; max-width: 75%;">
                    <span style="background-color: ${routeColor}; color: ${routeTextColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; flex-shrink: 0;">
                        ${routeName}
                    </span>
                    <span style="font-size: 0.85rem; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ➔ ${destination}
                    </span>
                </div>
                <span class="schedule-time">${st.departureTime.substring(0, 5)} h</span>
            `;
            listContainer.appendChild(row);
        });
    }

    modal.classList.add('active');
}