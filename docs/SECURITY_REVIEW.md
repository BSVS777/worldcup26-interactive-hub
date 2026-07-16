# Security Review

## Alcance

Revision viva para WC26 Interactive Hub. No declara seguridad absoluta; registra controles implementados y dependencias del hosting/API.

## Limites del frontend

- No puede emitir cookies HttpOnly ni HSTS.
- No puede revocar JWT en servidor.
- No controla CORS ni headers de produccion si el hosting no permite configurarlos.
- No garantiza disponibilidad de `worldcup26.ir`.

## Amenazas

| ID | Amenaza | Control | Prueba | Evidencia | Estado |
|---|---|---|---|---|---|
| T-01 | DOM XSS por API/cache | Render con `createElement`/`textContent`; sinks prohibidos bajo busqueda; fixture maliciosa | `rg` de sinks peligrosos; `test/matrix.test.mjs` | Sin sinks peligrosos; Matrix conserva `<img onerror>`/`<script>` como texto y no crea nodos `img`/`script` | VERIFICADO |
| T-02 | Robo de JWT persistido | `createSessionStore` mantiene token solo en memoria y limpia legado | Unit + Playwright storage audit | `test/session.test.mjs`, `tools/session-storage-audit.py` | VERIFICADO |
| T-03 | Cache poisoning | Cache versionada por endpoint, claves aisladas y avisos visibles para datos stale | `npm test` cache/matrix/timeline | `test/cache.test.mjs`, `test/matrix.test.mjs`, `test/timeline.test.mjs` | VERIFICADO |
| T-04 | Endpoint injection | `ENDPOINTS` inmutable; API recibe endpointKey y proxy rechaza queries target | Unit + Playwright endpoint audit | `js/config.js`, `test/config.test.mjs`, `tools/endpoint-injection-audit.py` | VERIFICADO |
| T-05 | Test mode expuesto | `testMode=1` solo en origen local y usa base fija | Unit + Playwright endpoint audit | `isTestMode`, `tools/endpoint-injection-audit.py` | VERIFICADO |
| T-07 | Clickjacking | `frame-ancestors 'none'` y `X-Frame-Options: DENY` en servidor local | Playwright security headers audit | `tools/app-server.mjs`, `tools/security-headers-audit.py` | VERIFICADO |
| T-09 | API lenta/caida | Retry 429/500, cache fallback y errores recuperables | Unit + Playwright API resilience audit | `test/api.test.mjs`, `tools/api-resilience-audit.py`, `tools/offline-audit.py` | VERIFICADO |
| T-10 | Navegacion movil rompe foco o agrega HTML dinamico | Drawer con boton nativo, `aria-expanded`, dataset controlado y listeners centralizados; sin HTML crudo | Playwright drawer y busquedas de sinks | `tools/mobile-drawer-audit.py`, `test/static-contract.test.mjs`, `js/ui.js` | VERIFICADO |

## Live API probe

- `tools/live-api-probe.mjs` valida el contrato live sin credenciales: llama `teams`, `games`, `groups` y `stadiums` directamente contra los endpoints publicos, exige `response.ok`, `application/json`, un arreglo raiz por endpoint y normaliza con el codigo real de la app. Evidencia registrada: `LIVE_API_PUBLIC_PROBE_PASSED teams=48 games=104 groups=12 stadiums=16`.
- `tools/live-api-auth-probe.mjs` conserva el flujo autenticado como compatibilidad opcional cuando existen `WC26_API_EMAIL` y `WC26_API_PASSWORD`: autentica, exige `token` presente sin imprimirlo, llama los mismos cuatro endpoints con Bearer y normaliza. Sin credenciales imprime `LIVE_API_AUTH_PROBE_SKIPPED` y no marca verificacion live de `/auth/authenticate`.

## Endpoint authorization

- La API desplegada permite lectura publica en `stadiums`, `games`, `teams` y `groups`; `apiRequest` ya no rechaza localmente una peticion de datos por falta de token. Agrega `Authorization: Bearer ...` solo cuando `sessionStore` tiene un token vigente; un 401 real del servidor sigue limpiando la sesion y notificando expiracion, sin fabricar ni exigir un Bearer falso.
- `test/api.test.mjs` valida que, con sesion activa, `stadiums`, `games`, `teams` y `groups` usen `Authorization: Bearer ...` y sus paths allowlisted de `ENDPOINTS`; y que, sin sesion, la peticion se complete igual sin cabecera `Authorization`.
- Contradiccion academica: el enunciado ISW-521 exige Bearer en cada request de datos; la API real ya no lo exige para lectura. Clasificado como BLOQUEO POR CONTRADICCION EXTERNA en `docs/MATRIZ_CUMPLIMIENTO.md` (API-001..API-003), pendiente de aclaracion del profesor.

## Token

