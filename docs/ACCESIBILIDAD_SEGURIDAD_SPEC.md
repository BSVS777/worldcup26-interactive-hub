# Spec de accesibilidad, inclusion y seguridad

Esta spec complementa la matriz de cumplimiento. Cualquier modulo nuevo debe cumplir estos puntos antes de considerarse listo.

## Objetivo

La pagina debe ser usable por personas con distintas capacidades, dispositivos, idiomas y condiciones de conectividad, y debe resistir fallos de API, errores de sesion, entradas malformadas y navegacion repetida sin romper el flujo. "Intumbable" se traduce aqui como una meta verificable: degradar con gracia, contener fallos, no exponer secretos y recuperar la UI sin recargar la aplicacion. La meta no significa disponibilidad absoluta del hosting ni de la API externa; significa que el frontend contiene fallos previsibles y mantiene una salida accionable.

## Accesibilidad e inclusion

| ID | Requisito | Criterio de aceptacion |
|---|---|---|
| ACC-001 | Navegacion completa por teclado | Todo control interactivo es alcanzable con Tab, activable con Enter/Espacio cuando aplique y mantiene foco visible. |
| ACC-002 | Foco gestionado | Tras login, expiracion de sesion, cambio de modulo o reintento, el foco queda en una region util y no se pierde en contenido oculto. |
| ACC-003 | Semantica nativa primero | Usar `button`, `a`, `section`, `header`, `nav`, `main`, listas y tablas reales antes que roles ARIA personalizados. |
| ACC-004 | Estados dinamicos anunciados | Cargas, errores, reintentos, datos cacheados y sesion expirada usan `aria-live` sin saturar al lector de pantalla. |
| ACC-005 | Contenido oculto realmente oculto | Todo elemento con `hidden` debe tener `display: none` efectivo y no ocupar layout ni foco. |
| ACC-006 | Contraste AA minimo | Texto normal >= 4.5:1, texto grande e iconos informativos >= 3:1, foco visible >= 3:1 contra fondos adyacentes. |
| ACC-007 | Movimiento reducido | `prefers-reduced-motion: reduce` elimina animaciones no esenciales, scroll suave y transiciones largas. |
| ACC-008 | Responsive inclusivo | La UI funciona desde 320 px de ancho, con zoom 200%, sin solapes ni scroll horizontal inesperado salvo carruseles/trackers intencionales. |
| ACC-009 | Texto inclusivo y claro | Mensajes de error y estados explican la accion recuperable sin culpar al usuario ni depender solo de color. |
| ACC-010 | Formularios accesibles | Cada input tiene label visible, autocomplete correcto, errores persistentes y submit deshabilitado solo durante trabajo real. |
| ACC-011 | Tablas y matrices comprensibles | Matrices usan encabezados, scope/aria apropiado y diagonal marcada semanticamente. |
| ACC-012 | Internacionalizacion basica | Fechas, horas y numeros deben poder formatearse de forma consistente; no hardcodear datos que impidan localizacion futura. |

## Seguridad y privacidad

| ID | Requisito | Criterio de aceptacion |
|---|---|---|
| SEC-HARD-001 | CSP estricta | Mantener `default-src 'self'`, scripts/estilos locales, `base-uri 'self'`, `form-action 'self'` y `frame-ancestors 'none'` en servidor. |
| SEC-HARD-002 | Sin ejecucion dinamica | Prohibido `eval`, `new Function`, inline handlers, scripts remotos o HTML crudo inyectado. Usar `textContent` para datos API. |
| SEC-HARD-003 | Proxy allowlist | El servidor solo puede proxyear autenticacion y endpoints exactos permitidos; rechaza query targets y rutas arbitrarias. |
| SEC-HARD-004 | Token contenido | JWT se guarda por el `sessionStore`, se limpia en 401/expiracion local y nunca se imprime en DOM, logs o errores. |
| SEC-HARD-005 | Cabeceras defensivas | Servir `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options` o `frame-ancestors` y cache no-store en respuestas API. |
| SEC-HARD-006 | Limites de payload | Request y response del proxy mantienen limites de tamano y cancelan streams que excedan el maximo. |
| SEC-HARD-007 | Validacion de contratos | Toda respuesta 2xx se normaliza y valida antes de llegar a vistas; si falla, se usa cache segura o error recuperable. |
| SEC-HARD-008 | Errores seguros | Mensajes al usuario no filtran URLs internas, tokens, stack traces ni payloads crudos. |
| SEC-HARD-009 | Sin dependencias innecesarias | No agregar librerias externas para trabajo que puede resolverse con plataforma web nativa y tests actuales. |
| SEC-HARD-010 | Datos persistidos minimizados | LocalStorage solo guarda cache versionada, favorito/snapshot y token si el contrato de sesion lo exige; cada clave tiene esquema verificable. |

## Resiliencia y disponibilidad

| ID | Requisito | Criterio de aceptacion |
|---|---|---|
| RES-001 | Fallo contenido por modulo | Si falla un endpoint secundario, el modulo debe renderizar lo recuperable y aislar el error localmente. |
| RES-002 | Recuperacion sin recarga | 401, re-login, reintentos manuales y cambios de ruta no usan `location.reload()`. |
| RES-003 | Backoff determinista | 429/500 respetan los intentos y esperas del contrato tecnico, con countdown visible/accesible cuando aplique. |
| RES-004 | Cache como respaldo | Offline, 500 agotado o JSON invalido usan cache valida por endpoint cuando exista y muestran que los datos no son actuales. |
| RES-005 | Sin carreras async | Cada vista con fetch paralelo usa generacion o abort para impedir que respuestas viejas sobrescriban estado fresco. |
| RES-006 | Sin fugas de listeners | Listeners, observers, timers y countdowns se registran una vez o se limpian al terminar/resetear. |
| RES-007 | Layout nunca blanco | Cada modulo tiene skeleton, estado vacio o error accionable; ningun fallo deja una region primaria vacia. |
| RES-008 | Tests obligatorios | Todo requisito nuevo de esta spec debe tener test unitario, test de contrato estatico o verificacion Playwright documentada. |

## Evidencia actual

- Los avisos de datos cacheados forman parte del requisito ACC-004 y RES-004: Matrix y Timeline tienen pruebas directas sobre estados live, y Tour, Agenda, Fan Dashboard, Timeline y Matrix consumen la misma propagacion `stale` desde `createLoadableView`.
- La seguridad de cache queda ligada a SEC-HARD-007: cada endpoint publico usa clave aislada, version y timestamp verificables antes de llegar a las vistas.
- La meta de resiliencia no se declara como disponibilidad absoluta; se mide por contencion de fallos, fallback de cache valido, avisos visibles y recuperacion sin recarga.
## Definicion de listo

Un cambio queda listo solo si:

- `npm test` pasa completo.
- No hay contenido oculto visible o enfocable.
- La navegacion por teclado y foco principal se verifican para el modulo tocado.
- Los errores recuperables tienen mensaje visible y anunciado.
- No se agregan nuevas rutas de red, storage o HTML dinamico sin actualizar esta spec y la matriz.
