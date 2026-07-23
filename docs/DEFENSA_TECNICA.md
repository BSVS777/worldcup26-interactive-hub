# Guía de defensa técnica

## 1. Mapa mental del proyecto

```
Evento → Estado → API → Normalización → Caché → Render → Recuperación
```

- **Evento**: clic, hashchange, submit del login, tick de un `setInterval`. Se captura en `js/app.js` (listeners de nivel shell) o dentro de cada `js/*-view.js` (listeners de módulo).
- **Estado**: cada módulo tiene un reducer puro (`js/tour.js`, `js/agenda.js`, `js/timeline.js`, `js/fan-dashboard.js`, `js/matrix.js`) que transforma `(state, action) → nuevo state`. El estado global de ruta/sesión vive en `js/router.js`.
- **API**: `js/api.js:createApiClient` — un único cliente HTTP central. Todas las vistas pasan por `apiRequest(endpointKey, options)`, nunca `fetch()` directo.
- **Normalización**: `js/normalizers.js:normalizePayload` — convierte el JSON crudo de la API en la forma interna estable que usan los reducers (nunca se confía en el shape crudo).
- **Caché**: `js/cache.js` — `localStorage` con clave por endpoint, versión y timestamp; `js/api.js:cachedResult` decide cuándo usarla como fallback.
- **Render**: cada `js/*-view.js` toma el estado y lo pinta en el DOM real (creación de nodos, nunca `innerHTML`).
- **Recuperación**: `js/api.js` (backoff 429/500), `js/session.js` + `js/app.js:onSessionExpired` (401), `js/retry-status.js` (countdown visible global).

## 2. Explicación de 30 segundos

"Es un hub de cinco vistas del Mundial 2026 — tour de sedes, agenda simultánea, timeline infinito, dashboard de equipo favorito y matriz de grupos — todas alimentadas por la misma API pública real, a través de un único cliente HTTP que centraliza reintentos, caché y manejo de sesión. Si la red falla, la app se degrada con datos cacheados o mensajes locales, nunca con una pantalla en blanco ni un `reload()`."

## 3. Explicación de 2 minutos

**Problema que resuelve:** practicar manipulación avanzada del DOM (scroll programático, IntersectionObserver, layouts divididos, tematización dinámica) sobre datos reales, con una arquitectura de resiliencia que no se rompe ante errores HTTP.

**Los cinco módulos:** Tour (scrollIntoView + estado activo), Agenda (agrupación por fecha + columnas simultáneas), Timeline (scroll infinito con IntersectionObserver, sin paginar HTTP), Fan Dashboard (favorito persistido + tematización con variables CSS), Matrix (12 tablas 4×4 con actualización selectiva de celdas).

**Cliente HTTP central:** `js/api.js` es el único lugar que llama `fetch()` para datos; agrega el Bearer si hay sesión, normaliza la respuesta, cachea, y clasifica cada error (401/429/500/red).

**Resiliencia:** backoff exponencial 1s/2s/4s para 429/500 (máximo 4 intentos), countdown visible tanto en Timeline como globalmente para cualquier otro módulo (`js/retry-status.js`), caché de respaldo por endpoint, y manejo de 401 sin recargar la página.

**DOM avanzado:** cada módulo tiene su técnica específica, todas implementadas sin frameworks — vanilla JS con creación de nodos.

**Seguridad:** JWT solo en memoria (nunca en `localStorage`), todo el texto de la API se renderiza con `textContent`/creación de nodos, catálogo de endpoints allowlisted (no se acepta URL arbitraria).

**Accesibilidad:** landmarks semánticos, foco gestionado tras acciones, `aria-live` en estados dinámicos, contraste medido numéricamente (incluyendo un bug real de contraste encontrado y corregido en esta pasada de pulido).

## 4. Preguntas probables (40+)

Formato: pregunta → respuesta 15s → respuesta 30s → archivo/función → prueba → error común a evitar.

1. **¿Qué pasa si `/get/games` devuelve 500?**
   15s: El cliente reintenta automáticamente 4 veces con backoff 1s/2s/4s; si se agotan, usa caché si existe o muestra un error recuperable.
   30s: `apiRequest` clasifica cualquier 429/500 como reintentable, espera el backoff, y en el intento 4 revisa `cachedResult()`. Si hay caché, la devuelve con `stale:true`; si no, lanza un `ApiError` recuperable que cada vista traduce a su propio mensaje local sin bloquear el resto de la navegación.
   Archivo: `js/api.js:apiRequest` (líneas ~195-217).
   Prueba: `test/api.test.mjs` → "retries 500 four total attempts, then falls back to the endpoint cache".
   Error común: decir que "la app se cae" — no, se degrada con contenido.

2. **¿Por qué async/await y no `.then()`/`.catch()`?**
   15s: Es requisito absoluto del laboratorio; además hace el flujo de reintentos secuencial (`for` + `await sleep()`) mucho más legible que una cadena de promesas anidadas.
   30s: Con `.then()` anidados, expresar "reintentar hasta 4 veces con espera creciente y luego decidir entre caché o error" requiere recursión o un wrapper adicional; con `async/await` es un `for` simple con un `await sleep(delayMs, signal)` dentro. Además permite usar `try/catch` normal para diferenciar error de red vs HTTP.
   Archivo: `js/api.js:apiRequest`.
   Prueba: `test/static-contract.test.mjs` escanea el runtime y falla si encuentra `.then(`/`.catch(`.
   Error común: no saber explicar la diferencia práctica, solo repetir "porque lo pide la consigna".

3. **¿Por qué no `.then()`?**
   15s: Prohibición absoluta del laboratorio; conviven mal con `async/await` y generan cadenas confusas de manejo de error.
   30s: Ver pregunta 2. Además, mezclar `.then()` con `await` en el mismo archivo es explícitamente una de las prohibiciones que reduce la nota a 0 en ese rubro.
   Archivo: cualquiera en `js/`.
   Prueba: `test/static-contract.test.mjs`.
   Error común: justificarlo solo por la regla, sin la razón técnica (legibilidad del control de flujo con reintentos).

4. **¿Por qué no `reload()`?**
   15s: Porque destruiría todo el estado de la SPA (ruta actual, formularios, observers activos) y es la prohibición explícita del laboratorio para resolver sesión expirada.
   30s: `js/app.js:onSessionExpired` resetea los módulos (`resetModuleViews()`), actualiza el estado de ruta a `SESSION_EXPIRED` y muestra el modal — todo sin perder la URL/hash actual, así que al reautenticarse la vista vuelve exactamente donde estaba.
   Archivo: `js/app.js:onSessionExpired`, `js/router.js:reduceViewState` (caso `SESSION_EXPIRED`).
   Prueba: `test/shell.test.mjs` → "view-state reducer handles navigation and session recovery without reload".
   Error común: decir "porque se pierde el scroll" sin mencionar que también se perderían observers activos e in-flight requests.

