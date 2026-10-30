/* GREYX LUDO — Ranking competitivo v2 (pantalla única, sin scroll de página)
   - Rango = f(trofeos reales). No se guarda en Firebase: nunca se desincroniza.
   - Solo aparecen jugadores con trofeos >= 1 (publicProfiles.trophies >= 1).
   - Toca tu tarjeta de rango -> detalle de los 6 rangos y qué necesitas para subir.
   - Botón "i" -> widget de reglas encima de la tarjeta.
   - Expone window.GXRank (rankOf, badge) para usar insignias en cualquier pantalla.
   - Mantiene la barra inferior visible (Inicio / Amigos / Ranking / Perfil). */
(() => {
  "use strict";

  const G = () => window.GX;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const fmt = n => String(Math.floor(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  /* =====================================================
     1) RANGOS (una sola fuente de verdad)
     ===================================================== */
  const ROMAN = ["III", "II", "I"];
  const TIERS = [
    { k:"bronze",   n:"Bronce",   min:1,     max:499,  c1:"#f0a868", c2:"#8a4b14", l:"#ffd9b0", desc:"Aquí empieza todo jugador. Cada trofeo cuenta." },
    { k:"silver",   n:"Plata",    min:500,   max:999,  c1:"#dbe4f0", c2:"#64748b", l:"#ffffff", desc:"Ya sabes jugar. Ahora toca ser constante." },
    { k:"gold",     n:"Oro",      min:1000,  max:1999, c1:"#fcd34d", c2:"#b45309", l:"#fff3b8", desc:"Un jugador respetado. Pocos llegan hasta aquí." },
    { k:"platinum", n:"Platino",  min:2000,  max:4999, c1:"#38bdf8", c2:"#1d4ed8", l:"#c7ecff", desc:"Nivel competitivo alto. Rivales muy exigentes." },
    { k:"diamond",  n:"Diamante", min:5000,  max:9999, c1:"#c084fc", c2:"#6d28d9", l:"#f0dcff", desc:"La élite está cerca. Cada partida pesa." },
    { k:"elite",    n:"Élite",    min:10000, max:null, c1:"#fb7a4a", c2:"#b91c1c", l:"#ffe0b8", desc:"La cima del juego. Sin límite superior." }
  ];

  // Divisiones repartidas automáticamente en partes iguales. Élite (sin tope): 1.000 por división.
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
     2) INSIGNIAS (SVG; divisiones = 1, 2 o 3 puntos)
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
      default:
        return `<path d="M20 46l2-17 8 8 2-12 2 12 8-8 2 17z" fill="${L}" stroke="${L}" stroke-width="1.5" stroke-linejoin="round"/><rect x="20" y="47" width="24" height="3.4" rx="1.4" fill="${L}"/>`;
    }
  }

  // di: 0 (III) · 1 (II) · 2 (I) · null = categoría sin división
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
  const CROWN = (c, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" style="filter:drop-shadow(0 0 5px ${c}99)">
    <path d="M3 18l1.5-10 4.5 4.5L12 5l3 7.5L19.5 8 21 18z" fill="${c}" stroke="#00000066" stroke-width="1" stroke-linejoin="round"/>
    <rect x="3.5" y="18.6" width="17" height="2.2" rx="1" fill="${c}" stroke="#00000066" stroke-width=".8"/></svg>`;
  const REFRESH = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4.5h-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const BACK = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const INFO = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.6v.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;

  /* =====================================================
     3) ESTILOS
     ===================================================== */
  const st = document.createElement("style");
  st.textContent = `
  .gx6-nav{z-index:950!important}
  body:has(.friends-screen) .gx6-nav{display:flex}
  .friends-screen{padding-bottom:130px!important}
  body:has(#gxRank) .gx-fab{display:none!important}

  /* Pantalla fija: la página no se mueve, solo se desplaza la lista */
  .rk{position:fixed;inset:0;z-index:190;overflow:hidden;display:flex;flex-direction:column;color:#f4f6ff;
    background:radial-gradient(120% 45% at 50% 0,#4c2fd066,transparent 60%),radial-gradient(70% 40% at 100% 60%,#1d4ed833,transparent 60%),linear-gradient(180deg,#0a0f33,#050716);
    padding:calc(10px + env(safe-area-inset-top,0px)) 12px calc(88px + env(safe-area-inset-bottom,0px));
    animation:rkIn .3s ease both;font-family:Inter,system-ui,-apple-system,sans-serif}
  @keyframes rkIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  .rk-in{position:relative;flex:1;min-height:0;width:100%;max-width:480px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
  .rk button{font:inherit;cursor:pointer;color:inherit}
  .rk-card{border-radius:20px;border:1px solid #5b6cff40;background:linear-gradient(160deg,#141a4ad9,#0a0e2ad9);
    box-shadow:0 0 22px #4f46e51f,0 10px 26px #0008,inset 0 1px 0 #ffffff14}

  .rk-in>*{min-width:0}
  .rk-top{flex:none;display:grid;grid-template-columns:40px minmax(0,1fr) 40px;align-items:center;gap:8px}
  .rk-ib{width:40px;height:40px;border-radius:13px;border:1.5px solid #6d7bff88;background:linear-gradient(145deg,#1b2370,#0d1240);
    color:#fff;display:grid;place-items:center;padding:0;box-shadow:0 0 14px #4f46e544,inset 0 1px 0 #ffffff22}
  .rk-ib:active{transform:scale(.94)}
  .rk-ib.on{border-color:#fbbf24;box-shadow:0 0 16px #fbbf2466}
  .rk-title{text-align:center;min-width:0}
  .rk-ttl{display:flex;align-items:center;justify-content:center;gap:10px}
  .rk-ttl i{flex:1;max-width:44px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#8b9bff);box-shadow:0 0 8px #6d7bff}
  .rk-ttl i:last-child{transform:scaleX(-1)}
  .rk-ttl h1{margin:0;font-size:1.3rem;font-weight:900;letter-spacing:.12em;
    background:linear-gradient(180deg,#fff,#b8c4ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 10px #6d7bffaa)}
  .rk-title p{margin:3px 0 0;color:#8fa0ff;font-size:.66rem;font-weight:600;line-height:1.3}

  /* --- Tarjeta de rango (botón) --- */
  .rk-hero{flex:none;position:relative;overflow:hidden;padding:12px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;cursor:pointer;text-align:left;
    border-color:color-mix(in srgb,var(--rc,#6d7bff) 60%,transparent);
    background:radial-gradient(120% 90% at 0 0,color-mix(in srgb,var(--rc,#6d7bff) 20%,transparent),transparent 60%),linear-gradient(160deg,#141a4a,#0a0e2a);
    box-shadow:0 0 24px color-mix(in srgb,var(--rc,#6d7bff) 28%,transparent),0 10px 26px #0008,inset 0 1px 0 #ffffff14;
    transition:transform .15s}
  .rk-hero::after{content:"";position:absolute;right:-50px;top:-50px;width:170px;height:170px;border-radius:50%;pointer-events:none;
    background:radial-gradient(circle,color-mix(in srgb,var(--rc,#6d7bff) 28%,transparent),transparent 70%)}
  .rk-hero>*{position:relative;z-index:1;min-width:0}
  .rk-hero:active{transform:scale(.99)}
  .rk-hh{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .rk-k{font:800 .6rem monospace;letter-spacing:.16em;color:#a5b4fc}
  .rk-more{flex:none;display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:99px;background:#ffffff14;border:1px solid #ffffff26;font-size:.64rem;font-weight:800;color:#e0e7ff;white-space:nowrap}
  .rk-hm{display:flex;align-items:center;gap:10px}
  .rk-pos1{flex:none;min-width:50px;height:46px;padding:0 9px;border-radius:14px;display:grid;place-items:center;font:900 1.25rem Inter,system-ui,sans-serif;
    color:#e0e7ff;background:linear-gradient(145deg,#4338ca,#1e1b6b);border:1px solid #ffffff2e;box-shadow:inset 0 1px 0 #ffffff33}
  .rk-pos1.p1{color:#3a2200;background:linear-gradient(145deg,#fff1a8,#f59e0b);box-shadow:0 0 16px #fbbf2466,inset 0 1px 0 #fff9}
  .rk-pos1.p2{color:#1e293b;background:linear-gradient(145deg,#ffffff,#94a3b8);box-shadow:0 0 14px #cbd5e155,inset 0 1px 0 #fff9}
  .rk-pos1.p3{color:#3a1a00;background:linear-gradient(145deg,#fcd9b0,#b45309);box-shadow:0 0 14px #e0894a55,inset 0 1px 0 #fff8}
  .rk-bigav{flex:none;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:1.5rem;
    background:radial-gradient(circle at 35% 30%,#3b3f75,#12152c);border:2.5px solid var(--rc,#8b5cf6);box-shadow:0 0 14px var(--rc,#8b5cf6)}
  .rk-who{flex:1;min-width:0}
  .rk-who b{display:block;font-size:.98rem;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rk-chips{display:flex;gap:5px;margin-top:4px;flex-wrap:nowrap;overflow:hidden}
  .rk-chips span{flex:none;padding:2px 8px;border-radius:99px;background:#ffffff12;border:1px solid #ffffff18;color:#d6dcff;font-size:.6rem;font-weight:800;white-space:nowrap}
  .rk-rp{display:flex;align-items:center;gap:12px;padding:10px 12px 10px 8px;border-radius:16px;
    background:linear-gradient(135deg,#0a0e2ad9,#070a24d9);border:1px solid color-mix(in srgb,var(--rc,#6d7bff) 35%,transparent)}
  .rk-rb{flex:none;position:relative;display:grid;place-items:center;width:58px;height:62px}
  .rk-rb::before{content:"";position:absolute;inset:-4px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--rc,#6d7bff) 42%,transparent),transparent 66%)}
  .rk-rb>*{position:relative}
  .rk-rt{flex:1;min-width:0}
  .rk-rtop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
  .rk-rl{min-width:0;font-size:1.1rem;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rk-tpill{flex:none;display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;color:#fbbf24;font-weight:900;font-size:.88rem;
    background:linear-gradient(135deg,#fbbf2428,#fbbf2410);border:1px solid #fbbf2455}
  .rk-barw{display:flex;align-items:center;gap:8px}
  .rk-bar{flex:1;min-width:0;height:8px;border-radius:99px;background:#0b1030;border:1px solid #ffffff1c;overflow:hidden}
  .rk-bar i{display:block;height:100%;border-radius:99px;box-shadow:0 0 10px currentColor}
  .rk-nx{flex:none;display:grid;place-items:center;opacity:.6}
  .rk-rt small{display:block;margin-top:6px;color:#b6bfe8;font-size:.68rem;line-height:1.3}
  .rk-rt small b{color:#fff}
  .rk-lock{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;font-size:1.4rem;background:#ffffff0a;border:2px dashed #ffffff33}

  /* --- Lista --- */
  .rk-lc{flex:1;min-height:0;display:flex;flex-direction:column;padding:10px}
  .rk-lh{flex:none;display:flex;align-items:center;gap:8px}
  .rk-seg{flex:1;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:15px;background:#070a24;border:1px solid #ffffff14}
  .rk-tab{display:flex;align-items:center;justify-content:center;gap:6px;height:34px;border:0;border-radius:11px;background:transparent;color:#9aa6d8;font-weight:800;font-size:.76rem;white-space:nowrap}
  .rk-tab.on{color:#fff;background:linear-gradient(135deg,#7c5cff,#4f2fd8);box-shadow:0 0 14px #7c5cff66,inset 0 1px 0 #ffffff44}
  .rk-lh .rk-ib{width:42px;height:42px;border-radius:13px}
  .rk-cap{flex:none;margin:10px 2px 6px;display:flex;align-items:center;gap:8px;color:#8e9acd;font-size:.68rem;font-weight:600;min-width:0}
  .rk-cap b{color:#e0e7ff;font-size:.76rem;letter-spacing:.08em;white-space:nowrap}
  .rk-cap span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rk-cap em{flex:none;margin-left:auto;font-style:normal;padding:2px 9px;border-radius:99px;background:#7c5cff26;border:1px solid #7c5cff55;color:#c4b5fd;font-weight:800;font-size:.62rem}
  #rkList{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:8px 2px 4px 0}
  #rkList::-webkit-scrollbar{width:4px}
  #rkList::-webkit-scrollbar-thumb{background:#ffffff2a;border-radius:4px}

  .rk-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:15px;margin-bottom:7px;cursor:pointer;
    background:linear-gradient(90deg,#0d1236cc,#090c2acc);border:1px solid #ffffff12;box-shadow:inset 3px 0 0 var(--rc,#ffffff22)}
  .rk-row:active{transform:scale(.99)}
  .rk-row.me{border-color:#fbbf2488;background:linear-gradient(90deg,#fbbf2418,#090c2acc)}
  .rk-row.t1{border-color:#fbbf24;background:linear-gradient(90deg,#fbbf2430,#0b0e2acc 75%);box-shadow:0 0 20px #fbbf2440,inset 3px 0 0 #fbbf24}
  .rk-row.t2{border-color:#cbd5e1aa;background:linear-gradient(90deg,#cbd5e124,#0b0e2acc 75%);box-shadow:0 0 14px #cbd5e12a,inset 3px 0 0 #cbd5e1}
  .rk-row.t3{border-color:#e0894aaa;background:linear-gradient(90deg,#e0894a26,#0b0e2acc 75%);box-shadow:0 0 14px #e0894a2a,inset 3px 0 0 #e0894a}
  .rk-pos{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:900 .78rem Inter,system-ui,sans-serif;color:#b6bfe8;background:#ffffff0d;border:1px solid #ffffff14}
  .rk-row.t1 .rk-pos{color:#3a2200;border:0;background:radial-gradient(circle at 35% 30%,#fff3b0,#f59e0b);box-shadow:0 0 12px #fbbf2488}
  .rk-row.t2 .rk-pos{color:#1e293b;border:0;background:radial-gradient(circle at 35% 30%,#fff,#94a3b8);box-shadow:0 0 10px #cbd5e166}
  .rk-row.t3 .rk-pos{color:#3a1a00;border:0;background:radial-gradient(circle at 35% 30%,#fcd9b0,#b45309);box-shadow:0 0 10px #e0894a66}
  .rk-av{position:relative;width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:1.25rem;
    background:radial-gradient(circle at 35% 30%,#3b3f75,#12152c);border:2px solid var(--rc,#ffffff33)}
  .rk-cr{position:absolute;top:-11px;left:50%;transform:translateX(-50%);display:grid;line-height:0}
  .rk-dot{position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border-radius:50%;background:#64748b;border:2px solid #0a0e2a}
  .rk-dot.on{background:#34d399;box-shadow:0 0 6px #34d399}
  .rk-info{flex:1;min-width:0}
  .rk-info b{display:block;font-size:.86rem;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rk-info small{display:flex;align-items:center;gap:6px;margin-top:2px;color:#8e9acd;font-size:.62rem;font-weight:700;white-space:nowrap;overflow:hidden}
  .rk-info small em{font-style:normal;font-weight:800;color:var(--rc)}
  .rk-lv{padding:1px 6px;border-radius:99px;background:#ffffff10;color:#aab3e8}
  .rk-x{display:none}
  .rk-rcol{flex:none;display:grid;place-items:center}
  .rk-tr{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:4px;min-width:54px;color:#fbbf24;font-weight:900;font-size:.92rem}
  .rk-note2{margin:4px 0 2px;padding:10px 12px;border-radius:14px;border:1px dashed #ffffff26;color:#8e9acd;font-size:.68rem;text-align:center;line-height:1.4}
  .rk-empty{padding:22px 12px;text-align:center;color:#aab3d6;border-radius:16px;background:#090c2acc;border:1px solid #ffffff12;font-size:.82rem;line-height:1.5}
  .rk-btn{margin-top:12px;padding:12px 18px;border:0;border-radius:14px;color:#fff;font-weight:900;
    background:linear-gradient(135deg,#a78bfa,#7c3aed);box-shadow:0 4px 0 #3b1d8f}

  /* --- Widget de reglas (sobre la tarjeta de rango) --- */
  .rk-popbg{position:fixed;inset:0;z-index:40}
  .rk-pop{position:absolute;z-index:41;top:50px;right:0;width:min(318px,100%);padding:14px;border-radius:22px;
    border:1.5px solid #fbbf2488;background:linear-gradient(160deg,#222a7a,#0c1138);
    box-shadow:0 22px 50px #000c,0 0 30px #fbbf2430,inset 0 1px 0 #ffffff22;transform-origin:calc(100% - 20px) -8px;animation:rkPop .2s cubic-bezier(.2,.9,.3,1.2) both}
  .rk-pop::before{content:"";position:absolute;top:-8px;right:14px;width:14px;height:14px;background:#222a7a;border-left:1.5px solid #fbbf2488;border-top:1.5px solid #fbbf2488;transform:rotate(45deg)}
  @keyframes rkPop{from{opacity:0;transform:scale(.85) translateY(-6px)}to{opacity:1;transform:none}}
  .rk-ph{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .rk-ph span{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#fbbf24,#d97706);color:#2a1600}
  .rk-ph b{display:block;font-size:.95rem;font-weight:900}
  .rk-ph small{color:#aab3e8;font-size:.64rem}
  .rk-pr{display:flex;gap:10px;align-items:flex-start;padding:8px 6px;border-top:1px solid #ffffff14}
  .rk-pr i{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:10px;font-style:normal;font-size:.95rem;background:#ffffff12;border:1px solid #ffffff1a}
  .rk-pr b{display:block;font-size:.76rem;font-weight:800;color:#fff}
  .rk-pr small{display:block;margin-top:1px;color:#b6bfe8;font-size:.67rem;line-height:1.35}

  /* --- Detalle de rangos (hoja inferior) --- */
  .rkm{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,6,20,.84);animation:rkFade .2s ease both}
  @keyframes rkFade{from{opacity:0}to{opacity:1}}
  .rkm-c{position:relative;width:min(480px,100%);max-height:94vh;max-height:94dvh;overflow-y:auto;overscroll-behavior:contain;
    padding:14px 14px calc(16px + env(safe-area-inset-bottom,0px));border-radius:26px 26px 0 0;color:#f4f6ff;font-family:Inter,system-ui,sans-serif;
    border:1.5px solid color-mix(in srgb,var(--c,#7c5cff) 70%,transparent);border-bottom:0;
    background:radial-gradient(120% 40% at 50% 0,color-mix(in srgb,var(--c,#7c5cff) 22%,transparent),transparent 70%),linear-gradient(170deg,#171d54,#090d28);
    box-shadow:0 -20px 60px #000b;animation:rkUp .28s cubic-bezier(.2,.9,.3,1) both}
  @keyframes rkUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
  .rkm-c button{font:inherit;cursor:pointer;color:inherit}
  .rkm-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .rkm-h h2{margin:0;font-size:1.05rem;font-weight:900;letter-spacing:.06em}
  .rkm-x{width:34px;height:34px;border-radius:11px;border:1px solid #ffffff22;background:#ffffff12;padding:0}
  .rkm-goal{padding:10px 12px;border-radius:16px;background:#070a24b3;border:1px solid #ffffff1a;margin-bottom:10px}
  .rkm-goal b{display:block;font-size:.8rem}
  .rkm-goal small{display:block;margin-top:2px;color:#b6bfe8;font-size:.7rem}
  .rkm-goal .rk-bar{margin-top:7px;height:7px}
  .rkm-sel{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:10px}
  .rkm-s{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 2px 6px;border-radius:13px;
    border:1.5px solid #ffffff14;background:#ffffff08}
  .rkm-s span{font-size:.54rem;font-weight:800;color:#b6bfe8;letter-spacing:.02em;text-transform:uppercase}
  .rkm-s.on{border-color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);box-shadow:0 0 14px color-mix(in srgb,var(--c) 40%,transparent)}
  .rkm-s.on span{color:var(--c)}
  .rkm-s em{position:absolute;top:-6px;right:-3px;padding:1px 5px;border-radius:99px;font:900 .45rem Inter,sans-serif;font-style:normal;background:#fbbf24;color:#2a1600}
  .rkm-d{padding:12px;border-radius:18px;background:#ffffff08;border:1px solid color-mix(in srgb,var(--c) 40%,transparent)}
  .rkm-dh{display:flex;align-items:center;gap:12px}
  .rkm-dh h3{margin:0;font-size:1.3rem;font-weight:900;color:var(--c);text-transform:uppercase;letter-spacing:.04em}
  .rkm-dh div small{display:block;color:#d6dcff;font-size:.78rem;font-weight:700;margin-top:1px}
  .rkm-d p{margin:9px 0 8px;color:#aab3d6;font-size:.76rem;line-height:1.45}
  .rkm-dr{display:flex;align-items:center;gap:10px;padding:7px 10px;margin-top:6px;border-radius:13px;background:#ffffff08;border:1px solid #ffffff12}
  .rkm-dr.cur{border-color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent)}
  .rkm-dr div{flex:1;min-width:0}
  .rkm-dr b{display:block;font-size:.82rem}
  .rkm-dr small{color:#aab3d6;font-size:.66rem}
  .rkm-dr span{font-size:.62rem;font-weight:800;color:#9aa6d8;white-space:nowrap}
  .rkm-dr.cur span{color:var(--c)}
  .rkm-req{margin-top:9px;padding:9px 11px;border-radius:13px;font-size:.74rem;line-height:1.4;font-weight:700;color:#fff;
    background:linear-gradient(135deg,color-mix(in srgb,var(--c) 30%,transparent),#ffffff0a);border:1px solid color-mix(in srgb,var(--c) 45%,transparent)}

  .rk-toast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:10px;
    padding:10px 18px;border-radius:99px;background:#111631;border:1.5px solid #fbbf24;color:#fff;font-weight:800;font-size:.85rem;box-shadow:0 10px 30px #000c;animation:rkIn .3s ease both}

  /* --- Insignia en perfiles --- */
  .pl-stats .rk-prow{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:10px}
  .rk-prow strong{font-size:.95rem;font-weight:900}
  .rk-prow i{font-style:normal;color:#94a3b8;font:700 .6rem monospace;letter-spacing:.08em}
  .pc .rk-prow{display:flex;align-items:center;justify-content:center;gap:8px}
  .rk-pbi{display:inline-flex;align-items:center;gap:6px;margin-left:12px;font-size:.85rem;font-weight:900}

  /* --- Pantallas bajas (celular de lado, SE...) --- */
  @media (max-height:740px){
    .rk-title p{display:none}
    .rk-hero{padding:10px;gap:8px}
    .rk-pos1{min-width:42px;height:40px;font-size:1.1rem}
    .rk-bigav{width:40px;height:40px;font-size:1.3rem}
    .rk-rb{width:48px;height:52px}.rk-rb svg{width:40px;height:45px}
    .rk-rl{font-size:1rem}
    .rk-rtop{margin-bottom:5px}
  }
  @media (max-height:620px){
    .rk{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}
    .rk-in{gap:7px}
    .rk-top{grid-template-columns:34px minmax(0,1fr) 34px}
    .rk-ib{width:34px;height:34px}
    .rk-ttl h1{font-size:1.05rem}
    .rk-rt small,.rk-chips,.rk-hh{display:none}
    .rk-rp{padding:6px 8px}
    .rk-row{padding:6px 8px;margin-bottom:5px}
    .rkm-d p{display:none}
  }
  @media (max-width:360px){
    .rk-pos1{min-width:38px;font-size:1rem}
    .rk-chips span:nth-child(3){display:none}
    .rk-rl{font-size:.95rem}
    .rk-lv{display:none}
  }

  /* --- Tablet / PC: tarjeta a la izquierda, Top 100 a la derecha --- */
  @media (min-width:760px){
    .rk{padding-left:28px;padding-right:28px}
    .rk-in{max-width:1040px;display:grid;grid-template-columns:380px minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:14px 18px}
    .rk-top{grid-column:1/-1}
    .rk-ttl h1{font-size:1.6rem}.rk-title p{display:block;font-size:.76rem}
    .rk-hero{grid-column:1;grid-row:2;align-self:start;padding:16px;gap:14px}
    .rk-lc{grid-column:2;grid-row:2;padding:14px}
    .rk-pos1{min-width:58px;height:52px;font-size:1.4rem}
    .rk-bigav{width:54px;height:54px;font-size:1.7rem}
    .rk-rb{width:72px;height:78px}.rk-rb svg{width:62px;height:70px}
    .rk-rl{font-size:1.25rem}
    .rk-row{padding:9px 14px;gap:14px}
    .rk-av{width:44px;height:44px}
    .rk-info b{font-size:.94rem}
    .rk-x{display:inline}
    .rk-tr{font-size:1rem;min-width:70px}
    .rkm{align-items:center;padding:20px}
    .rkm-c{border-radius:26px;border-bottom:1.5px solid color-mix(in srgb,var(--c,#7c5cff) 70%,transparent)}
  }
  @media (min-width:760px) and (max-height:620px){
    .rk-in{grid-template-columns:330px minmax(0,1fr)}
    .rk-hh{display:flex}
  }
  @media (prefers-reduced-motion:reduce){.rk,.rk-pop,.rkm,.rkm-c{animation:none}}
  `;
  document.head.appendChild(st);

  /* =====================================================
     4) DATOS
     ===================================================== */
  const rk = {
    tab: "general", modal: null, rules: false,
    rows: null, me: null, pos: 0, err: "", at: 0, loading: false,
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

  function myTrophies() {
    const g = G();
    if (rk.me && rk.me.trophies != null) return rk.me.trophies;
    return (g && g.state.stats && g.state.stats.trophies) || 0;
  }

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
      // Solo 1+ trofeos: quien baja a 0 desaparece solo y vuelve al ganar uno
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
     5) PANTALLA
     ===================================================== */
  function openRank() {
    ensureDefs();
    let el = $("#gxRank");
    if (!el) {
      el = document.createElement("div");
      el.id = "gxRank";
      el.className = "rk";
      el.addEventListener("click", onClick);
      document.body.appendChild(el);
    }
    rk.modal = null; rk.rules = false; rk.tab = "general";
    drawModal();
    loadRank(false);
  }
  function closeRank() {
    const el = $("#gxRank"); if (el) el.remove();
    rk.modal = null; rk.rules = false;
    drawModal();
  }

  function heroHtml() {
    const g = G(), s = g.state;
    if (!s.user) {
      return `<section class="rk-card rk-hero" style="cursor:default"><div class="rk-k">TU POSICIÓN</div>
        <p style="margin:0;color:#b6bfe8;font-size:.82rem">Inicia sesión para ver tu posición y tu rango.</p>
        <button class="rk-btn" style="margin:0" data-k="login" type="button">Iniciar sesión</button></section>`;
    }
    if (rk.loading && !rk.rows) {
      return `<section class="rk-card rk-hero" style="cursor:default"><div class="rk-k">TU POSICIÓN</div><p style="margin:0;color:#b6bfe8;font-size:.82rem">Cargando…</p></section>`;
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
    const col = r ? r.tier.c1 : "#7c86ad";
    const pc = !r || !rk.pos ? "" : rk.pos === 1 ? "p1" : rk.pos === 2 ? "p2" : rk.pos === 3 ? "p3" : "";
    const nextR = r && r.next ? rankOf(r.next) : null;

    const panel = r ? `
      <div class="rk-rp">
        <div class="rk-rb">${badgeFor(r, 50)}</div>
        <div class="rk-rt">
          <div class="rk-rtop"><span class="rk-rl" style="color:${r.tier.c1}">${r.label}</span><span class="rk-tpill">${CUP(14)}${fmt(tr)}</span></div>
          <div class="rk-barw"><div class="rk-bar"><i style="width:${r.pct.toFixed(1)}%;color:${r.tier.c1};background:linear-gradient(90deg,${r.tier.c2},${r.tier.c1})"></i></div>${nextR ? `<span class="rk-nx">${badgeFor(nextR, 20)}</span>` : ""}</div>
          <small>${r.next
            ? `Te faltan <b>${fmt(r.need)}</b> trofeos para ${esc(r.nextLabel)}`
            : "¡Rango máximo alcanzado!"}</small>
        </div>
      </div>` : `
      <div class="rk-rp">
        <div class="rk-rb"><span class="rk-lock">🔒</span></div>
        <div class="rk-rt">
          <div class="rk-rtop"><span class="rk-rl" style="color:#cbd5e1">Ranking bloqueado</span><span class="rk-tpill">${CUP(14)}${fmt(tr)}</span></div>
          <div class="rk-barw"><div class="rk-bar"><i style="width:0%;color:#a78bfa;background:#a78bfa"></i></div></div>
          <small>0 / 1 trofeo · Consigue tu primer trofeo para entrar al ranking</small>
        </div>
      </div>`;

    return `
    <section class="rk-card rk-hero" data-k="ranks" role="button" tabindex="0" aria-label="Ver todos los rangos" style="--rc:${col}">
      <div class="rk-hh"><span class="rk-k">TU POSICIÓN</span><span class="rk-more">Ver rangos ›</span></div>
      <div class="rk-hm">
        <span class="rk-pos1 ${pc}">${r && rk.pos ? "#" + fmt(rk.pos) : "—"}</span>
        <span class="rk-bigav">${avatar}</span>
        <div class="rk-who"><b>@${esc(name)}</b>
          <div class="rk-chips"><span>NV. ${lv}</span><span>🥇 ${fmt(wins)}</span><span>🎮 ${fmt(played)}</span></div></div>
      </div>
      ${panel}
    </section>`;
  }

  function rulesHtml() {
    if (!rk.rules) return "";
    return `<div class="rk-popbg" data-k="pclose"></div>
      <div class="rk-pop" role="dialog" aria-label="Reglas del ranking">
        <div class="rk-ph"><span>${CUP(18)}</span><div><b>Cómo entrar al ranking</b><small>Reglas rápidas</small></div></div>
        <div class="rk-pr"><i>🏆</i><div><b>Necesitas 1 trofeo</b><small>Con al menos 1 trofeo apareces en el ranking.</small></div></div>
        <div class="rk-pr"><i>🔒</i><div><b>0 trofeos = fuera</b><small>Si llegas a 0 sales del ranking. Vuelves al ganar 1.</small></div></div>
        <div class="rk-pr"><i>🛡️</i><div><b>6 rangos, 3 divisiones</b><small>Bronce a Élite. En cada uno: III, II y I (la I es la más alta).</small></div></div>
        <div class="rk-pr"><i>📈</i><div><b>Subes al ganar trofeos</b><small>Tu rango se actualiza solo con tus trofeos. Gana partidas con tu sesión iniciada.</small></div></div>
      </div>`;
  }

  function drawRank() {
    const el = $("#gxRank");
    if (!el) return;
    const fr = rk.tab === "friends";
    const rows = fr ? rk.friends : rk.rows;
    const n = rows ? rows.length : 0;
    el.innerHTML = `
      <div class="rk-in">
        <header class="rk-top">
          <button class="rk-ib" data-k="home" type="button" aria-label="Volver">${BACK}</button>
          <div class="rk-title"><div class="rk-ttl"><i></i><h1>RANKING</h1><i></i></div><p>Compite, sube de rango y demuestra quién es el mejor.</p></div>
          <button class="rk-ib ${rk.rules ? "on" : ""}" data-k="info" type="button" aria-label="Reglas">${INFO}</button>
        </header>
        ${heroHtml()}
        <section class="rk-card rk-lc">
          <div class="rk-lh">
            <div class="rk-seg">
              <button class="rk-tab ${!fr ? "on" : ""}" data-k="tab" data-t="general" type="button">🌍 Mundial</button>
              <button class="rk-tab ${fr ? "on" : ""}" data-k="tab" data-t="friends" type="button">👥 Amigos</button>
            </div>
            <button class="rk-ib" data-k="refresh" type="button" aria-label="Actualizar">${REFRESH}</button>
          </div>
          <div class="rk-cap"><b>${fr ? "AMIGOS" : "TOP 100"}</b><span>${fr ? "Clasificación entre tus amigos" : "Jugadores con más trofeos"}</span>${n ? `<em>${n} ${fr ? (n === 1 ? "jugador" : "jugadores") : "clasificados"}</em>` : ""}</div>
          <div id="rkList"></div>
        </section>
        ${rulesHtml()}
      </div>`;
    renderList();
  }

  function rowHtml(p, pos) {
    const g = G(), lv = g.xpLevelFromTotal(p.xp || 0);
    const r = rankOf(p.trophies);
    if (!r) return "";
    const me = g.state.user && p.uid === g.state.user.uid;
    const on = isOn(p.uid);
    const dot = on === null ? "" : `<i class="rk-dot ${on ? "on" : ""}"></i>`;
    const tcls = pos === 1 ? "t1" : pos === 2 ? "t2" : pos === 3 ? "t3" : "";
    const cr = pos <= 3 ? `<span class="rk-cr">${CROWN(pos === 1 ? "#fbbf24" : pos === 2 ? "#e2e8f0" : "#e0894a", 16)}</span>` : "";
    return `
      <div class="rk-row ${tcls} ${me ? "me" : ""}" data-k="user" data-uid="${esc(p.uid)}" style="--rc:${r.tier.c1}">
        <span class="rk-pos">${pos}</span>
        <span class="rk-av">${cr}${g.avatarEmoji(p.avatar)}${dot}</span>
        <div class="rk-info"><b>@${esc(p.username)}</b><small><em>${r.label}</em><span class="rk-lv">Nv ${lv}</span><span class="rk-x">${fmt(p.wins)} victorias</span></small></div>
        <span class="rk-rcol">${badgeFor(r, 30)}</span>
        <span class="rk-tr">${CUP(14)}${fmt(p.trophies)}</span>
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
    list.innerHTML = rows.map((p, i) => rowHtml(p, i + 1)).join("") +
      `<div class="rk-note2">🔓 Solo aparecen jugadores con al menos 1 trofeo.</div>`;
  }

  /* ---------- Detalle de rangos (hoja inferior sobre la barra) ---------- */
  function modalHtml() {
    const t = myTrophies(), cur = rankOf(t);
    const sel = TIERS.find(x => x.k === rk.modal.sel) || TIERS[0];
    const si = TIERS.indexOf(sel);
    const goalCol = cur ? cur.tier.c1 : "#a78bfa";

    const goal = cur ? `
      <div class="rkm-goal" style="--c:${goalCol}">
        <b>Tu rango: <span style="color:${goalCol}">${cur.label}</span> · ${fmt(t)} trofeos</b>
        <small>${cur.next ? `Meta: ${esc(cur.nextLabel)} — te faltan ${fmt(cur.need)} trofeos` : "Has alcanzado el rango máximo."}</small>
        <div class="rk-bar"><i style="width:${cur.pct.toFixed(1)}%;color:${goalCol};background:linear-gradient(90deg,${cur.tier.c2},${goalCol})"></i></div>
      </div>` : `
      <div class="rkm-goal">
        <b>Aún sin rango</b>
        <small>Meta: consigue tu primer trofeo para entrar a Bronce III.</small>
        <div class="rk-bar"><i style="width:0%"></i></div>
      </div>`;

    const selector = TIERS.map(x => `
      <button class="rkm-s ${x.k === sel.k ? "on" : ""}" data-k="sel" data-t="${x.k}" style="--c:${x.c1}" type="button">
        ${cur && cur.k === x.k ? "<em>TÚ</em>" : ""}${badge(x.k, null, 34)}<span>${x.n}</span>
      </button>`).join("");

    const divs = [2, 1, 0].map(di => {
      const sc = si * 3 + di, from = sel.starts[di];
      const state = !cur ? `Faltan ${fmt(from - t)}` : cur.score === sc ? "TU DIVISIÓN" : cur.score > sc ? "Superada ✓" : `Faltan ${fmt(from - t)}`;
      return `<div class="rkm-dr ${cur && cur.score === sc ? "cur" : ""}">
        ${badge(sel.k, di, 30)}<div><b>${sel.n} ${ROMAN[di]}</b><small>${divRangeText(sel, di)} trofeos</small></div><span>${state}</span></div>`;
    }).join("");

    let req;
    if (!cur) req = si === 0 ? "Consigue tu primer trofeo para entrar a Bronce III." : `Necesitas ${fmt(sel.min)} trofeos. Te faltan ${fmt(sel.min - t)}.`;
    else if (cur.ti === si) req = cur.next ? `Estás en ${cur.label}. Te faltan ${fmt(cur.need)} trofeos para ${cur.nextLabel}.` : "Estás en la cima. ¡Rango máximo!";
    else if (cur.ti > si) req = "Ya superaste este rango. ✓";
    else req = `Necesitas ${fmt(sel.min)} trofeos para llegar. Te faltan ${fmt(sel.min - t)}.`;

    return `<div class="rkm" data-k="mclose"><section class="rkm-c" style="--c:${sel.c1}">
      <div class="rkm-h"><h2>RANGOS</h2><button class="rkm-x" data-k="mclose" type="button" aria-label="Cerrar">✕</button></div>
      ${goal}
      <div class="rkm-sel">${selector}</div>
      <div class="rkm-d" style="--c:${sel.c1}">
        <div class="rkm-dh">${badge(sel.k, null, 58)}<div><h3>${sel.n}</h3><small>${rangeText(sel)} trofeos</small></div></div>
        <p>${esc(sel.desc)}</p>
        ${divs}
        <div class="rkm-req">${esc(req)}</div>
      </div></section></div>`;
  }

  function drawModal() {
    let box = $("#gxRkModal");
    if (!rk.modal) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement("div");
      box.id = "gxRkModal";
      box.addEventListener("click", e => {
        const b = e.target.closest("[data-k]");
        if (!b) return;
        if (b.dataset.k === "mclose") {
          if (b.classList.contains("rkm") && e.target !== b) return;   // clic dentro de la hoja
          rk.modal = null; return drawModal();
        }
        if (b.dataset.k === "sel") { rk.modal.sel = b.dataset.t; drawModal(); }
      });
      document.body.appendChild(box);
    }
    const y = box.querySelector(".rkm-c") ? box.querySelector(".rkm-c").scrollTop : 0;
    box.innerHTML = modalHtml();
    const c = box.querySelector(".rkm-c");
    if (c) c.scrollTop = y;
  }

  function onClick(e) {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    const k = b.dataset.k;
    if (k === "home") return goHome();
    if (k === "info") { rk.rules = !rk.rules; return drawRank(); }
    if (k === "pclose") { rk.rules = false; return drawRank(); }
    if (k === "ranks") {
      const cur = rankOf(myTrophies());
      rk.rules = false;
      rk.modal = { sel: cur ? cur.k : "bronze" };
      drawRank();
      return drawModal();
    }
    if (k === "tab") {
      rk.tab = b.dataset.t;
      drawRank();
      if (rk.tab === "friends") loadFriends(false);
      return;
    }
    if (k === "refresh") return rk.tab === "friends" ? loadFriends(true) : loadRank(true);
    if (k === "user") { if (window.GreyxExtras) window.GreyxExtras.open("user", b.dataset.uid); return; }
    if (k === "login") { closeRank(); const g = G(); g.state.showAuth = true; g.render(); }
  }

  /* =====================================================
     6) AVISO DE ASCENSO / DESCENSO
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
    if (old === null) return;
    if (!r) return setTimeout(() => toast("Saliste del ranking"), 3800);
    if (old === "none") return setTimeout(() => toast(`${badgeFor(r, 28)} ¡Entraste al ranking: ${r.label}!`), 3800);
    const up = r.score > Number(old);
    setTimeout(() => toast(`${badgeFor(r, 28)} ${up ? "¡Subiste a " : "Bajaste a "}${r.label}${up ? "!" : ""}`), 3800);
  }
  setInterval(watchRank, 1500);

  /* =====================================================
     7) INSIGNIA EN PERFILES (calculada con los trofeos que
        el perfil ya muestra: sin duplicar datos)
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
    document.querySelectorAll(".pc").forEach(box => {
      if (box.querySelector(".rk-prow")) return;
      const b = box.querySelector(".sg div b");
      const anchor = box.querySelector(".plv");
      if (!b || !anchor) return;
      anchor.insertAdjacentHTML("beforebegin", `<div class="rk-prow" style="margin-top:10px">${rankLine(parseInt(b.textContent.replace(/\D/g, ""), 10))}</div>`);
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
     8) BARRA INFERIOR (mismo comportamiento de siempre)
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
