/* GREYX LUDO — Ranking Top 100 + barra inferior siempre visible
   - Pantalla de Ranking nueva (reemplaza la de greyx-extras.js al tocar "Ranking")
   - La barra de abajo se queda visible en Ranking, Perfil y Amigos, y marca la sección activa
   - "Inicio" vuelve al menú desde cualquier pantalla
   Requiere greyx-profile-v2.js (insignia de verificado) y greyx-extras.js (perfil de jugador). */
(() => {
  "use strict";

  const G = () => window.GX;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const fmt = n => Number(n || 0).toLocaleString("es");

  /* ---------- Iconos dibujados por código ---------- */
  const CUP = (s = 15) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">
    <path d="M7 3h10v5a5 5 0 0 1-10 0V3z" fill="currentColor"/>
    <path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <rect x="10.8" y="13" width="2.4" height="4" fill="currentColor"/>
    <rect x="7.5" y="17" width="9" height="2.6" rx="1.1" fill="currentColor"/></svg>`;
  const CROWN = `<svg class="crown" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
    <path d="M3 18l1.5-10 4.5 4.5L12 5l3 7.5L19.5 8 21 18z" fill="#fbbf24" stroke="#92400e" stroke-width="1.2" stroke-linejoin="round"/>
    <rect x="3.5" y="18.6" width="17" height="2.2" rx="1" fill="#f59e0b" stroke="#92400e" stroke-width="1"/></svg>`;
  const REFRESH = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4.5h-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const tierColor = lv => lv >= 100 ? "#fbbf24" : lv >= 75 ? "#f472b6" : lv >= 50 ? "#a78bfa"
    : lv >= 25 ? "#38bdf8" : lv >= 10 ? "#34d399" : "#94a3b8";

  /* ---------- Estilos ---------- */
  const st = document.createElement("style");
  st.textContent = `
  .gx6-nav{z-index:950!important}
  body:has(.friends-screen) .gx6-nav{display:flex}
  .friends-screen{padding-bottom:130px!important}
  body:has(#gxRank) .gx-fab{display:none!important}

  .rk{position:fixed;inset:0;z-index:190;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#F7F1E6;
    background:radial-gradient(circle at 50% 0,#7C3AED55,transparent 55%),linear-gradient(180deg,#11132E,#070a1c);
    padding:calc(12px + env(safe-area-inset-top,0px)) 14px calc(112px + env(safe-area-inset-bottom,0px));
    animation:rkIn .3s ease both;font-family:Inter,system-ui,-apple-system,sans-serif}
  @keyframes rkIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .rk-in{max-width:460px;margin:0 auto}
  .rk button{font:inherit;cursor:pointer}
  .rk-top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;margin-bottom:14px}
  .rk-top h1{margin:0;text-align:center;font-size:1.15rem;font-weight:900}
  .rk-ib{width:42px;height:42px;border-radius:14px;border:1px solid #ffffff22;background:#263B7899;color:#fff;
    display:grid;place-items:center;padding:0;font-size:1.1rem}
  .rk-ib:active{transform:scale(.94)}

  .rk-hero{position:relative;padding:16px;border-radius:24px;border:1px solid #fbbf2466;margin-bottom:12px;overflow:hidden;
    background:radial-gradient(120% 100% at 0 0,#fbbf2426,transparent 60%),linear-gradient(160deg,#1b2150,#0e1230);
    box-shadow:0 14px 34px #000a}
  .rk-k{font:800 .64rem monospace;letter-spacing:.14em;color:#A78BFA}
  .rk-me{display:flex;align-items:center;gap:12px;margin-top:10px}
  .rk-big{font:900 2.5rem/1 Inter,system-ui,sans-serif;background:linear-gradient(180deg,#fff,#fbbf24);
    -webkit-background-clip:text;background-clip:text;color:transparent;min-width:64px}
  .rk-me .info{flex:1;min-width:0}
  .rk-me .info b{display:block;font-size:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rk-me .info small{color:#9aa3c8;font-size:.7rem}
  .rk-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
  .rk-mini div{padding:10px 4px;border-radius:14px;text-align:center;background:#0006;border:1px solid #ffffff14}
  .rk-mini b{display:block;font-size:1.05rem}
  .rk-mini span{font-size:.56rem;color:#aab3d6;letter-spacing:.08em}
  .rk-gap{margin-top:12px;padding:10px 12px;border-radius:12px;background:#0006;font-size:.76rem;color:#c9cdea;line-height:1.35}
  .rk-note{margin:8px 0 0;color:#aab3d6;font-size:.78rem;line-height:1.4}

  .rk-search{width:100%;box-sizing:border-box;padding:13px 14px;border-radius:14px;border:1px solid #ffffff22;
    background:#0a0d1acc;color:#fff;font:600 16px Inter,system-ui,sans-serif;margin-bottom:12px;outline:0}
  .rk-search:focus{border-color:#a78bfa}

  .rk-pod{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:8px;align-items:end;margin:38px 0 16px}
  .rk-p{position:relative;text-align:center;padding:20px 4px 12px;border-radius:20px;cursor:pointer;
    background:linear-gradient(170deg,#ffffff12,#ffffff05);border:1px solid #ffffff1c}
  .rk-p.p1{padding-top:30px;padding-bottom:18px;border-color:#fbbf2488;box-shadow:0 0 28px #fbbf2444;
    background:linear-gradient(170deg,#fbbf2420,#ffffff05)}
  .rk-p .medal{position:absolute;top:-13px;left:50%;transform:translateX(-50%);width:28px;height:28px;border-radius:50%;
    display:grid;place-items:center;font:900 .8rem Inter,system-ui,sans-serif;color:#3a2200;border:2px solid #fff9;
    background:var(--mg);box-shadow:0 4px 10px #0008}
  .rk-p.p1 .medal{--mg:linear-gradient(145deg,#fff1a8,#f59e0b)}
  .rk-p.p2 .medal{--mg:linear-gradient(145deg,#f8fafc,#94a3b8)}
  .rk-p.p3 .medal{--mg:linear-gradient(145deg,#fcd9b0,#b45309)}
  .rk-p .crown{position:absolute;top:-44px;left:50%;transform:translateX(-50%);filter:drop-shadow(0 0 10px #fbbf24aa)}
  .rk-p .av{width:56px;height:56px;margin:6px auto 8px;border-radius:50%;display:grid;place-items:center;font-size:1.7rem;
    background:radial-gradient(circle at 35% 30%,#3b3f75,#12152c);border:3px solid var(--rc)}
  .rk-p.p1 .av{width:68px;height:68px;font-size:2.1rem;box-shadow:0 0 22px var(--rc)}
  .rk-p b{display:block;font-size:.74rem;padding:0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rk-p .tr{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:4px;color:#fbbf24;font-weight:900;font-size:.82rem}

  .rk-h{font:800 .68rem monospace;letter-spacing:.14em;color:#A78BFA;margin:4px 2px 10px;text-transform:uppercase}
  .rk-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;margin-bottom:8px;cursor:pointer;
    background:#0005;border:1px solid #ffffff12}
  .rk-row:active{transform:scale(.99)}
  .rk-row.me{border-color:#fbbf24;box-shadow:0 0 16px #fbbf2433;background:linear-gradient(90deg,#fbbf2418,#0005)}
  .rk-pos{width:30px;text-align:center;font:900 .9rem Inter,system-ui,sans-serif;color:#aab3d6;flex:none}
  .rk-av{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:1.3rem;
    background:radial-gradient(circle at 35% 30%,#3b3f75,#12152c);border:2px solid var(--rc,#ffffff33)}
  .rk-info{flex:1;min-width:0}
  .rk-info b{display:block;font-size:.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rk-info small{color:#9aa3c8;font-size:.66rem}
  .rk-tr{display:flex;align-items:center;gap:5px;color:#fbbf24;font-weight:900;font-size:.9rem;flex:none}
  .rk-empty{padding:22px 14px;text-align:center;color:#aab3d6;border-radius:18px;background:#0005;border:1px solid #ffffff12;font-size:.85rem}
  .rk-btn{margin-top:12px;padding:12px 18px;border:0;border-radius:14px;color:#fff;font-weight:900;
    background:linear-gradient(135deg,#A78BFA,#7C3AED);box-shadow:0 4px 0 #3b1d8f}
  .rk-row .gxb,.rk-p .gxb{width:14px;height:14px;margin-left:4px;vertical-align:-2px}
  `;
  document.head.appendChild(st);

  /* ---------- Datos ---------- */
  const rk = { rows: null, mine: null, pos: 0, q: "", err: "", at: 0, loading: false, note: "" };

  async function loadRank(force) {
    const g = G();
    if (!g || !g.state.user || !g.fb || !g.fb.db) {
      rk.rows = []; rk.err = "login"; rk.loading = false; return drawRank();
    }
    if (!force && rk.rows && rk.err !== "login" && Date.now() - rk.at < 45000) return drawRank();

    rk.loading = true; rk.err = ""; drawRank();
    try {
      const fs = await g.fsModule(), db = g.fb.db, uid = g.state.user.uid;
      const sn = await fs.getDocs(fs.query(fs.collection(db, "publicProfiles"),
  fs.where("trophies", ">=", 1),
  fs.orderBy("trophies", "desc"), fs.limit(100)));
      
      rk.rows = sn.docs.map(d => Object.assign({ uid: d.id }, d.data()));

      const idx = rk.rows.findIndex(p => p.uid === uid);
      rk.mine = idx >= 0 ? rk.rows[idx] : null;
      rk.pos = idx >= 0 ? idx + 1 : 0;

      if (idx < 0) {
        try {
          const m = await fs.getDoc(fs.doc(db, "publicProfiles", uid));
          if (m.exists() && (m.data().trophies || 0) >= 1) {
  rk.mine = Object.assign({ uid }, m.data());

          
          const c = await fs.getCountFromServer(fs.query(fs.collection(db, "publicProfiles"),
              fs.where("trophies", ">", rk.mine.trophies || 0)));
            rk.pos = c.data().count + 1;
          }
        } catch (e) { /* sin posición */ }
      }
      rk.at = Date.now();
    } catch (e) {
      console.warn("ranking", e);
      rk.err = "net";
      if (!rk.rows) rk.rows = [];
    }
    rk.loading = false;
    drawRank();
  }

  /* ---------- Pantalla ---------- */
  function openRank() {
    let el = $("#gxRank");
    if (!el) {
      el = document.createElement("div");
      el.id = "gxRank";
      el.className = "rk";
      el.addEventListener("click", onClick);
      el.addEventListener("input", e => {
        if (e.target.id === "rkQ") { rk.q = e.target.value; rk.note = ""; renderList(); }
      });
      document.body.appendChild(el);
    }
    el.scrollTop = 0;
    rk.q = ""; rk.note = "";
    loadRank(false);
  }

  function closeRank() { const el = $("#gxRank"); if (el) el.remove(); }

  function heroHtml() {
    const g = G();
    if (!g.state.user) {
      return `<div class="rk-hero"><div class="rk-k">TU POSICIÓN</div>
        <p class="rk-note">Inicia sesión para ver tu posición en el ranking.</p></div>`;
    }
    const m = rk.mine;
    if (rk.loading && !rk.rows) {
      return `<div class="rk-hero"><div class="rk-k">TU POSICIÓN</div><p class="rk-note">Cargando…</p></div>`;
    }
    if (!m) {
      return `<div class="rk-hero"><div class="rk-k">TU POSICIÓN</div>
        <p class="rk-note">Juega una partida contra bot para entrar al ranking.</p></div>`;
    }
    const lv = g.xpLevelFromTotal(m.xp || 0);
    let gap = "";
    if (rk.pos === 1) {
      gap = "Eres el número 1. ¡Defiende tu puesto!";
    } else if (rk.rows && rk.pos > 1 && rk.pos <= 100) {
      const above = rk.rows[rk.pos - 2];
      if (above) {
        const d = (above.trophies || 0) - (m.trophies || 0);
        gap = d <= 0 ? `Empatado con @${esc(above.username)}`
                     : `Te faltan ${fmt(d + 1)} trofeos para pasar a @${esc(above.username)}`;
      }
    } else if (rk.rows && rk.rows.length >= 100 && rk.pos > 100) {
      const last = rk.rows[99];
      gap = `Estás fuera del top 100. Necesitas ${fmt(Math.max(1, (last.trophies || 0) - (m.trophies || 0) + 1))} trofeos para entrar.`;
    }
    return `
      <div class="rk-hero">
        <div class="rk-k">TU POSICIÓN</div>
        <div class="rk-me">
          <span class="rk-big">#${fmt(rk.pos)}</span>
          <span class="rk-av" style="--rc:${tierColor(lv)}">${g.avatarEmoji(m.avatar)}</span>
          <div class="info"><b>@${esc(m.username)}</b><small>Nivel ${lv}</small></div>
        </div>
        <div class="rk-mini">
          <div><b>${fmt(m.trophies)}</b><span>TROFEOS</span></div>
          <div><b>${fmt(m.wins)}</b><span>VICTORIAS</span></div>
          <div><b>${fmt(m.played)}</b><span>PARTIDAS</span></div>
        </div>
        ${gap ? `<div class="rk-gap">${gap}</div>` : ""}
      </div>`;
  }

  function drawRank() {
    const el = $("#gxRank");
    if (!el) return;
    const prev = $("#rkQ", el);
    if (prev) rk.q = prev.value;

    el.innerHTML = `
      <div class="rk-in">
        <div class="rk-top">
          <button class="rk-ib" data-k="home" type="button" aria-label="Volver">←</button>
          <h1>Ranking</h1>
          <button class="rk-ib" data-k="refresh" type="button" aria-label="Actualizar">${REFRESH}</button>
        </div>
        ${heroHtml()}
        <input id="rkQ" class="rk-search" type="search" placeholder="Buscar en el top 100" autocomplete="off" autocapitalize="off" spellcheck="false">
        <div id="rkPod"></div>
        <div id="rkList"></div>
      </div>`;
    $("#rkQ", el).value = rk.q;
    renderList();
  }

  function podCell(p, place) {
    if (!p) return `<div></div>`;
    const g = G(), lv = g.xpLevelFromTotal(p.xp || 0);
    return `
      <div class="rk-p p${place}" data-k="user" data-uid="${esc(p.uid)}" style="--rc:${tierColor(lv)}">
        ${place === 1 ? CROWN : ""}
        <span class="medal">${place}</span>
        <div class="av">${g.avatarEmoji(p.avatar)}</div>
        <b>@${esc(p.username)}</b>
        <div class="tr">${CUP(14)}${fmt(p.trophies)}</div>
      </div>`;
  }

  function rowHtml(p, pos) {
    const g = G(), lv = g.xpLevelFromTotal(p.xp || 0);
    const me = g.state.user && p.uid === g.state.user.uid;
    return `
      <div class="rk-row ${me ? "me" : ""}" data-k="user" data-uid="${esc(p.uid)}">
        <span class="rk-pos">${pos}</span>
        <span class="rk-av" style="--rc:${tierColor(lv)}">${g.avatarEmoji(p.avatar)}</span>
        <div class="rk-info"><b>@${esc(p.username)}</b><small>Nivel ${lv} · ${fmt(p.wins)} victorias</small></div>
        <span class="rk-tr">${CUP(15)}${fmt(p.trophies)}</span>
      </div>`;
  }

  function renderList() {
    const pod = $("#rkPod"), list = $("#rkList");
    if (!pod || !list) return;
    const rows = rk.rows;

    if (!rows) { pod.innerHTML = ""; list.innerHTML = `<div class="rk-empty">Cargando…</div>`; return; }
    if (rk.err === "login") {
      pod.innerHTML = "";
      list.innerHTML = `<div class="rk-empty">Inicia sesión para ver el ranking.<br><button class="rk-btn" data-k="login" type="button">Iniciar sesión</button></div>`;
      return;
    }
    if (rk.err === "net" && !rows.length) {
      pod.innerHTML = "";
      list.innerHTML = `<div class="rk-empty">No se pudo cargar el ranking.<br><button class="rk-btn" data-k="refresh" type="button">Reintentar</button></div>`;
      return;
    }
    if (!rows.length) {
      pod.innerHTML = "";
      list.innerHTML = `<div class="rk-empty">Aún no hay jugadores clasificados.</div>`;
      return;
    }

    const q = rk.q.trim().replace(/^@/, "").toLowerCase();
    if (!q) {
      pod.innerHTML = `<div class="rk-pod">${podCell(rows[1], 2)}${podCell(rows[0], 1)}${podCell(rows[2], 3)}</div>`;
      const rest = rows.slice(3);
      list.innerHTML = `<div class="rk-h">Top ${rows.length}</div>` +
        (rest.map((p, i) => rowHtml(p, i + 4)).join("") || "");
      return;
    }

    pod.innerHTML = "";
    const found = rows.map((p, i) => ({ p, pos: i + 1 }))
      .filter(x => String(x.p.username || "").toLowerCase().includes(q));
    list.innerHTML = found.length
      ? `<div class="rk-h">Resultados</div>` + found.map(x => rowHtml(x.p, x.pos)).join("")
      : `<div class="rk-empty">${esc(rk.note || "Nadie en el top 100 con ese nombre.")}
          ${q.length >= 3 ? `<br><button class="rk-btn" data-k="lookup" type="button">Buscar @${esc(q)} en todo el juego</button>` : ""}</div>`;
  }

  async function lookup() {
    const q = rk.q.trim().replace(/^@/, "").toLowerCase();
    if (!q) return;
    try {
      const g = G(), fs = await g.fsModule();
      const s = await fs.getDoc(fs.doc(g.fb.db, "usernames", q));
      if (s.exists() && window.GreyxExtras) window.GreyxExtras.open("user", s.data().uid);
      else { rk.note = "No se encontró ese jugador."; renderList(); }
    } catch (e) { rk.note = "No se pudo buscar. Intenta de nuevo."; renderList(); }
  }

  function onClick(e) {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    const k = b.dataset.k;
    if (k === "home") return goHome();
    if (k === "refresh") return loadRank(true);
    if (k === "lookup") return lookup();
    if (k === "user") { if (window.GreyxExtras) window.GreyxExtras.open("user", b.dataset.uid); return; }
    if (k === "login") { closeRank(); const g = G(); g.state.showAuth = true; g.render(); }
  }

  /* ---------- Barra inferior ---------- */
  // La pantalla de Amigos se detecta por su título, no por el nombre de su clase
  function friendsTitle() {
    return Array.from(document.querySelectorAll("h1")).find(
      h => h.textContent.trim() === "Amigos" && h.getClientRects().length && !h.closest(".gx6"));
  }
  const friendsOpen = () => !!friendsTitle();
  function friendsBackButton() {
    const h = friendsTitle();
    if (!h) return null;
    return $('[data-action="friends-back"]') || (h.parentElement && h.parentElement.querySelector("button"));
  }

  // Cierra la capa de perfil de greyx-extras.js usando su propio botón de volver
  function closeExtras() {
    for (let i = 0; i < 10 && $("#gxx"); i++) {
      const b = $('#gxx [data-x="back"]');
      if (!b) break;
      b.click();
    }
    const left = $("#gxx");
    if (left) left.remove();
  }

  function goHome() {
    closeRank();
    closeExtras();
    const back = friendsBackButton();
    if (back) back.click();
  }

  // Corre antes que los listeners de la barra y de greyx-extras.js
  window.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest(".gx6-nav [data-go]");
    if (!b) return;
    const to = b.dataset.go;

    if (to === "rank") {
      e.preventDefault(); e.stopImmediatePropagation();
      closeExtras();
      openRank();
      return;
    }
    if (to === "home") {
      e.preventDefault(); e.stopImmediatePropagation();
      goHome();
      return;
    }
    if (to === "friends") {
      closeRank();
      closeExtras();
      if (friendsOpen()) { e.preventDefault(); e.stopImmediatePropagation(); }
      return;
    }
    if (to === "profile") closeRank();   // el perfil lo abre greyx-extras.js
  }, true);

  function activeSection() {
    const gx = $("#gxx");
    if (gx) {
      const t = (($(".gxx-top h1", gx) || {}).textContent || "").trim();
      return /^(Ranking|Jugador)$/.test(t) ? "rank" : "profile";
    }
    if ($("#gxRank")) return "rank";
    if (friendsOpen()) return "friends";
    return "home";
  }

  setInterval(() => {
    const nav = $(".gx6-nav");
    if (!nav) return;
    const cur = activeSection();
    nav.querySelectorAll("button[data-go]").forEach(b => b.classList.toggle("on", b.dataset.go === cur));

    // En Amigos, Ranking y Perfil la barra se fuerza visible (el menú principal la apaga solo)
    if (cur === "home") {
      nav.style.removeProperty("display");
    } else {
      nav.style.setProperty("display", "flex", "important");
      nav.style.setProperty("z-index", "950", "important");
      nav.style.setProperty("transform", "none", "important");
      nav.style.setProperty("opacity", "1", "important");
      nav.style.setProperty("visibility", "visible", "important");
    }
  }, 150);
})();
