import { requireElement } from './dom.js';
import { MODULE_ROUTES } from './router.js';

const MODULE_COPY = Object.freeze({
  tour: Object.freeze({
    heading: 'Venue map and match list',
    description: 'Cross the continent through every host stadium and the matches played there.',
    nextStep: 'Venue cards and their linked fixtures will appear here.'
  }),
  agenda: Object.freeze({
    heading: 'Simultaneous matchday board',
    description: 'Compare every overlapping kickoff without losing the shape of the day.',
    nextStep: 'Parallel fixture columns and date controls will appear here.'
  }),
  timeline: Object.freeze({
    heading: 'Chronological match stream',
    description: 'Follow the tournament in order, from the opening whistle to the final.',
    nextStep: 'Progressive groups of ten matches will appear here.'
  }),
  'fan-dashboard': Object.freeze({
    heading: 'Your team at a glance',
    description: 'Keep one nation close: fixtures, group position, goals, and form in one view.',
    nextStep: 'Favorite-team controls and a resilient saved snapshot will appear here.'
  }),
  'group-matrix': Object.freeze({
    heading: 'Every group matchup',
    description: 'Read all twelve groups as compact head-to-head scoreboards.',
    nextStep: 'Responsive 4 × 4 matchup matrices will appear here.'
  })
});

export function createShellView(document, { onLogin }) {
  const elements = {
    viewMarker: requireElement(document, 'view-marker', 'shell element'),
    viewTitle: requireElement(document, 'view-title', 'shell element'),
    viewDescription: requireElement(document, 'view-description', 'shell element'),
    moduleHeading: requireElement(document, 'module-heading', 'shell element'),
    moduleNextStep: requireElement(document, 'module-next-step', 'shell element'),
    modulePlaceholder: requireElement(document, 'module-placeholder', 'shell element'),
    tourView: requireElement(document, 'tour-view', 'shell element'),
    agendaView: requireElement(document, 'agenda-view', 'shell element'),
    timelineView: requireElement(document, 'timeline-view', 'shell element'),
    moduleStatus: requireElement(document, 'module-status', 'shell element'),
    testBadge: requireElement(document, 'test-mode-badge', 'shell element'),
    sessionPanel: requireElement(document, 'session-panel', 'shell element'),
    sessionTitle: requireElement(document, 'session-title', 'shell element'),
    sessionCopy: requireElement(document, 'session-copy', 'shell element'),
    loginForm: requireElement(document, 'login-form', 'shell element'),
    loginButton: requireElement(document, 'login-button', 'shell element'),
    loginStatus: requireElement(document, 'login-status', 'shell element'),
    appStatus: requireElement(document, 'app-status', 'shell element')
  };
  const routeLinks = [...document.querySelectorAll('[data-route]')];

  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.loginForm);
    await onLogin({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? '')
    });
  });

  function render(state, { announce = false, announceMessage = '' } = {}) {
    const route = MODULE_ROUTES.find(({ id }) => id === state.route) ?? MODULE_ROUTES[0];
    const copy = MODULE_COPY[route.id];
    elements.viewMarker.textContent = `Gate ${route.marker}`;
    elements.viewTitle.textContent = route.title;
    elements.viewDescription.textContent = copy.description;
    elements.moduleHeading.textContent = copy.heading;
    elements.moduleNextStep.textContent = copy.nextStep;
    elements.moduleStatus.textContent = state.session === 'authenticated' ? 'Session ready' : 'Preview';
    elements.testBadge.hidden = !state.testMode;

    const isTour = route.id === 'tour';
    const isAgenda = route.id === 'agenda';
    const isTimeline = route.id === 'timeline';
    elements.modulePlaceholder.hidden = isTour || isAgenda || isTimeline;
    elements.tourView.hidden = !isTour;
    elements.agendaView.hidden = !isAgenda;
    elements.timelineView.hidden = !isTimeline;

    for (const link of routeLinks) {
      if (link.dataset.route === route.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    const needsLogin = state.session !== 'authenticated';
    elements.sessionPanel.hidden = !needsLogin;
    elements.sessionTitle.textContent = state.session === 'expired'
      ? 'Your session expired'
      : 'Sign in to load live match data';
    elements.sessionCopy.textContent = state.session === 'expired'
      ? 'Sign in again. The atlas will resume here without reloading.'
      : 'Your atlas stays open while you sign in.';
    elements.loginButton.disabled = state.loginStatus === 'pending';
    elements.loginButton.textContent = state.loginStatus === 'pending' ? 'Signing in…' : 'Sign in';
    elements.loginStatus.textContent = state.statusMessage;

    if (announce) elements.appStatus.textContent = `${route.label} view selected.`;
    if (announceMessage) elements.appStatus.textContent = announceMessage;
    if (state.session === 'expired') elements.appStatus.textContent = state.statusMessage;
  }

  function focusSession() {
    const email = requireElement(document, 'email', 'shell element');
    email.focus();
  }

  function focusCurrentView() {
    requireElement(document, 'main-content').focus();
  }

  return Object.freeze({ render, focusSession, focusCurrentView });
}
