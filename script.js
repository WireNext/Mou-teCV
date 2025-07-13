const fonts = [
  {
    nom: 'Rodalia València',
    url: 'https://tuusuario.github.io/cercanias-valencia/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Rodalies_de_Catalunya_logo.svg' // pon aquí el logo adecuado
  },
  {
    nom: 'Metrovalencia',
    url: 'https://tuusuario.github.io/metrovalencia/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Metrovalencia_logo.svg'
  },
  {
    nom: 'TRAM d’Alacant',
    url: 'https://tuusuario.github.io/tram-alacant/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Logo_TRAM_Alicante.svg' // ejemplo
  }
];

const contenedor = document.getElementById('contenidor-incidencies');

fonts.forEach(font => {
  // Crear contenedor para cada fuente
  const bloqueFuente = document.createElement('section');
  bloqueFuente.className = 'bloque-fuente';

  // Crear menu desplegable header
  const menu = document.createElement('div');
  menu.className = 'menu-transport';
  menu.tabIndex = 0;
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('role', 'button');

  // Logo imagen
  const imgLogo = document.createElement('img');
  imgLogo.src = font.logo;
  imgLogo.alt = `${font.nom} Logo`;
  imgLogo.className = 'logo-transport';

  // Estado (tick o aviso)
  const estado = document.createElement('span');
  estado.className = 'estado-incidencias';
  estado.textContent = '⏳'; // cargando inicialmente

  // Añadir logo y estado al menú
  menu.appendChild(imgLogo);
  menu.appendChild(estado);

  // Texto desplegable con detalles
  const detalle = document.createElement('div');
  detalle.className = 'dropdown-text';
  detalle.style.display = 'none';

  // Añadir al bloque fuente
  bloqueFuente.appendChild(menu);
  bloqueFuente.appendChild(detalle);
  contenedor.appendChild(bloqueFuente);

  // Cargar datos
  fetch(font.url)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        estado.textContent = '✅';
        detalle.textContent = `No hi ha incidències a ${font.nom}.`;
        return;
      }

      estado.textContent = '⚠️';

      // Construir texto de incidencias
      detalle.innerHTML = data.map(inc => `
        <div class="incidencia${inc.estat === 'resolta' ? ' resuelta' : ''}">
          <strong>${inc.resum}</strong><br>
          <small>${new Date(inc.data).toLocaleString('ca-ES')}</small><br>
          <p>${inc.text}</p>
          <p><em>Font: ${font.nom}</em></p>
        </div>
      `).join('');
    })
    .catch(() => {
      estado.textContent = '⚠️';
      detalle.textContent = `No s'ha pogut carregar incidències de ${font.nom}.`;
    });

  // Evento click para toggle texto
  menu.addEventListener('click', () => {
    const isShown = detalle.style.display === 'block';
    detalle.style.display = isShown ? 'none' : 'block';
    menu.setAttribute('aria-expanded', !isShown);
  });

  // Soporte teclado (Enter o Espacio)
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      menu.click();
    }
  });
});