- almacenamiento: memoria solamente; `tools/session-storage-audit.py` verifica en Chromium que `localStorage` y `sessionStorage` no contienen token/JWT/Authorization tras login.
- recarga: al perder memoria, vuelve a mostrarse el panel de login.
- logging: sin logger de secretos; `security.js` redaction disponible.
- expiracion: JWT `exp` validado localmente.
- 401: limpia token vigente y notifica sesion expirada.

## DOM XSS

- sinks: busqueda runtime excluyendo `docs/**`, `test/**` y Markdown sin hallazgos; `alert(1)` existe solo como payload de prueba.
- superficie inline: `test/static-contract.test.mjs` valida que `index.html` no use handlers inline ni `<style>` embebido, y que cargue un unico script modular local.
- fixture: `test/matrix.test.mjs` incluye nombres de grupo/equipo con `<img onerror>` y `<script>`, verificados como texto no ejecutable.
- resultado: verificado por test unitario de render Matrix; pendiente prueba manual/browser con payload equivalente en API viva.

## Cache poisoning

Cubierto por pruebas de cache corrupta, version incorrecta, endpoint incorrecto, fecha invalida y claves independientes para `stadiums`, `games`, `teams` y `groups`. Los metadatos `stale`, `cachedAt` y `source` se propagan desde el cliente API hacia las vistas mediante `createLoadableView`. `tools/cached-notice-audit.py` calienta cache real, bloquea `/get/*` y verifica avisos visibles de cache en Tour, Agenda, Timeline, Fan Dashboard y Matrix. `tools/offline-audit.py` demuestra en navegador que Agenda usa cache de `games` sin red y que Timeline sin cache queda en estado recuperable con Retry.

## URLs

`safeExternalUrl` valida protocolo y host; pendiente integrarlo en vistas que usen imagenes/enlaces externos.

## CSP y headers

Servidor local configura CSP, Referrer-Policy, X-Content-Type-Options y frame protections. `tools/security-headers-audit.py` verifica en Chromium que `/`, assets y rutas de error incluyan `frame-ancestors 'none'` y `X-Frame-Options: DENY`. Produccion depende del hosting.

## Test mode

Solo local, URL fija `http://127.0.0.1:4174`, sin aceptar `apiBase` por query string. `tools/endpoint-injection-audit.py` confirma que `?apiBase=https://evil.example` no produce requests externos y que `/api/get/games?target=...` se rechaza con 404.

## Dependencias

Sin dependencias runtime. Usa Node nativo para servidor y tests. `test/static-contract.test.mjs` valida que no existan `dependencies/devDependencies`, lockfiles, `node_modules` ni scripts/styles remotos en HTML.

## Evidencia de busquedas

