**Universidad Técnica Nacional**

**Carrera de Ingeniería del Software**

**ISW-521: Programación en Ambiente Web I**

**Profesor:** Lic. Bryan Miguel Chaves Salas

**Modalidad:** Individual

**Valor:** 100 puntos

**Porcentaje: 15%**

**Catálogo de Proyectos - Categoría B: Interfaces Interactivas y DOM
Avanzado**

# 1. Introducción y Reglas del Proyecto

## 1.1 Tecnologías Obligatorias

Este laboratorio exige construir una aplicación JavaScript interactiva.
No es un ejercicio de maquetado: requiere manipulación avanzada del DOM,
manejo de eventos, consumo de la API REST pública del Mundial 2026
(https://worldcup26.ir) mediante Fetch, uso exclusivo de async/await en
cada llamada asíncrona, y manejo explícito de errores HTTP. Una
aplicación que solo muestra datos cuando todo funciona correctamente no
cumple el alcance del laboratorio.

## 1.2 El Mito del "Happy Path"

Un laboratorio que solo funciona en el "camino feliz", es decir, cuando
la API responde sin errores y la red nunca falla, obtiene una nota
drásticamente reducida, sin importar qué tan completa o vistosa sea la
funcionalidad visible. El manejo de errores no es un detalle adicional:
es el núcleo de la evaluación de este proyecto. Una interfaz perfecta
que se rompe ante un error 401, 429 o 500 no demuestra dominio del
curso.

## 1.3 Uso de Inteligencia Artificial

El uso de herramientas de inteligencia artificial está permitido como
apoyo durante el desarrollo. Sin embargo, la defensa técnica evalúa la
comprensión genuina del código entregado, sin distinción de su origen.
Un código generado por IA que el estudiante no pueda explicar ni
defender con criterio propio no sobrevive la defensa, sin importar si la
aplicación funciona correctamente.

## 1.4 Política de Calificación

**Regla estricta:** si el estudiante no supera la defensa oral y
técnica, la nota máxima del laboratorio se reduce automáticamente al
50%, independientemente de si la interfaz es perfecta o si la calidad
del código entregado es excelente. La defensa no es un trámite posterior
a la entrega: es parte integral de la calificación.

## 1.5 Arquitectura Base de Resiliencia (obligatoria)

Todo proyecto de este catálogo debe implementar, sin excepción, los
siguientes cinco puntos:

1.  **Autenticación JWT.** El token se obtiene autenticándose contra la
    API y se envía en cada petición como Authorization: Bearer
    \<token\>. Ninguna llamada a un endpoint de datos puede omitir este
    encabezado.

2.  **\`async/await\` exclusivo.** Toda llamada a fetch se resuelve con
    async/await. No se acepta .then() ni .catch() en ninguna parte del
    código entregado.

3.  **Manejo del error 401 sin recargar la página.** Si la API responde
    401, la interfaz debe limpiar el token guardado y mostrar una
    pantalla o modal de "sesión expirada" con opción de reautenticarse,
    sin invocar window.location.reload() ni equivalentes.

4.  **Backoff exponencial para errores 500 y 429.** Ante un error de
    servidor (500) o de límite de tasa (429), el cliente reintenta
    automáticamente con espera creciente (por ejemplo 1s, 2s, 4s, 8s).
    En el caso específico del 429, la interfaz debe mostrar un
    **countdown visible** (cuenta atrás en segundos) que indique cuándo
    ocurrirá el siguiente reintento automático.

5.  **Modo offline con \`localStorage\`.** La última respuesta exitosa
    de cada endpoint se guarda en localStorage. Si una petición nueva
    falla y existe una copia cacheada, la interfaz debe mostrar esos
    datos junto con un indicador visible de que son datos no
    actualizados.

## 1.6 Prohibiciones Absolutas

Ningún proyecto se aprueba si el código entregado contiene:

- alert(), en cualquier punto del flujo, incluyendo el manejo de
  errores.

- .then() o .catch(), incluso si conviven con async/await en otra parte
  del archivo.

- window.location.reload() (o equivalente) como mecanismo para resolver
  un error de sesión o de red.

# 2. Proyectos de la Categoría B: Interfaces Interactivas y DOM Avanzado

Esta categoría agrupa proyectos centrados en técnicas avanzadas de
manipulación del DOM: scroll programático, observadores de intersección,
layouts divididos y tematización dinámica. La dificultad principal no
está en el cálculo de datos, sino en construir interacciones fluidas y
consistentes con el estado de la interfaz.

### 2.1. Tour Virtual de Sedes 

**Objetivo Técnico:** practicar navegación interna del DOM mediante
scrollIntoView y manipulación de estado activo entre elementos.

**Endpoints a Consumir:** GET /get/stadiums, GET /get/games.

**Funcionalidades Exigidas:**

- Listar las 16 sedes de /get/stadiums como botones o tarjetas.

- Al hacer clic en una sede, ejecutar scrollIntoView({behavior:
  'smooth'}) hacia la sección del DOM que lista los partidos de esa
  sede, filtrados de /get/games por stadium_id.

- Mantener un estado visual de "sede activa" que se actualice al hacer
  clic.

**El Reto de Resiliencia:** si /get/games falla, los botones de sedes
deben seguir siendo clicables. La sección de partidos de la sede
seleccionada muestra un mensaje local de "no se pudieron cargar los
partidos de esta sede" sin bloquear la navegación hacia otras sedes.

### 2.2. Agenda Simultánea 

**Objetivo Técnico:** practicar agrupación por clave compuesta y
construcción de layouts divididos con CSS Grid o Flexbox.

**Endpoints a Consumir:** GET /get/games, GET /get/teams.

**Funcionalidades Exigidas:**

- Agrupar los partidos de /get/games por local_date.

- Detectar las fechas donde existan 2 o más partidos programados el
  mismo día.

- Renderizar un layout dividido en columnas, una por partido simultáneo,
  mostrando nombres reales cruzados contra /get/teams.

- Permitir navegar entre fechas con controles de "fecha anterior" y
  "fecha siguiente".

**El Reto de Resiliencia:** si al cambiar de fecha no hay datos en caché
ni respuesta de red disponible, el layout dividido se muestra con
esqueletos de carga (skeleton) en cada columna. No se permite una
pantalla en blanco mientras se espera la respuesta.

### 2.3. Timeline Infinito 

**Objetivo Técnico:** practicar IntersectionObserver para simular carga
progresiva en el DOM sin paginar la petición HTTP.

**Endpoints a Consumir:** GET /get/games.

**Funcionalidades Exigidas:**

- Pedir los 104 partidos en una sola llamada a /get/games.

- Ordenarlos cronológicamente por local_date.

- Insertar bloques de 10 partidos en el DOM a medida que el usuario hace
  scroll, usando IntersectionObserver sobre un elemento centinela al
  final de la lista visible.

**El Reto de Resiliencia:** si la petición inicial falla, el observer no
puede quedar esperando indefinidamente. La interfaz muestra un estado de
error con un botón de reintento manual que dispara el backoff
exponencial. Una vez recuperados los datos, la inserción progresiva
arranca desde el principio sin duplicar partidos ya insertados en
intentos previos.

### 2.4. Dashboard del Fanático Incondicional 

**Objetivo Técnico:** practicar tematización dinámica del DOM mediante
variables CSS y persistencia de preferencias en localStorage.

**Endpoints a Consumir:** GET /get/teams, GET /get/games, GET
/get/groups.

**Funcionalidades Exigidas:**

- Un selector único de "equipo favorito", guardado en localStorage.

- Al elegir un equipo, filtrar exclusivamente sus partidos desde
  /get/games.

- Cruzar contra /get/groups para mostrar su posición actual dentro de su
  grupo (pts, gf, ga).

- Repintar variables CSS del dashboard según el equipo elegido (por
  ejemplo, un color de acento distinto por equipo).

**El Reto de Resiliencia:** el equipo favorito guardado debe sobrevivir
a un refresco completo de la página. Si la API no responde al recargar,
el dashboard muestra el último estado cacheado de ese equipo con un
aviso de "datos no actualizados", nunca un dashboard vacío.

### 2.5. Matriz de Enfrentamientos por Grupo 

**Objetivo Técnico:** practicar la construcción de una cuadrícula
interactiva a partir del cruce de tres recursos distintos.

**Endpoints a Consumir:** GET /get/groups, GET /get/teams, GET
/get/games.

**Funcionalidades Exigidas:**

- Por cada uno de los 12 grupos, construir una matriz 4x4 donde filas y
  columnas son los 4 equipos del grupo, obtenidos cruzando /get/groups
  con /get/teams.

- Cada celda muestra el resultado del partido entre la fila y la columna
  correspondientes, si ya se jugó según /get/games, o la palabra
  "Pendiente" si no.

- La diagonal de la matriz (equipo contra sí mismo) queda visualmente
  deshabilitada.

**El Reto de Resiliencia:** si la petición de partidos falla, la matriz
se renderiza completa con todas las celdas en estado "Pendiente", en
lugar de no mostrar la matriz. Al recuperar la conexión, solo se
actualizan las celdas afectadas; la matriz no se reconstruye desde cero.

# 3. Guía de Defensa Técnica

Antes de calificar el laboratorio, el profesor realiza una defensa oral
y técnica en vivo, individual, frente al computador del estudiante. La
defensa se compone de dos partes y se aplica sobre el proyecto entregado
de esta categoría.

## 3.1 Preguntas Teóricas

El profesor puede preguntar, entre otras:

- ¿Qué pasa exactamente si la API devuelve un error 500 al pedir
  /get/games en este proyecto?

- ¿Por qué se usó async/await y no .then/.catch en la función que
  escucha el evento de scroll o de clic?

- ¿Qué ocurre en la interfaz si el token JWT expira mientras el
  IntersectionObserver sigue activo?

- ¿Por qué no se usa window.location.reload() para resolver un error de
  sesión?

- ¿Qué pasaría si el usuario hace clic varias veces seguidas antes de
  que termine la animación de scroll?

## 3.2 Pruebas Prácticas en DevTools

El profesor exige que el estudiante demuestre en vivo, usando las
herramientas de desarrollador del navegador:

- **Pestaña Console:** la captura del error correspondiente (401, 429
  o 500) sin que la aplicación se rompa visualmente ni quede en blanco.

- **Pestaña Network:** el estado de la petición fallida (código de
  estado, encabezados, cuerpo de la respuesta) y, si aplica, los
  reintentos generados por el backoff exponencial, incluyendo los
  tiempos de espera entre cada uno.

El estudiante que no pueda reproducir estas pruebas en vivo, o que no
pueda explicar por qué su código responde de esa manera, no aprueba la
defensa, independientemente de la calidad visual del proyecto entregado.

# 4. Rúbrica de Evaluación de Cumplimiento del Proyecto (50 puntos)

| **Rubro**                                                                                     | **Excelente (10 pts)**                                                                                                                                                                                                                                                                                                                                                                                                                       | **Regular (5 pts)**                                                                                                                                                                                                                                               | **Insuficiente (0 pts)**                                                                                                                                                                 |
|-----------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Funcionalidades Exigidas del Proyecto Elegido (interfaces interactivas y DOM avanzado)** | Implementa de manera completa y correcta todas las funcionalidades exigidas para el subproyecto elegido del catálogo (Tour Virtual de Sedes, Agenda Simultánea, Timeline Infinito, Dashboard del Fanático Incondicional o Matriz de Enfrentamientos por Grupo), incluyendo la interacción avanzada del DOM exigida (scrollIntoView, IntersectionObserver, layout dividido o tematización dinámica) según lo descrito en su Objetivo Técnico. | Implementa la mayoría de las funcionalidades exigidas, pero la interacción avanzada presenta errores visibles (scroll abrupto, observer que duplica elementos, o layout que se rompe en ciertas resoluciones).                                                    | Falta la interacción avanzada exigida para el subproyecto elegido, los eventos no disparan ninguna actualización, o el comportamiento es estático cuando debía ser dinámico.             |
| **2. Implementación Asíncrona Estricta (async/await) y estructura del Fetch**                 | Todas las llamadas a la API usan async/await sin ningún rastro de .then/.catch; las funciones de fetch están separadas de la lógica de presentación, y cada llamada incluye el encabezado Authorization con el token JWT.                                                                                                                                                                                                                    | Existe uso de async/await pero mezclado con .then/.catch en alguna parte del código, o falta el encabezado JWT en alguna llamada.                                                                                                                                 | El código usa predominantemente .then/.catch, o las llamadas a la API no incluyen el token JWT.                                                                                          |
| **3. Manejo de Sesión (401) y Límite de Tasa (429)**                                          | Ante un 401, la aplicación limpia el token, muestra una pantalla o modal de sesión expirada y permite reautenticarse, sin usar window.location.reload(). Ante un 429, se muestra un countdown visible con el tiempo restante antes del siguiente reintento automático.                                                                                                                                                                       | El 401 se maneja de forma incompleta (sin opción clara de reautenticación), o el 429 se maneja sin countdown visible para el usuario.                                                                                                                             | El 401 se resuelve recargando la página, o el 429 no se maneja de ninguna forma visible.                                                                                                 |
| **4. Resiliencia General (500, Offline, Backoff) y Reto de Resiliencia del Proyecto Elegido** | Ante un error 500, la aplicación reintenta automáticamente con backoff exponencial y, si existe copia cacheada en localStorage, la muestra con un indicador de datos no actualizados; además resuelve correctamente el Reto de Resiliencia descrito en la sección 2 para el subproyecto elegido (por ejemplo, mantener clicables los botones de navegación o conservar la matriz ya dibujada cuando uno de los recursos cruzados falla).     | Implementa el backoff exponencial o el modo offline, pero no ambos, o resuelve el Reto de Resiliencia del subproyecto elegido solo de forma parcial.                                                                                                              | Un error 500 deja la interfaz en blanco sin reintentos ni datos de respaldo, y el Reto de Resiliencia del subproyecto elegido no se atiende.                                             |
| **5. Prohibiciones Absolutas y Organización del Código**                                      | El código entregado no contiene alert() en ningún punto del flujo, no mezcla .then()/.catch() con async/await en ninguna parte, y no recurre a window.location.reload() (ni equivalente) para resolver un error de sesión o de red; la lógica de fetch se mantiene separada con claridad de la lógica de presentación.                                                                                                                       | Cumple la mayoría de las prohibiciones, pero presenta una infracción aislada (por ejemplo, un alert() de depuración olvidado o una mezcla puntual de .then() en un archivo secundario), o la separación entre fetch y presentación es poco clara en alguna vista. | El código incurre de forma evidente en una o más prohibiciones absolutas: alert() en el flujo, .then()/.catch() presente, o reload() usado como solución de un error de sesión o de red. |

**Total Rúbrica de Cumplimiento del Proyecto: 50 puntos.**

# 5. Rúbrica de Evaluación de Defensa Técnica (50 puntos)

| **Rubro**                                                                         | **Excelente (10 pts)**                                                                                                                                                                                                                                                               | **Regular (5 pts)**                                                                                                                                                                                                   | **Insuficiente (0 pts)**                                                                                                                                        |
|-----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Comprensión General del Manejo de Errores**                                  | Responde con precisión y sin vacilación a las preguntas teóricas generales sobre el manejo de errores 401, 429 y 500, y explica por qué el laboratorio exige async/await en lugar de .then/.catch y por qué no se permite window.location.reload() para resolver un error de sesión. | Responde correctamente la mayoría de estas preguntas generales, pero con imprecisiones o vacilaciones que el profesor debe corregir o aclarar.                                                                        | Confunde conceptos básicos del manejo de errores (por ejemplo, no distingue un 401 de un 429), o responde con conjeturas sin fundamento técnico.                |
| **2. Dominio Técnico de Interacciones Avanzadas del DOM**                         | Explica con precisión qué ocurre en su aplicación si el token JWT expira mientras un IntersectionObserver sigue activo, y cómo su código evita estados inconsistentes cuando el usuario hace clic varias veces seguidas antes de que termine una animación de scroll.                | Explica el comportamiento general de la interacción avanzada implementada, pero con dudas sobre el efecto de clics repetidos durante una animación en curso o de un token expirado mientras un observer sigue activo. | No logra explicar cómo su aplicación maneja clics repetidos, animaciones en curso, o el efecto de un token expirado sobre la interacción avanzada implementada. |
| **3. Prueba Práctica en DevTools: Pestaña Console**                               | Reproduce en vivo, sin ayuda, el error solicitado por el profesor (401, 429 o 500) en la pestaña Console, mostrando que la aplicación captura el error sin romperse visualmente ni quedar en blanco.                                                                                 | Reproduce el error después de varios intentos o con ayuda del profesor, o la captura en Console es parcial o incompleta.                                                                                              | No logra reproducir el error en la pestaña Console, o la aplicación se rompe visualmente al hacerlo.                                                            |
| **4. Prueba Práctica en DevTools: Pestaña Network**                               | Identifica y explica con precisión el estado de la petición fallida en Network (código de estado, encabezados, cuerpo de la respuesta) y muestra en vivo los reintentos generados por el backoff exponencial, incluyendo los tiempos de espera entre cada uno.                       | Identifica el estado de la petición fallida, pero no logra mostrar o explicar con claridad los reintentos del backoff exponencial.                                                                                    | No logra ubicar ni explicar la petición fallida en la pestaña Network.                                                                                          |
| **5. Defensa con Criterio Propio del Código (propio o generado con apoyo de IA)** | Explica con criterio propio cualquier parte del código entregado, incluidas las secciones generadas con apoyo de IA, justificando las decisiones de diseño y respondiendo con seguridad a las preguntas de seguimiento del profesor.                                                 | Explica el código con dudas relevantes en partes puntuales, en especial en secciones generadas con apoyo de IA, que el profesor debe aclarar.                                                                         | No puede explicar ni defender con criterio propio el código entregado, sin importar si fue escrito por el estudiante o generado con IA.                         |

**Total Rúbrica de Defensa Técnica: 50 puntos.**

**Nota sobre la calificación total:** el laboratorio tiene un valor
total de 100 puntos, compuestos por 50 puntos de la Rúbrica de
Cumplimiento del Proyecto y 50 puntos de la Rúbrica de Defensa Técnica.
Si el estudiante no supera la defensa oral y técnica, es decir, si
obtiene menos de 25 de los 50 puntos de la Rúbrica de Defensa Técnica,
la nota máxima total del laboratorio se reduce automáticamente al 50%
(50 de 100 puntos), independientemente del puntaje obtenido en la
Rúbrica de Cumplimiento del Proyecto.
