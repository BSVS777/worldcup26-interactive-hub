# Matriz de cumplimiento completa — base obligatoria

Copia esta matriz a `docs/MATRIZ_CUMPLIMIENTO.md` y actualízala durante el desarrollo.

## Estados

- `NO INICIADO`
- `EN PROGRESO`
- `IMPLEMENTADO`
- `VERIFICADO`

| ID | Requisito | Archivo y función | Evidencia | Estado | Gap |
|---|---|---|---|---|---|
| ARC-001 | Aplicación única con cinco módulos | | | NO INICIADO | |
| ARC-002 | HTML semántico y reducido | | | NO INICIADO | |
| ARC-003 | CSS minimalista y responsive | | | NO INICIADO | |
| ARC-004 | Navegación entre módulos | | | NO INICIADO | |
| ARC-005 | Fetch separado de presentación | | | NO INICIADO | |
| API-001 | Endpoint real de autenticación verificado | | | NO INICIADO | |
| API-002 | Payload de autenticación verificado | | | NO INICIADO | |
| API-003 | Campo real del token verificado | | | NO INICIADO | |
| API-004 | Esquema de stadiums verificado | | | NO INICIADO | |
| API-005 | Esquema de games verificado | | | NO INICIADO | |
| API-006 | Esquema de teams verificado | | | NO INICIADO | |
| API-007 | Esquema de groups verificado | | | NO INICIADO | |
| API-008 | Normalizadores aíslan JSON crudo | | | NO INICIADO | |
| ASY-001 | Async/await exclusivo en código ejecutable | | | NO INICIADO | |
| ASY-002 | Cada respuesta revisa response.ok/status | | | NO INICIADO | |
| ASY-003 | No existe .then() en código ejecutable | | | NO INICIADO | |
| ASY-004 | No existe .catch() en código ejecutable | | | NO INICIADO | |
| SEC-001 | JWT se almacena y recupera centralmente | | | NO INICIADO | |
| SEC-002 | Authorization Bearer en stadiums | | | NO INICIADO | |
| SEC-003 | Authorization Bearer en games | | | NO INICIADO | |
| SEC-004 | Authorization Bearer en teams | | | NO INICIADO | |
| SEC-005 | Authorization Bearer en groups | | | NO INICIADO | |
| ERR-401-001 | 401 elimina token | | | NO INICIADO | |
| ERR-401-002 | 401 muestra sesión expirada | | | NO INICIADO | |
| ERR-401-003 | Reautenticación sin recarga | | | NO INICIADO | |
| ERR-401-004 | Observer se detiene o pausa ante 401 | | | NO INICIADO | |
| ERR-401-005 | Continuación sin listeners duplicados | | | NO INICIADO | |
| ERR-429-001 | 429 se clasifica explícitamente | | | NO INICIADO | |
| ERR-429-002 | Backoff 1s/2s/4s | | | NO INICIADO | |
| ERR-429-003 | Máximo 4 intentos totales | | | NO INICIADO | |
| ERR-429-004 | Retry-After válido se respeta si es mayor | | | NO INICIADO | |
| ERR-429-005 | Countdown visible | | | NO INICIADO | |
| ERR-429-006 | Countdown accesible con aria-live | | | NO INICIADO | |
| ERR-429-007 | Intervalos se limpian | | | NO INICIADO | |
| ERR-500-001 | 500 se clasifica explícitamente | | | NO INICIADO | |
| ERR-500-002 | Backoff 1s/2s/4s | | | NO INICIADO | |
| ERR-500-003 | Máximo 4 intentos totales | | | NO INICIADO | |
| ERR-500-004 | Usa caché al agotar intentos | | | NO INICIADO | |
| ERR-500-005 | Sin caché muestra error recuperable | | | NO INICIADO | |
| NET-001 | Error de red se diferencia de error HTTP | | | NO INICIADO | |
| NET-002 | Error de red usa caché disponible | | | NO INICIADO | |
| NET-003 | Sin red ni caché aplica reto específico | | | NO INICIADO | |
| CAC-001 | Caché independiente de stadiums | | | NO INICIADO | |
| CAC-002 | Caché independiente de games | | | NO INICIADO | |
| CAC-003 | Caché independiente de teams | | | NO INICIADO | |
| CAC-004 | Caché independiente de groups | | | NO INICIADO | |
| CAC-005 | Caché guarda timestamp | | | NO INICIADO | |
| CAC-006 | Caché guarda versión | | | NO INICIADO | |
| CAC-007 | JSON corrupto se captura | | | NO INICIADO | |
| CAC-008 | Solo se elimina la clave corrupta | | | NO INICIADO | |
| CAC-009 | Datos cacheados muestran aviso visible | | | NO INICIADO | |
| PRO-001 | No existe alert() en código ejecutable | | | NO INICIADO | |
| PRO-002 | No existe location.reload() en código ejecutable | | | NO INICIADO | |
| PRO-003 | Búsqueda excluye Markdown y documentación | | | NO INICIADO | |
| PRO-004 | Fetch directo limitado a lugares permitidos | | | NO INICIADO | |
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
| TIME-001 | Pide todos los partidos una sola vez | | | NO INICIADO | |
| TIME-002 | Ordena cronológicamente | | | NO INICIADO | |
| TIME-003 | Inserta bloques de 10 | | | NO INICIADO | |
| TIME-004 | Usa IntersectionObserver | | | NO INICIADO | |
| TIME-005 | Usa centinela al final | | | NO INICIADO | |
| TIME-006 | No pagina la petición HTTP | | | NO INICIADO | |
| TIME-007 | Evita duplicados con ID estable | | | NO INICIADO | |
| TIME-008 | Desconecta observer al terminar | | | NO INICIADO | |
| TIME-009 | Fallo inicial no deja observer esperando | | | NO INICIADO | |
| TIME-010 | Fallo inicial muestra estado de error | | | NO INICIADO | |
| TIME-011 | Existe botón de reintento manual | | | NO INICIADO | |
| TIME-012 | Reintento manual dispara backoff | | | NO INICIADO | |
| TIME-013 | Recuperación reinicia desde el principio | | | NO INICIADO | |
| TIME-014 | Recuperación no duplica partidos | | | NO INICIADO | |
| FAN-001 | Obtiene teams | | | NO INICIADO | |
| FAN-002 | Obtiene games | | | NO INICIADO | |
| FAN-003 | Obtiene groups | | | NO INICIADO | |
| FAN-004 | Selector único de equipo favorito | | | NO INICIADO | |
| FAN-005 | Favorito se guarda en localStorage | | | NO INICIADO | |
| FAN-006 | Favorito se restaura tras recarga | | | NO INICIADO | |
| FAN-007 | Filtra solo partidos del favorito | | | NO INICIADO | |
| FAN-008 | Cruza favorito con grupo | | | NO INICIADO | |
| FAN-009 | Muestra puntos | | | NO INICIADO | |
| FAN-010 | Muestra goles a favor | | | NO INICIADO | |
| FAN-011 | Muestra goles en contra | | | NO INICIADO | |
| FAN-012 | Repinta variables CSS | | | NO INICIADO | |
| FAN-013 | Mantiene contraste legible | | | NO INICIADO | |
| FAN-014 | Sin API usa snapshot del favorito | | | NO INICIADO | |
| FAN-015 | Snapshot muestra datos no actualizados | | | NO INICIADO | |
| FAN-016 | Dashboard nunca queda vacío | | | NO INICIADO | |
| MAT-001 | Obtiene groups | | | NO INICIADO | |
| MAT-002 | Obtiene teams | | | NO INICIADO | |
| MAT-003 | Obtiene games | | | NO INICIADO | |
| MAT-004 | Construye 12 matrices | | | NO INICIADO | |
| MAT-005 | Cada matriz es 4x4 | | | NO INICIADO | |
| MAT-006 | Filas representan equipos del grupo | | | NO INICIADO | |
| MAT-007 | Columnas representan equipos del grupo | | | NO INICIADO | |
| MAT-008 | Cruza grupos con equipos | | | NO INICIADO | |
| MAT-009 | Cruza equipos con partidos | | | NO INICIADO | |
| MAT-010 | Partido jugado muestra resultado | | | NO INICIADO | |
| MAT-011 | Partido no jugado muestra Pendiente | | | NO INICIADO | |
| MAT-012 | Diagonal está deshabilitada visualmente | | | NO INICIADO | |
| MAT-013 | Diagonal está marcada semánticamente | | | NO INICIADO | |
| MAT-014 | Vista es usable en móvil | | | NO INICIADO | |
| MAT-015 | Sin games dibuja matriz completa | | | NO INICIADO | |
| MAT-016 | Sin games todas las celdas quedan Pendiente | | | NO INICIADO | |
| MAT-017 | Conserva referencias a celdas | | | NO INICIADO | |
| MAT-018 | Recuperación actualiza solo celdas afectadas | | | NO INICIADO | |
| MAT-019 | Recuperación no reconstruye tablas | | | NO INICIADO | |
| TST-001 | Servidor local usa Node nativo | | | NO INICIADO | |
| TST-002 | /test/401 devuelve HTTP 401 real | | | NO INICIADO | |
| TST-003 | /test/429 devuelve HTTP 429 real | | | NO INICIADO | |
| TST-004 | /test/500 devuelve HTTP 500 real | | | NO INICIADO | |
| TST-005 | 429 falla N veces y luego recupera | | | NO INICIADO | |
| TST-006 | 500 falla N veces y luego recupera | | | NO INICIADO | |
| TST-007 | /test/reset limpia contadores | | | NO INICIADO | |
| TST-008 | Modo de pruebas está desactivado por defecto | | | NO INICIADO | |
| TST-009 | Modo de pruebas muestra insignia | | | NO INICIADO | |
| TST-010 | Producción conserva API real | | | NO INICIADO | |
| DEF-001 | Guía explica flujo general | | | NO INICIADO | |
| DEF-002 | Guía lista endpoints por módulo | | | NO INICIADO | |
| DEF-003 | Guía lista campos reales cruzados | | | NO INICIADO | |
| DEF-004 | Guía copia retos casi literalmente | | | NO INICIADO | |
| DEF-005 | Guía responde qué pasa si falla por módulo | | | NO INICIADO | |
| DEF-006 | Guía explica 401 | | | NO INICIADO | |
| DEF-007 | Guía explica 429 | | | NO INICIADO | |
| DEF-008 | Guía explica 500 | | | NO INICIADO | |
| DEF-009 | Guía explica JWT expirado con observer | | | NO INICIADO | |
| DEF-010 | Guía explica clics repetidos | | | NO INICIADO | |
| DEF-011 | Guía explica caché corrupta | | | NO INICIADO | |
| DEF-012 | Guía explica actualización parcial de matriz | | | NO INICIADO | |
| DEV-001 | 401 se reproduce en Console | | | NO INICIADO | |
| DEV-002 | 401 se reproduce en Network | | | NO INICIADO | |
| DEV-003 | 429 y reintentos se observan en Network | | | NO INICIADO | |
| DEV-004 | Countdown 429 se observa en UI | | | NO INICIADO | |
| DEV-005 | 500 y reintentos se observan en Network | | | NO INICIADO | |
| DEV-006 | Offline con caché se demuestra | | | NO INICIADO | |
| DEV-007 | Offline sin caché se demuestra | | | NO INICIADO | |
| QA-001 | Aplicación inicia sin errores de sintaxis | | | NO INICIADO | |
| QA-002 | Responsive verificado | | | NO INICIADO | |
| QA-003 | Navegación por teclado verificada | | | NO INICIADO | |
| QA-004 | aria-live en estados dinámicos | | | NO INICIADO | |
| QA-005 | prefers-reduced-motion respetado | | | NO INICIADO | |
| QA-006 | No hay listeners duplicados | | | NO INICIADO | |
| QA-007 | No hay observer duplicado | | | NO INICIADO | |
| QA-008 | No hay intervalos huérfanos | | | NO INICIADO | |
| QA-009 | No hay archivos o dependencias innecesarias | | | NO INICIADO | |
| QA-010 | README contiene comandos exactos | | | NO INICIADO | |

