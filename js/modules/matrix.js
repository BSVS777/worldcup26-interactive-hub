export function createMatrixPlaceholder(document) {
  const shell = document.createElement('div');
  shell.className = 'table-shell';

  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = 'Matriz de enfrentamientos pendiente de datos de groups, teams y games';
  table.append(caption);

  const tbody = document.createElement('tbody');
  const row = document.createElement('tr');
  const th = document.createElement('th');
  th.scope = 'row';
  th.textContent = 'Equipo';
  const td = document.createElement('td');
  td.textContent = 'Pendiente';
  td.setAttribute('aria-label', 'Partido pendiente');
  row.append(th, td);
  tbody.append(row);
  table.append(tbody);
  shell.append(table);
  return shell;
}