5. **¿Qué sucede cuando expira el JWT?**
   15s: `session.getToken()` detecta el `exp` vencido, invalida el token localmente, y la siguiente petición sale sin `Authorization`.
   30s: `js/session.js:isUsableJwt` decodifica el payload del JWT y compara `exp` contra `now()`; si venció, `invalidateSession()` limpia el token en memoria antes de que la petición siquiera salga. Si en cambio el servidor responde 401 con un token que el cliente creía válido, `api.js` llama `session.clearIfToken()` y notifica una sola vez a `onSessionExpired`.
   Archivo: `js/session.js:getToken`, `js/api.js` (rama `response.status === 401`).
   Prueba: `test/session.test.mjs` → "expires an in-memory JWT when exp is no longer in the future"; `test/api.test.mjs` → "reports expiration when the request token expires locally before its 401 arrives".
   Error común: pensar que el servidor es el único que puede invalidar el token — el cliente también lo hace proactivamente.

6. **¿Qué sucede con el observer del Timeline cuando expira el token?**
   15s: `onSessionExpired` llama `resetModuleViews()`, que incluye `timelineView.reset()`, y eso desconecta el `IntersectionObserver` activo antes de mostrar el modal.
   30s: El orden importa: `resetModuleViews()` se ejecuta ANTES de actualizar el estado de sesión y enfocar el modal, precisamente para que el observer no siga disparando `showNextBatch()` mientras la sesión ya está inválida.
   Archivo: `js/app.js:onSessionExpired`, `js/timeline-view.js:reset`/`disconnectObserver`.
   Prueba: `test/timeline.test.mjs` → "timeline reset disconnects an active IntersectionObserver before session recovery continues".
   Error común: no saber el ORDEN exacto de las operaciones (reset antes que el modal).

7. **¿Cómo evitas duplicados en Timeline?**
   15s: `uniqueSortedGames()` deduplica por `id` real usando un `Map`, y lo hace tanto en la carga inicial como en cualquier recuperación posterior.
   30s: Cada `DATA_LOADED` reconstruye el arreglo completo desde cero pasando por `uniqueSortedGames`, así que reintentos o recuperaciones nunca acumulan sobre datos previos — siempre parten del payload fresco deduplicado y ordenado.
   Archivo: `js/timeline.js:uniqueSortedGames`.
   Prueba: `test/timeline.test.mjs` → "timeline data is sorted, deduped, and initially exposes the first batch of ten".
   Error común: confundir esto con deduplicación de requests (son cosas distintas: acá es deduplicación de datos, no de llamadas HTTP).

8. **¿Cómo funciona el backoff?**
   15s: Array fijo `[1000, 2000, 4000]` ms indexado por intento; en 429 además respeta `Retry-After` si es mayor.
   30s: `BACKOFF_MS[attempt-1]` dentro de un `for` de máximo 4 intentos; para 429 se calcula también `retryAfterMilliseconds()` del header del servidor y se usa `Math.max(backoffMs, retryAfterMs)` — el mayor de los dos gana, nunca se acelera por debajo de lo que pide el servidor.
   Archivo: `js/api.js:BACKOFF_MS`, `retryAfterMilliseconds`.
   Prueba: `test/api.test.mjs` → "retries 429 exactly with 1s, 2s, 4s backoff and honors a larger Retry-After".
   Error común: decir que el backoff es "exponencial calculado" — en realidad es una tabla fija de 3 valores, más simple y más fácil de razonar/testear.

9. **¿Cómo distingues caché y red?**
   15s: `apiRequest` devuelve `{ data, source, stale, cachedAt }`; `source` es `'network'` o `'cache'`, y `stale` es `true` solo cuando viene de caché.
   30s: Cada vista lee `result.stale` para decidir si mostrar el aviso "cached data"/"datos no actualizados"; la caché en sí vive en `js/cache.js` con clave por endpoint+versión+timestamp, separada de la lógica de red.
   Archivo: `js/api.js:cachedResult`, `js/cache.js:readEndpointCache`.
   Prueba: `test/api.test.mjs` → "uses cache immediately on a network error and otherwise returns a recoverable typed error".
   Error común: pensar que hay un flag booleano simple "usando caché sí/no" en el estado global — en realidad viaja en cada respuesta individual.

10. **¿Cómo actualizas solamente las celdas de la Matrix?**
    15s: `matrix-view.js` guarda referencias reales a cada `<td>` en un `Map` (`cellRefs`), y `updateCells()` solo cambia `textContent`/atributos de esas referencias, sin tocar el DOM de la tabla.
    30s: `render()` compara una `structureKey` (ids de grupo + equipos) contra la anterior; si la estructura no cambió, se salta `renderStructure()` (que reconstruye el DOM) y solo llama `updateCells()`. Así una recuperación de red no reconstruye las 12 tablas, solo actualiza el contenido de las celdas afectadas.
    Archivo: `js/matrix-view.js:render`, `cellRefs`, `updateCells`.
    Prueba: `test/matrix.test.mjs` (cobertura de refresh parcial).
    Error común: decir que se "vuelve a pintar todo" — la clave del diseño es justamente que NO se reconstruye si la estructura es la misma.

11. **¿Qué ocurre con clics rápidos en Tour?**
    15s: `reduceTourState` con `VENUE_SELECTED` es idempotente — seleccionar la misma sede dos veces devuelve el mismo `state` (por referencia), así que no hay refetch ni duplicado.
    30s: `selectVenue()` no dispara ninguna petición de red (los datos ya están en memoria desde `load()`); solo cambia `selectedVenueId` y re-renderiza el detalle, por lo que clics repetidos son baratos y seguros.
    Archivo: `js/tour.js:reduceTourState` (caso `VENUE_SELECTED`).
    Prueba: `test/tour.test.mjs` → "clicking the same venue twice does not re-fetch or duplicate rendered content".
    Error común: no distinguir esto de Timeline/Agenda, donde si hay guards de generación distintos.

12. **¿Por qué el JWT está en memoria y no en `localStorage`?**
    15s: Para reducir el impacto de un XSS — si un script malicioso logra ejecutar, no puede leer el token desde `localStorage` porque nunca vive ahí.
    30s: `js/session.js` guarda el token en una variable de closure (`memoryToken`), nunca lo serializa a ningún storage persistente; además limpia proactivamente cualquier token legado que pudiera existir en `sessionStorage` de versiones anteriores. El costo es que recargar la página exige volver a iniciar sesión — una compensación aceptada explícitamente.
    Archivo: `js/session.js:createSessionStore`.
    Prueba: `test/session.test.mjs` → "keeps JWT only in memory and clears any legacy persisted token"; `tools/session-storage-audit.py`.
    Error común: decir que "no se puede robar el token" — sí se puede si hay XSS activo mientras la sesión sigue viva (el token sigue en memoria mientras la página no se recarga); memoria reduce la superficie, no la elimina.

13. **¿Cómo evitas XSS?**
    15s: Todo el texto proveniente de la API/caché se asigna con `textContent` o se construyen nodos DOM explícitos — nunca `innerHTML`/`insertAdjacentHTML` con datos externos.
    30s: `js/normalizers.js` convierte los campos crudos a un modelo interno antes de que lleguen a cualquier vista, y cada `*-view.js` usa `document.createElement` + `.textContent` para pintarlos. Ningún dato de red se interpreta como HTML en ningún punto del código ejecutable.
    Archivo: cualquier `js/*-view.js`.
    Prueba: `test/static-contract.test.mjs` escanea el runtime por `innerHTML`/`insertAdjacentHTML`.
    Error común: olvidar mencionar que también aplica a nombres de equipos/sedes que vienen de la API (no son "datos seguros" solo porque parecen texto plano).

