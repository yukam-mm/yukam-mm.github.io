/* widgets.js
   Interactive "instruments". Each one is a function that fills a container.
   Mount one from Markdown with:
     ```widget
     kinetics
     ```
   To add your own: write a function (container) => {...} and register it in
   the `registry` object at the bottom of this file.
*/

/* ---------- Kinetics model (pure functions, also used by the tests) ----------
   Logistic growth:      dX/dt = mu * X * (1 - X / Xmax)
     X(t) = X0 * Xmax * e^(mu t) / (Xmax - X0 + X0 * e^(mu t))
   Luedeking-Piret:      dP/dt = alpha * dX/dt + beta * X
     P(t) = P0 + alpha * (X(t) - X0) + beta * I(t)
     I(t) = integral of X from 0 to t
          = (Xmax / mu) * ln( (Xmax - X0 + X0 * e^(mu t)) / Xmax )
   Check: dI/dt = (Xmax/mu) * X0 * mu * e^(mu t) / (Xmax - X0 + X0 e^(mu t)) = X(t), and I(0) = 0.
*/
const Kinetics = {
  biomass(t, p) {
    const e = Math.exp(p.mu * t);
    return p.X0 * p.Xmax * e / (p.Xmax - p.X0 + p.X0 * e);
  },
  integralX(t, p) {
    return (p.Xmax / p.mu) * Math.log((p.Xmax - p.X0 + p.X0 * Math.exp(p.mu * t)) / p.Xmax);
  },
  growthProduct(t, p) { return p.alpha * (Kinetics.biomass(t, p) - p.X0); },
  maintenanceProduct(t, p) { return p.beta * Kinetics.integralX(t, p); },
  product(t, p) { return (p.P0 || 0) + Kinetics.growthProduct(t, p) + Kinetics.maintenanceProduct(t, p); },
  // Time at which biomass reaches a fraction f of Xmax.
  timeToFraction(f, p) { return Math.log(f * (p.Xmax - p.X0) / ((1 - f) * p.X0)) / p.mu; }
};

