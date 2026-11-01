// api/station.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { code, type } = req.query; // ?code=07000&type=cercanias (o emt)

    if (!code) {
        return res.status(400).json({ error: 'Falta el paràmetre code' });
    }

    try {
        // URLs de tus ficheros en GitHub (puedes usar tus propios links RAW)
        const CERCANIAS_URLS = {
            calendar: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/calendar.csv',
            routes: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/routes.csv',
            trips: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/trips.csv',
            stop_times: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/stop_times.csv',
            shapes: 'https://raw.githubusercontent.com/WireNext/cercaniasgtfs/refs/heads/main/data_csv/shapes.csv'
        };

        // Descargamos de forma ligera o leemos lo necesario
        // (Nota: para producción masiva se cachea en memoria, para empezar el fetch en servidor es ultra rápido)
        const [calRes, routesRes, tripsRes, stopTimesRes] = await Promise.all([
            fetch(CERCANIAS_URLS.calendar).then(r => r.text()),
            fetch(CERCANIAS_URLS.routes).then(r => r.text()),
            fetch(CERCANIAS_URLS.trips).then(r => r.text()),
            fetch(CERCANIAS_URLS.stop_times).then(r => r.text())
        ]);

        // 1. Calcular servicios activos hoy
        const today = new Date();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = days[today.getDay()];
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const currentDateInt = parseInt(`${yyyy}${mm}${dd}`, 10);

        const activeServices = new Set();
        const calLines = calRes.trim().split(/\r?\n/);
        const calHeaders = calLines[0].split(',').map(h => h.trim());
        const serviceIdx = calHeaders.indexOf('service_id');
        const dayIdx = calHeaders.indexOf(currentDayName);
        const startIdx = calHeaders.indexOf('start_date');
        const endIdx = calHeaders.indexOf('end_date');

        for (let i = 1; i < calLines.length; i++) {
            const row = calLines[i].split(',');
            if (row.length <= endIdx) continue;
            if (row[dayIdx].trim() === '1' && currentDateInt >= parseInt(row[startIdx], 10) && currentDateInt <= parseInt(row[endIdx], 10)) {
                activeServices.add(row[serviceIdx].trim());
            }
        }

        // 2. Parsear rutas
        const routesMap = new Map();
        const routeLines = routesRes.trim().split(/\r?\n/);
        for (let i = 1; i < routeLines.length; i++) {
            const row = routeLines[i].split(',');
            if (row.length < 2) continue;
            routesMap.set(row[0].trim(), {
                shortName: row[1] ? row[1].trim() : 'Línia',
                longName: row[2] ? row[2].trim() : '',
                color: row[4] ? `#${row[4].trim()}` : '#d97706',
                textColor: row[5] ? `#${row[5].trim()}` : '#ffffff'
            });
        }

        // 3. Parsear trips activos
        const tripsMap = new Map();
        const tripLines = tripsRes.trim().split(/\r?\n/);
        for (let i = 1; i < tripLines.length; i++) {
            const row = tripLines[i].split(',');
            if (row.length < 4) continue;
            const routeId = row[0].trim();
            const serviceId = row[1].trim();
            const tripId = row[2].trim();
            const shapeId = row[5] ? row[5].trim() : '';

            if (activeServices.has(serviceId)) {
                tripsMap.set(tripId, { routeId, headsign: row[3] ? row[3].trim() : '', shapeId });
            }
        }

        // 4. Buscar stop_times que coincidan con la estación (code) solicitada
        const schedules = [];
        const stopLines = stopTimesRes.trim().split(/\r?\n/);
        for (let i = 1; i < stopLines.length; i++) {
            const cols = stopLines[i].split(',');
            if (cols.length < 4) continue;
            const tripId = cols[0].trim();
            const stopId = cols[3].trim();

            if (stopId === code && tripsMap.has(tripId)) {
                const trip = tripsMap.get(tripId);
                const route = routesMap.get(trip.routeId);
                schedules.push({
                    tripId,
                    departureTime: cols[2].trim(),
                    routeShortName: route ? route.shortName : 'Rodalia',
                    routeColor: route ? route.color : '#d97706',
                    routeTextColor: route ? route.textColor : '#ffffff',
                    headsign: trip.headsign || route?.longName || 'Destí'
                });
            }
        }

        // Ordenar por hora de salida
        schedules.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

        return res.status(200).json({
            stationCode: code,
            schedules: schedules.slice(0, 15) // Devolvemos los próximos 15
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error processant al servidor' });
    }
}