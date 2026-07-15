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
| T-01 | DOM XSS por API/cache | Render con `createElement`/`textContent`; sinks prohibidos bajo busqueda | `rg` de sinks peligrosos | Sin hallazgos en busqueda de sinks peligrosos | EN PROGRESO |
| T-02 | Robo de JWT persistido | `createSessionStore` mantiene token solo en memoria y limpia legado | `npm test` session/api | `test/session.test.mjs` | IMPLEMENTADO |
| T-03 | Cache poisoning | Cache versionada por endpoint y elimina clave corrupta | `npm test` cache | `test/cache.test.mjs` | IMPLEMENTADO |
| T-04 | Endpoint injection | `ENDPOINTS` inmutable; API recibe endpointKey | `npm test` config/api | `js/config.js`, `test/config.test.mjs` | IMPLEMENTADO |
| T-05 | Test mode expuesto | `testMode=1` solo en origen local | `npm test` config | `isTestMode` | IMPLEMENTADO |
| T-07 | Clickjacking | `frame-ancestors 'none'` en servidor local | `npm test` app-server | `tools/app-server.mjs` | IMPLEMENTADO |
| T-09 | API lenta/caida | Retry 429/500, cache fallback, abort | `npm test` api | `test/api.test.mjs` | IMPLEMENTADO |

## Token

- almacenamiento: memoria solamente.
- logging: sin logger de secretos; `security.js` redaction disponible.
- expiracion: JWT `exp` validado localmente.
- 401: limpia token vigente y notifica sesion expirada.

## DOM XSS

- sinks: prohibidos por contrato; busqueda final pendiente tras este bloque.
- fixture: pendiente agregar fixture malicioso dedicado.
- resultado: no verificado manualmente todavia.

## Cache poisoning

Cubierto por pruebas de cache corrupta, version incorrecta, endpoint incorrecto y fecha invalida.

## URLs

`safeExternalUrl` valida protocolo y host; pendiente integrarlo en vistas que usen imagenes/enlaces externos.

## CSP y headers

Servidor local configura CSP, Referrer-Policy, X-Content-Type-Options y frame protections. Produccion depende del hosting.

## Test mode

Solo local, URL fija `http://127.0.0.1:4174`, sin aceptar `apiBase` por query string.

## Dependencias

Sin dependencias runtime. Usa Node nativo para servidor y tests.

## Evidencia de busquedas

- Sinks peligrosos: `rg` sobre codigo ejecutable no encontro `.then(`, `.catch(`, `alert(`, `location.reload(`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(` ni `new Function`.
- `fetch(`: solo aparece en `test/app-server.test.mjs`; la app usa `fetchImpl` centralizado en `js/api.js`.
- Handlers inline: sin resultados en HTML.
- Secretos: la busqueda marco nombres de variables/tests y filas de docs; no encontro valores tipo `Bearer <token real>` ni credenciales de produccion.

## Fan Dashboard

- Persiste solo `wc26:favorite-team:v1` y snapshots derivados; no persiste JWT ni Authorization.
- Renderiza API/snapshot con `createElement`, `textContent`, `append` y `replaceChildren`.
- No consume URLs externas de banderas ni colores de equipos, para evitar contratos inseguros no verificados.

## Modal 401

- El estado `expired` activa un dialogo modal sin persistir token.
- El fondo queda inerte y `aria-hidden` mientras se reautentica.
- El trap de Tab se registra una vez al construir `createShellView`.

## Timeline

- `createTimelineView` usa `generation` para descartar cargas obsoletas.
- Load-more es local y no dispara fetch adicional.
- Retry usa `forceRetry` y mantiene el endpoint allowlisted `games`.
## Riesgos pendientes

- Completar modulos restantes.
- Validar API viva y Content-Type real.
- Agregar prueba DOM XSS dedicada.
- Auditar secretos antes de entrega final.


