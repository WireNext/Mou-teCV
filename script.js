const fonts = [
  {
    nom: 'Rodalia València',
    url: 'https://tuusuario.github.io/cercanias-valencia/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Rodalies_de_Catalunya_logo.svg'
  },
  {
    nom: 'Metrovalencia',
    url: 'https://tuusuario.github.io/metrovalencia/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Metrovalencia_logo.svg'
  },
  {
    nom: 'TRAM d’Alacant',
    url: 'https://tuusuario.github.io/tram-alacant/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Logo_TRAM_Alicante.svg'
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

  const estado = document.createElement('span');
  estado.className = 'estado-incidencias';
  estado.textContent = '⏳'; // estado cargando

  menu.appendChild(imgLogo);
  menu.appendChild(estado);

  bloqueFuente.appendChild(menu);
  contenedor.appendChild(bloqueFuente);

  fetch(font.url)
    .then(res => {
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        estado.textContent = '✅'; // sin incidencias
      } else {
        estado.textContent = '⚠️'; // con incidencias
      }
    })
    .catch(error => {
      estado.textContent = '⚠️';
      console.error(`No s'ha pogut carregar incidències de ${font.nom}:`, error);
    });
});
