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

const fonts = [
  {
    nom: 'Rodalia València',
    url: 'https://tuusuario.github.io/cercanias-valencia/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Cercanias_Logo.svg'
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
              const color = colorsLineasMetroValencia[num] || '#666';
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
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/TRAM_-_Metropolitano_de_Alicante_-T-.svg'
  }
];

const contenedor = document.getElementById('contenidor-incidencies');
if (!contenedor) {
  console.error('No se encontró el contenedor con id "contenidor-incidencies".');
}

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
      if (!Array.isArray(data) || data.length === 0) {
        estado.textContent = '✅';
        detalle.innerHTML = '<p>No hi ha incidències.</p>';
      } else {
        estado.textContent = '⚠️';
        const html = font.formatter
          ? font.formatter(data)
          : '<ul>' + data.map(i => `<li>${i.texto_alerta}</li>`).join('') + '</ul>';
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
