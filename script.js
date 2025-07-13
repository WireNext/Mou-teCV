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
        const lineas = (i.lineas_afectadas && i.lineas_afectadas.length > 0) ? i.lineas_afectadas.join(', ') : 'Sense línies afectades';
        return `<li><strong>Línies afectades:</strong> ${lineas}<br>${i.texto_alerta}</li>`;
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

  const estado = document.createElement('span');
  estado.className = 'estado-incidencias';
  estado.textContent = '⏳'; // estado cargando

  const detalle = document.createElement('div');
  detalle.className = 'detalle-incidencias';
  detalle.style.display = 'none'; // oculto inicialmente
  detalle.style.padding = '0.5em 1em';
  detalle.style.border = '1px solid #ccc';
  detalle.style.marginTop = '0.5em';

  menu.appendChild(imgLogo);
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
        estado.textContent = '✅'; // sin incidencias
        detalle.textContent = 'No hi ha incidències.';
      } else {
        estado.textContent = '⚠️'; // con incidencias
        detalle.innerHTML = font.formatter(data);
      }
    })
    .catch(error => {
      estado.textContent = '❓';
      detalle.textContent = 'Error carregant incidències.';
      console.error(`No s'ha pogut carregar incidències de ${font.nom}:`, error);
    });

  menu.addEventListener('click', () => {
    console.log(`Click en ${font.nom}`); // debug
    const expanded = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', !expanded);
    detalle.style.display = expanded ? 'none' : 'block';
  });
});
