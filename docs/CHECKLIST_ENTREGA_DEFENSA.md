# Checklist final de entrega y defensa

## Antes de entregar

- [ ] `git status` limpio o con solo cambios intencionales; confirmar que no hay archivos de configuración local (`.env`, IDE) a punto de subirse.
- [ ] `npm test` → 157/157 en verde (re-ejecutar, no confiar en una corrida vieja).
- [ ] Las 17 auditorías Playwright (`npm run test:final-local` con `npm start` + `npm run test:server` activos) → `FINAL_LOCAL_AUDITS_PASS scripts=17`.
- [ ] `npm run test:live-api` → `LIVE_API_PUBLIC_PROBE_PASSED` con conteos reales (`teams=48 games=104 groups=12 stadiums=16`).
- [ ] `npm run test:live-api:auth` → documentar el resultado tal cual sale (hoy: `HTTP 400 User not found`, contradicción externa conocida, no la ocultes).
- [ ] Archivos requeridos presentes: `README.md`, `docs/MATRIZ_CUMPLIMIENTO.md`, `docs/ACCESSIBILITY_AUDIT.md`, `docs/SECURITY_REVIEW.md`, `docs/GUIA_DEFENSA_INFJ_T.md`, `docs/EVIDENCIAS_DEFENSA.md`, `docs/DEFENSA_TECNICA.md`, este checklist.
- [ ] Archivos innecesarios fuera del repo entregado: verificar que no se incluyan capturas de pantalla temporales, logs de servidor (`/tmp/*.log`), ni carpetas de herramientas ajenas al proyecto (`.codegraph`, `.agents`, cachés de skills) si el profesor pide un zip limpio.
- [ ] Secretos y `.env`: confirmar que `.env` está en `.gitignore` y que ningún commit incluye `WC26_API_EMAIL`/`WC26_API_PASSWORD` en texto plano.
- [ ] README contiene los comandos exactos y no depende de una ruta de una computadora específica (revisar que no queden rutas absolutas tipo `C:\Users\<usuario>\...` fuera de comentarios de configuración local).
- [ ] Evidencias: `docs/EVIDENCIAS_DEFENSA.md` completo y cada procedimiento probado al menos una vez por vos mismo antes de la defensa.

## Antes de la defensa

- [ ] Servidores preparados: `npm start` (4173) y `npm run test:server` (4174) corriendo y verificados con `curl`/navegador antes de que entre el profesor.
- [ ] URLs abiertas en pestañas: `http://127.0.0.1:4173/?testMode=1` y, si aplica, `https://worldcup26.ir` para mostrar la API real.
- [ ] DevTools abierto con Console y Network visibles, "Preserve log" activado.
- [ ] Caché calentada: navegar las 5 rutas una vez para poblar `localStorage` antes de mostrar el modo offline.
- [ ] Test mode confirmado activo (insignia visible en la UI).
- [ ] Comandos clave copiados y a mano: `npm test`, `npm run test:api-resilience`, `npm run test:live-api`.
- [ ] Archivos clave abiertos en el editor en pestañas: `js/api.js`, `js/app.js`, `js/retry-status.js`, `js/session.js`, uno de los `*-view.js` que más domines.
- [ ] Plan alternativo sin internet: si `https://worldcup26.ir` no responde el día de la defensa, mostrar `npm run test:live-api` grabado/último log, y apoyarse 100% en el servidor determinista local para toda la demo.

## Durante la defensa

- [ ] Explicar antes de ejecutar — decir qué se espera ver ANTES de hacer clic/correr el comando.
- [ ] Mostrar Network en cada demo de error (401/429/500).
- [ ] Mostrar Console en cada demo de error (confirmar ausencia de errores JS no controlados).
- [ ] Mostrar la UI reaccionando (modal, countdown, aviso de caché) — no solo el código.
- [ ] Mostrar el código responsable del comportamiento que se acaba de demostrar.
- [ ] Mostrar el test que cubre ese comportamiento (nombre exacto del `test()`).
- [ ] No afirmar nada que no se haya verificado en esta sesión — si el profesor pregunta algo fuera de lo preparado, es preferible decir "no lo verifiqué, lo reviso" que inventar una respuesta.