- Sinks peligrosos: `rg` sobre codigo ejecutable no encontro `.then(`, `.catch(`, `alert(`, `location.reload(`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(` ni `new Function`; `test/static-contract.test.mjs` tambien falla si runtime vuelve a introducir `.then(`, `.catch(`, fetch directo en vistas, o si el cliente API deja de validar `response.ok`/normalizadores.
- `fetch(`: solo aparece en tests de servidor/app; el runtime de la app usa `fetchImpl` centralizado en `js/api.js`.
- Handlers inline: sin resultados en HTML.
- Secretos: la busqueda marco nombres de variables/tests y filas de docs; no encontro valores tipo `Bearer <token real>` ni credenciales de produccion.

## Group Matrix

- Renderiza grupos, equipos y partidos con APIs DOM seguras: createElement, textContent, append y replaceChildren.
- No persiste datos nuevos ni tokens; solo consume el cliente API central y sus fallbacks.
- La actualizacion parcial usa referencias internas a celdas por ID de grupo/equipo, sin HTML crudo ni selectores derivados de datos no confiables.


## Agenda layout evidence

- `tools/agenda-layout-audit.py` verifica en Chromium que Agenda renderiza columnas con nodos DOM seguros y nombres de equipos normalizados, sin HTML crudo ni errores de consola.
- La navegacion al siguiente dia simultaneo actualiza el `<time datetime>` y conserva dos columnas visibles sin nuevas URLs ni fetch directo desde la vista.

## Tour partial failure

- `tools/tour-partial-failure-audit.py` fuerza `/get/games` 500 en Chromium y confirma que `/get/stadiums` sigue renderizando sedes clicables.
- La seleccion de sedes bajo fallo de partidos actualiza `aria-pressed` y muestra alertas locales por sede, sin errores JS inesperados ni HTML crudo.

## Test server determinista

- `tools/test-server.mjs` usa Node nativo y fixtures sinteticos para `/auth/authenticate`, `/get/stadiums`, `/get/games`, `/get/teams` y `/get/groups`.
- Los endpoints de datos exigen `Authorization: Bearer ...`; sin bearer responden 401.
- CORS solo refleja origenes locales permitidos (`127.0.0.1:4173` y `localhost:4173`), no origenes arbitrarios.
- Las respuestas agregan `no-store`, `nosniff`, metodos allowlisted y no aceptan rutas fuera del contrato.
- `test/test-server.test.mjs` cubre auth, fixtures, bearer requerido, 429/500 recuperables, reset, metodos y rutas no permitidas.
## Accessibility hardening

- Agenda representa la fecha activa con `<time datetime>` construido mediante DOM seguro, no HTML crudo.
- Tour crea el heading de detalle con `createElement`, `textContent` y `tabIndex=-1`; la gestion de foco no copia datos externos a atributos sensibles ni persiste estado.
- El contraste del Dashboard se verifica con calculo local de luminancia WCAG en `test/accessibility-contrast.test.mjs`, sin depender de colores externos de API.

## Fan Dashboard

- Persiste solo `wc26:favorite-team:v1` y snapshots derivados; no persiste JWT ni Authorization.
- Renderiza API/snapshot con `createElement`, `textContent`, `append` y `replaceChildren`.
- No consume URLs externas de banderas ni colores de equipos, para evitar contratos inseguros no verificados.
- La tematizacion visual usa `createFanTheme` con una paleta local allowlisted derivada de `team.id`/`team.name`; ignora campos externos como `color` y solo escribe variables CSS acotadas a `#fan-dashboard-view`.
- `tools/fan-theme-audit.py` verifica en browser que las variables `--fan-primary`, `--fan-accent` y `--fan-contrast` existen y cambian al seleccionar otro favorito.

## Mobile navigation drawer

- El drawer movil usa un boton nativo con `aria-controls="route-nav-track"` y `aria-expanded`; no crea nodos desde strings ni inserta HTML dinamico.
- Los dos listeners nuevos viven en `createShellView` fuera de `render`, delegados en `.route-nav`; `test/static-contract.test.mjs` mantiene el conteo centralizado y falla si se agregan listeners en rutas repetibles.
- `tools/mobile-drawer-audit.py` verifica apertura por teclado, cierre con Escape, restauracion de foco, cierre al navegar y que desktop mantenga la navegacion visible.
## Modal 401

- El estado `expired` activa un dialogo modal sin persistir token.
- `onSessionExpired` resetea las vistas antes de enfocar el panel de recuperacion, para cortar observers/timers activos y descartar cargas obsoletas.
- El fondo queda inerte y `aria-hidden` mientras se reautentica.
- El trap de Tab se registra una vez al construir `createShellView`.
- `tools/console-401-audit.py` confirma que Chromium reporta el 401 en Console como recurso fallido y que no hay errores JS inesperados durante la recuperacion.

## Retry countdown

- `timeline-status` es un `role="status"` con `aria-live="polite"`; el countdown de retry se anuncia sin insertar HTML crudo.
- `clearRetryCountdown` limpia el intervalo al recuperar datos, fallar definitivamente o resetear la vista, reduciendo riesgo de timers huerfanos.

## Timeline

- `createTimelineView` usa `generation` para descartar cargas obsoletas.
- Load-more es local y no dispara fetch adicional.
- `tools/timeline-observer-audit.py` valida en navegador que la interseccion del sentinel agrega el siguiente bloque local sin una segunda peticion a `/get/games`.
- Retry usa `forceRetry` y mantiene el endpoint allowlisted `games`.
- `reset()` desconecta un `IntersectionObserver` activo antes de limpiar el estado visual.
- Cuando `games` viene de cache valida, el status live muestra que los partidos se estan viendo desde cache.

## Cached data notices

- `createLoadableView.fetchOrFallback` conserva `stale`, `cachedAt` y `source` sin exponer payload crudo.
- Tour, Agenda, Timeline, Fan Dashboard y Matrix muestran avisos visibles cuando algun endpoint publico responde desde cache.
- `tools/cached-notice-audit.py` cubre los cinco modulos en Chromium con endpoints publicos bloqueados, confirmando que el fallback sale de cache versionada y se anuncia visualmente.

## Evidencia DevTools HTTP

`tools/failure-audit.py` fuerza 401, 429 y 500 sobre `/get/games` en Chromium. La auditoria observa responses 401/429/500 en Network, confirma que 401 abre el modal accesible, que 429 muestra countdown de retry y que 429/500 recuperan con un 200 posterior sin recarga. `tools/api-resilience-audit.py` consolida 429, 500 y cache fallback en Agenda con red bloqueada (`API_RESILIENCE_AUDIT_PASS`). `tools/console-401-audit.py` complementa DevTools Console: captura el `Failed to load resource` 401 esperado y falla si aparece otro error de consola.

## Riesgos pendientes

- Validar el flujo autenticado `/auth/authenticate` contra la API viva con `tools/live-api-auth-probe.mjs` y credenciales validas; opcional, no bloquea la lectura publica ya verificada.
- Agregar prueba DOM XSS dedicada.
- Auditar secretos antes de entrega final.

