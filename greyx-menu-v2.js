/* GREYX LUDO — MENÚ PRINCIPAL v4 (minimalista, sin scroll, stickers nuevos)
   Carga: greyx-icons.js y después greyx-menu-v2.js (ambos DESPUÉS de greyx-fijo.js). Reemplaza al archivo anterior.
   - Todo el tamaño va en "em" y el em depende del alto/ancho de la pantalla: el menú se escala solo y cabe sin scroll.
   - Móvil/tablet vertical: 1 columna. Horizontal/PC: 2 columnas (perfil a la izquierda, modos a la derecha).
   - Stickers propios dibujados en SVG dentro de este archivo (no usa los iconos viejos).
   - Solo lectura de datos: stats/{uid}, perfil, rango (GXRank), presencia. No escribe en Firebase. */
(() => {
  if (window.__gx8) return;
  window.__gx8 = true;

  function boot() {
    const A = window.GXArt, I = A.icon;
    A.defs();

    const $ = (s, r = document) => r.querySelector(s);
    const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const num = n => Number(n || 0).toLocaleString("es");

    /* ================= STICKERS (SVG propios) ================= */
    const lg = (id, s) => `<linearGradient id="k8-${id}" x1="0" y1="0" x2="0" y2="1">${s.map((c, i) =>
      `<stop offset="${i / (s.length - 1)}" stop-color="${c}"/>`).join("")}</linearGradient>`;
    if (!$("#g8Defs")) {
      document.body.insertAdjacentHTML("beforeend", `<svg id="g8Defs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>
        ${lg("gold", ["#fff3b0", "#ffd23f", "#d98a00"])}${lg("blue", ["#8fe0ff", "#3b9bff", "#2358e0"])}${lg("blueL", ["#d2f1ff", "#86c8ff", "#4f8ff0"])}
        ${lg("violet", ["#efe6ff", "#b79dff", "#7c4dff"])}${lg("violetD", ["#a98aff", "#6d3fe0", "#3a1caa"])}${lg("teal", ["#a6f8ea", "#2dd4bf", "#0d8f84"])}
        ${lg("orange", ["#ffdca8", "#ff9a3d", "#e0561a"])}${lg("pink", ["#ffc0ec", "#e879f9", "#a21caf"])}${lg("green", ["#a6f7c0", "#34d36f", "#12853f"])}
        ${lg("gem", ["#e2f8ff", "#8fb8ff", "#7c5cff"])}
        <radialGradient id="k8-globe" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#a6ecff"/><stop offset=".55" stop-color="#2f8cff"/><stop offset="1" stop-color="#1237a8"/></radialGradient>
      </defs></svg>`);
    }
    const sv = (vb, inner) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`;
    const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx / 8}" fill="#000" opacity=".28"/>`;

    const K = {
      people: sv("0 0 64 58", `${shadow(32, 54, 26)}
        <circle cx="45" cy="21" r="8" fill="url(#k8-blueL)"/><path d="M30 47c1-9 6-14 15-14s13 5 14 14z" fill="url(#k8-blueL)"/>
        <circle cx="22" cy="18" r="10" fill="url(#k8-blue)"/><path d="M4 48c1.500-11 8-17 18-17s16.500 6 18 17z" fill="url(#k8-blue)"/>
        <ellipse cx="18.500" cy="13" rx="4" ry="2.800" fill="#fff" opacity=".6" transform="rotate(-30 18.500 13)"/>
        <path d="M9 41c3-6 7-8 12-8" stroke="#fff" opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M52 6l1.200 3 3 1.200-3 1.200L52 14.400l-1.200-3-3-1.200 3-1.200z" fill="#fff" opacity=".8"/>`),
      robot: sv("0 0 64 64", `${shadow(32, 61, 17)}
        <rect x="30" y="6" width="4" height="9" rx="2" fill="url(#k8-violet)"/><circle cx="32" cy="6" r="6.500" fill="#7df9ff" opacity=".28"/><circle cx="32" cy="6" r="4" fill="#7df9ff"/>
        <rect x="3" y="27" width="8" height="14" rx="4" fill="url(#k8-violet)"/><rect x="53" y="27" width="8" height="14" rx="4" fill="url(#k8-violet)"/>
        <rect x="9" y="14" width="46" height="38" rx="14" fill="url(#k8-violet)"/>
        <rect x="14" y="23" width="36" height="19" rx="9" fill="#1b0f4d"/>
        <circle cx="24" cy="32.500" r="6" fill="#7df9ff" opacity=".22"/><circle cx="40" cy="32.500" r="6" fill="#7df9ff" opacity=".22"/>
        <circle cx="24" cy="32.500" r="4.300" fill="#7df9ff"/><circle cx="40" cy="32.500" r="4.300" fill="#7df9ff"/>
        <circle cx="25.300" cy="31" r="1.400" fill="#fff"/><circle cx="41.300" cy="31" r="1.400" fill="#fff"/>
        <path d="M27 47.500h10" stroke="#6d3fe0" stroke-width="2.400" stroke-linecap="round"/>
        <path d="M16 20c3-3 8-4.500 14-4.500" stroke="#fff" opacity=".55" stroke-width="2.400" fill="none" stroke-linecap="round"/>
        <rect x="24" y="52" width="16" height="7" rx="3.500" fill="url(#k8-violetD)"/>`),
      globe: sv("0 0 64 64", `${shadow(32, 61, 20)}
        <circle cx="32" cy="32" r="26" fill="url(#k8-globe)"/>
        <g fill="#7fe6a8" opacity=".85"><path d="M17 23c4-5 10-4 12 1s-2 8-6 8-9-1-6-9z"/><path d="M36 37c4-3 10-1 10 5s-4 9-8 7-6-9-2-12z"/><path d="M40 15c3-1.500 7 .5 6 4s-5 4-7 1.500 0-4 1-5.500z"/></g>
        <g fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.700"><ellipse cx="32" cy="32" rx="11" ry="26"/><path d="M6 32h52M10 20h44M10 44h44"/></g>
        <circle cx="32" cy="32" r="26" fill="none" stroke="#bfe9ff" stroke-width="2.200"/>
        <ellipse cx="22" cy="17" rx="9" ry="4.500" fill="#fff" opacity=".4" transform="rotate(-35 22 17)"/>
        <ellipse cx="32" cy="32" rx="30" ry="8.500" fill="none" stroke="#38bdf8" stroke-width="2" opacity=".65" transform="rotate(-22 32 32)"/>`),
      shop: sv("0 0 48 48", `${shadow(24, 45, 19)}
        <rect x="8" y="20" width="32" height="24" rx="3" fill="url(#k8-orange)"/>
        <rect x="11" y="27" width="7" height="8" rx="1.500" fill="#ffe9b0"/><rect x="30" y="27" width="7" height="8" rx="1.500" fill="#ffe9b0"/>
        <rect x="19.500" y="28" width="9" height="16" rx="2" fill="#7a3b10"/>
        <path d="M5 9h8.500L13 20H2z" fill="#ff7a3d"/><path d="M13.500 9H24v11H13z" fill="#fff3d0"/><path d="M24 9h10.500L35 20H24z" fill="#ff7a3d"/><path d="M34.500 9H43l3 11H35z" fill="#fff3d0"/>
        <g><circle cx="7.500" cy="20" r="5.500" fill="#ff7a3d"/><circle cx="18.500" cy="20" r="5.500" fill="#fff3d0"/><circle cx="29.500" cy="20" r="5.500" fill="#ff7a3d"/><circle cx="40.500" cy="20" r="5.500" fill="#fff3d0"/></g>
        <path d="M6 11h8" stroke="#fff" opacity=".5" stroke-width="1.600" stroke-linecap="round"/>`),
      pack: sv("0 0 48 48", `${shadow(24, 45, 16)}
        <path d="M18 11V9a6 6 0 0 1 12 0v2" fill="none" stroke="#0d8f84" stroke-width="3" stroke-linecap="round"/>
        <rect x="5" y="23" width="5" height="14" rx="2.500" fill="url(#k8-teal)"/><rect x="38" y="23" width="5" height="14" rx="2.500" fill="url(#k8-teal)"/>
        <rect x="9" y="10" width="30" height="34" rx="12" fill="url(#k8-teal)"/>
        <rect x="14" y="27" width="20" height="13" rx="5" fill="#0b5d57"/><path d="M14 31h20" stroke="#2dd4bf" stroke-width="1.600" opacity=".7"/>
        <path d="M16 20h16" stroke="#0b5d57" stroke-width="2.200" stroke-linecap="round"/><circle cx="24" cy="34" r="1.800" fill="#a6f8ea"/>
        <path d="M13 17c1-3 3-5 6-5.500" stroke="#fff" opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>`),
      clip: sv("0 0 48 48", `${shadow(24, 45, 16)}
        <rect x="8" y="7" width="32" height="37" rx="7" fill="url(#k8-blue)"/>
        <rect x="12.500" y="14" width="23" height="26" rx="3.500" fill="#eaf4ff"/>
        <rect x="16" y="3" width="16" height="9" rx="3.500" fill="url(#k8-gold)"/>
        <path d="M17 25l4.500 4.500L31 19" fill="none" stroke="#22c55e" stroke-width="3.400" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 35h14" stroke="#9db4d8" stroke-width="2.400" stroke-linecap="round"/>`),
      cal: sv("0 0 48 48", `${shadow(24, 45, 17)}
        <rect x="6" y="8" width="36" height="36" rx="8" fill="url(#k8-pink)"/>
        <rect x="10" y="19" width="28" height="21" rx="4.500" fill="#fbe8ff"/>
        <rect x="14" y="3" width="5" height="12" rx="2.500" fill="url(#k8-gold)"/><rect x="29" y="3" width="5" height="12" rx="2.500" fill="url(#k8-gold)"/>
        <polygon points="24,22.500 26.400,28 32.500,28.600 28,32.600 29.400,38.500 24,35.400 18.600,38.500 20,32.600 15.500,28.600 21.600,28" fill="url(#k8-gold)" stroke="#b97a00" stroke-width=".8" stroke-linejoin="round"/>`),
      chest: sv("0 0 80 60", `${shadow(40, 56, 33)}
        <path d="M6 28C6 14 20 6 40 6s34 8 34 22z" fill="url(#k8-violetD)" stroke="#e6b449" stroke-width="2.400" stroke-linejoin="round"/>
        <rect x="6" y="28" width="68" height="26" rx="4" fill="url(#k8-violetD)" stroke="#e6b449" stroke-width="2.400"/>
        <rect x="18" y="8" width="7" height="46" fill="url(#k8-gold)"/><rect x="55" y="8" width="7" height="46" fill="url(#k8-gold)"/>
        <rect x="6" y="25.500" width="68" height="5" fill="url(#k8-gold)"/>
        <circle cx="40" cy="33" r="9" fill="#1b0f4d" stroke="#ffd23f" stroke-width="2.400"/>
        <text x="40" y="36.500" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="8.500" fill="#ffd23f">GX</text>
        <path d="M72 6l1.400 3.400 3.400 1.400-3.400 1.400L72 15.600l-1.400-3.400-3.400-1.400 3.400-1.400z" fill="#ffe27a"/>
        <path d="M6 14l1 2.400 2.400 1-2.400 1L6 20.800l-1-2.400-2.400-1 2.400-1z" fill="#ffe27a" opacity=".85"/>`),
      bulb: sv("0 0 24 24", `<path d="M12 2a6.600 6.600 0 0 0-4 11.800c.6.500 1 1.200 1 2V17h6v-1.200c0-.8.400-1.500 1-2A6.600 6.600 0 0 0 12 2z" fill="url(#k8-gold)"/>
        <path d="M9.500 9.500c.3-1.500 1.400-2.500 2.800-2.700" stroke="#fff" stroke-opacity=".9" stroke-width="1.400" stroke-linecap="round" fill="none"/>
        <rect x="8.800" y="18" width="6.400" height="2" rx="1" fill="#c98a1a"/><rect x="9.800" y="20.500" width="4.400" height="1.800" rx=".9" fill="#a8690f"/>`),
      mail: sv("0 0 24 24", `<rect x="3" y="5" width="18" height="14" rx="3.200" fill="none" stroke="currentColor" stroke-width="1.900"/><path d="M4.500 7.500 12 13l7.500-5.500" fill="none" stroke="currentColor" stroke-width="1.900" stroke-linecap="round" stroke-linejoin="round"/>`),
      gear: I.gear,
      coin: sv("0 0 40 40", `<circle cx="20" cy="20" r="18" fill="url(#k8-gold)" stroke="#b97a00" stroke-width="1.600"/><circle cx="20" cy="20" r="13.500" fill="none" stroke="#fff6c0" stroke-opacity=".7" stroke-width="1.200"/>
        <polygon points="20,9.500 23,16.300 30.400,17 24.800,21.800 26.500,29 20,25.200 13.500,29 15.200,21.800 9.600,17 17,16.300" fill="#fff6c0" stroke="#d99a00" stroke-width=".9" stroke-linejoin="round"/>`),
      gem: sv("0 0 40 40", `<path d="M10 6h20l8 10-18 20L2 16z" fill="url(#k8-gem)" stroke="#fff" stroke-opacity=".6" stroke-width="1.200" stroke-linejoin="round"/>
        <path d="M2 16h36M14 16l6 20 6-20M10 6l4 10 6-10 6 10 4-10" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.100" stroke-linejoin="round"/>`),
      trophy: sv("0 0 24 24", `<path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="url(#k8-gold)"/><path d="M7 5H4v1.600A3.600 3.600 0 0 0 7.600 10.200M17 5h3v1.600a3.600 3.600 0 0 1-3.600 3.600" fill="none" stroke="#e0a82a" stroke-width="1.700"/><rect x="10.700" y="13" width="2.600" height="4" fill="#e0a82a"/><rect x="7.500" y="17" width="9" height="3" rx="1.200" fill="url(#k8-gold)"/>`),
      crown: sv("0 0 24 24", `<path d="M3 18l1.500-10 4.500 4.500L12 5l3 7.500L19.500 8 21 18z" fill="url(#k8-gold)" stroke="#8a5a00" stroke-width="1" stroke-linejoin="round"/><rect x="3.500" y="18.600" width="17" height="2.400" rx="1" fill="url(#k8-gold)" stroke="#8a5a00" stroke-width=".8"/>`),
      swords: sv("0 0 24 24", `<path d="M5 4l12.500 12.500M19 4L6.500 16.500" stroke="#d5dbf0" stroke-width="2.200" stroke-linecap="round"/><path d="M15.500 14.500l4 4M8.500 14.500l-4 4" stroke="#e0a82a" stroke-width="2.600" stroke-linecap="round"/>`),
      star: sv("0 0 24 24", `<polygon points="12,2.500 14.900,8.700 21.500,9.400 16.600,13.900 18,20.500 12,17.100 6,20.500 7.400,13.900 2.500,9.400 9.100,8.700" fill="url(#k8-green)" stroke="#0d6b32" stroke-width=".8" stroke-linejoin="round"/>`),
      target: sv("0 0 24 24", `<g fill="none" stroke="#f0529c" stroke-width="2.100"><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4.200"/></g><circle cx="11" cy="13" r="1.400" fill="#f0529c"/><path d="M11 13l9-9M17 3.500V7h3.500" stroke="#d5dbf0" stroke-width="1.800" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
      shield: sv("0 0 64 72", `<path d="M32 2L60 13V38C60 54 48 65 32 70C16 65 4 54 4 38V13Z" fill="url(#k8-violetD)" stroke="#fbbf24" stroke-width="3" stroke-linejoin="round"/><path d="M32 16L44 36L32 56L20 36Z" fill="#fff" opacity=".28"/>`)
    };
    const SOON = { shop: K.shop, pack: K.pack, clip: K.clip, cal: K.cal, chest: K.chest };

    const FLAG_DO = `<svg class="g8-flag" viewBox="0 0 28 18" aria-label="República Dominicana"><rect width="28" height="18" rx="2.500" fill="#fff"/><rect width="12" height="7.500" fill="#1d4ed8"/><rect x="16" width="12" height="7.500" fill="#dc2626"/><rect y="10.500" width="12" height="7.500" fill="#dc2626"/><rect x="16" y="10.500" width="12" height="7.500" fill="#1d4ed8"/><rect x="12" width="4" height="18" fill="#fff"/><rect y="7.500" width="28" height="3" fill="#fff"/><rect x=".5" y=".5" width="27" height="17" rx="2.200" fill="none" stroke="#ffffff55"/></svg>`;
    const PENCIL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4.200L16.500 4.300a2 2 0 0 1 2.800 0l.4.400a2 2 0 0 1 0 2.800L8.200 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

    /* ================= CSS (todo en em: se escala con la pantalla) ================= */
    const css = `
.gx6{display:none!important}
.g8{position:fixed;inset:0;z-index:85;display:none;color:#f1f3ff;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:clamp(12px,min(3.6vw,1.9vh),18px);
  background:${A.pageBg()} 0 0/150px,radial-gradient(circle at 50% 0,#3a1fa088,transparent 46%),radial-gradient(circle at 100% 42%,#2a3cc844,transparent 40%),radial-gradient(circle at 0 80%,#4c1d9555,transparent 42%),linear-gradient(180deg,#080a2a,#04051a);
  overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;
  padding:calc(.6em + env(safe-area-inset-top,0px)) .9em calc(58px + env(safe-area-inset-bottom,0px))}
@supports (height:1dvh){.g8{font-size:clamp(12px,min(3.6vw,1.9dvh),18px)}}
.g8::-webkit-scrollbar{display:none}
.g8.on{display:block}
.g8 button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer}
.g8 svg{display:block}
.g8-in{height:100%;width:min(100%,520px);margin:0 auto;display:flex;flex-direction:column;gap:.65em}
.g8-l,.g8-r{display:contents}
.g8-in>*,.g8-l>*,.g8-r>*{flex:none;min-width:0}
.g8 .g8-modes{flex:1 1 0;min-height:7em}

.g8-card{position:relative;border:1px solid #e6b449b8;border-radius:1.1em;background:linear-gradient(160deg,#15186aee,#080a30ee);
  box-shadow:0 0 .9em #fbbf2426,inset 0 1px 0 #ffffff1a}

/* encabezado */
.g8-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:.5em;height:3.8em}
.g8-ic{position:relative;width:3.5em;height:3.5em;display:grid;place-items:center;padding:0;border-radius:50%;
  border:1.5px solid #6d5cffaa;background:linear-gradient(145deg,#232a66,#0d1030);box-shadow:0 0 .9em #4f46e566;color:#f1f3ff}
.g8-ic svg{width:56%;height:56%}
.g8-ic:active{transform:scale(.93)}
.g8-ic.idea{justify-self:start;border-color:#fbbf24aa;box-shadow:0 0 1em #fbbf2455}
.g8-ic.idea svg{width:64%;height:64%;filter:drop-shadow(0 0 5px #fbbf24)}
.g8-acts{justify-self:end;display:flex;gap:.5em}
.g8-dot{position:absolute;top:-.25em;right:-.25em;min-width:1.5em;height:1.5em;padding:0 .3em;display:none;place-items:center;border-radius:99px;background:#ef4444;color:#fff;font:900 .6em Inter,system-ui,sans-serif;border:2px solid #080a2a;font-style:normal}
.g8-dot.on{display:grid}
.g8-logo{display:flex;align-items:center;gap:.4em;min-width:0}
.g8-logo>svg{height:3.8em;width:auto;flex:none;filter:drop-shadow(0 0 .8em #6d28d9cc)}
.g8-logo div{display:flex;flex-direction:column;line-height:.9}
.g8-lg1,.g8-lg2{font:900 1.45em/.95 Inter,system-ui,sans-serif;-webkit-background-clip:text;background-clip:text;color:transparent}
.g8-lg1{background-image:linear-gradient(180deg,#fff,#c3c7e6)}
.g8-lg2{background-image:linear-gradient(180deg,#b79dff,#6d28d9);filter:drop-shadow(0 0 .6em #7c3aedaa)}

/* monedas */
.g8-wallet{display:flex;align-items:center;gap:.7em;padding:.45em .7em}
.g8-cur{flex:1;display:flex;align-items:center;gap:.5em;min-width:0}
.g8-cur+.g8-cur{border-left:1px solid #ffffff1c;padding-left:.7em}
.g8-coin{flex:none;width:2.4em;height:2.4em;filter:drop-shadow(0 0 .5em #fbbf2488)}
.g8-coin.gem{filter:drop-shadow(0 0 .5em #8b5cf6)}
.g8-coin svg{width:100%;height:100%}
.g8-cur div{flex:1;min-width:0;line-height:1.1}
.g8-cur small{display:block;color:#9aa4d6;font-size:.55em;font-weight:800;letter-spacing:.16em}
.g8-cur b{display:block;font-size:1.2em;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-plus{flex:none;width:2.1em;height:2.1em;display:grid;place-items:center;padding:0;border-radius:.65em;border:1.5px solid #5b6cff;background:#141a5acc;font-size:1.2em;font-weight:900;line-height:1}
.g8-plus:active{transform:scale(.92)}

/* recompensa diaria */
.g8-daily{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.7em;padding:.35em .8em .35em .6em;
  background:radial-gradient(70% 150% at 10% 50%,#8b4dff77,transparent 62%),radial-gradient(40% 90% at 100% 20%,#fbbf2433,transparent 70%),linear-gradient(115deg,#2f1a7e,#0d0830 60%,#2a1d06)}
.g8-chest{width:4em;filter:drop-shadow(0 .3em .5em #000a)}
.g8-chest svg{width:100%;height:auto}
.g8-dt{min-width:0;line-height:1.25}
.g8-dt b{display:block;font-size:.88em;font-weight:900;letter-spacing:.04em;color:#ffd96a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-dt small{display:block;color:#d4c7ff;font-size:.66em;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-claim{padding:.6em 1em;border:0;border-radius:99px;background:linear-gradient(180deg,#ffe98a,#f5b301);color:#3a2200;font-size:.76em;font-weight:900;letter-spacing:.05em;white-space:nowrap;box-shadow:0 .25em 0 #92600a,0 0 1em #fbbf2477}
.g8-claim:active{transform:translateY(2px);box-shadow:0 1px 0 #92600a}

/* perfil */
.g8-prof{display:grid;grid-template-rows:1fr auto;overflow:hidden;
  background:radial-gradient(120% 90% at 50% 40%,#2a2f9a55,transparent 70%),${A.pageBg()} 0 0/120px,linear-gradient(160deg,#10164f,#070a28)}
.g8-p1{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.8em;padding:.9em .9em .6em}
.g8-avw{position:relative;width:4.4em;height:4.4em}
.g8-av{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;font-size:2.2em;
  background:radial-gradient(circle at 35% 30%,#4c3fa8,#14172e);border:2px solid #a78bfa;box-shadow:0 0 1em #8b5cf6aa,inset 0 0 .6em #0008}
.g8-avc{position:absolute;top:-.85em;left:50%;width:1.5em;height:1.5em;transform:translateX(-50%);filter:drop-shadow(0 0 5px #fbbf24);pointer-events:none}
.g8-edit{position:absolute;right:-.3em;bottom:-.2em;width:1.7em;height:1.7em;display:grid;place-items:center;padding:0;border-radius:50%;
  border:1.5px solid #a78bfa;background:#1b1d63;color:#fff;box-shadow:0 2px 8px #000a}
.g8-edit svg{width:55%;height:55%}
.g8-edit:active{transform:scale(.9)}
.g8-pt{min-width:0;display:flex;flex-direction:column;gap:.3em}
.g8-nm{display:flex;align-items:center;gap:.5em;min-width:0}
.g8-nm b{min-width:0;font-size:1.2em;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-flag{flex:none;width:1.5em;height:1em;border-radius:2px;box-shadow:0 0 0 1px #0006}
.g8-pt small{color:#a5b0ff;font-size:.72em;font-weight:800}
.g8-pt small em{font-style:normal;font-size:1.35em;font-weight:900;color:#ffd96a}
.g8-xp{display:flex;align-items:center;gap:.5em}
.g8-xp span{flex:1;min-width:0;height:.6em;border-radius:9px;border:1.5px solid #e6b449;background:#0a0d30;overflow:hidden}
.g8-xp span i{display:block;height:100%;background:linear-gradient(90deg,#ffe27a,#f5b301)}
.g8-xp em{flex:none;font-style:normal;color:#c2c8ee;font-size:.58em;font-weight:800;white-space:nowrap}
.g8-rk{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2em;min-width:4.6em}
.g8-embw{position:relative;height:3.6em;display:grid;place-items:center}
.g8-embw::before{content:"";position:absolute;inset:-.6em;border-radius:50%;background:radial-gradient(circle,#7c5cff66,transparent 66%)}
.g8-embw svg{position:relative;height:100%;width:auto}
.g8-rk b{font-size:.66em;font-weight:900;letter-spacing:.06em;white-space:nowrap}
.g8-ps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));padding:.5em .2em .6em;border-top:1px solid #ffffff1c}
.g8-ps div{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.15em;padding:0 .15em;min-width:0;text-align:center;line-height:1.1}
.g8-ps div+div{border-left:1px solid #ffffff1c}
.g8-ps i{width:1.6em;height:1.6em}
.g8-ps i svg{width:100%;height:100%}
.g8-ps b{font-size:1.02em;font-weight:900}
.g8-ps b.sm{font-size:.62em;letter-spacing:.02em;text-transform:uppercase;line-height:1.2;padding:.35em 0}
.g8-ps small{color:#9aa4d6;font-size:.52em;font-weight:800;letter-spacing:.05em;white-space:nowrap}
.g8-prof.ld .g8-ps b,.g8-prof.ld .g8-rk b,.g8-prof.ld .g8-pt small em{animation:g8Ld 1.2s ease-in-out infinite}
.g8-prof.ld .g8-embw svg{opacity:.4}
@keyframes g8Ld{50%{opacity:.4}}

/* modos: ocupan todo el espacio sobrante */
.g8-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:minmax(0,1fr);gap:.6em}
.g8-mode{position:relative;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;gap:.3em;padding:.8em .4em .7em;overflow:hidden;
  border-radius:1.3em;border:1px solid #e6b449cc;background:var(--cb);box-shadow:0 0 1em var(--cg),inset 0 1px 0 #ffffff26}
.g8-mode.local{--cb:linear-gradient(165deg,#1a45b0,#0a1347);--cg:#2a7bff55}
.g8-mode.ai{--cb:linear-gradient(165deg,#5a26c9,#140b45);--cg:#8b5cf655}
.g8-mode.online{--cb:linear-gradient(165deg,#0f3d7a,#08122e);--cg:#38bdf877}
.g8-mbg,.g8-mmid{position:absolute;inset:0;pointer-events:none}
.g8-mbg svg{width:100%;height:100%;opacity:.38;filter:blur(1px)}
.g8-mmid{background:radial-gradient(circle at 50% 30%,#ffffff26,transparent 52%),linear-gradient(180deg,transparent 55%,#00000055)}
.g8-mico{position:relative;flex:1 1 0;min-height:0;width:100%}
.g8-mico svg{position:absolute;inset:0;margin:auto;width:100%;height:100%;max-width:8em;max-height:8em;filter:drop-shadow(0 .3em .5em #0008)}
.g8-mode strong{position:relative;display:flex;align-items:center;justify-content:center;font-size:1.05em;font-weight:900;letter-spacing:.02em;white-space:nowrap;text-shadow:0 2px 6px #000b}
.g8-mode small{position:relative;max-width:100%;color:#c3cbf3;font-size:.66em;font-weight:600;line-height:1.25;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.g8-live{display:inline-block;width:.6em;height:.6em;margin-right:.4em;border-radius:50%;background:#22c55e;box-shadow:0 0 .6em #22c55e}
.g8-onl{position:relative;display:flex;align-items:center;gap:.3em;padding:.2em .6em;border-radius:99px;border:1px solid #22c55e;background:#0a2a1acc;color:#86efac;font-size:.62em;font-weight:900;white-space:nowrap}
.g8-mode:active{transform:scale(.97)}

/* contenido */
.g8-sec{display:flex;align-items:center;justify-content:center;gap:.8em;color:#ffd96a;font-size:.68em;font-weight:900;letter-spacing:.22em}
.g8-sec::before,.g8-sec::after{content:"";flex:1;max-width:5em;height:1.5px;background:linear-gradient(90deg,transparent,#e6b449)}
.g8-sec::after{transform:scaleX(-1)}
.g8-cont{display:flex;flex-direction:column;gap:.5em}
.g8-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5em}
.g8-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3em;padding:.55em .2em .5em;border-radius:1em;text-align:center}
.g8-tico{width:2.5em;height:2.5em}
.g8-tico svg{width:100%;height:100%;filter:drop-shadow(0 2px 3px #0008)}
.g8-tile b{font-size:.6em;font-weight:900;letter-spacing:.05em;max-width:100%;white-space:nowrap}
.g8-tile:active{transform:scale(.96)}

/* aviso MUY PRONTO */
.g8-soon{position:fixed;inset:0;z-index:1060;display:grid;place-items:center;padding:20px;background:rgba(5,6,20,.55);animation:g8F .15s ease both}
@keyframes g8F{from{opacity:0}to{opacity:1}}
@keyframes g8P{from{opacity:0;transform:translateY(10px) scale(.92)}to{opacity:1;transform:none}}
.g8-soonc{min-width:min(260px,100%);padding:22px 30px 20px;border-radius:24px;text-align:center;font-family:Inter,system-ui,sans-serif;color:#fff;
  border:2px solid #e6b449;background:linear-gradient(160deg,#252b8a,#0b0d38);box-shadow:0 0 34px #fbbf2455,0 24px 60px #000b;animation:g8P .25s cubic-bezier(.2,.9,.3,1.2) both}
.g8-soonc svg{width:56px;height:56px;margin:0 auto 10px;filter:drop-shadow(0 0 10px #fbbf2499)}
.g8-soonc strong{display:block;font-size:1.35rem;font-weight:900;letter-spacing:.14em;background:linear-gradient(180deg,#fff3b0,#f5b301);-webkit-background-clip:text;background-clip:text;color:transparent}
.g8-soonc small{display:block;margin-top:6px;color:#c3cbf3;font-size:.76rem;font-weight:700}
.g8-toast{position:fixed;left:50%;bottom:calc(76px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:99;padding:10px 18px;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 .8rem Inter,system-ui,sans-serif;box-shadow:0 10px 30px #000c;white-space:nowrap}

/* ventana de monedas */
.g8-md{position:fixed;inset:0;z-index:1050;display:grid;place-items:center;padding:20px;background:rgba(5,6,12,.86);animation:g8F .18s ease both}
.g8-mdc{position:relative;width:min(340px,100%);padding:26px 20px 20px;border-radius:26px;text-align:center;color:#fff;font-family:Inter,system-ui,sans-serif;border:1.5px solid #a78bfa77;background:linear-gradient(160deg,#252b60,#0d1027);box-shadow:0 25px 70px #000b}
.g8-mdx{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:12px;border:1px solid #ffffff22;background:#ffffff12;color:#fff;cursor:pointer}
.g8-mdi{display:block;width:64px;height:64px;margin:0 auto 8px;filter:drop-shadow(0 0 12px #fbbf24aa)}
.g8-mdi.gem{filter:drop-shadow(0 0 12px #8b5cf6)}
.g8-mdi svg{width:100%;height:100%}
.g8-mdc h3{margin:0 0 12px;font-size:1.15rem;font-weight:900}
.g8-mdb{display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;margin-bottom:12px;border-radius:14px;background:#ffffff0c;border:1px solid #ffffff1a;color:#9aa4d6;font:800 .66rem Inter,system-ui,sans-serif;letter-spacing:.12em}
.g8-mdb b{color:#fff;font-size:1.2rem;letter-spacing:0}
.g8-mdc p{margin:0 0 16px;color:#cbd5e1;font-size:.84rem;line-height:1.5}
.g8-mdok{width:100%;min-height:48px;border:0;border-radius:14px;color:#fff;font:900 .9rem Inter,system-ui,sans-serif;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 4px 0 #3b1d8f}

/* barra inferior compacta: 4 botones iguales */
body .gx6-nav{max-width:560px;margin:0 auto;padding:6px 4px max(6px,env(safe-area-inset-bottom,0px));border-radius:20px 20px 0 0;
  border:1px solid #e6b44977;border-bottom:0;background:linear-gradient(180deg,#0c1244f7,#060822);box-shadow:0 -8px 30px #2a3cc833,inset 0 1px 0 #ffffff1a}
body .gx6-nav button{flex:1 1 0;min-width:0;min-height:44px;gap:2px;justify-content:center;color:#7f8ad0;font:800 10px Inter,system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase}
body .gx6-nav button svg{width:22px;height:22px}
body .gx6-nav button.on{color:#b9adff}
body .gx6-nav button.on svg{filter:drop-shadow(0 0 7px #7c6cff)}
body .gx6-nav button.on::after{width:36px;height:3px;background:#7c6cff;box-shadow:0 0 10px #7c6cff}

/* pantallas bajas: se quitan las descripciones para que todo siga cabiendo */
@media (max-height:620px){.g8-mode small{display:none}.g8-dt small{display:none}}
/* tablet vertical */
@media (min-width:700px){.g8-in{width:min(100%,640px)}.g8{padding-left:1.4em;padding-right:1.4em}}
/* horizontal / PC: 2 columnas, misma estética */
@media (min-aspect-ratio:5/4){
  .g8-in{width:min(100%,1100px);display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);grid-template-rows:auto minmax(0,1fr);gap:.8em}
  .g8-top{grid-column:1/-1}
  .g8-l,.g8-r{display:flex;flex-direction:column;gap:.7em;min-height:0}
  .g8-prof{flex:1 1 auto}
  .g8 .g8-modes{min-height:0}
  .g8-p1{align-content:center}
}
@media (prefers-reduced-motion:reduce){.g8-prof.ld *,.g8-soonc,.g8-soon{animation:none!important}}
`;
    const st = document.createElement("style");
    st.id = "g8css";
    st.textContent = css;
    document.head.appendChild(st);

    /* ================= Datos reales ================= */
    const ms = { uid: null, status: "idle", data: null, t: 0, busy: false };

    async function loadStats() {
      const G = window.GX, s = G && G.state;
      if (!s || !s.user || !G.fb || !G.fb.db || ms.busy) return;
      const uid = s.user.uid;
      if (ms.uid === uid && ms.status === "ok") return;
      if (ms.uid === uid && ms.status === "error" && Date.now() - ms.t < 8000) return;
      ms.busy = true; ms.uid = uid; ms.status = "loading";
      try {
        const fs = await G.fsModule();
        const [a, b] = await Promise.all([
          fs.getDoc(fs.doc(G.fb.db, "stats", uid)),
          fs.getDoc(fs.doc(G.fb.db, "publicProfiles", uid)).catch(() => null)
        ]);
        if (G.state.user && G.state.user.uid === uid) {
          const pub = b && b.exists() ? b.data() : null;
          const src = a.exists() ? a.data() : pub;
          ms.data = src ? { played: src.played || 0, wins: src.wins || 0, trophies: src.trophies || 0 } : { played: 0, wins: 0, trophies: 0 };
          ms.status = "ok";
        }
      } catch (e) {
        console.warn("[menu] no se pudieron leer las estadísticas", e);
        ms.status = "error";
      }
      ms.busy = false; ms.t = Date.now(); sig = ""; queue();
    }

    const ol = { n: null, t: 0, busy: false };
    async function loadOnline() {
      if (ol.busy || Date.now() - ol.t < 30000) return;
      ol.busy = true;
      try {
        const P = window.GXPresence;
        if (!P) throw new Error("sin presencia");
        const { db, mod } = await P.get();
        if (!db) throw new Error("sin db");
        const snap = await mod.get(mod.query(mod.ref(db, "presence"), mod.orderByChild("state"), mod.equalTo("online")));
        const now = Date.now(), stale = P.stale || 150000;
        let n = 0;
        snap.forEach(c => { const v = c.val(); if (v && now - (v.last || 0) < stale) n++; });
        ol.n = n;
      } catch (e) { ol.n = null; }
      ol.busy = false; ol.t = Date.now(); queue();
    }

    function rankInfo(tr) {
      const R = window.GXRank;
      if (!R || !R.rankOf) return null;
      try { return R.rankOf(tr); } catch (e) { return null; }
    }

    function data() {
      const G = window.GX, s = G && G.state;
      if (!s) return null;
      const u = s.user;
      if (u && ms.uid && ms.uid !== u.uid) { ms.uid = null; ms.status = "idle"; ms.data = null; }

      let status = "guest", stat = null;
      if (u) {
        if (s.stats && s.statsUid === u.uid) { stat = s.stats; status = "ok"; }
        else if (ms.uid === u.uid && ms.status === "ok") { stat = ms.data; status = "ok"; }
        else status = ms.uid === u.uid && ms.status === "error" ? "error" : "loading";
      }
      const ok = status === "ok";
      const tr = ok ? (stat.trophies || 0) : 0, played = ok ? (stat.played || 0) : 0, wins = ok ? (stat.wins || 0) : 0;

      const xpOk = !!(u && s.xpLoaded);
      const lv = xpOk ? s.xpLevel : null;
      let pct = 0, label = "";
      if (xpOk) {
        pct = G.xpBarPct(s.xp);
        const base = G.xpForLevel(lv), next = G.xpForLevel(lv + 1);
        label = lv >= 100 ? "MÁX" : (s.xp - base) + " / " + (next - base);
      }
      const p = s.profile;
      const name = p ? p.username : (u && u.email ? u.email.split("@")[0] : "Invitado");
      const avatar = p ? G.avatarEmoji(p.avatar) : "👤";
      const pick = (...v) => { for (const x of v) if (typeof x === "number") return x; return 0; };
      return {
        name, avatar, lv, pct, label, status, tr, played, wins,
        rate: ok ? (played ? Math.round(wins * 100 / played) + "%" : "0%") : null,
        gold: pick(s.gold, s.coins, s.oro, s.wallet && s.wallet.gold),
        gems: pick(s.gems, s.diamonds, s.diamantes, s.wallet && s.wallet.gems),
        rank: ok ? rankInfo(tr) : null,
        online: ol.n
      };
    }

    /* ================= Markup ================= */
    const mode = (go, cls, title, desc, ico, bg, o = {}) => `
      <button class="g8-mode ${cls}" data-go="${go}" type="button" aria-label="${title}">
        <span class="g8-mbg">${bg}</span><span class="g8-mmid"></span>
        <span class="g8-mico">${ico}</span>
        <strong>${o.live ? '<i class="g8-live"></i>' : ""}${title}</strong>
        <small>${desc}</small>
        ${o.extra || ""}
      </button>`;

    const tile = (label, key) => `
      <button class="g8-card g8-tile" data-go="soon" data-name="${label}" data-ico="${key}" type="button">
        <span class="g8-tico">${SOON[key]}</span><b>${label}</b>
      </button>`;

    function draw(d) {
      const r = d.rank, R = window.GXRank, ok = d.status === "ok";
      const emblem = r && R && R.badgeFor ? R.badgeFor(r, 56) : K.shield;
      const rcol = r ? r.tier.c1 : "#c4b5fd";
      const rname = r ? r.label.toUpperCase()
        : ok ? "SIN RANGO" : d.status === "loading" ? "···" : d.status === "error" ? "SIN DATOS" : "SIN CUENTA";
      const v = x => ok ? x : "—";
      const stats = [
        [K.trophy, v(num(d.tr)), "TROFEOS", ""],
        [K.crown, ok ? rname : "—", "RANGO", "sm"],
        [K.swords, v(num(d.played)), "PARTIDAS", ""],
        [K.star, v(num(d.wins)), "VICTORIAS", ""],
        [K.target, v(d.rate), "WIN RATE", ""]
      ];
      const onl = d.online == null ? "" : `<span class="g8-onl"><i class="g8-live" style="margin:0"></i>${num(d.online)} en línea</span>`;

      box.innerHTML = `
      <div class="g8-in">
        <div class="g8-top">
          <button class="g8-ic idea" data-go="ideas" type="button" aria-label="Buzón de ideas">${K.bulb}<i class="g8-dot" id="g8IdeaDot"></i></button>
          <div class="g8-logo">${I.logo}<div><span class="g8-lg1">GREYX</span><span class="g8-lg2">LUDO</span></div></div>
          <div class="g8-acts">
            <button class="g8-ic" data-go="mail" type="button" aria-label="Correo">${K.mail}</button>
            <button class="g8-ic" data-go="settings" type="button" aria-label="Configuración">${K.gear}</button>
          </div>
        </div>

        <div class="g8-l">
          <div class="g8-card g8-wallet">
            <div class="g8-cur"><span class="g8-coin">${K.coin}</span><div><small>ORO</small><b>${num(d.gold)}</b></div>
              <button class="g8-plus" data-go="wallet" data-w="gold" type="button" aria-label="Conseguir oro">+</button></div>
            <div class="g8-cur"><span class="g8-coin gem">${K.gem}</span><div><small>DIAMANTES</small><b>${num(d.gems)}</b></div>
              <button class="g8-plus" data-go="wallet" data-w="gems" type="button" aria-label="Conseguir diamantes">+</button></div>
          </div>

          <div class="g8-card g8-daily">
            <span class="g8-chest">${K.chest}</span>
            <div class="g8-dt"><b>RECOMPENSA DIARIA</b><small>¡No pierdas tu racha!</small></div>
            <button class="g8-claim" data-go="soon" data-name="RECOMPENSA DIARIA" data-ico="chest" type="button">RECLAMAR ›</button>
          </div>

          <div class="g8-card g8-prof ${d.status === "loading" ? "ld" : ""}">
            <div class="g8-p1">
              <div class="g8-avw">
                <span class="g8-avc">${K.crown}</span>
                <span class="g8-av">${d.avatar}</span>
                <button class="g8-edit" data-go="profile" type="button" aria-label="Editar perfil">${PENCIL}</button>
              </div>
              <div class="g8-pt">
                <div class="g8-nm">${FLAG_DO}<b>${esc(d.name)}</b></div>
                <small>NV. <em>${d.lv == null ? "—" : d.lv}</em></small>
                <div class="g8-xp"><span><i style="width:${d.pct}%"></i></span>${d.label ? `<em>${d.label}</em>` : ""}</div>
              </div>
              <div class="g8-rk">
                <div class="g8-embw">${emblem}</div>
                <b style="color:${rcol}">${esc(rname)}</b>
              </div>
            </div>
            <div class="g8-ps">
              ${stats.map(x => `<div><i>${x[0]}</i><b class="${x[3]}">${x[1]}</b><small>${x[2]}</small></div>`).join("")}
            </div>
          </div>
        </div>

        <div class="g8-r">
          <div class="g8-modes">
            ${mode("local", "local", "LOCAL", "Con amigos, mismo dispositivo", K.people, A.modeBg.local)}
            ${mode("bot", "ai", "RETO IA", "Pon a prueba tu habilidad", K.robot, A.modeBg.ai)}
            ${mode("online", "online", "ONLINE", "Jugadores de todo el mundo", K.globe, A.modeBg.online, { live: true, extra: onl })}
          </div>
          <div class="g8-cont">
            <div class="g8-sec">CONTENIDO</div>
            <div class="g8-grid">
              ${tile("TIENDA", "shop")}${tile("INVENTARIO", "pack")}${tile("MISIONES", "clip")}${tile("EVENTOS", "cal")}
            </div>
          </div>
        </div>
      </div>`;

      if (window.GX && GX.translateDOM) { try { GX.translateDOM(box); } catch (e) {} }
      badges(d);
    }

    function badges() {
      const el = $("#g8IdeaDot");
      if (!el) return;
      const n = window.GXIdeas ? window.GXIdeas.unread() : 0;
      const txt = n > 99 ? "99+" : String(n || "");
      if (el.textContent !== txt) el.textContent = txt;
      el.classList.toggle("on", n > 0);
    }

    /* ================= Contenedor y barra ================= */
    document.querySelectorAll(".g8,.g8-nav").forEach(e => e.remove());
    const box = document.createElement("div");
    box.className = "g8";
    document.body.appendChild(box);

    function setupNav() {
      const n = $(".gx6-nav");
      if (!n || n.dataset.g8 === "4") return;
      n.dataset.g8 = "4";
      n.innerHTML = `
        <button class="on" data-go="home" type="button">${A.nav.home}<span>Inicio</span></button>
        <button data-go="friends" type="button">${A.nav.friends}<span>Amigos</span></button>
        <button data-go="rank" type="button">${A.nav.rank}<span>Ranking</span></button>
        <button data-go="profile" type="button">${A.nav.profile}<span>Perfil</span></button>`;
    }

    /* ================= Acciones ================= */
    function toast(m) {
      const t = document.createElement("div");
      t.className = "g8-toast";
      t.textContent = m;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 1800);
    }

    function soon(name, key) {
      const old = $(".g8-soon");
      if (old) old.remove();
      const m = document.createElement("div");
      m.className = "g8-soon";
      m.innerHTML = `<div class="g8-soonc" role="status">${SOON[key] || ""}<strong>MUY PRONTO</strong><small>${esc(name)} estará disponible próximamente</small></div>`;
      const close = () => m.remove();
      m.addEventListener("click", close);
      document.body.appendChild(m);
      setTimeout(close, 2200);
    }

    const act = a => { const b = $('[data-action="' + a + '"]'); if (b) { b.click(); return true; } return false; };
    const viaNav = g => { const b = $('.gx6-nav [data-go="' + g + '"]'); if (b) { b.click(); return true; } return false; };

    function wallet(kind) {
      if ($(".g8-md")) return;
      const gold = kind === "gold", d = data() || {};
      const m = document.createElement("div");
      m.className = "g8-md";
      m.innerHTML = `<div class="g8-mdc" role="dialog" aria-modal="true">
        <button class="g8-mdx" type="button" aria-label="Cerrar">✕</button>
        <span class="g8-mdi ${gold ? "" : "gem"}">${gold ? K.coin : K.gem}</span>
        <h3>${gold ? "Conseguir oro" : "Conseguir diamantes"}</h3>
        <div class="g8-mdb">TU SALDO <b>${num(gold ? d.gold : d.gems)}</b></div>
        <p>La tienda de ${gold ? "oro" : "diamantes"} todavía no está habilitada. Cuando se active, aquí podrás conseguir más.</p>
        <button class="g8-mdok" type="button">Entendido</button></div>`;
      const close = () => m.remove();
      m.addEventListener("click", e => { if (e.target === m || e.target.closest(".g8-mdx,.g8-mdok")) close(); });
      document.body.appendChild(m);
    }

    function findMail() {
      const re = /correo|mail|buz[oó]n|inbox|mensaje/i;
      for (const e of document.querySelectorAll("button,[role=button],a,[data-action],[data-go]")) {
        if (box.contains(e) || e.closest("#gxIdeas,.gx6-nav") || e.classList.contains("gxi-btn")) continue;
        const cls = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className;
        if (re.test([e.id, cls, e.getAttribute("aria-label"), e.dataset.action, e.dataset.go, e.title].join(" "))) return e;
      }
      return null;
    }

    box.addEventListener("click", e => {
      const b = e.target.closest("[data-go]");
      if (!b) return;
      const g = b.dataset.go;
      if (g === "soon") return soon(b.dataset.name || "Esta sección", b.dataset.ico);
      if (g === "wallet") return wallet(b.dataset.w);
      if (g === "local") return void act("local");
      if (g === "bot") return void act("mode");
      if (g === "online") return void act("online-open");
      if (g === "settings") return void act("settings");
      if (g === "profile") return void (viaNav("profile") || act("profile-open"));
      if (g === "ideas") {
        if (window.GXIdeas) return window.GXIdeas.open();
        return toast("Buzón de ideas no disponible");
      }
      if (g === "mail") { const m = findMail(); return m ? m.click() : toast("Correo no disponible"); }
    });

    /* ================= Sincronización con el menú original ================= */
    let sig = "", raf = 0;
    function sync() {
      raf = 0;
      setupNav();
      const on = !!$(".gx6.on");
      box.classList.toggle("on", on);
      if (!on) { sig = ""; return; }
      const d = data();
      if (!d) return;
      if (d.status === "loading" || d.status === "error") loadStats();
      if (window.GX.state.user) loadOnline();
      const k = JSON.stringify([d.name, d.avatar, d.lv, d.pct, d.label, d.status, d.tr, d.played, d.wins, d.gold, d.gems, d.rank ? d.rank.label : "", d.online]);
      if (k !== sig) { sig = k; draw(d); } else badges();
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(sync); };
    new MutationObserver(queue).observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true, childList: true });
    setInterval(sync, 500);
    sync();
  }

  if (window.GXArt) boot();
  else {
    const s = document.createElement("script");
    s.src = "greyx-icons.js";
    s.onload = boot;
    s.onerror = () => console.warn("greyx-icons.js no se encontró");
    document.head.appendChild(s);
  }
})();
