/* GREYX LUDO — MENÚ PRINCIPAL v2 (Fase 1: solo presentación)
   Carga: <script src="greyx-menu-v2.js"></script> DESPUÉS de greyx-fijo.js
   - No toca tablero, Firebase, auth, stats ni modos de juego.
   - Lee datos reales desde window.GX.state.
   - Cada acceso reenvía el clic al botón original (el del menú anterior, que queda
     oculto pero vivo), así se conservan los listeners de los demás scripts. */
(() => {
  if (window.__gx8) return;
  window.__gx8 = true;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- CSS ---------- */
  const css = `
.gx6,.gx6-nav{display:none!important}
.g8,.g8-nav{--g8-bg:#050719;--g8-line:#3b46c9;--g8-glow:#5b6cff;--g8-vio:#8b5cf6;--g8-gold:#fbbf24;--g8-txt:#f1f3ff;--g8-mut:#9aa4d6;--g8-nav:68px}
.g8{position:fixed;inset:0;z-index:85;display:none;color:var(--g8-txt);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  background:radial-gradient(circle at 50% 0,#3a1fa088,transparent 46%),radial-gradient(circle at 100% 38%,#2a3cc844,transparent 40%),radial-gradient(circle at 0 78%,#4c1d9555,transparent 42%),linear-gradient(180deg,#080a2a,#04051a);
  overflow-x:hidden;overflow-y:auto;overscroll-behavior:none;-webkit-overflow-scrolling:touch;
  padding:calc(10px + env(safe-area-inset-top,0px)) 14px calc(var(--g8-nav) + 14px + env(safe-area-inset-bottom,0px))}
.g8.on{display:block}
.g8-in{max-width:480px;min-height:100%;margin:0 auto;display:flex;flex-direction:column;gap:clamp(7px,1.3dvh,13px)}
.g8 button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.g8-card{border:1.5px solid var(--g8-line);border-radius:20px;background:linear-gradient(160deg,#121858ee,#080b2bee);box-shadow:0 0 18px #3b46c944,inset 0 1px 0 #ffffff1c}

/* encabezado */
.g8-studio{display:flex;align-items:center;justify-content:center;gap:10px;font:800 .6rem Inter,system-ui,sans-serif;letter-spacing:.34em;color:#8b8fe8}
.g8-studio::before,.g8-studio::after{content:"";height:1.5px;width:34px;background:linear-gradient(90deg,transparent,#4f46e5)}
.g8-studio::after{transform:scaleX(-1)}
.g8-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}
.g8-chip{justify-self:start;display:flex;align-items:center;gap:8px;max-width:100%;min-width:0;padding:4px 12px 4px 4px;border-radius:99px;border:1.5px solid #6d5cffaa;background:#0d1140cc;box-shadow:0 0 14px #4f46e555}
.g8-av{position:relative;flex:0 0 42px;width:42px;height:42px;display:grid;place-items:center;border-radius:50%;font-size:1.35rem;background:radial-gradient(circle at 35% 30%,#4c3fa8,#14172e);border:2px solid #a78bfa}
.g8-chip div{min-width:0;line-height:1.15}
.g8-chip b{display:block;font-size:.78rem;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:78px}
.g8-chip small{display:block;color:var(--g8-mut);font-size:.6rem;font-weight:800}
.g8-logo{display:flex;flex-direction:column;align-items:center;line-height:.9}
.g8-logo svg{height:clamp(46px,7.6dvh,66px);width:auto;filter:drop-shadow(0 0 14px #6d28d9cc)}
.g8-logo b{margin-top:2px;font:700 .72rem Syncopate,"Arial Black",sans-serif;letter-spacing:.18em;color:#fff}
.g8-logo b i{font-style:normal;color:#8b5cf6}
.g8-acts{justify-self:end;display:flex;gap:8px}
.g8-ic{position:relative;width:42px;height:42px;display:grid;place-items:center;border-radius:50%;border:1.5px solid #6d5cffaa;background:linear-gradient(145deg,#232a66,#0d1030);box-shadow:0 0 14px #4f46e566}
.g8-ic svg{width:21px;height:21px}
.g8-ic:active{transform:scale(.93)}
.g8-season{align-self:flex-end;display:flex;align-items:center;gap:8px;padding:5px 14px;border-radius:12px 4px 4px 12px;border:1px solid #6d5cff77;background:linear-gradient(90deg,#1a1f6b88,#0a0d30);font-size:.62rem;line-height:1.2}
.g8-season b{display:block;font-weight:900;letter-spacing:.08em;color:#c4b5fd}
.g8-season small{color:var(--g8-mut);font-weight:700;font-size:.55rem}

/* monedas */
.g8-wallet{display:flex;align-items:center;padding:7px 10px}
.g8-cur{flex:1;display:flex;align-items:center;gap:9px;min-width:0}
.g8-cur+.g8-cur{border-left:1px solid #ffffff1c;padding-left:10px}
.g8-coin{flex:0 0 34px;width:34px;height:34px;display:grid;place-items:center;font-size:1.2rem;border-radius:50%}
.g8-coin.gold{background:radial-gradient(circle at 35% 30%,#ffe27a,#d99a00);box-shadow:0 0 12px #fbbf2488}
.g8-coin.gem{background:none;filter:drop-shadow(0 0 8px #8b5cf6)}
.g8-cur div{flex:1;min-width:0;line-height:1.1}
.g8-cur small{display:block;color:var(--g8-mut);font:800 .55rem Inter,system-ui,sans-serif;letter-spacing:.14em}
.g8-cur b{font-size:1.15rem;font-weight:900}
.g8-plus{flex:0 0 32px;width:32px;height:32px;border-radius:10px;border:1.5px solid #5b6cff;background:#141a5acc;font-size:1.2rem;font-weight:900;opacity:.7}

/* título de sección */
.g8-sec{display:flex;align-items:center;justify-content:center;gap:12px;font:900 .95rem Inter,system-ui,sans-serif;letter-spacing:.16em}
.g8-sec::before,.g8-sec::after{content:"";flex:1;max-width:70px;height:2px;background:linear-gradient(90deg,transparent,#6d5cff)}
.g8-sec::after{transform:scaleX(-1)}

/* modos */
.g8-modes{flex:1 1 auto;min-height:128px;max-height:210px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.g8-mode{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:12px 6px 38px;border-radius:20px;border:2px solid var(--cc);background:var(--cb);box-shadow:0 0 18px var(--cg),inset 0 1px 0 #ffffff22;overflow:hidden}
.g8-mode svg{width:clamp(38px,6dvh,52px);height:auto;color:var(--ci);margin-bottom:6px}
.g8-mode strong{font-size:.92rem;font-weight:900;letter-spacing:.02em}
.g8-mode small{margin-top:5px;color:#b4bde6;font-size:.6rem;line-height:1.3;padding:0 2px}
.g8-mode u{position:absolute;right:8px;bottom:8px;width:28px;height:28px;display:grid;place-items:center;border-radius:50%;text-decoration:none;font-size:1rem;background:#ffffff14;border:1px solid #ffffff44}
.g8-mode.online{box-shadow:0 0 26px #38bdf8aa,inset 0 0 18px #38bdf822}
.g8-live{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e}
.g8-mode.pulse{animation:g8Pulse .7s ease-out 2}
@keyframes g8Pulse{50%{transform:scale(1.04);box-shadow:0 0 30px #fff}}

/* perfil competitivo */
.g8-prof{display:grid;grid-template-columns:1.1fr .85fr 1fr;align-items:center;gap:8px;padding:10px}
.g8-pid{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;text-align:center}
.g8-pid .g8-av{flex:none;width:clamp(48px,8dvh,62px);height:clamp(48px,8dvh,62px);font-size:1.8rem;box-shadow:0 0 16px #8b5cf6aa}
.g8-pid b{max-width:100%;font-size:.88rem;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-pid small{color:#a5b0ff;font-size:.66rem;font-weight:800}
.g8-pid small em{font-style:normal;font-size:.95rem;font-weight:900;color:#c4b5fd}
.g8-xp{width:100%;height:8px;border-radius:9px;border:1.5px solid #6d5cff;background:#0a0d30;overflow:hidden}
.g8-xp i{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#a78bfa)}
.g8-pid .g8-xpl{color:var(--g8-mut);font-size:.55rem;font-weight:800}
.g8-rank{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;padding:0 6px;border-left:1px solid #ffffff1c;border-right:1px solid #ffffff1c;align-self:stretch;justify-content:center}
.g8-emb{width:clamp(44px,7dvh,58px);height:auto}
.g8-rank b{font-size:.74rem;font-weight:900;letter-spacing:.06em;text-align:center}
.g8-seerank{padding:4px 8px;border-radius:99px;border:1.5px solid #5b6cff;background:#0d1140;font:800 .52rem Inter,system-ui,sans-serif;letter-spacing:.08em;color:#9fb0ff;white-space:nowrap}
.g8-stats{display:grid;gap:5px}
.g8-stats div{display:flex;align-items:center;gap:7px;line-height:1.05}
.g8-stats span{flex:0 0 22px;font-size:1.05rem;text-align:center}
.g8-stats b{display:block;font-size:.95rem;font-weight:900}
.g8-stats small{display:block;color:var(--g8-mut);font-size:.5rem;font-weight:800;letter-spacing:.1em}

/* accesos */
.g8-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.g8-tile{position:relative;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:5px;min-height:clamp(54px,8.4dvh,70px);padding:8px 10px;border-radius:16px;text-align:left}
.g8-tile span{font-size:1.35rem;line-height:1}
.g8-tile b{font-size:.68rem;font-weight:900;letter-spacing:.05em}
.g8-tile em{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-style:normal;color:#6a74d6;font-size:1.1rem}
.g8-tile i{position:absolute;right:8px;top:6px;font-style:normal;padding:2px 6px;border-radius:99px;background:#ffffff14;color:#aab3e8;font:800 .45rem Inter,system-ui,sans-serif;letter-spacing:.08em}
.g8-tile:active{transform:scale(.97)}
.g8-badge{position:absolute;left:30px;top:2px;min-width:16px;height:16px;padding:0 4px;display:none;place-items:center;border-radius:99px;background:#ef4444;color:#fff;font:900 .6rem Inter,system-ui,sans-serif}
.g8-badge.on{display:grid}

/* recompensa diaria */
.g8-daily{display:flex;align-items:center;gap:12px;padding:9px 12px;border-color:#d9a928aa;background:linear-gradient(120deg,#3b1d8f,#120a3a 60%,#2a1f06);box-shadow:0 0 18px #fbbf2433,inset 0 1px 0 #ffffff22}
.g8-daily>span{flex:0 0 46px;width:46px;height:46px;display:grid;place-items:center;font-size:1.7rem;border-radius:14px;background:radial-gradient(circle at 35% 30%,#7c3aed,#2a1070);border:1.5px solid #fbbf24aa}
.g8-daily div{flex:1;min-width:0;line-height:1.2}
.g8-daily b{display:block;font-size:.82rem;font-weight:900;letter-spacing:.03em}
.g8-daily small{color:#c9b6ff;font-size:.62rem;font-weight:700}
.g8-claim{padding:10px 14px;border-radius:99px;border:0;background:linear-gradient(135deg,#475569,#334155);color:#cbd5e1;font:900 .66rem Inter,system-ui,sans-serif;letter-spacing:.06em;opacity:.85}

/* navegación inferior */
.g8-nav{position:fixed;left:0;right:0;bottom:0;z-index:86;display:none;max-width:520px;margin:0 auto;padding:8px 6px max(8px,env(safe-area-inset-bottom,0px));border-radius:24px 24px 0 0;border:1.5px solid #2e3a9a99;border-bottom:0;background:linear-gradient(180deg,#0c1240f7,#070a24)}
.g8-nav.on{display:flex}
.g8-nav button{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;min-height:48px;border:0;background:transparent;color:#8e99d6;font:800 .66rem Inter,system-ui,sans-serif;letter-spacing:.04em}
.g8-nav button+button::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:1px;background:#ffffff14}
.g8-nav svg{width:25px;height:25px}
.g8-nav button.on{color:#a99dff}
.g8-nav button.on::after{content:"";position:absolute;bottom:-2px;width:44px;height:3px;border-radius:3px;background:#6d5cff;box-shadow:0 0 10px #6d5cff}
.g8-nav .play svg{width:30px;height:30px;color:#c4b5fd;filter:drop-shadow(0 0 8px #8b5cf6)}
.g8-toast{position:fixed;left:50%;bottom:calc(var(--g8-nav) + 22px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:90;padding:10px 18px;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 .8rem Inter,system-ui,sans-serif;box-shadow:0 10px 30px #000c;white-space:nowrap}

@media (max-height:700px){
  .g8-studio,.g8-season small{display:none}
  .g8-mode small{display:none}
  .g8-mode{padding-bottom:36px}
}
@media (min-width:700px){
  .g8{padding-left:24px;padding-right:24px}
  .g8-in{max-width:520px}
}
@media (prefers-reduced-motion:reduce){.g8-mode.pulse{animation:none}}
`;
  const st = document.createElement("style");
  st.id = "g8css";
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Iconos ---------- */
  const I = {
    logo: `<svg viewBox="40 10 630 540" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g8a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#b9bcc9"/></linearGradient><linearGradient id="g8b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#4c1fd0"/></linearGradient><linearGradient id="g8c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#e09a00"/></linearGradient></defs><g transform="translate(400,22)"><path d="M0 74L10 14L42 44L62 0L82 44L114 14L124 74Z" fill="url(#g8c)" stroke="#8a5a00" stroke-width="4" stroke-linejoin="round"/></g><path fill="url(#g8a)" d="M555 110H245C130 110 60 200 60 310C60 420 120 500 210 526L285 455C230 450 150 400 150 310C150 240 190 195 260 195H475Z"/><path fill="url(#g8a)" d="M255 295H440L385 365H275L237 318Z"/><path fill="url(#g8b)" stroke="#2a1580" stroke-width="5" d="M505 295H645L525 415L652 535H530L465 470L405 535H280Z"/></svg>`,
    people: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3.4"/><circle cx="16.5" cy="9" r="2.8" opacity=".85"/><path d="M3 19c.7-3.6 3-5.5 6-5.5s5.3 1.9 6 5.5z"/><path d="M14.5 14.2c.7-.3 1.3-.4 2-.4 2.4 0 4.2 1.5 4.8 4.2h-5.4c-.2-1.5-.6-2.8-1.4-3.8z" opacity=".85"/></svg>`,
    robot: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="8" width="14" height="11" rx="4"/><circle cx="9.5" cy="13.5" r="1.5" fill="#0b0e1a"/><circle cx="14.5" cy="13.5" r="1.5" fill="#0b0e1a"/><rect x="11" y="3.5" width="2" height="4"/><circle cx="12" cy="3.5" r="1.6"/></svg>`,
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z"/></svg>`,
    home: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L3 11h2.5v9h5v-6h3v6h5v-9H21z"/></svg>`,
    trophy: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10v4a5 5 0 0 1-10 0zM4 4h3v2.5A3 3 0 0 1 4 4zm16 0h-3v2.5A3 3 0 0 0 20 4zM11 12h2v4h3v2H8v-2h3z"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 20c.8-4 3.7-6 8-6s7.2 2 8 6z"/></svg>`,
    dice: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><g fill="#0b0e1a"><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="8.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/></g></svg>`,
    mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>`,
    gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>`
  };

  const emblem = color => `<svg class="g8-emb" viewBox="0 0 64 72" aria-hidden="true"><defs><linearGradient id="g8e" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".45" stop-color="${color}"/><stop offset="1" stop-color="#2a1580"/></linearGradient></defs><path d="M32 2L60 14V38C60 54 48 65 32 70C16 65 4 54 4 38V14Z" fill="url(#g8e)" stroke="#fbbf24" stroke-width="3" stroke-linejoin="round"/><path d="M32 16L44 36L32 56L20 36Z" fill="#ffffff" opacity=".35"/><path d="M32 16L44 36L32 56L20 36Z" fill="none" stroke="#fff" stroke-width="1.5"/></svg>`;

  /* ---------- Datos reales ---------- */
  function rankInfo(trophies) {
    // Reutiliza el sistema de rangos existente (greyx-ranking.js) si expone una función conocida.
    const hosts = ["GXRanking", "GXRank", "GXRanks", "GreyxRanking", "GreyxRank", "GXRangos"];
    const fns = ["rankFor", "getRank", "rankOf", "forTrophies", "tierFor", "getTier", "rank", "rangoPara", "getRango"];
    for (const h of hosts) {
      const R = window[h];
      if (!R) continue;
      for (const f of fns) {
        if (typeof R[f] !== "function") continue;
        try {
          const r = R[f](trophies);
          if (!r) continue;
          if (typeof r === "string") return { name: r };
          return { name: r.name || r.label || r.title || r.nombre || "", color: r.color || r.hex || r.c, icon: r.icon || r.emoji };
        } catch (e) {}
      }
    }
    return null;
  }

  function data() {
    const G = window.GX, s = G && G.state;
    if (!s) return null;
    const stats = s.stats || { played: 0, wins: 0, trophies: 0 };
    const tr = stats.trophies || 0;
    const xpOk = !!s.xpLoaded;
    const lv = xpOk ? s.xpLevel : Math.max(1, Math.floor(tr / 100) + 1);
    let pct = 0, label = "";
    if (xpOk) {
      pct = G.xpBarPct(s.xp);
      const base = G.xpForLevel(lv), next = G.xpForLevel(lv + 1);
      label = lv >= 100 ? "MÁX" : (s.xp - base) + " / " + (next - base);
    }
    const p = s.profile;
    const name = p ? p.username : (s.user && s.user.email ? s.user.email.split("@")[0] : "INVITADO");
    const avatar = p ? G.avatarEmoji(p.avatar) : "👤";
    const played = stats.played || 0, wins = stats.wins || 0;
    const rate = played ? Math.round(wins * 100 / played) + "%" : "0%";
    const req = (s.friendsIncoming || []).length;
    return { name, avatar, lv, pct, label, tr, played, wins, rate, req, rank: rankInfo(tr) };
  }

  /* ---------- Markup ---------- */
  const mode = (go, cls, c1, c2, glow, ic, icon, title, sub, live) => `
    <button class="g8-mode ${cls}" data-go="${go}" type="button" style="--cc:${c1};--cb:${c2};--cg:${glow};--ci:${ic}">
      ${icon}<strong>${live ? '<i class="g8-live"></i>' : ""}${title}</strong><small>${sub}</small><u>›</u>
    </button>`;

  const tile = (go, ico, label, soon) => `
    <button class="g8-card g8-tile" data-go="${go}" type="button">
      <span>${ico}</span><b>${label}</b>${soon ? "<i>PRONTO</i>" : "<em>›</em>"}
      ${go === "friends" ? '<strong class="g8-badge"></strong>' : ""}
    </button>`;

  function draw(d) {
    const rk = d.rank;
    box.innerHTML = `
    <div class="g8-in">
      <div class="g8-studio">GREYX STUDIOS</div>

      <div class="g8-top">
        <div class="g8-chip" data-go="profile" role="button">
          <span class="g8-av">${d.avatar}</span>
          <div><b>${esc(d.name)}</b><small>NV. ${d.lv}</small></div>
        </div>
        <div class="g8-logo">${I.logo}<b>LUDO <i>GREYX</i></b></div>
        <div class="g8-acts">
          <button class="g8-ic" data-go="mail" type="button" aria-label="Buzón">${I.mail}</button>
          <button class="g8-ic" data-go="settings" type="button" aria-label="Configuración">${I.gear}</button>
        </div>
      </div>

      <div class="g8-season"><div><b>TEMPORADA</b><small>Próximamente</small></div></div>

      <div class="g8-card g8-wallet">
        <div class="g8-cur"><span class="g8-coin gold">⭐</span><div><small>ORO</small><b>0</b></div>
          <button class="g8-plus" data-go="soon" data-msg="Las compras llegarán pronto" type="button" aria-label="Añadir oro">+</button></div>
        <div class="g8-cur"><span class="g8-coin gem">💎</span><div><small>DIAMANTES</small><b>0</b></div>
          <button class="g8-plus" data-go="soon" data-msg="Las compras llegarán pronto" type="button" aria-label="Añadir diamantes">+</button></div>
      </div>

      <div class="g8-sec">ELIGE TU MODO</div>

      <div class="g8-modes">
        ${mode("local", "", "#2f8bff", "linear-gradient(160deg,#17409e,#0a1347)", "#2a7bff66", "#4fb3ff", I.people, "LOCAL", "Juega con tus amigos en el mismo dispositivo")}
        ${mode("bot", "", "#9b6bff", "linear-gradient(160deg,#4d22b8,#140b45)", "#8b5cf666", "#c4b5fd", I.robot, "RETO IA", "Pon a prueba tu habilidad contra la IA")}
        ${mode("online", "online", "#38bdf8", "linear-gradient(160deg,#0f3d7a,#0a1535)", "#38bdf855", "#38bdf8", I.globe, "ONLINE", "Juega con jugadores de todo el mundo", true)}
      </div>

      <div class="g8-card g8-prof">
        <div class="g8-pid">
          <span class="g8-av">${d.avatar}</span>
          <b>${esc(d.name)}</b>
          <small>NV. <em>${d.lv}</em></small>
          <div class="g8-xp"><i style="width:${d.pct}%"></i></div>
          ${d.label ? `<span class="g8-xpl">${d.label}</span>` : ""}
        </div>
        <div class="g8-rank">
          ${emblem((rk && rk.color) || "#8b5cf6")}
          <b>${rk && rk.name ? esc(String(rk.name).toUpperCase()) : "SIN RANGO"}</b>
          <button class="g8-seerank" data-go="rank" type="button">VER RANGOS ›</button>
        </div>
        <div class="g8-stats">
          <div><span>🏆</span><p style="margin:0"><b>${d.tr}</b><small>TROFEOS</small></p></div>
          <div><span>⚔️</span><p style="margin:0"><b>${d.played}</b><small>PARTIDAS</small></p></div>
          <div><span>⭐</span><p style="margin:0"><b>${d.wins}</b><small>VICTORIAS</small></p></div>
          <div><span>🎯</span><p style="margin:0"><b>${d.rate}</b><small>WIN RATE</small></p></div>
        </div>
      </div>

      <div class="g8-grid">
        ${tile("friends", "👥", "AMIGOS")}
        ${tile("rank", "🏆", "RANKING")}
        ${tile("soon", "📋", "MISIONES", true)}
        ${tile("soon", "🏪", "TIENDA", true)}
        ${tile("soon", "🎒", "INVENTARIO", true)}
        ${tile("soon", "🎪", "EVENTOS", true)}
      </div>

      <div class="g8-card g8-daily">
        <span>🎁</span>
        <div><b>RECOMPENSA DIARIA</b><small>Muy pronto podrás reclamar tu premio</small></div>
        <button class="g8-claim" data-go="soon" data-msg="La recompensa diaria llegará pronto" type="button">PRONTO</button>
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
    <button class="on" data-go="home" type="button">${I.home}Inicio</button>
    <button data-go="friends" type="button">${I.people}Amigos</button>
    <button class="play" data-go="play" type="button">${I.dice}Jugar</button>
    <button data-go="rank" type="button">${I.trophy}Ranking</button>
    <button data-go="profile" type="button">${I.user}Perfil</button>`;
  document.body.appendChild(nav);

  /* ---------- Acciones: reenvían al botón original ---------- */
  const FALLBACK = { local: "local", bot: "mode", online: "online-open", friends: "friends-open", settings: "settings", profile: "settings" };

  function toast(m) {
    const t = document.createElement("div");
    t.className = "g8-toast";
    t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  function fire(g) {
    const old = $('.gx6 [data-go="' + g + '"], .gx6-nav [data-go="' + g + '"]');
    if (old) { old.click(); return true; }
    const a = FALLBACK[g];
    const b = a && $('[data-action="' + a + '"]');
    if (b) { b.click(); return true; }
    return false;
  }

  function onGo(e) {
    const b = e.target.closest("[data-go]");
    if (!b) return;
    const g = b.dataset.go;
    if (g === "home") return;
    if (g === "soon") { toast(b.dataset.msg || "Próximamente"); return; }
    if (g === "play") {
      box.querySelectorAll(".g8-mode").forEach(m => {
        m.classList.remove("pulse"); void m.offsetWidth; m.classList.add("pulse");
      });
      return;
    }
    if (g === "mail") {
      const m = $('[data-action*="correo"],[data-action*="mail"],[data-go="correo"],.gx-mail,#gxMail,#gxCorreo');
      if (m && !box.contains(m)) m.click(); else toast("Buzón: próximamente");
      return;
    }
    if (g === "rank") { if (!fire("rank")) toast("Ranking: próximamente"); return; }
    fire(g);
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
  const root = document.getElementById("app");
  if (root) new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true, childList: true });
  setInterval(sync, 500);
  sync();
})();