14. **¿Qué contradicción existe con la API pública?**
    15s: El enunciado exige Bearer en cada request de datos, pero la API real permite leer `stadiums/games/teams/groups` sin token.
    30s: `npm run test:live-api` confirma que los 4 GET públicos responden datos reales sin ningún header de autorización. El cliente sigue agregando el Bearer si existe una sesión, pero no lo fabrica ni lo exige para leer — documentado como contradicción externa en `README.md` y `docs/MATRIZ_CUMPLIMIENTO.md` (filas API-001..003), con evidencia adicional de que `/auth/authenticate` tampoco tiene una vía pública de registro de cuentas.
    Archivo: `README.md` (sección "Gaps conocidos"), `docs/MATRIZ_CUMPLIMIENTO.md`.
    Prueba: `tools/live-api-probe.mjs` (`npm run test:live-api`).
    Error común: intentar ocultar o minimizar esta contradicción en vez de mostrarla con evidencia — es más defendible mostrarla que fingir que no existe.

15. **¿Por qué no inventaste un Bearer falso?**
    15s: Porque enviar un token fabricado sería mentirle a la evaluación — el requisito es demostrar un contrato JWT real, no simular que existe.
    30s: En cambio se construyó un contrato académico 100% real contra el servidor determinista local (`tools/test-server.mjs`): login real, token real firmado con `exp`, Bearer real exigido y rechazado si falta, verificado extremo a extremo en `test/auth-contract.test.mjs` sin ningún fetch simulado. Es la alternativa honesta cuando la API pública no ofrece cuentas.
    Archivo: `test/auth-contract.test.mjs`, `tools/test-server.mjs`.
    Prueba: `test/auth-contract.test.mjs` (las 2 pruebas end-to-end).
    Error común: no poder explicar la diferencia entre "Bearer real contra servidor de pruebas real" vs "Bearer inventado" — la clave es que el servidor de pruebas SÍ es una implementación real de HTTP, no un mock en memoria.

16. **¿Qué código controla cada comportamiento?** (pregunta comodín — practicar señalar en vivo)
    15s: Backoff/reintentos → `js/api.js`. Sesión → `js/session.js` + `js/app.js`. Countdown → `js/retry-status.js` + `js/timeline-view.js`. Caché → `js/cache.js`. Cada vista → su propio `js/*-view.js`.
    30s: (mostrar cada archivo abierto en el editor mientras se nombra su responsabilidad — ver sección 5).
    Archivo: todos los anteriores.
    Prueba: la suite completa (`npm test`, 157 casos).
    Error común: no tener los archivos ya abiertos en pestañas antes de la defensa.

17. **¿Qué pasa si `Retry-After` es mayor que el backoff calculado?**
    15s: Gana el mayor de los dos — `Math.max(backoffMs, retryAfterMs)`.
    30s: El backoff fijo (1s/2s/4s) es un piso, no un techo; si el servidor pide esperar más vía `Retry-After`, el cliente respeta ese tiempo mayor en vez de reintentar antes de tiempo y arriesgarse a otro 429.
    Archivo: `js/api.js` (línea del cálculo de `delayMs`).
    Prueba: `test/api.test.mjs` → "retries 429 exactly with 1s, 2s, 4s backoff and honors a larger Retry-After".
    Error común: decir que se ignora el backoff propio — no, se compara y gana el mayor.

18. **¿Por qué cuatro intentos, no más ni menos?**
    15s: Es la combinación exacta de 3 backoffs (1s/2s/4s) + el intento inicial = 4 intentos totales, un número acotado y predecible.
    30s: Con 4 intentos el peor caso de espera bruta es 7 segundos (1+2+4) antes de caer a caché/error — suficientemente corto para no bloquear al usuario indefinidamente, pero suficiente para absorber fallos transitorios reales de red/servidor.
    Archivo: `js/api.js:apiRequest` (`for (let attempt = 1; attempt <= 4; ...)`).
    Prueba: `test/api.test.mjs` → pruebas parametrizadas para 429 y 500 con exactamente 4 llamadas.
    Error común: no saber el número exacto o confundir "4 reintentos" con "4 intentos totales" (son 3 reintentos + 1 intento original).

19. **¿Qué pasa si un grupo no tiene 4 equipos?**
    15s: La matriz se construye igual, con la cantidad real de equipos; el caption de la tabla lo declara explícitamente en vez de fingir 4×4.
    30s: `matrix.js:buildGroupMatrices` usa `groupTeams.length` real (no asume 4), y expone `completeFourByFour` para que la vista use un caption distinto ("...with N listed teams") cuando el grupo no trae exactamente 4.
    Archivo: `js/matrix.js:buildGroupMatrices`, `js/matrix-view.js` (caption).
    Prueba: `test/matrix.test.mjs`.
    Error común: asumir que la app crashearía o mostraría celdas vacías — se adapta al tamaño real.

20. **¿Qué evita que el observer se registre varias veces?**
    15s: `syncObserver()` siempre llama `disconnectObserver()` primero, así que nunca hay dos observers activos sobre el mismo sentinel.
    30s: Cada `render()` de Timeline llama `syncObserver()`, que desconecta cualquier observer previo antes de crear uno nuevo (o de decidir no crear ninguno si ya no hay más lotes). Esto es más simple que llevar un flag "¿ya está observando?" y es imposible de duplicar por construcción.
    Archivo: `js/timeline-view.js:syncObserver`.
    Prueba: `test/timeline.test.mjs` → prueba con `FakeIntersectionObserver` que cuenta instancias creadas.
    Error común: pensar que hace falta un guard adicional — el disconnect-then-create ya lo resuelve.

21. **¿Qué evita intervalos huérfanos?**
    15s: Tanto el countdown de Timeline como el countdown global se limpian explícitamente en recuperación, agotamiento, reset y cambio de sesión — nunca queda un `setInterval` corriendo sin dueño.
    30s: Timeline usa un contador de `generation` — si el intervalo dispara pero la vista ya avanzó de generación, se autolimpia. El controlador global (`retry-status.js`) reemplaza cualquier intervalo activo antes de crear uno nuevo y `clear()` se llama explícitamente en `resetModuleViews()` (cambio de sesión/reset de vistas).
    Archivo: `js/timeline-view.js:clearRetryCountdown`, `js/retry-status.js:clear`, `js/app.js:resetModuleViews`.
    Prueba: `test/timeline.test.mjs` → "timeline reset clears an active retry countdown before stale recovery resolves"; `test/retry-status.test.mjs` → "clear stops the timer and emits null exactly once".
    Error común: no saber diferenciar el mecanismo de Timeline (generation counter) del mecanismo global (replace-on-notify + clear explícito).

