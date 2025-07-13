const fonts = [
  {
    nom: 'Rodalia València',
    url: 'https://tuusuario.github.io/cercanias-valencia/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Cercanias_Logo.svg'
  },
  {
    nom: 'Metrovalencia',
    url: 'https://raw.githubusercontent.com/WireNext/MetroValenciaIncidencias/refs/heads/main/avisos_metrovalencia.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Isotip_de_Metroval%C3%A8ncia.svg'
  },
  {
    nom: 'TRAM d’Alacant',
    url: 'https://tuusuario.github.io/tram-alacant/incidencias.json',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/TRAM_-_Metropolitano_de_Alicante_-T-.svg'
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
  imgLogo.alt = `${font.nom} Logo`;  // <-- Aquí backticks
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
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`); // <-- backticks aquí también
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
      console.error(`No s'ha pogut carregar incidències de ${font.nom}:`, error); // <-- backticks aquí también
    });
});
