// Vault Meter — github.com/veraetogrex-portfolio · zero dependencies
// A password meter drawn as an object. Every level is the same 14 line strokes,
// re-shaped: open door → paperclip → padlock → deadbolt → bank vault. Lines morph, never cross-fade.

const page    = document.querySelector('.vault-meter');
const input   = document.querySelector('#password');
const eye     = document.querySelector('.eye');
const art     = document.querySelector('.art');
const nameEl  = document.querySelector('.level-name');
const segs    = [...document.querySelectorAll('.segs i')];
const crackEl = document.querySelector('.crack');
const bitsEl  = document.querySelector('.bits b');
const chips   = [...document.querySelectorAll('.chips span')];
const flood   = document.querySelector('.flood');
const sweep   = document.querySelector('.sweep i');

const LEVELS = ['No lock', 'A paperclip', 'A padlock', 'A deadbolt', 'A bank vault'];
const COLORS = [[214, 218, 232], [255, 122, 69], [255, 181, 71], [166, 155, 255], [63, 224, 208]];
const clamp = v => Math.min(1, Math.max(0, v));

// 1 · strength from the actual input: bits = length × log2(character pool)
function estimate(v) {
  const cls = { lower: /[a-z]/.test(v), upper: /[A-Z]/.test(v), digit: /\d/.test(v), sym: /[^a-zA-Z0-9]/.test(v) };
  const pool = cls.lower * 26 + cls.upper * 26 + cls.digit * 10 + cls.sym * 33;
  const bits = pool ? v.length * Math.log2(pool) : 0;
  const level = !v ? 0 : bits < 28 ? 1 : bits < 45 ? 2 : bits < 70 ? 3 : 4;
  const seconds = 2 ** (bits - 1) / 1e10;                  // half the space at 10B guesses/s
  return { cls, bits, level, seconds };
}
function crackText(v, sec) {
  if (!v) return 'Nothing to crack yet';
  if (sec < 1) return 'Cracked <span>instantly</span>';
  const Y = 31557600, units = [['second', 1], ['minute', 60], ['hour', 3600], ['day', 86400], ['month', Y / 12], ['year', Y]];
  const [unit, size] = units.filter(u => sec >= u[1]).pop(), n = Math.round(sec / size);
  if (unit !== 'year') return `Cracked in <span>${n} ${unit}${n > 1 ? 's' : ''}</span>`;
  const big = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']].find(([k]) => n >= k);
  if (n >= 1e15) return 'Cracked <span>never, realistically</span>';
  const years = big ? Math.round(n / big[0]) + ' ' + big[1] : n >= 1000 ? Math.round(n / 1000).toLocaleString('en-US') + ',000' : n;
  return `Cracked in <span>${years} year${n > 1 ? 's' : ''}</span>`;
}

// 2 · line art: 14 strokes in 3D, projected to isometric, each resampled to 72 points
const POINTS = 72, STROKES = 14, K = 1.5, CX = 166, CY = 244;
const iso    = ([x, y, z]) => [CX + (x - z) * .866 * K, CY + (x + z) * .5 * K - y * K];
const rect   = (x0, y0, x1, y1, z) => [[x0, y1, z], [x1, y1, z], [x1, y0, z], [x0, y0, z], [x0, y1, z]];
const floor  = (x0, z0, x1, z1) => [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [x0, 0, z0]];
const dot    = (x, y, z) => [[x, y, z], [x, y, z]];         // an invisible stroke waiting to grow
const circle = (cx, cy, z, r, a0 = -Math.PI / 2, turns = 1) =>
  Array.from({ length: 41 }, (_, i) => { const a = a0 + turns * i / 40 * Math.PI * 2; return [cx + r * Math.cos(a), cy - r * Math.sin(a), z]; });
const swing  = th => ([x, y, z]) => [-34 + (x + 34) * Math.cos(th) - z * Math.sin(th), y, (x + 34) * Math.sin(th) + z * Math.cos(th)];   // door leaf on its hinge
function paperclip(cx, cy, z, s) {
  const out = [], to = (u, v) => out.push([cx + u * s, cy + v * s, z]);
  const arc = (ax, ay, r, a0, a1) => { for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; to(ax + r * Math.cos(a), ay + r * Math.sin(a)); } };
  to(3, 7); to(3, -12); arc(0, -12, 3, 0, -Math.PI); to(-3, 15); arc(1, 15, 4, Math.PI, 0); to(5, -15); arc(0, -15, 5, 0, -Math.PI); to(-5, 8);
  return out;
}
function spoke(phi, i) {
  const a = phi + i * Math.PI * 2 / 3, ex = Math.cos(a) * 38, ey = 64 + Math.sin(a) * 38;
  const knob = Array.from({ length: 25 }, (_, k) => { const b = a + Math.PI + k / 24 * Math.PI * 2; return [ex + 4.2 * (Math.cos(b) + Math.cos(a)), ey + 4.2 * (Math.sin(b) + Math.sin(a)), 16]; });
  return [[Math.cos(a) * 7, 64 + Math.sin(a) * 7, 16], [ex, ey, 16], ...knob];
}