22. **¿Qué pasa si la API devuelve HTML en vez de JSON?**
    15s: `hasJsonContentType()` revisa el `Content-Type` real de la respuesta antes de intentar parsear; si no es JSON, se trata como error tipado (con fallback a caché si existe).
    30s: Incluso si el `Content-Type` dice JSON pero el body no parsea, `readJson()` captura el `SyntaxError` y lo convierte en un `ApiError` con fallback a caché — nunca se deja que una excepción de parseo no controlada rompa la vista.
    Archivo: `js/api.js:hasJsonContentType`, `readJson`.
    Prueba: `test/api.test.mjs` → "falls back to endpoint cache when a successful response contains invalid JSON".
    Error común: no distinguir "Content-Type incorrecto" (rechazado antes de intentar parsear) de "JSON inválido pese a Content-Type correcto" (capturado al parsear) — el código maneja ambos casos por separado.

23. **¿Qué pasa si el usuario cambia de ruta durante un backoff?**
    15s: Cada vista tiene su propio guard de "generación" — si la ruta cambia y la vista se resetea, la respuesta tardía del backoff anterior se descarta sin pisar el estado nuevo.
    30s: `loadable-view.js:createLoadableView` incrementa `generation` en cada `reset()`; cuando el `loadFn` async finalmente resuelve, revisa `isCurrent()` antes de aplicar el resultado. Si ya no es la generación activa, la actualización se descarta silenciosamente.
    Archivo: `js/loadable-view.js:ensureLoaded`, `reset`.
    Prueba: `test/tour.test.mjs` → "a stale in-flight load never overwrites a fresher load (race condition fix)".
    Error común: pensar que hace falta cancelar la petición HTTP en curso — el diseño simplemente ignora el resultado tardío, no necesita AbortController para esto (limitación reconocida, ver pregunta 40).

24. **¿Qué sucede con caché corrupta?**
    15s: `readEndpointCache` valida versión, endpoint, timestamp ISO y presencia del campo `data`; si algo no calza, borra solo esa clave y trata la lectura como un cache-miss.
    30s: La corrupción nunca rompe la app — se degrada a "no hay caché para este endpoint" y sigue el flujo normal (red o error). Solo se elimina la clave inválida, no todo `localStorage`.
    Archivo: `js/cache.js:readEndpointCache`.
    Prueba: `test/cache.test.mjs` (entradas corruptas/versión incorrecta).
    Error común: decir que se limpia todo el localStorage — solo se borra la entrada afectada.

25. **¿Qué pasa si falla `teams` pero `games` funciona?** (Agenda/Matrix/Fan Dashboard)
    15s: Los nombres de equipo se muestran como "Unknown team"/`null`, pero los partidos y resultados siguen visibles — no se bloquea toda la vista por el fallo de un solo endpoint.
    30s: Cada `load()` usa `Promise.all` de fetches independientes (`loadable.fetchOrFallback`), y cada uno reporta su propio `failed` — los reducers combinan lo que sí llegó con marcadores explícitos de lo que falló, en vez de descartar toda la respuesta si un solo endpoint cae.
    Archivo: `js/agenda.js:crossReferenceGame`, `js/matrix.js:teamsForGroup`.
    Prueba: `test/tour.test.mjs` → "marks both stadiumsFailed and gamesFailed when both fetches failed" (mismo patrón en los otros módulos).
    Error común: asumir que un fallo parcial tira toda la vista a un estado de error total.

26. **¿Qué ocurre si llegan dos respuestas en orden inverso?**
    15s: El guard de generación descarta cualquier respuesta que no pertenezca a la carga más reciente, sin importar el orden de llegada.
    30s: No es un guard "por timestamp de respuesta" sino "por generación de carga" — si el usuario disparó dos cargas seguidas, solo la última generación puede escribir estado, aunque la primera petición (más vieja) responda después.
    Archivo: `js/loadable-view.js:ensureLoaded`/`isCurrent`.
    Prueba: `test/tour.test.mjs` → "a stale in-flight load never overwrites a fresher load".
    Error común: confundir esto con un problema resuelto por AbortController — se resuelve con lógica de estado, no cancelación de red.

27. **¿Cómo sabés que no hay `alert()`/`.then()`/`.catch()`/`reload()` en todo el proyecto?**
    15s: `test/static-contract.test.mjs` escanea el código ejecutable con expresiones regulares y falla la suite si encuentra cualquiera de esos patrones fuera de tests/docs.
    30s: Es parte de `npm test` — corre en cada ejecución, así que cualquier regresión accidental (por ejemplo, un `.then()` agregado sin querer) rompe la build antes de llegar a la defensa.
    Archivo: `test/static-contract.test.mjs`.
    Prueba: la misma.
    Error común: decir "lo revisé a mano" — la evidencia real es que hay un test automatizado, no una revisión manual puntual.

28. **¿Qué pasa si el 401 llega mientras el usuario ya inició sesión de nuevo (token viejo vs token nuevo)?**
    15s: Solo se invalida la sesión si el 401 corresponde exactamente al token que la disparó — un 401 tardío de un token viejo no puede tirar abajo una sesión nueva ya autenticada.
    30s: `session.clearIfToken(expectedToken)` compara el token actual contra el que causó el 401; si no coinciden (porque hubo un login nuevo mientras la request vieja seguía en vuelo), no hace nada.
    Archivo: `js/session.js:clearIfToken`.
    Prueba: `test/api.test.mjs` → "does not let a late 401 for an old bearer token clear a newly authenticated session".
    Error común: no anticipar esta pregunta de condición de carrera — es una de las más específicas y reveladoras de comprensión real.

29. **¿Por qué `testMode` no se puede activar en producción?**
    15s: `isTestMode()`/`resolveApiBaseUrl()` solo activan el servidor local si el origen es exactamente `localhost`/`127.0.0.1` sobre HTTP(S) — cualquier otro dominio ignora el parámetro `testMode=1`.
    30s: Es una doble verificación: primero el protocolo+hostname (`isLocalOrigin`), luego el flag exacto en la query string. Un atacante que agregue `?testMode=1` a la URL de producción simplemente no logra nada — la app sigue apuntando a la API real.
    Archivo: `js/config.js:isLocalOrigin`, `isTestMode`, `resolveApiBaseUrl`.
    Prueba: `test/config.test.mjs` → "uses the same-origin proxy only for local HTTP app origins unless exact local test mode is enabled".
    Error común: no saber que hay DOS chequeos (origen Y flag exacto), no solo uno.

30. **¿Cómo se prueba el contrato de Bearer sin usar la API viva?**
    15s: Contra un servidor determinista real (`tools/test-server.mjs`, HTTP real en un puerto local), no un mock — login real, token real, Bearer exigido y rechazado de verdad.
    30s: `test/auth-contract.test.mjs` levanta el servidor real, usa el cliente real (`createApiClient` sin fetch simulado), autentica, y confirma que los 4 endpoints de datos solo responden 200 con el Bearer correcto — y confirma un 401 real si no hay token. Es la prueba más fuerte posible sin depender de una cuenta en la API pública.
    Archivo: `test/auth-contract.test.mjs`, `tools/test-server.mjs`.
    Prueba: la misma.
    Error común: decir que esto "prueba la API real" — no, prueba el contrato académico local; la API viva sigue sin cuenta verificada (ver pregunta 14).

