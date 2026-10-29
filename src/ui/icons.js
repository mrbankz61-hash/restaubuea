// Inline SVG icons shared by the prerendered HTML and the runtime UI.
const svg = (body, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

export const icon = {
  wa: svg(
    '<path d="M12 2.6a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.7-1.2A9.4 9.4 0 1 0 12 2.6Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.7 7.4c.3-.6.6-.6.9-.6h.6c.2 0 .5 0 .7.5l.9 2.1c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4-.1.6.5.9 1.1 1.6 1.9 2.2.6.4 1.1.7 1.6.9.2.1.4.1.6-.1l.8-.9c.2-.2.4-.3.7-.2l2 .9c.3.1.5.3.5.5 0 .6-.2 1.3-.7 1.7-.6.5-1.4.8-2.3.7-1.3-.2-2.9-.9-4.4-2.2-1.6-1.4-2.6-3-2.9-4.3-.2-.9 0-1.7.4-2.4Z" fill="currentColor"/>',
  ),
  bag: svg(
    '<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 10V7a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  ),
  menu: svg(
    '<path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  ),
  close: svg('<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  plus: svg('<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  minus: svg('<path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  pin: svg(
    '<path d="M12 21s-6.5-6.1-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.9 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="9.8" r="2.4" fill="currentColor"/>',
  ),
  clock: svg(
    '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  ),
  phone: svg(
    '<path d="M6.6 3.5h2.6l1.4 4-1.9 1.3a11 11 0 0 0 6.5 6.5l1.3-1.9 4 1.4v2.6a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  ),
  arrow: svg('<path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  chilli: svg(
    '<path d="M15.5 6.5c-3 0-4.2 3.6-6.3 7.1C7.7 16 5.5 17.6 4 18c4.6 2.4 11.4-.4 13.3-5.4.9-2.6.4-6.1-1.8-6.1Z" fill="currentColor"/><path d="M15.4 6.6c.3-1.6 1.4-2.6 3.1-2.9" fill="none" stroke="#2F6B3A" stroke-width="1.8" stroke-linecap="round"/>',
    'icon icon--chilli',
  ),
};
