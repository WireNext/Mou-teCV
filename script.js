const colorsLineasMetroValencia = {
  "1": "#e3ad42", "2": "#d1438c", "3": "#c42438", "4": "#054f8b", "5": "#008c61",
  "6": "#8466a9", "7": "#db8a35", "8": "#2db4ca", "9": "#a37750", "10": "#bad284"
};
const coloresLineasTramAlacant = {
  "1": "#f03635", "2": "#00953a", "3": "#fec100", "4": "#c29cc1", "5": "#004f8e"
};
const coloresLineasCercanias = {
  "C1": "#4991c3", "C2": "#ffb010", "C3": "#97198b", "C4": "#fe191b", "C5": "#008925", "C6": "#023286"
};

// Rutas específicas del núcleo de Valencia para filtrado de GTFS-RT
const valenciaRouteIds = [
  "40T0001C1", "40T0002C1", "40T0005C2", "40T0006C2", "40T0007C3", 
  "40T0008C3", "40T0009C4", "40T0010C4", "40T0011C5", "40T0012C5", 
  "40T0013C6", "40T0014C6", "40T0015C6", "40T0016C6", "40T0017C3", 
  "40T0018C3", "40T0019C5", "40T0020C5", "40T0021C6", "40T0022C6", 
  "40T0023C2", "40T0024C2", "40T0025C3", "40T0026C3", "40T0027C1", 
  "40T0028C1", "40T0029C2", "40T0030C2", "40T0031C5", "40T0032C5", 
  "40T0033C3"
];

// Función auxiliar para obtener el timestamp UNIX en formato legible
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  // Formato simple: DD/MM HH:MM
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// NUEVA FUNCIÓN: Genera el HTML del logo del servicio.
function createServiceLogo(nom) {
    let logoUrl = '';
    let altText = nom;
    if (nom === 'Rodalia València') {
        logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/2/25/Cercanias_Logo.svg';
    } else if (nom === 'Metrovalencia') {
        logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/d/df/Isotip_de_Metroval%C3%A8ncia.svg';
    } else if (nom === 'TRAM d’Alacant') {
        logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/f/fd/TRAM_-_Metropolitano_de_Alicante_-T-.svg';
    }
    if (logoUrl) {
        return `<img src="${logoUrl}" alt="Logo ${altText}" class="incidencia-logo-servicio" />`;
    }
    return '';
}


// FORMATTER: Ahora devuelve un array de strings <li>, o un string vacío si no hay incidencias.
const formatters = {
    'Rodalia València': (data) => {
        if (!data || !data.entity || data.entity.length === 0) return '';
        const incidenciasRodalia = [];

        data.entity.forEach(entity => {
            const alert = entity.alert;
            if (!alert || !alert.informedEntity || !alert.descriptionText) return;

            const affectedRoutes = alert.informedEntity
                .map(e => e.routeId)
                .filter(id => id && valenciaRouteIds.includes(id));

            if (affectedRoutes.length > 0) {
                incidenciasRodalia.push({
                    description: alert.descriptionText.translation[0]?.text || 'Avís sense descripció.',
                    routes: affectedRoutes,
                    start: alert.activePeriod?.[0]?.start,
                    end: alert.activePeriod?.[0]?.end 
                });
            }
        });

        if (incidenciasRodalia.length === 0) return '';
        const serviceLogo = createServiceLogo('Rodalia València'); // Obtener el logo

        return incidenciasRodalia.map(incidencia => {
            const lineasAfectadas = [...new Set(incidencia.routes.map(r => r.slice(-2)))].sort();

            const tagsHTML = lineasAfectadas.map(linea => {
                const color = coloresLineasCercanias[linea] || '#999';
                // *** LÍNEA CORREGIDA A CONTINUACIÓN ***
                return `<span class="linea-cercanias" style="background-color: ${color}">C${linea.replace('C', '')}</span>`; // C1, C2, etc.
                // ***************************************
            }).join(' ');
            
            // Unir logo y tags de línea
            const tagsAndLogo = `${serviceLogo}${tagsHTML}`;

            const texto = incidencia.description
                .replace(/\n/g, '<br>')
                .replace(/–/g, '– ')
                .replace(/([.])(?=[^\s])/g, '. ');

            const inicio = incidencia.start ? `Inici: ${formatTimestamp(incidencia.start)}` : '';
            const fin = incidencia.end ? ` | Fi estimada: ${formatTimestamp(incidencia.end)}` : '';
            const fecha = inicio || fin ? `<small class="fecha-aviso">${inicio}${fin}</small>` : '';
            
            return `<li>${tagsAndLogo}<p>${texto}</p>${fecha}</li>`; // Insertar tagsAndLogo
        });
    },

    'Metrovalencia': (incidencias) => {
        if (!incidencias || incidencias.length === 0) return '';
        const serviceLogo = createServiceLogo('Metrovalencia'); // Obtener el logo

        return incidencias.map(i => {
            const lineas = (i.lineas_afectadas && i.lineas_afectadas.length > 0)
                ? i.lineas_afectadas.map(linea => {
                    const num = linea.match(/\d+/)?.[0];
                    const color = colorsLineasMetroValencia[num] || '#6c757d';
                    return `<span class="linea-metro" style="background-color: ${color}">L${num}</span>`;
                }).join(' ')
                : ''; 
            
            // Unir logo y tags de línea
            const tagsAndLogo = `${serviceLogo}${lineas}`;

            const texto = i.texto_alerta
                .replace(/\n/g, '<br>')
                .replace(/–/g, '– ')
                .replace(/([.])(?=[^\s])/g, '. ');
            return `<li>${tagsAndLogo}<p>${texto}</p></li>`; // Insertar tagsAndLogo
        });
    },

    'TRAM d’Alacant': (incidencias) => {
        if (!incidencias || incidencias.length === 0) return '';
        const serviceLogo = createServiceLogo('TRAM d’Alacant'); // Obtener el logo

        return incidencias.map(i => {
            const lineas = (i.lineas_afectadas && i.lineas_afectadas.length > 0)
                ? i.lineas_afectadas.map(linea => {
                    const num = linea.match(/\d+/)?.[0];
                    const color = coloresLineasTramAlacant[num] || '#6c757d';
                    return `<span class="linea-metro" style="background-color: ${color}">L${num}</span>`;
                }).join(' ')
                : '';
                
            // Unir logo y tags de línea
            const tagsAndLogo = `${serviceLogo}${lineas}`;
            
            const texto = i.texto_alerta
                .replace(/\n/g, '<br>')
                .replace(/–/g, '– ')
                .replace(/([.])(?=[^\s])/g, '. ');
            return `<li>${tagsAndLogo}<p>${texto}</p></li>`; // Insertar tagsAndLogo
        });
    }
};

