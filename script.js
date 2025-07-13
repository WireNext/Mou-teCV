const fonts = [
  {
    nom: 'Rodalia València',
    url: 'https://tuusuario.github.io/cercanias-valencia/incidencias.json',
    logo: 'https://www.google.com/url?sa=i&url=https%3A%2F%2Fes.m.wikipedia.org%2Fwiki%2FArchivo%3ACercanias_Logo.svg&psig=AOvVaw3VyCtLQh_ioL_O8XJgWsec&ust=1752458839261000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCNjGx4bguI4DFQAAAAAdAAAAABAE'
  },
  {
    nom: 'Metrovalencia',
    url: 'https://raw.githubusercontent.com/WireNext/MetroValenciaIncidencias/main/avisos_metrovalencia.json',
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
