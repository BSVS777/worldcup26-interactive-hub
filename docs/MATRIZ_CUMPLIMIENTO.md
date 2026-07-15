# Matriz de cumplimiento completa — base obligatoria

Copia esta matriz a `docs/MATRIZ_CUMPLIMIENTO.md` y actualízala durante el desarrollo.

## Estados

- `NO INICIADO`
- `EN PROGRESO`
- `IMPLEMENTADO`
- `VERIFICADO`

| ID | Requisito | Archivo y función | Evidencia | Estado | Gap |
|---|---|---|---|---|---|
| ARC-001 | Aplicación única con cinco módulos | `index.html`, `js/router.js`, `js/ui.js`, `js/modules/*` | Playwright navego las cinco rutas sin errores de consola | IMPLEMENTADO | Cinco modulos implementados; falta verificacion con API viva completa. |
| ARC-002 | HTML semántico y reducido | `index.html`, `test/static-contract.test.mjs` | Test valida un solo `<main>`, landmarks `header/nav/footer/section`, ausencia de `role=application`, handlers inline y `<style>` inline | VERIFICADO | |
| ARC-003 | CSS minimalista y responsive | `css/styles.css`, `tools/responsive-audit.py` | Playwright testMode autenticado: 5 viewports x 5 rutas sin overflow global; H1 hero ajustado para 320px | VERIFICADO | |
| ARC-004 | Navegación entre módulos | `js/router.js`, `js/ui.js` | Playwright: aria-current cambia en las cinco rutas | IMPLEMENTADO | Falta navegacion movil avanzada/drawer. |
| ARC-005 | Fetch separado de presentacion | `js/api.js`, vistas `js/*-view.js` | `test/static-contract.test.mjs` valida que las vistas no usen `fetch(` directo y que el cliente API central maneje red | VERIFICADO | |
| API-001 | Endpoint real de autenticación verificado | | | NO INICIADO | |
| API-002 | Payload de autenticación verificado | | | NO INICIADO | |
| API-003 | Campo real del token verificado | | | NO INICIADO | |
| API-004 | Esquema de stadiums verificado | | | NO INICIADO | |
| API-005 | Esquema de games verificado | | | NO INICIADO | |
| API-006 | Esquema de teams verificado | | | NO INICIADO | |
| API-007 | Esquema de groups verificado | | | NO INICIADO | |
| API-008 | Normalizadores aislan JSON crudo | `js/api.js:apiRequest`, `js/normalizers.js:normalizePayload` | `test/static-contract.test.mjs` valida `normalizePayload(endpointKey, payload)` en el cliente; `test/normalizers.test.mjs` valida modelos estables | VERIFICADO | |
| ASY-001 | Async/await exclusivo en codigo ejecutable | `index.html`, `js/**`, `tools/**` | `test/static-contract.test.mjs` escanea runtime y falla si encuentra `.then(` o `.catch(` | VERIFICADO | |
| ASY-002 | Cada respuesta revisa response.ok/status | `js/api.js:apiRequest`, `js/api.js:authenticate` | `test/static-contract.test.mjs` valida `response.ok`; `test/api.test.mjs` cubre 401/429/500/no retry/status typed | VERIFICADO | |
| ASY-003 | No existe .then() en codigo ejecutable | `index.html`, `js/**`, `tools/**` | `test/static-contract.test.mjs` escanea runtime sin hallazgos | VERIFICADO | |
| ASY-004 | No existe .catch() en codigo ejecutable | `index.html`, `js/**`, `tools/**` | `test/static-contract.test.mjs` escanea runtime sin hallazgos | VERIFICADO | |
| SEC-001 | JWT se almacena y recupera centralmente | `js/session.js`, `js/auth.js` | `npm test`; `test/session.test.mjs` | IMPLEMENTADO | Token vive solo en memoria; tras recarga se requiere login. |
| SEC-002 | Authorization Bearer en stadiums | `js/api.js:apiRequest`, `js/config.js:ENDPOINTS` | `test/api.test.mjs` valida Bearer y path `/get/stadiums` para todos los endpoints publicos | VERIFICADO | |
| SEC-003 | Authorization Bearer en games | `js/api.js:apiRequest`, `js/config.js:ENDPOINTS` | `test/api.test.mjs` valida Bearer y path `/get/games` para todos los endpoints publicos | VERIFICADO | |
| SEC-004 | Authorization Bearer en teams | `js/api.js:apiRequest`, `js/config.js:ENDPOINTS` | `test/api.test.mjs` valida Bearer y path `/get/teams` para todos los endpoints publicos | VERIFICADO | |
| SEC-005 | Authorization Bearer en groups | `js/api.js:apiRequest`, `js/config.js:ENDPOINTS` | `test/api.test.mjs` valida Bearer y path `/get/groups` para todos los endpoints publicos | VERIFICADO | |
| ERR-401-001 | 401 elimina token | `js/api.js`, `js/session.js` | `test/api.test.mjs` cubre limpieza en 401 | IMPLEMENTADO | |
| ERR-401-002 | 401 muestra sesión expirada | `js/router.js`, `js/ui.js` | `test/shell.test.mjs`; `test/static-contract.test.mjs`; Playwright modal 401 | IMPLEMENTADO | Pendiente prueba contra 401 real de API viva. |
| ERR-401-003 | Reautenticación sin recarga | `js/app.js:handleLogin`, `js/router.js:LOGIN_SUCCEEDED` | `test/shell.test.mjs`; `test/static-contract.test.mjs` | IMPLEMENTADO | |
| ERR-401-004 | Observer se detiene o pausa ante 401 | `js/app.js:onSessionExpired`, `js/timeline-view.js:reset` | `test/static-contract.test.mjs` valida reset de modulos antes del panel de recuperacion; `test/timeline.test.mjs` valida desconexion de IntersectionObserver activo | VERIFICADO | |
| ERR-401-005 | Continuacion sin listeners duplicados | `js/ui.js`, `js/app.js`, vistas `js/*-view.js` | `test/static-contract.test.mjs` valida conteos de listeners fuera de render/reset/load; `test/timeline.test.mjs` cubre reset de observer | VERIFICADO | |
| ERR-429-001 | 429 se clasifica explícitamente | `js/api.js:createApiClient` | `test/api.test.mjs` cubre retry 429 y error tipado tras agotar intentos | VERIFICADO | |
| ERR-429-002 | Backoff 1s/2s/4s | `js/api.js:BACKOFF_MS` | `test/api.test.mjs` valida delays 1000/2000/4000 | VERIFICADO | |
| ERR-429-003 | Máximo 4 intentos totales | `js/api.js:apiRequest` | `test/api.test.mjs` valida error 429 tras cuatro intentos | VERIFICADO | |
| ERR-429-004 | Retry-After válido se respeta si es mayor | `js/api.js:retryAfterMilliseconds` | `test/api.test.mjs` valida `Retry-After: 3` como 3000 ms | VERIFICADO | |
| ERR-429-005 | Countdown visible | `js/timeline-view.js:startRetryCountdown`, `js/timeline.js:RETRY_COUNTDOWN` | `test/timeline.test.mjs` valida texto `Retrying in 3s`, `2s`, `1s` | VERIFICADO | Countdown verificado en Timeline; otros modulos usan fallback/error sin countdown propio. |
| ERR-429-006 | Countdown accesible con aria-live | `index.html#timeline-status`, `js/timeline-view.js:renderStatus` | `test/static-contract.test.mjs`; `test/timeline.test.mjs` valida actualizaciones del status live | VERIFICADO | |
| ERR-429-007 | Intervalos se limpian | `js/timeline-view.js:clearRetryCountdown` | `test/timeline.test.mjs` valida limpieza tras recuperacion y `reset()` | VERIFICADO | |
| ERR-500-001 | 500 se clasifica explícitamente | `js/api.js:createApiClient` | `test/api.test.mjs` cubre retry 500 y error tipado tras agotar intentos | VERIFICADO | |
| ERR-500-002 | Backoff 1s/2s/4s | `js/api.js:BACKOFF_MS` | `test/api.test.mjs` valida cuatro intentos para 500 | VERIFICADO | |
| ERR-500-003 | Máximo 4 intentos totales | `js/api.js:apiRequest` | `test/api.test.mjs` valida error 500 tras cuatro intentos | VERIFICADO | |
| ERR-500-004 | Usa caché al agotar intentos | `js/api.js:cachedResult` | `test/api.test.mjs` valida fallback cache al agotar 500 | VERIFICADO | |
| ERR-500-005 | Sin caché muestra error recuperable | `js/api.js:ApiError` | `test/api.test.mjs` valida error 500 recoverable sin cache | VERIFICADO | |
| NET-001 | Error de red se diferencia de error HTTP | `js/api.js:apiRequest` | `test/api.test.mjs` valida `Network request failed` y errores HTTP tipados | VERIFICADO | |
| NET-002 | Error de red usa caché disponible | `js/api.js:cachedResult` | `test/api.test.mjs` valida cache inmediata en error de red | VERIFICADO | |
| NET-003 | Sin red ni caché aplica reto específico | `js/api.js:ApiError`, `js/timeline-view.js`, `tools/offline-audit.py` | Playwright autentica, limpia cache, corta red y verifica Timeline con mensaje recuperable y boton Retry (`OFFLINE_AUDIT_PASS`) | VERIFICADO | |
| CAC-001 | Cache independiente de stadiums | `js/cache.js:endpointCacheKey`, `test/cache.test.mjs` | Test `stores every public endpoint in an isolated cache key` cubre `stadiums` | VERIFICADO | |
| CAC-002 | Cache independiente de games | `js/cache.js:endpointCacheKey`, `test/cache.test.mjs` | Test `stores every public endpoint in an isolated cache key` cubre `games` | VERIFICADO | |
| CAC-003 | Cache independiente de teams | `js/cache.js:endpointCacheKey`, `test/cache.test.mjs` | Test `stores every public endpoint in an isolated cache key` cubre `teams` | VERIFICADO | |
| CAC-004 | Cache independiente de groups | `js/cache.js:endpointCacheKey`, `test/cache.test.mjs` | Test `stores every public endpoint in an isolated cache key` cubre `groups` | VERIFICADO | |
| CAC-005 | Cache guarda timestamp | `js/cache.js:writeEndpointCache`, `test/cache.test.mjs` | Tests validan `savedAt` ISO y rechazan fechas invalidas | VERIFICADO | |
| CAC-006 | Cache guarda version | `js/cache.js:CACHE_VERSION`, `test/cache.test.mjs` | Tests validan version vigente y rechazan version incorrecta | VERIFICADO | |
| CAC-007 | JSON corrupto se captura | `js/cache.js:readEndpointCache`, `test/cache.test.mjs` | Test cubre JSON corrupto sin romper la app | VERIFICADO | |
| CAC-008 | Solo se elimina la clave corrupta | `js/cache.js:removeEndpointCache`, `test/cache.test.mjs` | Test valida remocion acotada a la entrada invalida | VERIFICADO | |
| CAC-009 | Datos cacheados muestran aviso visible | `js/loadable-view.js`, vistas de modulos, `tools/cached-notice-audit.py`, `test/matrix.test.mjs`, `test/timeline.test.mjs` | Playwright calienta cache real, bloquea `/get/*` y verifica avisos visibles en Tour, Agenda, Timeline, Dashboard y Matrix (`CACHED_NOTICE_AUDIT_PASS routes=5`) | VERIFICADO | |
| PRO-001 | No existe alert() en código ejecutable | Codigo ejecutable `js/**`, `index.html` | `rg` de sinks peligrosos sin hallazgos; fixture maliciosa en `test/matrix.test.mjs` no crea nodos ejecutables | VERIFICADO | La palabra `alert` solo existe como payload de prueba/documentacion. |
| PRO-002 | No existe location.reload() en código ejecutable | Codigo ejecutable `js/**`, `index.html` | `rg` de sinks peligrosos sin hallazgos en runtime | VERIFICADO | |
| PRO-003 | Búsqueda excluye Markdown y documentación | Comando `rg` con `--glob !docs/** --glob !**/*.md` | Ejecutado en auditoria de seguridad; sin falsos positivos de docs | VERIFICADO | |
| PRO-004 | Fetch directo limitado a lugares permitidos | `js/api.js`, tests | `rg fetch(` muestra fetch directo solo en tests; app usa cliente API central | VERIFICADO | |
| TOUR-001 | Renderiza 16 sedes | `js/tour-view.js:renderList`, `js/tour.js:crossReferenceVenues` | `test/tour.test.mjs` (tests de cruce de datos); `renderList` mapea `state.venues` 1:1 desde el arreglo normalizado de sedes | IMPLEMENTADO | El conteo real de 16 sedes depende de los datos en vivo de la API; no verificado en navegador. |
| TOUR-002 | Sedes se obtienen de /get/stadiums | `js/tour-view.js:load` (`api.apiRequest('stadiums')`) | Reutiliza el cliente API compartido (`js/api.js`); llamada dentro de `load()` | IMPLEMENTADO | |
| TOUR-003 | Partidos se obtienen de /get/games | `js/tour-view.js:load` (`api.apiRequest('games')`) | Reutiliza el cliente API compartido; llamada independiente dentro de `load()` | IMPLEMENTADO | |
| TOUR-004 | Cruza stadium ID con referencia de partido | `js/tour.js:crossReferenceVenues` | `test/tour.test.mjs` → "cross-references each venue with the games that reference its real stadium id" | IMPLEMENTADO | |
| TOUR-005 | Usa scrollIntoView smooth | `js/tour-view.js:selectVenue` | `test/static-contract.test.mjs` → verifica el literal `scrollIntoView({ behavior: 'smooth' })` en `js/tour-view.js` | IMPLEMENTADO | |
| TOUR-006 | Mantiene sede activa | `js/tour.js:reduceTourState` (`selectedVenueId`), `js/tour-view.js:markActiveButton` | `test/tour.test.mjs` → tests de selección; clase CSS `.venue-card--active` en `css/styles.css` | IMPLEMENTADO | |
| TOUR-007 | Clics repetidos no duplican contenido | `js/tour.js:reduceTourState` (idempotencia de `VENUE_SELECTED`), `js/tour-view.js:renderDetail`/`renderList` (usan `replaceChildren`, sin refetch en click) | `test/tour.test.mjs` → "selecting the same venue twice is idempotent and reuses the same state" | IMPLEMENTADO | |
| TOUR-008 | Botones siguen clicables si falla games | `js/tour-view.js:load` (try/catch independiente por endpoint; las tarjetas se renderizan desde `stadiums` sin depender del resultado de `games`) | `test/tour.test.mjs` → "marks every venue with a local games error and no games when the games fetch failed" | IMPLEMENTADO | Sin prueba de integración real en navegador (no hay jsdom en este proyecto). |
| TOUR-009 | Muestra mensaje local de partidos fallidos | `js/tour-view.js:renderDetail` (rama `venue.gamesError`) | `test/tour.test.mjs` cubre el flag `gamesError` por sede; el renderizado DOM en sí sigue el patrón existente del proyecto (DOM glue sin test unitario directo, igual que `createShellView`) | IMPLEMENTADO | |
| TOUR-010 | Fallo de games no bloquea otras sedes | `js/tour-view.js:selectVenue`/`markActiveButton` (navegación y selección independientes del flag `gamesError`) | `test/tour.test.mjs` confirma que `gamesError` es por-sede y no global; el listener de clics no se deshabilita | IMPLEMENTADO | |
| AGE-001 | Obtiene games | `js/agenda-view.js:load` (`api.apiRequest('games')`) | Reutiliza el cliente API compartido; llamada dentro de `load()` junto a `teams` vía `Promise.all` | IMPLEMENTADO | |
| AGE-002 | Obtiene teams | `js/agenda-view.js:load` (`api.apiRequest('teams')`) | Reutiliza el cliente API compartido; llamada independiente dentro de `load()` | IMPLEMENTADO | |
| AGE-003 | Agrupa por local_date normalizada | `js/agenda.js:normalizeLocalDate`, `js/agenda.js:groupByDate` | `test/agenda.test.mjs` → "strips a time-of-day suffix so same-day games with different timestamps still group together" | IMPLEMENTADO | |
| AGE-004 | Detecta fechas con 2+ partidos | `js/agenda.js:buildDates` (`.filter(([, list]) => list.length >= 2)`) | `test/agenda.test.mjs` → "groups games by normalized local date and drops dates with fewer than two matches" | IMPLEMENTADO | |
| AGE-005 | Layout dividido por partido | `js/agenda-view.js:createGameColumn`, `css/styles.css:.agenda-columns`/`.agenda-column` (CSS Grid, una columna por partido simultáneo) | `test/agenda.test.mjs` → "after a successful load, renders one column per simultaneous match on the first retained date" | IMPLEMENTADO | Distribución visual no verificada en navegador. |
| AGE-006 | Cruza IDs de equipos con nombres | `js/agenda.js:crossReferenceGame`, `js/agenda.js:buildTeamNameLookup` | `test/agenda.test.mjs` → "cross-references home and away team ids with real team names" | IMPLEMENTADO | |
| AGE-007 | Control fecha anterior | `js/agenda.js:reduceAgendaState` (`DATE_PREV`), `js/agenda-view.js` (`agenda-prev` listener) | `test/agenda.test.mjs` → "DATE_PREV retreats the cursor and is a no-op at the first retained date" | IMPLEMENTADO | |
| AGE-008 | Control fecha siguiente | `js/agenda.js:reduceAgendaState` (`DATE_NEXT`), `js/agenda-view.js` (`agenda-next` listener) | `test/agenda.test.mjs` → "DATE_NEXT advances the cursor and is a no-op once the last retained date is reached" | IMPLEMENTADO | |
| AGE-009 | Límites de navegación deshabilitados | `js/agenda-view.js:renderControls` (`prevButton.disabled`/`nextButton.disabled` en los extremos) | `test/agenda.test.mjs` → "after a successful load…" (previous deshabilitado en la primera fecha) y "next/prev move across retained dates…" (next deshabilitado en la última) | IMPLEMENTADO | |
| AGE-010 | Navegación rápida no desordena el estado | `js/agenda.js:reduceAgendaState` (transiciones síncronas puras, no-op idempotente en los límites), `js/agenda-view.js:goToDate` | `test/agenda.test.mjs` → "next/prev move across retained dates and disable at each boundary, including under rapid repeated clicks"; además `js/agenda-view.js:load` usa el mismo guard de `generation` que `tour-view.js` para la carga inicial async, cubierto por "a stale in-flight load never overwrites a fresher load" | IMPLEMENTADO | |
| AGE-011 | Sin red ni caché muestra skeletons | `js/agenda-view.js:renderColumns` (rama `state.dates.length === 0` → `createSkeletonColumn`), clase `.agenda-skeleton` en `css/styles.css` | `test/agenda.test.mjs` → "when the games fetch fails entirely, skeletons remain and both controls stay disabled" | IMPLEMENTADO | |
| AGE-012 | Nunca deja el layout en blanco | `js/agenda-view.js` (llamada a `render()` en la construcción de la vista, antes de cualquier carga) y `renderControls` (controles siempre presentes, deshabilitados sin datos) | `test/agenda.test.mjs` → "before any data arrives, the columns area shows skeletons and controls are disabled, never blank" | IMPLEMENTADO | Decisión de diseño: sin fechas, los controles se renderizan siempre visibles pero deshabilitados (no se ocultan). |
| TIME-001 | Pide todos los partidos una sola vez | `js/timeline-view.js:load` (`api.apiRequest('games')`) | `test/timeline.test.mjs` confirma una sola llamada y load-more local | IMPLEMENTADO | Pendiente validar con API autenticada real. |
| TIME-002 | Ordena cronológicamente | `js/timeline.js:uniqueSortedGames` | `test/timeline.test.mjs` | IMPLEMENTADO | |
| TIME-003 | Inserta bloques de 10 | `js/timeline.js:reduceTimelineState` (`SHOW_NEXT`) | `test/timeline.test.mjs` | IMPLEMENTADO | |
| TIME-004 | Usa IntersectionObserver | `js/timeline-view.js:syncObserver`, `tools/timeline-observer-audit.py` | Playwright reemplaza `window.IntersectionObserver`, confirma `observe(#timeline-sentinel)`, dispara interseccion controlada y Timeline pasa de 10 a 20 filas sin refetch (`TIMELINE_OBSERVER_AUDIT_PASS`) | VERIFICADO | |
| TIME-005 | Usa centinela al final | `index.html#timeline-sentinel`, `js/timeline-view.js` | Playwright confirma vista Timeline activa; centinela se oculta sin mas datos | IMPLEMENTADO | |
| TIME-006 | No pagina la petición HTTP | `js/timeline-view.js:showNextBatch` | `test/timeline.test.mjs` confirma que load-more no refetch | IMPLEMENTADO | |
| TIME-007 | Evita duplicados con ID estable | `js/timeline.js:uniqueSortedGames` | `test/timeline.test.mjs` | IMPLEMENTADO | |
| TIME-008 | Desconecta observer al terminar | `js/timeline-view.js:disconnectObserver`, `syncObserver`, `reset` | `test/timeline.test.mjs` valida desconexion de IntersectionObserver activo al resetear | VERIFICADO | |
| TIME-009 | Fallo inicial no deja observer esperando | `js/timeline-view.js:renderControls` | `test/timeline.test.mjs` confirma centinela oculto tras fallo | IMPLEMENTADO | |
| TIME-010 | Fallo inicial muestra estado de error | `js/timeline-view.js:renderStatus` | `test/timeline.test.mjs`; Playwright muestra retry visible en anonimo | IMPLEMENTADO | |
| TIME-011 | Existe botón de reintento manual | `index.html#timeline-retry`, `js/timeline-view.js:retry` | `test/timeline.test.mjs`; Playwright `RETRY_VISIBLE True` | IMPLEMENTADO | |
| TIME-012 | Reintento manual dispara backoff | `js/timeline-view.js:retry` (`forceRetry: true`) | `test/timeline.test.mjs` confirma `forceRetry`; backoff central cubierto por `test/api.test.mjs` | IMPLEMENTADO | |
| TIME-013 | Recuperación reinicia desde el principio | `js/timeline-view.js:retry`, `js/timeline.js:DATA_LOADED` | `test/timeline.test.mjs` recupera 3 partidos luego de fallo | IMPLEMENTADO | |
| TIME-014 | Recuperación no duplica partidos | `js/timeline.js:uniqueSortedGames` | `test/timeline.test.mjs` cubre dedupe por ID | IMPLEMENTADO | |
| FAN-001 | Obtiene teams | `js/fan-dashboard-view.js:load` | `test/fan-dashboard.test.mjs` confirma llamada a `teams` | IMPLEMENTADO | Pendiente API autenticada real. |
| FAN-002 | Obtiene games | `js/fan-dashboard-view.js:load` | `test/fan-dashboard.test.mjs` confirma llamada a `games` | IMPLEMENTADO | |
| FAN-003 | Obtiene groups | `js/fan-dashboard-view.js:load` | `test/fan-dashboard.test.mjs` confirma llamada a `groups` | IMPLEMENTADO | |
| FAN-004 | Selector único de equipo favorito | `index.html#fan-team-select`, `js/fan-dashboard-view.js` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | |
| FAN-005 | Favorito se guarda en localStorage | `js/fan-dashboard.js:writeFavoriteTeamId` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | Solo se guarda ID de equipo, no JWT. |
| FAN-006 | Favorito se restaura tras recarga | `js/fan-dashboard.js:readFavoriteTeamId` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | |
| FAN-007 | Filtra solo partidos del favorito | `js/fan-dashboard.js:teamGames` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | |
| FAN-008 | Cruza favorito con grupo | `js/fan-dashboard.js:findStanding` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | |
| FAN-009 | Muestra puntos | `js/fan-dashboard.js:buildDashboard`, `js/fan-dashboard-view.js:renderMetrics` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | |
| FAN-010 | Muestra goles a favor | `js/fan-dashboard.js:buildDashboard` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | Usa standing o calculo desde partidos jugados. |
| FAN-011 | Muestra goles en contra | `js/fan-dashboard.js:buildDashboard` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | Usa standing o calculo desde partidos jugados. |
| FAN-012 | Repinta variables CSS | | | NO INICIADO | No se implemento tematizacion por equipo porque no hay contrato seguro de colores en API. |
| FAN-013 | Mantiene contraste legible | `css/styles.css:.fan-*`, `test/accessibility-contrast.test.mjs` | Test calcula ratios WCAG: texto nocturno sobre panel blanco, labels pitch sobre blanco, status night/sky y foco focus/white | VERIFICADO | |
| FAN-014 | Sin API usa snapshot del favorito | `js/fan-dashboard.js:readFanSnapshot`, `js/fan-dashboard-view.js:load` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | Snapshot se usa cuando `teams` no esta disponible. |
| FAN-015 | Snapshot muestra datos no actualizados | `js/fan-dashboard-view.js:renderStatus`, `renderSummary` | `test/fan-dashboard.test.mjs` | IMPLEMENTADO | |
| FAN-016 | Dashboard nunca queda vacío | `js/fan-dashboard-view.js:renderMetrics`, `renderMatches` | `test/fan-dashboard.test.mjs`; `npm test` | IMPLEMENTADO | |
| MAT-001 | Obtiene groups | `js/matrix-view.js:load` | `test/matrix.test.mjs`; `npm test` | IMPLEMENTADO | Pendiente API autenticada real. |
| MAT-002 | Obtiene teams | `js/matrix-view.js:load` | `test/matrix.test.mjs`; `npm test` | IMPLEMENTADO | Pendiente API autenticada real. |
| MAT-003 | Obtiene games | `js/matrix-view.js:load` | `test/matrix.test.mjs`; `npm test` | IMPLEMENTADO | Pendiente API autenticada real. |
| MAT-004 | Construye 12 matrices | `js/matrix.js:buildGroupMatrices` | `test/matrix.test.mjs`; Playwright testMode 390x844 renderizo 12 matrices y 192 celdas | VERIFICADO | Verificado con fixtures deterministas; falta API viva para confirmar 12 grupos reales. |
| MAT-005 | Cada matriz es 4x4 | `js/matrix.js:buildGroupMatrices` | `test/matrix.test.mjs` | IMPLEMENTADO | Cuando el group trae cuatro equipos; si API trae otra cantidad, caption lo declara. |
| MAT-006 | Filas representan equipos del grupo | `js/matrix.js`, `js/matrix-view.js` | `test/matrix.test.mjs` | IMPLEMENTADO | |
| MAT-007 | Columnas representan equipos del grupo | `js/matrix-view.js:renderStructure` | `test/matrix.test.mjs` | IMPLEMENTADO | |
| MAT-008 | Cruza grupos con equipos | `js/matrix.js:teamsForGroup` | `test/matrix.test.mjs` | IMPLEMENTADO | Usa standings del group o `team.groupId`. |
| MAT-009 | Cruza equipos con partidos | `js/matrix.js:indexGames`, `buildCell` | `test/matrix.test.mjs` | IMPLEMENTADO | |
| MAT-010 | Partido jugado muestra resultado | `js/matrix.js:scoreForTeam` | `test/matrix.test.mjs` | IMPLEMENTADO | Resultado desde perspectiva del equipo de la fila. |
| MAT-011 | Partido no jugado muestra Pendiente | `js/matrix.js:buildCell` | `test/matrix.test.mjs` | IMPLEMENTADO | |
| MAT-012 | Diagonal está deshabilitada visualmente | `css/styles.css:.matrix-cell--diagonal` | `test/matrix.test.mjs` | IMPLEMENTADO | |
| MAT-013 | Diagonal está marcada semánticamente | `js/matrix-view.js:updateCells` | `test/matrix.test.mjs` | IMPLEMENTADO | Usa `aria-disabled="true"` y label same-team. |
| MAT-014 | Vista es usable en móvil | `css/styles.css:.matrix-table-shell` | Playwright 390x844: docWidth=viewportWidth, tabla scrollea dentro del shell | VERIFICADO | |
| MAT-015 | Sin games dibuja matriz completa | `js/matrix.js:buildGroupMatrices` | `test/matrix.test.mjs` | IMPLEMENTADO | |
| MAT-016 | Sin games todas las celdas quedan Pendiente | `js/matrix.js:buildCell` | `test/matrix.test.mjs` | IMPLEMENTADO | Celdas no diagonales quedan `Pending`/`unknown`. |
| MAT-017 | Conserva referencias a celdas | `js/matrix-view.js:cellRefs` | `test/matrix.test.mjs` | IMPLEMENTADO | |
| MAT-018 | Recuperación actualiza solo celdas afectadas | `js/matrix-view.js:refresh`, `updateCells` | `test/matrix.test.mjs` | IMPLEMENTADO | |
| MAT-019 | Recuperación no reconstruye tablas | `js/matrix-view.js:render` estructura estable | `test/matrix.test.mjs` | IMPLEMENTADO | |
| TST-001 | Servidor local usa Node nativo | `tools/test-server.mjs:createTestServer` | `test/test-server.test.mjs`; `npm run test:server` via Playwright | VERIFICADO | |
| TST-002 | /test/401 devuelve HTTP 401 real | `tools/test-server.mjs` | `test/api.test.mjs`; servidor de pruebas mantiene endpoint 401 | IMPLEMENTADO | |
| TST-003 | /test/429 devuelve HTTP 429 real | `tools/test-server.mjs:failNTimes` | `test/test-server.test.mjs` valida 429 y `Retry-After` | VERIFICADO | |
| TST-004 | /test/500 devuelve HTTP 500 real | `tools/test-server.mjs:failNTimes` | `test/test-server.test.mjs` valida 500 y recuperacion | VERIFICADO | |
| TST-005 | 429 falla N veces y luego recupera | `tools/test-server.mjs:failNTimes` | `test/test-server.test.mjs` prueba `failures=1` y segundo 200 | VERIFICADO | |
| TST-006 | 500 falla N veces y luego recupera | `tools/test-server.mjs:failNTimes` | `test/test-server.test.mjs` prueba `failures=1` y segundo 200 | VERIFICADO | |
| TST-007 | /test/reset limpia contadores | `tools/test-server.mjs` | `test/test-server.test.mjs` resetea y reproduce fallo | VERIFICADO | |
| TST-008 | Modo de pruebas está desactivado por defecto | `js/config.js:isTestMode` | `test/config.test.mjs` | VERIFICADO | |
| TST-009 | Modo de pruebas muestra insignia | `js/ui.js`, `index.html#test-mode-badge` | Playwright testMode: `testBadgeHidden=false` | VERIFICADO | |
| TST-010 | Producción conserva API real | `js/config.js:resolveApiBaseUrl` | `test/config.test.mjs` confirma testMode aislado/local | VERIFICADO | |
| DEF-001 | Guia explica flujo general | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida la seccion `Flujo general del sistema` | VERIFICADO | |
| DEF-002 | Guia lista endpoints por modulo | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida endpoints por Tour, Agenda, Timeline, Dashboard y Matriz | VERIFICADO | |
| DEF-003 | Guia lista campos reales cruzados | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida cruces sede/partidos, partido/equipos y matriz | VERIFICADO | |
| DEF-004 | Guia copia retos casi literalmente | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida preguntas `Que pasa...` para fallos y resiliencia | VERIFICADO | |
| DEF-005 | Guia responde que pasa si falla por modulo | `docs/GUIA_DEFENSA_INFJ_T.md` | Guia cubre Tour, Agenda, Timeline, Dashboard y Matriz; `test/static-contract.test.mjs` valida retos clave | VERIFICADO | |
| DEF-006 | Guia explica 401 | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida `Que pasa con 401`; `test/api.test.mjs` cubre limpieza/token | VERIFICADO | |
| DEF-007 | Guia explica 429 | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida `Que pasa con 429`; `test/api.test.mjs` cubre backoff | VERIFICADO | |
| DEF-008 | Guia explica 500 | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida `Que pasa con 500`; `test/api.test.mjs` cubre fallback/cache | VERIFICADO | |
| DEF-009 | Guia explica JWT expirado con observer | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida la respuesta; `test/timeline.test.mjs` cubre disconnect/reset | VERIFICADO | |
| DEF-010 | Guia explica clics repetidos | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida la respuesta; Tour/Agenda/Timeline cubren idempotencia | VERIFICADO | |
| DEF-011 | Guia explica cache corrupta | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida la respuesta; `test/cache.test.mjs` cubre entradas invalidas | VERIFICADO | |
| DEF-012 | Guia explica actualizacion parcial de matriz | `docs/GUIA_DEFENSA_INFJ_T.md` | `test/static-contract.test.mjs` valida la respuesta; `test/matrix.test.mjs` cubre refresh parcial | VERIFICADO | |
| DEV-001 | 401 se reproduce en Console | | | NO INICIADO | |
| DEV-002 | 401 se reproduce en Network | `tools/failure-audit.py`, `js/api.js`, `js/ui.js` | Playwright intercepta `/get/games`, observa response 401 y verifica modal de sesion expirada sin errores de consola (`FAILURE_AUDIT_PASS`) | VERIFICADO | |
| DEV-003 | 429 y reintentos se observan en Network | `tools/failure-audit.py`, `js/api.js`, `js/timeline-view.js` | Playwright fuerza primer `/get/games` 429, observa 429 seguido de 200 y recuperacion del Timeline (`FAILURE_AUDIT_PASS`) | VERIFICADO | |
| DEV-004 | Countdown 429 se observa en UI | `tools/failure-audit.py`, `js/timeline-view.js` | Playwright verifica `Retrying in` en `#timeline-status` durante backoff 429 (`FAILURE_AUDIT_PASS`) | VERIFICADO | |
| DEV-005 | 500 y reintentos se observan en Network | `tools/failure-audit.py`, `js/api.js`, `js/timeline-view.js` | Playwright fuerza primer `/get/games` 500, observa 500 seguido de 200 y recuperacion del Timeline (`FAILURE_AUDIT_PASS`) | VERIFICADO | |
| DEV-006 | Offline con caché se demuestra | `tools/offline-audit.py`, `js/cache.js`, `js/agenda-view.js` | Playwright precarga cache de games, corta red y verifica Agenda con `cached data` y columnas renderizadas (`OFFLINE_AUDIT_PASS`) | VERIFICADO | |
| DEV-007 | Offline sin caché se demuestra | `tools/offline-audit.py`, `js/timeline-view.js` | Playwright limpia cache, corta red y verifica estado recuperable sin filas de datos y Retry visible (`OFFLINE_AUDIT_PASS`) | VERIFICADO | |
| QA-001 | Aplicacion inicia sin errores de sintaxis | App local `npm start` | Playwright cargo app sin errores de consola; `npm test` 128/128 | VERIFICADO | |
| QA-002 | Responsive verificado | `tools/responsive-audit.py`, `css/styles.css` | `with_server.py` + `python tools/responsive-audit.py`: 320x720, 390x844, 768x1024, 1366x768, 1920x1080 en cinco rutas; 25/25 sin overflow global | VERIFICADO | |
| QA-003 | Navegación por teclado verificada | `tools/keyboard-audit.py`, links/botones nativos, trap de Tab en modal 401, foco contextual en Tour | Playwright usa Tab/Shift+Tab/Enter reales: skip link, login, cinco rutas, controles de modulo y modal 401 (`KEYBOARD_AUDIT_PASS routes=5 login=keyboard modal_trap=verified`) | VERIFICADO | Lector de pantalla sigue pendiente en Accessibility Audit. |
| QA-004 | aria-live en estados dinamicos | `index.html`, `js/timeline-view.js`, `js/matrix-view.js` | Countdown y avisos de cache actualizan regiones `role=status`/`aria-live`; `test/timeline.test.mjs`, `test/matrix.test.mjs` | IMPLEMENTADO | Pendiente prueba manual con lector de pantalla. |
| QA-005 | prefers-reduced-motion respetado | `css/styles.css`, `tools/motion-audit.py`, `js/accessibility.js` | Playwright emula `prefers-reduced-motion: reduce` y valida scroll auto/transiciones <= 0.01ms; test estatico valida animacion <= 0.01ms e iteracion 1 (`MOTION_AUDIT_PASS reduced_motion=emulated`) | VERIFICADO | |
| QA-006 | No hay listeners duplicados | `js/app.js`, `js/ui.js`, vistas `js/*-view.js` | `test/static-contract.test.mjs` valida registros centralizados y evita listeners dentro de rutas repetibles | VERIFICADO | |
| QA-007 | No hay observer duplicado | `js/timeline-view.js:syncObserver`, `js/timeline-view.js:reset`, `tools/timeline-observer-audit.py` | `test/timeline.test.mjs` valida desconexion en reset; Playwright confirma observacion del sentinel y resuscripcion controlada tras cargar el siguiente bloque | VERIFICADO | |
| QA-008 | No hay intervalos huérfanos | `js/timeline-view.js:clearRetryCountdown` | `test/timeline.test.mjs` valida limpieza tras recuperacion y reset | VERIFICADO | |
| QA-009 | No hay archivos o dependencias innecesarias | `package.json`, `index.html`, `test/static-contract.test.mjs` | Test valida cero `dependencies/devDependencies`, ausencia de lockfiles/node_modules y sin scripts/styles remotos en HTML | VERIFICADO | |
| QA-010 | README contiene comandos exactos | `README.md`, `package.json` | `test/static-contract.test.mjs` valida `npm start`, `npm test`, `npm run test:server` y URLs locales | VERIFICADO | |

