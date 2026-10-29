const CIRCUMFERENCE = 2 * Math.PI * 52;

/** Progress ring + steaming bowl. Only ever moves forward; removes itself when done. */
export class Loader {
  constructor(el) {
    this.el = el;
    this.ring = el?.querySelector('[data-ring]');
    this.value = 0;
    this.finished = !el;
  }

  set(value) {
    const v = Math.min(1, Math.max(0, value));
    if (this.finished || v <= this.value) return;
    this.value = v;
    if (this.ring) this.ring.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - v));
  }

  done() {
    if (this.finished) return;
    this.set(1);
    this.finished = true;
    document.documentElement.classList.add('is-loaded');
    this.el.classList.add('is-done');
    setTimeout(() => this.el.remove(), 800);
  }
}
