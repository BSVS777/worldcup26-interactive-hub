export const LOCALE_STORAGE_KEY = 'wc26:locale:v1';
export const DEFAULT_LOCALE = 'es';
export const SUPPORTED_LOCALES = Object.freeze(['es', 'en']);

const COPY = Object.freeze({
  es: Object.freeze({
    'meta.title': 'Teatro Global de Partidos',
    'meta.description': 'Explora sedes, partidos, equipos y grupos de una competición mundial de fútbol con una experiencia cinematográfica interactiva.',
    'skip.main': 'Saltar al contenido principal',
    'skip.navigation': 'Volver a la navegación',
    'header.edition': 'Centro de mando del fútbol continental',
    'header.homeLabel': 'Inicio de Global Match Theatre',
    'common.testMode': 'Modo de prueba',
    'common.vs': 'vs',
    'common.north': 'Norte',
    'common.central': 'Centro',
    'common.south': 'Sur',
    'common.unknownTeam': 'Equipo desconocido',
    'common.unknownStadium': 'Estadio desconocido',
    'common.group': 'Grupo {id}',
    'common.teamUnavailable': 'Datos del equipo no disponibles',
    'common.notPlayed': 'Aún no disputado',
    'common.dateTbc': 'Fecha por confirmar',
    'common.tbc': 'por confirmar',
    'common.cachedData': 'datos en caché',
    'language.groupLabel': 'Idioma',
    'language.toggleLabel': 'Idioma inglés',
    'language.es': 'ESP',
    'language.en': 'ENG',
    'language.esAction': 'Cambiar el idioma a español',
    'language.enAction': 'Cambiar el idioma a inglés',
    'nav.label': 'Vistas del Mundial',
    'nav.open': 'Vistas',
    'nav.choose': 'Elige una puerta',
    'nav.route.tour': 'Recorrido',
    'nav.route.agenda': 'Agenda',
    'nav.route.timeline': 'Cronología',
    'nav.route.fan-dashboard': 'Panel del aficionado',
    'nav.route.group-matrix': 'Matriz de grupos',
    'route.marker': 'Puerta {marker}',
    'route.tour.label': 'Recorrido',
    'route.tour.title': 'Recorrido virtual por sedes',
    'route.tour.heading': 'Mapa de sedes y lista de partidos',
    'route.tour.description': 'Recorre el continente a través de cada estadio anfitrión y los partidos que se disputan allí.',
    'route.tour.next': 'Aquí aparecerán las tarjetas de las sedes y sus partidos relacionados.',
    'route.agenda.label': 'Agenda',
    'route.agenda.title': 'Agenda simultánea',
    'route.agenda.heading': 'Panel de partidos simultáneos',
    'route.agenda.description': 'Compara cada inicio simultáneo sin perder la estructura de la jornada.',
    'route.agenda.next': 'Aquí aparecerán las columnas de partidos paralelos y los controles de fecha.',
    'route.timeline.label': 'Cronología',
    'route.timeline.title': 'Cronología infinita',
    'route.timeline.heading': 'Flujo cronológico de partidos',
    'route.timeline.description': 'Sigue el torneo en orden, desde el silbato inicial hasta la final.',
    'route.timeline.next': 'Aquí aparecerán grupos progresivos de diez partidos.',
    'route.fan-dashboard.label': 'Panel del aficionado',
    'route.fan-dashboard.title': 'Panel del aficionado fiel',
    'route.fan-dashboard.heading': 'Tu equipo de un vistazo',
    'route.fan-dashboard.description': 'Mantén cerca a una selección: partidos, posición de grupo, goles y rendimiento en una sola vista.',
    'route.fan-dashboard.next': 'Aquí aparecerán los controles del equipo favorito y una instantánea guardada resistente a fallos.',
    'route.group-matrix.label': 'Matriz de grupos',
    'route.group-matrix.title': 'Matriz de enfrentamientos por grupo',
    'route.group-matrix.heading': 'Todos los enfrentamientos de cada grupo',
    'route.group-matrix.description': 'Consulta los doce grupos como marcadores compactos de enfrentamientos directos.',
    'route.group-matrix.next': 'Aquí aparecerán matrices adaptables de enfrentamientos 4 × 4.',
    'module.current': 'Vista actual',
    'module.shellReady': 'Interfaz lista',
    'module.preparing': 'Esta puerta se está preparando',
    'module.sessionReady': 'Sesión lista',
    'module.preview': 'Vista previa',
    'module.selected': 'Vista {route} seleccionada.',
    'session.secureAccess': 'Acceso seguro',
    'session.title': 'Inicia sesión para cargar datos de partidos en vivo',
    'session.expiredTitle': 'Tu sesión expiró',
    'session.copy': 'Tu atlas permanecerá abierto mientras inicias sesión.',
    'session.expiredCopy': 'Inicia sesión de nuevo. El atlas continuará aquí sin recargarse.',
    'session.email': 'Correo electrónico',
    'session.password': 'Contraseña',
    'session.signIn': 'Iniciar sesión',
    'session.signingIn': 'Iniciando sesión…',
    'session.expiredStatus': 'Tu sesión expiró. Inicia sesión para continuar.',
    'session.signedInStatus': 'Sesión iniciada. La vista actual está lista.',
    'session.signedInLive': 'Sesión iniciada. Los datos de partidos en vivo están disponibles.',
    'session.genericFailure': 'No pudimos iniciar sesión. Inténtalo de nuevo.',
    'session.invalidCredentials': 'El correo electrónico o la contraseña no fueron aceptados. Revisa ambos campos e inténtalo de nuevo.',
    'session.invalidResponse': 'El servicio de inicio de sesión devolvió una respuesta no válida. Inténtalo de nuevo en unos instantes.',
    'session.unreachable': 'No se pudo contactar el servicio de inicio de sesión. Revisa tu conexión e inténtalo de nuevo.',
    'session.busy': 'El servicio de inicio de sesión está ocupado. Espera un momento e inténtalo de nuevo.',
    'session.unavailable': 'El servicio de inicio de sesión no está disponible temporalmente. Inténtalo de nuevo en unos instantes.',
    'session.incomplete': 'No se pudo completar el inicio de sesión. Inténtalo de nuevo.',
    'tour.venuesLabel': 'Sedes anfitrionas del Mundial 2026',
    'tour.selectHint': 'Selecciona una sede para ver sus partidos.',
    'tour.cityTbc': 'Ciudad por confirmar',
    'tour.matchesUnavailable': 'Datos de partidos no disponibles',
    'tour.matches': Object.freeze({ one: '{count} partido', other: '{count} partidos' }),
    'tour.cachedHeading': '{venue} (datos en caché)',
    'tour.venueGamesUnavailable': 'Los datos de partidos de {venue} no están disponibles en este momento. Prueba otra sede o actualiza más tarde.',
    'tour.noMatches': 'Todavía no hay partidos programados para {venue}.',
    'tour.loadError': 'No se pudieron cargar las sedes. Inténtalo de nuevo más tarde.',
    'agenda.previous': 'Anterior',
    'agenda.next': 'Siguiente',
    'agenda.previousLabel': 'Jornada anterior',
    'agenda.nextLabel': 'Jornada siguiente',
    'agenda.loading': 'Cargando partidos…',
    'agenda.unavailable': 'El calendario de partidos no está disponible en este momento.',
    'agenda.empty': 'Aún no hay partidos programados.',
    'agenda.cachedDate': '{date} · datos en caché',
    'timeline.ready': 'Cronología lista.',
    'timeline.label': 'Cronología de partidos en orden cronológico',
    'timeline.loadMore': 'Cargar 10 partidos más',
    'timeline.retry': 'Reintentar cronología',
    'timeline.match': 'Partido {id}',
    'timeline.stadium': 'Estadio {stadium}',
    'timeline.retrying': 'Nuevo intento en {seconds} s.',
    'timeline.loading': 'Cargando la cronología de partidos.',
    'timeline.unavailable': 'La cronología de partidos no está disponible. Reintenta cuando la API sea accesible.',
    'timeline.empty': 'Aún no hay partidos disponibles.',
    'timeline.shownCached': '{visible} de {total} partidos mostrados desde datos en caché.',
    'timeline.shown': '{visible} de {total} partidos mostrados.',
    'fan.favorite': 'Equipo favorito',
    'fan.matchesLabel': 'Partidos del equipo favorito',
    'fan.ready': 'Panel del aficionado listo.',
    'fan.loadingSummary': 'Cargando el panel del aficionado.',
    'fan.selectSummary': 'Selecciona un equipo cuando haya datos de equipos en vivo.',
    'fan.savedSnapshot': 'instantánea guardada',
    'fan.status': 'Estado',
    'fan.loading': 'Cargando',
    'fan.unavailable': 'No disponible',
    'fan.points': 'Puntos',
    'fan.goalsFor': 'Goles a favor',
    'fan.goalsAgainst': 'Goles en contra',
    'fan.matches': 'Partidos',
    'fan.matchesUnavailable': 'Los partidos no están disponibles. El resumen guardado del equipo continúa visible.',
    'fan.noMatches': 'Aún no hay partidos relacionados con este equipo.',
    'fan.loadingAll': 'Cargando equipos, partidos y grupos.',
    'fan.readyCached': 'Panel del aficionado listo con datos en caché.',
    'fan.snapshotStatus': 'Se muestra la instantánea guardada del equipo favorito porque los datos en vivo del panel no están disponibles.',
    'fan.partial': 'El panel se cargó con datos en vivo parciales.',
    'fan.available': 'Panel del aficionado listo.',
    'fan.notAvailable': 'Panel del aficionado no disponible.',
    'matrix.ready': 'Matriz de grupos lista.',
    'matrix.label': 'Matrices de enfrentamientos por grupo',
    'matrix.loading': 'Cargando grupos, equipos y partidos.',
    'matrix.unavailable': 'La matriz de grupos no está disponible. Se necesitan los grupos para construir las tablas.',
    'matrix.partialCached': 'La matriz de grupos se cargó con datos en caché y datos en vivo parciales.',
    'matrix.partial': 'La matriz de grupos se cargó con datos en vivo parciales.',
    'matrix.readyCached': 'Matriz de grupos lista con datos en caché.',
    'matrix.emptyStatus': 'Aún no hay datos de grupos disponibles.',
    'matrix.groupsUnavailable': 'Los grupos no están disponibles, por lo que no se pueden crear los enfrentamientos.',
    'matrix.noGroups': 'No hay grupos disponibles para crear matrices de enfrentamientos.',
    'matrix.caption': 'Matriz de enfrentamientos directos de {group}',
    'matrix.partialCaption': 'Matriz de enfrentamientos directos de {group} con {count} equipos enumerados',
    'matrix.team': 'Equipo',
    'matrix.sameTeam': 'Mismo equipo',
    'matrix.pending': 'Pendiente',
    'matrix.pendingLabel': '{home} vs {away} pendiente',
    'matrix.playedLabel': '{team}, {scoreFor} a {scoreAgainst} contra {opponent}',
    'retry.responded': 'respondió con {status}',
    'retry.unreachable': 'no fue accesible',
    'retry.message': 'GET {path} {cause}. Nuevo intento en {seconds} s.',
    'footer.pulse': 'Global Match Theatre · Cinco vistas en vivo, un solo pulso del torneo.',
    'footer.data': 'Los datos en vivo se cargan desde la API pública del torneo. El inicio de sesión es una vía opcional de compatibilidad.',
    'a11y.settings': 'Configuración de accesibilidad',
    'a11y.title': 'Accesibilidad',
    'a11y.close': 'Cerrar la configuración de accesibilidad',
    'a11y.hint': 'Ajusta la apariencia y el movimiento de Global Match Theatre. Los cambios se guardan en este dispositivo.',
    'a11y.largeText': 'Texto grande',
    'a11y.highContrast': 'Alto contraste',
    'a11y.reduceTransparency': 'Reducir transparencia',
    'a11y.reduceMotion': 'Reducir movimiento',
    'a11y.underlineLinks': 'Subrayar enlaces',
    'a11y.reset': 'Restablecer valores predeterminados'
  }),
  en: Object.freeze({
    'meta.title': 'Global Match Theatre',
    'meta.description': 'Explore venues, matches, teams, and groups from a global football competition through an interactive cinematic experience.',
    'skip.main': 'Skip to main content',
    'skip.navigation': 'Back to navigation',
    'header.edition': 'Continental football command room',
    'header.homeLabel': 'Global Match Theatre home',
    'common.testMode': 'Test mode',
    'common.vs': 'vs',
    'common.north': 'North',
    'common.central': 'Central',
    'common.south': 'South',
    'common.unknownTeam': 'Unknown team',
    'common.unknownStadium': 'Unknown stadium',
    'common.group': 'Group {id}',
    'common.teamUnavailable': 'Team data unavailable',
    'common.notPlayed': 'Not played yet',
    'common.dateTbc': 'Date to be confirmed',
    'common.tbc': 'TBC',
    'common.cachedData': 'cached data',
    'language.groupLabel': 'Language',
    'language.toggleLabel': 'English language',
    'language.es': 'ESP',
    'language.en': 'ENG',
    'language.esAction': 'Change language to Spanish',
    'language.enAction': 'Change language to English',
    'nav.label': 'World Cup views',
    'nav.open': 'Views',
    'nav.choose': 'Choose a gate',
    'nav.route.tour': 'Tour',
    'nav.route.agenda': 'Agenda',
    'nav.route.timeline': 'Timeline',
    'nav.route.fan-dashboard': 'Fan dashboard',
    'nav.route.group-matrix': 'Group matrix',
    'route.marker': 'Gate {marker}',
    'route.tour.label': 'Tour',
    'route.tour.title': 'Virtual venue tour',
    'route.tour.heading': 'Venue map and match list',
    'route.tour.description': 'Cross the continent through every host stadium and the matches played there.',
    'route.tour.next': 'Venue cards and their linked fixtures will appear here.',
    'route.agenda.label': 'Agenda',
    'route.agenda.title': 'Simultaneous agenda',
    'route.agenda.heading': 'Simultaneous matchday board',
    'route.agenda.description': 'Compare every overlapping kickoff without losing the shape of the day.',
    'route.agenda.next': 'Parallel fixture columns and date controls will appear here.',
    'route.timeline.label': 'Timeline',
    'route.timeline.title': 'Infinite timeline',
    'route.timeline.heading': 'Chronological match stream',
    'route.timeline.description': 'Follow the tournament in order, from the opening whistle to the final.',
    'route.timeline.next': 'Progressive groups of ten matches will appear here.',
    'route.fan-dashboard.label': 'Fan dashboard',
    'route.fan-dashboard.title': 'Loyal fan dashboard',
    'route.fan-dashboard.heading': 'Your team at a glance',
    'route.fan-dashboard.description': 'Keep one nation close: fixtures, group position, goals, and form in one view.',
    'route.fan-dashboard.next': 'Favorite-team controls and a resilient saved snapshot will appear here.',
    'route.group-matrix.label': 'Group matrix',
    'route.group-matrix.title': 'Group matchup matrix',
    'route.group-matrix.heading': 'Every group matchup',
    'route.group-matrix.description': 'Read all twelve groups as compact head-to-head scoreboards.',
    'route.group-matrix.next': 'Responsive 4 × 4 matchup matrices will appear here.',
    'module.current': 'Current view',
    'module.shellReady': 'Shell ready',
    'module.preparing': 'This gate is being prepared',
    'module.sessionReady': 'Session ready',
    'module.preview': 'Preview',
    'module.selected': '{route} view selected.',
    'session.secureAccess': 'Secure access',
    'session.title': 'Sign in to load live match data',
    'session.expiredTitle': 'Your session expired',
    'session.copy': 'Your atlas stays open while you sign in.',
    'session.expiredCopy': 'Sign in again. The atlas will resume here without reloading.',
    'session.email': 'Email',
    'session.password': 'Password',
    'session.signIn': 'Sign in',
    'session.signingIn': 'Signing in…',
    'session.expiredStatus': 'Your session expired. Sign in to continue.',
    'session.signedInStatus': 'Signed in. Your current view is ready.',
    'session.signedInLive': 'Signed in. Live match data is available.',
    'session.genericFailure': 'We could not sign in. Try again.',
    'session.invalidCredentials': 'Email or password was not accepted. Check both fields and try again.',
    'session.invalidResponse': 'The sign-in service returned an invalid response. Try again shortly.',
    'session.unreachable': 'Could not reach the sign-in service. Check your connection and try again.',
    'session.busy': 'The sign-in service is busy. Wait a moment and try again.',
    'session.unavailable': 'The sign-in service is temporarily unavailable. Try again shortly.',
    'session.incomplete': 'Sign in could not be completed. Try again.',
    'tour.venuesLabel': 'World Cup 2026 host venues',
    'tour.selectHint': 'Select a venue to see its matches.',
    'tour.cityTbc': 'City to be confirmed',
    'tour.matchesUnavailable': 'Match data unavailable',
    'tour.matches': Object.freeze({ one: '{count} match', other: '{count} matches' }),
    'tour.cachedHeading': '{venue} (cached data)',
    'tour.venueGamesUnavailable': 'Match data for {venue} is unavailable right now. Try another venue or refresh later.',
    'tour.noMatches': 'No matches are scheduled for {venue} yet.',
    'tour.loadError': 'Venues could not be loaded. Try again later.',
    'agenda.previous': 'Previous',
    'agenda.next': 'Next',
    'agenda.previousLabel': 'Previous matchday',
    'agenda.nextLabel': 'Next matchday',
    'agenda.loading': 'Loading matches…',
    'agenda.unavailable': 'Match schedule unavailable right now.',
    'agenda.empty': 'No matches scheduled yet.',
    'agenda.cachedDate': '{date} · cached data',
    'timeline.ready': 'Timeline ready.',
    'timeline.label': 'Chronological match timeline',
    'timeline.loadMore': 'Load 10 more matches',
    'timeline.retry': 'Retry timeline',
    'timeline.match': 'Match {id}',
    'timeline.stadium': 'Stadium {stadium}',
    'timeline.retrying': 'Retrying in {seconds}s.',
    'timeline.loading': 'Loading match timeline.',
    'timeline.unavailable': 'Match timeline unavailable. Retry when the API is reachable.',
    'timeline.empty': 'No matches are available yet.',
    'timeline.shownCached': '{visible} of {total} matches shown from cached data.',
    'timeline.shown': '{visible} of {total} matches shown.',
    'fan.favorite': 'Favorite team',
    'fan.matchesLabel': 'Favorite team matches',
    'fan.ready': 'Fan dashboard ready.',
    'fan.loadingSummary': 'Loading fan dashboard.',
    'fan.selectSummary': 'Select a team when live team data is available.',
    'fan.savedSnapshot': 'saved snapshot',
    'fan.status': 'Status',
    'fan.loading': 'Loading',
    'fan.unavailable': 'Unavailable',
    'fan.points': 'Points',
    'fan.goalsFor': 'Goals for',
    'fan.goalsAgainst': 'Goals against',
    'fan.matches': 'Matches',
    'fan.matchesUnavailable': 'Matches are unavailable. Saved team summary remains visible.',
    'fan.noMatches': 'No matches are linked to this team yet.',
    'fan.loadingAll': 'Loading teams, matches, and groups.',
    'fan.readyCached': 'Fan dashboard ready from cached data.',
    'fan.snapshotStatus': 'Showing saved favorite snapshot because live dashboard data is unavailable.',
    'fan.partial': 'Dashboard loaded with partial live data.',
    'fan.available': 'Fan dashboard ready.',
    'fan.notAvailable': 'Fan dashboard unavailable.',
    'matrix.ready': 'Group matrix ready.',
    'matrix.label': 'Group matchup matrices',
    'matrix.loading': 'Loading groups, teams, and matches.',
    'matrix.unavailable': 'Group matrix unavailable. Groups are required to build the tables.',
    'matrix.partialCached': 'Group matrix loaded with cached and partial live data.',
    'matrix.partial': 'Group matrix loaded with partial live data.',
    'matrix.readyCached': 'Group matrix ready from cached data.',
    'matrix.emptyStatus': 'No group data is available yet.',
    'matrix.groupsUnavailable': 'Groups are unavailable, so matchups cannot be built.',
    'matrix.noGroups': 'No groups are available to build matchup matrices.',
    'matrix.caption': '{group} head-to-head matrix',
    'matrix.partialCaption': '{group} head-to-head matrix with {count} listed teams',
    'matrix.team': 'Team',
    'matrix.sameTeam': 'Same team',
    'matrix.pending': 'Pending',
    'matrix.pendingLabel': '{home} vs {away} pending',
    'matrix.playedLabel': '{team}, {scoreFor} to {scoreAgainst} versus {opponent}',
    'retry.responded': 'responded {status}',
    'retry.unreachable': 'could not be reached',
    'retry.message': 'GET {path} {cause}. Retrying in {seconds}s.',
    'footer.pulse': 'Global Match Theatre · Five live views, one tournament pulse.',
    'footer.data': 'Live data loads from the public tournament API. Sign-in is an optional compatibility path.',
    'a11y.settings': 'Accessibility settings',
    'a11y.title': 'Accessibility',
    'a11y.close': 'Close accessibility settings',
    'a11y.hint': 'Adjust how Global Match Theatre looks and moves. Changes save to this device.',
    'a11y.largeText': 'Large text',
    'a11y.highContrast': 'High contrast',
    'a11y.reduceTransparency': 'Reduce transparency',
    'a11y.reduceMotion': 'Reduce motion',
    'a11y.underlineLinks': 'Underline links',
    'a11y.reset': 'Reset to defaults'
  })
});

