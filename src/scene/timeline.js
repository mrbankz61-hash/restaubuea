// The journey's scroll map, shared by the DOM (section lengths, rail, dish cards) and the 3D camera.
// Kept free of three.js so the UI can import it without pulling the renderer.

export const CHAPTERS = [
  { id: 'arrival', start: 0.0, end: 0.12, anchor: 0.0 },
  { id: 'street', start: 0.12, end: 0.28, anchor: 0.17 },
  { id: 'door', start: 0.28, end: 0.4, anchor: 0.355 },
  { id: 'menu', start: 0.4, end: 0.65, anchor: null }, // anchored on the first dish
  { id: 'kitchen', start: 0.65, end: 0.8, anchor: 0.725 },
  { id: 'visit', start: 0.8, end: 1.0, anchor: 1.0 },
];

export const MENU = CHAPTERS.find((c) => c.id === 'menu');

/** Scroll progress at which dish `i` (of `n`) sits centred under the camera. */
export const dishProgress = (i, n) => MENU.start + ((i + 0.5) / n) * (MENU.end - MENU.start);

export function chapterAnchor(id, dishCount) {
  const ch = CHAPTERS.find((c) => c.id === id);
  if (!ch) return 0;
  return ch.anchor ?? dishProgress(0, dishCount);
}

export function chapterAt(p) {
  for (let i = CHAPTERS.length - 1; i >= 0; i--) if (p >= CHAPTERS[i].start) return CHAPTERS[i];
  return CHAPTERS[0];
}

/** Table layout: plates are spaced to fit any number of dishes between the door and the kitchen. */
export const TABLE = { startZ: -76, maxSpan: 21.5, maxSpacing: 2.9, topY: 0.86 };

export function plateZ(i, n) {
  const spacing = Math.min(TABLE.maxSpacing, TABLE.maxSpan / Math.max(1, n - 1));
  return TABLE.startZ - i * spacing;
}

/** Still frames used by the reduced-motion version. */
export const STILLS = { arrival: 0.02, street: 0.235, door: 0.305, menu: null, kitchen: 0.735, visit: 0.985 };
