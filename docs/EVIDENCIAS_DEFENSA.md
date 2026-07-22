# Evidencias reproducibles para la defensa (Chrome/Chromium DevTools)

Procedimientos exactos para reproducir en vivo, frente al profesor, cada comportamiento de resiliencia. Todos usan la app local en modo de pruebas: `npm start` (puerto 4173) + `npm run test:server` (puerto 4174), navegador en `http://127.0.0.1:4173/?testMode=1`.

## Preparación común

1. Abrir DevTools (F12) antes de cargar la página, pestañas Console y Network visibles.
2. En Network, activar "Preserve log" para que los reintentos no se pierdan al recargar.
3. Iniciar sesión con las credenciales deterministas (`student@example.test` / `secret`) cuando el panel de sesión lo pida.

---

## Error 401 (sesión expirada)

**Cómo provocarlo:** en Network, clic derecho sobre una petición a `/get/games` (o cualquier endpoint) → "Block request URL", luego editar el patrón para forzarlo a `/test/401`, **o** más simple: usar DevTools → pestaña Network → "Override" con Local Overrides apuntando `/get/games` a un archivo con status 401. Alternativa sin overrides: en la consola del navegador, invalidar manualmente el token con `localStorage` no aplica (el JWT vive solo en memoria) — la forma determinista es dejar pasar el tiempo de expiración del JWT de prueba o, más práctico para la defensa, mostrar el código fuente de `tools/failure-audit.py` (`verify_401`) que ya automatiza exactamente este escenario contra el servidor real de pruebas, y ejecutarlo en vivo con `npm run test:failures`.

**Qué observar en Console:** un mensaje `Failed to load resource: the server responded with a status of 401` — no debe aparecer ningún error JS no controlado.

**Qué observar en Network:** seleccionar la request a `/get/games`, pestaña Headers → Status Code `401`, Response → cuerpo con el mensaje de error del servidor.

**Qué sucede visualmente:** el panel de sesión aparece como modal (`role="dialog"`, `aria-modal="true"`), foco se mueve al campo de email, el resto de la página queda inerte (`inert`/`aria-hidden`).

**Cómo reautenticarse:** completar el formulario de login dentro del modal y enviar — la vista activa se recupera sin navegar a otra URL.

**Cómo comprobar que no hubo reload:** observar que Network NO muestra una nueva request de documento (`type: document`) para `index.html`; el timestamp de "DOMContentLoaded" en la parte superior de Network no se repite.

---

## Error 429 (rate limit)

**Cómo provocarlo:** `npm run test:api-resilience` lo automatiza (Playwright fuerza un 429 real la primera vez que se pide `/get/stadiums` o `/get/games`). Para hacerlo manualmente: DevTools → Network → clic derecho en la request en curso → "Block request URL" no simula el status; usar en su lugar el flujo real: el servidor determinista (`tools/test-server.mjs`) expone `/test/429?case=x&failures=1`, visible navegando a esa URL directamente para ver el 429 real con header `Retry-After`.

**Cómo ver los reintentos:** Network mostrará múltiples requests al mismo path (`/get/games`) espaciadas en el tiempo — cada una es un intento.

**Cómo medir aproximadamente 1s, 2s y 4s:** en Network, columna "Waterfall" o el timestamp de cada request consecutiva; la diferencia entre el inicio del intento N y N+1 debe acercarse a 1000ms, 2000ms, 4000ms (el backoff de `js/api.js:BACKOFF_MS`).

**Cómo mostrar el countdown:** observar el banner global `#retry-status` (visible en cualquier módulo) o, si el 429 ocurrió en Timeline, el texto `Retrying in Xs.` en `#timeline-status` — ambos son `aria-live="polite"`, se actualizan cada segundo.

**Cómo comprobar la recuperación 200:** la última request al mismo endpoint en Network debe mostrar Status 200 y los datos deben aparecer en la UI (el banner/countdown desaparece).

---

## Error 500

**Cómo provocarlo:** igual que 429 pero contra `/test/500?case=x&failures=1`, o ejecutar `npm run test:failures` / `npm run test:api-resilience` que lo fuerzan automáticamente sobre `/get/games`.

**Cómo observar los cuatro intentos:** Network debe mostrar exactamente 4 requests al mismo endpoint antes de la resolución final (3 fallidas + recuperación, o 4 fallidas si nunca se recupera).

**Cómo demostrar el fallback de caché:** precargar cualquier vista primero (para poblar `localStorage`), luego forzar 500 en ese endpoint — la vista debe mostrar los datos cacheados con un aviso "cached data" visible en pantalla.

**Cómo demostrar el caso sin caché:** limpiar `localStorage` (Application → Local Storage → clic derecho → Clear) antes de forzar el 500 — la vista debe mostrar un error recuperable (Timeline: botón Retry visible; otras vistas: mensaje local sin romper la navegación).

---

## Offline

**Cómo calentar la caché:** navegar por las 5 rutas una vez con red disponible; Application → Local Storage → confirmar claves `wc26:cache:v1:stadiums/games/teams/groups`.

**Cómo activar Offline en DevTools:** pestaña Network → dropdown "No throttling" → seleccionar "Offline".

**Cómo identificar el aviso stale:** cada vista muestra un texto "cached data" / "datos no actualizados" junto a su contenido normal — no un mensaje de error genérico.

**Cómo limpiar caché:** Application → Local Storage → botón de papelera o `localStorage.clear()` en Console.

**Cómo demostrar Retry sin datos:** con caché limpia y Offline activo, navegar a Timeline — debe mostrar el mensaje "Match timeline unavailable" con botón Retry visible, sin pantalla en blanco.

---

## Tabla resumen

| Prueba | Ruta | Acción | Network esperado | Console esperado | UI esperada |
|---|---|---|---|---|---|
| 401 | Cualquiera | Forzar 401 en el endpoint activo | 1 request, status 401 | `Failed to load resource... 401`, sin errores JS | Modal de sesión expirada, foco en email, sin reload |
| 429 | Cualquiera | Forzar 429 con `Retry-After` | N requests al mismo path, ~1s/2s/4s entre ellas, última en 200 | Sin errores JS | Banner/countdown visible descontando segundos, luego datos |
| 500 | Cualquiera | Forzar 500 | Hasta 4 requests al mismo path | Sin errores JS | Con caché: datos + aviso stale. Sin caché: error recuperable/Retry |
| Offline | Cualquiera | DevTools → Network → Offline | Requests fallidas (`net::ERR_INTERNET_DISCONNECTED`) | `Failed to load resource`, sin errores JS no controlados | Con caché: datos + aviso stale. Sin caché: mensaje + Retry |
