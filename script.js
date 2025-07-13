const fonts = [
  {
    nom: 'Rodalia València',
    url: 'https://tuusuario.github.io/cercanias-valencia/incidencias.json'
  },
  {
    nom: 'Metrovalencia',
    url: 'https://tuusuario.github.io/metrovalencia/incidencias.json'
  },
  {
    nom: 'TRAM d’Alacant',
    url: 'https://tuusuario.github.io/tram-alacant/incidencias.json'
  }
];

const contenedor = document.getElementById('contenidor-incidencies');

fonts.forEach(font => {
  fetch(font.url)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) return;

      const titol = document.createElement('h2');
      titol.textContent = font.nom;
      contenedor.appendChild(titol);

      data.forEach(inc => {
        const div = document.createElement('div');
        div.className = 'incidencia' + (inc.estat === 'resolta' ? ' resuelta' : '');
        div.innerHTML = `
          <strong>${inc.resum}</strong><br>
          <small>${new Date(inc.data).toLocaleString('ca-ES')}</small><br>
          <p>${inc.text}</p>
          <p><em>Font: ${font.nom}</em></p>
        `;
        contenedor.appendChild(div);
      });
    })
    .catch(() => {
      console.warn(`No s'ha pogut carregar incidències de ${font.nom}`);
    });
});
