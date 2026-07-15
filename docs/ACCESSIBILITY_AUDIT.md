# Accessibility Audit — WCAG 2.2

## Declaracion

No se declara conformidad WCAG 2.2 AA completa hasta terminar pruebas manuales con teclado, zoom, contraste y lector de pantalla.

## Entorno

- navegador: Chromium via Playwright para checks parciales.
- SO: Windows.
- lector: pendiente NVDA/Chrome o NVDA/Firefox.
- zoom: pendiente 200% y 400%.
- viewport: verificado con Playwright en testMode autenticado para 320x720, 390x844, 768x1024, 1366x768 y 1920x1080 sobre las cinco rutas; zoom con navegador/lector sigue pendiente.

## Pruebas

| ID | Prueba | Procedimiento | Resultado | Evidencia | Estado |
|---|---|---|---|---|---|
| A11Y-001 | `html lang=es` | Inspeccion HTML y Playwright | Implementado | `index.html`; Playwright reporto `HTML_LANG es` | IMPLEMENTADO |
| A11Y-002 | Landmarks semanticos | Test estatico | Verificado | `test/static-contract.test.mjs` valida `main/header/nav/footer/section`, sin `role=application` | VERIFICADO |
| A11Y-005 | Skip link | Playwright teclado | Verificado | `tools/keyboard-audit.py` enfoca `.skip-link` con Tab y activa `#main-content` con Enter | VERIFICADO |
| A11Y-010 | Foco visible | Inspeccion CSS | Implementado | `:focus-visible` | IMPLEMENTADO |
| A11Y-012 | aria-current en navegacion | Test shell | Implementado | `test/shell.test.mjs` | IMPLEMENTADO |
| A11Y-046 | Skeleton aria-hidden | Test agenda | Implementado | `test/agenda.test.mjs` | IMPLEMENTADO |
| A11Y-047 | Avisos de datos cacheados | Tests Matrix/Timeline sobre status live | Implementado parcial | `test/matrix.test.mjs`, `test/timeline.test.mjs` | IMPLEMENTADO |
| A11Y-060 | Modal 401 accesible | Inspeccion estatica y flujo 401 | Verificado por teclado; pendiente lector | `js/ui.js`; `test/static-contract.test.mjs`; `tools/keyboard-audit.py` valida role dialog, aria-modal, foco inicial y trap Tab | EN PROGRESO |
| A11Y-061 | Recuperacion de sesion corta observers activos | Tests app/Timeline | Implementado | `test/static-contract.test.mjs`, `test/timeline.test.mjs` | VERIFICADO |
| A11Y-070 | No declarar AA sin evidencia | Documento vivo | Cumplido | Esta auditoria | IMPLEMENTADO |

## Keyboard path

`tools/keyboard-audit.py` verifica con Playwright: skip link, login completo con Tab/Enter, foco tras login en `main`, activacion por Enter de las cinco rutas, controles de Tour/Agenda/Timeline/Dashboard/Matrix y trap Shift+Tab/Tab en modal 401. Queda pendiente prueba manual con lector de pantalla.

## Focus

Foco visible existe. Gestion de foco tras login existe. El 401 activa modal dedicado y mueve foco al email para reautenticacion sin recarga.

## Modal

Implementado modal dinamico de sesion expirada con `role="dialog"`, `aria-modal`, fondo inerte y trap de Tab. La expiracion resetea las vistas antes de enfocar el panel para desconectar observers activos. Pendiente validacion manual con lector de pantalla.

## Zoom y reflow

`tools/responsive-audit.py` verifico 25 combinaciones: 320x720, 390x844, 768x1024, 1366x768 y 1920x1080 sobre `tour`, `agenda`, `timeline`, `fan-dashboard` y `group-matrix`, autenticado contra testMode. Cada ruta reporto `scrollWidth == clientWidth` y sin elementos visibles fuera del viewport salvo contenedores con scroll horizontal intencional. Zoom de navegador/lector sigue pendiente.

## Contraste

Medicion numerica parcial implementada para Dashboard del Fanatico y foco: `test/accessibility-contrast.test.mjs` verifica texto principal, labels, status banner y foco contra umbrales WCAG AA. Queda pendiente auditoria manual completa de todos los modulos.

## Motion

`prefers-reduced-motion` esta implementado; preferencias manuales base estan disponibles en `js/accessibility.js`.

## Screen reader

Pendiente prueba con lector.

## Module findings

### Tour

Usa botones y `aria-pressed`; al seleccionar una sede mueve foco al heading del detalle con `tabindex="-1"` para entregar contexto sin recarga.

### Agenda

Usa botones disabled, skeleton oculto y fecha activa en `<time datetime>`.

### Timeline

Implementado con lista ordenada, boton fallback "Load 10 more matches", retry persistente, countdown de retry en status `aria-live`, aviso de datos cacheados en el mismo status, limpieza de intervalos y desconexion de IntersectionObserver en recuperacion/reset. `tools/timeline-observer-audit.py` verifica en Chromium que el sentinel es observado y que una interseccion controlada agrega el segundo bloque sin refetch. Pendiente prueba manual de screen reader.

### Dashboard

Implementado con selector nativo, status `aria-live`, metricas en `<dl>` y lista de partidos. Pendiente prueba manual con teclado y lector de pantalla.

### Matrix

Implementada con tablas nativas, caption, encabezados de columna, encabezados de fila con `scope="row"`, diagonal `aria-disabled`, estado `aria-live`, aviso de datos cacheados y contenedor horizontal acotado para movil.

## Evidencia Playwright

- App arranca en `http://127.0.0.1:4173` sin errores de consola.
- Rutas navegables: `tour`, `agenda`, `timeline`, `fan-dashboard`, `group-matrix`. Timeline fue verificado en Playwright como vista activa con placeholder oculto y retry visible en estado anonimo. Matrix fue verificada en movil 390x844 con 16 celdas, diagonal `aria-disabled`, resultado/pending y overflow contenido en el shell de tabla.
- `aria-current="page"` cambia en cada ruta.
- Sin overflow horizontal global en 320x720, 390x844, 768x1024, 1366x768 y 1920x1080 para las cinco rutas autenticadas (`RESPONSIVE_AUDIT_PASS viewports=5 routes=5 checks=25`).
- La superficie de dependencias se mantiene reducida: `test/static-contract.test.mjs` valida cero dependencias npm, sin lockfiles/node_modules y sin scripts/styles remotos.
- Modal 401 verificado en Playwright: role=dialog, aria-modal=true, foco inicial en email, fondo inerte, Tab cicla dentro del modal y sin errores de consola.
- Navegacion por teclado verificada en Playwright: `KEYBOARD_AUDIT_PASS routes=5 login=keyboard modal_trap=verified`.
- Movimiento reducido verificado en Playwright: `MOTION_AUDIT_PASS reduced_motion=emulated scroll=auto transitions<=0.01ms`; `test/static-contract.test.mjs` valida `animation-duration` e `animation-iteration-count`.
- Offline sin cache conserva estado operable: `tools/offline-audit.py` verifica mensaje recuperable y boton Retry visible en Timeline.
- Recuperacion 401 verificada bajo response HTTP real interceptada: `tools/failure-audit.py` confirma modal con `aria-modal` y foco inicial.
- Timeline IntersectionObserver verificado en Playwright: `TIMELINE_OBSERVER_AUDIT_PASS before=10 after=20 games_requests=1`, con fallback visible antes del trigger.

## Gaps pendientes

- Zoom de navegador/lector de pantalla.
- Contraste AA manual completo en todos los modulos.

