export function requireElement(document, id, label = 'element') {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing ${label}: ${id}`);
  return element;
}