function build(level, phi = 0) {
  const S = [], C = COLORS[level], N = COLORS[0];
  const add = (pts, o = .8, c = N, w = 2.4) => S.push({ pts, o, c, w });
  if (level < 4) {
    const leaf = swing(level === 0 ? 1.2 : 0);                                       // level 0: the door stands open
    add([[-40, 0, 0], [-40, 128, 0], [40, 128, 0], [40, 0, 0]]);                     // frame
    add([[-34, 0, 0], [-34, 122, 0], [34, 122, 0], [34, 0, 0]], .55);
    add([[-40, 128, 0], [-40, 128, -14], [40, 128, -14], [40, 0, -14], [40, 0, 0]], .5);
    add(floor(-50, -26, 50, 34), .28);
    add(rect(-34, 0, 33, 122, 0).map(leaf), .85);                                    // leaf + panel + knob
    add(rect(-25, 12, 24, 110, 0).map(leaf), .38);
    add(circle(level ? 14 : 25, level ? 72 : 61, 0, 3.4).map(leaf), level === 3 ? 0 : .8);
    if (level === 0) for (let i = 0; i < 4; i++) add(dot(37, 62, 0), 0, C);
    if (level === 1) { add(paperclip(37, 62, 2, 2.3), 1, C, 3); for (let i = 0; i < 3; i++) add(dot(37, 62, 2), 0, C); }
    if (level === 2) {
      const T = ([u, v, z]) => [36 + u * 1.75, 46 + v * 1.75, z];
      add([[-6, 10, 6], [-6, 22, 6], ...circle(0, 22, 6, 6, Math.PI, .5).slice(1), [6, 10, 6]].map(T), 1, C, 3);   // shackle
      add(rect(-12, -12, 12, 10, 12).map(T), 1, C, 3);                                                          // body
      add([[-12, 10, 12], [-12, 10, 5], [12, 10, 5], [12, -12, 5], [12, -12, 12]].map(T), .7, C, 2.2);
      add([...circle(0, 2, 12, 2.6, Math.PI / 2), [0, -6, 12]].map(T), 1, C, 2.6);                              // keyhole
    }
    if (level === 3) {
      add(rect(-4, 40, 28, 88, 3), 1, C, 3);                                         // housing, bolt, thumb turn, strike
      add(rect(26, 58, 40, 70, 4), 1, C, 3);
      add([...circle(12, 64, 5, 9), [12, 55, 5]], 1, C, 2.8);
      add(rect(34, 46, 40, 82, 1), .9, C, 2.2);
    }
    add(rect(-38, 96, -31, 110, 1), .55); add(rect(-38, 12, -31, 26, 1), .55);       // hinges
    add(dot(0, 64, 0), 0, C);
  } else {
    add(rect(-62, 0, 62, 128, 0));                                                   // housing, recess, depth, floor
    add(circle(0, 64, 0, 54), .45);
    add([[-62, 128, 0], [-62, 128, -18], [62, 128, -18], [62, 0, -18], [62, 0, 0]], .5);
    add(floor(-66, -30, 66, 36), .28);
    add(circle(0, 64, 12, 48), 1, C, 3);                                             // round door, edge, hub
    add(circle(0, 64, 5, 48), .5, C, 2);
    add(circle(0, 64, 16, 7), 1, C, 2.4);
    add(circle(0, 64, 15, 27, phi), 1, C, 3);                                        // the wheel turns with phi
    for (let i = 0; i < 3; i++) add(spoke(phi, i), 1, C, 3);
    add(rect(-68, 86, -58, 104, 8), .6); add(rect(-68, 24, -58, 42, 8), .6);
    add(circle(0, 64, 12.5, 41, phi * .25), .6, C, 1.6);                             // tick ring
  }
  return S.map(s => ({ ...s, pts: resample(s.pts.map(iso)) }));
}
function resample(pts) {                                     // same number of evenly spaced points for every stroke
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d.at(-1);
  let j = 1;
  return Array.from({ length: POINTS }, (_, i) => {
    if (!L) return pts[0];
    const t = L * i / (POINTS - 1);
    while (j < d.length - 1 && d[j] < t) j++;
    const k = (t - d[j - 1]) / (d[j] - d[j - 1] || 1);
    return [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * k, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * k];
  });
}