const Widgets = (() => {
  const { htmlEl, fmt } = Charts;
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0;

  function slider(parent, label, min, max, step, value, unit, onInput) {
    const id = "ctl-" + (++uid);
    const box = htmlEl("div", "control", null, parent);
    const lab = htmlEl("label", null, null, box); lab.htmlFor = id;
    htmlEl("span", null, label, lab);
    const out = htmlEl("output", null, null, lab);
    const input = htmlEl("input", null, null, box);
    Object.assign(input, { type: "range", id, min, max, step, value });
    const show = () => { out.textContent = `${fmt(+input.value)}${unit ? " " + unit : ""}`; };
    input.addEventListener("input", () => { show(); onInput(+input.value); });
    show();
    return { input, set(v) { input.value = v; show(); } };
  }

  /* ---------- Plate: simulated colony growth and counting ----------
     Colonies grow logistically in radius after a random lag. A colony is
     "detected" once its diameter passes the threshold. Detected colonies that
     overlap are merged into one count, which is the classic failure of
     threshold-based counting on crowded plates. Nothing here is measured data. */
  function plate(container) {
    container.classList.add("instrument");
    const T_END = 48, DISH_MM = 90, N = 46;
    // Seeded random numbers so every visitor sees the same plate.
    let seed = 20261116;
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const colonies = [];
    while (colonies.length < N) {
      const x = rnd() * 2 - 1, y = rnd() * 2 - 1;
      if (x * x + y * y > 0.80 * 0.80) continue;
      colonies.push({ x, y, lag: 8 + rnd() * 20, rmax: 0.030 + rnd() * 0.055, k: 0.28 + rnd() * 0.2 });
    }
    // Radius as a fraction of the dish radius at time t (hours).
    const radius = (c, t) => c.rmax / (1 + Math.exp(-c.k * (t - c.lag)));
    const VISIBLE = 0.004;

    function analyse(t, thrMm) {
      const thr = thrMm / DISH_MM; // diameter threshold in mm -> radius as fraction of dish radius
      const vis = colonies.map(c => ({ c, r: radius(c, t) })).filter(o => o.r > VISIBLE);
      const det = vis.filter(o => o.r >= thr);
      const parent = det.map((_, i) => i);
      const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
      for (let i = 0; i < det.length; i++) for (let j = i + 1; j < det.length; j++) {
        const d = Math.hypot(det[i].c.x - det[j].c.x, det[i].c.y - det[j].c.y);
        if (d < (det[i].r + det[j].r) * 0.92) parent[find(i)] = find(j);
      }
      const clusters = {};
      det.forEach((o, i) => { (clusters[find(i)] = clusters[find(i)] || []).push(o); });
      return { vis, det, clusters: Object.values(clusters) };
    }

    const state = { t: T_END, thr: 2 };
    const grid = htmlEl("div", "plate-grid", null, container);
    const canvas = htmlEl("canvas", null, null, grid);
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Simulated agar plate with growing colonies and detection boxes");
    const side = htmlEl("div", null, null, grid);
    const dl = htmlEl("dl", "readout", null, side);
    const mk = (cls, label) => { const d = htmlEl("div", cls, null, dl); htmlEl("dt", null, label, d); return htmlEl("dd", null, "0", d); };
    const outTrue = mk("r-true", "On the plate"), outCount = mk("r-count", "Counted"), outMiss = mk("r-miss", "Missed");
    const chartBox = htmlEl("div", null, null, side);
    let chart;

    function drawChart() {
      const tru = [], cnt = [];
      for (let t = 0; t <= T_END; t += 0.5) { const a = analyse(t, state.thr); tru.push([t, a.vis.length]); cnt.push([t, a.clusters.length]); }
      chart = Charts.line(chartBox, { height: 250, x: { label: "Incubation time (h)", min: 0, max: T_END }, y: { label: "Colonies", min: 0, max: 50 },
        series: [{ name: "On the plate", data: tru }, { name: "Counted", data: cnt }] });
      chart.setCursor(state.t);
    }

    function draw() {
      const a = analyse(state.t, state.thr);
      outTrue.textContent = a.vis.length; outCount.textContent = a.clusters.length; outMiss.textContent = a.vis.length - a.clusters.length;
      const css = getComputedStyle(document.documentElement), v = n => css.getPropertyValue(n).trim();
      const size = canvas.clientWidth || 300, dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(size * dpr)) { canvas.width = canvas.height = Math.round(size * dpr); }
      const g = canvas.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
      const R = size / 2 - 6, cx = size / 2, cy = size / 2;
      g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fillStyle = v("--agar"); g.fill();
      g.lineWidth = 5; g.strokeStyle = v("--line"); g.stroke();
      g.lineWidth = 1; g.strokeStyle = v("--amber"); g.beginPath(); g.arc(cx, cy, R - 5, 0, 7); g.stroke();
      a.vis.forEach(o => {
        g.beginPath(); g.arc(cx + o.c.x * R, cy + o.c.y * R, Math.max(o.r * R, 0.8), 0, 7);
        g.fillStyle = v("--colony"); g.fill(); g.lineWidth = 1; g.strokeStyle = v("--amber"); g.stroke();
      });
      g.lineWidth = 1.6; g.strokeStyle = v("--safranin");
      a.clusters.forEach(cl => {
        const x0 = Math.min(...cl.map(o => o.c.x - o.r)), x1 = Math.max(...cl.map(o => o.c.x + o.r));
        const y0 = Math.min(...cl.map(o => o.c.y - o.r)), y1 = Math.max(...cl.map(o => o.c.y + o.r));
        g.strokeRect(cx + x0 * R - 2, cy + y0 * R - 2, (x1 - x0) * R + 4, (y1 - y0) * R + 4);
      });
      if (chart) chart.setCursor(state.t);
    }

    const controls = htmlEl("div", "controls", null, container);
    const tSlider = slider(controls, "Incubation time", 0, T_END, 0.25, state.t, "h", val => { stop(); state.t = val; draw(); });
    slider(controls, "Smallest detectable colony", 0.5, 5, 0.1, state.thr, "mm", val => { state.thr = val; drawChart(); draw(); });
    const row = htmlEl("div", "control-row", null, container);
    const play = htmlEl("button", "btn", "Replay growth", row); play.type = "button";
    htmlEl("p", "cap", "A simulated 90 mm plate, not measured data. Colonies grow logistically; the counter boxes anything above the size threshold and merges colonies that touch, so the count falls behind the truth as the plate fills up. Closing that gap is what my MSc thesis is about.", container);

    let raf = 0;
    function stop() { cancelAnimationFrame(raf); raf = 0; }
    function run() {
      stop();
      const start = performance.now(), DURATION = 9000;
      const tick = now => {
        state.t = Math.min(T_END, (now - start) / DURATION * T_END);
        tSlider.set(state.t); draw();
        if (state.t < T_END) raf = requestAnimationFrame(tick); else raf = 0;
      };
      raf = requestAnimationFrame(tick);
    }
    play.addEventListener("click", run);

    drawChart(); draw();
    new ResizeObserver(draw).observe(canvas);
    // Redraw when the colour theme changes.
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (!reduceMotion()) setTimeout(run, 700);
  }

  /* ---------- Kinetics: logistic growth + Luedeking-Piret ---------- */
  function kinetics(container) {
    container.classList.add("instrument");
    // mu, Xmax and beta are the approximate fitted values from the project.
    // alpha (fitted values were nearly equal for both strains) and X0 are set for illustration.
    const presets = {
      "Strain 33": { mu: 0.045, Xmax: 31, alpha: 2, beta: 0.110 },
      "Strain H": { mu: 0.037, Xmax: 27, alpha: 2, beta: 0.066 }
    };
    const p = { X0: 1, P0: 0, ...presets["Strain 33"] };
    const T_END = 200;

    const row = htmlEl("div", "control-row", null, container);
    htmlEl("span", null, "Start from", row).style.cssText = "font-size:var(--step--1);color:var(--muted)";
    const sliders = {};
    Object.keys(presets).forEach(name => {
      const b = htmlEl("button", "chip", name, row); b.type = "button";
      b.addEventListener("click", () => { Object.assign(p, presets[name]); for (const k in sliders) sliders[k].set(p[k]); draw(); });
    });
    const controls = htmlEl("div", "controls", null, container);
    const add = (key, label, min, max, step, unit) => { sliders[key] = slider(controls, label, min, max, step, p[key], unit, val => { p[key] = val; draw(); }); };
    add("mu", "Maximum growth rate μ", 0.01, 0.1, 0.001, "1/h");
    add("Xmax", "Biomass ceiling Xmax", 10, 40, 0.5, "% PMV");
    add("alpha", "Growth-associated α", 0, 6, 0.1, "");
    add("beta", "Non-growth-associated β", 0, 0.2, 0.002, "1/h");

    const gridEl = htmlEl("div", "kin-grid", null, container);
    const a = htmlEl("div", null, null, gridEl), b = htmlEl("div", null, null, gridEl);
    const facts = htmlEl("div", "kin-facts", null, container);
    htmlEl("p", "cap", "Model curves only. μ, Xmax and β for the two presets are the approximate values I fitted to my BSc fermentation data; α and the starting biomass are set for illustration, and the product axis is in model units. Each fit rests on five unreplicated timepoints, so treat differences between strains as indications.", container);

    function draw() {
      const ts = []; for (let t = 0; t <= T_END; t += 2.5) ts.push(t);
      Charts.line(a, { title: "Biomass", height: 270, x: { label: "Time (h)", min: 0, max: T_END }, y: { label: "Biomass (% PMV)", min: 0, max: 40 },
        series: [{ name: "Biomass X(t)", data: ts.map(t => [t, Kinetics.biomass(t, p)]) }] });
      Charts.line(b, { title: "Product, split by when it is made", height: 270, x: { label: "Time (h)", min: 0, max: T_END }, y: { label: "Product (model units)", min: 0 },
        series: [
          { name: "Total", data: ts.map(t => [t, Kinetics.product(t, p)]) },
          { name: "While growing (α)", dash: true, data: ts.map(t => [t, Kinetics.growthProduct(t, p)]) },
          { name: "After growth slows (β)", dash: true, data: ts.map(t => [t, Kinetics.maintenanceProduct(t, p)]) }
        ] });
      const total = Kinetics.product(T_END, p), late = Kinetics.maintenanceProduct(T_END, p);
      facts.textContent = "";
      const fact = (label, value) => { const s = htmlEl("span", null, label + " ", facts); htmlEl("b", null, value, s); };
      fact("Biomass reaches 95% of its ceiling at", `${fmt(Kinetics.timeToFraction(0.95, p))} h`);
      fact(`Share of product at ${T_END} h made by non-growing cells:`, total > 0 ? `${Math.round(late / total * 100)}%` : "n/a");
    }
    draw();
  }

  const registry = { plate, kinetics };
  function mount(name, container) {
    const fn = registry[name.trim()];
    if (fn) fn(container);
    else { container.className = "pending"; container.textContent = `No widget called "${name.trim()}". Available: ${Object.keys(registry).join(", ")}.`; }
  }
  return { mount, registry };
})();

if (typeof module !== "undefined") module.exports = { Kinetics };
