const fonts = [
  {
    nom: 'Rodalia València',
    url: 'https://tuusuario.github.io/cercanias-valencia/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Cercanias_Logo.svg'
  },
  {
    nom: 'Metrovalencia',
    url: 'https://raw.githubusercontent.com/WireNext/MetroValenciaIncidencias/refs/heads/main/avisos_metrovalencia.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Isotip_de_Metroval%C3%A8ncia.svg'
  },
  {
    nom: 'TRAM d’Alacant',
    url: 'https://raw.githubusercontent.com/WireNext/TramAlicanteIncidencias/refs/heads/main/avisos_tramalacant.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/TRAM_-_Metropolitano_de_Alicante_-T-.svg'
  }
];

const contenedor = document.getElementById('contenidor-incidencies');
if (!contenedor) {
  console.error('No se encontró el contenedor con id "contenidor-incidencies".');
}

fonts.forEach(font => {
  const bloc = document.createElement('div');
  bloc.classList.add('font-bloc');

  // Añadir logo si existe
  if (font.logo) {
    const img = document.createElement('img');
    img.src = font.logo;
    img.alt = `${font.nom} logo`;
    img.style.width = '40px';
    img.style.marginBottom = '0.5rem';
    bloc.appendChild(img);
  }
  
  const titol = document.createElement('h3');
  titol.textContent = font.nom;
  bloc.appendChild(titol);

  const estat = document.createElement('span');
  estat.classList.add('estat');
  estat.textContent = '⏳';
  bloc.appendChild(estat);

  const detall = document.createElement('div');
  detall.classList.add('detall');
  detall.textContent = 'Carregant...';
  bloc.appendChild(detall);

  contenidor.appendChild(bloc);

  fetch(font.url)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        estat.textContent = '✅';
        detall.textContent = 'Sense incidències.';
        return;
      }

      estat.textContent = '⚠️';
      detall.innerHTML = '<ul>' + data.map(incidencia => {
        const text = obtenirTextIncidencia(incidencia, font);
        const linies = incidencia.lineas_afectadas && incidencia.lineas_afectadas.length > 0
          ? `<strong>Línies afectades:</strong> ${incidencia.lineas_afectadas.join(', ')}<br>`
          : '';
        return `<li>${linies}${text}</li>`;
      }).join('') + '</ul>';
    })
    .catch(error => {
      estat.textContent = '⚠️';
      detall.textContent = 'Error carregant incidències.';
      console.error(`No s'ha pogut carregar incidències de ${font.nom}:`, error);
    });
});

function obtenirTextIncidencia(incidencia, font) {
  if (font.nom === 'Metrovalencia') {
    return incidencia.texto_alerta || 'Incidència';
  } else if (font.nom === 'Rodalia València') {
    return incidencia.descripcio || incidencia.titulo || incidencia.mensaje || 'Incidència';
  } else if (font.nom === 'TRAM d’Alacant') {
    return incidencia.descripcio || incidencia.text || 'Incidència';
  }
  return JSON.stringify(incidencia);
}

const colorsLineasMetroValencia = {
  "1": "#e3ad42",
  "2": "#d1438c",
  "3": "#c42438",
  "4": "#054f8b",
  "5": "#008c61",
  "6": "#8466a9",
  "7": "#db8a35",
  "8": "#2db4ca",
  "9": "#a37750",
  "10": "#bad284"
};

const coloresLineasTramAlacant = {
  "1": "#f03635",
  "2": "#00953a",
  "3": "#fec100",
  "4": "#c29cc1",
  "5": "#004f8e"
};

