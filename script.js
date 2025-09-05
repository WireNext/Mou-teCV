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

const fonts = [
  {
    nom: 'Rodalia València',
    url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://gtfsrt.renfe.com/alerts.pb'),
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Cercanias_Logo.svg',
    formatter: (incidencias) => {
      if (!incidencias || incidencias.length === 0) return 'No hi ha incidències.';

      // Rutas que nos interesan
      const rutas = [
        "40T0001C1","40T0002C1","40T0005C2","40T0006C2","40T0007C3","40T0008C3",
        "40T0009C4","40T0010C4","40T0011C5","40T0012C5","40T0013C6","40T0014C6",
        "40T0015C6","40T0016C6","40T0017C3","40T0018C3","40T0019C5","40T0020C5",
        "40T0021C6","40T0022C6","40T0023C2","40T0024C2","40T0025C3","40T0026C3",
        "40T0027C1","40T0028C1","40T0029C2","40T0030C2","40T0031C5","40T0032C5",
        "40T0033C3","40T0034C3","40T0035C2","40T0036C2","40T0037C2","40T0038C2",
        "41T0001C1","41T0002C1","41T0005C3","41T0006C3","41T0009C2","41T0010C2"
      ];

      // Filtrar incidencias que contengan alguna de las rutas
      const incidenciasFiltradas = incidencias.filter(i =>
        i.rutas?.some(r => rutas.includes(r))
      );

      if (incidenciasFiltradas.length === 0) return 'No hi ha incidències en les rutes seleccionades.';

      return '<ul>' + incidenciasFiltradas.map(i => {
        const rutasHTML = i.rutas.map(r => `<span class="ruta-cercanias">${r}</span>`).join(' ');

        const texto = i.descripcion
          .replace(/\n/g, '<br>')
          .replace(/–/g, '– ')
          .replace(/([.])(?=[^\s])/g, '. ');

        const fecha = i.fecha ? `<small class="fecha-aviso">${i.fecha}</small>` : '';

        return `<li>${rutasHTML}<br><p>${texto}</p>${fecha}<br><a href="${i.link}" target="_blank" rel="noopener noreferrer">Más info</a></li>`;
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
        incidencias = data || [];
    } else {
        incidencias = data;
    }
      if (!Array.isArray(incidencias) || incidencias.length === 0) {
        estado.textContent = '✅';
        detalle.innerHTML = '<p>No hi ha incidències.</p>';
      } else {
        estado.textContent = '⚠️';
        const html = font.formatter
          ? font.formatter(incidencias)
          : '<ul>' + incidencias.map(i => `<li>${i.texto_alerta}</li>`).join('') + '</ul>';
        detalle.innerHTML = html;
      }
    })
    .catch(error => {
      estado.textContent = '❓';
      detalle.innerHTML = '<p>Error carregant incidències.</p>';
      console.error(`No s'ha pogut carregar incidències de ${font.nom}:`, error);
    });

  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', !expanded);
    detalle.style.display = expanded ? 'none' : 'block';
  });
});

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
