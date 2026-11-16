/* charts.js
   Small dependency-free SVG charts. Colours come from the CSS tokens in
   css/site.css, so charts follow the light and dark themes automatically.

   Used from Markdown through fenced blocks:
     ```chart     { "type": "line" | "bar", ... }   (JSON)
     ```workflow  Step title | one-line description   (one step per line)
*/
const Charts = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const COLORS = ["var(--violet)", "var(--safranin)", "var(--teal)", "var(--amber)"];

  function svgEl(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function htmlEl(tag, cls, text, parent) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  // "Nice" axis ticks: steps of 1, 2 or 5 times a power of ten.
  function ticks(min, max, target = 5) {
    if (min === max) { min -= 1; max += 1; }
    const raw = (max - min) / target;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map(m => m * pow).find(s => s >= raw);
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const fmt = v => {
    const a = Math.abs(v);
    if (a !== 0 && (a < 0.01 || a >= 100000)) return v.toExponential(1);
    return String(+v.toFixed(a < 1 ? 3 : a < 100 ? 2 : 0));
  };

  function header(container, spec, series) {
    container.classList.add("chart");
    container.textContent = "";
    if (spec.title) htmlEl("div", "c-title", spec.title, container);
    if (series && series.length > 1) {
      const lg = htmlEl("div", "legend", null, container);
      series.forEach((s, i) => {
        const sp = htmlEl("span", s.dash ? "dash" : "", s.name, lg);
        sp.style.setProperty("--k", s.color || COLORS[i % COLORS.length]);
      });
    }
  }

  /* Line / scatter chart.
     spec = { title, x: {label, min, max}, y: {label, min, max},
              series: [{ name, data: [[x, y], ...], mode: "line"|"points"|"both", dash, color }],
              cursor: true }
     Returns { setCursor(x) } so a widget can move a vertical marker. */
  function line(container, spec) {
    const series = spec.series || [];
    header(container, spec, series);
    const W = 520, H = spec.height || 300, m = { l: 52, r: 14, t: 12, b: 42 };
    const all = series.flatMap(s => s.data);
    const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const xT = ticks(spec.x?.min ?? Math.min(...xs), spec.x?.max ?? Math.max(...xs), 6);
    const yT = ticks(spec.y?.min ?? Math.min(0, ...ys), spec.y?.max ?? Math.max(...ys), 5);
    const x0 = xT[0], x1 = xT[xT.length - 1], y0 = yT[0], y1 = yT[yT.length - 1];
    const px = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r);
    const py = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);

    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": spec.title || `${spec.y?.label || "y"} against ${spec.x?.label || "x"}` }, container);
    yT.forEach(t => {
      svgEl("line", { class: "grid", x1: m.l, x2: W - m.r, y1: py(t), y2: py(t) }, svg);
      svgEl("text", { x: m.l - 8, y: py(t) + 4, "text-anchor": "end" }, svg).textContent = fmt(t);
    });
    xT.forEach(t => svgEl("text", { x: px(t), y: H - m.b + 17, "text-anchor": "middle" }, svg).textContent = fmt(t));
    svgEl("line", { class: "axis", x1: m.l, x2: W - m.r, y1: py(y0), y2: py(y0) }, svg);
    if (spec.x?.label) svgEl("text", { class: "axis-label", x: (m.l + W - m.r) / 2, y: H - 6, "text-anchor": "middle" }, svg).textContent = spec.x.label;
    if (spec.y?.label) svgEl("text", { class: "axis-label", x: 13, y: (m.t + H - m.b) / 2, "text-anchor": "middle", transform: `rotate(-90 13 ${(m.t + H - m.b) / 2})` }, svg).textContent = spec.y.label;

    series.forEach((s, i) => {
      const c = s.color || COLORS[i % COLORS.length], mode = s.mode || "line";
      if (mode !== "points") {
        const d = s.data.map((p, j) => (j ? "L" : "M") + px(p[0]).toFixed(1) + " " + py(p[1]).toFixed(1)).join("");
        const path = svgEl("path", { d, fill: "none", "stroke-width": 2.4, "stroke-linejoin": "round" }, svg);
        path.style.stroke = c;
        if (s.dash) path.setAttribute("stroke-dasharray", "6 5");
      }
      if (mode !== "line") s.data.forEach(p => { svgEl("circle", { cx: px(p[0]), cy: py(p[1]), r: 4 }, svg).style.fill = c; });
    });

    const cur = svgEl("line", { class: "axis", y1: m.t, y2: H - m.b, "stroke-dasharray": "3 3", visibility: "hidden" }, svg);
    const tip = htmlEl("div", "tip", null, container); tip.hidden = true;
    const nearest = (s, x) => s.data.reduce((a, p) => Math.abs(p[0] - x) < Math.abs(a[0] - x) ? p : a, s.data[0]);
    svg.addEventListener("pointermove", ev => {
      const r = svg.getBoundingClientRect();
      const x = x0 + ((ev.clientX - r.left) / r.width * W - m.l) / (W - m.l - m.r) * (x1 - x0);
      if (x < x0 || x > x1 || !series.length) { tip.hidden = true; return; }
      const xn = nearest(series[0], x)[0];
      tip.textContent = "";
      htmlEl("div", null, `${spec.x?.label || "x"}: ${fmt(xn)}`, tip);
      series.forEach(s => htmlEl("div", null, `${s.name || "y"}: ${fmt(nearest(s, xn)[1])}`, tip));
      tip.hidden = false;
      tip.style.left = (px(xn) / W * r.width) + "px";
      tip.style.top = (svg.offsetTop + py(Math.max(...series.map(s => nearest(s, xn)[1]))) / H * r.height) + "px";
    });
    svg.addEventListener("pointerleave", () => { tip.hidden = true; });

    return {
      setCursor(x) {
        cur.setAttribute("x1", px(x)); cur.setAttribute("x2", px(x));
        cur.setAttribute("visibility", "visible");
      }
    };
  }

  /* Bar chart. Handles negative values.
     spec = { title, categories: [...], y: {label, min, max},
              series: [{ name, values: [...] }], highlight: index } */
  function bar(container, spec) {
    const series = spec.series || [], cats = spec.categories || [];
    header(container, spec, series);
    const W = 520, H = spec.height || 300, m = { l: 52, r: 14, t: 22, b: 46 };
    const vals = series.flatMap(s => s.values);
    const yT = ticks(spec.y?.min ?? Math.min(0, ...vals), spec.y?.max ?? Math.max(0, ...vals), 5);
    const y0 = yT[0], y1 = yT[yT.length - 1];
    const py = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
    const band = (W - m.l - m.r) / cats.length, bw = Math.min(64, band * 0.7 / series.length);

    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": spec.title || "Bar chart" }, container);
    yT.forEach(t => {
      svgEl("line", { class: "grid", x1: m.l, x2: W - m.r, y1: py(t), y2: py(t) }, svg);
      svgEl("text", { x: m.l - 8, y: py(t) + 4, "text-anchor": "end" }, svg).textContent = fmt(t);
    });
    cats.forEach((c, i) => {
      const cx = m.l + band * (i + 0.5);
      series.forEach((s, j) => {
        const v = s.values[i]; if (v == null) return;
        const x = cx - bw * series.length / 2 + j * bw;
        const top = Math.min(py(v), py(0)), h = Math.abs(py(v) - py(0));
        const r = svgEl("rect", { x: x + 2, y: top, width: bw - 4, height: Math.max(h, 1), rx: 2 }, svg);
        r.style.fill = series.length > 1 ? COLORS[j % COLORS.length] : (spec.highlight === i ? "var(--safranin)" : "var(--violet)");
        svgEl("text", { class: "val", x: x + bw / 2, y: v >= 0 ? top - 6 : top + h + 15, "text-anchor": "middle" }, svg).textContent = fmt(v);
      });
      // Category labels wrap onto two lines at a space when they are long.
      const words = String(c).split(" "), half = Math.ceil(words.length / 2);
      const lines = String(c).length > 14 && words.length > 1 ? [words.slice(0, half).join(" "), words.slice(half).join(" ")] : [c];
      lines.forEach((ln, k) => svgEl("text", { class: "axis-label", x: cx, y: H - m.b + 17 + k * 14, "text-anchor": "middle" }, svg).textContent = ln);
    });
    svgEl("line", { class: "axis", x1: m.l, x2: W - m.r, y1: py(0), y2: py(0) }, svg);
    if (spec.y?.label) svgEl("text", { class: "axis-label", x: 13, y: (m.t + H - m.b) / 2, "text-anchor": "middle", transform: `rotate(-90 13 ${(m.t + H - m.b) / 2})` }, svg).textContent = spec.y.label;
  }

  // Minimal CSV reader: comma separated, first row is the header, no quoted commas.
  function parseCSV(text) {
    const rows = text.trim().split(/\r?\n/).map(r => r.split(",").map(c => c.trim()));
    const head = rows.shift();
    return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  }

  /* Entry point for ```chart blocks. With "csv", data is read from a file:
     { "type": "line", "csv": "content/data/run1.csv", "xCol": "time_h",
       "yCols": ["biomass", "product"], "mode": "both", ... } */
  async function render(container, spec) {
    try {
      if (spec.csv) {
        const res = await fetch(spec.csv);
        if (!res.ok) throw new Error(`could not load ${spec.csv}`);
        const rows = parseCSV(await res.text());
        if (spec.type === "bar") {
          spec.categories = rows.map(r => r[spec.xCol]);
          spec.series = spec.yCols.map(c => ({ name: c, values: rows.map(r => +r[c]) }));
        } else {
          spec.series = spec.yCols.map(c => ({ name: c, mode: spec.mode || "both", data: rows.map(r => [+r[spec.xCol], +r[c]]).filter(p => !isNaN(p[0]) && !isNaN(p[1])) }));
        }
      }
      (spec.type === "bar" ? bar : line)(container, spec);
    } catch (err) {
      container.className = "pending";
      container.textContent = `This chart did not render: ${err.message}. Check the JSON in the Markdown file.`;
    }
  }

  // ```workflow blocks: one step per line, "Title | description".
  function workflow(container, text) {
    const ol = htmlEl("ol", "flow", null, container);
    text.trim().split(/\n+/).forEach(lineText => {
      const [title, desc] = lineText.split("|").map(s => s.trim());
      if (!title) return;
      const li = htmlEl("li", null, null, ol);
      htmlEl("strong", null, title, li);
      if (desc) htmlEl("span", null, desc, li);
    });
  }

  return { line, bar, render, workflow, svgEl, htmlEl, fmt };
})();