31. **¿Cómo el countdown global evita mostrar dos avisos contradictorios a la vez?**
    15s: `js/retry-status.js` mantiene un solo temporizador activo — cualquier `notify()` nuevo reemplaza (no apila) el anterior.
    30s: Además, cuando una vista ya tiene su propio countdown dedicado (Timeline), su evento se marca `silent:true` para que el banner global no repita el mismo aviso con otra redacción — un solo mensaje visible por evento, nunca dos compitiendo.
    Archivo: `js/retry-status.js:notify`, `js/api.js:emitRetry`.
    Prueba: `test/retry-status.test.mjs` → "a new notify replaces any in-flight countdown instead of running two at once"; `test/api.test.mjs` → prueba del flag `silent`.
    Error común: no poder explicar CÓMO se decide qué vista se queda "silenciosa" (es automático: se deriva de si la vista pasó su propio `onRetry`, no una lista hardcodeada de endpoints).

32. **¿Por qué el backoff no se duplica entre vistas?**
    15s: Porque vive en un solo lugar, `js/api.js:apiRequest` — ninguna vista implementa su propio `setTimeout`/reintento de red.
    30s: Lo único que cada vista puede personalizar es la PRESENTACIÓN del evento de reintento (vía el callback `onRetry`), nunca el cálculo del delay ni el número de intentos — eso es responsabilidad exclusiva del cliente central.
    Archivo: `js/api.js:apiRequest`.
    Prueba: toda la suite de `test/api.test.mjs` (el backoff se prueba una sola vez, centralizado).
    Error común: pensar que Timeline "tiene su propio backoff" — Timeline solo tiene su propia UI de countdown, el backoff es el mismo de siempre.

33. **¿Qué diferencia hay entre `forceRetry` y el reintento automático de 429/500?**
    15s: `forceRetry` es exclusivo del botón de reintento manual ante un fallo de RED (no HTTP); el reintento de 429/500 con backoff ocurre siempre, automáticamente, sin necesidad de ese flag.
    30s: Sin `forceRetry`, un error de red (fetch lanza excepción, no hay respuesta HTTP) usa caché inmediatamente si existe, o falla directo. `forceRetry:true` (botón Retry de Timeline) le dice al cliente "seguí reintentando con backoff aunque sea un fallo de red", útil cuando el usuario sabe que la conexión volvió.
    Archivo: `js/api.js:apiRequest` (rama del catch de fetch).
    Prueba: `test/api.test.mjs` → "forceRetry runs a complete 1s, 2s, 4s sequence for retryable network failures".
    Error común: pensar que `forceRetry` afecta también a 429/500 — esos siempre reintentan automáticamente, con o sin el flag.

34. **¿Cómo sabés que el proyecto no tiene dependencias innecesarias?**
    15s: `package.json` no declara `dependencies` en runtime; `test/static-contract.test.mjs` lo valida automáticamente.
    30s: Cero dependencias de terceros en el cliente — vanilla JS puro, `Response`/`fetch`/`IntersectionObserver` nativos del navegador. Las únicas dependencias de desarrollo son Playwright (auditorías) y Python (scripts de auditoría), ninguna se envía al navegador.
    Archivo: `package.json`.
    Prueba: `test/static-contract.test.mjs` → validación de cero dependencias/lockfiles.
    Error común: confundir "dependencias de test/auditoría" con "dependencias de runtime" — son categorías distintas.

35. **¿Qué pasa si dos clics abren y cierran el drawer móvil rápidamente?**
    15s: El estado del drawer es un simple booleano (`dataset.drawerOpen`) — cada clic lo alterna de forma síncrona, sin animaciones que se puedan pisar de forma inconsistente.
    30s: `setDrawerOpen()` también gestiona el foco: al abrir recuerda el elemento que debe recuperar el foco al cerrar (`drawerRestoreFocus`), y Escape cierra + restaura foco en un solo paso síncrono.
    Archivo: `js/ui.js:setDrawerOpen`.
    Prueba: `tools/mobile-drawer-audit.py` (Playwright, abre/cierra con teclado y mouse).
    Error común: no mencionar la gestión de foco, que es la parte realmente delicada de este flujo.

36. **¿Cómo se garantiza que el modal de sesión atrapa el foco (focus trap)?**
    15s: `trapTabKey()` intercepta Tab/Shift+Tab dentro del modal y lo cicla entre sus elementos focuseables, sin dejar que el foco escape al resto de la página (que además queda `inert`).
    30s: Los "hermanos" del modal (`header`, `nav`, `main`, `footer`, el widget de accesibilidad) se marcan `inert` mientras el modal está activo (`setInert`), así que ni el foco ni los lectores de pantalla pueden alcanzarlos por accidente.
    Archivo: `js/ui.js:setSessionModal`, `js/accessibility.js:trapTabKey`/`setInert`.
    Prueba: `tools/keyboard-audit.py` → `modal_trap=verified`.
    Error común: pensar que alcanza con `role="dialog"` — el trap de foco real y el `inert` del fondo son los que hacen el trabajo pesado.

37. **¿Cómo decidiste qué iba en el banner global vs qué se queda solo en Timeline?**
    15s: Decisión de diseño explícita para no duplicar el mismo aviso dos veces — Timeline ya tenía su countdown dedicado y probado, así que se mantuvo intacto y se lo marcó como fuente silenciosa para el banner nuevo.
    30s: La alternativa (mover todo a un único banner y borrar el countdown de Timeline) habría roto tests existentes que inyectan sus propios timers para verificar el comportamiento de Timeline en aislamiento — se optó por la ruta que agrega cobertura sin romper la existente.
    Archivo: `js/timeline-view.js` (sin cambios), `js/retry-status.js` (nuevo), `js/api.js:emitRetry`.
    Prueba: `test/timeline.test.mjs` (sigue pasando sin cambios) + `test/retry-status.test.mjs` (nuevo).
    Error común: no poder justificar la decisión de diseño — se espera que expliques el trade-off, no solo el código.

38. **¿El proyecto declara cumplimiento WCAG AA completo?**
    15s: No — se declara explícitamente NO conforme hasta completar una auditoría manual con lector de pantalla real, que ningún test automatizado puede reemplazar.
    30s: `docs/ACCESSIBILITY_AUDIT.md` es honesto sobre esto: contraste, teclado, zoom/reflow y aria-live están medidos y verificados con Playwright/cálculo numérico real; lo único que falta es la sesión humana con NVDA/VoiceOver.
    Archivo: `docs/ACCESSIBILITY_AUDIT.md`.
    Prueba: `test/accessibility-contrast.test.mjs` (contraste real, incluidas las 6 paletas dinámicas).
    Error común: afirmar "cumple WCAG AA" sin matices — la honestidad sobre el gap pendiente es parte de lo que se evalúa.

