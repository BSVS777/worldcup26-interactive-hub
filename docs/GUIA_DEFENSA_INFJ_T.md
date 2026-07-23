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
12. Movimiento reducido se demuestra emulando `prefers-reduced-motion: reduce`: scroll auto y transiciones minimas en browser; animaciones minimas e iteracion unica por contrato CSS estatico.
13. Offline se demuestra en browser: con cache muestra datos stale, sin cache conserva estado recuperable con Retry sin recarga.
14. DevTools HTTP se demuestra con Playwright: 401 aparece en Console y Network, abre modal, 429 muestra countdown y 429/500 se recuperan con response 200 posterior.
15. Timeline Infinito se demuestra con Playwright: el `IntersectionObserver` observa el sentinel, agrega el segundo bloque local y no repite `/get/games`.
16. Los avisos de cache se demuestran con Playwright en los cinco modulos bloqueando `/get/*` despues de calentar cache real.
17. La navegacion movil se demuestra con Playwright: drawer por boton nativo, Escape restaura foco, seleccionar ruta cierra el panel y desktop conserva el track visible.
18. La tematizacion del fanatico se demuestra con Playwright: el favorito escribe variables CSS locales y al seleccionar otro equipo cambian sin consumir colores externos de API.
19. El fallo parcial de Tour se demuestra con Playwright: si `/get/games` falla, las sedes siguen clicables y cada seleccion muestra su error local.
20. El layout de Agenda se demuestra con Playwright: cada partido simultaneo se renderiza como columna visible y la navegacion conserva el patron.
21. El JWT en memoria se demuestra con Playwright: tras login no aparece en storage y recargar vuelve a pedir sesion.
22. La defensa contra endpoint injection se demuestra con Playwright: `apiBase` malicioso no recibe trafico y el proxy rechaza queries target.
23. La defensa anti-clickjacking local se demuestra con Playwright: CSP incluye `frame-ancestors 'none'` y `X-Frame-Options: DENY`.
24. La resiliencia de API se demuestra con Playwright: 429 y 500 recuperan con retry, y una caida de red usa cache valida en Agenda.
25. La API viva se valida con `tools/live-api-probe.mjs` contra los cuatro `GET` publicos sin credenciales; `tools/live-api-auth-probe.mjs` valida en vivo registro real (`WC26_API_REGISTER=true`) + login real + Bearer real contra `https://worldcup26.ir`, y se salta sin credenciales sin imprimir secretos.
27. La app expone tres estados de acceso explicitos y accesibles desde el panel de sesion: Modo publico (sin JWT), Sesion JWT real (registro real -> login automatico real -> `Authorization: Bearer`) y Servidor local de pruebas (mismo contrato con tokens de fixture). El registro nunca fabrica el token: `js/api.js:register()` no llama `session.setToken`, solo `js/api.js:authenticate()` lo hace.
26. El reflow 200%/400% se demuestra con Playwright: cinco rutas sin overflow global ni controles con texto cortado.

## Endpoints por modulo

| Modulo | Endpoints | Uso |
|---|---|---|
| Tour Virtual | `/get/stadiums`, `/get/games` | Lista sedes y cruza cada sede con partidos por `stadiumId`. |
| Agenda Simultanea | `/get/games`, `/get/teams` | Agrupa partidos por fecha local y resuelve nombres de equipos. |
| Timeline Infinito | `/get/games` | Ordena, deduplica y muestra partidos en bloques locales de 10. |
| Dashboard del Fanatico | `/get/teams`, `/get/games`, `/get/groups` | Calcula favorito, partidos, puntos, goles y snapshot no sensible. |
| Matriz de Enfrentamientos | `/get/groups`, `/get/teams`, `/get/games` | Construye tablas grupo por grupo y actualiza resultados de celdas. |

