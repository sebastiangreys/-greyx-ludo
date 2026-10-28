/* GREYX LUDO — CORREO (v2, archivo completo: reemplaza al anterior)
   Cargar DESPUÉS de greyx-ideas.js:  <script src="greyx-correo.js"></script>

   Firestore:  users/{uid}/mail/{id}
   { type:"message"|"reward", title, body, reward:{xp,trophies}|null,
     read, claimed, ack, from:"admin", createdAt }

   - El envío ya NO está aquí: se hace desde el Panel de administrador (pestaña Correo).
   - Las sanciones no usan el correo. Los avisos antiguos tipo "sanction" siguen mostrándose
     como advertencia al iniciar sesión, pero no aparecen en la bandeja. */
(() => {
  "use strict";

  const G = () => window.GX;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ENV = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 8l8 6 8-6"/></svg>`;
  const BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`;
  const ICON = { message: "✉️", reward: "🎁" };

  // Solo se pueden borrar mensajes y recompensas ya reclamadas (así lo exigen las reglas)
  const deletable = m => m.type === "message" || (m.type === "reward" && m.claimed === true);

  let mails = [], unsub = null, curUid = null;
  let overlay = null, view = "list", openId = null;
  let busy = false, note = "", deleting = false;
  const selected = new Set();
  const shownSanctions = new Set();

  /* ---------- CSS ---------- */
  const css = document.createElement("style");
  css.textContent = `
.gx6-in>.gx-mailbtn{position:absolute;top:0;right:56px;z-index:3;width:46px;height:46px;display:grid;place-items:center;padding:0;
  border-radius:50%;color:#fff;cursor:pointer;overflow:visible;
  background:linear-gradient(145deg,#232a66,#0d1030);border:1px solid #6d5cffaa;
  box-shadow:0 0 18px #4f46e577,0 6px 16px #000a}
.gx-mailbtn svg{width:22px;height:22px}
.gx-mailbtn:active{transform:scale(.93)}
.gx-mailbadge{display:none;position:absolute;top:1px;right:1px;width:12px;height:12px;border-radius:50%;
  background:#ff303b;border:2px solid #171943;box-shadow:0 0 8px #ff303bcc;pointer-events:none}
.gx-mailbadge.on{display:block}

.gx-mail{position:fixed;inset:0;z-index:1200;color:#fff;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  padding:calc(14px + env(safe-area-inset-top,0px)) 16px calc(28px + env(safe-area-inset-bottom,0px));
  background:radial-gradient(circle at 50% 0,#4c1d9566,transparent 55%),linear-gradient(180deg,#0b0c2e,#05060f);
  font-family:Inter,system-ui,sans-serif;animation:gxMailIn .35s cubic-bezier(.2,.8,.2,1) both}
@keyframes gxMailIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
.gx-mail-in{max-width:520px;margin:0 auto}
.gx-mail-top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;margin-bottom:16px}
.gx-mail-top h2{margin:0;text-align:center;font-size:1.3rem;font-weight:900}
.gx-mail-back{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;border:1px solid #ffffff22;
  background:linear-gradient(145deg,#1e1b4bcc,#0f172acc);color:#fff;box-shadow:0 6px 16px #0006;cursor:pointer}
.gx-mail-back svg{width:20px;height:20px}
.gx-mail-list{display:grid;gap:9px}
.gx-mail-row-wrap{display:flex;align-items:center;gap:10px}
.gx-mail-row{flex:1;min-width:0;display:flex;align-items:center;gap:12px;width:100%;padding:12px;border-radius:20px;border:1px solid #ffffff14;
  background:linear-gradient(160deg,#1c2250cc,#0e1226cc);color:#fff;text-align:left;cursor:pointer}
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
.gx-mail-btn{width:100%;min-height:52px;border:0;border-radius:16px;color:#fff;font:900 .95rem inherit;cursor:pointer;
  background:linear-gradient(135deg,#a78bfa,#6d28d9);box-shadow:0 5px 0 #3b1d8f}
.gx-mail-btn.gold{color:#3a2200;background:linear-gradient(135deg,#fde68a,#f59e0b);box-shadow:0 5px 0 #92600a}
.gx-mail-btn:active{transform:translateY(3px)}
.gx-mail-btn:disabled{opacity:.55;transform:none}
.gx-mail-note{margin:12px 0 0;padding:10px 12px;border-radius:12px;font-size:.8rem;background:#ffffff0d;color:#e2e8f0}
.gx-mail-tools{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:9px;margin-bottom:12px}
.gx-mail-tools button{min-height:38px;padding:9px 12px;border-radius:12px;border:1px solid #ffffff20;background:#1c2250;color:#fff;font:800 12px Inter,system-ui,sans-serif;cursor:pointer}
.gx-mail-tools .gx-mail-delete{background:#9f202c;border-color:#ff5964}
.gx-mail-tools button:disabled{opacity:.45}
.gx-mail-select{width:20px;height:20px;flex:0 0 20px;accent-color:#a78bfa;cursor:pointer}
.gx-mail-select:disabled{opacity:.3;cursor:not-allowed}

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
    try {
      return m.createdAt && m.createdAt.toDate
        ? m.createdAt.toDate().toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : "";
    } catch (e) { return ""; }
  };
  const toast = t => {
    const d = document.createElement("div");
    d.className = "gx-toast2"; d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2200);
  };
  const ctx = async () => ({ fb: G().fb, fs: await G().fsModule(), uid: G().state.user.uid });

  /* ---------- botón junto a la configuración (posición fija por CSS) ---------- */
  function updateBadge() {
    const on = unread() > 0;
    document.querySelectorAll(".gx-mailbadge").forEach(el => el.classList.toggle("on", on));
  }

  function ensureButton() {
    const host = document.querySelector(".gx6.on .gx6-in");
    if (!host || host.querySelector(":scope > .gx-mailbtn")) return;
    const b = document.createElement("button");
    b.className = "gx-mailbtn";
    b.type = "button";
    b.setAttribute("aria-label", "Correo");
    b.setAttribute("title", "Correo");
    b.innerHTML = ENV + `<i class="gx-mailbadge"></i>`;
    b.addEventListener("click", openMail);
    host.appendChild(b);
    updateBadge();
  }

  // El menú se redibuja entero cuando cambia: se vuelve a poner el botón
  let watching = null;
  function watchMenu() {
    const box = document.querySelector(".gx6");
    if (box && watching !== box) {
      watching = box;
      new MutationObserver(ensureButton).observe(box, { childList: true });
    }
    ensureButton();
  }
  setInterval(watchMenu, 600);
  watchMenu();

  /* ---------- ventana ---------- */
  function openMail() {
    const st = G().state;
    if (!st.user) { st.showAuth = true; st.authMode = "login"; G().render(); return; }
    view = "list"; openId = null; note = ""; selected.clear();
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

  const top = (title, backTo) => `<div class="gx-mail-top">
    <button class="gx-mail-back" data-m="${backTo}" type="button" aria-label="Volver">${BACK}</button>
    <h2>${esc(title)}</h2><span></span></div>`;

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
          ${note ? `<p class="gx-mail-note">${esc(note)}</p>` : ""}
        </article>`;
    } else {
      const list = inbox();
      const canSel = list.filter(deletable);
      const picked = canSel.filter(m => selected.has(m.id)).length;
      const allSel = canSel.length > 0 && picked === canSel.length;

      const rows = list.map(m => `
        <div class="gx-mail-row-wrap">
          <input class="gx-mail-select" type="checkbox" data-select-mail="${esc(m.id)}"
            aria-label="Seleccionar" ${selected.has(m.id) ? "checked" : ""}
            ${deleting || !deletable(m) ? "disabled" : ""}>
          <button class="gx-mail-row ${m.read ? "" : "unread"}" data-m="open" data-id="${esc(m.id)}" type="button">
            <span class="gx-mail-ico">${ICON[m.type] || "✉️"}</span>
            <span class="gx-mail-txt">
              <strong>${esc(m.title || "Mensaje")}</strong>
              <small>${esc((m.body || "").replace(/\s+/g, " "))}</small>
            </span>
            <span class="gx-mail-side">
              ${m.read ? "" : `<i class="gx-mail-dot"></i>`}
              ${m.type === "reward" && !m.claimed ? `<span class="gx-mail-chip">Sin reclamar</span>` : ""}
              ${esc(fmt(m))}
            </span>
          </button>
        </div>`).join("");

      const tools = list.length ? `
        <div class="gx-mail-tools">
          <button type="button" data-m="select-all" ${deleting || !canSel.length ? "disabled" : ""}>
            ${allSel ? "Desmarcar todos" : "Seleccionar todos"}</button>
          <span style="color:#cbd5e1;font-size:.75rem">${picked} seleccionados</span>
          <button type="button" class="gx-mail-delete" data-m="delete-selected" ${!picked || deleting ? "disabled" : ""}>
            ${deleting ? "Eliminando…" : "Eliminar seleccionados"}</button>
          <button type="button" class="gx-mail-delete" data-m="delete-all" ${deleting || !canSel.length ? "disabled" : ""}>Borrar todo</button>
        </div>` : "";

      html = top("Correo", "close") + (rows
        ? `${tools}<div class="gx-mail-list">${rows}</div>`
        : `<div class="gx-mail-empty"><i>📭</i><strong>Tu correo está vacío</strong>
            <p>Aquí llegarán los mensajes y recompensas del equipo.</p></div>`);
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
        tx.update(sref, { xp: newXP, trophies: newTr, lastClaimId: m.id, updatedAt: fs.serverTimestamp() });
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

  async function askDelete(mode) {
    if (deleting) return;
    const n = [...selected].length;
    if (mode === "selected" && !n) return;
    const ok = window.GXConfirm
      ? await window.GXConfirm({
          title: mode === "all" ? "¿Borrar los correos?" : "¿Eliminar correos?",
          text: mode === "all"
            ? "Se eliminarán los mensajes y las recompensas ya reclamadas. Las recompensas sin reclamar se conservan."
            : "¿Eliminar " + n + " correo" + (n === 1 ? "" : "s") + " seleccionado" + (n === 1 ? "" : "s") + "? No se puede deshacer.",
          danger: true
        })
      : true;
    if (ok) deleteMails(mode);
  }

  async function deleteMails(mode) {
    if (deleting) return;
    const uidBefore = G() && G().state.user ? G().state.user.uid : null;
    if (!uidBefore) { toast("Inicia sesión para continuar."); return; }

    deleting = true; draw();
    try {
      const { fb, fs, uid } = await ctx();
      if (uid !== uidBefore) throw new Error("session");

      let ids;
      if (mode === "all") {
        const snap = await fs.getDocs(fs.collection(fb.db, "users", uid, "mail"));
        ids = snap.docs.filter(d => deletable(d.data())).map(d => d.id);
      } else {
        const ok = new Set(inbox().filter(deletable).map(m => m.id));
        ids = [...selected].filter(id => ok.has(id));
      }
      if (!ids.length) { toast("No hay correos para eliminar."); }
      else {
        for (let i = 0; i < ids.length; i += 400) {
          const batch = fs.writeBatch(fb.db);
          ids.slice(i, i + 400).forEach(id => batch.delete(fs.doc(fb.db, "users", uid, "mail", id)));
          await batch.commit();
        }
        const gone = new Set(ids);
        mails = mails.filter(m => !gone.has(m.id));
        toast(mode === "all" ? "Bandeja limpiada." : "Correos eliminados.");
      }
      selected.clear();
      updateBadge();
    } catch (e) {
      console.warn("deleteMails", e);
      toast("No se pudieron eliminar. Revisa tu conexión y las reglas.");
    }
    deleting = false;
    draw();
  }

  /* ---------- avisos antiguos de sanción (ya no se envían por correo) ---------- */
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
    const b = e.target.closest("[data-m]");
    if (!b) return;
    const a = b.dataset.m;
    if (a === "close") closeMail();
    else if (a === "back") { view = "list"; note = ""; draw(); }
    else if (a === "open") {
      const m = mails.find(x => x.id === b.dataset.id);
      if (!m) return;
      openId = m.id; view = "detail"; note = ""; markRead(m); draw();
    }
    else if (a === "claim") { const m = mails.find(x => x.id === openId); if (m) claim(m); }
    else if (a === "select-all") {
      const canSel = inbox().filter(deletable);
      const all = canSel.length > 0 && canSel.every(m => selected.has(m.id));
      if (all) selected.clear(); else canSel.forEach(m => selected.add(m.id));
      draw();
    }
    else if (a === "delete-selected") askDelete("selected");
    else if (a === "delete-all") askDelete("all");
  });

  document.addEventListener("change", e => {
    const t = e.target;
    if (t && t.matches && t.matches("[data-select-mail]")) {
      if (t.checked) selected.add(t.dataset.selectMail); else selected.delete(t.dataset.selectMail);
      draw();
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
        if (overlay && !deleting) draw();
        checkSanctions();
      },
      err => console.warn("mail", err)
    );
    return true;
  }

  function reset() {
    if (unsub) { unsub(); unsub = null; }
    mails = []; curUid = null; selected.clear();
    closeMail(); updateBadge();
  }

  setInterval(async () => {
    if (!G()) return;
    const uid = G().state.user ? G().state.user.uid : null;
    if (uid && uid !== curUid) {
      if (await subscribe(uid)) curUid = uid;
    } else if (!uid && curUid) {
      reset();
    }
    checkSanctions();
  }, 700);
})();