39. **¿Qué bug real encontraron y corrigieron durante el pulido?**
    15s: `.fan-summary` (nombre del equipo en el Dashboard) fallaba contraste WCAG AA en las 6 paletas de equipo porque no tenía un fondo claro debajo, solo el fondo oscuro de la página.
    30s: Se midió el contraste real de las 6 paletas contra el fondo real (ratios 1.88-2.41, bajo el mínimo de 3:1), se corrigió agregando el mismo fondo tipo tarjeta que ya usan otros elementos del sistema de diseño, y se blindó con un test que verifica las 6 paletas reales (antes solo se testeaban los valores por defecto).
    Archivo: `css/styles.css` (`.fan-summary`), `test/accessibility-contrast.test.mjs`.
    Prueba: la misma, más `tools/fan-theme-audit.py`/`tools/responsive-audit.py`/`tools/zoom-reflow-audit.py` re-verificados tras el fix.
    Error común: no tener un ejemplo CONCRETO de un bug real encontrado — mostrar que la pasada de pulido no fue cosmética.

40. **¿Qué NO se implementó y por qué (límites honestos)?**
    15s: No hay `AbortController` real conectado a la señal de cada vista (se usa un guard de generación en su lugar, que logra el mismo resultado práctico); y la autenticación contra la API pública real sigue sin verificar por falta de cuenta.
    30s: Se decidió no agregar AbortController porque el guard de generación ya resuelve el problema real (nunca se pisa estado con una respuesta vieja) sin aumentar la superficie de cambio; y no se fabricó ninguna credencial ni Bearer falso para simular una verificación que no es real.
    Archivo: `js/loadable-view.js` (patrón de generación en vez de abort), `README.md`/`docs/MATRIZ_CUMPLIMIENTO.md` (contradicción JWT documentada).
    Prueba: N/A — es una decisión de alcance, no un comportamiento a testear.
    Error común: que te agarren "inventando" que sí existe algo que no existe — es mejor declarar el límite con criterio que fingir cobertura total.

## 4b. Preguntas sobre registro real y JWT (guion de defensa del gap cerrado)

41. **¿De dónde proviene el JWT?**
    15s: De la API real `https://worldcup26.ir`, emitido por `POST /auth/authenticate` tras un registro real contra `POST /auth/register`.
    30s: El flujo es siempre `js/api.js:register()` → `js/api.js:authenticate()` → `session.setToken()`. `register()` nunca llama `session.setToken` — solo prueba que la cuenta existe; el token que termina en memoria es el que devuelve `authenticate()`, verificado en vivo el 2026-07-23 con `npm run test:live-api:auth` contra la API real.
    Archivo: `js/api.js:register`, `js/api.js:authenticate`, `tools/live-api-auth-probe.mjs`.
    Prueba: `test/api.test.mjs` → "register() then authenticate() stores the token authenticate issued, not the one register returned".
    Error común: decir que el token de `register()` se guarda directamente — el contrato explícito es que NO se guarda ahí.

42. **¿Cómo se demuestra que no fue fabricado?**
    15s: Nunca se usa `btoa()` ni una cadena hardcodeada como token; siempre viene de una respuesta HTTP real y se valida contra el JWT que el servidor realmente firmó.
    30s: `test/static-contract.test.mjs` → "registration never fabricates a session locally" escanea el runtime y falla si aparece `btoa(` o si `register()` llama `session.setToken` directamente. Además `session.setToken()` en `js/session.js` rechaza cualquier cadena que no sea un JWT válido de 3 segmentos con `exp` futuro — no acepta un string arbitrario.
    Archivo: `test/static-contract.test.mjs`, `js/session.js:setToken`.
    Prueba: la misma, más `test/session.test.mjs` → "rejects malformed JWTs".
    Error común: confundir "no lo generamos localmente" con "no lo validamos" — se hacen ambas cosas.

43. **¿Por qué se guarda en memoria?**
    15s: Para reducir el impacto de un XSS — ver pregunta 12 de la sección 4.
    30s: Sin cambios respecto al comportamiento pre-existente: `createSessionStore` en `js/session.js` guarda el token en una variable de closure, nunca en `localStorage`/`sessionStorage`/cookies. El registro no introduce ninguna vía alterna de persistencia.
    Archivo: `js/session.js:createSessionStore`.
    Prueba: `test/session.test.mjs`; `test/api.test.mjs` → las pruebas de registro confirman `sessionStorage.getItem(SESSION_TOKEN_KEY)` sigue siendo `null` después de registrar y autenticar.
    Error común: pensar que el flujo de registro necesita su propio mecanismo de storage — reutiliza exactamente el mismo `session.js`.

44. **¿Por qué no localStorage?**
    15s: Mismo motivo que el login manual — ver pregunta 12 de la sección 4. El registro no cambia esa decisión.
    30s: Si `register()` hubiera guardado su propio token en `localStorage` "por si el login automático fallaba", eso habría sido exactamente el tipo de sesión fabricada/prematura que la consigna prohíbe — por eso el contrato es `register() -> authenticate() -> session.setToken()` y nada más.
    Archivo: `js/api.js:register` (ausencia deliberada de cualquier `setToken`/`setItem`).
    Prueba: `test/static-contract.test.mjs` → "registration never fabricates a session locally".
    Error común: justificar esto solo por la regla del laboratorio sin explicar el riesgo real (sesión válida sin verificar credenciales).

45. **¿Qué pasa al refrescar?**
    15s: Igual que con login manual — el JWT vive solo en memoria, así que recargar borra la sesión y hay que autenticarse de nuevo (con login o con un nuevo registro si aplica).
    30s: No hay ninguna ruta de "recordar sesión tras registro" — inmediatamente después de un registro + login exitosos, si el usuario recarga la página pierde la sesión igual que cualquier otra sesión de este proyecto, por diseño.
    Archivo: `js/session.js` (sin persistencia), `js/app.js` (`createAuthStore()` arranca sin token en cada carga).
    Prueba: `test/session.test.mjs` → "a reload starts anonymous because JWT is memory-only".
    Error común: asumir que el registro "recuerda" al usuario de alguna forma — no lo hace, es una acción puntual.

46. **¿Por qué funciona sin login?**
    15s: Porque los cuatro endpoints públicos de lectura (`stadiums`/`games`/`teams`/`groups`) no exigen Bearer en el servidor real — verificado con `npm run test:live-api`.
    30s: El registro/login siguen siendo una vía de compatibilidad académica para demostrar el contrato JWT completo, no un requisito para leer datos. Esto es exactamente lo que dice el indicador "Modo público · Datos consultados sin sesión JWT" en la interfaz.
    Archivo: `js/config.js:ENDPOINTS`, `js/api.js:apiRequest` (agrega Bearer solo si `session.getToken()` no es null).
    Prueba: `npm run test:live-api`; `test/api.test.mjs` → "fetches public data for a client that has never had a session".
    Error común: decir que el modo público es "un bug" o "una degradación" — es un estado explícito y correcto de la app.

