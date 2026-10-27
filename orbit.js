const LONG = 1600, SHORT = 900;
const ZOOM = 1.8;
const PUSH_MARGIN = 14;
const SVG_NS = 'http://www.w3.org/2000/svg';
const DATA_DIRS = ['data/', 'template/'];

const stage = document.getElementById('stage');

// Landscape screens get a 1600x900 stage; portrait screens (phones) get the same stage turned upright,
// so orbits stretch vertically instead of shrinking into a thin band. Tall phones also get a taller stage
// so the header and pills sit near the screen edges.
const view = { portrait: false, w: 0, h: 0, cx: 0, cy: 0 };
const onLayout = [];
function fit() {
  const portrait = innerHeight > innerWidth;
  const w = portrait ? SHORT : LONG;
  const h = portrait ? Math.round(Math.min(Math.max(LONG, SHORT * innerHeight / innerWidth), 2000)) : SHORT;
  if (w !== view.w || h !== view.h) {
    Object.assign(view, { portrait, w, h, cx: w / 2, cy: h / 2 });
    document.body.classList.toggle('portrait', portrait);
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
    onLayout.forEach(f => f());
  }
  const s = Math.min(innerWidth / view.w, innerHeight / view.h);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener('resize', fit);
fit();

// Average photo color, pushed toward a saturated tone so dark portraits still glow.
function glowFrom(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 16, 16);
  const d = ctx.getImageData(0, 0, 16, 16).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const spread = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    const w = 1 + spread / 32; // favor colorful pixels over gray backdrops
    r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; n += w;
  }
  const [h, s, l] = rgbToHsl(r / n, g / n, b / n);
  return `hsla(${h}, ${Math.max(s, 55)}%, ${Math.min(Math.max(l, 42), 58)}%, .6)`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function el(tag, cls, attrs = {}) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

// User data wins; the bundled template keeps a fresh clone working.
async function loadData() {
  for (const dir of DATA_DIRS) {
    const res = await fetch(dir + 'people.json');
    if (res.ok) {
      if (dir === 'template/') console.info('Showing template/. Copy it to data/ and edit data/people.json.');
      return { dir, data: await res.json() };
    }
  }
  throw new Error('No people.json found in data/ or template/');
}

function buildFrame(img, tagline, name) {
  const frame = el('span', 'frame');
  frame.append(el('span', 'glow'), img);
  const label = el('span', 'label');
  label.append(name);
  if (tagline) { const s = el('small'); s.textContent = tagline; label.appendChild(s); }
  return [frame, label];
}