## Especificaciones transversales agregadas

| ID | Requisito | Archivo y funcion | Evidencia | Estado | Gap |
|---|---|---|---|---|---|
| SPEC-ACC-001 | Accesibilidad e inclusion son objetivo transversal obligatorio | `docs/ACCESIBILIDAD_SEGURIDAD_SPEC.md` | Spec define ACC-001..ACC-012 y Definition of Done | IMPLEMENTADO | Pendiente auditar cada modulo contra la spec. |
| SPEC-SEC-001 | Seguridad y privacidad son objetivo transversal obligatorio | `docs/ACCESIBILIDAD_SEGURIDAD_SPEC.md` | Spec define SEC-HARD-001..SEC-HARD-010 | IMPLEMENTADO | Pendiente ejecutar auditoria final de headers, storage y rutas. |
| SPEC-RES-001 | Resiliencia tipo "intumbable" se define como degradacion segura, contencion de fallos y recuperacion sin recarga | `docs/ACCESIBILIDAD_SEGURIDAD_SPEC.md` | Spec define RES-001..RES-008 | IMPLEMENTADO | Pendiente Playwright por modulo para validar comportamiento real. |
| QA-011 | Elementos con `hidden` no ocupan layout ni foco | `css/styles.css` (`[hidden]`) | `test/static-contract.test.mjs` verifica `display: none !important` | IMPLEMENTADO | |