47. **¿Por qué Bearer si los endpoints son públicos?**
    15s: Porque el laboratorio exige demostrar un contrato JWT real de extremo a extremo, y porque el servidor SÍ acepta y usa el Bearer cuando existe (aunque no lo exija).
    30s: `apiRequest` en `js/api.js` sigue agregando `Authorization: Bearer <token>` cada vez que hay una sesión válida — visible en DevTools → Network → Headers en cualquier request a `/get/*` mientras hay sesión activa (ver `docs/EVIDENCIAS_DEFENSA.md`). No enviarlo sería ocultar evidencia del contrato que sí se implementó.
    Archivo: `js/api.js:apiRequest`.
    Prueba: `test/api.test.mjs` → "adds Bearer JWT to every public data endpoint request".
    Error común: pensar que hay que elegir entre "modo público" y "Bearer" — conviven: Bearer se manda cuando hay sesión, se omite cuando no la hay.

48. **¿Diferencia entre servidor real y servidor de pruebas?**
    15s: El servidor real (`https://worldcup26.ir`) es la API de producción, verificada en vivo el 2026-07-23. El servidor de pruebas (`tools/test-server.mjs`) es HTTP real mismo, pero local y determinista, con datos y tokens de fixture que nunca se presentan como reales.
    30s: Ambos implementan el mismo contrato (`/auth/register`, `/auth/authenticate`, `/get/*` con Bearer), lo que permite probar la app contra el servidor local en CI sin depender de la red, y confirmar el mismo comportamiento contra la API real con `tools/live-api-auth-probe.mjs`. El token del servidor de pruebas (`TEST_TOKEN` en `tools/test-server.mjs`) es una fixture claramente de prueba, nunca aparece en documentación como si viniera de producción.
    Archivo: `tools/test-server.mjs`, `tools/live-api-auth-probe.mjs`.
    Prueba: `test/auth-contract.test.mjs` (servidor de pruebas real); `npm run test:live-api:auth` (API real).
    Error común: llamar "mock" al servidor de pruebas — es HTTP real corriendo en un puerto local, no una función simulada en memoria.

49. **¿Qué pasa si el registro funciona pero el login falla?**
    15s: No se crea ninguna sesión. La app muestra "La cuenta fue creada, pero no fue posible iniciar sesión automáticamente. Intenta ingresar manualmente." y vuelve al formulario de login (no al de registro).
    30s: `js/login-controller.js:handleRegister` llama `handleLogin()` (el mismo código que usa el login manual) tras un registro exitoso; si `handleLogin` devuelve `false`, `handleRegister` sobrescribe el mensaje genérico con uno específico, cambia el panel a modo login (`view.setSessionMode('login')`) y nunca toca `session.setToken`. Ambas funciones viven fuera de `js/app.js` (que solo instancia el controlador) precisamente para poder probarlas con `node:test` sin un DOM real. El caso está probado explícitamente porque es la prueba "no fake session" más importante del cambio.
    Archivo: `js/login-controller.js:handleRegister`.
    Prueba: `test/api.test.mjs` → "a successful register followed by a failed automatic login creates no session at all".
    Error común: asumir que como el registro "funcionó" debería haber alguna sesión parcial — la consigna es explícita: cero sesión sin login exitoso.

50. **¿Token ya expirado?**
    15s: `session.setToken()` rechaza cualquier JWT cuyo `exp` ya pasó — nunca llega a guardarse, sin importar si vino de un login manual o de uno automático tras registro.
    30s: `isUsableJwt()` en `js/session.js` decodifica el payload y compara `exp` contra `now()` antes de aceptar el token; esto aplica igual al flujo de registro porque reutiliza exactamente `authenticate()` → `session.setToken()`, sin ningún atajo.
    Archivo: `js/session.js:isUsableJwt`, `setToken`.
    Prueba: `test/session.test.mjs` → "rejects malformed JWTs and ignores malformed persisted values"; `npm run test:live-api:auth` valida `exp` en el futuro contra el JWT real.
    Error común: pensar que el flujo de registro necesita su propia validación de expiración — no, es la misma de siempre.

51. **¿Dos peticiones con 401 simultáneo?**
    15s: Sin cambios respecto al comportamiento existente — ver pregunta 28 de la sección 4 (`clearIfToken` compara contra el token exacto que causó el 401).
    30s: El registro no introduce una segunda fuente de verdad de sesión, así que la deduplicación de expiración (`notifySessionExpired`) y el guard `clearIfToken(expectedToken)` siguen siendo el único mecanismo, sin duplicarse para la ruta de registro.
    Archivo: `js/api.js:clearIfToken`, `notifySessionExpired`.
    Prueba: `test/api.test.mjs` → "deduplicates concurrent expiration callbacks for the same token" (sin cambios, sigue pasando).
    Error común: pensar que hace falta lógica nueva para esto — el registro entra al mismo `session`, no crea un segundo canal.

52. **¿Cómo se demuestra que logout no recarga?**
    15s: `handleLogout()` nunca llama `location.reload()`/`location.href`; solo limpia el token en memoria, resetea las vistas y actualiza el estado — visible en Network porque no aparece ninguna nueva request `type: document`.
    30s: `test/static-contract.test.mjs` escanea todo el runtime (incluido el código nuevo de logout) y falla si aparece `location.reload(` o una asignación de navegación; en DevTools, la evidencia manual es la ausencia de una nueva entrada `document` en Network justo después de hacer clic en "Cerrar sesión" (ver `docs/EVIDENCIAS_DEFENSA.md`).
    Archivo: `js/app.js:handleLogout`, `test/static-contract.test.mjs`.

    Nota: `handleLogin`/`handleRegister` sí viven en `js/login-controller.js` (ver pregunta 49); `handleLogout` es lo único de este trío que se quedó en `js/app.js` porque no necesitaba el guard de generación.
    Prueba: la misma, más inspección manual de Network descrita en `docs/EVIDENCIAS_DEFENSA.md`.
    Error común: no verificar Network y solo confiar en que "la URL no cambió" — un `reload()` no cambia la URL pero sí genera una nueva request de documento.

## 5. Defensa por archivos

- **`js/api.js`** — Responsabilidad: único cliente HTTP, clasifica y reintenta errores, agrega Bearer, cachea. Entrada: `endpointKey` + opciones. Salida: `{data, source, stale, cachedAt}` o una excepción tipada (`ApiError`/`AuthenticationError`). Decisión técnica clave: `onRetryEvent` centraliza la notificación global sin que cada vista deba pasar su propio `onRetry`. Falla que controla: 401/429/500/red/JSON inválido. Prueba: `test/api.test.mjs`.

- **`js/app.js`** — Responsabilidad: composición raíz (shell) — crea el cliente API, las 5 vistas, el estado de ruta, y conecta `onSessionExpired`/`onRetryEvent`. Entrada: eventos DOM (`hashchange`, submit de login). Salida: llamadas a `view.render()`/`update()`. Decisión técnica clave: `resetModuleViews()` centraliza la limpieza de las 5 vistas + el countdown global en un solo lugar, llamado tanto en logout implícito (401) como en login exitoso. Falla que controla: orquesta la recuperación de sesión sin `reload()`. Prueba: `test/shell.test.mjs` (indirectamente, vía `router.js`).

