# Guia de defensa INFJ-T

## Frase ancla

Detecto -> preservo -> informo -> recupero -> verifico.

## Flujo general del sistema

1. La persona inicia sesion desde el panel embebido.
2. `js/auth.js` llama al cliente central y `js/session.js` guarda el JWT solo en memoria.
3. La navegacion de `js/router.js` activa uno de los cinco modulos sin recargar la pagina.
4. Cada modulo pide datos por `js/api.js` usando una clave de endpoint allowlisted.
5. `js/api.js` agrega `Authorization: Bearer`, valida `response.ok`, aplica timeout, 401, 429, 500, backoff y normalizacion.
6. `js/cache.js` guarda solo datos publicos versionados por endpoint y los entrega como respaldo stale cuando corresponde.
7. Las vistas renderizan con `createElement`, `textContent`, `append` y `replaceChildren`, nunca con HTML crudo.
8. Los estados dinamicos se anuncian con `role=status` o `aria-live`, y los errores dejan una accion recuperable.
8.1. El shell conserva landmarks nativos (header, nav, main, sections y footer), sin `role=application` ni handlers inline.
9. La evidencia vive en `npm test`, busquedas de sinks, matriz, security review y accessibility audit.
10. El proyecto se mantiene sin dependencias runtime, sin CDN y sin lockfiles porque usa JavaScript/CSS vanilla y Node nativo.
11. La navegacion por teclado se demuestra con Playwright: Tab/Shift+Tab/Enter cubren skip link, login, rutas, controles y modal 401 sin recarga.

## Endpoints por modulo

| Modulo | Endpoints | Uso |
|---|---|---|
| Tour Virtual | `/get/stadiums`, `/get/games` | Lista sedes y cruza cada sede con partidos por `stadiumId`. |
| Agenda Simultanea | `/get/games`, `/get/teams` | Agrupa partidos por fecha local y resuelve nombres de equipos. |
| Timeline Infinito | `/get/games` | Ordena, deduplica y muestra partidos en bloques locales de 10. |
| Dashboard del Fanatico | `/get/teams`, `/get/games`, `/get/groups` | Calcula favorito, partidos, puntos, goles y snapshot no sensible. |
| Matriz de Enfrentamientos | `/get/groups`, `/get/teams`, `/get/games` | Construye tablas grupo por grupo y actualiza resultados de celdas. |

Todos los endpoints salen de `js/config.js:ENDPOINTS`; las vistas no construyen URLs arbitrarias.

## Campos reales cruzados

| Cruce | Campos usados | Evidencia |
|---|---|---|
| Sede -> partidos | `stadium.id` con `game.stadiumId` | `js/tour.js:crossReferenceVenues`, `test/tour.test.mjs` |
| Partido -> equipos | `game.homeTeamId`, `game.awayTeamId` con `team.id` | `js/agenda.js:crossReferenceGame`, `test/agenda.test.mjs` |
| Favorito -> grupo | `team.id`, `team.groupId`, standings normalizados de `groups` | `js/fan-dashboard.js:findStanding`, `test/fan-dashboard.test.mjs` |
| Grupo -> matriz | standings del grupo o `team.groupId`, mas partidos indexados por par de equipos | `js/matrix.js`, `test/matrix.test.mjs` |
| Resultado jugado | flag normalizado de partido finalizado y goles normalizados | `js/matrix.js:scoreForTeam`, `test/normalizers.test.mjs` |

Si un campo no existe o no pasa normalizacion, el modulo usa estado recuperable o cache valida; no inventa datos de produccion.

## Retos casi literales y respuesta corta

| Reto | Respuesta defendible |
|---|---|
| Que pasa si falla `games` en Tour | Las sedes siguen clicables porque `stadiums` y `games` se cargan por separado; el detalle muestra error local de partidos. |
| Que pasa si Agenda no tiene red ni cache | La agenda conserva skeletons, controles deshabilitados y no inventa fechas ni equipos. |
| Que pasa si Timeline falla al inicio | Oculta centinela, muestra estado de error persistente y deja boton de reintento manual. |
| Que pasa con 401 | Borra solo el token afectado, abre modal accesible de sesion expirada y reautentica sin `location.reload()`. |
| Que pasa con 429 | El cliente central reintenta con 1 s, 2 s y 4 s, maximo cuatro intentos, y Timeline anuncia countdown visible. |
| Que pasa con 500 | Reintenta igual que 429; si agota intentos y hay cache valida por endpoint, muestra datos stale con aviso. |
| Que pasa con JWT expirado y observer activo | La expiracion resetea vistas; Timeline limpia countdown y desconecta `IntersectionObserver` antes de recuperar sesion. |
| Que pasa con clics repetidos | Reducers idempotentes y render con `replaceChildren` evitan duplicados; el mismo venue/favorito no crea contenido duplicado. |
| Que pasa con cache corrupta | `js/cache.js` valida version, endpoint, fecha y shape; si falla, elimina solo esa entrada y reporta miss. |
| Que pasa si la matriz recibe nuevos resultados | Si la estructura del grupo sigue igual, conserva referencias internas y actualiza solo celdas afectadas. |