Todos los endpoints salen de `js/config.js:ENDPOINTS`; las vistas no construyen URLs arbitrarias. `tools/endpoint-injection-audit.py` prueba que `apiBase` por query string se ignora.

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
| Que pasa si falla `games` en Tour | Las sedes siguen clicables porque `stadiums` y `games` se cargan por separado; el detalle muestra error local de partidos, verificado por `tools/tour-partial-failure-audit.py`. |
| Que pasa si Agenda no tiene red ni cache | La agenda conserva skeletons, controles deshabilitados y no inventa fechas ni equipos; con datos validos, `tools/agenda-layout-audit.py` verifica columnas reales por partido simultaneo. |
| Que pasa si Timeline falla al inicio | Oculta centinela, muestra estado de error persistente y deja boton de reintento manual. |
| Que pasa cuando el sentinel del Timeline entra al viewport | `IntersectionObserver` dispara `SHOW_NEXT`, agrega 10 partidos locales y mantiene una sola peticion HTTP a `/get/games`; el boton fallback queda como respaldo manual. |
| Que pasa con 401 | Borra solo el token afectado, abre modal accesible de sesion expirada y reautentica sin `location.reload()`. |
| Que pasa con 429 | El cliente central reintenta con 1 s, 2 s y 4 s, maximo cuatro intentos, y Timeline anuncia countdown visible. |
| Que pasa con 500 | Reintenta igual que 429; si agota intentos y hay cache valida por endpoint, muestra datos stale con aviso. |
| Que pasa con JWT expirado y observer activo | La expiracion resetea vistas; Timeline limpia countdown y desconecta `IntersectionObserver` antes de recuperar sesion. |
| Que pasa con clics repetidos | Reducers idempotentes y render con `replaceChildren` evitan duplicados; el mismo venue/favorito no crea contenido duplicado. |
| Que pasa con cache corrupta | `js/cache.js` valida version, endpoint, fecha y shape; si falla, elimina solo esa entrada y reporta miss. |
| Como se ve que estoy usando cache valida | Cada modulo muestra un aviso visible de `cached data`; `tools/cached-notice-audit.py` bloquea `/get/*` y confirma Tour, Agenda, Timeline, Dashboard y Matrix desde cache. |
| Que pasa con navegacion movil | El boton `Views` abre un drawer con `aria-expanded`; Escape lo cierra y devuelve foco, seleccionar ruta lo cierra y desktop mantiene la navegacion visible. |
| Que pasa si la API trae colores de equipo | Se ignoran. `createFanTheme` deriva una paleta local allowlisted desde `team.id`/`team.name` y solo actualiza variables CSS acotadas al Dashboard. |
| Que pasa si la matriz recibe nuevos resultados | Si la estructura del grupo sigue igual, conserva referencias internas y actualiza solo celdas afectadas. |

## Respuestas de defensa

### Por que el JWT no esta en localStorage

15 segundos: Porque un XSS podria leerlo. Lo mantengo solo en memoria y al recargar se pide login otra vez.

30 segundos: El token entra por autenticacion, se guarda en `createSessionStore` solo como variable de cierre y se borra con 401 o expiracion local. Tambien limpio cualquier clave legada.

Tecnica: `js/session.js:createSessionStore`, `test/session.test.mjs`, `tools/session-storage-audit.py`, `docs/ACCESIBILIDAD_SEGURIDAD_SPEC.md:SEC-HARD-010`.

### Como evito XSS

15 segundos: No convierto datos externos en HTML.

30 segundos: La API, cache y query string son no confiables. Las vistas crean nodos con `createElement`, escriben texto con `textContent` y reemplazan regiones completas con `replaceChildren`.

Tecnica: busqueda de sinks prohibidos, `test/static-contract.test.mjs`, `test/matrix.test.mjs` con payload malicioso.

### Como defiendo tema del favorito

15 segundos: No confio en colores de la API; uso una paleta local segura.

30 segundos: El equipo elegido solo decide un indice estable de una paleta allowlisted. `fan-dashboard-view` escribe `--fan-primary`, `--fan-accent` y `--fan-contrast` en `#fan-dashboard-view`, asi que el cambio visual queda acotado al modulo y no introduce HTML ni CSS remoto.

Tecnica: `js/fan-dashboard.js:createFanTheme`, `js/fan-dashboard-view.js:applyTheme`, `css/styles.css`, `test/fan-dashboard.test.mjs`, `tools/fan-theme-audit.py`.
### Como defiendo navegacion movil

15 segundos: En movil uso un drawer con boton nativo, y Escape devuelve el foco al mismo boton.

30 segundos: El shell mantiene un unico nav semantico. En pantallas pequenas el track se oculta por CSS hasta que el boton `Views` cambia `data-drawer-open` y `aria-expanded`. Al elegir una ruta el drawer se cierra, y en desktop el boton queda oculto pero el track sigue visible.

Tecnica: `index.html`, `css/styles.css`, `js/ui.js`, `tools/mobile-drawer-audit.py`, `tools/keyboard-audit.py`.
### Como defiendo el 401

15 segundos: El 401 borra el token, abre un modal de sesion expirada y permite volver a iniciar sesion sin recargar.

30 segundos: El cliente central limpia solo el token afectado. El shell cambia a estado `expired`, aplica `role=dialog`, `aria-modal`, fondo inerte y trap de Tab; al login exitoso conserva la ruta y recarga el modulo activo.

Tecnica: `js/api.js`, `js/session.js`, `js/router.js`, `js/ui.js`, `test/api.test.mjs`, `test/static-contract.test.mjs`, `tools/console-401-audit.py`.

### Como defiendo 429

15 segundos: No martillo la API; reintento con backoff controlado.

30 segundos: `apiRequest` reintenta 429 con 1 s, 2 s y 4 s, respeta un `Retry-After` mayor y corta en cuatro intentos totales. Timeline expone el countdown en una region live.

Tecnica: `test/api.test.mjs`, `test/timeline.test.mjs`, `tools/api-resilience-audit.py`, `docs/SECURITY_REVIEW.md`.

### Como defiendo 500