- **`js/router.js`** — Responsabilidad: normaliza el hash de la URL a una ruta válida y reduce el estado global de sesión/ruta. Entrada: `action` (NAVIGATED/SESSION_EXPIRED/LOGIN_*). Salida: nuevo `state` congelado. Decisión técnica clave: rutas desconocidas caen siempre a `tour` (allowlist, no URL arbitraria). Falla que controla: hash malicioso/no válido. Prueba: `test/shell.test.mjs`.

- **`js/cache.js`** — Responsabilidad: persistencia por endpoint en `localStorage` con versión y timestamp. Entrada: `endpoint`, `data`. Salida: entrada cacheada o `null` si es inválida/inexistente. Decisión técnica clave: valida el esquema completo al leer y borra solo la clave corrupta, nunca todo el storage. Falla que controla: JSON corrupto, versión vieja, storage bloqueado. Prueba: `test/cache.test.mjs`.

- **`js/session.js`** — Responsabilidad: guarda el JWT en memoria, valida `exp`, expone invalidación selectiva. Entrada: token string. Salida: token válido o `null`. Decisión técnica clave: nunca persiste el token; limpia proactivamente cualquier token legado en `sessionStorage`. Falla que controla: token expirado, token robado por XSS (mitigado, no eliminado). Prueba: `test/session.test.mjs`.

- **`js/tour-view.js`** — Responsabilidad: pinta sedes y sus partidos, maneja `scrollIntoView` y estado activo. Entrada: `state` de `js/tour.js`. Salida: DOM de tarjetas + detalle. Decisión técnica clave: fallo de `games` no bloquea la lista de sedes (se muestra el error solo en el detalle). Falla que controla: fallo parcial de un endpoint. Prueba: `test/tour.test.mjs`.

- **`js/agenda-view.js`** — Responsabilidad: pinta columnas de partidos simultáneos y navegación de fecha. Entrada: `state` de `js/agenda.js`. Salida: columnas + controles prev/next. Decisión técnica clave: navegación de fecha es 100% síncrona (sin red), por eso es inmune a clics rápidos. Falla que controla: ausencia de datos (skeletons, nunca blanco). Prueba: `test/agenda.test.mjs`.

- **`js/timeline-view.js`** — Responsabilidad: scroll infinito con `IntersectionObserver`, countdown propio de retry. Entrada: `state` de `js/timeline.js`. Salida: lista incremental de 10 en 10. Decisión técnica clave: un solo `apiRequest('games')` para los 104 partidos, sin paginar HTTP — el "infinito" es solo inserción progresiva en el DOM. Falla que controla: observer duplicado, intervalos huérfanos, fallo inicial sin retry manual. Prueba: `test/timeline.test.mjs`.

- **`js/fan-dashboard-view.js`** — Responsabilidad: favorito persistido, tematización dinámica por variables CSS, snapshot de respaldo. Entrada: `state` de `js/fan-dashboard.js`. Salida: variables CSS actualizadas + métricas + partidos. Decisión técnica clave: la paleta de color es local y fija (6 combinaciones), nunca toma colores de la API. Falla que controla: sin datos de `teams`, cae a snapshot guardado. Prueba: `test/fan-dashboard.test.mjs`.

- **`js/matrix-view.js`** — Responsabilidad: 12 tablas 4×4, actualización selectiva de celdas. Entrada: `state` de `js/matrix.js`. Salida: tablas nativas con `cellRefs` cacheadas. Decisión técnica clave: `structureKey` decide si reconstruir la tabla o solo actualizar celdas. Falla que controla: fallo de `games` (celdas "Pending"), fallo de `groups` (matriz vacía). Prueba: `test/matrix.test.mjs`.

## 6. Guion práctico (8-10 minutos)

1. **(0:00-0:30)** Abrir `http://127.0.0.1:4173` (app ya corriendo). Decir la explicación de 30 segundos (sección 2).
2. **(0:30-1:30)** Navegar por las 5 rutas con teclado (Tab + Enter), mostrando `aria-current` cambiando. Abrir `js/router.js` en el editor y señalar `normalizeRoute`.
3. **(1:30-3:00)** Ir a Timeline. Abrir DevTools → Network. Forzar un 429 real vía `npm run test:api-resilience` en otra terminal, o mostrar el countdown ya grabado. Abrir `js/api.js` y `js/retry-status.js`, explicar el flujo de backoff + countdown global.
4. **(3:00-4:00)** Ir a Matrix. Mostrar una celda, forzar fallo de `games` (Network → block), mostrar que la matriz se dibuja completa en "Pending". Abrir `js/matrix-view.js`, señalar `cellRefs`/`updateCells`.
5. **(4:00-5:00)** Ir a Fan Dashboard, cambiar de equipo favorito, mostrar el cambio de color (DevTools → Elements → ver `--fan-primary` inline). Recargar la página, mostrar que el favorito persiste.
6. **(5:00-6:00)** Forzar un 401 (bloquear `/get/games` a 401 en Network). Mostrar el modal, reautenticarse, confirmar que no hubo `reload()` (Network sin nueva request de documento).
7. **(6:00-7:00)** Correr `npm test` en vivo, mostrar 157/157 en verde. Abrir `test/api.test.mjs` y señalar 2-3 nombres de test que prueban justo lo que se mostró.
8. **(7:00-8:00)** Abrir `test/auth-contract.test.mjs`, explicar por qué es la prueba más fuerte del contrato JWT sin depender de la API pública.
9. **(8:00-9:00)** Mencionar la contradicción externa de la API pública (README.md), mostrar `npm run test:live-api` con los conteos reales.
10. **(9:00-10:00)** Cierre: resumir qué se pulió en esta pasada (countdown global, bug de contraste real corregido, contrato Bearer verificado) y qué queda pendiente del profesor (cuenta de prueba para `/auth/authenticate`).

## 7. Simulacro hostil

- **¿Qué pasa si falla `teams` pero funciona `games`?** → Ver pregunta 25.
- **¿Qué ocurre si llegan dos respuestas en orden inverso?** → Ver pregunta 26.
- **¿Qué pasa si el usuario cambia de ruta durante el backoff?** → Ver pregunta 23.
- **¿Qué sucede con caché corrupta?** → Ver pregunta 24.
- **¿Qué pasa si `Retry-After` es mayor que el backoff?** → Ver pregunta 17.
- **¿Por qué cuatro intentos?** → Ver pregunta 18.
- **¿Qué sucede si el grupo no tiene cuatro equipos?** → Ver pregunta 19.
- **¿Qué evita que el observer se registre varias veces?** → Ver pregunta 20.
- **¿Qué evita intervalos huérfanos?** → Ver pregunta 21.
- **¿Qué pasa si la API devuelve HTML en vez de JSON?** → Ver pregunta 22.
- **Pregunta trampa adicional: "¿Y si el profesor fuerza un 429 en DOS módulos distintos casi al mismo tiempo?"** → El controlador global solo mantiene un countdown activo — el segundo `notify()` reemplaza al primero (comportamiento documentado y testeado, no un bug). Explicá esto proactivamente si surge: es una limitación de diseño consciente ("evita countdowns simultáneos contradictorios", tal como pide la consigna), no un descuido.
