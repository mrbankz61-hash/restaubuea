// Menu interactions: the menu/basket sheets, dish-card hover (spins the 3D plate faster) and
// the little plate that flies from the dish into the basket icon on "+ Add".

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function bump(el) {
  if (!el) return;
  el.classList.remove('is-bumped');
  void el.offsetWidth; // restart the CSS animation
  el.classList.add('is-bumped');
}

/** Flies a tiny plate (with the dish photo, if there is one) from (x, y) to the header basket. */
export function flyToBasket(from, image) {
  const target = document.querySelector('[data-basket-target]');
  if (!target) return;
  const tr = target.getBoundingClientRect();
  if (!from || reduceMotion() || !document.body.animate) {
    bump(target);
    return;
  }
  const ex = tr.left + tr.width / 2;
  const ey = tr.top + tr.height / 2;
  const cx = from.x + (ex - from.x) * 0.3;
  const cy = Math.min(from.y, ey) - Math.min(180, Math.abs(from.y - ey) * 0.5 + 60);

  const el = document.createElement('div');
  el.className = 'fly';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="fly__food"></span>';
  if (image) {
    el.classList.add('has-photo');
    el.firstChild.style.backgroundImage = `url("${image}")`;
  }
  document.body.appendChild(el);

  const frames = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * cx + t * t * ex;
    const y = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * cy + t * t * ey;
    frames.push({
      transform: `translate(${x - 24}px, ${y - 24}px) scale(${1 - 0.62 * t}) rotate(${t * 420}deg)`,
      opacity: t > 0.92 ? 1 - (t - 0.92) / 0.08 : 1,
    });
  }
  const anim = el.animate(frames, { duration: 820, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
  anim.onfinish = () => {
    el.remove();
    bump(target);
  };
}

export function initMenu({ onHoverDish, onDialog } = {}) {
  const dialogs = [...document.querySelectorAll('dialog.sheet')];

  const open = (dialog) => {
    if (!dialog?.showModal || dialog.open) return;
    dialogs.forEach((d) => d !== dialog && d.open && d.close());
    dialog.showModal();
    onDialog?.(true);
  };

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.open);
      if (dialog?.showModal) {
        event.preventDefault();
        open(dialog);
      }
      return;
    }
    if (event.target.closest('[data-close]')) event.target.closest('dialog')?.close();
  });

  for (const dialog of dialogs) {
    // A click on the dialog element itself is a click on the backdrop.
    dialog.addEventListener('click', (event) => event.target === dialog && dialog.close());
    dialog.addEventListener('close', () => {
      if (!dialogs.some((d) => d.open)) onDialog?.(false);
    });
  }

  for (const card of document.querySelectorAll('.dish__card')) {
    const index = Number(card.closest('.dish').dataset.index);
    card.addEventListener('pointerenter', () => onHoverDish?.(index));
    card.addEventListener('pointerleave', () => onHoverDish?.(-1));
  }
}
