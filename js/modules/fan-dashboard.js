export function createFanDashboardPlaceholder(document) {
  const section = document.createElement('section');
  section.className = 'state-card';
  section.setAttribute('aria-labelledby', 'fan-placeholder-title');

  const title = document.createElement('h3');
  title.id = 'fan-placeholder-title';
  title.textContent = 'Dashboard del fanatico';

  const copy = document.createElement('p');
  copy.textContent = 'El selector de equipo guardara solo datos publicos y mostrara snapshot stale cuando la API no este disponible.';

  const metricList = document.createElement('dl');
  metricList.className = 'metric-list';
  for (const [term, description] of [['PTS', 'Pendiente'], ['GF', 'Pendiente'], ['GA', 'Pendiente']]) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = description;
    metricList.append(dt, dd);
  }

  section.append(title, copy, metricList);
  return section;
}
