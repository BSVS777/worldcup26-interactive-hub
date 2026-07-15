export function createAppState({ token = null, testMode = false } = {}) {
  return Object.freeze({
    token,
    sessionExpired: false,
    testMode: Boolean(testMode),
    retry: Object.freeze({ active: false, endpointKey: null, attempt: 0, secondsRemaining: 0 }),
    data: Object.freeze({ stadiums: [], games: [], teams: [], groups: [] }),
    sources: Object.freeze({ stadiums: null, games: null, teams: null, groups: null })
  });
}

export function reduceAppState(state, action) {
  switch (action?.type) {
    case 'TOKEN_SET':
      return Object.freeze({ ...state, token: action.token ?? null, sessionExpired: false });
    case 'TOKEN_CLEARED':
      return Object.freeze({ ...state, token: null, sessionExpired: Boolean(action.expired) });
    case 'RETRY_STARTED':
      return Object.freeze({
        ...state,
        retry: Object.freeze({
          active: true,
          endpointKey: action.endpointKey ?? null,
          attempt: Number(action.attempt) || 0,
          secondsRemaining: Number(action.secondsRemaining) || 0
        })
      });
    case 'RETRY_STOPPED':
      return Object.freeze({
        ...state,
        retry: Object.freeze({ active: false, endpointKey: null, attempt: 0, secondsRemaining: 0 })
      });
    case 'DATA_STORED':
      if (!Object.hasOwn(state.data, action.endpointKey)) return state;
      return Object.freeze({
        ...state,
        data: Object.freeze({ ...state.data, [action.endpointKey]: Object.freeze([...(action.data ?? [])]) }),
        sources: Object.freeze({ ...state.sources, [action.endpointKey]: action.source ?? null })
      });
    default:
      return state;
  }
}