## Respuestas de defensa

### Por que el JWT no esta en localStorage

15 segundos: Porque un XSS podria leerlo. Lo mantengo solo en memoria y al recargar se pide login otra vez.

30 segundos: El token entra por autenticacion, se guarda en `createSessionStore` solo como variable de cierre y se borra con 401 o expiracion local. Tambien limpio cualquier clave legada.

Tecnica: `js/session.js:createSessionStore`, `test/session.test.mjs`, `docs/ACCESIBILIDAD_SEGURIDAD_SPEC.md:SEC-HARD-010`.

### Como evito XSS

15 segundos: No convierto datos externos en HTML.

30 segundos: La API, cache y query string son no confiables. Las vistas crean nodos con `createElement`, escriben texto con `textContent` y reemplazan regiones completas con `replaceChildren`.

Tecnica: busqueda de sinks prohibidos, `test/static-contract.test.mjs`, `test/matrix.test.mjs` con payload malicioso.

### Como defiendo el 401

15 segundos: El 401 borra el token, abre un modal de sesion expirada y permite volver a iniciar sesion sin recargar.

30 segundos: El cliente central limpia solo el token afectado. El shell cambia a estado `expired`, aplica `role=dialog`, `aria-modal`, fondo inerte y trap de Tab; al login exitoso conserva la ruta y recarga el modulo activo.

Tecnica: `js/api.js`, `js/session.js`, `js/router.js`, `js/ui.js`, `test/api.test.mjs`, `test/static-contract.test.mjs`.

### Como defiendo 429

15 segundos: No martillo la API; reintento con backoff controlado.

30 segundos: `apiRequest` reintenta 429 con 1 s, 2 s y 4 s, respeta un `Retry-After` mayor y corta en cuatro intentos totales. Timeline expone el countdown en una region live.

Tecnica: `test/api.test.mjs`, `test/timeline.test.mjs`, `docs/SECURITY_REVIEW.md`.

### Como defiendo 500

15 segundos: Reintento, contengo el fallo y uso cache valida si existe.

30 segundos: Los 500 pasan por la misma politica de cuatro intentos. Si no hay recuperacion, se conserva el error tipado o se entrega cache por endpoint marcada como stale, sin mezclar endpoints ni payloads corruptos.

Tecnica: `js/api.js`, `js/cache.js`, `test/api.test.mjs`, `test/cache.test.mjs`.

### Como defiendo JWT expirado con observer activo

15 segundos: Antes de pedir re-login limpio las vistas activas.

30 segundos: `onSessionExpired` llama `resetModuleViews()`. Timeline limpia countdowns, desconecta `IntersectionObserver` y aumenta su generacion para que una respuesta vieja no sobrescriba el nuevo estado.

Tecnica: `js/app.js:onSessionExpired`, `js/timeline-view.js:reset`, `test/timeline.test.mjs`, `test/static-contract.test.mjs`.

### Como defiendo clics repetidos

15 segundos: El estado es idempotente y el render reemplaza, no acumula.

30 segundos: Seleccionar la misma sede o avanzar fuera de limites no cambia el estado. Las vistas usan referencias controladas y `replaceChildren`, por lo que repetir clicks no duplica tarjetas, columnas ni listeners. En Tour, una seleccion nueva mueve foco al heading del detalle para dar contexto; una seleccion repetida no vuelve a mover foco ni scroll.

Tecnica: `test/tour.test.mjs`, `test/agenda.test.mjs`, `test/timeline.test.mjs`.

### Como defiendo cache corrupta

15 segundos: Una cache corrupta se descarta y no llega a la UI.

30 segundos: Cada entrada tiene version, endpoint, fecha ISO y datos normalizados. Si endpoint o version no coinciden, o la fecha es invalida, se elimina solo esa clave y el cliente continua con error recuperable o red.

Tecnica: `js/cache.js`, `test/cache.test.mjs`.

### Como defiendo actualizacion parcial de matriz

15 segundos: Si solo cambian resultados, actualizo celdas; no reconstruyo tablas.

30 segundos: `matrix-view` conserva un mapa interno de referencias por grupo/equipo. En refresh compara estructura y llama `updateCells`; si la estructura cambia, reconstruye de forma segura.

Tecnica: `js/matrix-view.js:refresh`, `test/matrix.test.mjs`.

## Como pruebo sin tumbar la API real

15 segundos: Uso un servidor local determinista que exige bearer y simula datos, 401, 429 y 500.

30 segundos: `testMode=1` solo funciona en origen local. El servidor de pruebas autentica, sirve fixtures sinteticos de los cuatro endpoints de datos y permite reproducir fallos controlados con reset de contadores, sin tocar la API real.

Tecnica: `tools/test-server.mjs`, `test/test-server.test.mjs`, `npm start`, `npm run test:server`.

## Preguntas que siguen pendientes de evidencia manual

- Lector de pantalla y contraste manual completo fuera del Dashboard.
- Reproducciones DevTools de Network/Console para 401, 429, 500 y offline.
- Validacion contra API viva con credenciales validas.