export function normalizeLocale(locale) {
  const normalized = typeof locale === 'string' ? locale.trim().toLowerCase() : '';
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : DEFAULT_LOCALE;
}

export function readLocale(storage = globalThis.localStorage) {
  try {
    return normalizeLocale(storage?.getItem?.(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeLocale(locale, storage = globalThis.localStorage) {
  const normalized = normalizeLocale(locale);
  try {
    storage?.setItem?.(LOCALE_STORAGE_KEY, normalized);
  } catch {
    // Storage is optional; the active in-memory locale remains usable.
  }
  return normalized;
}

function intlLocale(locale) {
  return locale === 'es' ? 'es-ES' : 'en-US';
}

function interpolate(message, params, formatNumber) {
  return message.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    if (value === undefined || value === null) return `{${key}}`;
    return typeof value === 'number' ? formatNumber(value) : String(value);
  });
}

function translateDocument(document, i18n) {
  if (!document) return;
  if (document.documentElement) document.documentElement.lang = i18n.locale;
  document.title = i18n.t('meta.title');
  document.querySelector?.('meta[name="description"]')?.setAttribute('content', i18n.t('meta.description'));
  for (const element of document.querySelectorAll?.('[data-i18n]') ?? []) {
    element.textContent = i18n.t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll?.('[data-i18n-aria-label]') ?? []) {
    element.setAttribute('aria-label', i18n.t(element.dataset.i18nAriaLabel));
  }

  const languageToggle = document.getElementById?.('language-toggle');
  if (languageToggle) {
    languageToggle.setAttribute('aria-checked', String(i18n.locale === 'en'));
    languageToggle.setAttribute('aria-label', i18n.t('language.toggleLabel'));
  }
}

export function createI18n({
  document = globalThis.document,
  storage = globalThis.localStorage,
  locale: initialLocale
} = {}) {
  let locale = initialLocale === undefined ? readLocale(storage) : normalizeLocale(initialLocale);
  const subscribers = new Set();

  const i18n = {
    get locale() {
      return locale;
    },
    t(key, params = {}) {
      const entry = COPY[locale]?.[key] ?? COPY[DEFAULT_LOCALE]?.[key] ?? key;
      const message = typeof entry === 'object'
        ? entry[new Intl.PluralRules(locale).select(Number(params.count) || 0)] ?? entry.other
        : entry;
      return interpolate(String(message), params, i18n.formatNumber);
    },
    formatNumber(value, options = {}) {
      const number = Number(value);
      if (!Number.isFinite(number)) return String(value);
      return new Intl.NumberFormat(intlLocale(locale), options).format(number);
    },
    formatTeamName(value) {
      return !value || value === 'Unknown team' ? i18n.t('common.unknownTeam') : String(value);
    },
    formatVenueName(value) {
      return !value || value === 'Unknown stadium' ? i18n.t('common.unknownStadium') : String(value);
    },
    formatGroupName(value) {
      const label = String(value ?? '');
      const fallback = /^Group\s+(.+)$/i.exec(label);
      return fallback ? i18n.t('common.group', { id: fallback[1] }) : label;
    },
    formatDate(value, options = {}) {
      if (!value) return i18n.t('common.dateTbc');
      const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return String(value);
      return new Intl.DateTimeFormat(intlLocale(locale), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
        ...options
      }).format(date);
    },
    setLocale(nextLocale) {
      const next = normalizeLocale(nextLocale);
      if (next === locale) return locale;
      locale = writeLocale(next, storage);
      translateDocument(document, i18n);
      for (const subscriber of subscribers) subscriber(locale);
      return locale;
    },
    subscribe(subscriber) {
      if (typeof subscriber !== 'function') return () => {};
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    apply() {
      translateDocument(document, i18n);
    }
  };

  translateDocument(document, i18n);
  return Object.freeze(i18n);
}

export function bindLanguageSelector(document, i18n) {
  const selector = document?.getElementById?.('language-selector');
  const toggle = document?.getElementById?.('language-toggle');
  if (!selector || !toggle || !i18n) return () => {};
  const handleClick = (event) => {
    const button = event.target.closest?.('[data-language-toggle]');
    if (button !== toggle || !selector.contains(button)) return;
    i18n.setLocale(i18n.locale === 'es' ? 'en' : 'es');
  };
  selector.addEventListener('click', handleClick);
  return () => selector.removeEventListener('click', handleClick);
}
