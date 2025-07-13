const fonts = [
  {
    nom: 'Metrovalencia',
    url: 'https://emtvalencia.github.io/incidencies/metrovalencia.json'
  },
  {
    nom: 'TRAM d’Alacant',
    url: 'https://emtvalencia.github.io/incidencies/tram.json'
  },
  {
    nom: 'Rodalia València',
    url: 'https://emtvalencia.github.io/incidencies/renfe.json'
  }
];

const contenidor = document.getElementById('incidencies');

fonts.forEach(font => {
  const bloc = document.createElement('div');
  bloc.classList.add('font-bloc');

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
