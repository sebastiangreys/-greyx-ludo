/* GREYX LUDO — Panel de administrador (FASE 1 completa)
   - Roles: owner | moderator | analyst | auditor (se leen de /admins/{uid}.role)
   - Historial de sanciones en /sanctions (nunca se pisa)
   - Dashboard: registros, activos, conectados (tiempo real)
   - Ficha completa del jugador
   - Directorio con orden y filtros
   - Pestaña Equipo (solo owner) para crear / quitar staff
   - Registro de auditoría con filtros */
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
  const GRANTABLE = [["moderator","Moderador"],["analyst","Analista"],["auditor","Auditor"]];
  const SORT_LIST = [["name","Nombre"],["level","Nivel"],["trophies","Trofeos"],["wins","Victorias"],["newest","Nuevos"],["oldest","Antiguos"]];
  const SORTS = {
    name:["usernameLower","asc"], level:["xp","desc"], trophies:["trophies","desc"],
    wins:["wins","desc"], newest:["createdAt","desc"], oldest:["createdAt","asc"]
  };
  const FILTER_LIST = [["all","Todos"],["online","Conectados"],["banned","Sancionados"]];
  const LOG_ACTIONS = [
    ["","Todas las acciones"],["warning","Advertencias"],["temp","Sanciones temporales"],
    ["permanent","Sanciones permanentes"],["unban","Sanciones retiradas"],
    ["owner_sync","Sync del owner"],["role","Cambios de rol"],["staff_remove","Staff retirado"]
  ];

  const G = () => window.GX;

  // Carga el sistema de presencia (greyx-presence.js) si index.html no lo incluye
  if (!document.querySelector('script[src*="greyx-presence"]')) {
    const sc = document.createElement("script");
    sc.src = "greyx-presence.js?v=1";
    sc.onerror = () => console.warn("No se pudo cargar greyx-presence.js");
    document.head.appendChild(sc);
  }
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  const role = () => (G() && G().state.staffRole) || "owner";
  const isOwnerRole = () => role() === "owner";
  const canMod = () => ["owner", "moderator"].includes(role());

  let checkedUid = null;
  let syncing = false;
  const newLogF = () => ({ q:"", action:"", from:"", to:"" });
  const view = { tab:"home", q:"", target:null, list:null, dash:null, live:null, liveRaw:null, peak:null, peakLoaded:false,
                 type:"warning", cat:"other", days:"7", reason:"", msg:"", ok:false, busy:false, log:null, confirm:null,
                 sort:"name", filter:"all", team:null, logF:newLogF() };

  async function ctx() {
    const g = G();
    const fs = await g.fsModule();
    return { g, fs, db: g.fb.db, uid: g.state.user.uid };
  }

  /* ---------- Fechas y estado de sanciones ---------- */
  function fmt(ts) {
    try { return ts.toDate().toLocaleString(); } catch (e) { return "—"; }
  }
  function fmtMs(n) {
    try { return n ? new Date(n).toLocaleString() : "—"; } catch (e) { return "—"; }
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
      const did = [];

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
          did.push("XP " + (s.xp || 0) + " → " + MAX_XP);
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
          did.push(missing.length + " items");
        }

        // Auditoría de las acciones del owner
        if (changed) {
          try {
            const lb = fs.writeBatch(db);
            logAction(lb, fs, db, g, uid, {
              action: "owner_sync", target: uid, targetName: prof.username,
              reason: "Desbloqueo del owner", change: did.join(" · ")
            });
            await lb.commit();
          } catch (e) { console.warn("log sync", e); }
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
  .gxa-stats.three{grid-template-columns:1fr 1fr 1fr}
  .gxa-stat{padding:12px;border-radius:14px;background:#ffffff0a;border:1px solid #ffffff12}
  .gxa-stat b{display:block;font-size:1.25rem}
  .gxa-stats.three .gxa-stat{padding:10px 8px}
  .gxa-stats.three .gxa-stat b{font-size:1.05rem}
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
  .gxa-in input,.gxa-in textarea,.gxa-in select{width:100%;padding:13px 14px;border-radius:14px;border:1.5px solid #ffffff1c;
    background:#0a0d1acc;color:#fff;font:600 16px Inter,system-ui,sans-serif;outline:0;box-sizing:border-box}
  .gxa-in input:focus,.gxa-in textarea:focus,.gxa-in select:focus{border-color:#a78bfa;box-shadow:0 0 0 4px #8b5cf633}
  .gxa-in textarea{resize:none;height:76px;margin-top:8px}
  .gxa-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0 8px}
  .gxa-seg.four{grid-template-columns:repeat(4,1fr);margin-top:0}
  .gxa-seg.tight{margin:6px 0 10px}
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
  .gxa-status.info{background:#8b5cf622;color:#c4b5fd}
  .gxa-msg{padding:10px 12px;border-radius:12px;font-size:.8rem;margin:0 0 12px}
  .gxa-msg.ok{background:#10b98122;border:1px solid #10b98155;color:#6ee7b7}
  .gxa-msg.err{background:#ef444422;border:1px solid #ef444455;color:#fca5a5}
  .gxa-log{padding:11px 12px;border-radius:14px;background:#ffffff08;border:1px solid #ffffff10;margin-bottom:8px;font-size:.78rem}
  .gxa-log b{display:block;margin-bottom:2px}
  .gxa-log small{color:#8e97aa;word-break:break-all}
  .gxa-chip{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:99px;font-size:.62rem;font-weight:800;vertical-align:middle}
  .gxa-chip.active{background:#ef444433;color:#fca5a5}
  .gxa-chip.expired{background:#64748b40;color:#cbd5e1}
  .gxa-chip.lifted{background:#10b98133;color:#6ee7b7}
  .gxa-chip.warn{background:#fbbf2433;color:#fde68a}
  .gxa-chip.staff{background:#8b5cf633;color:#c4b5fd}
  .gxa-prow{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;margin-bottom:8px;border-radius:16px;
    border:1px solid #ffffff14;background:#ffffff08;color:#fff;text-align:left}
  .gxa-prow:active{transform:scale(.98)}
  .gxa-av.sm{width:42px;height:42px;font-size:1.35rem;flex:0 0 42px;border-color:#a78bfa88}
  .gxa-pi{flex:1;min-width:0}
  .gxa-pi strong{display:block;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gxa-pi small{color:#8e97aa;font-size:.68rem}
  .gxa-chev{color:#64748b;font-size:1.2rem}
  .gxa-player small{word-break:break-all}
  .gxa-dot{display:inline-block;width:10px;height:10px;margin-right:8px;border-radius:50%;background:#22c55e;
    box-shadow:0 0 10px #22c55e;animation:gxaPulse 1.6s ease-in-out infinite}
  @keyframes gxaPulse{50%{opacity:.35}}
  .gxa-big{font-size:3rem;font-weight:900;line-height:1;margin:2px 0 8px;color:#4ade80;text-shadow:0 0 18px #22c55e66}
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
                          days:"7", reason:"", msg:"", ok:false, busy:false, log:null, confirm:null, list:null,
                          dash:null, live:null, liveRaw:null, peak:null, peakLoaded:false,
                          sort:"name", filter:"all", team:null, logF:newLogF() });
    const el = document.createElement("div");
    el.id = "gxAdm";
    el.className = "gxa";
    el.addEventListener("click", onClick);
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target && e.target.id === "gxaQ") {
        e.preventDefault(); grab(); doSearch();
      }
    });
    document.body.appendChild(el);
    draw();
    loadDash();
    startLive();
  }

  function closePanel() {
    stopLive();
    const el = document.getElementById("gxAdm");
    if (el) el.remove();
  }

  const $ = id => document.getElementById(id);
  function grab() {
    if ($("gxaQ")) view.q = $("gxaQ").value;
    if ($("gxaR")) view.reason = $("gxaR").value;
    if ($("gxaD")) view.days = $("gxaD").value;
    if ($("gxaLq")) view.logF.q = $("gxaLq").value;
    if ($("gxaLa")) view.logF.action = $("gxaLa").value;
    if ($("gxaLf")) view.logF.from = $("gxaLf").value;
    if ($("gxaLt")) view.logF.to = $("gxaLt").value;
  }

  /* ---------- Dashboard (contadores baratos: 1 lectura por cada 1000 docs) ---------- */
  async function loadDash() {
    view.dash = { loading: true };
    if (view.tab === "home") draw();
    try {
      const { fs, db } = await ctx();
      const n = q => fs.getCountFromServer(q).then(r => r.data().count).catch(e => { console.warn("count", e); return null; });
      const col = x => fs.collection(db, x);
      const now = fs.Timestamp.now();
      const d0 = new Date(); d0.setHours(0, 0, 0, 0);
      const today = fs.Timestamp.fromDate(d0);
      const ago = d => fs.Timestamp.fromMillis(Date.now() - d * 864e5);
      const since = (c, f, t) => n(fs.query(col(c), fs.where(f, ">=", t)));
      const [players, perm, temp, warns, sanc, sancToday, logToday,
             regToday, reg7, reg30, act1, act7, act30] = await Promise.all([
        n(col("users")),
        n(fs.query(col("bans"), fs.where("permanent", "==", true))),
        n(fs.query(col("bans"), fs.where("until", ">", now))),
        n(fs.query(col("sanctions"), fs.where("type", "==", "warning"))),
        n(col("sanctions")),
        since("sanctions", "at", today),
        since("adminLog", "at", today),
        since("users", "createdAt", today),
        since("users", "createdAt", ago(7)),
        since("users", "createdAt", ago(30)),
        since("stats", "updatedAt", ago(1)),
        since("stats", "updatedAt", ago(7)),
        since("stats", "updatedAt", ago(30))
      ]);
      view.dash = {
        players, warns, sanc, sancToday, logToday,
        regToday, reg7, reg30, act1, act7, act30,
        banned: (perm === null || temp === null) ? null : perm + temp,
        at: Date.now()
      };
    } catch (e) {
      console.warn("dash", e);
      view.dash = { error: e.code || "error" };
    }
    if (view.tab === "home") draw();
  }

  /* ---------- Conectados en tiempo real ---------- */
  const live = { unsubs: [], timer: null, tm: null, peakBusy: false, gen: 0 };

  function liveList() {
    const now = Date.now(), P = window.GXPresence;
    const stale = (P && P.stale) || 150000;
    return (view.liveRaw || []).filter(x => now - (x.last || 0) < stale);
  }

  function stopLive() {
    live.gen++;
    live.unsubs.forEach(u => { try { u(); } catch (e) {} });
    live.unsubs = [];
    clearInterval(live.timer); clearTimeout(live.tm);
    view.liveRaw = null; view.live = null; view.peakLoaded = false;
  }

  function setLiveErr(k) {
    clearTimeout(live.tm);
    view.live = { error: k };
    if (view.tab === "home") draw();
  }

  // Espera a que greyx-presence.js esté cargado (o confirma que no existe)
  function loadPresenceScript() {
    return new Promise(res => {
      if (window.GXPresence) return res(true);
      let sc = document.querySelector('script[src*="greyx-presence"]');
      if (!sc) {
        sc = document.createElement("script");
        sc.src = "greyx-presence.js?v=1";
        sc.onload = () => res(!!window.GXPresence);
        sc.onerror = () => res(false);
        document.head.appendChild(sc);
        return;
      }
      let tries = 0;
      const t = setInterval(() => {
        if (window.GXPresence || ++tries > 24) { clearInterval(t); res(!!window.GXPresence); }
      }, 250);
    });
  }

  async function startLive() {
    stopLive();
    const gen = live.gen;
    view.live = null;

    // Si algo se queda colgado, siempre termina mostrando un mensaje
    live.tm = setTimeout(() => {
      if (gen !== live.gen) return;
      if (!view.liveRaw && !(view.live && view.live.error)) setLiveErr("timeout");
    }, 10000);

    const hasFile = await loadPresenceScript();
    if (gen !== live.gen) return;
    if (!hasFile) return setLiveErr("nofile");

    try {
      const P = window.GXPresence;
      const { db, mod } = await P.get();
      if (gen !== live.gen) return;
      if (!db) return setLiveErr("nodb");

      const q = mod.query(mod.ref(db, "presence"), mod.orderByChild("state"), mod.equalTo("online"));
      live.unsubs.push(mod.onValue(q, snap => {
        if (gen !== live.gen) return;
        clearTimeout(live.tm);
        const arr = [];
        snap.forEach(c => { const v = c.val(); if (v) arr.push(Object.assign({ uid: c.key }, v)); });
        view.liveRaw = arr; view.live = { ok: true };
        maybePeak();
        if (view.tab === "home") draw();
      }, err => {
        if (gen !== live.gen) return;
        setLiveErr(err && err.code ? err.code : "error");
      }));

      live.unsubs.push(mod.onValue(mod.ref(db, "meta/peak"), s => {
        if (gen !== live.gen) return;
        view.peak = s.val(); view.peakLoaded = true;
        maybePeak();
        if (view.tab === "home") draw();
      }, () => {}));

      live.timer = setInterval(() => { if (view.tab === "home" && view.liveRaw) draw(); }, 30000);
    } catch (e) {
      console.warn("live", e);
      if (gen === live.gen) setLiveErr(e.code || "error");
    }
  }

  // Récord de jugadores simultáneos (se actualiza mientras algún staff tiene el panel abierto)
  async function maybePeak() {
    if (!view.peakLoaded || live.peakBusy || !view.liveRaw) return;
    const n = liveList().length;
    const best = (view.peak && view.peak.count) || 0;
    if (n < 1 || n <= best) return;
    live.peakBusy = true;
    try {
      const { db, mod } = await window.GXPresence.get();
      await mod.set(mod.ref(db, "meta/peak"), { count: n, at: mod.serverTimestamp() });
    } catch (e) { console.warn("peak", e); }
    live.peakBusy = false;
  }

  function liveHtml() {
    const L = view.live;
    const MSG = {
      nofile: "No se encontró greyx-presence.js. Súbelo a tu repositorio, en la misma carpeta que index.html.",
      nodb: "No se pudo abrir Realtime Database.",
      timeout: "No se pudo conectar. Revisa que la base de datos exista y que la URL en greyx-presence.js sea la correcta.",
      permission: "Sin permiso: agrega tu UID en staff dentro de Realtime Database (valor true)."
    };
    let inner;
    if (L && L.error) {
      const k = /permission/i.test(L.error) ? "permission" : L.error;
      inner = `<p style="margin:0 0 10px;color:#fca5a5">${esc(MSG[k] || "Error: " + L.error)}</p>
        <button class="gxa-btn ghost" data-a="retry" type="button">Reintentar</button>`;
    } else if (!view.liveRaw) {
      inner = `<p style="margin:0">Conectando…</p>`;
    } else {
      const list = liveList();
      const game = list.filter(x => x.screen === "game").length;
      const pk = view.peak && view.peak.count
        ? `${view.peak.count} · ${esc(new Date(view.peak.at).toLocaleString())}` : "—";
      const rows = list.slice(0, 30).map(x => `
        <button class="gxa-prow" data-a="pickc" data-uid="${esc(x.uid)}" type="button">
          <span class="gxa-av sm">${G().avatarEmoji(x.avatar || "a1")}</span>
          <span class="gxa-pi"><strong>@${esc(x.name || "jugador")}</strong>
            <small>${x.screen === "game" ? "En partida" : "En el menú"}</small></span>
          <span class="gxa-chev">›</span>
        </button>`).join("");
      inner = `
        <div class="gxa-big">${list.length}</div>
        <p style="margin:0 0 10px">En partida: <b>${game}</b> · En el menú: <b>${list.length - game}</b><br>
          Récord de simultáneos: <b>${pk}</b></p>
        ${rows}
        ${list.length > 30 ? `<p style="margin:4px 0 0">y ${list.length - 30} más…</p>` : ""}
        ${!list.length ? `<p style="margin:0">Nadie conectado ahora mismo.</p>` : ""}
        <p style="margin:10px 0 0;font-size:.7rem">Solo cuenta jugadores con sesión iniciada. Se actualiza solo.</p>`;
    }
    return `
      <div class="gxa-card">
        <h3><span class="gxa-dot"></span>Conectados ahora</h3>
        ${inner}
      </div>`;
  }

  function dashHtml() {
    const D = view.dash;
    const v = x => (x === null || x === undefined) ? "—" : x;
    let body;
    if (!D || D.loading) body = `<p style="margin:0">Cargando datos…</p>`;
    else if (D.error) body = `<p style="margin:0;color:#fca5a5">No se pudieron cargar (${esc(D.error)}).</p>`;
    else {
      const online = view.liveRaw ? liveList().length : null;
      const off = (online === null || D.players === null || D.players === undefined)
        ? null : Math.max(D.players - online, 0);
      body = `
      <div class="gxa-stats">
        <div class="gxa-stat"><b>${v(D.players)}</b><span>Jugadores registrados</span></div>
        <div class="gxa-stat"><b>${v(online)}</b><span>Conectados ahora</span></div>
        <div class="gxa-stat"><b>${v(off)}</b><span>Desconectados</span></div>
        <div class="gxa-stat"><b>${v(D.banned)}</b><span>Sancionados ahora</span></div>
        <div class="gxa-stat"><b>${v(D.regToday)}</b><span>Registros hoy</span></div>
        <div class="gxa-stat"><b>${v(D.reg7)}</b><span>Registros (7 días)</span></div>
        <div class="gxa-stat"><b>${v(D.reg30)}</b><span>Registros (30 días)</span></div>
        <div class="gxa-stat"><b>${v(D.act1)}</b><span>Activos 24 h</span></div>
        <div class="gxa-stat"><b>${v(D.act7)}</b><span>Activos 7 días</span></div>
        <div class="gxa-stat"><b>${v(D.act30)}</b><span>Activos 30 días</span></div>
        <div class="gxa-stat"><b>${v(D.warns)}</b><span>Advertencias emitidas</span></div>
        <div class="gxa-stat"><b>${v(D.sanc)}</b><span>Sanciones en historial</span></div>
        <div class="gxa-stat"><b>${v(D.sancToday)}</b><span>Sanciones hoy</span></div>
        <div class="gxa-stat"><b>${v(D.logToday)}</b><span>Acciones admin hoy</span></div>
      </div>`;
    }
    return `
      <div class="gxa-card">
        <h3>Dashboard</h3>
        <p>Cifras reales de tu base de datos.</p>
        ${body}
        <div style="height:10px"></div>
        <button class="gxa-btn ghost" data-a="refresh" type="button" ${D && D.loading ? "disabled" : ""}>Actualizar</button>
      </div>`;
  }

  function homeHtml() {
    const g = G(), s = g.state, p = s.profile || {};
    const lv = s.xpLoaded ? s.xpLevel : "—";
    const owner = isOwnerRole();
    return liveHtml() + dashHtml() + `
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

  /* ---------- Directorio ---------- */
  function rowHtml(p) {
    const g = G();
    let sub;
    if (p.fromUsers) {
      sub = "Registro: " + (p.createdAt ? fmt(p.createdAt) : "—");
    } else {
      const lv = g.xpLevelFromTotal(p.xp || 0);
      sub = `NV. ${lv} · 🏆 ${p.trophies || 0} · ${p.wins || 0} victorias · ${p.played || 0} partidas`;
    }
    if (p.banType) sub = (p.banType === "permanent" ? "Baneo permanente" : p.banType === "temp" ? "Suspensión temporal" : "Aviso") + " · " + sub;
    return `
      <button class="gxa-prow" data-a="pick" data-uid="${esc(p.uid)}" type="button">
        <span class="gxa-av sm">${g.avatarEmoji(p.avatar || "a1")}</span>
        <span class="gxa-pi"><strong>@${esc(p.username || "jugador")}</strong>
          <small>${esc(sub)}</small></span>
        <span class="gxa-chev">›</span>
      </button>`;
  }

  function directoryHtml() {
    const L = view.list || newList();
    const searching = L.mode === "search";
    let rows;
    if (L.error) rows = `<p style="margin:0;color:#fca5a5;font-size:.8rem">No se pudo cargar (${esc(L.error)}).</p>`;
    else if (!L.items.length && L.loading) rows = `<p style="margin:0;color:#9aa3b8;font-size:.8rem">Cargando…</p>`;
    else if (!L.items.length) {
      const m = searching ? "No se encontró ningún jugador."
        : view.filter === "banned" ? "No hay jugadores sancionados ahora."
        : view.filter === "online" ? "Nadie conectado ahora."
        : "Aún no hay jugadores.";
      rows = `<p style="margin:0;color:#9aa3b8;font-size:.8rem">${m}</p>`;
    } else rows = L.items.map(rowHtml).join("");

    const sortBtns = SORT_LIST.map(([k, n]) =>
      `<button type="button" data-a="sort" data-v="${k}" class="${!searching && view.sort === k ? "on" : ""}">${n}</button>`).join("");
    const filterBtns = FILTER_LIST.map(([k, n]) =>
      `<button type="button" data-a="filter" data-v="${k}" class="${!searching && view.filter === k ? "on" : ""}">${n}</button>`).join("");
    const sortActive = !searching && view.filter === "all";

    return `
      <div class="gxa-card">
        <h3>Buscar jugador</h3>
        <p>Escribe su nombre, el inicio de su nombre o su UID.</p>
        <div class="gxa-row">
          <input id="gxaQ" type="text" placeholder="@usuario" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(view.q)}">
          <button class="gxa-btn" data-a="search" type="button">Buscar</button>
        </div>
        ${searching ? `<div style="height:10px"></div><button class="gxa-btn ghost" data-a="clear" type="button">Ver todos los jugadores</button>` : ""}
        <span class="gxa-lbl">Mostrar</span>
        <div class="gxa-seg tight">${filterBtns}</div>
        <span class="gxa-lbl">Ordenar por${sortActive ? "" : " (solo en “Todos”)"}</span>
        <div class="gxa-seg tight" style="${sortActive ? "" : "opacity:.45"}">${sortBtns}</div>
      </div>
      <div class="gxa-card">
        <h3>${searching ? "Resultados" : "Jugadores"}</h3>
        <p>${searching ? "Toca un jugador para ver su ficha." : "Toca uno para ver su ficha completa."}</p>
        ${rows}
        ${!L.done && L.items.length ? `<div style="height:6px"></div><button class="gxa-btn ghost" data-a="more" type="button" ${L.loading ? "disabled" : ""}>${L.loading ? "Cargando…" : "Cargar más"}</button>` : ""}
      </div>`;
  }

  /* ---------- Ficha del jugador ---------- */
  function profileHtml(t) {
    if (!t.statsLoaded) {
      return `<div class="gxa-card"><h3>Perfil</h3><p style="margin:0">Cargando perfil…</p></div>`;
    }
    const g = G(), s = t.stats;
    const v = x => (x === null || x === undefined) ? "—" : x;
    const on = liveList().find(x => x.uid === t.uid);
    const conn = on ? (on.screen === "game" ? "En partida" : "En el menú") : "Desconectado";
    const lastConn = on ? "Ahora" : (t.presence && t.presence.last ? fmtMs(t.presence.last) : "—");
    const wr = s && s.played ? Math.round((s.wins || 0) / s.played * 100) + "%" : "—";

    const grid = s ? `
      <div class="gxa-stats three">
        <div class="gxa-stat"><b>${g.xpLevelFromTotal(s.xp || 0)}</b><span>Nivel</span></div>
        <div class="gxa-stat"><b>${v(s.xp)}</b><span>XP total</span></div>
        <div class="gxa-stat"><b>${v(s.trophies)}</b><span>Trofeos</span></div>
        <div class="gxa-stat"><b>${v(s.played)}</b><span>Partidas</span></div>
        <div class="gxa-stat"><b>${v(s.wins)}</b><span>Victorias</span></div>
        <div class="gxa-stat"><b>${v(s.losses)}</b><span>Derrotas</span></div>
        <div class="gxa-stat"><b>${wr}</b><span>% victorias</span></div>
        <div class="gxa-stat"><b>${v(s.streak)} / ${v(s.bestStreak)}</b><span>Racha / mejor</span></div>
        <div class="gxa-stat"><b>${v(s.captures)}</b><span>Capturas</span></div>
        <div class="gxa-stat"><b>${v(s.goals)}</b><span>Metas</span></div>
        <div class="gxa-stat"><b>${v(t.items)}</b><span>Items</span></div>
        <div class="gxa-stat"><b>${v(t.ach)}</b><span>Logros</span></div>
      </div>` : `<p style="margin:0 0 12px">Este jugador aún no tiene estadísticas (no ha terminado ninguna partida).</p>`;

    return `
      <div class="gxa-card">
        <h3>Perfil</h3>
        <p>Estado: <b>${esc(conn)}</b><br>
          Última conexión: <b>${esc(lastConn)}</b><br>
          Cuenta creada: <b>${t.user && t.user.createdAt ? esc(fmt(t.user.createdAt)) : "—"}</b><br>
          Última partida: <b>${s && s.updatedAt ? esc(fmt(s.updatedAt)) : "—"}</b></p>
        ${grid}
      </div>`;
  }

  function staffCardHtml(t) {
    if (!isOwnerRole() || !t.statsLoaded) return "";
    const me = G().state.user.uid;
    if (t.uid === me) return "";
    if (t.staffRole === "owner") {
      return `<div class="gxa-card"><h3>Rol de staff</h3><p style="margin:0">Es owner. Solo se gestiona desde la consola de Firebase.</p></div>`;
    }
    const cur = t.staffRole;
    const btns = GRANTABLE.filter(([k]) => k !== cur).map(([k, n]) => {
      const key = "role:" + k;
      return `<button class="gxa-btn ${view.confirm === key ? "confirm" : "ghost"}" data-a="role" data-v="${k}" type="button" ${view.busy ? "disabled" : ""}
        style="margin-bottom:8px">${view.confirm === key ? "¿Confirmas? Toca otra vez" : (cur ? "Cambiar a " : "Hacer ") + n}</button>`;
    }).join("");
    const rm = cur ? `<button class="gxa-btn ${view.confirm === "staffrm" ? "confirm" : "red"}" data-a="staffrm" type="button" ${view.busy ? "disabled" : ""}>${view.confirm === "staffrm" ? "¿Confirmas? Toca otra vez" : "Quitar del staff"}</button>` : "";
    return `
      <div class="gxa-card">
        <h3>Rol de staff</h3>
        <p>${cur ? "Rol actual: <b>" + esc(ROLE_NAME[cur] || cur) + "</b>." : "Este jugador no es staff."}
          Los cambios quedan en el registro.</p>
        ${btns}${rm}
      </div>`;
  }

  function banHtml() {
    const t = view.target;
    if (!t) return directoryHtml();

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

    const isStaffTarget = !!t.staffRole;
    const form = (canMod() && !isStaffTarget) ? `
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
          ${active ? `<div style="height:10px"></div><button class="gxa-btn ${view.confirm === "lift" ? "confirm" : "ghost"}" data-a="lift" type="button" ${view.busy ? "disabled" : ""}>${liftLbl}</button>` : ""}`
      : (isStaffTarget ? `<div class="gxa-status info">Es miembro del staff (${esc(ROLE_NAME[t.staffRole] || t.staffRole)}): no se puede sancionar.</div>` : "");

    return `
      <button class="gxa-btn ghost" data-a="unpick" type="button" style="margin-bottom:12px">← Volver a la lista</button>
      <div class="gxa-card">
        <div class="gxa-player">
          <span class="gxa-av">${G().avatarEmoji(t.avatar)}</span>
          <div><strong>@${esc(t.username)}</strong><small>${esc(t.uid)}</small></div>
        </div>
        ${status}
        ${form}
      </div>
      ${profileHtml(t)}
      ${staffCardHtml(t)}
      <div class="gxa-card">
        <h3>Historial de @${esc(t.username)}</h3>
        <p>Todas las advertencias y sanciones, de la más reciente a la más antigua.</p>
        ${historyHtml(t)}
      </div>`;
  }

  /* ---------- Equipo (solo owner) ---------- */
  function teamHtml() {
    if (view.team === null) return `<div class="gxa-card"><p style="margin:0">Cargando equipo…</p></div>`;
    const me = G().state.user.uid;
    const rows = view.team.map(m => {
      const key = "revoke:" + m.uid;
      const canRm = m.role !== "owner" && m.uid !== me;
      return `
      <div class="gxa-log">
        <b>@${esc(m.username || "sin nombre")}<span class="gxa-chip staff">${esc(ROLE_NAME[m.role] || m.role)}</span>${m.uid === me ? `<span class="gxa-chip warn">TÚ</span>` : ""}</b>
        <small>${esc(m.uid)}</small>
        ${canRm ? `<div style="height:8px"></div><button class="gxa-btn ${view.confirm === key ? "confirm" : "ghost"}" data-a="revoke" data-uid="${esc(m.uid)}" type="button" ${view.busy ? "disabled" : ""}>${view.confirm === key ? "¿Confirmas? Toca otra vez" : "Quitar del staff"}</button>` : ""}
      </div>`;
    }).join("");
    return `
      <div class="gxa-card">
        <h3>Equipo de staff</h3>
        <p>Para añadir a alguien: pestaña Jugadores → abre su ficha → “Rol de staff”.
          Para que un moderador o analista vea los conectados en tiempo real, agrega también su UID en
          <b>staff</b> dentro de Realtime Database (valor <b>true</b>).</p>
        ${rows || `<p style="margin:0">No hay miembros.</p>`}
      </div>`;
  }

  async function loadTeam() {
    view.team = null;
    try {
      const { fs, db } = await ctx();
      const sn = await fs.getDocs(fs.collection(db, "admins"));
      view.team = await Promise.all(sn.docs.map(async d => {
        const x = d.data();
        let name = x.username || "";
        if (!name) {
          const p = await fs.getDoc(fs.doc(db, "publicProfiles", d.id)).catch(() => null);
          if (p && p.exists()) name = p.data().username || "";
        }
        return { uid: d.id, role: x.role || "owner", username: name };
      }));
    } catch (e) {
      console.warn("team", e);
      view.team = [];
      view.msg = "No se pudo cargar el equipo (" + (e.code || "error") + ").";
      view.ok = false;
    }
    if (view.tab === "team") draw();
  }

  async function setStaffRole(t, newRole) {
    if (!isOwnerRole() || !t) return;
    view.busy = true; view.msg = ""; draw();
    try {
      const { g, fs, db, uid } = await ctx();
      const old = t.staffRole || "ninguno";
      const batch = fs.writeBatch(db);
      batch.set(fs.doc(db, "admins", t.uid), {
        role: newRole, by: uid, at: fs.serverTimestamp(), username: t.username
      });
      logAction(batch, fs, db, g, uid, {
        action: "role:" + newRole, target: t.uid, targetName: t.username,
        reason: "Cambio de rol de staff", change: old + " → " + newRole
      });
      await batch.commit();
      t.staffRole = newRole;
      view.team = null;
      view.busy = false;
      say("@" + t.username + " ahora es " + (ROLE_NAME[newRole] || newRole) + ". Agrega su UID en staff (Realtime Database) para que vea los conectados.", true);
    } catch (e) {
      console.warn(e);
      view.busy = false;
      say("No se pudo cambiar el rol (" + (e.code || "error") + "). ¿Publicaste las reglas nuevas?", false);
    }
  }

  async function removeStaff(uidT, name) {
    if (!isOwnerRole()) return;
    view.busy = true; view.msg = ""; draw();
    try {
      const { g, fs, db, uid } = await ctx();
      const batch = fs.writeBatch(db);
      batch.delete(fs.doc(db, "admins", uidT));
      logAction(batch, fs, db, g, uid, {
        action: "staff_remove", target: uidT, targetName: name || "jugador",
        reason: "Staff retirado", change: "staff → jugador"
      });
      await batch.commit();
      if (view.target && view.target.uid === uidT) view.target.staffRole = null;
      view.team = null;
      view.busy = false;
      say("Staff retirado.", true);
      if (view.tab === "team") loadTeam();
    } catch (e) {
      console.warn(e);
      view.busy = false;
      say("No se pudo quitar (" + (e.code || "error") + ").", false);
    }
  }

  /* ---------- Registro con filtros ---------- */
  const actionLabel = a => {
    a = String(a || "");
    if (a === "warning") return "Advertencia";
    if (a === "temp") return "Sanción temporal";
    if (a === "permanent") return "Sanción permanente";
    if (a === "unban") return "Sanción retirada";
    if (a === "owner_sync") return "Sync del owner";
    if (a === "staff_remove") return "Staff retirado";
    if (a.startsWith("role:")) return "Rol: " + (ROLE_NAME[a.slice(5)] || a.slice(5));
    return a;
  };

  function filteredLog() {
    const F = view.logF;
    const q = F.q.trim().toLowerCase().replace(/^@+/, "");
    const from = F.from ? new Date(F.from + "T00:00:00").getTime() : 0;
    const to = F.to ? new Date(F.to + "T23:59:59").getTime() : Infinity;
    return view.log.filter(l => {
      const t = ms(l.at);
      const act = String(l.action || "");
      return (!F.action || act === F.action || (F.action === "role" && act.startsWith("role:")))
        && (!q || String(l.adminName || "").toLowerCase().includes(q) || String(l.targetName || "").toLowerCase().includes(q))
        && t >= from && t <= to;
    });
  }

  function logHtml() {
    const F = view.logF;
    const form = `
      <div class="gxa-card">
        <h3>Filtrar registro</h3>
        <p>Busca por admin, jugador, acción o fecha. Se revisan las últimas 200 acciones.</p>
        <input id="gxaLq" type="text" placeholder="Admin o jugador" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(F.q)}">
        <span class="gxa-lbl">Acción</span>
        <select id="gxaLa">${LOG_ACTIONS.map(([k, n]) => `<option value="${k}" ${F.action === k ? "selected" : ""}>${n}</option>`).join("")}</select>
        <span class="gxa-lbl">Desde</span>
        <input id="gxaLf" type="date" value="${esc(F.from)}">
        <span class="gxa-lbl">Hasta</span>
        <input id="gxaLt" type="date" value="${esc(F.to)}">
        <div style="height:12px"></div>
        <div class="gxa-row">
          <button class="gxa-btn" data-a="logf" type="button" style="flex:1">Filtrar</button>
          <button class="gxa-btn ghost" data-a="logclear" type="button">Limpiar</button>
        </div>
      </div>`;
    if (view.log === null) return form + `<div class="gxa-card"><p style="margin:0">Cargando…</p></div>`;
    const list = filteredLog();
    if (!view.log.length) return form + `<div class="gxa-card"><p style="margin:0">Aún no hay acciones registradas.</p></div>`;
    if (!list.length) return form + `<div class="gxa-card"><p style="margin:0">Ninguna acción coincide con el filtro.</p></div>`;
    return form + `<p style="color:#9aa3b8;font-size:.75rem;margin:0 0 8px">${list.length} resultado${list.length === 1 ? "" : "s"}${list.length > 100 ? " (mostrando 100)" : ""}</p>` +
      list.slice(0, 100).map(l => `
      <div class="gxa-log">
        <b>${esc(actionLabel(l.action))} · @${esc(l.targetName || "jugador")}</b>
        ${esc(l.reason || "")}<br>
        <small>${esc(fmt(l.at))} · por ${esc(l.adminName || "admin")}${l.change ? " · " + esc(l.change) : ""}</small>
      </div>`).join("");
  }

  function draw() {
    const el = document.getElementById("gxAdm");
    if (!el) return;
    const tabs = [["home", "Resumen"], ["ban", "Jugadores"], ["log", "Registro"]];
    if (canMod()) tabs.push(["mail", "Correo"]);
    if (isOwnerRole()) tabs.push(["team", "Equipo"]);

    if (!tabs.some(t => t[0] === view.tab)) view.tab = "home";
    const body = view.tab === "home" ? homeHtml()
      : view.tab === "ban" ? banHtml()
            : view.tab === "mail" ? window.GXMailAdmin.html({ isOwner: isOwnerRole() })
      : view.tab === "team" ? teamHtml()

      : logHtml();
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
    if (window.GXMailAdmin) window.GXMailAdmin.grab();
    if (!["apply", "lift", "role", "staffrm", "revoke"].includes(a)) view.confirm = null;

    if (a === "close") { closePanel(); return; }
    if (a === "tab") {
      view.tab = b.dataset.v; view.msg = "";
      if (view.tab === "log") loadLog();
      if (view.tab === "home" && !view.dash) loadDash();
      if (view.tab === "ban" && !view.list) { view.list = newList(); loadList(true); }
      if (view.tab === "team") loadTeam();
      draw(); return;
    }
    if (a === "type") { view.type = b.dataset.v; draw(); return; }
    if (a === "cat") { view.cat = b.dataset.v; draw(); return; }
    if (a === "refresh") { loadDash(); return; }
    if (a === "retry") { view.live = null; draw(); startLive(); return; }
    if (a === "sync") {
      view.busy = true; view.msg = ""; draw();
      const r = await syncOwner(false);
      view.busy = false; say(r.text, r.changed || /Ya tienes/.test(r.text)); return;
    }
    if (a === "search") { await doSearch(); return; }
    if (a === "clear") { view.q = ""; view.list = newList(); loadList(true); draw(); return; }
    if (a === "more") { loadList(false); return; }
    if (a === "sort") { view.sort = b.dataset.v; view.filter = "all"; view.q = ""; view.list = newList(); loadList(true); draw(); return; }
    if (a === "filter") { view.filter = b.dataset.v; view.q = ""; view.list = newList(); loadList(true); draw(); return; }
    if (a === "pick") { await pickPlayer(b.dataset.uid); return; }
    if (a === "pickc") {
      const it = liveList().find(x => x.uid === b.dataset.uid);
      if (!it) return;
      view.tab = "ban"; view.q = "";
      view.list = newList(); view.list.mode = "search"; view.list.done = true;
      view.list.items = [{ uid: it.uid, username: it.name || "jugador", avatar: it.avatar || "a1", xp: 0, trophies: 0, played: 0 }];
      await pickPlayer(it.uid); return;
    }
    if (a === "unpick") { view.target = null; view.msg = ""; view.confirm = null; draw(); return; }
    if (a === "logf") { draw(); return; }
    if (a === "logclear") { view.logF = newLogF(); draw(); return; }

        // Correo (owner y moderador; las reglas validan el rol en el servidor)
    if (a.startsWith("m-")) {
      if (!canMod() || !window.GXMailAdmin) return;
      await window.GXMailAdmin.act(a, b, { draw, ctx, logAction, isOwner: isOwnerRole() });
      return;
    }

    const ask = (title, text, danger) => window.GXConfirm
      ? window.GXConfirm({ title, text, ok: "Aceptar", danger })
      : Promise.resolve(true);

    // Gestión de equipo (solo owner)
    if (a === "role") {
      if (!isOwnerRole() || view.busy) return;
      const n = (GRANTABLE.find(x => x[0] === b.dataset.v) || [])[1] || b.dataset.v;
      if (!(await ask("Cambiar rol", "¿Asignar el rol " + n + " a @" + view.target.username + "?", false))) return;
      await setStaffRole(view.target, b.dataset.v); return;
    }
    if (a === "staffrm") {
      if (!isOwnerRole() || view.busy) return;
      if (!(await ask("Quitar del staff", "¿Quitar a @" + view.target.username + " del staff?", true))) return;
      await removeStaff(view.target.uid, view.target.username); return;
    }
    if (a === "revoke") {
      if (!isOwnerRole() || view.busy) return;
      const m = (view.team || []).find(x => x.uid === b.dataset.uid);
      if (!(await ask("Quitar del staff", "¿Quitar a @" + ((m && m.username) || "este miembro") + " del staff?", true))) return;
      await removeStaff(b.dataset.uid, m && m.username); return;
    }

    if (!canMod()) return;

    if (a === "apply") {
      if (view.busy) return;
      if (!(await ask("Aplicar sanción", "¿Aplicar esta sanción a @" + view.target.username + "?", true))) return;
      await applySanction(); return;
    }
    if (a === "lift") {
      if (view.busy) return;
      if (!(await ask("Retirar sanción", "¿Retirar la sanción a @" + view.target.username + "?", false))) return;
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

  // Estadísticas, fecha de creación, items, logros, presencia y rol de staff
  async function loadProfile(t) {
    try {
      const { fs, db } = await ctx();
      const cnt = q => fs.getCountFromServer(q).then(r => r.data().count).catch(() => null);
      const [st, us, items, ach, adm] = await Promise.all([
        fs.getDoc(fs.doc(db, "stats", t.uid)).catch(() => null),
        fs.getDoc(fs.doc(db, "users", t.uid)).catch(() => null),
        cnt(fs.collection(db, "inventory", t.uid, "items")),
        cnt(fs.collection(db, "achievements", t.uid, "items")),
        isOwnerRole() ? fs.getDoc(fs.doc(db, "admins", t.uid)).catch(() => null) : Promise.resolve(null)
      ]);
      t.stats = st && st.exists() ? st.data() : null;
      t.user = us && us.exists() ? us.data() : null;
      t.items = items; t.ach = ach;
      t.staffRole = adm && adm.exists() ? (adm.data().role || "owner") : null;
      try {
        const P = window.GXPresence;
        if (P) {
          const r = await P.get();
          if (r.db) t.presence = (await r.mod.get(r.mod.ref(r.db, "presence/" + t.uid))).val();
        }
      } catch (e) { /* sin permiso o sin datos: se muestra "—" */ }
    } catch (e) { console.warn("profile", e); }
    t.statsLoaded = true;
  }

  const PAGE = 20;
  function newList() {
    return { mode:"dir", items:[], last:null, done:false, loading:false, error:"" };
  }
  const toItem = (id, d) => ({
    uid: id, username: d.username || "jugador", avatar: d.avatar || "a1",
    xp: d.xp || 0, trophies: d.trophies || 0, played: d.played || 0, wins: d.wins || 0
  });
  const toUserItem = (id, d) => ({
    uid: id, username: d.username || "jugador", avatar: d.avatar || "a1",
    fromUsers: true, createdAt: d.createdAt || null
  });

  async function loadBanned(fs, db) {
    const col = fs.collection(db, "bans");
    const [p, t] = await Promise.all([
      fs.getDocs(fs.query(col, fs.where("permanent", "==", true), fs.limit(50))),
      fs.getDocs(fs.query(col, fs.where("until", ">", fs.Timestamp.now()), fs.limit(50)))
    ]);
    const ids = new Map();
    [...p.docs, ...t.docs].forEach(d => ids.set(d.id, d.data()));
    return Promise.all([...ids.keys()].map(async id => {
      const s = await fs.getDoc(fs.doc(db, "publicProfiles", id)).catch(() => null);
      const it = s && s.exists() ? toItem(id, s.data()) : toItem(id, { username: "jugador" });
      it.banType = ids.get(id).type;
      return it;
    }));
  }

  // Directorio: 20 por página, con orden y filtro
  async function loadList(reset) {
    if (!view.list) view.list = newList();
    const L = view.list;
    if (L.loading || L.mode !== "dir") return;
    if (reset) { L.items = []; L.last = null; L.done = false; }
    if (L.done) return;
    L.loading = true; L.error = ""; draw();
    try {
      const { fs, db } = await ctx();
      if (view.filter === "online") {
        L.items = liveList().map(x => toItem(x.uid, { username: x.name, avatar: x.avatar }));
        L.done = true;
      } else if (view.filter === "banned") {
        L.items = await loadBanned(fs, db);
        L.done = true;
      } else {
        const [field, dir] = SORTS[view.sort] || SORTS.name;
        const fromUsers = field === "createdAt";
        const col = fs.collection(db, fromUsers ? "users" : "publicProfiles");
        const parts = [fs.orderBy(field, dir)];
        if (L.last) parts.push(fs.startAfter(L.last));
        parts.push(fs.limit(PAGE));
        const sn = await fs.getDocs(fs.query(col, ...parts));
        sn.docs.forEach(d => L.items.push(fromUsers ? toUserItem(d.id, d.data()) : toItem(d.id, d.data())));
        if (sn.docs.length) L.last = sn.docs[sn.docs.length - 1];
        if (sn.docs.length < PAGE) L.done = true;
      }
    } catch (e) {
      console.warn("loadList", e);
      L.error = e.code || "error";
    }
    L.loading = false;
    if (view.tab === "ban") draw();
  }

  // Búsqueda: por inicio del nombre, nombre exacto o UID
  async function doSearch() {
    const raw = view.q.trim().replace(/^@+/, "");
    if (!raw) { view.list = newList(); loadList(true); draw(); return; }
    const L = { mode:"search", items:[], last:null, done:true, loading:true, error:"" };
    view.list = L; view.target = null; view.msg = ""; draw();
    try {
      const { fs, db } = await ctx();
      const lower = raw.toLowerCase();
      const map = new Map();

      // 1) Por UID
      if (raw.length >= 20 && /^[A-Za-z0-9]+$/.test(raw)) {
        const p = await fs.getDoc(fs.doc(db, "publicProfiles", raw)).catch(() => null);
        if (p && p.exists()) map.set(p.id, toItem(p.id, p.data()));
      }

      // 2) Por inicio del nombre (devuelve varios)
      try {
        const sn = await fs.getDocs(fs.query(
          fs.collection(db, "publicProfiles"),
          fs.where("usernameLower", ">=", lower),
          fs.where("usernameLower", "<=", lower + "\uf8ff"),
          fs.limit(30)
        ));
        sn.docs.forEach(d => { if (!map.has(d.id)) map.set(d.id, toItem(d.id, d.data())); });
      } catch (e) { console.warn("prefix", e); }

      // 3) Nombre exacto en /usernames (por si no tiene perfil público)
      const n = await fs.getDoc(fs.doc(db, "usernames", lower)).catch(() => null);
      if (n && n.exists() && !map.has(n.data().uid)) {
        const d = n.data();
        map.set(d.uid, toItem(d.uid, { username: d.username || raw, avatar: d.avatar }));
      }

      // 4) UID sin perfil público
      if (!map.size && raw.length >= 20 && /^[A-Za-z0-9]+$/.test(raw)) {
        map.set(raw, toItem(raw, { username: "jugador" }));
      }

      L.items = [...map.values()];
    } catch (e) {
      console.warn("doSearch", e);
      L.error = e.code || "error";
    }
    L.loading = false;
    draw();
  }

  async function pickPlayer(uid) {
    const L = view.list;
    const it = L && L.items.find(x => x.uid === uid);
    if (!it) return;
    view.target = { uid: it.uid, username: it.username, avatar: it.avatar, ban: null, history: null, statsLoaded: false, staffRole: null };
    view.msg = ""; view.confirm = null; view.reason = "";
    const t = view.target;
    draw();
    try { await refreshTarget(t); }
    catch (e) { console.warn(e); say("No se pudo cargar la ficha (" + (e.code || "error") + ").", false); return; }
    draw();
    await loadProfile(t);
    if (view.target === t) draw();
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
      const q = fs.query(fs.collection(db, "adminLog"), fs.orderBy("at", "desc"), fs.limit(200));
      const sn = await fs.getDocs(q);
      view.log = sn.docs.map(d => d.data());
    } catch (e) {
      console.warn(e);
      view.log = [];
    }
    if (view.tab === "log") draw();
  }
})();
