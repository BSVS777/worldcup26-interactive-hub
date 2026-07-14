export const MODULE_ROUTES = Object.freeze([
  Object.freeze({ id: 'tour', label: 'Tour', title: 'Virtual venue tour', marker: '01' }),
  Object.freeze({ id: 'agenda', label: 'Agenda', title: 'Simultaneous agenda', marker: '02' }),
  Object.freeze({ id: 'timeline', label: 'Timeline', title: 'Infinite timeline', marker: '03' }),
  Object.freeze({ id: 'fan-dashboard', label: 'Fan dashboard', title: 'Loyal fan dashboard', marker: '04' }),
  Object.freeze({ id: 'group-matrix', label: 'Group matrix', title: 'Group matchup matrix', marker: '05' })
]);

export const DEFAULT_ROUTE = MODULE_ROUTES[0].id;
const ROUTE_IDS = new Set(MODULE_ROUTES.map(({ id }) => id));

export function normalizeRoute(hash = '') {
  if (typeof hash !== 'string') return DEFAULT_ROUTE;
  let route;
  try {
    route = decodeURIComponent(hash.replace(/^#/, '')).trim().toLowerCase();
  } catch {
    return DEFAULT_ROUTE;
  }
  return ROUTE_IDS.has(route) ? route : DEFAULT_ROUTE;
}

function isExactTestMode(search = '') {
  if (typeof search !== 'string') return false;
  const values = new URLSearchParams(search).getAll('testMode');
  return values.length === 1 && values[0] === '1';
}

export function createInitialViewState({ hash = '', search = '', hasToken = false } = {}) {
  return Object.freeze({
    route: normalizeRoute(hash),
    session: hasToken ? 'authenticated' : 'anonymous',
    testMode: isExactTestMode(search),
    loginStatus: 'idle',
    statusMessage: ''
  });
}

export function reduceViewState(state, action) {
  switch (action?.type) {
    case 'NAVIGATED':
      return Object.freeze({ ...state, route: normalizeRoute(action.route) });
    case 'SESSION_EXPIRED':
      return Object.freeze({
        ...state,
        session: 'expired',
        loginStatus: 'idle',
        statusMessage: 'Your session expired. Sign in to continue.'
      });
    case 'LOGIN_STARTED':
      return Object.freeze({ ...state, loginStatus: 'pending', statusMessage: 'Signing in…' });
    case 'LOGIN_SUCCEEDED':
      return Object.freeze({
        ...state,
        session: 'authenticated',
        loginStatus: 'idle',
        statusMessage: 'Signed in. Your current view is ready.'
      });
    case 'LOGIN_FAILED':
      return Object.freeze({
        ...state,
        session: state.session === 'expired' ? 'expired' : 'anonymous',
        loginStatus: 'error',
        statusMessage: typeof action.message === 'string' && action.message.trim() !== ''
          ? action.message
          : 'We could not sign in. Try again.'
      });
    default:
      return state;
  }
}
