export function createTimelinePlaceholder(document) {
  const section = document.createElement('section');
  section.className = 'state-card';
  section.setAttribute('aria-labelledby', 'timeline-placeholder-title');

  const title = document.createElement('h3');
  title.id = 'timeline-placeholder-title';
  title.textContent = 'Timeline infinito';

  const copy = document.createElement('p');
  copy.textContent = 'El flujo cronologico cargara partidos por bloques de 10 con IntersectionObserver y un boton de respaldo.';

  const list = document.createElement('ul');
  list.className = 'module-checklist';
  for (const item of ['Una llamada a games', 'Set de IDs contra duplicados', 'Retry manual con backoff']) {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  }

  section.append(title, copy, list);
  return section;
}
