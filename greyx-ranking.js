/* GREYX LUDO — Ranking competitivo (rangos + divisiones + Top 100 + Amigos)
   - Rango = f(trofeos reales). No se guarda en Firebase: nunca se desincroniza.
   - Elegibilidad: solo jugadores con trofeos >= 1 (publicProfiles.trophies >= 1).
   - Expone window.GXRank (rankOf, badge) para usar las insignias en cualquier pantalla.
   - Mantiene la barra inferior siempre visible (Inicio / Amigos / Ranking / Perfil).
   Requiere: greyx-extras.js (perfil de jugador) y, opcional, greyx-presence.js (conectados). */
(() => {
  "use strict";

  const G = () => window.GX;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const fmt = n => String(Math.floor(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  /* =====================================================
     1) SISTEMA DE RANGOS (una sola fuente de verdad)
     ===================================================== */
  const ROMAN = ["III", "II", "I"];           // índice 0 = inicial, 2 = superior
  const TIERS = [
    { k:"bronze",   n:"Bronce",   min:1,     max:499,  c1:"#f0a868", c2:"#8a4b14", l:"#ffd9b0", desc:"Aquí empieza todo jugador. Cada trofeo cuenta." },
    { k:"silver",   n:"Plata",    min:500,   max:999,  c1:"#dbe4f0", c2:"#64748b", l:"#ffffff", desc:"Ya sabes jugar. Ahora toca ser constante." },
    { k:"gold",     n:"Oro",      min:1000,  max:1999, c1:"#fcd34d", c2:"#b45309", l:"#fff3b8", desc:"Un jugador respetado. Pocos llegan hasta aquí." },
    { k:"platinum", n:"Platino",  min:2000,  max:4999, c1:"#38bdf8", c2:"#1d4ed8", l:"#c7ecff", desc:"Nivel competitivo alto. Rivales muy exigentes." },
    { k:"diamond",  n:"Diamante", min:5000,  max:9999, c1:"#c084fc", c2:"#6d28d9", l:"#f0dcff", desc:"La verdadera élite está cerca. Cada partida pesa." },
    { k:"elite",    n:"Élite",    min:10000, max:null, c1:"#fb7a4a", c2:"#b91c1c", l:"#ffe0b8", desc:"La cima del juego. Sin límite superior." }
  ];

  // Divisiones repartidas automáticamente en partes iguales dentro de cada intervalo.
  // Élite no tiene tope, así que cada división mide 1.000 trofeos.
  TIERS.forEach(t => {
    if (t.max == null) t.starts = [t.min, t.min + 1000, t.min + 2000];
    else {
      const size = t.max - t.min + 1;
      t.starts = [t.min, t.min + Math.ceil(size / 3), t.min + Math.ceil(2 * size / 3)];
    }
  });

  const rangeText = t => t.max == null ? fmt(t.min) + "+" : fmt(t.min) + " - " + fmt(t.max);
  const divRangeText = (t, i) => {
    const from = t.starts[i], to = i < 2 ? t.starts[i + 1] - 1 : t.max;
    return to == null ? fmt(from) + "+" : fmt(from) + " - " + fmt(to);
  };

  // trofeos -> rango (null si no está habilitado: 0 trofeos)
  function rankOf(raw) {
    const t = Math.floor(Number(raw) || 0);
    if (t < 1) return null;
    let ti = 0;
    for (let i = 0; i < TIERS.length; i++) if (t >= TIERS[i].min) ti = i;
    const tier = TIERS[ti];
    let di = 0;
    for (let i = 0; i < 3; i++) if (t >= tier.starts[i]) di = i;
    const cur = tier.starts[di];
    let next = null, nextLabel = null;
    if (di < 2) { next = tier.starts[di + 1]; nextLabel = tier.n + " " + ROMAN[di + 1]; }
    else if (TIERS[ti + 1]) { next = TIERS[ti + 1].min; nextLabel = TIERS[ti + 1].n + " III"; }
    return {
      t, ti, di, tier, k: tier.k, div: ROMAN[di], label: tier.n + " " + ROMAN[di],
      cur, next, nextLabel, need: next ? next - t : 0,
      pct: next ? Math.min(100, Math.max(0, (t - cur) / (next - cur) * 100)) : 100,
      score: ti * 3 + di
    };
  }

  /* =====================================================
     2) INSIGNIAS (SVG propio por rango; las divisiones se
        distinguen con 1, 2 o 3 puntos y brillo en la I)
     ===================================================== */
  function ensureDefs() {
    if ($("#rkDefs")) return;
    const g = TIERS.map(t => `
      <linearGradient id="rkg-${t.k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient>
      <linearGradient id="rkf-${t.k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.c2}" stop-opacity=".65"/><stop offset="1" stop-color="#0a0d26" stop-opacity="0"/></linearGradient>`).join("");
    document.body.insertAdjacentHTML("beforeend",
      `<svg id="rkDefs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>${g}</defs></svg>`);
  }

  function symbol(k, L) {
    switch (k) {
      case "bronze":
        return `<path d="M22 41l10-10 10 10" fill="none" stroke="${L}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      case "silver":
        return `<path d="M22 43l10-10 10 10M22 32l10-10 10 10" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
      case "gold":
        return `<polygon points="32,20 36,30.5 47,31 38.5,38 41.5,48.5 32,42.5 22.5,48.5 25.5,38 17,31 28,30.5" fill="${L}"/>`;
      case "platinum":
        return `<path d="M32 20l12 7v14l-12 7-12-7V27z" fill="${L}"/><path d="M32 27l6 3.5v7L32 41l-6-3.5v-7z" fill="#0e1230" opacity=".55"/>`;
      case "diamond":
        return `<path d="M32 20l13 12-13 18-13-18z" fill="${L}"/><path d="M19 32h26M26 32l6-12 6 12-6 18z" fill="none" stroke="#0e1230" stroke-opacity=".45" stroke-width="1.6" stroke-linejoin="round"/>`;
      default: // elite: corona
        return `<path d="M20 46l2-17 8 8 2-12 2 12 8-8 2 17z" fill="${L}" stroke="${L}" stroke-width="1.5" stroke-linejoin="round"/><rect x="20" y="47" width="24" height="3.4" rx="1.4" fill="${L}"/>`;
    }
  }

  // di: 0 (III) · 1 (II) · 2 (I) · null = sin división (para mostrar la categoría)
  function badge(k, di, size) {
    ensureDefs();
    const t = TIERS.find(x => x.k === k) || TIERS[0];
    const s = size || 40;
    let pips = "";
    if (di != null) {
      const n = di + 1;
      for (let i = 0; i < n; i++) pips += `<circle cx="${32 + (i - (n - 1) / 2) * 7.5}" cy="57.5" r="2.4" fill="${t.l}"/>`;
    }
    const glow = (di === 2 || k === "elite") ? `filter:drop-shadow(0 0 ${Math.max(3, s / 6)}px ${t.c1}bb);` : "";
    return `<svg class="rkb" viewBox="0 0 64 72" width="${s}" height="${Math.round(s * 1.125)}" style="${glow}" aria-hidden="true">
      <path d="M32 2l27 9v26c0 16-11 27-27 33C16 64 5 53 5 37V11z" fill="url(#rkg-${t.k})"/>
      <path d="M32 8l21 7v22c0 13-9 22-21 27-12-5-21-14-21-27V15z" fill="#0e1230"/>
      <path d="M32 8l21 7v22c0 13-9 22-21 27-12-5-21-14-21-27V15z" fill="url(#rkf-${t.k})"/>
      <path d="M32 8l21 7v22c0 13-9 22-21 27-12-5-21-14-21-27V15z" fill="none" stroke="${t.c1}" stroke-opacity=".55" stroke-width="1"/>
      ${symbol(t.k, t.l)}${pips}</svg>`;
  }
  const badgeFor = (r, size) => badge(r.k, r.di, size);

  window.GXRank = { TIERS, rankOf, badge, badgeFor, fmt };

  const CUP = (s = 15) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">
    <path d="M7 3h10v5a5 5 0 0 1-10 0V3z" fill="currentColor"/>
    <path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <rect x="10.8" y="13" width="2.4" height="4" fill="currentColor"/>
    <rect x="7.5" y="17" width="9" height="2.6" rx="1.1" fill="currentColor"/></svg>`;
  const CROWN = (c, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" style="filter:drop-shadow(0 0 6px ${c}99)">
    <path d="M3 18l1.5-10 4.5 4.5L12 5l3 7.5L19.5 8 21 18z" fill="${c}" stroke="#00000066" stroke-width="1" stroke-linejoin="round"/>
    <rect x="3.5" y="18.6" width="17" height="2.2" rx="1" fill="${c}" stroke="#00000066" stroke-width=".8"/></svg>`;
  const REFRESH = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4.5h-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const BACK = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const INFO = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.6v.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;

  /* ---------- Estilos ---------- */
  const st = document.createElement("style");
  st.textContent = `
  .gx6-nav{z-index:950!important}
  body:has(.friends-screen) .gx6-nav{display:flex}
  .friends-screen{padding-bottom:130px!important}
  body:has(#gxRank) .gx-fab{display:none!important}

  .rk{position:fixed;inset:0;z-index:190;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#f4f6ff;
    background:radial-gradient(120% 45% at 50% 0,#4c2fd066,transparent 60%),radial-gradient(70% 40% at 100% 55%,#1d4ed833,transparent 60%),linear-gradient(180deg,#0a0f33,#050716);
    padding:calc(12px + env(safe-area-inset-top,0px)) 14px calc(116px + env(safe-area-inset-bottom,0px));
    animation:rkIn .3s ease both;font-family:Inter,system-ui,-apple-system,sans-serif}
  @keyframes rkIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .rk-in{max-width:480px;margin:0 auto}
  .rk button{font:inherit;cursor:pointer;color:inherit}
  .rk-card{border-radius:22px;border:1px solid #5b6cff40;margin-bottom:12px;
    background:linear-gradient(160deg,#141a4ad9,#0a0e2ad9);box-shadow:0 0 26px #4f46e522,0 12px 30px #0008,inset 0 1px 0 #ffffff14}

  .rk-top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;margin-bottom:14px}
  .rk-ib{width:44px;height:44px;border-radius:14px;border:1.5px solid #6d7bff88;background:linear-gradient(145deg,#1b2370,#0d1240);
    color:#fff;display:grid;place-items:center;padding:0;box-shadow:0 0 16px #4f46e555}
  .rk-ib:active{transform:scale(.94)}
  .rk-title{text-align:center}
  .rk-title h1{margin:0;font-size:1.45rem;font-weight:900;letter-spacing:.06em;
    background:linear-gradient(180deg,#fff,#b8c4ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 12px #6d7bffaa)}
  .rk-title p{margin:3px 0 0;color:#8fa0ff;font-size:.68rem;font-weight:600;line-height:1.3}

  /* --- Tu posición --- */
  .rk-hero{padding:14px;display:grid;gap:12px}
  .rk-k{font:800 .62rem monospace;letter-spacing:.16em;color:#a5b4fc}
  .rk-me{display:flex;align-items:center;gap:12px}
  .rk-big{font:900 2.2rem/1 Inter,system-ui,sans-serif;background:linear-gradient(180deg,#fff,#fbbf24);
    -webkit-background-clip:text;background-clip:text;color:transparent;min-width:58px}
  .rk-bigav{position:relative;flex:none;width:62px;height:62px;border-radius:50%;display:grid;place-items:center;font-size:2rem;
    background:radial-gradient(circle at 35% 30%,#3b3f75,#12152c);border:3px solid var(--rc,#8b5cf6);box-shadow:0 0 20px var(--rc,#8b5cf6)}
  .rk-bigav em{position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);padding:2px 8px;border-radius:99px;white-space:nowrap;
    background:linear-gradient(135deg,#fbbf24,#d97706);color:#2a1600;font:900 .55rem Inter,sans-serif;font-style:normal;border:1.5px solid #fff8}
  .rk-who{flex:1;min-width:0}
  .rk-who b{display:block;font-size:1.05rem;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rk-rp{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:#0a0d2a99;border:1px solid #ffffff14}
  .rk-rb{flex:none;display:grid;place-items:center;width:70px}
  .rk-rt{flex:1;min-width:0}
  .rk-rl{display:block;font-size:1.25rem;font-weight:900;margin-bottom:7px}
  .rk-bar{height:9px;border-radius:99px;background:#0b1030;border:1px solid #ffffff1c;overflow:hidden}
  .rk-bar i{display:block;height:100%;border-radius:99px;box-shadow:0 0 10px currentColor}
  .rk-rt small{display:block;margin-top:7px;color:#b6bfe8;font-size:.7rem;line-height:1.35}
  .rk-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .rk-mini div{padding:10px 4px;border-radius:14px;text-align:center;background:#0a0d2a99;border:1px solid #ffffff14}
  .rk-mini b{display:flex;align-items:center;justify-content:center;gap:5px;font-size:1.1rem;color:#fff}
  .rk-mini div.tr b{color:#fbbf24}
  .rk-mini span{font-size:.55rem;color:#9aa6d8;letter-spacing:.1em;font-weight:700}
  .rk-lock{display:grid;place-items:center;width:70px;height:70px;border-radius:50%;font-size:1.9rem;background:#ffffff0a;border:2px dashed #ffffff33}
  .rk-note{margin:8px 0 0;color:#b6bfe8;font-size:.8rem;line-height:1.45}

  /* --- Pestañas --- */
  .rk-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:6px;margin-bottom:12px;border-radius:18px;
    background:#0a0e2acc;border:1px solid #5b6cff40}
  .rk-tab{display:flex;align-items:center;justify-content:center;gap:8px;min-height:46px;border:0;border-radius:13px;
    background:transparent;color:#aab3e8;font-weight:800;font-size:.8rem;letter-spacing:.04em}
  .rk-tab.on{color:#fff;background:linear-gradient(135deg,#7c5cff,#4f2fd8);box-shadow:0 0 20px #7c5cff77,inset 0 1px 0 #ffffff44}

  /* --- Categorías --- */
  .rk-cats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px;margin-bottom:12px}
  .rk-cat{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 4px 9px;border-radius:16px;
    border:1.5px solid #ffffff14;background:linear-gradient(170deg,#ffffff0d,#ffffff03)}
  .rk-cat b{font-size:.74rem;font-weight:900;color:var(--c);text-transform:uppercase;letter-spacing:.03em}
  .rk-cat small{font-size:.62rem;color:#b6bfe8;font-weight:600}
  .rk-dv{font:800 .52rem monospace;letter-spacing:.1em;color:#7f8bc0}
  .rk-cat.cur{border-color:var(--c);box-shadow:0 0 18px color-mix(in srgb,var(--c) 45%,transparent),inset 0 0 18px color-mix(in srgb,var(--c) 14%,transparent)}
  .rk-cat:active{transform:scale(.96)}

  /* --- Tabla --- */
  .rk-table{padding:14px}
  .rk-th{display:flex;align-items:center;gap:10px;margin-bottom:12px}
  .rk-th .ico{color:#a78bfa;flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:#7c5cff22}
  .rk-th .ico svg{width:26px;height:26px}
  .rk-th h2{margin:0;font-size:1.15rem;font-weight:900}
  .rk-th p{margin:2px 0 0;font-size:.7rem;color:#9aa6d8}
  .rk-th .rk-ib{margin-left:auto;width:40px;height:40px;border-radius:12px}
  .rk-tools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
  .rk-search,.rk-sel{width:100%;box-sizing:border-box;min-height:46px;padding:0 14px;border-radius:14px;border:1.5px solid #5b6cff55;
    background:#080b26;color:#fff;font:600 16px Inter,system-ui,sans-serif;outline:0}
  .rk-search:focus,.rk-sel:focus{border-color:#a78bfa}
  .rk-sel{font-size:.82rem;font-weight:700;appearance:none;-webkit-appearance:none;
    background-image:linear-gradient(45deg,transparent 50%,#a5b4fc 50%),linear-gradient(135deg,#a5b4fc 50%,transparent 50%);
    background-position:calc(100% - 20px) 20px,calc(100% - 14px) 20px;background-size:6px 6px;background-repeat:no-repeat;padding-right:34px}
  .rk-thead{display:none}

  .rk-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;margin-bottom:8px;cursor:pointer;
    background:#090c2acc;border:1px solid #ffffff14}
  .rk-row:active{transform:scale(.99)}
  .rk-row.me{border-color:#fbbf24;background:linear-gradient(90deg,#fbbf2418,#090c2acc);box-shadow:0 0 16px #fbbf2433}
  .rk-row.t1{border-color:#fbbf24;background:linear-gradient(90deg,#fbbf2430,#0b0e2acc 70%);box-shadow:0 0 24px #fbbf2455,inset 0 0 20px #fbbf2414}
  .rk-row.t2{border-color:#cbd5e1;background:linear-gradient(90deg,#cbd5e124,#0b0e2acc 70%);box-shadow:0 0 18px #cbd5e133}
  .rk-row.t3{border-color:#e0894a;background:linear-gradient(90deg,#e0894a26,#0b0e2acc 70%);box-shadow:0 0 18px #e0894a33}
  .rk-pos{flex:none;width:38px;display:flex;flex-direction:column;align-items:center;gap:1px;font:900 .95rem Inter,system-ui,sans-serif;color:#b6bfe8}
  .rk-row.t1 .rk-pos{color:#fcd34d}.rk-row.t2 .rk-pos{color:#e2e8f0}.rk-row.t3 .rk-pos{color:#f0a868}
  .rk-av{width:42px;height:42px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:1.35rem;
    background:radial-gradient(circle at 35% 30%,#3b3f75,#12152c);border:2.5px solid var(--rc,#ffffff33)}
  .rk-info{flex:1;min-width:0}
  .rk-info b{display:block;font-size:.88rem;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rk-info small{display:block;color:#8e9acd;font-size:.64rem;font-weight:600;margin-top:1px}
  .rk-st{display:flex;align-items:center;font-size:.64rem;color:#7c86ad;font-weight:700;margin-top:2px}
  .rk-st i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#64748b;margin-right:5px}
  .rk-st.on{color:#34d399}.rk-st.on i{background:#34d399;box-shadow:0 0 6px #34d399}
  .rk-inl{display:flex;align-items:center;gap:5px;margin-top:3px;font-size:.7rem;font-weight:800;color:var(--rc)}
  .rk-rcol{display:none}
  .rk-tr{display:flex;align-items:center;gap:5px;color:#fbbf24;font-weight:900;font-size:.95rem;flex:none}
  .rk-chev{display:none;color:#8e9acd;font-size:1.3rem}

  .rk-foot{display:flex;align-items:center;gap:10px;margin-top:6px;padding:10px 12px;border-radius:14px;background:#080b26;border:1px solid #ffffff14}
  .rk-foot p{margin:0;flex:1;color:#9aa6d8;font-size:.7rem;line-height:1.35}
  .rk-foot button{flex:none;padding:9px 14px;border:0;border-radius:12px;font-weight:800;font-size:.72rem;
    background:linear-gradient(135deg,#7c5cff,#4f2fd8);box-shadow:0 3px 0 #2a1a8a}
  .rk-empty{padding:24px 14px;text-align:center;color:#aab3d6;border-radius:18px;background:#090c2acc;border:1px solid #ffffff12;font-size:.85rem;line-height:1.5}
  .rk-btn{margin-top:12px;padding:12px 18px;border:0;border-radius:14px;color:#fff;font-weight:900;
    background:linear-gradient(135deg,#a78bfa,#7c3aed);box-shadow:0 4px 0 #3b1d8f}

  /* --- Modales --- */
  .rk-mo{position:fixed;inset:0;z-index:260;display:grid;place-items:center;padding:18px;background:rgba(4,6,20,.86);animation:rkIn .2s ease both}
  .rk-mc{position:relative;width:min(400px,100%);max-height:86vh;overflow-y:auto;padding:22px 16px 16px;border-radius:26px;text-align:center;
    border:1.5px solid var(--c,#7c5cff);background:linear-gradient(160deg,#171d54,#0a0e2a);
    box-shadow:0 30px 80px #000c,0 0 40px color-mix(in srgb,var(--c,#7c5cff) 35%,transparent)}
  .rk-mc h3{margin:6px 0 2px;font-size:1.4rem;font-weight:900;color:var(--c,#fff);text-transform:uppercase;letter-spacing:.04em}
  .rk-mc .rg{color:#c6cdf5;font-weight:800;font-size:.85rem}
  .rk-mc p{margin:10px 0;color:#aab3d6;font-size:.82rem;line-height:1.5}
  .rk-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:12px;border:1px solid #ffffff22;background:#ffffff12;color:#fff;padding:0}
  .rk-dr{display:flex;align-items:center;gap:12px;padding:10px 12px;margin-top:8px;border-radius:16px;text-align:left;background:#ffffff08;border:1px solid #ffffff14}
  .rk-dr.cur{border-color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent)}
  .rk-dr div{flex:1}
  .rk-dr b{display:block;font-size:.92rem}
  .rk-dr small{color:#aab3d6;font-size:.72rem}
  .rk-dr span{font-size:.66rem;font-weight:800;color:#9aa6d8}
  .rk-dr.cur span{color:var(--c)}
  .rk-mc .rk-btn{width:100%;margin-top:10px}
  .rk-ghost{background:#ffffff10!important;box-shadow:none!important;border:1px solid #ffffff22!important}
  .rk-rules{display:grid;gap:8px;margin-top:12px;text-align:left}
  .rk-rules div{display:flex;gap:10px;padding:10px 12px;border-radius:14px;background:#ffffff08;border:1px solid #ffffff12;font-size:.78rem;color:#c6cdf5;line-height:1.4}
  .rk-rules i{font-style:normal;flex:none}
  .rk-toast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:10px;
    padding:10px 18px;border-radius:99px;background:#111631;border:1.5px solid #fbbf24;color:#fff;font-weight:800;font-size:.85rem;box-shadow:0 10px 30px #000c;animation:rkIn .3s ease both}

  /* --- Insignia en perfiles --- */
  .pl-stats .rk-prow{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:10px}
  .rk-prow strong{font-size:.95rem;font-weight:900}
  .rk-prow i{font-style:normal;color:#94a3b8;font:700 .6rem monospace;letter-spacing:.08em}
  .rk-pbi{display:inline-flex;align-items:center;gap:6px;margin-left:12px;font-size:.85rem;font-weight:900}

  /* --- Tablet / PC --- */
  @media (min-width:720px){
    .rk{padding-left:28px;padding-right:28px}
    .rk-in{max-width:1080px}
    .rk-title h1{font-size:1.8rem}.rk-title p{font-size:.8rem}
    .rk-hero{grid-template-columns:1.1fr 1.4fr 1fr;align-items:center;gap:16px;padding:18px}
    .rk-hero .rk-k{grid-column:1/-1;margin-bottom:-6px}
    .rk-mini{grid-template-columns:1fr;gap:8px}
    .rk-mini div{display:flex;align-items:center;justify-content:space-between;padding:10px 14px}
    .rk-mini b{order:2;font-size:1.05rem}.rk-mini span{order:1;font-size:.62rem}
    .rk-cats{grid-template-columns:repeat(6,1fr);gap:10px;padding:12px}
    .rk-tools{grid-template-columns:1fr 280px}
    .rk-thead{display:grid;grid-template-columns:70px 54px 1fr 220px 120px 20px;gap:10px;padding:8px 12px;margin-bottom:6px;
      font:800 .66rem monospace;letter-spacing:.14em;color:#8e9acd;border-radius:12px;background:#080b26;border:1px solid #ffffff10}
    .rk-thead span:nth-child(5){text-align:right}
    .rk-row{display:grid;grid-template-columns:70px 54px 1fr 220px 120px 20px;gap:10px;padding:10px 12px}
    .rk-pos{flex-direction:row;justify-content:flex-start;gap:6px;width:auto;font-size:1rem}
    .rk-av{width:48px;height:48px}
    .rk-inl{display:none}
    .rk-rcol{display:flex;align-items:center;gap:10px;font-weight:900;font-size:.92rem;color:var(--rc)}
    .rk-tr{justify-content:flex-end;font-size:1.05rem}
    .rk-chev{display:block}
  }
  `;
  document.head.appendChild(st);

  /* =====================================================
     3) DATOS
     ===================================================== */
  const rk = {
    tab: "general", filter: "all", q: "", modal: null,
    rows: null, me: null, mine: null, pos: 0, err: "", at: 0, loading: false, note: "",
    friends: null, friendsAt: 0, friendsLoading: false, friendsErr: "",
    online: null
  };

  const isOn = uid => {
    const g = G();
    if (g && g.state.user && uid === g.state.user.uid) return true;
    return rk.online ? rk.online.has(uid) : null;
  };

  // Conectados: solo se muestra si Realtime Database deja leer la presencia
  async function loadPresence() {
    rk.online = null;
    try {
      const P = window.GXPresence;
      if (!P) return;
      const { db, mod } = await P.get();
      if (!db) return;
      const snap = await mod.get(mod.query(mod.ref(db, "presence"), mod.orderByChild("state"), mod.equalTo("online")));
      const stale = P.stale || 150000, now = Date.now(), set = new Set();
      snap.forEach(c => { const v = c.val(); if (v && now - (v.last || 0) < stale) set.add(c.key); });
      rk.online = set;
    } catch (e) { rk.online = null; }
  }

  // Memoriza el rango actual para avisar cuando suba o baje
  function setBase(trophies) {
    try {
      const g = G(); if (!g || !g.state.user) return;
      const r = rankOf(trophies);
      localStorage.setItem("gx-rank-" + g.state.user.uid, r ? String(r.score) : "none");
    } catch (e) {}
  }

  async function loadRank(force) {
    const g = G();
    if (!g || !g.state.user || !g.fb || !g.fb.db) {
      rk.rows = []; rk.err = "login"; rk.loading = false; return drawRank();
    }
    if (!force && rk.rows && rk.err !== "login" && Date.now() - rk.at < 45000) return drawRank();

    rk.loading = true; rk.err = ""; drawRank();
    try {
      const fs = await g.fsModule(), db = g.fb.db, uid = g.state.user.uid;
      // Solo jugadores con 1+ trofeos: quien baja a 0 desaparece solo y vuelve al ganar uno
      const sn = await fs.getDocs(fs.query(fs.collection(db, "publicProfiles"),
        fs.where("trophies", ">=", 1), fs.orderBy("trophies", "desc"), fs.limit(100)));

      const seen = new Set();
      rk.rows = sn.docs.filter(d => !seen.has(d.id) && seen.add(d.id))
        .map(d => Object.assign({ uid: d.id }, d.data()));

      const idx = rk.rows.findIndex(p => p.uid === uid);
      let me = idx >= 0 ? rk.rows[idx] : null;
      rk.pos = idx >= 0 ? idx + 1 : 0;

      if (!me) {
        try {
          const m = await fs.getDoc(fs.doc(db, "publicProfiles", uid));
          if (m.exists()) {
            me = Object.assign({ uid }, m.data());
            if ((me.trophies || 0) >= 1) {
              const c = await fs.getCountFromServer(fs.query(fs.collection(db, "publicProfiles"),
                fs.where("trophies", ">", me.trophies || 0)));
              rk.pos = c.data().count + 1;
            }
          }
        } catch (e) { /* sin posición */ }
      }
      rk.me = me;
      rk.mine = me && (me.trophies || 0) >= 1 ? me : null;
      if (me) setBase(me.trophies);
      rk.at = Date.now();
    } catch (e) {
      console.warn("ranking", e);
      rk.err = "net";
      if (!rk.rows) rk.rows = [];
    }
    rk.loading = false;
    drawRank();
    loadPresence().then(renderList);
  }

  // Ranking de amigos: mismas reglas (1+ trofeos), ordenado por trofeos
  async function loadFriends(force) {
    const g = G();
    if (!g || !g.state.user || !g.fb || !g.fb.db) { rk.friends = []; return renderList(); }
    if (!force && rk.friends && Date.now() - rk.friendsAt < 45000) return renderList();
    rk.friendsLoading = true; rk.friendsErr = ""; renderList();
    try {
      const fs = await g.fsModule(), db = g.fb.db, uid = g.state.user.uid;
      const fr = await fs.getDocs(fs.collection(db, "users", uid, "friends"));
      const ids = [...new Set(fr.docs.map(d => d.id).concat(uid))].slice(0, 120);
      const snaps = await Promise.all(ids.map(id => fs.getDoc(fs.doc(db, "publicProfiles", id)).catch(() => null)));
      const map = new Map();
      snaps.forEach((s, i) => {
        if (s && s.exists() && (s.data().trophies || 0) >= 1) map.set(ids[i], Object.assign({ uid: ids[i] }, s.data()));
      });
      rk.friends = [...map.values()].sort((a, b) => (b.trophies || 0) - (a.trophies || 0));
      rk.friendsAt = Date.now();
    } catch (e) {
      console.warn("friends ranking", e);
      rk.friendsErr = "net";
      if (!rk.friends) rk.friends = [];
    }
    rk.friendsLoading = false;
    renderList();
    loadPresence().then(renderList);
  }

  /* =====================================================
     4) PANTALLA
     ===================================================== */
  function openRank() {
    ensureDefs();
    let el = $("#gxRank");
    if (!el) {
      el = document.createElement("div");
      el.id = "gxRank";
      el.className = "rk";
      el.addEventListener("click", onClick);
      el.addEventListener("input", e => {
        if (e.target.id === "rkQ") { rk.q = e.target.value; rk.note = ""; renderList(); }
      });
      el.addEventListener("change", e => {
        if (e.target.id === "rkF") { rk.filter = e.target.value; renderList(); }
      });
      document.body.appendChild(el);
    }
    el.scrollTop = 0;
    rk.q = ""; rk.note = ""; rk.modal = null; rk.tab = "general"; rk.filter = "all";
    loadRank(false);
  }
  function closeRank() { const el = $("#gxRank"); if (el) el.remove(); }

  function heroHtml() {
    const g = G(), s = g.state;
    if (!s.user) {
      return `<section class="rk-card rk-hero"><div class="rk-k">TU POSICIÓN</div>
        <p class="rk-note">Inicia sesión para ver tu posición y tu rango.</p>
        <button class="rk-btn" data-k="login" type="button">Iniciar sesión</button></section>`;
    }
    if (rk.loading && !rk.rows) {
      return `<section class="rk-card rk-hero"><div class="rk-k">TU POSICIÓN</div><p class="rk-note">Cargando…</p></section>`;
    }
    const m = rk.me || {}, prof = s.profile || {}, stt = s.stats || {};
    const name = m.username || prof.username || "jugador";
    const avatar = g.avatarEmoji(m.avatar || prof.avatar);
    const xp = m.xp != null ? m.xp : (s.xp || 0);
    const lv = g.xpLevelFromTotal(xp);
    const tr = m.trophies != null ? m.trophies : (stt.trophies || 0);
    const wins = m.wins != null ? m.wins : (stt.wins || 0);
    const played = m.played != null ? m.played : (stt.played || 0);
    const r = rankOf(tr);
    const col = r ? r.tier.c1 : "#64748b";

    const panel = r ? `
      <div class="rk-rp">
        <div class="rk-rb">${badgeFor(r, 62)}</div>
        <div class="rk-rt">
          <span class="rk-rl" style="color:${r.tier.c1}">${r.label}</span>
          <div class="rk-bar"><i style="width:${r.pct.toFixed(1)}%;color:${r.tier.c1};background:linear-gradient(90deg,${r.tier.c2},${r.tier.c1})"></i></div>
          <small>${r.next
            ? `${fmt(tr - r.cur)} / ${fmt(r.next - r.cur)} trofeos · Te faltan <b>${fmt(r.need)}</b> para ${esc(r.nextLabel)}`
            : "¡Rango máximo alcanzado!"}</small>
        </div>
      </div>` : `
      <div class="rk-rp">
        <div class="rk-rb"><span class="rk-lock">🔒</span></div>
        <div class="rk-rt">
          <span class="rk-rl" style="color:#cbd5e1">Ranking bloqueado</span>
          <div class="rk-bar"><i style="width:0%;color:#a78bfa;background:#a78bfa"></i></div>
          <small>0 / 1 trofeo · Consigue tu primer trofeo jugando contra bots para aparecer en el ranking y recibir tu rango.</small>
        </div>
      </div>`;

    return `
    <section class="rk-card rk-hero">
      <div class="rk-k">TU POSICIÓN</div>
      <div class="rk-me">
        <span class="rk-big">${r && rk.pos ? "#" + fmt(rk.pos) : "—"}</span>
        <span class="rk-bigav" style="--rc:${col}">${avatar}<em>NV. ${lv}</em></span>
        <div class="rk-who"><b>@${esc(name)}</b><div class="rk-st on"><i></i>En línea</div></div>
      </div>
      ${panel}
      <div class="rk-mini">
        <div class="tr"><b>${CUP(16)}${fmt(tr)}</b><span>TROFEOS</span></div>
        <div><b>${fmt(wins)}</b><span>VICTORIAS</span></div>
        <div><b>${fmt(played)}</b><span>PARTIDAS</span></div>
      </div>
    </section>`;
  }

  function catsHtml() {
    const cur = rk.me ? rankOf(rk.me.trophies) : null;
    return `<section class="rk-card rk-cats">${TIERS.map(t => `
      <button class="rk-cat ${cur && cur.k === t.k ? "cur" : ""}" data-k="tier" data-t="${t.k}" style="--c:${t.c1}" type="button">
        ${badge(t.k, null, 46)}<b>${t.n}</b><small>${rangeText(t)}</small><span class="rk-dv">III · II · I</span>
      </button>`).join("")}</section>`;
  }

  function drawRank() {
    const el = $("#gxRank");
    if (!el) return;
    const prev = $("#rkQ", el);
    if (prev) rk.q = prev.value;
    const fr = rk.tab === "friends";

    el.innerHTML = `
      <div class="rk-in">
        <header class="rk-top">
          <button class="rk-ib" data-k="home" type="button" aria-label="Volver">${BACK}</button>
          <div class="rk-title"><h1>RANKING</h1><p>Compite, sube de rango y demuestra quién es el mejor.</p></div>
          <button class="rk-ib" data-k="rules" type="button" aria-label="Reglas">${INFO}</button>
        </header>
        ${heroHtml()}
        <div class="rk-tabs">
          <button class="rk-tab ${!fr ? "on" : ""}" data-k="tab" data-t="general" type="button">${CUP(18)} TABLA GENERAL</button>
          <button class="rk-tab ${fr ? "on" : ""}" data-k="tab" data-t="friends" type="button">👥 AMIGOS</button>
        </div>
        ${catsHtml()}
        <section class="rk-card rk-table">
          <div class="rk-th">
            <span class="ico">${CUP(26)}</span>
            <div><h2>${fr ? "AMIGOS" : "TOP 100"}</h2><p>${fr ? "Clasificación entre tus amigos" : "Jugadores con más trofeos"}</p></div>
            <button class="rk-ib" data-k="refresh" type="button" aria-label="Actualizar">${REFRESH}</button>
          </div>
          <div class="rk-tools">
            <input id="rkQ" class="rk-search" type="search" placeholder="Buscar jugador" autocomplete="off" autocapitalize="off" spellcheck="false">
            <select id="rkF" class="rk-sel" aria-label="Filtrar por rango">
              <option value="all">Todos los rangos</option>
              ${TIERS.map(t => `<option value="${t.k}">${t.n}</option>`).join("")}
            </select>
          </div>
          <div class="rk-thead"><span>#</span><span></span><span>JUGADOR</span><span>RANGO</span><span>TROFEOS</span><span></span></div>
          <div id="rkList"></div>
          <div class="rk-foot"><p>Para aparecer en el ranking necesitas tener al menos 1 trofeo.</p>
            <button data-k="rules" type="button">Ver reglas ›</button></div>
        </section>
      </div>
      <div id="rkModal"></div>`;
    $("#rkQ", el).value = rk.q;
    $("#rkF", el).value = rk.filter;
    renderList();
    drawModal();
  }

  function rowHtml(p, pos) {
    const g = G(), lv = g.xpLevelFromTotal(p.xp || 0);
    const r = rankOf(p.trophies);
    if (!r) return "";
    const me = g.state.user && p.uid === g.state.user.uid;
    const on = isOn(p.uid);
    const status = on === null ? "" : `<div class="rk-st ${on ? "on" : ""}"><i></i>${on ? "En línea" : "Desconectado"}</div>`;
    const tcls = pos === 1 ? "t1" : pos === 2 ? "t2" : pos === 3 ? "t3" : "";
    const crown = pos === 1 ? CROWN("#fbbf24") : pos === 2 ? CROWN("#e2e8f0") : pos === 3 ? CROWN("#e0894a") : "";
    return `
      <div class="rk-row ${tcls} ${me ? "me" : ""}" data-k="user" data-uid="${esc(p.uid)}" style="--rc:${r.tier.c1}">
        <span class="rk-pos">${crown}<span>${pos}</span></span>
        <span class="rk-av">${g.avatarEmoji(p.avatar)}</span>
        <div class="rk-info"><b>@${esc(p.username)}</b><small>Nivel ${lv}</small>${status}
          <div class="rk-inl">${badgeFor(r, 20)}${r.label}</div></div>
        <div class="rk-rcol">${badgeFor(r, 30)}<span>${r.label}</span></div>
        <span class="rk-tr">${CUP(15)}${fmt(p.trophies)}</span>
        <span class="rk-chev">›</span>
      </div>`;
  }

  function renderList() {
    const list = $("#rkList");
    if (!list) return;
    const fr = rk.tab === "friends";
    const rows = fr ? rk.friends : rk.rows;
    const loading = fr ? rk.friendsLoading : rk.loading;
    const err = fr ? rk.friendsErr : rk.err;

    if (rk.err === "login" || !G().state.user) {
      list.innerHTML = `<div class="rk-empty">Inicia sesión para ver el ranking.<br><button class="rk-btn" data-k="login" type="button">Iniciar sesión</button></div>`;
      return;
    }
    if (!rows) { list.innerHTML = `<div class="rk-empty">Cargando…</div>`; return; }
    if (err === "net" && !rows.length) {
      list.innerHTML = `<div class="rk-empty">No se pudo cargar el ranking.<br><button class="rk-btn" data-k="refresh" type="button">Reintentar</button></div>`;
      return;
    }
    if (!rows.length) {
      list.innerHTML = `<div class="rk-empty">${loading ? "Cargando…" : fr
        ? "Ninguno de tus amigos tiene trofeos todavía.<br>Solo aparecen jugadores con al menos 1 trofeo."
        : "Aún no hay jugadores clasificados.<br>El primero en conseguir un trofeo abre el ranking."}</div>`;
      return;
    }

    const q = rk.q.trim().replace(/^@/, "").toLowerCase();
    let items = rows.map((p, i) => ({ p, pos: i + 1 }));
    if (rk.filter !== "all") items = items.filter(x => { const r = rankOf(x.p.trophies); return r && r.k === rk.filter; });
    if (q) items = items.filter(x => String(x.p.username || "").toLowerCase().includes(q));

    if (!items.length) {
      const canLookup = !fr && q.length >= 3;
      list.innerHTML = `<div class="rk-empty">${esc(rk.note || (q ? "Nadie con ese nombre en esta lista." : "Nadie en este rango todavía."))}
        ${canLookup ? `<br><button class="rk-btn" data-k="lookup" type="button">Buscar @${esc(q)} en todo el juego</button>` : ""}</div>`;
      return;
    }
    list.innerHTML = items.map(x => rowHtml(x.p, x.pos)).join("");
  }

  /* ---------- Modales ---------- */
  function drawModal() {
    const box = $("#rkModal");
    if (!box) return;
    const M = rk.modal;
    if (!M) { box.innerHTML = ""; return; }

    if (M.type === "rules") {
      box.innerHTML = `<div class="rk-mo" data-k="close"><section class="rk-mc" data-k="stop">
        <button class="rk-x" data-k="close" type="button">✕</button>
        <h3 style="color:#fff">Reglas del ranking</h3>
        <div class="rk-rules">
          <div><i>🏆</i>Los trofeos son tu progreso. Tu rango se calcula automáticamente con ellos.</div>
          <div><i>🔓</i>Necesitas al menos 1 trofeo para aparecer. Con 0 trofeos (o si nunca tuviste) no apareces.</div>
          <div><i>⬇️</i>Si pierdes todos tus trofeos sales del ranking, y vuelves en cuanto consigas 1.</div>
          <div><i>🛡️</i>Hay 6 rangos: Bronce, Plata, Oro, Platino, Diamante y Élite. Cada uno tiene 3 divisiones: III, II y I (la I es la más alta).</div>
          <div><i>📈</i>Subes o bajas de división al instante cuando ganas o pierdes trofeos.</div>
          <div><i>🎮</i>Los trofeos se ganan en partidas contra bots con tu sesión iniciada.</div>
        </div>
        <button class="rk-btn" data-k="close" type="button">Entendido</button></section></div>`;
      return;
    }

    const t = TIERS.find(x => x.k === M.k);
    if (!t) { box.innerHTML = ""; return; }
    const cur = rk.me ? rankOf(rk.me.trophies) : null;
    const dr = [2, 1, 0].map(di => {
      const sc = TIERS.indexOf(t) * 3 + di;
      const state = !cur ? "Bloqueada" : cur.score === sc ? "Tu división" : cur.score > sc ? "Superada ✓" : "Bloqueada";
      return `<div class="rk-dr ${cur && cur.score === sc ? "cur" : ""}" style="--c:${t.c1}">
        ${badge(t.k, di, 38)}<div><b>${t.n} ${ROMAN[di]}</b><small>${divRangeText(t, di)} trofeos</small></div><span>${state}</span></div>`;
    }).join("");

    box.innerHTML = `<div class="rk-mo" data-k="close"><section class="rk-mc" data-k="stop" style="--c:${t.c1}">
      <button class="rk-x" data-k="close" type="button">✕</button>
      <div style="display:grid;place-items:center">${badge(t.k, null, 92)}</div>
      <h3>${t.n}</h3><div class="rg">${rangeText(t)} trofeos</div>
      <p>${esc(t.desc)}<br>Requisito: <b>${fmt(t.min)}</b> trofeos${t.max == null ? " o más." : "."}</p>
      ${dr}
      <button class="rk-btn" data-k="filter" data-t="${t.k}" type="button">Ver jugadores de ${t.n}</button>
      <button class="rk-btn rk-ghost" data-k="close" type="button">Cerrar</button></section></div>`;
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
    if (k === "stop") return;
    if (k === "close") { if (b.classList.contains("rk-mo") && e.target !== b) return; rk.modal = null; return drawModal(); }
    if (k === "home") return goHome();
    if (k === "rules") { rk.modal = { type: "rules" }; return drawModal(); }
    if (k === "tier") { rk.modal = { type: "tier", k: b.dataset.t }; return drawModal(); }
    if (k === "filter") { rk.filter = b.dataset.t; rk.modal = null; const f = $("#rkF"); if (f) f.value = rk.filter; drawModal(); return renderList(); }
    if (k === "tab") {
      rk.tab = b.dataset.t; rk.q = "";
      drawRank();
      if (rk.tab === "friends") loadFriends(false);
      return;
    }
    if (k === "refresh") return rk.tab === "friends" ? loadFriends(true) : loadRank(true);
    if (k === "lookup") return lookup();
    if (k === "user") { if (window.GreyxExtras) window.GreyxExtras.open("user", b.dataset.uid); return; }
    if (k === "login") { closeRank(); const g = G(); g.state.showAuth = true; g.render(); }
  }

  /* =====================================================
     5) AVISO DE ASCENSO / DESCENSO
     ===================================================== */
  function toast(html) {
    const t = document.createElement("div");
    t.className = "rk-toast";
    t.innerHTML = html;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3600);
  }

  function watchRank() {
    const g = G();
    if (!g || !g.state.user || !g.state.stats || g.state.statsUid !== g.state.user.uid) return;
    const r = rankOf(g.state.stats.trophies);
    const key = "gx-rank-" + g.state.user.uid;
    let old = null;
    try { old = localStorage.getItem(key); } catch (e) {}
    const now = r ? String(r.score) : "none";
    if (old === now) return;
    try { localStorage.setItem(key, now); } catch (e) {}
    if (old === null) return;                         // primera vez: solo memoriza
    if (!r) return setTimeout(() => toast("Saliste del ranking"), 3800);
    if (old === "none") return setTimeout(() => toast(`${badgeFor(r, 28)} ¡Entraste al ranking: ${r.label}!`), 3800);
    const up = r.score > Number(old);
    setTimeout(() => toast(`${badgeFor(r, 28)} ${up ? "¡Subiste a " : "Bajaste a "}${r.label}${up ? "!" : ""}`), 3800);
  }
  setInterval(watchRank, 1500);

  /* =====================================================
     6) INSIGNIA EN PERFILES (sin duplicar datos: se calcula
        a partir de los trofeos que el perfil ya muestra)
     ===================================================== */
  function rankLine(raw) {
    const r = rankOf(raw);
    return r ? `${badgeFor(r, 26)}<strong style="color:${r.tier.c1}">${r.label}</strong>`
             : `<strong style="color:#94a3b8">Sin rango</strong>`;
  }
  function injectBadges() {
    document.querySelectorAll(".pl-stats").forEach(box => {
      if (box.querySelector(".rk-prow")) return;
      const b = box.querySelector("div b");
      if (!b) return;
      box.insertAdjacentHTML("beforeend", `<div class="rk-prow"><i>RANGO</i>${rankLine(parseInt(b.textContent.replace(/\D/g, ""), 10))}</div>`);
    });
    document.querySelectorAll(".trophy-big").forEach(box => {
      if (box.querySelector(".rk-pbi")) return;
      const b = box.querySelector("b");
      if (!b) return;
      box.insertAdjacentHTML("beforeend", `<span class="rk-pbi">${rankLine(parseInt(b.textContent.replace(/\D/g, ""), 10))}</span>`);
    });
  }
  let injT = 0;
  new MutationObserver(() => {
    if (injT) return;
    injT = requestAnimationFrame(() => { injT = 0; ensureDefs(); injectBadges(); });
  }).observe(document.body, { childList: true, subtree: true });

  /* =====================================================
     7) BARRA INFERIOR (sin cambios de comportamiento)
     ===================================================== */
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
    if (to === "profile") closeRank();
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
