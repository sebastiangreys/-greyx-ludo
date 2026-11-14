/* GREYX LUDO — Buzón de ideas v2
   - Ventana propia (💡): lista pública de ideas, ME GUSTA, filtros TODAS / POPULARES / NUEVAS,
     y formulario con título + descripción.
   - El admin (state.isOwner) conserva Leída / Hecha / Borrar y el aviso de ideas sin revisar.
   - Firestore: ideas/{id}            (ya existía; ahora con campo "title")
                ideaLikes/{idea_uid}  { idea, from, at }
                ideaLikeCounts/{idea} { n }
     Requiere reglas nuevas (ver nota de entrega). Sin ellas, el feed y los likes muestran un aviso.
   - API: window.GXIdeas.open()  ·  window.GXIdeas.unread() */
(() => {
  "use strict";

  const G = () => window.GX;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COOLDOWN = 60000, WEEK = 7 * 86400000;

  const v = { tab: "feed", filter: "all", items: null, title: "", text: "", msg: "", ok: false,
              busy: false, loading: false, err: "", likeBusy: new Set() };
  let unread = 0;

  const BULB = (s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">
    <path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5 1 1.2 1 2V17h5.8v-.8c0-.8.4-1.5 1-2A6.5 6.5 0 0 0 12 2.5z" fill="currentColor"/>
    <rect x="9.2" y="18.2" width="5.6" height="1.8" rx=".9" fill="currentColor"/>
    <rect x="10.2" y="20.6" width="3.6" height="1.6" rx=".8" fill="currentColor"/></svg>`;
  const HEART = on => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.800-8 11-8 11z" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

  const st = document.createElement("style");
  st.textContent = `
  .gxi2{position:fixed;inset:0;z-index:1150;color:#f1f3ff;overflow:hidden;display:flex;flex-direction:column;font-family:Inter,system-ui,-apple-system,sans-serif;
    background:radial-gradient(circle at 50% 0,#4c1d9577,transparent 52%),linear-gradient(180deg,#0b0c2e,#05060f);
    padding:calc(12px + env(safe-area-inset-top,0px)) 14px calc(14px + env(safe-area-inset-bottom,0px));animation:gxiIn .3s cubic-bezier(.2,.8,.2,1) both}
  @keyframes gxiIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
  .gxi2 button,.gxi2 input,.gxi2 textarea{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
  .gxi2 button{cursor:pointer}
  .gxi-in{flex:1;min-height:0;width:100%;max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
  .gxi-top{flex:none;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;gap:8px}
  .gxi-ib{width:42px;height:42px;display:grid;place-items:center;padding:0;border-radius:14px;border:1px solid #ffffff22;background:linear-gradient(145deg,#1e1b4bcc,#0f172acc);box-shadow:0 6px 16px #0006}
  .gxi-ib svg{width:20px;height:20px}
  .gxi-ttl{display:flex;align-items:center;justify-content:center;gap:8px;font-weight:900;font-size:1.2rem}
  .gxi-ttl svg{color:#fbbf24;filter:drop-shadow(0 0 6px #fbbf24)}
  .gxi-seg{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:4px;border-radius:16px;background:#070a24;border:1px solid #ffffff14}
  .gxi-seg button{height:38px;border:0;border-radius:12px;background:transparent;color:#9aa6d8;font-weight:800;font-size:.8rem}
  .gxi-seg button.on{color:#fff;background:linear-gradient(135deg,#7c5cff,#4f2fd8);box-shadow:0 0 14px #7c5cff66,inset 0 1px 0 #ffffff44}
  .gxi-filters{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
  .gxi-filters button{height:36px;border-radius:12px;border:1.5px solid #ffffff1c;background:#ffffff08;color:#c7cde0;font-weight:900;font-size:.7rem;letter-spacing:.08em}
  .gxi-filters button.on{border-color:#fbbf24;background:#fbbf2420;color:#fff}
  .gxi-scroll{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding-right:2px}
  .gxi-msg{flex:none;margin:0;padding:10px 12px;border-radius:12px;font-size:.8rem;font-weight:700}
  .gxi-msg.ok{background:#22c55e22;color:#86efac;border:1px solid #22c55e55}
  .gxi-msg.err{background:#ef444422;color:#fca5a5;border:1px solid #ef444455}
  .gxi-card{padding:14px;border-radius:18px;margin-bottom:10px;border:1px solid #ffffff1c;background:linear-gradient(160deg,#1c2250dd,#0c1030dd);box-shadow:0 10px 24px #0007}
  .gxi-card.fresh{border-color:#fbbf2477}
  .gxi-meta{display:flex;align-items:center;gap:8px;margin-bottom:6px;color:#8e97aa;font-size:.68rem;font-weight:700}
  .gxi-meta b{color:#c7cde0;font-size:.74rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gxi-tag{padding:2px 8px;border-radius:99px;font:900 .56rem Inter,system-ui,sans-serif;letter-spacing:.08em;background:#8b5cf6;color:#fff}
  .gxi-tag.s{background:#ffffff14;color:#cbd5e1}
  .gxi-card h4{margin:0 0 5px;font-size:.98rem;font-weight:900}
  .gxi-card p{margin:0 0 12px;white-space:pre-wrap;word-break:break-word;font-size:.84rem;line-height:1.45;color:#e2e6f7}
  .gxi-foot{display:flex;align-items:center;gap:8px}
  .gxi-like{display:flex;align-items:center;gap:7px;height:38px;padding:0 14px;border-radius:99px;border:1.5px solid #fb718566;background:#ffffff0c;color:#fecdd3;font-weight:900;font-size:.82rem}
  .gxi-like.on{background:linear-gradient(135deg,#fb7185,#e11d48);color:#fff;border-color:#fecdd3}
  .gxi-like:disabled{opacity:.55}
  .gxi-adm{margin-left:auto;display:flex;gap:6px}
  .gxi-adm button{height:34px;padding:0 10px;border-radius:10px;border:1px solid #ffffff22;background:#ffffff0c;font-weight:800;font-size:.68rem}
  .gxi-adm .dn{border-color:#ef444477;color:#fca5a5}
  .gxi-empty{padding:40px 16px;text-align:center;color:#94a3b8;font-size:.86rem;line-height:1.5}
  .gxi-form{padding:16px;border-radius:20px;border:1px solid #ffffff1c;background:linear-gradient(160deg,#1c2250dd,#0c1030dd)}
  .gxi-form h3{margin:0 0 4px;font-size:1.05rem;font-weight:900}
  .gxi-form>p{margin:0 0 14px;color:#94a3b8;font-size:.8rem}
  .gxi-form label{display:block;margin:12px 0 6px;color:#9aa4d6;font:800 .6rem Inter,system-ui,sans-serif;letter-spacing:.14em}
  .gxi-form input,.gxi-form textarea{width:100%;padding:13px;border-radius:14px;border:1.5px solid #ffffff1a;background:#0a0d1acc;outline:0;font-size:16px;font-weight:600}
  .gxi-form input:focus,.gxi-form textarea:focus{border-color:#a78bfa}
  .gxi-form textarea{height:140px;resize:none}
  .gxi-cnt{text-align:right;color:#8e97aa;font-size:.68rem;margin:5px 2px 14px}
  .gxi-pub{width:100%;min-height:52px;border:0;border-radius:16px;color:#3a2200;font:900 .95rem Inter,system-ui,sans-serif;background:linear-gradient(135deg,#fde68a,#f59e0b);box-shadow:0 5px 0 #92600a}
  .gxi-pub:active{transform:translateY(3px)}
  .gxi-pub:disabled{opacity:.55;transform:none}
  `;
  document.head.appendChild(st);

  const isAdmin = () => !!(G() && G().state.isOwner);
  const fmt = ts => { try { return ts.toDate().toLocaleDateString("es", { day: "numeric", month: "short" }); } catch (e) { return ""; } };
  const ms = ts => { try { return ts.toMillis(); } catch (e) { return 0; } };

  function open() {
    if ($("#gxIdeas")) return;
    const g = G();
    if (g && !g.state.user) { g.state.showAuth = true; g.state.authMode = "login"; g.render(); return; }
    Object.assign(v, { tab: "feed", filter: "all", msg: "", ok: false, busy: false });
    const el = document.createElement("div");
    el.id = "gxIdeas"; el.className = "gxi2";
    el.addEventListener("click", onClick);
    el.addEventListener("input", e => {
      if (e.target.id === "gxiTitle") v.title = e.target.value;
      if (e.target.id === "gxiText") { v.text = e.target.value; const c = $("#gxiC", el); if (c) c.textContent = v.text.length + " / 500"; }
    });
    document.body.appendChild(el);
    draw(); load();
  }
  const close = () => { const el = $("#gxIdeas"); if (el) el.remove(); };
  const grab = () => { const a = $("#gxiTitle"), b = $("#gxiText"); if (a) v.title = a.value; if (b) v.text = b.value; };

  function visible() {
    const all = (v.items || []).slice();
    if (v.filter === "pop") return all.sort((a, b) => (b.n - a.n) || (b.t - a.t));
    if (v.filter === "new") return all.filter(i => Date.now() - i.t < WEEK).sort((a, b) => b.t - a.t);
    return all.sort((a, b) => b.t - a.t);
  }

  function cardHtml(i) {
    const adm = isAdmin();
    const title = i.title || String(i.text || "").slice(0, 40);
    return `<article class="gxi-card ${i.status ? "" : "fresh"}">
      <div class="gxi-meta"><b>@${esc(i.username || "jugador")}</b><span>${esc(fmt(i.createdAt))}</span>
        ${adm ? (i.status ? `<span class="gxi-tag s">${i.status === "done" ? "HECHA" : "LEÍDA"}</span>` : `<span class="gxi-tag">NUEVA</span>`) : ""}</div>
      <h4>${esc(title)}</h4>
      <p>${esc(i.text)}</p>
      <div class="gxi-foot">
        <button type="button" class="gxi-like ${i.mine ? "on" : ""}" data-i="like" data-id="${esc(i.id)}" ${v.likeBusy.has(i.id) ? "disabled" : ""}
          aria-label="Me gusta">${HEART(i.mine)}<span>${i.n}</span></button>
        ${adm ? `<div class="gxi-adm">
          ${i.status === "read" ? "" : `<button type="button" data-i="mark" data-id="${esc(i.id)}" data-v="read">Leída</button>`}
          ${i.status === "done" ? "" : `<button type="button" data-i="mark" data-id="${esc(i.id)}" data-v="done">Hecha</button>`}
          <button type="button" class="dn" data-i="del" data-id="${esc(i.id)}">Borrar</button></div>` : ""}
      </div></article>`;
  }

  function feedHtml() {
    const F = [["all", "TODAS"], ["pop", "POPULARES"], ["new", "NUEVAS"]];
    const filters = `<div class="gxi-filters">${F.map(([k, n]) => `<button type="button" data-i="filter" data-v="${k}" class="${v.filter === k ? "on" : ""}">${n}</button>`).join("")}</div>`;
    let body;
    if (v.loading && !v.items) body = `<div class="gxi-empty">Cargando…</div>`;
    else if (v.err) body = `<div class="gxi-empty">${esc(v.err)}</div>`;
    else {
      const list = visible();
      body = list.length ? list.map(cardHtml).join("")
        : `<div class="gxi-empty">${v.filter === "new" ? "No hay ideas de los últimos 7 días." : v.filter === "pop" ? "Aún no hay ideas con likes." : "Todavía no hay ideas. ¡Sé el primero!"}</div>`;
    }
    return filters + `<div class="gxi-scroll">${body}</div>`;
  }

  function formHtml() {
    return `<div class="gxi-scroll"><div class="gxi-form">
      <h3>Cuéntanos tu idea</h3><p>Se publica para que otros jugadores puedan darle ME GUSTA.</p>
      <label for="gxiTitle">TÍTULO</label>
      <input id="gxiTitle" type="text" maxlength="60" placeholder="Ej: Nuevos tableros" autocomplete="off" value="${esc(v.title)}">
      <label for="gxiText">DESCRIPCIÓN</label>
      <textarea id="gxiText" maxlength="500" placeholder="Explica tu idea…">${esc(v.text)}</textarea>
      <div class="gxi-cnt" id="gxiC">${v.text.length} / 500</div>
      <button class="gxi-pub" type="button" data-i="send" ${v.busy ? "disabled" : ""}>${v.busy ? "Publicando…" : "PUBLICAR IDEA"}</button>
    </div></div>`;
  }

  function draw() {
    const el = $("#gxIdeas"); if (!el) return;
    const y = (el.querySelector(".gxi-scroll") || {}).scrollTop || 0;
    el.innerHTML = `<div class="gxi-in">
      <div class="gxi-top"><button class="gxi-ib" data-i="close" type="button" aria-label="Volver"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <div class="gxi-ttl">${BULB(22)}<span>Buzón de ideas</span></div><span></span></div>
      <div class="gxi-seg">
        <button type="button" data-i="tab" data-v="feed" class="${v.tab === "feed" ? "on" : ""}">Ideas</button>
        <button type="button" data-i="tab" data-v="send" class="${v.tab === "send" ? "on" : ""}">Enviar idea</button></div>
      ${v.msg ? `<p class="gxi-msg ${v.ok ? "ok" : "err"}">${esc(v.msg)}</p>` : ""}
      ${v.tab === "feed" ? feedHtml() : formHtml()}
    </div>`;
    const s = el.querySelector(".gxi-scroll"); if (s) s.scrollTop = y;
  }

  async function onClick(e) {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const a = b.dataset.i; grab();
    if (a === "close") return close();
    if (a === "tab") { v.tab = b.dataset.v; v.msg = ""; draw(); if (v.tab === "feed" && !v.items) load(); return; }
    if (a === "filter") { v.filter = b.dataset.v; return draw(); }
    if (a === "send") return send();
    if (a === "like") return like(b.dataset.id);
    if (a === "mark") return mark(b.dataset.id, b.dataset.v);
    if (a === "del") return remove(b.dataset.id);
  }

  async function fetchItems() {
    const g = G(), fs = await g.fsModule(), db = g.fb.db, me = g.state.user.uid;
    const [a, c, m] = await Promise.all([
      fs.getDocs(fs.query(fs.collection(db, "ideas"), fs.orderBy("createdAt", "desc"), fs.limit(100))),
      fs.getDocs(fs.query(fs.collection(db, "ideaLikeCounts"), fs.limit(500))).catch(() => null),
      fs.getDocs(fs.query(fs.collection(db, "ideaLikes"), fs.where("from", "==", me), fs.limit(500))).catch(() => null)
    ]);
    const counts = new Map(); if (c) c.docs.forEach(d => counts.set(d.id, d.data().n || 0));
    const mine = new Set(); if (m) m.docs.forEach(d => mine.add(d.data().idea));
    const items = a.docs.map(d => {
      const x = Object.assign({ id: d.id }, d.data());
      x.n = counts.get(d.id) || 0; x.mine = mine.has(d.id); x.t = ms(x.createdAt) || Date.now();
      return x;
    });
    unread = isAdmin() ? items.filter(i => !i.status).length : 0;
    return items;
  }

  async function load() {
    const g = G();
    if (!g || !g.fb || !g.fb.db || !g.state.user) { v.err = "Inicia sesión para ver las ideas."; return draw(); }
    v.loading = true; v.err = ""; draw();
    try { v.items = await fetchItems(); }
    catch (e) {
      console.warn("ideas", e);
      v.items = [];
      v.err = e.code === "permission-denied"
        ? "No se pudieron leer las ideas. Falta publicar las reglas de Firestore para el buzón."
        : "No se pudo cargar (" + (e.code || "error") + ").";
    }
    v.loading = false; draw();
  }

  async function send() {
    const g = G();
    if (!g || !g.state.user || !g.state.profile || !g.fb || !g.fb.db) { v.msg = "Inicia sesión y crea tu perfil para enviar ideas."; v.ok = false; return draw(); }
    const title = v.title.trim(), text = v.text.trim();
    if (title.length < 3) { v.msg = "Escribe un título (mínimo 3 caracteres)."; v.ok = false; return draw(); }
    if (text.length < 5) { v.msg = "Escribe una descripción (mínimo 5 caracteres)."; v.ok = false; return draw(); }
    let last = 0; try { last = Number(localStorage.getItem("gx-idea-t") || 0); } catch (e) {}
    if (Date.now() - last < COOLDOWN) { v.msg = "Espera un minuto antes de enviar otra idea."; v.ok = false; return draw(); }
    v.busy = true; v.msg = ""; draw();
    try {
      const fs = await g.fsModule();
      await fs.addDoc(fs.collection(g.fb.db, "ideas"), {
        uid: g.state.user.uid, username: g.state.profile.username,
        type: "idea", title, text, createdAt: fs.serverTimestamp()
      });
      try { localStorage.setItem("gx-idea-t", String(Date.now())); } catch (e) {}
      Object.assign(v, { title: "", text: "", busy: false, tab: "feed", filter: "new", items: null, msg: "¡Gracias! Tu idea fue publicada.", ok: true });
      load();
    } catch (err) {
      console.warn("idea", err);
      v.busy = false; v.ok = false;
      v.msg = err.code === "permission-denied"
        ? "No se pudo publicar. Revisa tu perfil, tu cuenta y las reglas de Firestore (campo title)."
        : "No se pudo publicar (" + (err.code || "error") + ").";
      draw();
    }
  }

  async function like(id) {
    const g = G(); if (!g || !g.state.user || v.likeBusy.has(id)) return;
    const me = g.state.user.uid, it = (v.items || []).find(i => i.id === id); if (!it) return;
    v.likeBusy.add(id); draw();
    try {
      const fs = await g.fsModule(), db = g.fb.db;
      const lref = fs.doc(db, "ideaLikes", id + "_" + me), cref = fs.doc(db, "ideaLikeCounts", id);
      let liked = false, total = 0;
      await fs.runTransaction(db, async tx => {
        const l = await tx.get(lref), c = await tx.get(cref);
        const n = c.exists() ? (c.data().n || 0) : 0;
        if (l.exists()) { if (n < 1) throw new Error("count"); tx.delete(lref); tx.set(cref, { n: n - 1 }); liked = false; total = n - 1; }
        else { tx.set(lref, { idea: id, from: me, at: fs.serverTimestamp() }); tx.set(cref, { n: n + 1 }); liked = true; total = n + 1; }
      });
      it.mine = liked; it.n = total;
    } catch (e) {
      console.warn("idea like", e);
      v.msg = e.code === "permission-denied" ? "No se pudo dar ME GUSTA (faltan las reglas de Firestore)." : "No se pudo completar. Intenta de nuevo.";
      v.ok = false;
    }
    v.likeBusy.delete(id); draw();
  }

  async function mark(id, status) {
    try {
      const g = G(), fs = await g.fsModule();
      await fs.updateDoc(fs.doc(g.fb.db, "ideas", id), { status });
      const it = v.items.find(i => i.id === id); if (it) it.status = status;
      unread = v.items.filter(i => !i.status).length; v.msg = ""; draw();
    } catch (e) { console.warn(e); v.msg = "No se pudo actualizar (" + (e.code || "error") + ")."; v.ok = false; draw(); }
  }

  async function remove(id) {
    const ok = await (window.GXConfirm ? window.GXConfirm({ title: "Borrar idea", text: "¿Borrar esta idea? No se puede deshacer.", danger: true }) : Promise.resolve(true));
    if (!ok) return;
    try {
      const g = G(), fs = await g.fsModule();
      await fs.deleteDoc(fs.doc(g.fb.db, "ideas", id));
      v.items = v.items.filter(i => i.id !== id);
      unread = v.items.filter(i => !i.status).length; v.msg = ""; draw();
    } catch (e) { console.warn(e); v.msg = "No se pudo borrar (" + (e.code || "error") + ")."; v.ok = false; draw(); }
  }

  /* Aviso de ideas sin revisar (solo admin) */
  async function poll() {
    const g = G();
    if (!g || !isAdmin() || !g.fb || !g.fb.db || $("#gxIdeas")) return;
    try { const items = await fetchItems(); unread = items.filter(i => !i.status).length; } catch (e) {}
  }
  setTimeout(poll, 4000);
  setInterval(poll, 90000);

  window.GXIdeas = { open, unread: () => (isAdmin() ? unread : 0) };
})();
