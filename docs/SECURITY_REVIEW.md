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
| T-02 | Robo de JWT persistido | `createSessionStore` mantiene token solo en memoria y limpia legado | `npm test` session/api | `test/session.test.mjs` | IMPLEMENTADO |
| T-03 | Cache poisoning | Cache versionada por endpoint, claves aisladas y avisos visibles para datos stale | `npm test` cache/matrix/timeline | `test/cache.test.mjs`, `test/matrix.test.mjs`, `test/timeline.test.mjs` | VERIFICADO |
| T-04 | Endpoint injection | `ENDPOINTS` inmutable; API recibe endpointKey | `npm test` config/api | `js/config.js`, `test/config.test.mjs` | IMPLEMENTADO |
| T-05 | Test mode expuesto | `testMode=1` solo en origen local | `npm test` config | `isTestMode` | IMPLEMENTADO |
| T-07 | Clickjacking | `frame-ancestors 'none'` en servidor local | `npm test` app-server | `tools/app-server.mjs` | IMPLEMENTADO |
| T-09 | API lenta/caida | Retry 429/500, cache fallback, abort | `npm test` api | `test/api.test.mjs` | IMPLEMENTADO |
| T-10 | Navegacion movil rompe foco o agrega HTML dinamico | Drawer con boton nativo, `aria-expanded`, dataset controlado y listeners centralizados; sin HTML crudo | Playwright drawer y busquedas de sinks | `tools/mobile-drawer-audit.py`, `test/static-contract.test.mjs`, `js/ui.js` | VERIFICADO |

## Endpoint authorization

- `apiRequest` obtiene el JWT vigente desde `sessionStore` y rechaza peticiones de datos sin token antes de llamar a `fetchImpl`.
- `test/api.test.mjs` valida que `stadiums`, `games`, `teams` y `groups` usen `Authorization: Bearer ...` y sus paths allowlisted de `ENDPOINTS`.

## Token

- almacenamiento: memoria solamente.
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

Servidor local configura CSP, Referrer-Policy, X-Content-Type-Options y frame protections. Produccion depende del hosting.

## Test mode

Solo local, URL fija `http://127.0.0.1:4174`, sin aceptar `apiBase` por query string.

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

## Mobile navigation drawer

- El drawer movil usa un boton nativo con `aria-controls="route-nav-track"` y `aria-expanded`; no crea nodos desde strings ni inserta HTML dinamico.
- Los dos listeners nuevos viven en `createShellView` fuera de `render`, delegados en `.route-nav`; `test/static-contract.test.mjs` mantiene el conteo centralizado y falla si se agregan listeners en rutas repetibles.
- `tools/mobile-drawer-audit.py` verifica apertura por teclado, cierre con Escape, restauracion de foco, cierre al navegar y que desktop mantenga la navegacion visible.
## Modal 401

- El estado `expired` activa un dialogo modal sin persistir token.
- `onSessionExpired` resetea las vistas antes de enfocar el panel de recuperacion, para cortar observers/timers activos y descartar cargas obsoletas.
- El fondo queda inerte y `aria-hidden` mientras se reautentica.
- El trap de Tab se registra una vez al construir `createShellView`.

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

`tools/failure-audit.py` fuerza 401, 429 y 500 sobre `/get/games` en Chromium. La auditoria observa responses 401/429/500 en Network, confirma que 401 abre el modal accesible, que 429 muestra countdown de retry y que 429/500 recuperan con un 200 posterior sin recarga.

## Riesgos pendientes

- Completar modulos restantes.
- Validar API viva y Content-Type real.
- Agregar prueba DOM XSS dedicada.
- Auditar secretos antes de entrega final.

