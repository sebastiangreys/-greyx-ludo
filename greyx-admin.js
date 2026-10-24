/* GREYX LUDO — Panel de administrador (PASO 1)
   - Roles: owner | moderator | analyst | auditor (se leen de /admins/{uid}.role)
   - Historial de sanciones en /sanctions (nunca se pisa)
   - Una advertencia no sobrescribe un baneo vigente
   - Sanciones vencidas se muestran como vencidas
   - Confirmación antes de aplicar o retirar
   - Nivel 100 y items: solo para owner */
(() => {
  "use strict";

  const MAX_XP = 622840; // nivel 100
  const ITEMS = [
    "frame_lv10","bg_lv20","title_lv30","frame_lv40","bg_lv50","title_lv60",
    "frame_lv70","bg_lv80","fx_lv90","frame_lv100","title_lv100",
    "title_novato","title_campeon","title_cazador","frame_racha",
    "bg_veterano","fx_chispas","frame_trofeo"
  ];
  const CATS = [["spam","Spam"],["toxic","Conducta"],["cheat","Trampa"],["other","Otra"]];
  const CAT_NAME = Object.fromEntries(CATS);
  const ROLE_NAME = { owner:"OWNER", moderator:"MODERADOR", analyst:"ANALISTA", auditor:"AUDITOR" };

  const G = () => window.GX;
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  const role = () => (G() && G().state.staffRole) || "owner";
  const isOwnerRole = () => role() === "owner";
  const canMod = () => ["owner", "moderator"].includes(role());

  let checkedUid = null;
  let syncing = false;
  const view = { tab:"home", q:"", target:null, type:"warning", cat:"other", days:"7",
                 reason:"", msg:"", ok:false, busy:false, log:null, confirm:null };

  async function ctx() {
    const g = G();
    const fs = await g.fsModule();
    return { g, fs, db: g.fb.db, uid: g.state.user.uid };
  }

  /* ---------- Fechas y estado de sanciones ---------- */
  function fmt(ts) {
    try { return ts.toDate().toLocaleString(); } catch (e) { return "—"; }
  }
  function ms(ts) {
    try { return ts.toMillis(); } catch (e) { return 0; }
  }
  function isActive(b) {
    if (!b) return false;
    if (b.permanent === true) return true;
    if (b.until) return ms(b.until) > Date.now();
    return false; // una advertencia no es sanción activa
  }
  function left(ts) {
    const t = ms(ts) - Date.now();
    if (t <= 0) return "0m";
    const d = Math.floor(t / 864e5), h = Math.floor(t % 864e5 / 36e5), m = Math.floor(t % 36e5 / 6e4);
    return d > 0 ? d + "d " + h + "h" : h > 0 ? h + "h " + m + "m" : m + "m";
  }
  function stateOf(s) {
    if (s.liftedAt) return ["Retirada", "lifted"];
    if (s.type === "warning") return ["Aviso", "warn"];
    if (s.permanent === true) return ["Activa", "active"];
    if (s.until && ms(s.until) > Date.now()) return ["Activa · quedan " + left(s.until), "active"];
    return ["Vencida", "expired"];
  }

  /* ---------- Detectar rol del staff ---------- */
  async function checkAdmin() {
    const g = G();
    if (!g) return;
    const u = g.state.user;

    if (!u) {
      if (checkedUid !== null || g.state.isStaff) {
        checkedUid = null;
        g.state.isOwner = false;
        g.state.isStaff = false;
        g.state.staffRole = null;
        closePanel();
        g.render();
      }
      return;
    }
    if (checkedUid === u.uid || !g.fb || !g.fb.db) return;
    checkedUid = u.uid;

    try {
      const fs = await g.fsModule();
      const snap = await fs.getDoc(fs.doc(g.fb.db, "admins", u.uid));
      if (!snap.exists()) return;
      const r = snap.data().role || "owner";
      if (!ROLE_NAME[r]) return;
      g.state.staffRole = r;
      g.state.isStaff = true;
      g.state.isOwner = r === "owner";
      g.render();
      if (r === "owner") {
        const res = await syncOwner(true);
        if (res.changed) toast("Nivel 100 y todo desbloqueado ✔");
      }
    } catch (e) { console.warn("admin", e); }
  }
  setInterval(checkAdmin, 1000);

  /* ---------- Nivel 100 + desbloqueos (solo owner) ---------- */
  async function syncOwner(silent) {
    if (!isOwnerRole()) return { changed:false, text:"Solo el owner puede hacer esto." };
    if (syncing) return { changed:false, text:"Ya se está sincronizando…" };
    syncing = true;
    let changed = false, text = "";
    try {
      const { g, fs, db, uid } = await ctx();
      const prof = g.state.profile;
      const statsRef = fs.doc(db, "stats", uid);
      const sSnap = await fs.getDoc(statsRef);

      if (!sSnap.exists()) {
        text = "Juega una partida contra bot para crear tus estadísticas y vuelve a sincronizar.";
      } else if (!prof) {
        text = "Crea tu perfil primero.";
      } else {
        const s = sSnap.data();
        if ((s.xp || 0) < MAX_XP) {
          const b = fs.writeBatch(db);
          b.update(statsRef, { xp: MAX_XP, updatedAt: fs.serverTimestamp() });
          b.set(fs.doc(db, "publicProfiles", uid), {
            username: prof.username,
            usernameLower: prof.usernameLower,
            avatar: prof.avatar,
            xp: MAX_XP,
            trophies: s.trophies || 0,
            wins: s.wins || 0,
            played: s.played || 0,
            updatedAt: fs.serverTimestamp()
          });
          await b.commit();
          g.state.xp = MAX_XP;
          g.state.xpLevel = 100;
          g.state.xpLoaded = true;
          if (g.state.stats) g.state.stats = Object.assign({}, g.state.stats, { xp: MAX_XP });
          changed = true;
        }

        const refs = ITEMS.map(id => fs.doc(db, "inventory", uid, "items", id));
        const snaps = await Promise.all(refs.map(r => fs.getDoc(r)));
        const missing = refs.filter((r, i) => !snaps[i].exists());
        if (missing.length) {
          const b = fs.writeBatch(db);
          missing.forEach(r => b.set(r, {
            at: fs.serverTimestamp(), by: uid, reason: "owner unlock"
          }));
          await b.commit();
          changed = true;
        }
        text = changed ? "Listo: nivel 100 y todos los items desbloqueados."
                       : "Ya tienes nivel 100 y todo desbloqueado.";
      }
    } catch (e) {
      console.warn("syncOwner", e);
      text = "No se pudo sincronizar (" + (e.code || "error") + ").";
    }
    syncing = false;
    if (changed) G().render();
    return { changed, text };
  }

  /* ---------- Entrada dentro de Configuración ---------- */
  window.GXAdminEntry = () => {
    const g = G();
    if (!g || !g.state.isStaff || g.state.phase === "playing") return "";
    return `
      <button class="settings-option" data-action="admin-open" type="button">
        <span class="settings-option-icon">${window.GXOwnerIcon ? window.GXOwnerIcon(24) : ""}</span>
        <span class="settings-option-text">
          <strong>Panel de administrador</strong>
          <small>${canMod() ? "Sanciones, registro y desbloqueos" : "Consulta (solo lectura)"}</small>
        </span>
      </button>`;
  };

  document.addEventListener("click", e => {
    if (e.target.closest('[data-action="admin-open"]')) openPanel();
  }, true);

  /* ---------- Estilos ---------- */
  const css = `
  .gxa{position:fixed;inset:0;z-index:1000002;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#fff;
    background:radial-gradient(circle at 50% 0,#4c1d9566,transparent 55%),linear-gradient(180deg,#0b0c2e,#05060f);
    padding:calc(14px + env(safe-area-inset-top,0px)) 16px calc(30px + env(safe-area-inset-bottom,0px));
    animation:gxaIn .35s cubic-bezier(.2,.8,.2,1) both;font-family:Inter,system-ui,-apple-system,sans-serif}
  @keyframes gxaIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
  .gxa-in{max-width:520px;margin:0 auto}
  .gxa-top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;margin-bottom:14px}
  .gxa-back{width:42px;height:42px;border-radius:14px;border:1px solid #ffffff22;
    background:linear-gradient(145deg,#1e1b4bcc,#0f172acc);color:#fff;font-size:1.15rem;box-shadow:0 6px 16px #00000055}
  .gxa-title{display:flex;align-items:center;justify-content:center;gap:8px;font-size:1.2rem}
  .gxa-sp{width:42px}
  .gxa-tabs{display:flex;gap:6px;padding:5px;border-radius:16px;background:#ffffff0a;border:1px solid #ffffff12;margin-bottom:14px}
  .gxa-tab{flex:1;padding:10px 4px;border:0;border-radius:12px;background:transparent;color:#a3abbd;font:800 .8rem inherit}
  .gxa-tab.on{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;box-shadow:0 0 16px #8b5cf655}
  .gxa-card{padding:16px;border-radius:22px;border:1px solid #ffffff1c;margin-bottom:12px;
    background:linear-gradient(160deg,#242b58,#0f132b);box-shadow:0 14px 34px #0008,inset 0 1px 0 #ffffff1a}
  .gxa-card h3{margin:0 0 4px;font-size:.95rem}
  .gxa-card p{margin:0 0 12px;color:#9aa3b8;font-size:.78rem;line-height:1.4}
  .gxa-owner{display:flex;align-items:center;gap:12px;margin-bottom:14px}
  .gxa-av{width:52px;height:52px;display:grid;place-items:center;border-radius:50%;font-size:1.7rem;
    background:linear-gradient(145deg,#8b5cf6,#4c1d95);border:2px solid #fde68a;box-shadow:0 0 18px #8b5cf688}
  .gxa-owner strong{display:block;font-size:1rem}
  .gxa-owner small{color:#fbbf24;font-weight:800;font-size:.7rem;letter-spacing:.08em}
  .gxa-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
  .gxa-stat{padding:12px;border-radius:14px;background:#ffffff0a;border:1px solid #ffffff12}
  .gxa-stat b{display:block;font-size:1.25rem}
  .gxa-stat span{color:#8e97aa;font-size:.7rem}
  .gxa-btn{width:100%;min-height:48px;border:0;border-radius:15px;font:900 .9rem inherit;color:#fff;
    background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 5px 0 #3b1d8f}
  .gxa-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #3b1d8f}
  .gxa-btn.red{background:linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 5px 0 #7f1d1d}
  .gxa-btn.confirm{background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 5px 0 #92400e;color:#2a1600}
  .gxa-btn.ghost{background:#ffffff10;box-shadow:none;border:1px solid #ffffff22}
  .gxa-btn:disabled{opacity:.5}
  .gxa-row{display:flex;gap:8px}
  .gxa-row .gxa-btn{width:auto;padding:0 18px}
  .gxa-in input,.gxa-in textarea{width:100%;padding:13px 14px;border-radius:14px;border:1.5px solid #ffffff1c;
    background:#0a0d1acc;color:#fff;font:600 16px Inter,system-ui,sans-serif;outline:0;box-sizing:border-box}
  .gxa-in input:focus,.gxa-in textarea:focus{border-color:#a78bfa;box-shadow:0 0 0 4px #8b5cf633}
  .gxa-in textarea{resize:none;height:76px;margin-top:8px}
  .gxa-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0 8px}
  .gxa-seg.four{grid-template-columns:repeat(4,1fr);margin-top:0}
  .gxa-seg button{padding:11px 4px;border-radius:13px;border:1.5px solid #ffffff1c;background:#ffffff08;color:#c7cde0;font:800 .74rem inherit}
  .gxa-seg button.on{border-color:#a78bfa;background:#8b5cf633;color:#fff}
  .gxa-seg button.on.t-warning{border-color:#fbbf24;background:#fbbf2426}
  .gxa-seg button.on.t-permanent{border-color:#ef4444;background:#ef444426}
  .gxa-lbl{display:block;margin:10px 0 6px;color:#8e97aa;font:800 .64rem monospace;letter-spacing:.12em;text-transform:uppercase}
  .gxa-player{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .gxa-player .gxa-av{width:46px;height:46px;font-size:1.5rem;border-color:#a78bfa88}
  .gxa-player strong{display:block}
  .gxa-player small{color:#8e97aa;font-size:.68rem}
  .gxa-status{padding:10px 12px;border-radius:13px;margin-bottom:10px;font-size:.78rem;font-weight:700}
  .gxa-status.clean{background:#10b98122;color:#6ee7b7}
  .gxa-status.banned{background:#ef444422;color:#fca5a5}
  .gxa-status.expired{background:#64748b30;color:#cbd5e1}
  .gxa-msg{padding:10px 12px;border-radius:12px;font-size:.8rem;margin:0 0 12px}
  .gxa-msg.ok{background:#10b98122;border:1px solid #10b98155;color:#6ee7b7}
  .gxa-msg.err{background:#ef444422;border:1px solid #ef444455;color:#fca5a5}
  .gxa-log{padding:11px 12px;border-radius:14px;background:#ffffff08;border:1px solid #ffffff10;margin-bottom:8px;font-size:.78rem}
  .gxa-log b{display:block;margin-bottom:2px}
  .gxa-log small{color:#8e97aa}
  .gxa-chip{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:99px;font-size:.62rem;font-weight:800;vertical-align:middle}
  .gxa-chip.active{background:#ef444433;color:#fca5a5}
  .gxa-chip.expired{background:#64748b40;color:#cbd5e1}
  .gxa-chip.lifted{background:#10b98133;color:#6ee7b7}
  .gxa-chip.warn{background:#fbbf2433;color:#fde68a}
  .gxa-toast{position:fixed;left:50%;bottom:calc(30px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);
    z-index:1000003;padding:12px 20px;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;
    font-weight:800;font-size:.85rem;box-shadow:0 10px 30px #000c}
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Ventana ---------- */
  function toast(m) {
    const t = document.createElement("div");
    t.className = "gxa-toast";
    t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }

  function openPanel() {
    if (document.getElementById("gxAdm")) return;
    Object.assign(view, { tab:"home", q:"", target:null, type:"warning", cat:"other",
                          days:"7", reason:"", msg:"", ok:false, busy:false, log:null, confirm:null });
    const el = document.createElement("div");
    el.id = "gxAdm";
    el.className = "gxa";
    el.addEventListener("click", onClick);
    document.body.appendChild(el);
    draw();
  }

  function closePanel() {
    const el = document.getElementById("gxAdm");
    if (el) el.remove();
  }

  function grab() {
    const q = document.getElementById("gxaQ");
    const r = document.getElementById("gxaR");
    const d = document.getElementById("gxaD");
    if (q) view.q = q.value;
    if (r) view.reason = r.value;
    if (d) view.days = d.value;
  }

  function homeHtml() {
    const g = G(), s = g.state, p = s.profile || {};
    const lv = s.xpLoaded ? s.xpLevel : "—";
    const owner = isOwnerRole();
    return `
      <div class="gxa-card">
        <div class="gxa-owner">
          <span class="gxa-av">${g.avatarEmoji(p.avatar || "a1")}</span>
          <div>
            <strong>@${esc(p.username || "staff")}</strong>
            <small>${ROLE_NAME[role()] || "STAFF"}</small>
          </div>
        </div>
        ${owner ? `
        <div class="gxa-stats">
          <div class="gxa-stat"><b>${lv}</b><span>Nivel</span></div>
          <div class="gxa-stat"><b>${ITEMS.length}</b><span>Items del catálogo</span></div>
        </div>
        <h3>Nivel 100 y desbloqueos</h3>
        <p>Se aplican solos al iniciar sesión. Usa el botón si agregaste items nuevos.</p>
        <button class="gxa-btn" data-a="sync" type="button" ${view.busy ? "disabled" : ""}>
          ${view.busy ? "Sincronizando…" : "Sincronizar ahora"}
        </button>` : `
        <h3>Tu rol</h3>
        <p>${canMod()
          ? "Puedes aplicar y retirar sanciones y ver el registro."
          : "Tienes acceso de solo lectura: puedes consultar el registro."}</p>`}
      </div>`;
  }

  function historyHtml(t) {
    if (!t.history) return `<p style="margin:0;color:#9aa3b8;font-size:.78rem">Cargando historial…</p>`;
    if (!t.history.length) return `<p style="margin:0;color:#9aa3b8;font-size:.78rem">Este jugador no tiene historial.</p>`;
    return t.history.map(s => {
      const [txt, cls] = stateOf(s);
      const kind = s.type === "warning" ? "Advertencia" : s.type === "temp" ? "Temporal" : "Permanente";
      return `
      <div class="gxa-log">
        <b>${kind} · ${esc(CAT_NAME[s.category] || "Otra")}<span class="gxa-chip ${cls}">${esc(txt)}</span></b>
        ${esc(s.reason || "")}<br>
        <small>${esc(fmt(s.at))} · por ${esc(s.byName || "admin")}${s.until ? " · hasta " + esc(fmt(s.until)) : ""}</small>
        ${s.liftedAt ? `<br><small>Retirada ${esc(fmt(s.liftedAt))}: ${esc(s.liftReason || "")}</small>` : ""}
      </div>`;
    }).join("");
  }

  function banHtml() {
    const t = view.target;
    let card = "";
    if (t) {
      const b = t.ban;
      const active = isActive(b);
      let status;
      if (active) {
        status = `<div class="gxa-status banned">Sanción activa: ${esc(b.type)}${b.until ? " · quedan " + esc(left(b.until)) + " (hasta " + esc(fmt(b.until)) + ")" : " · permanente"}<br>${esc(b.reason || "")}</div>`;
      } else if (b && b.type !== "warning") {
        status = `<div class="gxa-status expired">Última sanción vencida el ${esc(fmt(b.until))}</div>`;
      } else {
        status = `<div class="gxa-status clean">Sin sanciones activas</div>`;
      }
      const applyLbl = view.confirm === "apply" ? "¿Confirmas? Toca otra vez" : "Aplicar sanción";
      const liftLbl = view.confirm === "lift" ? "¿Confirmas? Toca otra vez" : "Retirar sanción";
      card = `
        <div class="gxa-card">
          <div class="gxa-player">
            <span class="gxa-av">${G().avatarEmoji(t.avatar)}</span>
            <div><strong>@${esc(t.username)}</strong><small>${esc(t.uid.slice(0, 10))}…</small></div>
          </div>
          ${status}
          <span class="gxa-lbl">Tipo</span>
          <div class="gxa-seg" style="margin-top:0">
            <button type="button" data-a="type" data-v="warning" class="t-warning ${view.type === "warning" ? "on" : ""}">Advertencia</button>
            <button type="button" data-a="type" data-v="temp" class="t-temp ${view.type === "temp" ? "on" : ""}">Temporal</button>
            <button type="button" data-a="type" data-v="permanent" class="t-permanent ${view.type === "permanent" ? "on" : ""}">Permanente</button>
          </div>
          <span class="gxa-lbl">Categoría</span>
          <div class="gxa-seg four">
            ${CATS.map(([k, n]) => `<button type="button" data-a="cat" data-v="${k}" class="${view.cat === k ? "on" : ""}">${n}</button>`).join("")}
          </div>
          ${view.type === "temp" ? `<input id="gxaD" type="number" min="1" max="399" inputmode="numeric" placeholder="Días (1 a 399)" value="${esc(view.days)}">` : ""}
          <textarea id="gxaR" maxlength="200" placeholder="Motivo obligatorio (3 a 200 caracteres)">${esc(view.reason)}</textarea>
          <div style="height:12px"></div>
          <button class="gxa-btn ${view.confirm === "apply" ? "confirm" : "red"}" data-a="apply" type="button" ${view.busy ? "disabled" : ""}>${applyLbl}</button>
          ${active ? `<div style="height:10px"></div><button class="gxa-btn ${view.confirm === "lift" ? "confirm" : "ghost"}" data-a="lift" type="button" ${view.busy ? "disabled" : ""}>${liftLbl}</button>` : ""}
        </div>
        <div class="gxa-card">
          <h3>Historial de @${esc(t.username)}</h3>
          <p>Todas las advertencias y sanciones, de la más reciente a la más antigua.</p>
          ${historyHtml(t)}
        </div>`;
    }
    return `
      <div class="gxa-card">
        <h3>Buscar jugador</h3>
        <p>Escribe su nombre de usuario o su UID.</p>
        <div class="gxa-row">
          <input id="gxaQ" type="text" placeholder="@usuario" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(view.q)}">
          <button class="gxa-btn" data-a="search" type="button">Buscar</button>
        </div>
      </div>${card}`;
  }

  function logHtml() {
    if (view.log === null) return `<div class="gxa-card"><p style="margin:0">Cargando…</p></div>`;
    if (!view.log.length) return `<div class="gxa-card"><p style="margin:0">Aún no hay acciones registradas.</p></div>`;
    return view.log.map(l => `
      <div class="gxa-log">
        <b>${esc(l.action || "")} · @${esc(l.targetName || "jugador")}</b>
        ${esc(l.reason || "")}<br>
        <small>${esc(fmt(l.at))} · por ${esc(l.adminName || "admin")}</small>
      </div>`).join("");
  }

  function draw() {
    const el = document.getElementById("gxAdm");
    if (!el) return;
    const tabs = [["home", "Resumen"]];
    if (canMod()) tabs.push(["ban", "Sanciones"]);
    tabs.push(["log", "Registro"]);
    if (!tabs.some(t => t[0] === view.tab)) view.tab = "home";
    const body = view.tab === "home" ? homeHtml() : view.tab === "ban" ? banHtml() : logHtml();
    el.innerHTML = `
      <div class="gxa-in">
        <div class="gxa-top">
          <button class="gxa-back" data-a="close" type="button" aria-label="Volver">←</button>
          <div class="gxa-title">${window.GXOwnerIcon ? window.GXOwnerIcon(22) : ""}<strong>Administrador</strong></div>
          <span class="gxa-sp"></span>
        </div>
        <div class="gxa-tabs">
          ${tabs.map(([k, n]) => `<button class="gxa-tab ${view.tab === k ? "on" : ""}" data-a="tab" data-v="${k}" type="button">${n}</button>`).join("")}
        </div>
        ${view.msg ? `<p class="gxa-msg ${view.ok ? "ok" : "err"}">${esc(view.msg)}</p>` : ""}
        ${body}
      </div>`;
  }

  function say(msg, ok) { view.msg = msg; view.ok = !!ok; view.confirm = null; draw(); }

  async function onClick(e) {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const a = b.dataset.a;
    grab();
    if (a !== "apply" && a !== "lift") view.confirm = null;

    if (a === "close") { closePanel(); return; }
    if (a === "tab") {
      view.tab = b.dataset.v; view.msg = "";
      if (view.tab === "log") loadLog();
      draw(); return;
    }
    if (a === "type") { view.type = b.dataset.v; draw(); return; }
    if (a === "cat") { view.cat = b.dataset.v; draw(); return; }
    if (a === "sync") {
      view.busy = true; view.msg = ""; draw();
      const r = await syncOwner(false);
      view.busy = false; say(r.text, r.changed || /Ya tienes/.test(r.text)); return;
    }
    if (a === "search") { await findPlayer(); return; }
    if (!canMod()) return;

    if (a === "apply") {
      if (view.confirm !== "apply") { view.confirm = "apply"; view.msg = ""; draw(); return; }
      view.confirm = null;
      await applySanction(); return;
    }
    if (a === "lift") {
      if (view.confirm !== "lift") { view.confirm = "lift"; view.msg = ""; draw(); return; }
      view.confirm = null;
      await liftSanction(); return;
    }
  }

  /* ---------- Registro único de auditoría ---------- */
  function logAction(batch, fs, db, g, uid, o) {
    batch.set(fs.doc(fs.collection(db, "adminLog")), {
      admin: uid,
      adminName: (g.state.profile && g.state.profile.username) || "admin",
      action: o.action,
      target: o.target,
      targetName: o.targetName,
      reason: o.reason,
      change: o.change,
      at: fs.serverTimestamp()
    });
  }

  /* ---------- Sanciones ---------- */
  async function fetchHistory(fs, db, uid) {
    const q = fs.query(fs.collection(db, "sanctions"), fs.where("target", "==", uid), fs.limit(50));
    const sn = await fs.getDocs(q);
    return sn.docs.map(d => Object.assign({ _id: d.id }, d.data()))
      .sort((a, b) => ms(b.at) - ms(a.at));
  }

  async function refreshTarget(t) {
    const { fs, db } = await ctx();
    const bn = await fs.getDoc(fs.doc(db, "bans", t.uid));
    t.ban = bn.exists() ? bn.data() : null;
    try { t.history = await fetchHistory(fs, db, t.uid); }
    catch (e) { console.warn("history", e); t.history = []; }
  }

  async function findPlayer() {
    const q = view.q.trim().replace(/^@+/, "");
    if (!q) return say("Escribe un nombre de usuario o UID.", false);
    try {
      const { fs, db } = await ctx();
      let uid = null;
      const n = await fs.getDoc(fs.doc(db, "usernames", q.toLowerCase()));
      if (n.exists()) uid = n.data().uid;
      else if (q.length >= 20) uid = q;
      if (!uid) { view.target = null; return say("No se encontró ese jugador.", false); }

      const p = await fs.getDoc(fs.doc(db, "publicProfiles", uid));
      const pd = p.exists() ? p.data() : {};
      view.target = {
        uid,
        username: pd.username || (n.exists() ? q : "jugador"),
        avatar: pd.avatar || "a1",
        ban: null,
        history: null
      };
      view.msg = ""; view.confirm = null; draw();
      await refreshTarget(view.target);
      draw();
    } catch (e) {
      console.warn(e);
      say("No se pudo buscar (" + (e.code || "error") + ").", false);
    }
  }

  async function applySanction() {
    const t = view.target;
    if (!t) return;
    const reason = view.reason.trim();
    const days = Math.floor(Number(view.days));
    if (reason.length < 3 || reason.length > 200) return say("El motivo debe tener entre 3 y 200 caracteres.", false);
    if (view.type === "temp" && !(days >= 1 && days <= 399)) return say("Los días deben ser de 1 a 399.", false);

    view.busy = true; view.msg = ""; draw();
    try {
      const { g, fs, db, uid } = await ctx();

      // Estado real y fresco (no el de la pantalla)
      const bn = await fs.getDoc(fs.doc(db, "bans", t.uid));
      const cur = bn.exists() ? bn.data() : null;
      const activeNow = isActive(cur);

      if (view.type !== "warning" && activeNow) {
        view.busy = false;
        return say("Ya tiene una sanción activa. Retírala primero y luego aplica la nueva.", false);
      }

      const byName = (g.state.profile && g.state.profile.username) || "admin";
      const until = view.type === "temp" ? fs.Timestamp.fromMillis(Date.now() + days * 864e5) : null;

      const batch = fs.writeBatch(db);

      // 1) Historial (nunca se pisa)
      const sdoc = {
        target: t.uid, targetName: t.username,
        type: view.type, category: view.cat, reason,
        by: uid, byName, at: fs.serverTimestamp()
      };
      if (until) sdoc.until = until;
      if (view.type === "permanent") sdoc.permanent = true;
      batch.set(fs.doc(fs.collection(db, "sanctions")), sdoc);

      // 2) Estado vigente: una advertencia no toca un baneo activo
      if (!(view.type === "warning" && activeNow)) {
        const ban = { type: view.type, reason, by: uid, at: fs.serverTimestamp() };
        if (until) ban.until = until;
        if (view.type === "permanent") ban.permanent = true;
        batch.set(fs.doc(db, "bans", t.uid), ban);
      }

      // 3) Auditoría
      logAction(batch, fs, db, g, uid, {
        action: view.type, target: t.uid, targetName: t.username, reason,
        change: (view.cat) + (view.type === "temp" ? " · " + days + "d" : " · " + view.type)
      });

      await batch.commit();
      await refreshTarget(t);
      view.reason = "";
      view.busy = false;
      say(view.type === "warning" && activeNow
        ? "Advertencia registrada. El baneo vigente se mantiene."
        : "Sanción aplicada a @" + t.username + ".", true);
    } catch (e) {
      console.warn(e);
      view.busy = false;
      say(e.code === "permission-denied"
        ? "Sin permiso: no puedes sancionarte a ti ni a otro miembro del staff."
        : "No se pudo aplicar (" + (e.code || "error") + ").", false);
    }
  }

  async function liftSanction() {
    const t = view.target;
    if (!t) return;
    const reason = view.reason.trim();
    if (reason.length < 3 || reason.length > 200) {
      return say("Escribe el motivo de la retirada (3 a 200 caracteres).", false);
    }
    view.busy = true; view.msg = ""; draw();
    try {
      const { g, fs, db, uid } = await ctx();
      const history = await fetchHistory(fs, db, t.uid);
      const batch = fs.writeBatch(db);

      history
        .filter(s => s.type !== "warning" && !s.liftedAt && isActive(s))
        .forEach(s => batch.update(fs.doc(db, "sanctions", s._id), {
          liftedAt: fs.serverTimestamp(), liftedBy: uid, liftReason: reason
        }));

      batch.delete(fs.doc(db, "bans", t.uid));
      logAction(batch, fs, db, g, uid, {
        action: "unban", target: t.uid, targetName: t.username, reason, change: "retirada"
      });
      await batch.commit();

      await refreshTarget(t);
      view.reason = "";
      view.busy = false;
      say("Sanción retirada a @" + t.username + ".", true);
    } catch (e) {
      console.warn(e);
      view.busy = false;
      say("No se pudo retirar (" + (e.code || "error") + ").", false);
    }
  }

  async function loadLog() {
    view.log = null;
    try {
      const { fs, db } = await ctx();
      const q = fs.query(fs.collection(db, "adminLog"), fs.orderBy("at", "desc"), fs.limit(50));
      const sn = await fs.getDocs(q);
      view.log = sn.docs.map(d => d.data());
    } catch (e) {
      console.warn(e);
      view.log = [];
    }
    if (view.tab === "log") draw();
  }
})();
