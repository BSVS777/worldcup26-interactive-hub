# Accessibility Audit — WCAG 2.2

## Declaracion

No se declara conformidad WCAG 2.2 AA completa hasta terminar pruebas manuales con teclado, zoom, contraste y lector de pantalla.

## Entorno

- navegador: Chromium via Playwright para checks parciales.
- SO: Windows.
- lector: pendiente NVDA/Chrome o NVDA/Firefox.
- zoom: pendiente 200% y 400%.
- viewport: pendiente 390x844, 768x1024, 1366x768, 1920x1080.

## Pruebas

| ID | Prueba | Procedimiento | Resultado | Evidencia | Estado |
|---|---|---|---|---|---|
| A11Y-001 | `html lang=es` | Inspeccion HTML y Playwright | Implementado | `index.html`; Playwright reporto `HTML_LANG es` | IMPLEMENTADO |
| A11Y-005 | Skip link | Inspeccion HTML/CSS | Implementado | `.skip-link` | IMPLEMENTADO |
| A11Y-010 | Foco visible | Inspeccion CSS | Implementado | `:focus-visible` | IMPLEMENTADO |
| A11Y-012 | aria-current en navegacion | Test shell | Implementado | `test/shell.test.mjs` | IMPLEMENTADO |
| A11Y-046 | Skeleton aria-hidden | Test agenda | Implementado | `test/agenda.test.mjs` | IMPLEMENTADO |
| A11Y-070 | No declarar AA sin evidencia | Documento vivo | Cumplido | Esta auditoria | IMPLEMENTADO |

## Keyboard path

Pendiente prueba manual completa. La navegacion usa enlaces y botones nativos.

## Focus

Foco visible existe. Gestion de foco tras login existe. Modal 401 dedicado todavia no existe; se usa panel de sesion.

## Modal

Pendiente implementar modal de sesion expirada con trap de foco e inert.

## Zoom y reflow

Playwright verifico 1366x768 sin overflow global (`scrollWidth` 1366, `clientWidth` 1366). Pendiente 390x844, 768x1024, 1920x1080 y zoom.

## Contraste

Pendiente medicion numerica completa. Hay foco visible y paleta consistente.

## Motion

`prefers-reduced-motion` esta implementado; preferencias manuales base estan disponibles en `js/accessibility.js`.

## Screen reader

Pendiente prueba con lector.

## Module findings

### Tour

Usa botones y `aria-pressed`; pendiente foco contextual al heading.

### Agenda

Usa botones disabled y skeleton oculto; pendiente convertir fecha a `<time datetime>`.

### Timeline

Placeholder actual; pendiente modulo completo con lista y boton fallback.

### Dashboard

Placeholder actual; pendiente selector y metricas reales en `<dl>`.

### Matrix

Placeholder con tabla/caption; pendiente matriz 4x4 real y celdas con scope completo.

## Evidencia Playwright

- App arranca en `http://127.0.0.1:4173` sin errores de consola.
- Rutas navegables: `tour`, `agenda`, `timeline`, `fan-dashboard`, `group-matrix`.
- `aria-current="page"` cambia en cada ruta.
- Sin overflow horizontal global en 1366x768.

## Gaps pendientes

- Modal 401 accesible.
- Timeline, Dashboard y Matrix completos.
- Tests responsive y lector de pantalla.
- Contraste AA medido.

