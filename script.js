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
