/* app.js
   Loads the content files and draws the pages. You should rarely need to
   edit this file: projects, publications and the timeline all live in
   the content/ folder.

   Routes (plain #hash, so the site works on any static host):
     #home, #research, #work, #code, #publications, #path, #contact  -> sections of the home page
     #project-<slug>                                                -> one project page
*/
(async function () {
  const view = document.getElementById("view");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const STATUS = { complete: "Completed", active: "In progress", planned: "Planned" };
  const statusHTML = s => `<span class="status ${esc(s)}"><i></i>${STATUS[s] || esc(s)}</span>`;
  const chips = list => `<ul class="chips">${(list || []).map(t => `<li class="chip">${esc(t)}</li>`).join("")}</ul>`;

  async function load(path, as = "json") {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${path} (${res.status})`);
    return as === "json" ? res.json() : res.text();
  }

  let site, projects, pubs, timeline;
  try {
    [site, projects, pubs, timeline] = await Promise.all([
      load("content/site.json"), load("content/projects.json"),
      load("content/publications.json"), load("content/timeline.json")
    ]);
  } catch (err) {
    view.innerHTML = `<div class="notice"><p><strong>The content files did not load:</strong> ${esc(err.message)}.</p>
      <p>If you opened index.html straight from a folder, start a local server instead: run <code>python -m http.server</code> in the site folder and open <code>http://localhost:8000</code>. If you just edited a JSON file, check it for a missing comma or quote.</p></div>`;
    return;
  }
  projects = projects.filter(p => !p.hidden);
  const ghUser = site.github;
  const repoURL = repo => repo.includes("/") ? `https://github.com/${repo}` : `https://github.com/${ghUser}/${repo}`;

  document.getElementById("wordmark").textContent = site.name;
  document.getElementById("foot").innerHTML = `<span>${esc(site.name)}, ${new Date().getFullYear()}</span><span>${esc(site.footer || "")}</span>`;

  /* ---------- GitHub: live repository data, cached for an hour ---------- */
  let ghPromise;
  function github() {
    if (!ghUser) return Promise.resolve(null);
    if (ghPromise) return ghPromise;
    const key = "gh-repos:" + ghUser;
    ghPromise = (async () => {
      try {
        const hit = JSON.parse(sessionStorage.getItem(key) || "null");
        if (hit && Date.now() - hit.at < 3600e3) return hit.repos;
      } catch (e) { /* storage unavailable: fetch instead */ }
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(ghUser)}/repos?per_page=100&sort=pushed`);
        if (!res.ok) return null;
        const repos = (await res.json()).filter(r => !r.fork).map(r => ({
          name: r.name, url: r.html_url, description: r.description, language: r.language,
          stars: r.stargazers_count, pushed: r.pushed_at, topics: r.topics || []
        }));
        try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), repos })); } catch (e) { /* ignore */ }
        return repos;
      } catch (e) { return null; }
    })();
    return ghPromise;
  }
  const dateFmt = iso => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  /* ---------- small drawings for the project index ---------- */
  function glyph(kind) {
    const g = {
      plate: `<circle class="g-ring" cx="38" cy="38" r="30"/><circle class="g-dot" cx="27" cy="30" r="4"/><circle class="g-dot" cx="46" cy="26" r="3"/><circle class="g-dot" cx="50" cy="44" r="5"/><circle class="g-dot" cx="32" cy="50" r="3.5"/><rect class="g-box" x="43" y="37" width="14" height="14"/><rect class="g-box" x="21" y="24" width="12" height="12"/>`,
      translate: `<circle class="g-thin" cx="22" cy="38" r="15" stroke-dasharray="3 3"/><circle class="g-dot" cx="18" cy="34" r="3"/><circle class="g-dot" cx="27" cy="43" r="2.5"/><path class="g-line" d="M40 38h10m-4-4 4 4-4 4"/><circle class="g-ring" cx="60" cy="38" r="12"/><circle class="g-dot" cx="57" cy="35" r="3"/><circle class="g-dot" cx="64" cy="42" r="2.5"/>`,
      curve: `<path class="g-thin" d="M10 64V10M10 64h56"/><path class="g-line" d="M12 60c18 0 20-40 52-42"/><path class="g-teal" d="M12 62c22 0 30-10 52-26" stroke-dasharray="4 4"/>`,
      network: `<path class="g-thin" d="M14 20 38 14M14 20 38 32M14 38 38 14M14 38 38 32M14 38 38 50M14 56 38 32M14 56 38 50M38 14 62 38M38 32 62 38M38 50 62 38"/><circle class="g-dot" cx="14" cy="20" r="4"/><circle class="g-dot" cx="14" cy="38" r="4"/><circle class="g-dot" cx="14" cy="56" r="4"/><circle class="g-dot" cx="38" cy="14" r="4"/><circle class="g-dot" cx="38" cy="32" r="4"/><circle class="g-dot" cx="38" cy="50" r="4"/><circle class="g-hot" cx="62" cy="38" r="5"/>`,
      molecule: `<path class="g-line" d="M38 14 56 24v20L38 54 20 44V24Z"/><path class="g-thin" d="M56 24 68 17M20 44 9 51M38 54v12"/><circle class="g-hot" cx="68" cy="17" r="4"/><circle class="g-dot" cx="9" cy="51" r="4"/><circle class="g-dot" cx="38" cy="66" r="4"/>`,
      bars: `<path class="g-thin" d="M10 64h56"/><rect class="g-dot" x="16" y="34" width="12" height="30" rx="1"/><rect class="g-hot" x="33" y="18" width="12" height="46" rx="1"/><rect class="g-dot" x="50" y="42" width="12" height="22" rx="1"/>`,
      kit: `<rect class="g-thin" x="10" y="10" width="26" height="26" rx="3"/><rect class="g-thin" x="40" y="10" width="26" height="26" rx="3"/><rect class="g-thin" x="10" y="40" width="26" height="26" rx="3"/><rect class="g-thin" x="40" y="40" width="26" height="26" rx="3"/><path class="g-line" d="M14 31c8 0 8-16 18-16"/><circle class="g-dot" cx="48" cy="28" r="2.5"/><circle class="g-dot" cx="54" cy="20" r="2.5"/><circle class="g-dot" cx="60" cy="17" r="2.5"/><path class="g-teal" d="M15 60v-8m6 8V46m6 14v-11"/><path class="g-line" d="M44 53h18M53 44v18"/>`,
      twin: `<circle class="g-ring" cx="26" cy="38" r="16"/><path class="g-thin" d="M46 38h6"/><rect class="g-thin" x="52" y="22" width="16" height="32" rx="2" stroke-dasharray="3 3"/><path class="g-line" d="M55 48c4 0 4-18 10-18"/><circle class="g-dot" cx="22" cy="34" r="3"/><circle class="g-dot" cx="31" cy="43" r="3"/>`
    };
    return `<svg class="glyph" viewBox="0 0 76 76" aria-hidden="true">${g[kind] || g.curve}</svg>`;
  }

  /* ---------- research map: interests -> projects -> methods ---------- */
  function researchMap() {
    const themes = site.interests, methods = [...new Set(projects.flatMap(p => p.methods || []))];
    const rows = Math.max(themes.length, projects.length, methods.length);
    const W = 1060, top = 44, H = top + rows * 40 + 16;
    const yOf = (i, n) => top + (H - top - 16) * (i + 0.5) / n;
    const tx = 300, pxL = 420, pxR = 660, mx = 780;
    const curve = (x1, y1, x2, y2) => `M${x1} ${y1}C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`;
    let links = "", nodes = "";
    projects.forEach((p, i) => {
      const y = yOf(i, projects.length);
      (p.themes || []).forEach(t => { const k = themes.indexOf(t); if (k >= 0) links += `<path class="link t" data-a="t${k}" data-b="p${i}" d="${curve(tx, yOf(k, themes.length), pxL, y)}"/>`; });
      (p.methods || []).forEach(mth => { const k = methods.indexOf(mth); links += `<path class="link m" data-a="p${i}" data-b="m${k}" d="${curve(pxR, y, mx, yOf(k, methods.length))}"/>`; });
      nodes += `<a class="node" data-id="p${i}" href="#project-${esc(p.slug)}"><rect class="pbox" x="${pxL}" y="${y - 15}" width="${pxR - pxL}" height="30" rx="6"/><text x="${(pxL + pxR) / 2}" y="${y + 5}" text-anchor="middle">${esc(p.short || p.title)}</text></a>`;
    });
    themes.forEach((t, k) => { const y = yOf(k, themes.length); nodes += `<g class="node" tabindex="0" data-id="t${k}"><text x="${tx - 14}" y="${y + 5}" text-anchor="end">${esc(t)}</text><circle class="dot" cx="${tx}" cy="${y}" r="6"/></g>`; });
    methods.forEach((mth, k) => { const y = yOf(k, methods.length); nodes += `<g class="node" tabindex="0" data-id="m${k}"><circle class="dot" cx="${mx}" cy="${y}" r="6"/><text x="${mx + 14}" y="${y + 5}">${esc(mth)}</text></g>`; });
    return `<div class="map-scroll"><svg class="map" viewBox="0 0 ${W} ${H}" role="group" aria-label="Map linking research interests to projects and methods">
      <text class="col-head" x="${tx - 14}" y="22" text-anchor="end">Research interests</text>
      <text class="col-head" x="${(pxL + pxR) / 2}" y="22" text-anchor="middle">Projects</text>
      <text class="col-head" x="${mx + 14}" y="22">Methods</text>${links}${nodes}</svg></div>
      <p class="map-hint">Point at or tab to anything to trace its connections. Select a project to open it.</p>`;
  }
  function wireMap(root) {
    const svg = root.querySelector(".map"); if (!svg) return;
    const links = [...svg.querySelectorAll(".link")], nodes = [...svg.querySelectorAll(".node")];
    const focus = id => {
      const on = new Set([id]);
      // A project lights up both sides; an interest or method lights up its projects.
      links.forEach(l => { const hit = l.dataset.a === id || l.dataset.b === id; l.classList.toggle("on", hit); if (hit) { on.add(l.dataset.a); on.add(l.dataset.b); } });
      nodes.forEach(n => n.classList.toggle("on", on.has(n.dataset.id)));
      svg.classList.add("focus");
    };
    const clear = () => { svg.classList.remove("focus"); links.concat(nodes).forEach(n => n.classList.remove("on")); };
    nodes.forEach(n => {
      n.addEventListener("pointerenter", () => focus(n.dataset.id)); n.addEventListener("focus", () => focus(n.dataset.id));
      n.addEventListener("pointerleave", clear); n.addEventListener("blur", clear);
    });
  }

  /* ---------- home page ---------- */
  const filter = { status: "all", theme: "all" };
  function indexHTML() {
    const list = projects.filter(p => (filter.status === "all" || p.status === filter.status) && (filter.theme === "all" || (p.themes || []).includes(filter.theme)));
    if (!list.length) return `<p class="empty">No projects match both filters yet. Clear one of them to see more.</p>`;
    return `<ul class="index">${list.map(p => `<li><a class="row" href="#project-${esc(p.slug)}">
      ${glyph(p.glyph)}
      <div><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>${chips(p.tech)}</div>
      <div class="meta">${statusHTML(p.status)}<span>${esc(p.year || "")}</span></div></a></li>`).join("")}</ul>`;
  }

  function homeHTML() {
    const chipBtn = (group, value, label) => `<button type="button" class="chip" data-group="${group}" data-value="${esc(value)}" aria-pressed="${filter[group] === value}">${esc(label)}</button>`;
    const pubState = s => ({ published: "Published", presented: "Presented", review: "Under review", prep: "In preparation" }[s] || s);
    const contactLinks = [
      ghUser && [`https://github.com/${ghUser}`, "GitHub"], site.linkedin && [site.linkedin, "LinkedIn"],
      site.orcid && [site.orcid, "ORCID"], site.scholar && [site.scholar, "Google Scholar"], site.cv && [site.cv, "Download CV"]
    ].filter(Boolean);
    return `
    <section class="hero" id="home"><div class="wrap">
      <div>
        <h1>${esc(site.headline)}</h1>
        <p class="who">${esc(site.intro)}</p>
        <p class="now">${esc(site.now || "")}</p>
        <div class="actions"><a class="btn solid" href="#work">Explore the projects</a>${ghUser ? `<a class="btn" href="https://github.com/${esc(ghUser)}">Read the code on GitHub</a>` : ""}</div>
      </div>
      <div id="hero-widget"></div>
    </div></section>

    <section class="band" id="research"><div class="wrap">
      <h2>What I work on, and how the pieces connect</h2>
      <p class="lede">${esc(site.researchLede)}</p>
      ${researchMap()}
    </div></section>

    <section class="band" id="work"><div class="wrap">
      <h2>Projects</h2>
      <p class="lede">${esc(site.projectsLede)}</p>
      <div class="filters">
        <div class="group"><span>Status</span>${chipBtn("status", "all", "All")}${Object.keys(STATUS).map(s => chipBtn("status", s, STATUS[s])).join("")}</div>
        <div class="group"><span>Interest</span>${chipBtn("theme", "all", "All")}${site.interests.map(t => chipBtn("theme", t, t)).join("")}</div>
      </div>
      <div id="index">${indexHTML()}</div>
    </div></section>

    <section class="band" id="code"><div class="wrap">
      <h2>Code</h2>
      <p class="lede">Every project here is backed by a repository with the source, notebooks and tests. This list is read live from GitHub, most recently updated first.</p>
      <div id="repos"><p class="gh-note">Loading repositories from GitHub.</p></div>
    </div></section>

    <section class="band" id="publications"><div class="wrap">
      <h2>Publications</h2>
      <ul class="pubs">${pubs.map(p => `<li><span class="p-state ${p.status === "published" || p.status === "presented" ? "out" : ""}">${pubState(p.status)}${p.year ? `, ${esc(p.year)}` : ""}</span>
        <div><p>${esc(p.authors.replace(/\.$/, ""))}. <cite>${p.url ? `<a href="${esc(p.url)}">${esc(p.title)}</a>` : esc(p.title)}</cite>.</p><p class="p-venue">${esc(p.venue)}${p.note ? `. ${esc(p.note)}` : ""}</p></div></li>`).join("")}</ul>
    </div></section>

    <section class="band" id="path"><div class="wrap">
      <h2>From the fermenter to the model</h2>
      <p class="lede">${esc(site.pathLede)}</p>
      <div class="path-grid">
        <div>
          <div class="key"><span style="--k:var(--violet)">Education</span><span style="--k:var(--amber)">Lab and industry</span><span style="--k:var(--teal)">Computational</span><span style="--k:var(--safranin)">Upcoming</span></div>
          <ol class="timeline">${timeline.map(t => `<li class="${esc(t.kind || "")}"><time>${esc(t.when)}</time><div class="t-body"><h3>${esc(t.title)}</h3><p>${esc(t.place)}</p>${t.detail ? `<p>${esc(t.detail)}</p>` : ""}</div></li>`).join("")}</ol>
        </div>
        <div class="toolkit">
          ${(site.toolkit || []).map(g => `<section><h3>${esc(g.group)}</h3>${chips(g.items)}</section>`).join("")}
          ${site.awards ? `<h4>Awards</h4><ul class="awards">${site.awards.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
          ${site.languages ? `<h4>Languages</h4><p class="awards" style="padding:0">${esc(site.languages)}</p>` : ""}
        </div>
      </div>
    </div></section>

    <section class="band contact" id="contact"><div class="wrap">
      <h2>${esc(site.contactHeadline)}</h2>
      <p class="lede" style="margin:0">${esc(site.contactText)}</p>
      ${site.email ? `<p class="addr"><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>` : ""}
      <div class="links">${contactLinks.map(([href, label]) => `<a class="btn" href="${esc(href)}">${label}</a>`).join("")}</div>
    </div></section>`;
  }

  function renderHome(target) {
    document.title = `${site.name} Research Portfolio`;
    view.innerHTML = homeHTML();
    Widgets.mount(site.heroWidget || "plate", document.getElementById("hero-widget"));
    wireMap(view);
    view.querySelector(".filters").addEventListener("click", ev => {
      const b = ev.target.closest("button.chip"); if (!b) return;
      filter[b.dataset.group] = b.dataset.value;
      view.querySelectorAll(`.filters button[data-group="${b.dataset.group}"]`).forEach(x => x.setAttribute("aria-pressed", x === b));
      document.getElementById("index").innerHTML = indexHTML();
    });
    github().then(repos => {
      const box = document.getElementById("repos"); if (!box) return;
      if (!repos || !repos.length) {
        box.innerHTML = `<p class="gh-note">The live repository list did not load here${ghUser ? `. Browse everything directly at <a href="https://github.com/${esc(ghUser)}">github.com/${esc(ghUser)}</a>.` : ". Add your GitHub username to content/site.json to switch it on."}</p>`;
        return;
      }
      box.innerHTML = `<div class="repos">${repos.slice(0, site.repoCount || 6).map(r => `<a class="repo" href="${esc(r.url)}"><strong>${esc(r.name)}</strong><span>${esc(r.description || "No description yet.")}</span><small>${[r.language, r.stars ? `${r.stars} star${r.stars > 1 ? "s" : ""}` : "", `Updated ${dateFmt(r.pushed)}`].filter(Boolean).map(esc).join(", ")}</small></a>`).join("")}</div>`;
    });
    if (target && target !== "home") requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView());
    else window.scrollTo(0, 0);
  }

  /* ---------- project page ---------- */
  // Turn fenced blocks and images in the rendered Markdown into figures.
  function enhance(prose) {
    prose.querySelectorAll("pre > code").forEach(code => {
      const kind = (code.className.match(/language-(chart|workflow|widget)/) || [])[1];
      if (!kind) return;
      const pre = code.parentElement, fig = document.createElement("figure"), frame = document.createElement("div");
      frame.className = "frame"; fig.appendChild(frame);
      let caption = "";
      const text = code.textContent;
      if (kind === "chart") {
        try { const spec = JSON.parse(text); caption = spec.caption || ""; Charts.render(frame, spec); }
        catch (e) { frame.className = "pending"; frame.textContent = `This chart block is not valid JSON (${e.message}).`; }
      } else if (kind === "workflow") {
        const lines = text.trim().split("\n"), cap = lines.findIndex(l => l.toLowerCase().startsWith("caption:"));
        if (cap >= 0) caption = lines.splice(cap, 1)[0].slice(8).trim();
        fig.classList.add("bare"); Charts.workflow(frame, lines.join("\n"));
      } else {
        const [name, ...rest] = text.trim().split("\n");
        caption = rest.join(" ").replace(/^caption:\s*/i, "");
        fig.classList.add("bare"); Widgets.mount(name, frame);
      }
      if (caption) { const fc = document.createElement("figcaption"); fc.textContent = caption; fig.appendChild(fc); }
      pre.replaceWith(fig);
    });
    prose.querySelectorAll("p > img:only-child").forEach(img => {
      const fig = document.createElement("figure"), frame = document.createElement("div"); frame.className = "frame";
      img.parentElement.replaceWith(fig); frame.appendChild(img); fig.appendChild(frame);
      if (img.alt) { const fc = document.createElement("figcaption"); fc.textContent = img.alt; fig.appendChild(fc); }
    });
    prose.querySelectorAll("table").forEach(t => { const w = document.createElement("div"); w.className = "tablewrap"; t.replaceWith(w); w.appendChild(t); });
    // A paragraph that starts with "TODO:" becomes a visible "in progress" note.
    prose.querySelectorAll("p").forEach(p => { if (/^TODO:/i.test(p.textContent)) { p.className = "pending"; p.textContent = p.textContent.replace(/^TODO:\s*/i, ""); } });
    // Group everything under each H2 into a section so the side menu can track it.
    const sections = []; let current = null;
    [...prose.children].forEach(node => {
      if (node.tagName === "H2") { current = document.createElement("section"); current.id = "s-" + slugify(node.textContent); current.dataset.title = node.textContent; prose.insertBefore(current, node); sections.push(current); }
      if (current) current.appendChild(node);
    });
    return sections;
  }

  let spy;
  async function renderProject(slug) {
    const i = projects.findIndex(p => p.slug === slug), p = projects[i];
    if (!p) { view.innerHTML = `<div class="notice"><p>There is no project at this address. <a href="#work">See all projects.</a></p></div>`; return; }
    document.title = `${p.title} | ${site.name}`;
    let md;
    try { md = await load(`content/projects/${p.slug}.md`, "text"); }
    catch (e) { md = `## Overview\n\nTODO: The write-up for this project has not been added yet. Create \`content/projects/${p.slug}.md\` to fill this page.`; }
    const next = projects[(i + 1) % projects.length], prev = projects[(i - 1 + projects.length) % projects.length];
    view.innerHTML = `
      <div class="wrap">
        <header class="p-head">
          <a class="back" href="#work">All projects</a>
          <h1>${esc(p.title)}</h1>
          <p class="sum">${esc(p.summary)}</p>
          <dl class="p-facts">
            <div><dt>Status</dt><dd>${statusHTML(p.status)} <small>${esc(p.year || "")}</small></dd></div>
            <div><dt>Research interests</dt><dd>${chips(p.themes)}</dd></div>
            <div><dt>Built with</dt><dd>${chips(p.tech)}</dd></div>
            <div><dt>Source code</dt><dd id="repo-fact">${p.repo ? `<a class="repo-link" href="${esc(repoURL(p.repo))}">${esc(p.repo)}</a><small>on GitHub</small>` : `<small>Repository link coming when the code is public.</small>`}</dd></div>
          </dl>
        </header>
        <div class="p-layout">
          <nav class="p-nav" aria-label="Sections of this project"></nav>
          <article class="prose"></article>
        </div>
      </div>`;
    const prose = view.querySelector(".prose");
    prose.innerHTML = marked.parse(md);
    const sections = enhance(prose);
    prose.insertAdjacentHTML("beforeend", `<div class="p-next"><a href="#project-${esc(prev.slug)}"><small>Previous project</small>${esc(prev.title)}</a><a href="#project-${esc(next.slug)}" style="text-align:right"><small>Next project</small>${esc(next.title)}</a></div>`);

    const nav = view.querySelector(".p-nav");
    const buttons = sections.map(sec => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = sec.dataset.title;
      b.addEventListener("click", () => sec.scrollIntoView());
      nav.appendChild(b); return b;
    });
    if (spy) spy.disconnect();
    spy = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) buttons.forEach((b, k) => b.setAttribute("aria-current", sections[k] === en.target)); });
    }, { rootMargin: "-20% 0px -70% 0px" });
    sections.forEach(s => spy.observe(s));
    if (buttons[0]) buttons[0].setAttribute("aria-current", "true");
    window.scrollTo(0, 0);

    if (p.repo) github().then(repos => {
      const r = repos && repos.find(x => x.name.toLowerCase() === p.repo.split("/").pop().toLowerCase());
      const box = document.getElementById("repo-fact");
      if (r && box) box.querySelector("small").textContent = [r.language, r.stars ? `${r.stars} star${r.stars > 1 ? "s" : ""}` : "", `updated ${dateFmt(r.pushed)}`].filter(Boolean).join(", ");
    });
  }

  /* ---------- router ---------- */
  let onHome = false;
  function route() {
    const hash = decodeURIComponent(location.hash.slice(1)) || "home";
    document.querySelectorAll("#nav a").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + hash || (hash.startsWith("project-") && a.getAttribute("href") === "#work")));
    if (hash.startsWith("project-")) { onHome = false; renderProject(hash.slice(8)); return; }
    if (onHome) { (hash === "home" ? document.body : document.getElementById(hash))?.scrollIntoView(); return; }
    onHome = true; renderHome(hash);
  }
  window.addEventListener("hashchange", route);
  route();
})();
