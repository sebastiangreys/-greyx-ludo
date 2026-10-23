/* GREYX LUDO — Buzón de ideas
   - Botón (bombilla dibujada en SVG) pegado al menú principal, arriba a la izquierda
   - Todos los jugadores con perfil pueden enviar ideas
   - El admin ve la bandeja: quién la envió, cuándo, y puede marcarla o borrarla
   Requiere greyx-admin.js (comparte estilos de ventana) y la regla /ideas en Firestore. */
(() => {
  "use strict";

  const G = () => window.GX;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  const TYPES = [["idea", "Idea"], ["mejora", "Mejora"], ["error", "Error"]];
  const TLABEL = { idea: "IDEA", mejora: "MEJORA", error: "ERROR" };
  const COOLDOWN = 60000;

  const v = { tab: "send", filter: "new", items: null, type: "idea",
              text: "", msg: "", ok: false, busy: false, del: null };
  let unread = 0;

  const BULB = (s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">
    <path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5 1 1.2 1 2V17h5.8v-.8c0-.8.4-1.5 1-2A6.5 6.5 0 0 0 12 2.5z" fill="currentColor"/>
    <rect x="9.2" y="18.2" width="5.6" height="1.8" rx=".9" fill="currentColor"/>
    <rect x="10.2" y="20.6" width="3.6" height="1.6" rx=".8" fill="currentColor"/></svg>`;

  /* ---------- Estilos ---------- */
  const st = document.createElement("style");
  st.textContent = `
  .gxi-row{width:100%;display:flex;justify-content:flex-start;margin:-32px 0 6px}
  .gxi-btn{position:relative;display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px 0 11px;
    border-radius:99px;border:1px solid #fbbf2477;background:linear-gradient(145deg,#232a66,#0d1030);color:#fde68a;
    font:800 .74rem Inter,system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;
    box-shadow:0 0 16px #fbbf2433,0 6px 14px #0008}
  .gxi-btn:active{transform:scale(.96)}
  .gxi-dot{min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:#ef4444;color:#fff;
    font:900 .66rem Inter,system-ui,sans-serif;display:none;place-items:center}
  #gxIdeas textarea{height:150px}
  .gxi-chips{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0 4px}
  .gxi-chips button{padding:11px 4px;border-radius:13px;border:1.5px solid #ffffff1c;background:#ffffff08;
    color:#c7cde0;font:800 .78rem Inter,system-ui,sans-serif}
  .gxi-chips button.on{border-color:#fbbf24;background:#fbbf2420;color:#fff}
  .gxi-count{text-align:right;color:#8e97aa;font-size:.7rem;margin:6px 2px 12px}
  .gxi-item{padding:14px;border-radius:18px;margin-bottom:10px;border:1px solid #ffffff1c;
    background:linear-gradient(160deg,#242b58,#0f132b);box-shadow:0 10px 24px #0007}
  .gxi-item.new{border-color:#fbbf2477}
  .gxi-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .gxi-who{flex:1;min-width:0}
  .gxi-who b{display:block;font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gxi-who small{color:#8e97aa;font-size:.66rem}
  .gxi-tag{padding:3px 8px;border-radius:99px;font:900 .58rem Inter,system-ui,sans-serif;letter-spacing:.08em;
    background:#ffffff14;color:#cbd5e1}
  .gxi-tag.t-idea{background:#fbbf2426;color:#fde68a}
  .gxi-tag.t-mejora{background:#3b82f626;color:#93c5fd}
  .gxi-tag.t-error{background:#ef444426;color:#fca5a5}
  .gxi-tag.s-new{background:#8b5cf6;color:#fff}
  .gxi-text{white-space:pre-wrap;word-break:break-word;font-size:.88rem;line-height:1.45;color:#e8ebf7;margin:0 0 12px}
  .gxi-act{display:flex;gap:6px}
  .gxi-act button{flex:1;padding:10px 4px;border-radius:12px;border:1px solid #ffffff1f;background:#ffffff0c;
    color:#fff;font:800 .74rem Inter,system-ui,sans-serif}
  .gxi-act button.dn{border-color:#ef444477;color:#fca5a5}
  .gxi-act button.dn.sure{background:#ef4444;color:#fff}
  `;
  document.head.appendChild(st);

  /* ---------- Botón dentro del menú (parte del widget) ---------- */
  function updateDot() {
    const dot = $(".gxi-dot");
    if (!dot) return;
    const admin = !!(G() && G().state.isOwner);
    dot.style.display = admin && unread > 0 ? "grid" : "none";
    dot.textContent = unread > 99 ? "99+" : unread;
  }

  function mountRow() {
    const inner = $(".gx6.on .gx6-in");
    if (!inner || inner.querySelector(".gxi-row")) return;
    const row = document.createElement("div");
    row.className = "gxi-row";
    row.innerHTML = `<button type="button" class="gxi-btn" aria-label="Buzón de ideas">${BULB(18)}<span>Buzón de ideas</span><span class="gxi-dot"></span></button>`;
    inner.insertBefore(row, inner.firstChild);
    $(".gxi-btn", row).addEventListener("click", openSheet);
    updateDot();
  }

  function syncFab() {
    mountRow();
    updateDot();
  }

  // El menú principal se redibuja solo: se vuelve a poner la fila al instante
  function watch() {
    const box = $(".gx6");
    if (box && !box._gxi) {
      box._gxi = true;
      new MutationObserver(syncFab).observe(box, { childList: true });
    }
  }
  setInterval(() => { watch(); syncFab(); }, 400);

  /* ---------- Ventana ---------- */
  function openSheet() {
    if ($("#gxIdeas")) return;
    const g = G();
    const admin = !!(g && g.state.isOwner);
    Object.assign(v, { tab: admin && unread > 0 ? "inbox" : "send", filter: "new",
                       items: null, msg: "", ok: false, busy: false, del: null });
    const el = document.createElement("div");
    el.id = "gxIdeas";
    el.className = "gxa";
    el.addEventListener("click", onClick);
    el.addEventListener("input", e => {
      if (e.target.id === "gxiT") {
        v.text = e.target.value;
        const c = $("#gxiC", el);
        if (c) c.textContent = v.text.length + " / 500";
      }
    });
    document.body.appendChild(el);
    if (v.tab === "inbox") loadInbox(); else draw();
  }

  function closeSheet() { const el = $("#gxIdeas"); if (el) el.remove(); }
  function grab() { const t = $("#gxiT"); if (t) v.text = t.value; }
  function say(msg, ok) { v.msg = msg; v.ok = !!ok; draw(); }

  const fmt = ts => { try { return ts.toDate().toLocaleString(); } catch (e) { return "—"; } };

  function sendHtml() {
    return `
      <div class="gxa-card">
        <h3>Cuéntanos tu idea</h3>
        <p>Ayúdanos a mejorar Ludo Greyx. Lo leemos todo.</p>
        <div class="gxi-chips">
          ${TYPES.map(([k, n]) => `<button type="button" data-i="type" data-v="${k}" class="${v.type === k ? "on" : ""}">${n}</button>`).join("")}
        </div>
        <textarea id="gxiT" maxlength="500" placeholder="Escribe aquí tu idea…">${esc(v.text)}</textarea>
        <div class="gxi-count" id="gxiC">${v.text.length} / 500</div>
        <button class="gxa-btn" data-i="send" type="button" ${v.busy ? "disabled" : ""}>${v.busy ? "Enviando…" : "Enviar idea"}</button>
      </div>`;
  }

  function inboxHtml() {
    if (v.items === null) return `<div class="gxa-card"><p style="margin:0">Cargando…</p></div>`;
    const newN = v.items.filter(i => !i.status).length;
    const list = v.filter === "new" ? v.items.filter(i => !i.status) : v.items;
    const tabs = `
      <div class="gxa-tabs">
        <button class="gxa-tab ${v.filter === "new" ? "on" : ""}" data-i="filter" data-v="new" type="button">Nuevas (${newN})</button>
        <button class="gxa-tab ${v.filter === "all" ? "on" : ""}" data-i="filter" data-v="all" type="button">Todas (${v.items.length})</button>
      </div>`;
    if (!list.length) {
      return tabs + `<div class="gxa-card"><p style="margin:0">${v.filter === "new" ? "No hay ideas nuevas." : "Aún no hay ideas."}</p></div>`;
    }
    return tabs + list.map(i => {
      const sure = v.del === i.id;
      return `
      <div class="gxi-item ${i.status ? "" : "new"}">
        <div class="gxi-head">
          <div class="gxi-who">
            <b>@${esc(i.username || "jugador")}</b>
            <small>${esc(fmt(i.createdAt))} · ${esc(String(i.uid || "").slice(0, 8))}…</small>
          </div>
          <span class="gxi-tag t-${esc(i.type || "idea")}">${esc(TLABEL[i.type] || "IDEA")}</span>
          ${i.status ? `<span class="gxi-tag">${i.status === "done" ? "HECHA" : "LEÍDA"}</span>` : `<span class="gxi-tag s-new">NUEVA</span>`}
        </div>
        <p class="gxi-text">${esc(i.text)}</p>
        <div class="gxi-act">
          ${i.status === "read" ? "" : `<button type="button" data-i="mark" data-id="${esc(i.id)}" data-v="read">Leída</button>`}
          ${i.status === "done" ? "" : `<button type="button" data-i="mark" data-id="${esc(i.id)}" data-v="done">Hecha</button>`}
          <button type="button" class="dn ${sure ? "sure" : ""}" data-i="del" data-id="${esc(i.id)}">${sure ? "¿Seguro?" : "Borrar"}</button>
        </div>
      </div>`;
    }).join("");
  }

  function draw() {
    const el = $("#gxIdeas");
    if (!el) return;
    const admin = !!(G() && G().state.isOwner);
    const tabs = admin ? `
      <div class="gxa-tabs">
        <button class="gxa-tab ${v.tab === "inbox" ? "on" : ""}" data-i="tab" data-v="inbox" type="button">Bandeja${unread ? " (" + unread + ")" : ""}</button>
        <button class="gxa-tab ${v.tab === "send" ? "on" : ""}" data-i="tab" data-v="send" type="button">Enviar idea</button>
      </div>` : "";
    el.innerHTML = `
      <div class="gxa-in">
        <div class="gxa-top">
          <button class="gxa-back" data-i="close" type="button" aria-label="Volver">←</button>
          <div class="gxa-title">${BULB(22)}<strong>Buzón de ideas</strong></div>
          <span class="gxa-sp"></span>
        </div>
        ${tabs}
        ${v.msg ? `<p class="gxa-msg ${v.ok ? "ok" : "err"}">${esc(v.msg)}</p>` : ""}
        ${admin && v.tab === "inbox" ? inboxHtml() : sendHtml()}
      </div>`;
  }

  async function onClick(e) {
    const b = e.target.closest("[data-i]");
    if (!b) return;
    const a = b.dataset.i;
    grab();

    if (a === "close") return closeSheet();
    if (a === "tab") { v.tab = b.dataset.v; v.msg = ""; v.del = null; return v.tab === "inbox" ? loadInbox() : draw(); }
    if (a === "type") { v.type = b.dataset.v; return draw(); }
    if (a === "filter") { v.filter = b.dataset.v; v.del = null; return draw(); }
    if (a === "send") return send();
    if (a === "mark") return mark(b.dataset.id, b.dataset.v);
    if (a === "del") return remove(b.dataset.id);
  }

  /* ---------- Enviar ---------- */
  async function send() {
    const g = G();
    if (!g || !g.state.user || !g.state.profile || !g.fb || !g.fb.db) {
      return say("Inicia sesión y crea tu perfil para enviar ideas.", false);
    }
    const text = v.text.trim();
    if (text.length < 5) return say("Escribe al menos 5 caracteres.", false);

    let last = 0;
    try { last = Number(localStorage.getItem("gx-idea-t") || 0); } catch (e) {}
    if (Date.now() - last < COOLDOWN) return say("Espera un minuto antes de enviar otra idea.", false);

    v.busy = true; v.msg = ""; draw();
    try {
      const fs = await g.fsModule();
      await fs.addDoc(fs.collection(g.fb.db, "ideas"), {
        uid: g.state.user.uid,
        username: g.state.profile.username,
        type: v.type,
        text,
        createdAt: fs.serverTimestamp()
      });
      try { localStorage.setItem("gx-idea-t", String(Date.now())); } catch (e) {}
      v.text = ""; v.busy = false;
      say("¡Gracias! Tu idea fue enviada.", true);
    } catch (err) {
      console.warn("idea", err);
      v.busy = false;
      say(err.code === "permission-denied"
        ? "No se pudo enviar. Revisa que tengas tu perfil creado y que tu cuenta no esté sancionada."
        : "No se pudo enviar (" + (err.code || "error") + ").", false);
    }
  }

  /* ---------- Bandeja del admin ---------- */
  async function fetchItems() {
    const g = G(), fs = await g.fsModule();
    const q = fs.query(fs.collection(g.fb.db, "ideas"), fs.orderBy("createdAt", "desc"), fs.limit(100));
    const sn = await fs.getDocs(q);
    const items = sn.docs.map(d => Object.assign({ id: d.id }, d.data()));
    unread = items.filter(i => !i.status).length;
    return items;
  }

  async function loadInbox() {
    v.items = null; draw();
    try { v.items = await fetchItems(); }
    catch (e) { console.warn(e); v.items = []; v.msg = "No se pudo cargar la bandeja (" + (e.code || "error") + ")."; v.ok = false; }
    draw(); syncFab();
  }

  async function mark(id, status) {
    try {
      const g = G(), fs = await g.fsModule();
      await fs.updateDoc(fs.doc(g.fb.db, "ideas", id), { status });
      const it = v.items.find(i => i.id === id);
      if (it) it.status = status;
      unread = v.items.filter(i => !i.status).length;
      v.msg = ""; draw(); syncFab();
    } catch (e) { console.warn(e); say("No se pudo actualizar (" + (e.code || "error") + ").", false); }
  }

  async function remove(id) {
    if (v.del !== id) { v.del = id; return draw(); }
    try {
      const g = G(), fs = await g.fsModule();
      await fs.deleteDoc(fs.doc(g.fb.db, "ideas", id));
      v.items = v.items.filter(i => i.id !== id);
      unread = v.items.filter(i => !i.status).length;
      v.del = null; v.msg = ""; draw(); syncFab();
    } catch (e) { console.warn(e); v.del = null; say("No se pudo borrar (" + (e.code || "error") + ").", false); }
  }

  /* Aviso de ideas nuevas para el admin */
  async function poll() {
    const g = G();
    if (!g || !g.state.isOwner || !g.fb || !g.fb.db || $("#gxIdeas")) return;
    try { await fetchItems(); syncFab(); } catch (e) {}
  }
  setTimeout(poll, 4000);
  setInterval(poll, 90000);
})();