## Especificaciones transversales agregadas

| ID | Requisito | Archivo y funcion | Evidencia | Estado | Gap |
|---|---|---|---|---|---|
| SPEC-ACC-001 | Accesibilidad e inclusion son objetivo transversal obligatorio | `docs/ACCESIBILIDAD_SEGURIDAD_SPEC.md` | Spec define ACC-001..ACC-012 y Definition of Done; Matrix verificada en movil 390x844 | IMPLEMENTADO | Pendiente auditoria manual con teclado, zoom, contraste y lector. |
| SPEC-SEC-001 | Seguridad y privacidad son objetivo transversal obligatorio | `docs/ACCESIBILIDAD_SEGURIDAD_SPEC.md` | Spec define SEC-HARD-001..SEC-HARD-010; test server valida bearer, CORS local y allowlists | IMPLEMENTADO | Pendiente auditoria final contra hosting/API viva. |
| SPEC-RES-001 | Resiliencia tipo "intumbable" se define como degradacion segura, contencion de fallos y recuperacion sin recarga | `docs/ACCESIBILIDAD_SEGURIDAD_SPEC.md` | Spec define RES-001..RES-008; test server cubre auth/datos/401/429/500/reset deterministas | IMPLEMENTADO | Pendiente Playwright de fallos por modulo y validacion en produccion. |
| QA-011 | Elementos con `hidden` no ocupan layout ni foco | `css/styles.css` (`[hidden]`) | `test/static-contract.test.mjs` verifica `display: none !important` | IMPLEMENTADO | |