async function main() {
  const { dir, data } = await loadData();
  const title = data.title.replace('{name}', data.name);
  document.title = title;
  document.getElementById('title').textContent = title;
  document.getElementById('subtitle').textContent = data.subtitle || '';

  const chip = document.getElementById('chip');
  if (data.chip) {
    chip.hidden = false;
    chip.href = data.chip.href;
    chip.querySelector('span').textContent = data.chip.label;
  }
  const repo = document.getElementById('repo');
  if (data.repo) {
    repo.hidden = false;
    repo.href = data.repo.href;
    repo.querySelector('span').textContent = data.repo.label;
  }
  const src = document.getElementById('sources');
  if (data.sourcesLink) {
    src.hidden = false;
    src.textContent = data.sourcesLink.label;
    src.href = dir + data.sourcesLink.href;
  }

  const ratio = data.ellipseRatio;
  // Orbit radii along x and y; the long axis follows the stage's long side and stretches with a taller portrait stage.
  const radii = r => view.portrait ? [r.radiusY, r.radiusY * 1.5 * view.h / LONG] : [r.radiusY * ratio, r.radiusY];
  const svg = document.getElementById('rings');
  const ellipses = data.rings.map(r => {
    const e = document.createElementNS(SVG_NS, 'ellipse');
    svg.appendChild(e);
    return [e, r];
  });

  // Center: the owner.
  const meImg = el('img', 'photo', { src: dir + data.photo, alt: data.name });
  const me = el('div', 'me');
  const [meFrame, meLabel] = buildFrame(meImg, '', data.name);
  me.append(meFrame, meLabel);
  me.style.cssText = '--w:150px;--h:150px';
  stage.appendChild(me);

  const layout = () => {
    svg.setAttribute('width', view.w); svg.setAttribute('height', view.h);
    svg.setAttribute('viewBox', `0 0 ${view.w} ${view.h}`);
    ellipses.forEach(([e, r]) => {
      const [rx, ry] = radii(r);
      e.setAttribute('cx', view.cx); e.setAttribute('cy', view.cy);
      e.setAttribute('rx', rx); e.setAttribute('ry', ry);
    });
    me.style.left = view.cx + 'px'; me.style.top = view.cy + 'px';
  };
  onLayout.push(layout);
  layout();

  const nodes = [];
  data.rings.forEach((ring, ringIdx) => {
    const items = data.items.filter(i => i.ring === ringIdx + 1);
    items.forEach((item, idx) => {
      const cover = (item.shape || ring.shape) === 'cover';
      const w = cover ? ring.size * .72 : ring.size, h = ring.size;
      const node = el('div', 'node' + (cover ? ' cover' : ''));
      node.style.setProperty('--i', nodes.length);
      const shift = el('div', 'shift');
      const a = el('a', '', { href: item.links[0] || '#', 'aria-label': item.name });
      a.style.cssText = `--w:${w}px;--h:${h}px`;
      if (item.links[0]) { a.target = '_blank'; a.rel = 'noopener'; } else { a.addEventListener('click', e => e.preventDefault()); }
      const img = el('img', 'photo', { src: dir + item.photo, alt: '' });
      const [frame, label] = buildFrame(img, item.tagline, item.name);
      a.append(frame, label);
      shift.appendChild(a);
      node.appendChild(shift);
      stage.appendChild(node);

      const setGlow = () => a.style.setProperty('--glow', item.glow || glowFrom(img));
      img.complete ? setGlow() : img.addEventListener('load', setGlow);

      nodes.push({ node, shift, a, label, ring, h, radius: Math.max(w, h) / 2, angle: ring.phase + (360 / items.length) * idx, x: 0, y: 0, px: 0, py: 0 });
    });
  });

  // Keep zoomed items from covering neighbours: push them radially away while one is active.
  function spread(active) {
    nodes.forEach(n => {
      let px = 0, py = 0;
      if (active && n !== active) {
        const dx = n.x - active.x, dy = n.y - active.y;
        const dist = Math.hypot(dx, dy) || 1;
        const need = active.radius * ZOOM + n.radius + PUSH_MARGIN + 18; // 18 = label height
        if (dist < need) { px = (dx / dist) * (need - dist); py = (dy / dist) * (need - dist); }
      }
      n.px = px; n.py = py;
      n.shift.style.setProperty('--px', px + 'px');
      n.shift.style.setProperty('--py', py + 'px');
    });
  }

  // Names that would cover another name or photo fade out. Inner rings win and the active item always shows;
  // a hidden name needs a few px of clearance before it returns, so it does not flicker at the edge.
  const box = (x, y, rx, ry = rx) => [x - rx, y - ry, x + rx, y + ry];
  const hits = (a, b, pad) => a[0] < b[2] + pad && b[0] < a[2] + pad && a[1] < b[3] + pad && b[1] < a[3] + pad;
  function declutter() {
    if (view.portrait) return; // portrait already shows only the active name
    const photos = nodes.map(n => box(n.x + n.px, n.y + n.py, n.radius));
    const taken = [...photos, box(view.cx, view.cy, 75), box(view.cx, view.cy + 92, 45, 14)];
    [active, ...nodes.filter(n => n !== active)].forEach(n => {
      if (!n) return;
      n.labelW ||= n.label.offsetWidth; n.labelH ||= n.label.offsetHeight;
      const x = n.x + n.px, top = n.y + n.py + n.h / 2 + 6;
      const own = photos[nodes.indexOf(n)];
      const rect = [x - n.labelW / 2, top, x + n.labelW / 2, top + n.labelH];
      const off = n !== active && taken.some(t => t !== own && hits(rect, t, n.labelOff ? 6 : 0));
      if (off !== n.labelOff) { n.labelOff = off; n.node.classList.toggle('label-off', off); }
      if (!off) taken.push(rect);
    });
  }

  let active = null;
  const activate = n => {
    if (active === n) return;
    active?.node.classList.remove('is-active');
    active = n;
    n?.node.classList.add('is-active');
    spread(n);
  };

  // Mouse: hover previews, click opens. Touch has no hover, so the first tap previews and a second tap opens.
  let tapped = null;
  nodes.forEach(n => {
    n.a.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') activate(n); });
    n.a.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && active === n) activate(null); });
    n.a.addEventListener('pointerdown', e => { tapped = e.pointerType === 'mouse' ? null : { n, armed: active === n }; });
    n.a.addEventListener('click', e => {
      if (tapped?.n === n && !tapped.armed) { e.preventDefault(); activate(n); }
      tapped = null;
    });
    n.a.addEventListener('focus', () => activate(n));
    n.a.addEventListener('blur', () => { if (active === n) activate(null); });
  });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.node')) activate(null); });

  const spin = data.rotation?.enabled && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, .1);
    last = now;
    nodes.forEach(n => {
      if (spin && !active) n.angle += n.ring.degPerSecond * dt;
      const rad = n.angle * Math.PI / 180;
      const [rx, ry] = radii(n.ring);
      n.x = view.cx + Math.cos(rad) * rx;
      n.y = view.cy + Math.sin(rad) * ry;
      n.node.style.transform = `translate3d(${n.x}px, ${n.y}px, 0)`;
    });
    declutter();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
main();
