/* GREYX LUDO — CORREO
   Cargar DESPUÉS de greyx-ideas.js:  <script src="greyx-correo.js"></script>

   Firestore:  users/{uid}/mail/{id}
   { type:"message"|"reward"|"sanction", title, body,
     reward:{xp,trophies}|null, read, claimed, ack, from:"admin", createdAt }

   - message / reward -> aparecen en la ventana de Correo.
   - sanction         -> NO aparece en el correo; sale como advertencia al iniciar sesión.
*/
(() => {
  const G = () => window.GX;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ENV = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 8l8 6 8-6"/></svg>`;
  const BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`;
  const ICON = { message: "✉️", reward: "🎁" };

  let mails = [], unsub = null, curUid = null, isAdmin = false;
  let overlay = null, view = "list", openId = null, tab = "inbox";
  let busy = false, note = "";
  const shownSanctions = new Set();

  /* ---------- CSS ---------- */
  const css = document.createElement("style");
  css.textContent = `
.gx-mailbtn{
  position:fixed;
  top:calc(16px + env(safe-area-inset-top, 0px));
  left:16px;
  z-index:1100;
  width:46px;
  height:46px;
  display:grid;
  place-items:center;
  border-radius:50%;
  color:#fff;
  background:linear-gradient(145deg,#232a66,#0d1030);
  border:1px solid #6d5cffaa;
  box-shadow:0 0 18px #4f46e577,0 6px 16px #000a;
  background:linear-gradient(145deg,#232a66,#0d1030);border:1px solid #6d5cffaa;box-shadow:0 0 18px #4f46e577,0 6px 16px #000a}
.gx-mailbtn svg{width:22px;height:22px}
.gx-mailbtn:active{transform:scale(.93)}
.gx-mailbadge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:99px;display:none;place-items:center;
  background:#ef4444;border:2px solid #0a0c24;color:#fff;font:900 .68rem Inter,system-ui,sans-serif;font-style:normal}
.gx-mailbadge.on{display:grid}

.gx-mail{position:fixed;inset:0;z-index:1200;color:#fff;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  padding:calc(14px + env(safe-area-inset-top,0px)) 16px calc(28px + env(safe-area-inset-bottom,0px));
  background:radial-gradient(circle at 50% 0,#4c1d9566,transparent 55%),linear-gradient(180deg,#0b0c2e,#05060f);
  font-family:Inter,system-ui,sans-serif;animation:gxMailIn .35s cubic-bezier(.2,.8,.2,1) both}
@keyframes gxMailIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
.gx-mail-in{max-width:520px;margin:0 auto}
.gx-mail-top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;margin-bottom:16px}
.gx-mail-top h2{margin:0;text-align:center;font-size:1.3rem;font-weight:900}
.gx-mail-back{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;border:1px solid #ffffff22;
  background:linear-gradient(145deg,#1e1b4bcc,#0f172acc);color:#fff;box-shadow:0 6px 16px #0006}
.gx-mail-back svg{width:20px;height:20px}
.gx-mail-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:5px;margin-bottom:14px;border-radius:16px;background:#0b1020cc;border:1px solid #ffffff12}
.gx-mail-tab{min-height:42px;border:0;border-radius:12px;background:transparent;color:#94a3b8;font:800 .85rem inherit}
.gx-mail-tab.on{color:#fff;background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 4px 0 #3b1d8f}
.gx-mail-list{display:grid;gap:9px}
.gx-mail-row{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border-radius:20px;border:1px solid #ffffff14;
  background:linear-gradient(160deg,#1c2250cc,#0e1226cc);color:#fff;text-align:left}
.gx-mail-row:active{transform:scale(.98)}
.gx-mail-row.unread{border-color:#8b5cf6aa;background:linear-gradient(160deg,#2a2370cc,#120f33cc)}
.gx-mail-ico{flex:0 0 44px;width:44px;height:44px;display:grid;place-items:center;border-radius:14px;font-size:1.3rem;
  background:linear-gradient(145deg,#8b5cf644,#ffffff0d);border:1px solid #ffffff14}
.gx-mail-txt{flex:1;min-width:0}
.gx-mail-txt strong{display:block;font-size:.92rem;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gx-mail-txt small{display:block;margin-top:3px;color:#94a3b8;font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gx-mail-side{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:5px;color:#64748b;font-size:.64rem;font-weight:700}
.gx-mail-dot{width:10px;height:10px;border-radius:50%;background:#8b5cf6;box-shadow:0 0 8px #8b5cf6}
.gx-mail-chip{padding:3px 8px;border-radius:99px;background:#fbbf2426;color:#fde68a;font-weight:800}
.gx-mail-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:56px 20px;text-align:center;color:#94a3b8}
.gx-mail-empty i{display:grid;place-items:center;width:84px;height:84px;margin-bottom:6px;border-radius:50%;font-size:2.4rem;font-style:normal;
  background:radial-gradient(circle at 35% 30%,#4c3fa8,#14172e);border:2px dashed #a78bfa88}
.gx-mail-empty strong{color:#fff;font-size:1rem}
.gx-mail-empty p{margin:0;font-size:.82rem}
.gx-mail-card{padding:20px 18px;border-radius:24px;border:1px solid #ffffff1a;background:linear-gradient(160deg,#242b58,#0f132b);box-shadow:0 18px 40px #0009}
.gx-mail-card h3{margin:0 0 4px;font-size:1.15rem;font-weight:900}
.gx-mail-card time{display:block;margin-bottom:14px;color:#94a3b8;font-size:.72rem}
.gx-mail-body{margin:0;color:#e2e8f0;font-size:.92rem;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.gx-mail-reward{margin-top:18px;padding:14px;border-radius:18px;text-align:center;border:1px solid #fbbf2466;background:linear-gradient(145deg,#fbbf2420,#ffffff08)}
.gx-mail-reward b{display:block;margin-bottom:10px;color:#fde68a;font-size:1.05rem}
.gx-mail-btn{width:100%;min-height:52px;border:0;border-radius:16px;color:#fff;font:900 .95rem inherit;
  background:linear-gradient(135deg,#a78bfa,#6d28d9);box-shadow:0 5px 0 #3b1d8f}
.gx-mail-btn.gold{color:#3a2200;background:linear-gradient(135deg,#fde68a,#f59e0b);box-shadow:0 5px 0 #92600a}
.gx-mail-btn:active{transform:translateY(3px)}
.gx-mail-btn:disabled{opacity:.55;transform:none}
.gx-mail-form{display:grid;gap:12px}
.gx-mail-form label{display:grid;gap:6px;color:#9aa3b8;font:700 .7rem Inter,system-ui,sans-serif}
.gx-mail-form input,.gx-mail-form select,.gx-mail-form textarea{width:100%;padding:14px;border-radius:14px;border:1.5px solid #ffffff1a;background:#0a0d1acc;
  color:#fff;font:600 16px inherit;outline:0}
.gx-mail-form textarea{min-height:110px;resize:vertical}
.gx-mail-form input:focus,.gx-mail-form select:focus,.gx-mail-form textarea:focus{border-color:#a78bfa}
.gx-mail-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.gx-mail-note{margin:0;padding:10px 12px;border-radius:12px;font-size:.8rem;background:#ffffff0d;color:#e2e8f0}
.gx-mail-note.err{background:#ef444422;color:#fca5a5}

.gx-warn{position:fixed;inset:0;z-index:1300;display:grid;place-items:center;padding:20px;background:rgba(5,6,12,.88)}
.gx-warn-card{width:min(360px,100%);padding:24px 20px 20px;border-radius:26px;text-align:center;color:#fff;font-family:Inter,system-ui,sans-serif;
  border:1.5px solid #f59e0bb0;background:linear-gradient(160deg,#3a2410,#120c08);box-shadow:0 30px 80px #000c,0 0 40px #f59e0b33;
  animation:gxWarn .3s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes gxWarn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
.gx-warn-ico{font-size:2.6rem;line-height:1;margin-bottom:8px}
.gx-warn-card h3{margin:0 0 4px;color:#fbbf24;font-size:1.1rem;font-weight:900}
.gx-warn-card h4{margin:10px 0 6px;font-size:.98rem}
.gx-warn-card p{margin:0 0 18px;color:#e7d9c4;font-size:.88rem;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.gx-toast2{position:fixed;left:50%;bottom:calc(40px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:1400;padding:11px 20px;
  border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 .85rem Inter,system-ui,sans-serif;box-shadow:0 10px 30px #000c}
`;
  document.head.appendChild(css);

  /* ---------- utilidades ---------- */
  const inbox = () => mails.filter(m => m.type !== "sanction");
  const unread = () => inbox().filter(m => !m.read).length;
  const fmt = m => {
    try { return m.createdAt && m.createdAt.toDate
      ? m.createdAt.toDate().toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : ""; }
    catch (e) { return ""; }
  };
  const toast = t => {
    const d = document.createElement("div");
    d.className = "gx-toast2"; d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2200);
  };
  const ctx = async () => ({ fb: G().fb, fs: await G().fsModule(), uid: G().state.user.uid });

  /* ---------- botón pegado al menú (junto al Buzón de ideas) ---------- */
  

  function ensureButton() {
    const host = document.querySelector(".gx6.on .gx6-in");
    if (!host) return;

    let b = document.querySelector(".gx-mailbtn");

    if (!b) {
      b = document.createElement("button");
      b.className = "gx-mailbtn";
      b.type = "button";
      b.setAttribute("aria-label", "Correo");
      b.setAttribute("title", "Correo");
      b.innerHTML = ENV + `<i class="gx-mailbadge"></i>`;
      b.addEventListener("click", openMail);
    }

    // Mantener un solo botón y colocarlo en la capa principal.
    if (b.parentElement !== document.body) {
      document.body.appendChild(b);
    }

    // Posición fija en la esquina superior izquierda.
    b.style.position = "fixed";
    b.style.top = "calc(16px + env(safe-area-inset-top, 0px))";
    b.style.left = "16px";
    b.style.right = "auto";
    b.style.bottom = "auto";
    b.style.zIndex = "1100";

    updateBadge();
  }

  function updateBadge() {
    const n = unread(), el = document.querySelector(".gx-mailbadge");
    if (!el) return;
    el.textContent = n > 9 ? "9+" : n;
    el.classList.toggle("on", n > 0);
  }

  /* ---------- ventana de correo (pantalla completa) ---------- */
  function openMail() {
    const st = G().state;
    if (!st.user) {
      st.showAuth = true; st.authMode = "login"; G().render();
      return;
    }
    view = "list"; openId = null; tab = "inbox"; note = "";
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "gx-mail";
      document.body.appendChild(overlay);
    }
    draw();
  }

  function closeMail() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function top(title, backTo) {
    return `<div class="gx-mail-top">
      <button class="gx-mail-back" data-m="${backTo}" type="button" aria-label="Volver">${BACK}</button>
      <h2>${esc(title)}</h2><span></span></div>`;
  }

  function draw() {
    if (!overlay) return;
    let html = "";

    if (view === "detail") {
      const m = mails.find(x => x.id === openId);
      if (!m) { view = "list"; return draw(); }
      const r = m.reward || {};
      const parts = [];
      if (r.xp) parts.push("+" + r.xp + " XP");
      if (r.trophies) parts.push("🏆 +" + r.trophies);
      html = top("Correo", "back") + `
        <article class="gx-mail-card">
          <h3>${ICON[m.type] || "✉️"} ${esc(m.title || "Mensaje")}</h3>
          <time>${esc(fmt(m))} · De: Greyx</time>
          <p class="gx-mail-body">${esc(m.body || "")}</p>
          ${m.type === "reward" && parts.length ? `
            <div class="gx-mail-reward"><b>🎁 ${esc(parts.join("  ·  "))}</b>
              <button class="gx-mail-btn gold" data-m="claim" type="button" ${m.claimed || busy ? "disabled" : ""}>
                ${m.claimed ? "Recompensa reclamada ✓" : "Reclamar recompensa"}</button>
            </div>` : ""}
          ${note ? `<p class="gx-mail-note" style="margin-top:12px">${esc(note)}</p>` : ""}
        </article>`;
    } else {
      const tabs = isAdmin ? `<div class="gx-mail-tabs">
        <button class="gx-mail-tab ${tab === "inbox" ? "on" : ""}" data-m="tab-inbox" type="button">Bandeja</button>
        <button class="gx-mail-tab ${tab === "send" ? "on" : ""}" data-m="tab-send" type="button">Enviar</button></div>` : "";

      if (tab === "send" && isAdmin) {
        html = top("Correo", "close") + tabs + `
        <div class="gx-mail-form">
          <label>Usuario (sin @)<input id="gxm-to" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="nombre_de_usuario"></label>
          <label>Tipo<select id="gxm-type">
            <option value="message">✉️ Mensaje</option>
            <option value="reward">🎁 Recompensa</option>
            <option value="sanction">⚠️ Sanción (advertencia al iniciar sesión)</option></select></label>
          <label>Título<input id="gxm-title" maxlength="60" placeholder="Título"></label>
          <label>Mensaje<textarea id="gxm-body" maxlength="600" placeholder="Escribe el mensaje"></textarea></label>
          <div class="gx-mail-pair" id="gxm-rw" style="display:none">
            <label>XP<input id="gxm-xp" type="number" inputmode="numeric" min="0" value="0"></label>
            <label>Trofeos<input id="gxm-tr" type="number" inputmode="numeric" min="0" value="0"></label>
          </div>
          ${note ? `<p class="gx-mail-note ${/^✓/.test(note) ? "" : "err"}">${esc(note)}</p>` : ""}
          <button class="gx-mail-btn" data-m="send" type="button" ${busy ? "disabled" : ""}>${busy ? "Enviando…" : "Enviar"}</button>
        </div>`;
      } else {
        const rows = inbox().map(m => `
          <button class="gx-mail-row ${m.read ? "" : "unread"}" data-m="open" data-id="${esc(m.id)}" type="button">
            <span class="gx-mail-ico">${ICON[m.type] || "✉️"}</span>
            <span class="gx-mail-txt"><strong>${esc(m.title || "Mensaje")}</strong><small>${esc((m.body || "").replace(/\s+/g, " "))}</small></span>
            <span class="gx-mail-side">${m.read ? "" : `<i class="gx-mail-dot"></i>`}
              ${m.type === "reward" && !m.claimed ? `<span class="gx-mail-chip">Sin reclamar</span>` : ""}${esc(fmt(m))}</span>
          </button>`).join("");
        html = top("Correo", "close") + tabs + (rows
          ? `<div class="gx-mail-list">${rows}</div>`
          : `<div class="gx-mail-empty"><i>📭</i><strong>Tu correo está vacío</strong><p>Aquí llegarán los mensajes y recompensas del equipo.</p></div>`);
      }
    }

    const y = overlay.scrollTop;
    overlay.innerHTML = `<div class="gx-mail-in">${html}</div>`;
    overlay.scrollTop = view === "detail" ? 0 : y;
  }

  /* ---------- acciones ---------- */
  async function markRead(m) {
    if (m.read) return;
    try {
      const { fb, fs, uid } = await ctx();
      await fs.updateDoc(fs.doc(fb.db, "users", uid, "mail", m.id), { read: true });
    } catch (e) { console.warn("markRead", e); }
  }

    async function claim(m) {
    if (busy || m.claimed) return;
    busy = true; note = ""; draw();
    try {
      const { fb, fs, uid } = await ctx();
      const p = G().state.profile;
      if (!p) throw new Error("noprofile");
      let newXP = 0, newTr = 0;
      await fs.runTransaction(fb.db, async tx => {
        const mref = fs.doc(fb.db, "users", uid, "mail", m.id);
        const sref = fs.doc(fb.db, "stats", uid);
        const pref = fs.doc(fb.db, "publicProfiles", uid);
        const ms = await tx.get(mref);
        const ss = await tx.get(sref);
        if (!ms.exists() || ms.data().claimed) throw new Error("claimed");
        if (!ss.exists()) throw new Error("nostats");
        const r = ms.data().reward || {};
        const d = ss.data();
        newXP = (d.xp || 0) + Math.max(0, r.xp | 0);
        newTr = (d.trophies || 0) + Math.max(0, r.trophies | 0);
        tx.update(sref, { xp: newXP, trophies: newTr, lastClaimId: m.id,
          updatedAt: fs.serverTimestamp() });
        tx.update(mref, { claimed: true, read: true });
        tx.set(pref, {
          username: p.username, usernameLower: p.usernameLower,
          avatar: p.avatar || "a1", xp: newXP, trophies: newTr,
          wins: d.wins || 0, played: d.played || 0,
          updatedAt: fs.serverTimestamp()
        });
      });
      const s = G().state;
      s.xp = newXP; s.xpLevel = G().xpLevelFromTotal(newXP); s.xpLoaded = true;
      if (s.stats) s.stats = Object.assign({}, s.stats, { trophies: newTr, xp: newXP });
      G().render();
      toast("🎁 Recompensa reclamada");
    } catch (e) {
      console.warn("claim", e);
      note = e && e.message === "nostats"
        ? "Juega una partida primero para poder reclamar."
        : "No se pudo reclamar. Intenta de nuevo.";
    }
    busy = false; draw();
  }

  async function send() {
    if (busy || !isAdmin) return;
    const v = id => (overlay.querySelector(id) || {}).value || "";
    const to = v("#gxm-to").trim().replace(/^@+/, "").toLowerCase();
    const type = v("#gxm-type");
    const title = v("#gxm-title").trim();
    const body = v("#gxm-body").trim();
    const xp = Math.max(0, parseInt(v("#gxm-xp")) || 0);
    const tr = Math.max(0, parseInt(v("#gxm-tr")) || 0);

    if (!to || !title || !body) { note = "Completa usuario, título y mensaje."; return draw(); }
    if (type === "reward" && !xp && !tr) { note = "Pon al menos XP o trofeos."; return draw(); }

    busy = true; note = ""; draw();
    try {
      const { fb, fs } = await ctx();
      const u = await fs.getDoc(fs.doc(fb.db, "usernames", to));
      if (!u.exists()) { busy = false; note = "No existe el usuario @" + to; return draw(); }
      await fs.addDoc(fs.collection(fb.db, "users", u.data().uid, "mail"), {
        type, title, body,
        reward: type === "reward" ? { xp, trophies: tr } : null,
        read: false, claimed: false, ack: false, from: "admin",
        createdAt: fs.serverTimestamp()
      });
      note = "✓ Enviado a @" + to;
    } catch (e) {
      console.warn("send", e);
      note = "No se pudo enviar. Revisa las reglas de Firebase.";
    }
    busy = false; draw();
  }

  /* ---------- advertencia de sanción al iniciar sesión ---------- */
  function checkSanctions() {
    if (document.querySelector(".gx-intro,.gx-gate,.gx-warn")) return;
    const s = mails.find(m => m.type === "sanction" && !m.ack && !shownSanctions.has(m.id));
    if (!s) return;
    shownSanctions.add(s.id);
    const w = document.createElement("div");
    w.className = "gx-warn";
    w.innerHTML = `<div class="gx-warn-card">
      <div class="gx-warn-ico">⚠️</div><h3>Advertencia</h3>
      <h4>${esc(s.title || "Sanción")}</h4>
      <p>${esc(s.body || "")}</p>
      <button class="gx-mail-btn" type="button">Entendido</button></div>`;
    w.querySelector("button").addEventListener("click", async () => {
      w.remove();
      try {
        const { fb, fs, uid } = await ctx();
        await fs.updateDoc(fs.doc(fb.db, "users", uid, "mail", s.id), { ack: true, read: true });
      } catch (e) { console.warn("ack", e); }
    });
    document.body.appendChild(w);
  }

  /* ---------- eventos de la ventana ---------- */
  document.addEventListener("click", e => {
    if (!overlay || !overlay.contains(e.target)) return;
    const b = e.target.closest("[data-m]"); if (!b) return;
    const a = b.dataset.m;
    if (a === "close") closeMail();
    else if (a === "back") { view = "list"; note = ""; draw(); }
    else if (a === "open") {
      const m = mails.find(x => x.id === b.dataset.id); if (!m) return;
      openId = m.id; view = "detail"; note = ""; markRead(m); draw();
    }
    else if (a === "claim") { const m = mails.find(x => x.id === openId); if (m) claim(m); }
    else if (a === "tab-inbox") { tab = "inbox"; note = ""; draw(); }
    else if (a === "tab-send") { tab = "send"; note = ""; draw(); }
    else if (a === "send") send();
  });
  document.addEventListener("change", e => {
    if (e.target && e.target.id === "gxm-type") {
      const rw = overlay && overlay.querySelector("#gxm-rw");
      if (rw) rw.style.display = e.target.value === "reward" ? "grid" : "none";
    }
  });

  /* ---------- suscripción en tiempo real ---------- */
  async function subscribe(uid) {
    const fb = G().fb;
    if (!fb || !fb.db) return false;
    const fs = await G().fsModule();
    if (unsub) unsub();
    unsub = fs.onSnapshot(
      fs.query(fs.collection(fb.db, "users", uid, "mail"), fs.orderBy("createdAt", "desc"), fs.limit(50)),
      snap => {
        mails = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
        updateBadge();
        if (overlay && !(view === "list" && tab === "send")) draw();
        checkSanctions();
      },
      err => console.warn("mail", err)
    );
    try { isAdmin = (await fs.getDoc(fs.doc(fb.db, "admins", uid))).exists(); } catch (e) { isAdmin = false; }
    return true;
  }

  function reset() {
    if (unsub) { unsub(); unsub = null; }
    mails = []; isAdmin = false; curUid = null;
    closeMail(); updateBadge();
  }

  setInterval(async () => {
    if (!G()) return;
    const uid = G().state.user ? G().state.user.uid : null;
    if (uid && uid !== curUid) { if (await subscribe(uid)) curUid = uid; }
    else if (!uid && curUid) reset();
    ensureButton();
    checkSanctions();
  }, 700);
})();
