# WC26 Interactive Hub

Aplicacion vanilla JavaScript para explorar el Mundial 2026 con una base de resiliencia, seguridad y accesibilidad.

## Comandos

```bash
npm start
npm test
npm run test:server
```

- App local: `http://127.0.0.1:4173`
- Test server determinista: `http://127.0.0.1:4174`

## Alcance actual

- App shell con navegacion entre cinco modulos.
- Tour Virtual y Agenda Simultanea implementados con datos de API normalizados.
- Timeline, Dashboard del Fanatico y Matriz tienen placeholders funcionales mientras se implementan sus flujos completos.
- Cliente HTTP central con JWT en memoria, endpoint allowlist, retry 429/500 y cache publica por endpoint.
- Test mode local con servidor determinista para 401, 429, 500 y reset.

## Seguridad

- No se persiste el JWT en `localStorage` ni `sessionStorage`.
- Los datos de API y cache se tratan como no confiables y se renderizan con `textContent`.
- No hay dependencias runtime ni CDN.
- El servidor local sirve headers defensivos y proxy allowlisted.

## Gaps conocidos

- El DOCX original `ProyectoFinal_ISW521_Categoria_B.docx` no esta presente en este repo.
- Falta completar Timeline, Dashboard y Matriz con datos reales.
- Falta auditoria manual completa WCAG 2.2 AA, screen reader y contrastes.
- Falta verificacion real de esquemas contra API viva con credenciales validas.
