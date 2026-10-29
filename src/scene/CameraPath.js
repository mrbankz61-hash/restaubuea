import { CatmullRomCurve3, Vector3 } from 'three';
import { MonotoneCubic } from './util/math.js';
import { MENU, TABLE, dishProgress, plateZ } from './timeline.js';

export { CHAPTERS } from './timeline.js';

/**
 * One continuous camera move from the sky above Mount Cameroon to the map of Molyko.
 * Keyframes pin a position and a look-target to a scroll progress. Two centripetal
 * Catmull-Rom splines carry position and target; a monotone cubic maps progress onto the
 * spline parameter, so each keyframe lands at its progress with no speed jolts.
 *
 * World layout (metres-ish): street runs along -Z from z=14 to the restaurant front at
 * z=-68; the dining room spans z -68…-112 with the table down the middle, the kitchen
 * behind the counter at z≈-101; the volcano rises far beyond at z≈-520.
 */
export class CameraPath {
  constructor(dishCount) {
    const n = Math.max(1, dishCount);
    const keys = [];
    const key = (p, pos, target) => keys.push({ p, pos: new Vector3(...pos), target: new Vector3(...target) });

    // 1 · Arrival: high above the town at dusk, falling toward the street.
    key(0.0, [0, 64, 128], [0, 42, -320]);
    key(0.04, [-4, 46, 92], [0, 28, -300]);
    key(0.08, [-2, 20, 52], [0, 9, -200]);
    key(0.12, [0, 3.4, 18], [0, 2.2, -60]);

    // 2 · Molyko street: a gentle S-curve at eye height, the glowing door ahead.
    key(0.16, [-1.3, 2.0, 0], [0.6, 1.8, -60]);
    key(0.2, [1.1, 1.9, -18], [-0.4, 1.8, -66]);
    key(0.24, [-0.6, 1.8, -36], [0, 1.7, -68]);
    key(0.28, [0, 1.75, -52], [0, 1.6, -68]);

    // 3 · Through the door: push in, cross the threshold, rise over the table.
    key(0.31, [0, 1.65, -62.5], [0, 1.55, -72]);
    key(0.336, [0, 1.6, -68.2], [0, 1.45, -77]);
    key(0.37, [0, 2.7, -71.8], [0, 1.0, -76.5]);

    // 4 · The table: an overhead dolly with one frame per dish (adapts to the menu length).
    const y = TABLE.topY;
    const first = plateZ(0, n);
    const last = plateZ(n - 1, n);
    const step = n > 1 ? (first - last) / (n - 1) : 2.9;
    key(MENU.start, [0, 3.35, first + 1.25 + step / 2], [0, y, first + step / 2 - 0.1]);
    for (let i = 0; i < n; i++) {
      const z = plateZ(i, n);
      key(dishProgress(i, n), [0, 3.35, z + 1.25], [0, y, z - 0.1]);
    }
    key(MENU.end, [0, 3.35, last + 1.25 - step / 2], [0, y, last - step / 2 - 0.1]);

    // 5 · The kitchen: round the end of the counter, past the grill, to the pot.
    key(0.69, [4.6, 2.1, -100.2], [0, 1.2, -107]);
    key(0.73, [2.6, 1.75, -104.4], [-3.0, 1.1, -108.3]);
    key(0.77, [-0.6, 1.9, -104.8], [2.6, 1.15, -108.4]);
    key(0.8, [0, 3.0, -104.2], [0.4, 1.3, -108]);

    // 6 · Out through the roof into the map of Molyko.
    key(0.85, [0, 11, -99], [0, 0, -93]);
    key(0.9, [0, 50, -78], [0, 0, -90]);
    key(1.0, [0, 132, -46], [0, 0, -88]);

    this.keys = keys;
    this.position = new CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal');
    this.target = new CatmullRomCurve3(keys.map((k) => k.target), false, 'centripetal');
    this.map = new MonotoneCubic(
      keys.map((k) => k.p),
      keys.map((_, i) => i / (keys.length - 1)),
    );
  }

  evaluate(p, outPosition, outTarget) {
    const t = this.map.at(p);
    this.position.getPoint(t, outPosition);
    this.target.getPoint(t, outTarget);
  }
}