// 3 · morph: every point travels from the old shape to the new one, with a little overshoot
const paths = Array.from({ length: STROKES }, (_, i) => {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  if (i === 13) p.setAttribute('stroke-dasharray', '2 6');
  return art.querySelector('g').appendChild(p);
});
const overshoot = t => 1 + 2.3 * (t - 1) ** 3 + 1.3 * (t - 1) ** 2;
const mix = (a, b, t) => a.map((s, i) => {
  const e = b[i], tc = clamp(t);
  return { pts: s.pts.map(([x, y], k) => [x + (e.pts[k][0] - x) * t, y + (e.pts[k][1] - y) * t]),
           o: s.o + (e.o - s.o) * tc, c: s.c.map((v, k) => v + (e.c[k] - v) * tc), w: s.w + (e.w - s.w) * tc };
});
function draw(shape) {
  shape.forEach((s, i) => {
    paths[i].setAttribute('d', 'M' + s.pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L'));
    paths[i].setAttribute('stroke', `rgb(${s.c.map(Math.round)})`);
    paths[i].setAttribute('stroke-opacity', s.o.toFixed(3));
    paths[i].setAttribute('stroke-width', s.w.toFixed(2));
  });
}

let shape = build(0), from = null, target = 0, t0 = 0, dur = 0, phi = 0, spin = null, running = false;
function morphTo(level, ms) {
  from = shape; target = level; t0 = performance.now(); dur = ms;
  if (level !== 4) spin = null;
  if (!running) { running = true; requestAnimationFrame(frame); }
}
function frame(now) {
  let more = false;
  if (spin) {                                                // the vault wheel: 270° with ease-out
    const p = clamp((now - spin.t0) / 1300);
    phi = spin.a0 - Math.PI * 1.5 * (1 - (1 - p) ** 3);
    if (p < 1) more = true; else spin = null;
  }
  const next = build(target, phi);
  if (from) {
    const p = clamp((now - t0) / dur);
    shape = mix(from, next, overshoot(p));
    if (p < 1) more = true;
    else { from = null; shape = next; if (target === 4) { spin = { t0: now, a0: phi }; more = true; } }
  } else shape = next;
  draw(shape);
  more ? requestAnimationFrame(frame) : running = false;
}

// 4 · the vault locks: Ion light floods out of the door and sweeps across the page
let lit = false;
function light(on) {
  if (on === lit) return;
  lit = on;
  flood.getAnimations().forEach(a => a.cancel());
  if (!on) return flood.animate([{ opacity: .42 }, { opacity: 0 }], 300);
  const r = art.getBoundingClientRect();
  flood.style.left = r.left + r.width / 2 + 'px';
  flood.style.top = r.top + r.height * .6 + 'px';
  flood.animate([{ opacity: 0, scale: .15 }, { opacity: 1, scale: .75, offset: .2 }, { opacity: .42, scale: 1 }], { duration: 1500, delay: 150, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  sweep.animate([{ opacity: 1, transform: 'translateX(-700px) skewX(-20deg)' }, { opacity: 1, transform: `translateX(${innerWidth + 200}px) skewX(-20deg)` }],
    { duration: 1050, delay: 200, easing: 'cubic-bezier(.45,0,.3,1)' });
}

// the readout follows the same estimate
let shown = 0, bits = 0, counter = 0;
function update(deleting) {
  const v = input.value, e = estimate(v), color = `rgb(${COLORS[e.level]})`;
  if (e.level !== shown) {
    const up = e.level > shown;
    shown = e.level;
    nameEl.animate([{ translate: `0 ${up ? 30 : -30}px`, opacity: 0 }, { translate: '0', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
    morphTo(e.level, deleting ? 240 : 560);
  }
  nameEl.textContent = LEVELS[e.level];
  nameEl.style.color = e.level ? color : '';
  segs.forEach((s, i) => { s.style.background = i < e.level ? color : ''; s.style.boxShadow = i < e.level ? `0 0 14px ${color}` : ''; });
  crackEl.innerHTML = crackText(v, e.seconds);
  if (e.level) crackEl.querySelector('span').style.color = color;
  chips.forEach(c => c.classList.toggle('is-on', e.cls[c.dataset.c]));
  page.classList.toggle('is-vault', e.level === 4);
  light(e.level === 4);
  countBits(Math.round(e.bits), deleting ? 140 : 320);
}
function countBits(to, ms) {
  const start = bits, t0 = performance.now(), id = ++counter;
  const step = now => {
    if (id !== counter) return;                              // a newer count took over
    const p = clamp((now - t0) / ms);
    bits = start + (to - start) * (1 - (1 - p) ** 3);
    bitsEl.textContent = Math.round(bits);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
input.addEventListener('input', e => update(e.inputType?.startsWith('delete')));

// show / hide keeps the caret where it was (Chromium moves it when the input type changes)
eye.addEventListener('pointerdown', e => e.preventDefault());
eye.addEventListener('click', () => {
  const masked = input.type === 'text', [a, b] = [input.selectionStart, input.selectionEnd];
  input.type = masked ? 'password' : 'text';
  eye.classList.toggle('is-masked', masked);
  eye.setAttribute('aria-label', masked ? 'Show password' : 'Hide password');
  input.focus({ preventScroll: true });
  requestAnimationFrame(() => input.setSelectionRange(a ?? input.value.length, b ?? input.value.length));
});

draw(shape);
