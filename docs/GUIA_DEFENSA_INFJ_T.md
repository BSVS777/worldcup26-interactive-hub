# Guia de defensa INFJ-T

## Frase ancla

Detecto -> preservo -> informo -> recupero -> verifico.

## Historia del sistema

Accion -> estado -> autenticacion -> request segura -> respuesta o fallo -> cache -> DOM seguro -> anuncio accesible -> evidencia.

## Respuestas base

### Por que el JWT no esta en localStorage

15 segundos: Porque un XSS podria leerlo. Lo mantengo solo en memoria y al recargar se pide login otra vez.

30 segundos: El token entra por autenticacion, se guarda en `createSessionStore` solo como variable de cierre y se borra con 401 o expiracion local. Tambien limpio cualquier clave legada.

Tecnica: `js/session.js:createSessionStore`, pruebas en `test/session.test.mjs`.

### Como evito XSS

15 segundos: No convierto datos externos en HTML.

30 segundos: La API, cache y query string son no confiables. Las vistas crean nodos con `createElement` y escriben texto con `textContent`.

Tecnica: busqueda de sinks prohibidos y render seguro en vistas.

### Que pasa si games falla en Tour

15 segundos: Las sedes siguen funcionando y solo el panel local muestra error de partidos.

30 segundos: `stadiums` y `games` se cargan por separado. Si `games` falla, se renderizan sedes y cada detalle informa que sus partidos no estan disponibles.

Tecnica: `js/tour-view.js:load`, `js/tour.js:crossReferenceVenues`, `test/tour.test.mjs`.

### Que pasa si no hay red en Agenda

15 segundos: No queda en blanco; conserva skeletons y controles deshabilitados.

30 segundos: Si `games` falla, la agenda no inventa datos. Mantiene el layout con skeletons accesiblemente ocultos.

Tecnica: `js/agenda-view.js:renderColumns`, `test/agenda.test.mjs`.

### Como evita duplicados Timeline

15 segundos: Cargo games una vez, normalizo por ID y muestro bloques locales.

30 segundos: El reducer ordena cronologicamente, descarta IDs repetidos y aumenta `visibleCount` de 10 en 10. El boton fallback no vuelve a pedir red.

Tecnica: `js/timeline.js:uniqueSortedGames`, `reduceTimelineState`, `test/timeline.test.mjs`.

### Que pasa si falla Timeline

15 segundos: No deja el observer esperando; muestra error persistente y boton de retry.

30 segundos: El fallo inicial pasa a estado `error`, oculta centinela y boton de cargar mas, y el retry usa `forceRetry` con la politica central de backoff.

Tecnica: `js/timeline-view.js:load`, `retry`, `test/timeline.test.mjs`.

### Como defiende el 401

15 segundos: El 401 borra el token, abre un modal de sesion expirada y permite volver a iniciar sesion sin recargar.

30 segundos: El cliente central limpia solo el token afectado. El shell cambia a estado `expired`, aplica `role="dialog"`, `aria-modal`, fondo inerte y trap de Tab; al login exitoso conserva la ruta y recarga el modulo activo.

Tecnica: `js/api.js`, `js/session.js`, `js/router.js`, `js/ui.js`, `test/api.test.mjs`, `test/static-contract.test.mjs`.

## Preguntas que faltan dominar

- Timeline con retry manual y observer.
- Dashboard con snapshot stale.
- Matriz con actualizacion parcial de celdas.

