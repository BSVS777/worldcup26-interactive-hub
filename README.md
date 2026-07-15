# WC26 Interactive Hub

Aplicacion vanilla JavaScript para explorar el Mundial 2026 con una base de resiliencia, seguridad y accesibilidad.

## Comandos

| Tarea | Comando exacto | Resultado esperado |
|---|---|---|
| Servir la app local | `npm start` | Inicia `node tools/app-server.mjs` en `http://127.0.0.1:4173`. |
| Ejecutar la suite completa | `npm test` | Ejecuta `node --test test/*.mjs`. |
| Levantar el servidor determinista | `npm run test:server` | Inicia `node tools/test-server.mjs` en `http://127.0.0.1:4174`. |
| Auditar responsive autenticado | `npm run test:responsive` | Ejecuta `python tools/responsive-audit.py`; requiere app local y servidor determinista activos. |
| Auditar teclado autenticado | `npm run test:keyboard` | Ejecuta `python tools/keyboard-audit.py`; requiere app local y servidor determinista activos. |
| Auditar movimiento reducido | `npm run test:motion` | Ejecuta `python tools/motion-audit.py`; requiere app local y servidor determinista activos. |
| Auditar resiliencia offline | `npm run test:offline` | Ejecuta `python tools/offline-audit.py`; requiere app local y servidor determinista activos. |
| Auditar fallos HTTP | `npm run test:failures` | Ejecuta `python tools/failure-audit.py`; requiere app local y servidor determinista activos. |
| Auditar consola 401 | `npm run test:console-401` | Ejecuta `python tools/console-401-audit.py`; requiere app local y servidor determinista activos. |
| Auditar fallo parcial de Tour | `npm run test:tour-partial-failure` | Ejecuta `python tools/tour-partial-failure-audit.py`; requiere app local y servidor determinista activos. |
| Auditar layout de Agenda | `npm run test:agenda-layout` | Ejecuta `python tools/agenda-layout-audit.py`; requiere app local y servidor determinista activos. |
| Auditar observer del Timeline | `npm run test:timeline-observer` | Ejecuta `python tools/timeline-observer-audit.py`; requiere app local y servidor determinista activos. |
| Auditar avisos de cache | `npm run test:cached-notices` | Ejecuta `python tools/cached-notice-audit.py`; requiere app local y servidor determinista activos. |
| Auditar drawer movil | `npm run test:mobile-drawer` | Ejecuta `python tools/mobile-drawer-audit.py`; requiere app local activo. |
| Auditar tema del fanatico | `npm run test:fan-theme` | Ejecuta `python tools/fan-theme-audit.py`; requiere app local y servidor determinista activos. |

La app local y el servidor determinista son procesos separados. Para pruebas manuales con datos sinteticos, inicia ambos y abre `http://127.0.0.1:4173/?testMode=1`. La auditoria responsive se puede ejecutar con ambos servidores activos o con `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 --server "npm run test:server" --port 4174 -- python tools/responsive-audit.py`. La auditoria de teclado usa los mismos servidores con `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 --server "npm run test:server" --port 4174 -- python tools/keyboard-audit.py`. La auditoria de movimiento reducido usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 --server "npm run test:server" --port 4174 -- python tools/motion-audit.py`. La auditoria offline usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 --server "npm run test:server" --port 4174 -- python tools/offline-audit.py`. La auditoria de fallos HTTP usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 --server "npm run test:server" --port 4174 -- python tools/failure-audit.py`. La auditoria de consola 401 usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 --server "npm run test:server" --port 4174 -- npm.cmd run test:console-401`. La auditoria de fallo parcial de Tour usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 --server "npm run test:server" --port 4174 -- npm.cmd run test:tour-partial-failure`. La auditoria de layout de Agenda usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 --server "npm run test:server" --port 4174 -- npm.cmd run test:agenda-layout`. La auditoria de observer usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 -- npm.cmd run test:timeline-observer`. La auditoria de avisos de cache usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 -- npm.cmd run test:cached-notices`. La auditoria del drawer movil usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 -- npm.cmd run test:mobile-drawer`. La auditoria de tema del fanatico usa `python C:\Users\uyv31\.agents\skills\webapp-testing\scripts\with_server.py --server "npm start" --port 4173 --server "npm run test:server" --port 4174 -- npm.cmd run test:fan-theme`.

## Alcance actual

- App shell con navegacion entre cinco modulos.
- Tour Virtual y Agenda Simultanea implementados con datos de API normalizados.
- Timeline Infinito esta implementado con carga unica de games, bloques locales de 10, fallback manual y retry. Dashboard del Fanatico esta implementado con favorito persistido, metricas desde API y snapshot local. Matriz de Enfrentamientos esta implementada con tablas 4x4 por grupo, resultados, pendientes y actualizacion parcial de celdas.
- Cliente HTTP central con JWT en memoria, endpoint allowlist, retry 429/500 y cache publica por endpoint.
- Accesibilidad, inclusion, seguridad y resiliencia quedan como criterio de listo en `docs/ACCESIBILIDAD_SEGURIDAD_SPEC.md`; la meta "intumbable" se mide como degradacion con gracia, fallos contenidos y recuperacion sin recarga.
- Test mode local con servidor determinista para autenticacion, fixtures de stadiums/games/teams/groups, 401, 429, 500 y reset.

## Seguridad

- No se persiste el JWT en `localStorage` ni `sessionStorage`.
- Los datos de API y cache se tratan como no confiables y se renderizan con `textContent`.
- No hay dependencias runtime ni CDN.
- El servidor local sirve headers defensivos y proxy allowlisted.

## Gaps conocidos

- El DOCX original `ProyectoFinal_ISW521_Categoria_B.docx` no esta presente en este repo.
- Falta validar Matriz contra API viva; el testMode ya cubre 12 grupos sinteticos deterministas.
- Falta auditoria manual completa WCAG 2.2 AA, screen reader, zoom y contrastes; teclado y movimiento reducido ya tienen auditorias Playwright automatizadas.
- Falta verificacion real de esquemas contra API viva con credenciales validas.

