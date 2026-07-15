# WC26 Interactive Hub

Aplicacion vanilla JavaScript para explorar el Mundial 2026 con una base de resiliencia, seguridad y accesibilidad.

## Comandos

| Tarea | Comando exacto | Resultado esperado |
|---|---|---|
| Servir la app local | `npm start` | Inicia `node tools/app-server.mjs` en `http://127.0.0.1:4173`. |
| Ejecutar la suite completa | `npm test` | Ejecuta `node --test test/*.mjs`. |
| Levantar el servidor determinista | `npm run test:server` | Inicia `node tools/test-server.mjs` en `http://127.0.0.1:4174`. |

La app local y el servidor determinista son procesos separados. Para pruebas manuales con datos sinteticos, inicia ambos y abre `http://127.0.0.1:4173/?testMode=1`.

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
- Falta auditoria manual completa WCAG 2.2 AA, screen reader y contrastes.
- Falta verificacion real de esquemas contra API viva con credenciales validas.
