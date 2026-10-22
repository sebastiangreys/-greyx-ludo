/* GREYX EXTRAS — perfil, logros, inventario, recompensas, ranking, admin.
   Requiere: greyx-core.js, greyx-catalog.js y el puente window.GX del HTML.
   Toda la seguridad real está en firestore.rules; aquí solo se usa la UI. */
(function () {
  "use strict";
  const C = window.GreyxCatalog;
  const X = () => window.GX;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ITEM = id => C.ITEMS.find(i => i.id === id);
  const fmt = n => Number(n || 0).toLocaleString("es");

  let D = null;            // datos del jugador actual
  let loadedUid = null;
  const stack = [];
  const ui = { custTab: "frame", achCat: "first", busy: false, msg: "", adm: null };

  /* ---------------- CSS ---------------- */
  const st = document.createElement("style");
  st.textContent = `
.gxx{position:fixed;inset:0;z-index:200;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#F7F1E6;
 background:radial-gradient(circle at 50% 0,#7C3AED55,transparent 55%),linear-gradient(180deg,#11132E,#070a1c);
 padding:calc(12px + env(safe-area-inset-top,0px)) 14px calc(110px + env(safe-area-inset-bottom,0px));animation:gxxIn .3s ease both}
@keyframes gxxIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.gxx-in{max-width:460px;margin:0 auto}
.gxx-top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;margin-bottom:14px}
.gxx-top h1{margin:0;text-align:center;font-size:1.15rem;font-weight:900}
.gxx-b{width:42px;height:42px;border-radius:14px;border:1px solid #ffffff22;background:#263B7899;color:#fff;font-size:1.1rem}
.gxx button{font:inherit;cursor:pointer}
.gxx-card{border:1px solid #ffffff18;border-radius:20px;background:linear-gradient(160deg,#1b2150ee,#0e1230ee);padding:14px;margin-bottom:12px;box-shadow:0 10px 26px #0007}
.gxx-h{font:800 .68rem monospace;letter-spacing:.14em;color:#A78BFA;margin:0 0 10px;text-transform:uppercase}
.pc{border-radius:24px;padding:20px 14px;text-align:center;border:1px solid #ffffff22;margin-bottom:12px;box-shadow:0 14px 34px #000a}
.pc h2{margin:10px 0 2px;font-size:1.25rem}.pc .pt{color:#D9A928;font-weight:800;font-size:.8rem;min-height:1em}
.pc .plv{font:900 .75rem monospace;letter-spacing:.14em;margin-top:10px;color:#A78BFA}
.xpb{height:10px;border-radius:9px;background:#0008;overflow:hidden;margin:6px 0 4px;border:1px solid #ffffff22}
.xpb i{display:block;height:100%;background:linear-gradient(90deg,#7C3AED,#A78BFA,#D9A928);transition:width .8s ease}
.pc small{color:#c9cdea;font-size:.7rem}
.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.sg div{background:#0006;border-radius:14px;padding:10px 4px}.sg b{display:block;font-size:1.05rem}.sg span{font-size:.58rem;color:#aab3d6;letter-spacing:.06em}
.feat{display:flex;gap:8px;justify-content:center;margin-top:12px}.feat span{width:42px;height:42px;border-radius:12px;background:#0007;display:grid;place-items:center;font-size:1.3rem;border:1px solid #D9A92866}
.gxav{width:var(--s);height:var(--s);flex:none;border-radius:50%;padding:3px;display:inline-grid;place-items:center;background:linear-gradient(135deg,var(--c1),var(--c2))}
.gxav i{font-style:normal;width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:#11132E;font-size:calc(var(--s)*.5)}
.fx-aura{box-shadow:0 0 18px #A78BFA,0 0 36px #7C3AED88;animation:gxAura 2s ease-in-out infinite}
.fx-spark{box-shadow:0 0 14px #D9A928,0 0 28px #D9A92877;animation:gxAura 1.6s ease-in-out infinite}
@keyframes gxAura{50%{filter:brightness(1.35)}}
.mn{display:grid;gap:8px}.mn button,.btn{border:1px solid #ffffff1f;border-radius:16px;background:#ffffff0c;color:#fff;padding:14px;text-align:left;font-weight:800;display:flex;align-items:center;gap:12px}
.mn button small{display:block;color:#9aa3c8;font-weight:600;font-size:.7rem}
.btn{justify-content:center;background:linear-gradient(135deg,#A78BFA,#7C3AED);box-shadow:0 5px 0 #3b1d8f;text-align:center;width:100%}
.btn.sm{width:auto;padding:8px 14px;font-size:.75rem;border-radius:12px;box-shadow:0 3px 0 #3b1d8f}
.btn.gh{background:#ffffff10;box-shadow:none;border:1px solid #ffffff22}.btn.dn{background:linear-gradient(135deg,#E53935,#991b1b);box-shadow:0 4px 0 #5b1010}
.btn:disabled{opacity:.45}
.tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:10px}.tabs button{flex:none;border:1px solid #ffffff1f;background:#ffffff0a;color:#aab3d6;border-radius:99px;padding:8px 13px;font-weight:800;font-size:.72rem}
.tabs button.on{background:linear-gradient(135deg,#A78BFA,#7C3AED);color:#fff;border-color:#C4B5FD}
.row{display:flex;align-items:center;gap:12px;padding:11px;border-radius:16px;background:#0005;border:1px solid #ffffff12;margin-bottom:8px}
.row.lock{opacity:.55}.row.eq{border-color:#D9A928;box-shadow:0 0 16px #D9A92833}
.row .t{flex:1;min-width:0}.row .t b{display:block;font-size:.85rem}.row .t small{color:#9aa3c8;font-size:.68rem;line-height:1.3;display:block}
.ric{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:1.5rem;background:#ffffff10;flex:none;border:2px solid var(--rc,#fff3)}
.rar{font:800 .58rem monospace;letter-spacing:.08em;color:var(--rc)}
.pb{height:6px;border-radius:5px;background:#0008;margin-top:6px;overflow:hidden}.pb i{display:block;height:100%;background:linear-gradient(90deg,#7C3AED,#D9A928)}
.pod{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:8px;align-items:end;margin-bottom:12px}
.pod .p{text-align:center;border-radius:18px;padding:12px 4px;background:#ffffff0d;border:1px solid #ffffff1a}.pod .p.g{border-color:#D9A928;box-shadow:0 0 22px #D9A92855;padding-bottom:18px}
.pod b{display:block;font-size:.75rem;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pod small{color:#D9A928;font-weight:800}
.inp{width:100%;padding:13px 14px;border-radius:14px;border:1px solid #ffffff22;background:#0a0d1acc;color:#fff;font-size:16px;margin-bottom:8px;font-family:inherit}
.msg{padding:10px 12px;border-radius:12px;background:#368F6025;border:1px solid #368F6070;color:#8be3b3;font-size:.8rem;margin-bottom:10px}.msg.er{background:#E5393520;border-color:#E5393560;color:#ff9a9a}
.gxx-ban{position:fixed;inset:0;z-index:999990;display:grid;place-items:center;padding:22px;background:#070a1cf5;color:#fff;text-align:center}
.gxx-ban>div{max-width:380px}.gxx-ban h2{color:#E53935}
.gxx-cel{position:fixed;inset:0;z-index:999991;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 50% 40%,#7C3AED88,#070a1cf2 70%);text-align:center;color:#fff;overflow:hidden}
.gxx-cel .cc{position:relative;max-width:340px;animation:gxxPop .6s cubic-bezier(.2,.9,.3,1.3) both}
@keyframes gxxPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.gxx-cel .big{width:130px;height:130px;margin:14px auto;border-radius:50%;display:grid;place-items:center;font-size:3.4rem;background:radial-gradient(circle,#D9A92855,#0008);border:3px solid var(--rc,#D9A928);box-shadow:0 0 50px var(--rc,#D9A928)}
.gxx-cel i.pt{position:absolute;width:7px;height:7px;border-radius:50%;background:#D9A928;animation:gxxPt 2.4s ease-out infinite;opacity:0}
@keyframes gxxPt{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--x),var(--y))}}
.gxx-toast{position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:999992;max-width:420px;margin:0 auto;display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:18px;background:linear-gradient(135deg,#1b2150,#0e1230);border:2px solid #D9A928;box-shadow:0 0 26px #D9A92866,0 12px 30px #000c;color:#fff;animation:gxxT 4.2s ease both}
@keyframes gxxT{0%{transform:translateY(-120%)}10%,85%{transform:none}100%{transform:translateY(-140%);opacity:0}}
.gxx-toast .ti{font-size:1.9rem}.gxx-toast b{display:block;font-size:.86rem}.gxx-toast small{color:#D9A928;font-weight:700;font-size:.7rem}
`;
  document.head.appendChild(st);

  /* ---------------- Datos ---------------- */
  const user = () => X() && X().state && X().state.user;
  const ready = () => X() && X().fb && X().fb.db && user();

  async function load() {
    const x = X(), fs = await x.fsModule(), db = x.fb.db, uid = user().uid;
    const g = async (...p) => { try { return await fs.getDoc(fs.doc(db, ...p)); } catch (e) { return null; } };
    const lst = async col => {
      try {
        const s = await fs.getDocs(fs.collection(db, col, uid, "items"));
        const m = {}; s.forEach(d => { m[d.id] = d.data().at || true; }); return m;
      } catch (e) { return {}; }
    };
    const [sSnap, eSnap, pSnap, aSnap, bSnap, ach, inv] = await Promise.all([
      g("stats", uid), g("equip", uid), g("publicProfiles", uid), g("admins", uid), g("bans", uid),
      lst("achievements"), lst("inventory")
    ]);
    D = {
      uid,
      stats: sSnap && sSnap.exists() ? sSnap.data() : {},
      equip: eSnap && eSnap.exists() ? eSnap.data() : null,
      pub: pSnap && pSnap.exists() ? pSnap.data() : null,
      isAdmin: !!(aSnap && aSnap.exists()),
      ban: bSnap && bSnap.exists() ? bSnap.data() : null,
      ach, inv
    };
    loadedUid = uid;
    return D;
  }

  const lvlOf = xp => X().xpLevelFromTotal(xp || 0);
  const curVal = (c) => c.k === "own" ? c.ids.filter(i => D.inv[i]).length : (D.stats[c.k] || 0);
  const need = c => c.k === "own" ? c.ids.length : c.v;
  const met = c => curVal(c) >= need(c);
  const prog = c => c.k === "xp"
    ? [lvlOf(D.stats.xp), c.lvl, Math.min(100, (D.stats.xp || 0) * 100 / c.v)]
    : [Math.min(curVal(c), need(c)), need(c), Math.min(100, curVal(c) * 100 / need(c))];

  async function put(col, id, extra) {
    const x = X(), fs = await x.fsModule();
    await fs.setDoc(fs.doc(x.fb.db, col, D.uid, "items", id), Object.assign({ at: fs.serverTimestamp() }, extra || {}));
    (col === "inventory" ? D.inv : D.ach)[id] = Date.now();
  }

  /* ---------------- Avisos ---------------- */
  const queue = [];
  function toast(icon, title, sub) {
    queue.push([icon, title, sub]);
    if (queue.length === 1) nextToast();
  }
  function nextToast() {
    if (!queue.length) return;
    const [i, t, s] = queue[0];
    const d = document.createElement("div");
    d.className = "gxx-toast";
    d.innerHTML = `<span class="ti">${i}</span><div><b>${esc(t)}</b><small>${esc(s)}</small></div>`;
    document.body.appendChild(d);
    setTimeout(() => { d.remove(); queue.shift(); nextToast(); }, 4300);
  }

  function celebrate(items, title) {
    const it = items.map(ITEM).filter(Boolean);
    if (!it.length) return;
    const r = C.RARITY[it[0].rarity];
    const parts = Array.from({ length: 22 }, (_, k) => {
      const a = Math.random() * 6.28, d = 90 + Math.random() * 140;
      return `<i class="pt" style="left:50%;top:42%;--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;animation-delay:${(k % 7) * .15}s"></i>`;
    }).join("");
    const el = document.createElement("div");
    el.className = "gxx-cel";
    el.style.setProperty("--rc", r.c);
    el.innerHTML = `${parts}<div class="cc">
      <div class="gxx-h">${esc(title || "¡Recompensa desbloqueada!")}</div>
      <div class="big">${it[0].type === "title" ? "🏷️" : it[0].type === "frame" ? "🖼️" : it[0].type === "bg" ? "🌌" : "✨"}</div>
      ${it.map(i => `<h2 style="margin:6px 0">${esc(i.name)}</h2><div class="rar" style="--rc:${C.RARITY[i.rarity].c}">${C.RARITY[i.rarity].n.toUpperCase()}</div>`).join("")}
      <button class="btn" style="margin-top:22px">Continuar</button></div>`;
    $(".btn", el).onclick = () => el.remove();
    document.body.appendChild(el);
  }

  /* ---------------- Desbloqueo automático ---------------- */
  async function autoUnlock() {
    if (!ready()) return;
    try {
      await load();
      for (let pass = 0; pass < 3; pass++) {
        let changed = false;
        for (const a of C.ACH) {
          if (D.ach[a.id] || !met(a.cond)) continue;
          try {
            await put("achievements", a.id);
            changed = true;
            let sub = a.reward ? "Recompensa: " + ITEM(a.reward).name : C.RARITY[a.rarity].n;
            toast(a.icon, "Logro: " + a.name, sub);
            if (a.reward && !D.inv[a.reward]) { try { await put("inventory", a.reward); } catch (e) { } }
          } catch (e) { console.warn("logro", a.id, e.code || e); }
        }
        if (!changed) break;
      }
      const pend = C.HITOS.filter(h => h.items.some(i => !D.inv[i] && met(ITEM(i).cond)));
      if (pend.length) toast("🎁", "¡Recompensa de nivel disponible!", "Ve a Perfil → Recompensas para reclamarla");
    } catch (e) { console.warn("autoUnlock", e); }
  }

  /* Tras cada partida guardada por GreyxCore */
  function hookCore() {
    if (!window.GreyxCore || GreyxCore.__hooked) return;
    const orig = GreyxCore.submitGame;
    GreyxCore.submitGame = async function () {
      const r = await orig.apply(this, arguments);
      if (r) setTimeout(autoUnlock, 1500);
      return r;
    };
    GreyxCore.__hooked = true;
  }

  /* ---------------- Render base ---------------- */
  function root() {
    let r = $("#gxx");
    if (!r) { r = document.createElement("div"); r.id = "gxx"; r.className = "gxx"; document.body.appendChild(r); }
    return r;
  }
  function closeAll() { stack.length = 0; const r = $("#gxx"); if (r) r.remove(); }
  function go(name, arg) { stack.push({ name, arg }); draw(); }
  function back() { stack.pop(); stack.length ? draw() : closeAll(); }

  const TITLES = { hub: "Perfil", ach: "Logros", cust: "Personalizar", rew: "Recompensas", rank: "Ranking", user: "Jugador", adm: "Panel admin" };

  async function draw() {
    const v = stack[stack.length - 1];
    if (!v) return;
    const r = root();
    r.innerHTML = `<div class="gxx-in"><div class="gxx-top"><button class="gxx-b" data-x="back">←</button><h1>${TITLES[v.name]}</h1><span></span></div><p style="text-align:center;color:#aab3d6">Cargando…</p></div>`;
    try {
      if (!ready()) { r.querySelector("p").outerHTML = loginHtml(); }
      else {
        if (!D || loadedUid !== user().uid || v.name === "hub") await load();
        const html = await SCREENS[v.name](v.arg);
        r.innerHTML = `<div class="gxx-in"><div class="gxx-top"><button class="gxx-b" data-x="back">←</button><h1>${TITLES[v.name]}</h1><span></span></div>${ui.msg ? `<div class="msg ${ui.er ? "er" : ""}">${esc(ui.msg)}</div>` : ""}${html}</div>`;
        ui.msg = ""; ui.er = false;
      }
    } catch (e) {
      console.warn(e);
      r.querySelector("p").textContent = "No se pudo cargar. Revisa tu conexión.";
    }
  }
  const refresh = () => draw();

  function loginHtml() {
    return `<div class="gxx-card" style="text-align:center"><p>Inicia sesión y crea tu perfil para usar esta sección.</p><button class="btn" data-x="login">Iniciar sesión</button></div>`;
  }

  /* ---------------- Piezas visuales ---------------- */
  function av(avatarId, eq, size) {
    const fr = eq && eq.frame !== "none" ? ITEM(eq.frame) : null;
    const fx = eq && eq.fx !== "none" ? ITEM(eq.fx) : null;
    const c = fr && fr.vis ? fr.vis : ["#A78BFA88", "#263B78"];
    return `<span class="gxav ${fx ? fx.vis : ""}" style="--s:${size || 56}px;--c1:${c[0]};--c2:${c[1]}"><i>${X().avatarEmoji(avatarId)}</i></span>`;
  }
  function bgCss(eq) {
    const b = eq && eq.bg !== "none" ? ITEM(eq.bg) : null;
    return b && b.vis ? `linear-gradient(145deg,${b.vis[0]},${b.vis[1]})` : "linear-gradient(145deg,#263B78,#11132E)";
  }
  const titleOf = eq => eq && eq.title !== "none" && ITEM(eq.title) ? ITEM(eq.title).name : "";
  const featOf = eq => eq ? [eq.f1, eq.f2, eq.f3].filter(f => f && f !== "none").map(f => C.ACH.find(a => a.id === f)).filter(Boolean) : [];

  function card(p, eq, n) {
    const xp = n.xp || 0, lv = lvlOf(xp), x = X();
    const base = x.xpForLevel(lv), nextXp = lv >= 100 ? base : x.xpForLevel(lv + 1);
    const pct = x.xpBarPct(xp);
    const losses = n.losses != null ? n.losses : Math.max(0, (n.played || 0) - (n.wins || 0));
    const rate = n.played ? Math.round((n.wins || 0) * 100 / n.played) : 0;
    return `<div class="pc" style="background:${bgCss(eq)}">
      ${av(p.avatar, eq, 88)}
      <h2>@${esc(p.username)}</h2><div class="pt">${esc(titleOf(eq))}</div>
      <div class="plv">NIVEL ${lv}</div>
      <div class="xpb"><i style="width:${pct}%"></i></div>
      <small>${lv >= 100 ? "NIVEL MÁXIMO" : fmt(xp - base) + " / " + fmt(nextXp - base) + " XP"}</small>
      <div class="sg">
        <div><b>🏆 ${fmt(n.trophies)}</b><span>TROFEOS</span></div>
        <div><b>🎮 ${fmt(n.played)}</b><span>PARTIDAS</span></div>
        <div><b>🥇 ${fmt(n.wins)}</b><span>VICTORIAS</span></div>
        <div><b>${fmt(losses)}</b><span>DERROTAS</span></div>
        <div><b>${rate}%</b><span>% VICTORIAS</span></div>
        <div><b>${esc((p.uid || D.uid).slice(0, 6))}</b><span>ID</span></div>
      </div>
      <div class="feat">${featOf(eq).map(a => `<span title="${esc(a.name)}">${a.icon}</span>`).join("")}</div>
    </div>`;
  }

  /* ---------------- Pantallas ---------------- */
  const SCREENS = {
    async hub() {
      if (!D.pub && !(X().state.profile)) {
        return `<div class="gxx-card" style="text-align:center"><p>Aún no tienes perfil.</p><button class="btn" data-x="mkprofile">Crear perfil</button></div>`;
      }
      const p = Object.assign({ uid: D.uid }, D.pub || X().state.profile);
      return card(p, D.equip, D.stats) + `<div class="mn">
        <button data-x="go:ach">🏆<span>Logros<small>${Object.keys(D.ach).length}/${C.ACH.length} desbloqueados</small></span></button>
        <button data-x="go:cust">🎨<span>Personalizar<small>Marcos, fondos, títulos y efectos</small></span></button>
        <button data-x="go:rew">🎁<span>Recompensas<small>Premios por nivel</small></span></button>
        <button data-x="go:rank">🥇<span>Ranking<small>Compite por trofeos</small></span></button>
        ${D.isAdmin ? `<button data-x="go:adm">🛡️<span>Panel admin<small>Usuarios, sanciones y recompensas</small></span></button>` : ""}
        <button data-x="settings">⚙️<span>Cuenta y ajustes<small>Avatar, idioma, sonido, cerrar sesión</small></span></button>
      </div>`;
    },

    async ach() {
      const tabs = C.CATS.map(([id, n]) => `<button class="${ui.achCat === id ? "on" : ""}" data-x="achcat:${id}">${n}</button>`).join("");
      const list = C.ACH.filter(a => a.cat === ui.achCat);
      const rows = list.length ? list.map(a => {
        const own = !!D.ach[a.id], r = C.RARITY[a.rarity], [c, t, pc] = prog(a.cond);
        const hide = a.secret && !own;
        const date = own && D.ach[a.id] && D.ach[a.id].toDate ? D.ach[a.id].toDate().toLocaleDateString("es") : "";
        return `<div class="row ${own ? "" : "lock"}" style="--rc:${r.c}">
          <div class="ric">${hide ? "❓" : a.icon}</div>
          <div class="t"><b>${hide ? "Logro secreto" : esc(a.name)}</b>
          <small>${hide ? "Sigue jugando para descubrirlo." : esc(a.desc)}</small>
          <span class="rar">${r.n.toUpperCase()}${a.reward ? " · 🎁 " + esc(ITEM(a.reward).name) : ""}</span>
          ${own ? `<small>✅ Desbloqueado ${date}</small>` : `<div class="pb"><i style="width:${pc}%"></i></div><small>${c} / ${t}</small>`}</div></div>`;
      }).join("") : `<div class="gxx-card" style="text-align:center;color:#aab3d6">Próximamente.</div>`;
      return `<div class="tabs">${tabs}</div>${rows}`;
    },

    async cust() {
      const tabs = [["frame", "Marcos"], ["bg", "Fondos"], ["title", "Títulos"], ["fx", "Efectos"], ["feat", "Destacados"], ["avatar", "Avatares"]]
        .map(([id, n]) => `<button class="${ui.custTab === id ? "on" : ""}" data-x="ctab:${id}">${n}</button>`).join("");
      const eq = D.equip || { frame: "none", bg: "none", title: "none", fx: "none", f1: "none", f2: "none", f3: "none", hideAch: false };
      let body = "";
      if (ui.custTab === "avatar") {
        body = `<div class="gxx-card"><p style="margin:0 0 10px">Tienes los 16 avatares disponibles.</p><button class="btn" data-x="avatar">Cambiar avatar</button></div>`;
      } else if (ui.custTab === "feat") {
        const un = C.ACH.filter(a => D.ach[a.id]);
        const sel = [eq.f1, eq.f2, eq.f3];
        body = `<div class="gxx-card"><div class="gxx-h">Logros destacados (máx. 3)</div>${un.length ? un.map(a => `
          <div class="row ${sel.includes(a.id) ? "eq" : ""}"><div class="ric">${a.icon}</div><div class="t"><b>${esc(a.name)}</b></div>
          <button class="btn sm ${sel.includes(a.id) ? "gh" : ""}" data-x="feat:${a.id}">${sel.includes(a.id) ? "Quitar" : "Destacar"}</button></div>`).join("") : "<small>Aún no tienes logros.</small>"}</div>
          <div class="gxx-card"><div class="row" style="margin:0"><div class="t"><b>Mostrar mis logros a otros</b><small>Si lo apagas, solo tú los verás.</small></div>
          <button class="btn sm ${eq.hideAch ? "gh" : ""}" data-x="privacy">${eq.hideAch ? "Oculto" : "Visible"}</button></div></div>`;
      } else {
        const t = ui.custTab, cur = eq[t];
        const items = C.ITEMS.filter(i => i.type === t);
        body = `<div class="row ${cur === "none" ? "eq" : ""}"><div class="ric">∅</div><div class="t"><b>Ninguno</b></div>
          <button class="btn sm gh" data-x="equip:${t}:none" ${cur === "none" ? "disabled" : ""}>${cur === "none" ? "Equipado" : "Equipar"}</button></div>` +
          items.map(i => {
            const own = !!D.inv[i.id], r = C.RARITY[i.rarity], on = cur === i.id;
            const prev = i.type === "frame" ? av("a1", { frame: i.id, fx: "none" }, 44)
              : i.type === "bg" ? `<span class="ric" style="background:linear-gradient(145deg,${i.vis[0]},${i.vis[1]})"></span>`
              : i.type === "fx" ? `<span class="gxav ${i.vis}" style="--s:44px;--c1:#fff3;--c2:#fff1"><i>✨</i></span>` : `<span class="ric">🏷️</span>`;
            return `<div class="row ${own ? "" : "lock"} ${on ? "eq" : ""}" style="--rc:${r.c}">${prev}
              <div class="t"><b>${esc(i.name)}</b><span class="rar">${r.n.toUpperCase()}</span><small>${own ? "En tu inventario" : "🔒 " + esc(i.how)}</small></div>
              ${own ? `<button class="btn sm ${on ? "gh" : ""}" data-x="equip:${t}:${i.id}" ${on ? "disabled" : ""}>${on ? "Equipado" : "Equipar"}</button>` : ""}</div>`;
          }).join("");
      }
      return `<div class="tabs">${tabs}</div>${body}`;
    },

    async rew() {
      return `<p style="color:#aab3d6;font-size:.8rem;margin:0 0 10px">Tu nivel: <b style="color:#fff">${lvlOf(D.stats.xp)}</b>. Reclama cada premio al llegar al nivel.</p>` +
        C.HITOS.map(h => {
          const its = h.items.map(ITEM);
          const claimed = its.every(i => D.inv[i.id]);
          const ok = its.every(i => met(i.cond));
          const r = C.RARITY[its[0].rarity];
          const when = claimed && D.inv[its[0].id] && D.inv[its[0].id].toDate ? D.inv[its[0].id].toDate().toLocaleDateString("es") : "";
          return `<div class="row ${ok || claimed ? "" : "lock"} ${ok && !claimed ? "eq" : ""}" style="--rc:${r.c}">
            <div class="ric">${claimed ? "✅" : ok ? "🎁" : "🔒"}</div>
            <div class="t"><b>Nivel ${h.lvl}</b><small>${its.map(i => esc(i.name)).join(" + ")}</small><span class="rar">${r.n.toUpperCase()}${when ? " · " + when : ""}</span></div>
            ${claimed ? `<small>Reclamado</small>` : ok ? `<button class="btn sm" data-x="claim:${h.lvl}">Reclamar</button>` : `<small>NV ${h.lvl}</small>`}</div>`;
        }).join("");
    },

    async rank() {
      const x = X(), fs = await x.fsModule(), db = x.fb.db;
      const snap = await fs.getDocs(fs.query(fs.collection(db, "publicProfiles"), fs.orderBy("trophies", "desc"), fs.limit(25)));
      const rows = [];
      snap.forEach(d => rows.push(Object.assign({ uid: d.id }, d.data())));
      const eqs = await Promise.all(rows.map(async p => {
        try { const s = await fs.getDoc(fs.doc(db, "equip", p.uid)); return s.exists() ? s.data() : null; } catch (e) { return null; }
      }));
      let myPos = rows.findIndex(p => p.uid === D.uid) + 1;
      if (!myPos && D.pub) {
        try {
          const c = await fs.getCountFromServer(fs.query(fs.collection(db, "publicProfiles"), fs.where("trophies", ">", D.pub.trophies || 0)));
          myPos = c.data().count + 1;
        } catch (e) { myPos = 0; }
      }
      const top = rows.slice(0, 3);
      const pod = [1, 0, 2].map(i => top[i] ? `<div class="p ${i === 0 ? "g" : ""}" data-x="user:${top[i].uid}">${["🥇", "🥈", "🥉"][i]}<br>${av(top[i].avatar, eqs[i], i === 0 ? 62 : 50)}<b>@${esc(top[i].username)}</b><small>🏆 ${fmt(top[i].trophies)}</small></div>` : `<div></div>`).join("");
      const list = rows.slice(3).map((p, k) => `<div class="row" data-x="user:${p.uid}" style="cursor:pointer"><b style="width:26px;color:#aab3d6">${k + 4}</b>${av(p.avatar, eqs[k + 3], 40)}
        <div class="t"><b>@${esc(p.username)}</b><small>NV ${lvlOf(p.xp)} · 🥇 ${fmt(p.wins)} victorias</small></div><b>🏆 ${fmt(p.trophies)}</b></div>`).join("");
      return `<div class="gxx-card"><div class="gxx-h">Tu posición</div><b style="font-size:1.4rem">${myPos ? "#" + myPos : "—"}</b>
        <small style="display:block;color:#aab3d6;margin-top:4px">Ranking por trofeos ganados contra bots. Cuando exista el modo online real, tendrá su propio ranking competitivo.</small></div>
        <input class="inp" id="rsearch" placeholder="Buscar jugador por nombre de usuario" autocapitalize="off" autocomplete="off">
        <button class="btn gh" data-x="rsearch" style="margin-bottom:12px">Buscar</button>
        <div class="pod">${pod}</div>${list || ""}${!rows.length ? `<div class="gxx-card" style="text-align:center">Aún no hay jugadores clasificados.</div>` : ""}`;
    },

    async user(uid) {
      const x = X(), fs = await x.fsModule(), db = x.fb.db;
      const [pS, eS] = await Promise.all([fs.getDoc(fs.doc(db, "publicProfiles", uid)), fs.getDoc(fs.doc(db, "equip", uid)).catch(() => null)]);
      if (!pS.exists()) return `<div class="gxx-card">Jugador no encontrado.</div>`;
      const p = Object.assign({ uid }, pS.data()), eq = eS && eS.exists() ? eS.data() : null;
      let achHtml = "";
      if (!(eq && eq.hideAch)) {
        try {
          const a = await fs.getDocs(fs.collection(db, "achievements", uid, "items"));
          const ids = []; a.forEach(d => ids.push(d.id));
          const list = C.ACH.filter(z => ids.includes(z.id));
          achHtml = `<div class="gxx-card"><div class="gxx-h">Logros (${list.length}/${C.ACH.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">${list.map(z => `<span class="ric" title="${esc(z.name)}" style="--rc:${C.RARITY[z.rarity].c}">${z.icon}</span>`).join("") || "<small>Sin logros todavía.</small>"}</div></div>`;
        } catch (e) { }
      } else achHtml = `<div class="gxx-card"><small>🔒 Este jugador mantiene sus logros privados.</small></div>`;
      return card(p, eq, p) + achHtml + (D.isAdmin ? `<button class="btn gh" data-x="admuser:${esc(p.usernameLower)}">🛡️ Abrir en panel admin</button>` : "");
    },

    async adm() {
      if (!D.isAdmin) return `<div class="gxx-card">Sin acceso.</div>`;
      const a = ui.adm;
      let body = `<input class="inp" id="asearch" placeholder="Buscar por nombre de usuario o UID" autocapitalize="off" autocomplete="off">
        <button class="btn" data-x="asearch" style="margin-bottom:12px">Buscar usuario</button>`;
      if (a && a.err) body += `<div class="msg er">${esc(a.err)}</div>`;
      if (a && a.t) {
        const t = a.t, s = a.stats || {}, b = a.ban;
        const active = b && (b.permanent || (b.until && b.until.toMillis() > Date.now()));
        const flags = [];
        if ((s.played || 0) >= 20 && s.wins / s.played > .9) flags.push("Win rate > 90% con 20+ partidas");
        if ((s.played || 0) && (s.captures || 0) / s.played > 30) flags.push("Capturas por partida inusuales");
        if ((s.played || 0) && (s.trophies || 0) / s.played > 12) flags.push("Trofeos por partida muy altos");
        const logs = (a.logs || []).map(l => `<div class="row" style="align-items:flex-start"><div class="t"><b>${esc(l.action)}</b><small>${esc(l.change || "")} · ${esc(l.reason)}<br>${esc(l.adminName || "")} · ${l.at && l.at.toDate ? l.at.toDate().toLocaleString("es") : ""}</small></div></div>`).join("");
        body += `<div class="gxx-card"><div class="row" style="margin:0 0 10px">${av(t.avatar, null, 46)}<div class="t"><b>@${esc(t.username)}</b><small>UID: ${esc(t.uid)}<br>NV ${lvlOf(s.xp)} · 🏆 ${fmt(s.trophies)} · ${fmt(s.played)} partidas · ${fmt(s.wins)} victorias · racha máx ${fmt(s.bestStreak)}</small></div></div>
          <div class="gxx-h">Estado</div>
          <p style="margin:0 0 10px;font-size:.82rem">${active ? "🚫 " + (b.permanent ? "Bloqueo permanente" : "Suspendido hasta " + b.until.toDate().toLocaleString("es")) + " — " + esc(b.reason) : b && b.type === "warning" ? "⚠️ Advertencia: " + esc(b.reason) : "✅ Sin sanciones vigentes"}</p>
          ${flags.length ? `<div class="msg er">🔎 Sospechoso: ${flags.map(esc).join(" · ")}</div>` : ""}
          <input class="inp" id="areason" placeholder="Motivo (obligatorio, 3-200 caracteres)" maxlength="200">
          <div class="gxx-h">Moderación</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <button class="btn sm gh" data-x="ban:warning">⚠️ Advertir</button>
            <button class="btn sm gh" data-x="ban:1">Suspender 1 día</button>
            <button class="btn sm gh" data-x="ban:3">Suspender 3 días</button>
            <button class="btn sm gh" data-x="ban:7">Suspender 7 días</button>
            <button class="btn sm gh" data-x="ban:30">Suspender 30 días</button>
            <button class="btn sm dn" data-x="ban:perm">Bloqueo permanente</button>
          </div>
          ${(b) ? `<button class="btn sm" style="margin-top:8px;width:100%" data-x="unban">Levantar sanción</button>` : ""}
          <div class="gxx-h" style="margin-top:14px">Corregir XP / trofeos (valor final)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input class="inp" id="axp" type="number" min="0" placeholder="XP: ${s.xp || 0}"><input class="inp" id="atr" type="number" min="0" placeholder="Trofeos: ${s.trophies || 0}"></div>
          <button class="btn sm" data-x="setstats">Aplicar corrección</button>
          <div class="gxx-h" style="margin-top:14px">Conceder objeto</div>
          <select class="inp" id="aitem">${C.ITEMS.map(i => `<option value="${i.id}">${esc(i.name)} (${C.RARITY[i.rarity].n})</option>`).join("")}</select>
          <button class="btn sm" data-x="giveitem">Conceder</button>
          <div class="gxx-h" style="margin-top:14px">Nota interna</div>
          <button class="btn sm gh" data-x="note">Guardar motivo como nota</button></div>
          <div class="gxx-card"><div class="gxx-h">Historial</div>${logs || "<small>Sin operaciones registradas.</small>"}</div>`;
      }
      return body;
    }
  };

  /* ---------------- Acciones ---------------- */
  async function fs_() { return X().fsModule(); }
  const say = (m, er) => { ui.msg = m; ui.er = !!er; };

  async function doEquip(slot, id) {
    const fs = await fs_();
    const e = Object.assign({ frame: "none", bg: "none", title: "none", fx: "none", f1: "none", f2: "none", f3: "none", hideAch: false }, D.equip || {});
    delete e.updatedAt;
    if (slot === "feat") {
      const cur = [e.f1, e.f2, e.f3];
      if (cur.includes(id)) { const i = cur.indexOf(id); cur[i] = "none"; }
      else { const i = cur.indexOf("none"); if (i < 0) { say("Máximo 3 destacados.", true); return; } cur[i] = id; }
      [e.f1, e.f2, e.f3] = cur;
    } else if (slot === "privacy") e.hideAch = !e.hideAch;
    else e[slot] = id;
    e.updatedAt = fs.serverTimestamp();
    await fs.setDoc(fs.doc(X().fb.db, "equip", D.uid), e);
    D.equip = Object.assign({}, e, { updatedAt: new Date() });
  }

  async function claim(lvl) {
    const h = C.HITOS.find(z => z.lvl === lvl);
    const got = [];
    for (const id of h.items) {
      if (D.inv[id]) continue;
      try { await put("inventory", id); got.push(id); } catch (e) { console.warn(e); }
    }
    if (got.length) celebrate(got, "¡Nivel " + lvl + " alcanzado!");
    else say("No se pudo reclamar. Intenta de nuevo.", true);
  }

  async function adminLoad(raw) {
    const x = X(), fs = await x.fsModule(), db = x.fb.db;
    const q = String(raw || "").trim().replace(/^@/, "");
    if (!q) return;
    let uid = null;
    const n = await fs.getDoc(fs.doc(db, "usernames", q.toLowerCase()));
    if (n.exists()) uid = n.data().uid; else if (q.length >= 20) uid = q;
    if (!uid) { ui.adm = { err: "No se encontró ese usuario." }; return; }
    const g = p => fs.getDoc(fs.doc(db, ...p)).catch(() => null);
    const [pS, sS, bS] = await Promise.all([g(["publicProfiles", uid]), g(["stats", uid]), g(["bans", uid])]);
    if (!pS || !pS.exists()) { ui.adm = { err: "Ese usuario no tiene perfil público todavía." }; return; }
    let logs = [];
    try {
      const l = await fs.getDocs(fs.query(fs.collection(db, "adminLog"), fs.where("target", "==", uid), fs.limit(25)));
      l.forEach(d => logs.push(d.data()));
      logs.sort((a, b) => (b.at ? b.at.toMillis() : 0) - (a.at ? a.at.toMillis() : 0));
    } catch (e) { }
    ui.adm = { t: Object.assign({ uid }, pS.data()), stats: sS && sS.exists() ? sS.data() : {}, ban: bS && bS.exists() ? bS.data() : null, logs };
  }

  async function adminAct(kind, arg) {
    const a = ui.adm; if (!a || !a.t) return;
    const reason = ($("#areason") || {}).value ? $("#areason").value.trim() : "";
    if (reason.length < 3) { say("Escribe un motivo (mínimo 3 caracteres).", true); return; }
    const x = X(), fs = await x.fsModule(), db = x.fb.db, t = a.t;
    const batch = fs.writeBatch(db);
    const log = (action, change) => batch.set(fs.doc(fs.collection(db, "adminLog")), {
      admin: D.uid, adminName: (D.pub && D.pub.username) || "admin", action, target: t.uid,
      targetName: t.username, reason, change: change || "", at: fs.serverTimestamp()
    });
    const bref = fs.doc(db, "bans", t.uid);
    if (kind === "ban") {
      const act = a.ban && (a.ban.permanent || (a.ban.until && a.ban.until.toMillis() > Date.now()));
      if (act && arg === "warning") { say("Ya tiene una sanción activa. Levántala antes de advertir.", true); return; }
      const d = { type: "warning", reason, by: D.uid, at: fs.serverTimestamp() };
      if (arg === "perm") { d.type = "permanent"; d.permanent = true; }
      else if (arg !== "warning") { d.type = "temp"; d.until = fs.Timestamp.fromMillis(Date.now() + Number(arg) * 86400000); }
      batch.set(bref, d);
      log(arg === "warning" ? "Advertencia" : arg === "perm" ? "Bloqueo permanente" : "Suspensión " + arg + " día(s)", d.type);
    } else if (kind === "unban") {
      batch.delete(bref); log("Levantar sanción", "bans eliminado");
    } else if (kind === "setstats") {
      const xp = parseInt(($("#axp") || {}).value, 10), tr = parseInt(($("#atr") || {}).value, 10);
      const s = a.stats || {};
      const nxp = isNaN(xp) ? (s.xp || 0) : xp, ntr = isNaN(tr) ? (s.trophies || 0) : tr;
      if (nxp < 0 || ntr < 0) { say("Valores inválidos.", true); return; }
      batch.update(fs.doc(db, "stats", t.uid), { xp: nxp, trophies: ntr, updatedAt: fs.serverTimestamp() });
      batch.update(fs.doc(db, "publicProfiles", t.uid), {
        username: t.username, usernameLower: t.usernameLower, avatar: t.avatar, xp: nxp, trophies: ntr,
        wins: s.wins || 0, played: s.played || 0, updatedAt: fs.serverTimestamp()
      });
      log("Corrección stats", `xp ${s.xp || 0}→${nxp}, trofeos ${s.trophies || 0}→${ntr}`);
    } else if (kind === "giveitem") {
      const id = $("#aitem").value;
      batch.set(fs.doc(db, "inventory", t.uid, "items", id), { at: fs.serverTimestamp(), by: D.uid, reason });
      log("Conceder objeto", id);
    } else if (kind === "note") { log("Nota", ""); }
    await batch.commit();
    say("Operación registrada.");
    await adminLoad(t.usernameLower);
  }

  /* ---------------- Eventos ---------------- */
  document.addEventListener("click", async e => {
    const nav = e.target.closest("[data-go]");
    if (nav && (nav.dataset.go === "rank" || nav.dataset.go === "profile")) {
      e.preventDefault(); e.stopPropagation();
      stack.length = 0; go(nav.dataset.go === "rank" ? "rank" : "hub");
      return;
    }
    const b = e.target.closest("#gxx [data-x]");
    if (!b || ui.busy) return;
    const [k, a1, a2] = b.dataset.x.split(":");
    try {
      ui.busy = true;
      if (k === "back") back();
      else if (k === "go") go(a1);
      else if (k === "achcat") { ui.achCat = a1; await refresh(); }
      else if (k === "ctab") { ui.custTab = a1; await refresh(); }
      else if (k === "equip") { await doEquip(a1, a2); say("Equipado."); await refresh(); }
      else if (k === "feat") { await doEquip("feat", a1); await refresh(); }
      else if (k === "privacy") { await doEquip("privacy"); await refresh(); }
      else if (k === "claim") { await claim(Number(a1)); await refresh(); }
      else if (k === "user") go("user", a1);
      else if (k === "rsearch") {
        const q = ($("#rsearch").value || "").trim().replace(/^@/, "").toLowerCase();
        if (q) {
          const fs = await fs_(), s = await fs.getDoc(fs.doc(X().fb.db, "usernames", q));
          if (s.exists()) go("user", s.data().uid); else { say("No se encontró ese jugador.", true); await refresh(); }
        }
      }
      else if (k === "login") { closeAll(); X().state.showAuth = true; X().render(); }
      else if (k === "mkprofile") { closeAll(); X().state.showProfile = "create"; X().state.profileName = ""; X().state.profileAvatar = "a1"; X().state.profileError = ""; X().render(); }
      else if (k === "avatar") { closeAll(); X().state.showProfile = "edit"; X().state.profileAvatar = X().state.profile ? X().state.profile.avatar : "a1"; X().state.profileError = ""; X().state.profileNotice = ""; X().render(); }
      else if (k === "settings") { closeAll(); const s = $('[data-action="settings"]'); if (s) s.click(); }
      else if (k === "asearch") { await adminLoad($("#asearch").value); await refresh(); }
      else if (k === "admuser") { await adminLoad(a1); stack.pop(); go("adm"); }
      else if (["ban", "unban", "setstats", "giveitem", "note"].includes(k)) { await adminAct(k, a1); await refresh(); }
    } catch (err) {
      console.warn(err);
      say(err && err.code === "permission-denied" ? "Acción no permitida por las reglas de seguridad." : "No se pudo completar. Intenta de nuevo.", true);
      try { await refresh(); } catch (e2) { }
    } finally { ui.busy = false; }
  }, true);

  /* ---------------- Sanciones al iniciar sesión ---------------- */
  function showBan(b) {
    if ($("#gxxban")) return;
    const el = document.createElement("div");
    el.id = "gxxban"; el.className = "gxx-ban";
    const until = b.permanent ? "de forma permanente" : "hasta " + b.until.toDate().toLocaleString("es");
    el.innerHTML = `<div><div style="font-size:3rem">🚫</div><h2>Cuenta suspendida</h2>
      <p>Tu cuenta está suspendida ${until}.</p><p style="color:#aab3d6">Motivo: ${esc(b.reason)}</p>
      <button class="btn" style="margin-top:18px">Cerrar sesión</button></div>`;
    $(".btn", el).onclick = () => { el.remove(); try { X().fb.signOut(X().fb.auth); } catch (e) { } };
    document.body.appendChild(el);
  }
  async function checkBan() {
    try {
      const x = X(), fs = await x.fsModule();
      const s = await fs.getDoc(fs.doc(x.fb.db, "bans", user().uid));
      if (!s.exists()) return;
      const b = s.data();
      if (b.permanent || (b.until && b.until.toMillis() > Date.now())) showBan(b);
      else if (b.type === "warning") {
        const key = "gx-warn-" + user().uid;
        const seen = localStorage.getItem(key), stamp = b.at && b.at.toMillis ? String(b.at.toMillis()) : "1";
        if (seen !== stamp) { localStorage.setItem(key, stamp); toast("⚠️", "Advertencia del equipo GREYX", b.reason); }
      }
    } catch (e) { }
  }

  let lastUid = null;
  setInterval(() => {
    hookCore();
    const u = ready() ? user().uid : null;
    if (u === lastUid) return;
    lastUid = u; D = null; loadedUid = null;
    if (!u) { closeAll(); const b = $("#gxxban"); if (b) b.remove(); return; }
    checkBan();
    setTimeout(autoUnlock, 2500);   // reconcilia logros pendientes
  }, 800);

  window.GreyxExtras = { open: go, autoUnlock };
})();