const coloresLineasCercanias = {
  "C1": "#4991c3",
  "C2": "#ffb010",
  "C3": "#97198b",
  "C4": "#fe191b",
  "C5": "#008925",
  "C6": "#023286"
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

const fonts = [
  {
    nom: 'Rodalia València',
    // Nuevo endpoint GTFS Realtime
    url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://gtfsrt.renfe.com/alerts.json'),
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Cercanias_Logo.svg',
    formatter: (data) => {
      if (!data || !data.entity || data.entity.length === 0) return 'No hi ha incidències.';

      const incidenciasRodalia = [];

      // 1. Filtrar las alertas que afectan a al menos una ruta de Valencia
      data.entity.forEach(entity => {
        const alert = entity.alert;
        if (!alert || !alert.informedEntity || !alert.descriptionText) return;

        const affectedRoutes = alert.informedEntity
          .map(e => e.routeId)
          .filter(id => id && valenciaRouteIds.includes(id));

        if (affectedRoutes.length > 0) {
          incidenciasRodalia.push({
            id: entity.id,
            description: alert.descriptionText.translation[0]?.text || 'Avís sense descripció.',
            routes: affectedRoutes,
            start: alert.activePeriod?.[0]?.start,
            end: alert.activePeriod?.[0]?.end 
          });
        }
      });
      
      if (incidenciasRodalia.length === 0) return 'No hi ha incidències en Rodalies València (C1-C6).';

      // 2. Formatear la lista de incidencias
      return '<ul>' + incidenciasRodalia.map(incidencia => {
        // Extraer la C-Line (e.g., C1, C2) de los routeId afectados sin duplicados
        const lineasAfectadas = [...new Set(incidencia.routes.map(r => r.slice(-2)))].sort();

        const tagsHTML = lineasAfectadas.map(linea => {
          const color = coloresLineasCercanias[linea] || '#999';
          return `<span class="linea-cercanias" style="background-color: ${color}">${linea}</span>`;
        }).join(' ');

        const texto = incidencia.description
          .replace(/\n/g, '<br>')
          .replace(/–/g, '– ')
          .replace(/([.])(?=[^\s])/g, '. ');

        const inicio = incidencia.start ? `Inici: ${formatTimestamp(incidencia.start)}` : '';
        const fin = incidencia.end ? ` | Fi estimada: ${formatTimestamp(incidencia.end)}` : '';
        const fecha = inicio || fin ? `<small class="fecha-aviso">${inicio}${fin}</small>` : '';

        // El GTFS-RT no suele incluir enlaces directos a "más info", así que lo omitimos o lo dejamos opcional si se encuentra una URL.
        return `<li>${tagsHTML}<br><p>${texto}</p>${fecha}</li>`;
      }).join('') + '</ul>';
    }
  },
  {
    nom: 'Metrovalencia',
    url: 'https://raw.githubusercontent.com/WireNext/MetroValenciaIncidencias/refs/heads/main/avisos_metrovalencia.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Isotip_de_Metroval%C3%A8ncia.svg',
    formatter: (incidencias) => {
      if (!incidencias || incidencias.length === 0) return 'No hi ha incidències.';
      return '<ul>' + incidencias.map(i => {
        const lineas = (i.lineas_afectadas && i.lineas_afectadas.length > 0)
          ? i.lineas_afectadas.map(linea => {
              const num = linea.match(/\d+/)?.[0];
              const color = colorsLineasMetroValencia[num] || getComputedStyle(document.body).getPropertyValue('--linea-default').trim();
              return `<span class="linea-metro" style="background-color: ${color}">${num}</span>`;
            }).join(' ')
          : 'Sense línies afectades';
        const texto = i.texto_alerta
          .replace(/\n/g, '<br>')
          .replace(/–/g, '– ')
          .replace(/([.])(?=[^\s])/g, '. ');
        return `<li>${lineas}<br>${texto}</li>`;
      }).join('') + '</ul>';
    }
  },
  {
    nom: 'TRAM d’Alacant',
    url: 'https://raw.githubusercontent.com/WireNext/TramAlicanteIncidencias/refs/heads/main/avisos_tramalacant.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/TRAM_-_Metropolitano_de_Alicante_-T-.svg',
    formatter: (incidencias) => {
      if (!incidencias || incidencias.length === 0) return 'No hi ha incidències.';
      return '<ul>' + incidencias.map(i => {
        const lineas = (i.lineas_afectadas && i.lineas_afectadas.length > 0)
          ? i.lineas_afectadas.map(linea => {
              const num = linea.match(/\d+/)?.[0];
              const color = coloresLineasTramAlacant[num] || getComputedStyle(document.body).getPropertyValue('--linea-default').trim();
              return `<span class="linea-metro" style="background-color: ${color}">${num}</span>`;
            }).join(' ')
          : 'Sense línies afectades';
        const texto = i.texto_alerta
          .replace(/\n/g, '<br>')
          .replace(/–/g, '– ')
          .replace(/([.])(?=[^\s])/g, '. ');
        return `<li>${lineas}<br>${texto}</li>`;
      }).join('') + '</ul>';
    }
  }
];

const contenedor = document.getElementById('contenidor-incidencies');

fonts.forEach(font => {
  const bloqueFuente = document.createElement('section');
  bloqueFuente.className = 'bloque-fuente';

  const menu = document.createElement('div');
  menu.className = 'menu-transport';
  menu.tabIndex = 0;
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('role', 'button');

  const imgLogo = document.createElement('img');
  imgLogo.src = font.logo;
  imgLogo.alt = `${font.nom} Logo`;
  imgLogo.className = 'logo-transport';

  const nombreOperador = document.createElement('div');
  nombreOperador.className = 'nombre-operador';
  nombreOperador.textContent = font.nom;

  const estado = document.createElement('span');
  estado.className = 'estado-incidencias';
  estado.textContent = '⏳';

  const detalle = document.createElement('div');
  detalle.className = 'detalle-incidencias';

  menu.appendChild(imgLogo);
  menu.appendChild(nombreOperador);
  menu.appendChild(estado);

  bloqueFuente.appendChild(menu);
  bloqueFuente.appendChild(detalle);
  contenedor.appendChild(bloqueFuente);

  fetch(font.url)
    .then(res => {
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      return res.json();
    })
    .then(data => {
      let incidencias;
      if (font.nom === 'Rodalia València') {
        // En GTFS-RT, 'data' es el objeto JSON completo, no solo un array.
        incidencias = data; 
    } else {
        incidencias = data;
    }
      
      // La lógica de validación debe ser más específica para GTFS-RT en el formatter.
      // Aquí solo comprobamos que hemos recibido algo.
      if (!incidencias) {
        estado.textContent = '✅';
        detalle.innerHTML = '<p>No hi ha dades d\'incidències disponibles.</p>';
      } else {
        const html = font.formatter(incidencias);
        // Si el HTML devuelto por el formatter contiene 'No hi ha incidències', es un ✅
        if (html.includes('No hi ha incidències')) {
            estado.textContent = '✅';
        } else {
            estado.textContent = '⚠️';
        }
        detalle.innerHTML = html;
      }
    })
    .catch(error => {
      estado.textContent = '❓';
      detalle.innerHTML = '<p>Error carregant incidències.</p>';
      console.error(`No s\'ha pogut carregar incidències de ${font.nom}:`, error);
    });

  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', !expanded);
    detalle.style.display = expanded ? 'none' : 'block';
  });
});

// LÓGICA DE CARGA DE IFRAME
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

// Tema toggle

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