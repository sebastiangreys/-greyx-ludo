/* GREYX LUDO — MENÚ PRINCIPAL v2 (corrección Fase 1)
   Requiere greyx-assets.js (window.GXArt) cargado antes.
   - Solo presentación: no toca tablero, Firebase, auth, stats ni modos de juego.
   - Datos reales desde window.GX.state.
   - Cada acceso reenvía el clic al botón/función ORIGINAL (menú anterior, oculto pero vivo),
     así Amigos / Ranking / Perfil / Buzón de ideas abren exactamente los mismos widgets,
     sin ventanas ni listeners duplicados.
   - Composición proporcional: todo se mide en "u" (1% del ancho de la composición), y el ancho
     se limita por el alto disponible, así el menú entero cabe sin scroll en cualquier pantalla. */
(() => {
  if (window.__gx8) return;
  const A = window.GXArt;
  if (!A) { console.warn("greyx-menu-v2: falta greyx-assets.js; se conserva el menú anterior."); return; }
  window.__gx8 = true;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- CSS (las medidas "Nu" se convierten en N × 1% del ancho de la composición) ---------- */
  const U = s => s.replace(/(-?\d*\.?\d+)u\b/g, "calc(var(--u)*$1)");
  const css = U(`
.gx6,.gx6-nav{display:none!important}
.g8,.g8-nav{
  --H:calc(100vh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));
  --u:calc(min(100vw,var(--H)*.58)/100);
}
@supports (height:100dvh){.g8,.g8-nav{--H:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))}}

.g8{position:fixed;inset:0;z-index:85;display:none;overflow:hidden;overscroll-behavior:none;touch-action:manipulation;
  color:#f1f3ff;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#04051a;
  -webkit-user-select:none;user-select:none}
.g8.on{display:block}
.g8 *{box-sizing:border-box}
.g8 button{font:inherit;color:inherit;margin:0;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.g8 svg{display:block}
.g8-bg{position:absolute;inset:0;pointer-events:none}
.g8-bg svg{width:100%;height:100%}

.g8-in{position:relative;width:calc(var(--u)*100);height:100%;margin:0 auto;
  padding:calc(env(safe-area-inset-top,0px) + 1u) 4u calc(14.6u + env(safe-area-inset-bottom,0px) + 1u);
  display:flex;flex-direction:column;justify-content:space-between}

/* tarjeta base */
.g8-card{position:relative;border:1.5px solid #3b46c9;border-radius:3u;background:linear-gradient(160deg,#10165a,#070a2a);
  box-shadow:0 0 2u #3b46c944,inset 0 1px 0 #ffffff1c}

/* ---- encabezado ---- */
.g8-hd{display:flex;flex-direction:column;gap:.3u}
.g8-studio{display:flex;align-items:center;justify-content:center;gap:1.6u;font-size:max(7.5px,1.45u);font-weight:800;letter-spacing:.34em;color:#a2a6f5;line-height:1;padding-left:.34em}
.g8-studio::before,.g8-studio::after{content:"";width:9u;height:1.5px;background:linear-gradient(90deg,transparent,#5b52f0)}
.g8-studio::after{transform:scaleX(-1)}
.g8-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1u}
.g8-logo{width:32u}
.g8-logo svg{width:100%;height:auto;filter:drop-shadow(0 0 1.4u #6d28d9bb)}
.g8-acts{justify-self:end;display:flex;gap:1.3u}
.g8-ic{position:relative;width:max(40px,8.4u);height:max(40px,8.4u);display:grid;place-items:center;border-radius:50%;
  border:1.5px solid #6d5cffcc;background:linear-gradient(145deg,#2a3290,#0e1240);box-shadow:0 0 1.6u #4f46e588,inset 0 1px 0 #ffffff33}
.g8-ic svg{width:54%;height:54%}
.g8-ic.idea{justify-self:start;border-color:#fbbf24cc;box-shadow:0 0 1.8u #fbbf2477,inset 0 1px 0 #ffffff33}
.g8-ic.idea svg{width:62%;height:62%;filter:drop-shadow(0 0 .7u #fbbf24aa)}
.g8-ic:active{transform:scale(.93)}
.g8-dot{position:absolute;right:-.2u;top:-.2u;min-width:max(16px,3.2u);height:max(16px,3.2u);padding:0 .6u;border-radius:99px;background:#ef4444;color:#fff;
  font-size:max(9px,1.9u);font-weight:900;display:none;place-items:center;border:2px solid #0a0d30}
.g8-dot.on{display:grid}

/* ---- monedas ---- */
.g8-wallet{display:flex;align-items:center;height:10.9u;padding:0 2.2u;border-radius:3.4u}
.g8-cur{flex:1;display:flex;align-items:center;gap:1.5u;min-width:0}
.g8-cur .art{flex:none;width:7.6u}
.g8-cur .art svg{width:100%;height:auto;filter:drop-shadow(0 0 1u #fbbf2488)}
.g8-cur.gem .art svg{filter:drop-shadow(0 0 1u #8b5cf6cc)}
.g8-cur .txt{flex:1;min-width:0;line-height:1.1}
.g8-cur small{display:block;font-size:max(7.5px,1.65u);letter-spacing:.16em;color:#aab3ee;font-weight:800}
.g8-cur b{display:block;font-size:max(14px,3.5u);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-sep{flex:none;width:1px;height:6.5u;background:#ffffff26;margin:0 1.6u}
.g8-plus{flex:none;width:max(30px,6.2u);height:max(30px,6.2u);border-radius:1.7u;border:1.5px solid #6a78ff;
  background:linear-gradient(160deg,#2c37b0,#141b6c);box-shadow:0 0 1.2u #4f5cff66,inset 0 1px 0 #ffffff33;display:grid;place-items:center}
.g8-plus svg{width:55%;height:55%}
.g8-plus:active{transform:scale(.94)}

/* ---- título de sección ---- */
.g8-sec{position:relative;display:flex;align-items:center;justify-content:center;gap:1.8u;height:3.6u;margin-top:1.6u}
.g8-sec b{font-size:max(12px,3.1u);font-weight:900;letter-spacing:.22em;padding-left:.22em;white-space:nowrap}
.g8-sec i{flex:1;height:2px;background:linear-gradient(90deg,transparent,#6d5cff);position:relative}
.g8-sec i:last-of-type{transform:scaleX(-1)}
.g8-sec i::after{content:"";position:absolute;right:0;top:-2px;width:6px;height:6px;border-radius:50%;background:#8b7cff;box-shadow:0 0 6px #8b7cff}
.g8-sec .cr{position:absolute;left:50%;top:-2.6u;width:4.2u;transform:translateX(-50%)}
.g8-sec .cr svg{width:100%;height:auto}

/* ---- modos ---- */
.g8-modes{display:grid;grid-template-columns:1.03fr 1fr 1.1fr;gap:1.8u;height:36u}
.g8-mode{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:2.6u .8u 0;
  border-radius:3.2u;border:2px solid var(--bc);box-shadow:var(--bs);background:#08103a}
.g8-mode>*{position:relative;z-index:1}
.g8-mbg{position:absolute!important;inset:0;z-index:0!important;border-radius:inherit;overflow:hidden}
.g8-mbg svg{width:100%;height:100%}
.g8-mico{width:12u;height:12u;margin-bottom:.8u;filter:drop-shadow(0 0 1.4u var(--ig))}
.g8-mico svg{width:100%;height:100%}
.g8-mode strong{font-size:max(15px,3.9u);font-weight:900;line-height:1.05;letter-spacing:.01em;display:flex;align-items:center;gap:.8u;text-shadow:0 .2u .6u #0008}
.g8-mode small{margin-top:.8u;font-size:max(8.5px,1.85u);line-height:1.25;color:#c9d0f5;padding:0 .4u}
.g8-go{position:absolute!important;right:1.4u;bottom:1.4u;width:max(24px,5u);height:max(24px,5u);border-radius:50%;border:1.5px solid #ffffff66;
  background:#0b1240d9;display:grid;place-items:center;color:#fff;box-shadow:0 0 1u #0006}
.g8-go svg{width:52%;height:52%}
.g8-mode:active{transform:scale(.97)}
.g8-mode.local{--bc:#2f8bff;--bs:0 0 2.2u #2a7bff77,inset 0 0 2u #2a7bff33;--ig:#2a8bffcc}
.g8-mode.ia{--bc:#a37bff;--bs:0 0 2.2u #8b5cf688,inset 0 0 2u #8b5cf633;--ig:#a78bfacc}
.g8-mode.online{--bc:#46c8ff;--bs:0 0 3.2u #38bdf8cc,0 0 .8u #7fe0ff,inset 0 0 2.6u #38bdf844;--ig:#38bdf8cc}
.g8-mode .cr{position:absolute!important;left:50%;top:-2.9u;width:5.2u;transform:translateX(-50%);z-index:3!important}
.g8-mode .cr svg{width:100%;height:auto;filter:drop-shadow(0 0 .8u #fbbf24aa)}
.g8-live{flex:none;width:max(8px,1.9u);height:max(8px,1.9u);border-radius:50%;background:#22e06a;box-shadow:0 0 .9u #22e06a,0 0 .3u #fff}

/* ---- perfil / rango ---- */
.g8-prof{height:27u;display:grid;grid-template-columns:1.32fr .86fr 1fr;align-items:center;border-radius:3.2u;overflow:hidden;
  border-color:#4552d8;box-shadow:0 0 2.4u #3b46c966,inset 0 1px 0 #ffffff22}
.g8-pbg{position:absolute;inset:0;z-index:0}
.g8-pbg svg{width:100%;height:100%}
.g8-prof>div{position:relative;z-index:1;min-width:0;height:100%}
.g8-pl{display:flex;align-items:center;gap:1.4u;padding:0 1.2u 0 1.8u}
.g8-ring{position:relative;flex:none;width:max(46px,14u);height:max(46px,14u);padding:.55u;border-radius:50%;
  background:conic-gradient(from 210deg,#a78bfa,#38bdf8,#8b5cf6,#5b21b6,#a78bfa);box-shadow:0 0 2u #8b5cf6bb}
.g8-ring .av{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#4637b0,#0d0f2e);font-size:max(22px,6.8u);line-height:1}
.g8-ring .cr{position:absolute;left:50%;top:-1.8u;width:3.6u;transform:translateX(-50%)}
.g8-ring .cr svg{width:100%;height:auto}
.g8-pn{min-width:0;flex:1;display:flex;flex-direction:column;gap:.7u}
.g8-pn b{font-size:max(14px,3.9u);font-weight:900;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.01em}
.g8-lv{font-size:max(9.5px,2.4u);font-weight:800;color:#a5b0ff;letter-spacing:.06em;line-height:1}
.g8-lv em{font-style:normal;font-size:max(13px,3.5u);font-weight:900;color:#c9b8ff;margin-left:.4u}
.g8-bar{height:max(6px,1.5u);border-radius:9u;border:1.5px solid #6d5cff;background:#090c2e;overflow:hidden}
.g8-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#6d5cff,#38bdf8)}
.g8-xpl{font-size:max(7.5px,1.75u);color:#aab3ee;font-weight:700;line-height:1}
.g8-pm{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.9u;padding:0 .6u;
  border-left:1px solid #ffffff22;border-right:1px solid #ffffff22;margin:2.2u 0;height:auto!important;align-self:stretch}
.g8-pm svg{width:max(40px,12u);height:auto;filter:drop-shadow(0 0 1.4u #8b5cf6aa)}
.g8-pm b{font-size:max(9.5px,2.3u);font-weight:900;letter-spacing:.12em;padding-left:.12em;text-align:center;white-space:nowrap}
.g8-pr{display:flex;flex-direction:column;justify-content:space-evenly;padding:1.6u 1.2u 1.6u 2u}
.g8-st{display:flex;align-items:center;gap:1.3u;line-height:1.05}
.g8-st .ic{flex:none;width:max(17px,4.2u)}
.g8-st .ic svg{width:100%;height:auto}
.g8-st b{display:block;font-size:max(12px,2.9u);font-weight:900}
.g8-st small{display:block;font-size:max(6.5px,1.45u);letter-spacing:.1em;color:#9ea9e6;font-weight:800}

/* ---- accesos ---- */
.g8-tiles{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:14.8u;gap:1.6u}
.g8-tile{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:.6u;padding:0 1.4u;border-radius:2.8u;text-align:left;color:#fff;
  border-color:#3441c4}
.g8-tile:active{transform:scale(.97)}
.g8-tico{width:max(30px,8u);height:max(30px,8u);display:grid;place-items:center;border-radius:2u;border:1px solid #ffffff26;
  background:linear-gradient(145deg,#1d2678,#0b1042);box-shadow:inset 0 1px 0 #ffffff22}
.g8-tico svg{width:72%;height:72%}
.g8-tile b{font-size:max(9.5px,2.2u);font-weight:900;letter-spacing:.06em;line-height:1}
.g8-tarrow{position:absolute;right:1.3u;top:50%;transform:translateY(-50%);width:max(10px,2.2u);color:#6f7ad8}
.g8-tarrow svg{width:100%;height:auto}
.g8-soon{position:absolute;right:1.1u;top:1.2u;padding:.35u .8u;border-radius:99px;background:#ffffff14;color:#b5bdf0;font-style:normal;
  font-size:max(6px,1.3u);font-weight:800;letter-spacing:.08em;line-height:1.2}
.g8-badge{position:absolute;left:max(24px,6.2u);top:.7u;min-width:max(15px,3.2u);height:max(15px,3.2u);padding:0 .5u;display:none;place-items:center;
  border-radius:99px;background:#ef4444;color:#fff;font-size:max(9px,1.9u);font-weight:900;border:2px solid #0a0d30}
.g8-badge.on{display:grid}

/* ---- recompensa diaria ---- */
.g8-daily{height:13.3u;display:flex;align-items:center;gap:1.4u;padding:0 2.2u 0 .4u;border-radius:3u;border-color:#e0ac22;
  box-shadow:0 0 2.2u #fbbf2455,inset 0 1px 0 #ffffff33}
.g8-dbg{position:absolute;inset:0;border-radius:inherit;overflow:hidden;z-index:0}
.g8-dbg svg{width:100%;height:100%}
.g8-daily>*:not(.g8-dbg){position:relative;z-index:1}
.g8-chest{flex:none;width:19.5u;margin:-1.8u 0 -.6u}
.g8-chest svg{width:100%;height:auto;filter:drop-shadow(0 .4u 1u #000a)}
.g8-dtx{flex:1;min-width:0;line-height:1.2}
.g8-dtx b{display:flex;align-items:center;gap:.8u;font-size:max(11px,2.75u);font-weight:900;letter-spacing:.02em;white-space:nowrap}
.g8-dtx b svg{flex:none;width:max(14px,3.4u);height:auto}
.g8-dtx small{display:block;margin-top:.5u;font-size:max(8px,1.8u);color:#d4c6ff;font-weight:600}
.g8-claim{flex:none;display:flex;align-items:center;gap:.6u;height:max(30px,6.6u);padding:0 2.2u;border-radius:99px;
  background:linear-gradient(180deg,#ffd95a,#f59e0b)!important;color:#3a2200!important;font-weight:900;font-size:max(10px,2.3u);letter-spacing:.03em;
  box-shadow:0 .5u 0 #a86b00,0 0 2u #fbbf2477,inset 0 1px 0 #fff8}
.g8-claim svg{width:max(8px,1.8u);height:auto}
.g8-claim:active{transform:translateY(.4u)}

/* ---- navegación inferior (4 apartados) ---- */
.g8-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);z-index:86;display:none;width:calc(var(--u)*100);
  height:calc(14.6u + env(safe-area-inset-bottom,0px));padding:0 .6u env(safe-area-inset-bottom,0px);box-sizing:border-box;
  border-radius:4u 4u 0 0;border:1.5px solid #3646b0aa;border-bottom:0;background:linear-gradient(180deg,#0e1650f7,#070a26);
  box-shadow:0 -1u 3u #2a3cc844}
.g8-nav.on{display:flex}
.g8-nav button{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7u;
  border:0;background:none;color:#8794d8;font-family:Inter,system-ui,sans-serif;font-size:max(9px,2u);font-weight:800;letter-spacing:.08em;
  -webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer}
.g8-nav button+button::before{content:"";position:absolute;left:0;top:25%;bottom:25%;width:1px;background:#ffffff1c}
.g8-nav svg{width:max(22px,6u);height:max(22px,6u);opacity:.72;filter:saturate(.8)}
.g8-nav button.on{color:#c4b8ff}
.g8-nav button.on svg{opacity:1;filter:drop-shadow(0 0 1.1u #8b7cff)}
.g8-nav button.on::after{content:"";position:absolute;bottom:.6u;width:7u;height:3px;border-radius:3px;background:#7c6cff;box-shadow:0 0 1.2u #7c6cff}
.g8-nav button:active svg{transform:scale(.92)}

.g8-toast{position:fixed;left:50%;bottom:calc(14.6u + 2u + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:90;padding:1.2u 2.6u;
  border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 max(11px,2.3u) Inter,system-ui,sans-serif;
  box-shadow:0 1.2u 3.6u #000c;white-space:nowrap;max-width:94vw;overflow:hidden;text-overflow:ellipsis}
@media (prefers-reduced-motion:no-preference){.g8-live{animation:g8live 1.8s ease-in-out infinite}}
@keyframes g8live{50%{opacity:.55}}
`);
  const st = document.createElement("style");
  st.id = "g8css";
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Datos reales ---------- */
  const num = v => (typeof v === "number" && isFinite(v) ? v : 0);
  const fmt = v => num(v).toLocaleString("en-US");

  // Rango: reutiliza el sistema existente (greyx-ranking.js). Busca el dato ya calculado en el estado
  // y, si no, una función de rango expuesta por los módulos GX*. No crea otro sistema.
  const BAD = /open|show|render|load|close|mount|draw|init|fetch|sync|submit|save|listen|bind|toggle|list|all/i;
  const RANKY = /rank|rango|tier|league|liga|divis/i;
  function asRank(r) {
    if (!r) return null;
    if (typeof r === "string") return r.trim() ? { name: r.trim() } : null;
    if (typeof r === "object") {
      const name = r.name || r.label || r.title || r.nombre || r.rango;
      if (typeof name !== "string" || !name.trim()) return null;
      return { name: name.trim(), color: r.color || r.hex || r.c1, color2: r.color2 || r.c2,
               emblem: r.emblem || r.svg || r.img || r.image || r.icon };
    }
    return null;
  }
  let rankHit = null;
  function rankInfo(s, tr) {
    const direct = asRank(s.rank) || asRank(s.stats && (s.stats.rank || s.stats.rango)) || asRank(s.profile && s.profile.rank);
    if (direct) return direct;
    const call = (host, f) => { try { return asRank(host[f](tr)); } catch (e) { return null; } };
    if (rankHit) { const r = call(rankHit.h, rankHit.f); if (r) return r; rankHit = null; }
    const hosts = [window.GX];
    Object.keys(window).forEach(k => { if (/^(GX|Greyx|gx)/.test(k) && k !== "GX" && k !== "GXArt") hosts.push(window[k]); });
    for (const h of hosts) {
      if (!h || (typeof h !== "object" && typeof h !== "function")) continue;
      let keys = [];
      try { keys = Object.keys(h); } catch (e) {}
      for (const f of keys) {
        if (typeof h[f] !== "function" || !RANKY.test(f) || BAD.test(f)) continue;
        const r = call(h, f);
        if (r) { rankHit = { h, f }; return r; }
      }
    }
    return null;
  }

  function data() {
    const G = window.GX, s = G && G.state;
    if (!s) return null;
    const stats = s.stats || {};
    const tr = num(stats.trophies);
    const xpOk = !!s.xpLoaded;
    const lv = xpOk ? s.xpLevel : Math.max(1, Math.floor(tr / 100) + 1);
    let pct = 0, label = "";
    if (xpOk) {
      pct = G.xpBarPct(s.xp);
      const base = G.xpForLevel(lv), next = G.xpForLevel(lv + 1);
      label = lv >= 100 ? "100 / 100" : (s.xp - base) + " / " + (next - base);
    }
    const p = s.profile;
    const name = p ? p.username : (s.user && s.user.email ? s.user.email.split("@")[0] : "INVITADO");
    const played = num(stats.played), wins = num(stats.wins);
    const dot = $(".gx6 .gxi-dot");
    const ideas = dot && dot.style.display !== "none" && dot.textContent ? dot.textContent : "";
    return {
      name, avatar: p ? G.avatarEmoji(p.avatar) : "👤", lv, pct, label, tr, played, wins,
      rate: played ? Math.round(wins * 100 / played) + "%" : "0%",
      gold: num(stats.gold != null ? stats.gold : stats.oro != null ? stats.oro : stats.coins),
      gems: num(stats.gems != null ? stats.gems : stats.diamonds != null ? stats.diamonds : stats.diamantes),
      req: (s.friendsIncoming || []).length, ideas, rank: rankInfo(s, tr)
    };
  }

  /* ---------- Markup ---------- */
  function emblemOf(rk) {
    if (rk && typeof rk.emblem === "string") {
      const e = rk.emblem.trim();
      if (e.startsWith("<svg")) return e;
      if (/^(https?:|data:|\.{0,2}\/|[\w-]+\/)|\.(png|webp|jpe?g|svg)(\?|$)/i.test(e)) return `<img src="${esc(e)}" alt="" style="width:100%;height:auto">`;
    }
    return A.rankEmblem(rk && rk.color, rk && rk.color2);
  }

  const modeCard = (go, cls, bg, icon, title, sub, crown, live) => `
    <button class="g8-mode ${cls}" data-go="${go}" type="button" aria-label="${esc(title)}">
      <span class="g8-mbg">${bg}</span>
      ${crown ? `<span class="cr">${A.crown()}</span>` : ""}
      <span class="g8-mico">${icon}</span>
      <strong>${live ? '<i class="g8-live"></i>' : ""}${title}</strong>
      <small>${sub}</small>
      <span class="g8-go">${A.chev()}</span>
    </button>`;

  const tile = (go, ico, label, soon) => `
    <button class="g8-card g8-tile" data-go="${go}" type="button">
      <span class="g8-tico">${ico}</span><b>${label}</b>
      ${soon ? '<i class="g8-soon">PRONTO</i>' : `<span class="g8-tarrow">${A.chev()}</span>`}
      ${go === "friends" ? '<span class="g8-badge"></span>' : ""}
    </button>`;

  const stat = (ic, v, l) => `<div class="g8-st"><span class="ic">${ic}</span><span><b>${v}</b><small>${l}</small></span></div>`;

  function draw(d) {
    const rk = d.rank;
    box.innerHTML = `
    <div class="g8-bg">${A.menuBg()}</div>
    <div class="g8-in">

      <div class="g8-hd">
        <div class="g8-studio">GREYX STUDIOS</div>
        <div class="g8-top">
          <button class="g8-ic idea" data-go="ideas" type="button" aria-label="Buzón de ideas">${A.bulb()}<span class="g8-dot ${d.ideas ? "on" : ""}">${esc(d.ideas)}</span></button>
          <div class="g8-logo">${A.logoLockup()}</div>
          <div class="g8-acts">
            <button class="g8-ic" data-go="mail" type="button" aria-label="Mensajes">${A.mail()}</button>
            <button class="g8-ic" data-go="settings" type="button" aria-label="Configuración">${A.gear()}</button>
          </div>
        </div>
      </div>

      <div class="g8-card g8-wallet">
        <div class="g8-cur"><span class="art">${A.coin()}</span><span class="txt"><small>ORO</small><b>${fmt(d.gold)}</b></span>
          <button class="g8-plus" data-go="soon" data-msg="Conseguir oro estará disponible pronto" type="button" aria-label="Conseguir oro">${A.plus()}</button></div>
        <span class="g8-sep"></span>
        <div class="g8-cur gem"><span class="art">${A.gem()}</span><span class="txt"><small>DIAMANTES</small><b>${fmt(d.gems)}</b></span>
          <button class="g8-plus" data-go="soon" data-msg="Conseguir diamantes estará disponible pronto" type="button" aria-label="Conseguir diamantes">${A.plus()}</button></div>
      </div>

      <div class="g8-sec"><span class="cr">${A.crown()}</span><i></i><b>ELIGE TU MODO</b><i></i></div>

      <div class="g8-modes">
        ${modeCard("local", "local", A.modeBg("local"), A.people(), "LOCAL", "Juega con tus amigos en el mismo dispositivo")}
        ${modeCard("bot", "ia", A.modeBg("ia"), A.robot(), "RETO IA", "Pon a prueba tu habilidad contra la IA")}
        ${modeCard("online", "online", A.modeBg("online"), A.globe(), "ONLINE", "Juega con jugadores reales de todo el mundo", true, true)}
      </div>

      <div class="g8-card g8-prof">
        <span class="g8-pbg">${A.profileBg()}</span>
        <div class="g8-pl">
          <span class="g8-ring"><span class="cr">${A.crown()}</span><span class="av">${d.avatar}</span></span>
          <span class="g8-pn">
            <b>${esc(d.name)}</b>
            <span class="g8-lv">NV.<em>${d.lv}</em></span>
            <span class="g8-bar"><i style="width:${d.pct}%"></i></span>
            ${d.label ? `<span class="g8-xpl">${esc(d.label)}</span>` : ""}
          </span>
        </div>
        <div class="g8-pm">
          ${emblemOf(rk)}
          <b>${rk ? esc(rk.name.toUpperCase()) : "SIN RANGO"}</b>
        </div>
        <div class="g8-pr">
          ${stat(A.trophy(), fmt(d.tr), "TROFEOS")}
          ${stat(A.swords(), fmt(d.played), "PARTIDAS")}
          ${stat(A.star(), fmt(d.wins), "VICTORIAS")}
          ${stat(A.target(), d.rate, "WIN RATE")}
        </div>
      </div>

      <div class="g8-tiles">
        ${tile("friends", A.friends(), "AMIGOS")}
        ${tile("rank", A.trophy(), "RANKING")}
        ${tile("soon", A.missions(), "MISIONES", true)}
        ${tile("soon", A.shop(), "TIENDA", true)}
        ${tile("soon", A.backpack(), "INVENTARIO", true)}
        ${tile("soon", A.events(), "EVENTOS", true)}
      </div>

      <div class="g8-card g8-daily">
        <span class="g8-dbg">${A.dailyBg()}</span>
        <span class="g8-chest">${A.chest()}</span>
        <span class="g8-dtx"><b>${A.calendarGold()}RECOMPENSA DIARIA</b><small>Muy pronto: un premio cada día</small></span>
        <button class="g8-claim" data-go="soon" data-msg="La recompensa diaria estará disponible pronto" type="button">RECLAMAR${A.chev()}</button>
      </div>

    </div>`;

    const badge = box.querySelector(".g8-badge");
    if (badge && d.req) { badge.textContent = d.req > 9 ? "9+" : d.req; badge.classList.add("on"); }
    if (window.GX && GX.translateDOM) { try { GX.translateDOM(box); } catch (e) {} }
  }

  /* ---------- Contenedores ---------- */
  document.querySelectorAll(".g8,.g8-nav").forEach(e => e.remove());
  const box = document.createElement("div");
  box.className = "g8";
  document.body.appendChild(box);

  const nav = document.createElement("nav");
  nav.className = "g8-nav";
  nav.innerHTML = `
    <button class="on" data-go="home" type="button">${A.navHome()}INICIO</button>
    <button data-go="friends" type="button">${A.navFriends()}AMIGOS</button>
    <button data-go="rank" type="button">${A.navTrophy()}RANKING</button>
    <button data-go="profile" type="button">${A.navUser()}PERFIL</button>`;
  document.body.appendChild(nav);

  /* ---------- Acciones: siempre reenvían al destino original ---------- */
  const FALLBACK = { local: "local", bot: "mode", online: "online-open", friends: "friends-open", settings: "settings", profile: "settings" };

  function toast(m) {
    const t = document.createElement("div");
    t.className = "g8-toast";
    t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  // Misma función para el acceso del menú y el botón de la barra inferior => mismo widget.
  function openDest(g) {
    const old = $('.gx6 [data-go="' + g + '"], .gx6-nav [data-go="' + g + '"]');
    if (old) { old.click(); return true; }
    const a = FALLBACK[g];
    const b = a && $('[data-action="' + a + '"]');
    if (b) { b.click(); return true; }
    return false;
  }

  function legacy(re) {
    const els = document.querySelectorAll('.gx6 button,.gx6 [role="button"],.gx6 a,[data-action]');
    for (const el of els) {
      if (box.contains(el) || nav.contains(el) || el.closest(".gx6-nav,.gx6-set,.gxi-row")) continue;
      const t = el.id + " " + (typeof el.className === "string" ? el.className : "") + " " +
        (el.getAttribute("aria-label") || "") + " " + (el.dataset.action || "") + " " + (el.dataset.go || "") + " " + el.textContent;
      if (re.test(t)) return el;
    }
    return null;
  }

  function onGo(e) {
    const b = e.target.closest("[data-go]");
    if (!b) return;
    const g = b.dataset.go;
    if (g === "home") return;
    if (g === "soon") return toast(b.dataset.msg || "Próximamente");
    if (g === "ideas") {
      const i = $(".gx6 .gxi-btn");
      return i ? i.click() : toast("El buzón de ideas se está cargando");
    }
    if (g === "mail") {
      const m = legacy(/correo|mail|mensaj|inbox/i);
      return m ? m.click() : toast("Mensajes: próximamente");
    }
    if (!openDest(g) && g === "rank") toast("Ranking: próximamente");
  }
  box.addEventListener("click", onGo);
  nav.addEventListener("click", onGo);

  /* ---------- Sincronización con el menú original ---------- */
  let sig = "";
  function sync() {
    const on = !!$(".gx6.on");
    box.classList.toggle("on", on);
    nav.classList.toggle("on", on);
    if (!on) { sig = ""; return; }
    const d = data();
    if (!d) return;
    const k = JSON.stringify(d);
    if (k !== sig) { sig = k; draw(d); }
  }
  if (document.getElementById("app")) {
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true, childList: true });
  }
  setInterval(sync, 500);
  sync();
})();