const fonts = [
  {
    nom: 'Rodalia València',
    url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://gtfsrt.renfe.com/alerts.json'),
  },
  {
    nom: 'Metrovalencia',
    url: 'https://raw.githubusercontent.com/WireNext/MetroValenciaIncidencias/refs/heads/main/avisos_metrovalencia.json',
  },
  {
    nom: 'TRAM d’Alacant',
    url: 'https://raw.githubusercontent.com/WireNext/TramAlicanteIncidencias/refs/heads/main/avisos_tramalacant.json',
  }
];

const detalleIncidencias = document.getElementById('detalle-incidencias-unificadas');
const estadoIcono = document.querySelector('#bloque-incidencias-unificadas .estado-incidencias');
const menuTransport = document.querySelector('#bloque-incidencias-unificadas .menu-transport');

// Función principal para cargar y consolidar todas las incidencias
async function loadAndConsolidateIncidencies() {
    let allIncidenciasHtml = [];
    let hasError = false;

    for (const font of fonts) {
        try {
            const res = await fetch(font.url);
            if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
            const data = await res.json();
            
            const formatter = formatters[font.nom];
            if (formatter) {
                const results = formatter(data);
                if (Array.isArray(results) && results.length > 0) {
                    allIncidenciasHtml.push(...results);
                }
            }
        } catch (error) {
            console.error(`Error al cargar incidencias de ${font.nom}:`, error);
            hasError = true;
            // Añadir un mensaje de error específico
            allIncidenciasHtml.push(`<li><p>❓ No s'han pogut carregar les incidències de ${font.nom}.</p></li>`);
        }
    }

    if (allIncidenciasHtml.length > 0) {
        detalleIncidencias.innerHTML = `<ul>${allIncidenciasHtml.join('')}</ul>`;
        estadoIcono.textContent = '⚠️';
        if (hasError) {
             // Si hay incidencias Y error, el ícono es de advertencia.
             estadoIcono.textContent = '⚠️';
        }
    } else {
        detalleIncidencias.innerHTML = '<p>✅ No hi ha incidències reportades en la xarxa.</p>';
        estadoIcono.textContent = '✅';
    }
}

// Llama a la función de consolidación al cargar el script
loadAndConsolidateIncidencies();

// Lógica de desplegable (adaptada para el único bloque)
if (menuTransport) {
    menuTransport.addEventListener('click', () => {
        const expanded = menuTransport.getAttribute('aria-expanded') === 'true';
        menuTransport.setAttribute('aria-expanded', !expanded);
        detalleIncidencias.style.display = expanded ? 'none' : 'block';
    });
}


// LÓGICA DE CARGA DE IFRAME (sin cambios, excepto el contenedor)
document.querySelectorAll('.boton-mapa').forEach(button => {
    button.addEventListener('click', function() {
        const url = this.getAttribute('data-url');
        const mapaContenedor = document.getElementById('contenedor-mapa');
        
        // Desactivar el botón activo previamente
        document.querySelectorAll('.boton-mapa').forEach(btn => btn.classList.remove('activo'));
        // Activar el botón clicado
        this.classList.add('activo');
        
        // Crear y cargar el iframe
        mapaContenedor.innerHTML = `
            <iframe 
                src="${url}" 
                style="width: 100%; height: 600px; border: 0; border-radius: 8px;"
                loading="lazy"
                title="Mapa/Horarios de ${this.textContent}"
            ></iframe>
        `;
    });
});
// FIN LÓGICA IFRAME

// Tema toggle (sin cambios)

const btnTema = document.getElementById('btn-tema');

function aplicarTema(tema) {
  if (tema === 'oscuro') {
    document.body.classList.add('tema-oscuro');
    document.body.classList.remove('tema-claro');
    btnTema.textContent = '☀️';
  } else {
    document.body.classList.add('tema-claro');
    document.body.classList.remove('tema-oscuro');
    btnTema.textContent = '🌙';
  }
  localStorage.setItem('temaPreferido', tema);
}

const temaGuardado = localStorage.getItem('temaPreferido');
if (temaGuardado) {
  aplicarTema(temaGuardado);
} else {
  const oscuroPref = window.matchMedia('(prefers-color-scheme: dark)').matches;
  aplicarTema(oscuroPref ? 'oscuro' : 'claro');
}

btnTema.addEventListener('click', () => {
  if (document.body.classList.contains('tema-oscuro')) {
    aplicarTema('claro');
  } else {
    aplicarTema('oscuro');
  }
});