15 segundos: Reintento, contengo el fallo y uso cache valida si existe.

30 segundos: Los 500 pasan por la misma politica de cuatro intentos. Si no hay recuperacion, se conserva el error tipado o se entrega cache por endpoint marcada como stale, sin mezclar endpoints ni payloads corruptos.

Tecnica: `js/api.js`, `js/cache.js`, `test/api.test.mjs`, `test/cache.test.mjs`, `tools/api-resilience-audit.py`.

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

### Como defiendo el acceso publico sin login

15 segundos: La API desplegada permite lectura publica; por eso no fabrico ni exijo un JWT falso para leer datos.

30 segundos: La API desplegada permite actualmente lectura publica. Por eso el flujo real no fabrica ni persiste credenciales. Conservamos el manejo de 401 y los escenarios deterministas de seguridad, pero documentamos la contradiccion con el requisito academico de JWT para validarla con el profesor. `apiRequest` agrega `Authorization: Bearer` solo si existe una sesion; su ausencia ya no produce un 401 local, y un 401 real del servidor sigue limpiando el token y abriendo el panel de recuperacion.

Tecnica: `js/api.js:apiRequest`, `js/ui.js` (panel de sesion solo visible en `expired`/modo prueba, o al elegir explicitamente Iniciar sesion/Crear cuenta), `tools/live-api-probe.mjs` (`LIVE_API_PUBLIC_PROBE_PASSED teams=48 games=104 groups=12 stadiums=16`), `docs/MATRIZ_CUMPLIMIENTO.md:API-001..API-003`.

### Como defiendo que el registro no fabrica sesion

15 segundos: `register()` en `js/api.js` nunca llama `session.setToken`; el token que queda en memoria siempre viene de `authenticate()`.

30 segundos: El flujo obligatorio es `register() -> authenticate() -> session.setToken()`. Si el registro tiene exito pero el login automatico falla, no se crea ninguna sesion y la app vuelve al formulario de login con un mensaje especifico. Verificado en vivo el 2026-07-23 contra `https://worldcup26.ir` con `npm run test:live-api:auth` (`LIVE_API_REGISTER_PASS`, `LIVE_API_AUTH_PASS`, `LIVE_API_JWT_VALID_PASS`, `LIVE_API_BEARER_PASS`).

Tecnica: `js/api.js:register`, `js/login-controller.js:handleRegister`, `test/api.test.mjs`, `test/static-contract.test.mjs:"registration never fabricates a session locally"`.

### Como defiendo actualizacion parcial de matriz

15 segundos: Si solo cambian resultados, actualizo celdas; no reconstruyo tablas.

30 segundos: `matrix-view` conserva un mapa interno de referencias por grupo/equipo. En refresh compara estructura y llama `updateCells`; si la estructura cambia, reconstruye de forma segura.

Tecnica: `js/matrix-view.js:refresh`, `test/matrix.test.mjs`.

## Como pruebo sin tumbar la API real

15 segundos: Uso un servidor local determinista que exige bearer y simula datos, 401, 429 y 500.

30 segundos: `testMode=1` solo funciona en origen local. El servidor de pruebas autentica, sirve fixtures sinteticos de los cuatro endpoints de datos y permite reproducir fallos controlados con reset de contadores, sin tocar la API real.

Tecnica: `tools/test-server.mjs`, `test/test-server.test.mjs`, `npm start`, `npm run test:server`.

### Como defiendo clickjacking en local

15 segundos: El servidor local no permite que la app sea embebida en frames.

30 segundos: `tools/app-server.mjs` emite CSP con `frame-ancestors 'none'` y tambien `X-Frame-Options: DENY` para navegacion, assets y errores del proxy. `tools/security-headers-audit.py` lo prueba contra respuestas HTTP reales del servidor local.

Tecnica: `tools/app-server.mjs`, `tools/security-headers-audit.py`, `docs/SECURITY_REVIEW.md:T-07`.

## Preguntas que siguen pendientes de evidencia manual

- Lector de pantalla y contraste manual completo fuera del Dashboard; zoom con lector sigue pendiente.
- Reproducciones DevTools manuales para 429, 500 y offline.
- RESUELTO (2026-07-23): el flujo `/auth/register` + `/auth/authenticate` contra la API viva ya se verifico con una cuenta real desechable. `npm run test:live-api:auth` con `WC26_API_REGISTER=true` imprimio `LIVE_API_REGISTER_PASS`, `LIVE_API_AUTH_PASS`, `LIVE_API_JWT_VALID_PASS` y `LIVE_API_BEARER_PASS`; la lectura publica sigue verificada por separado con `npm run test:live-api` (`LIVE_API_PUBLIC_PROBE_PASSED teams=48 games=104 groups=12 stadiums=16`).
- El profesor debe decidir si el requisito de Bearer en cada request sigue aplicando ahora que el proveedor externo permite lectura publica sin token; el contrato JWT en si ya esta demostrado como real de extremo a extremo.


