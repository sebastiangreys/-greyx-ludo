/* GREYX LUDO — Recursos gráficos reutilizables  (window.GXArt)
   Cárgalo ANTES de greyx-menu-v2.js:  <script src="greyx-icons.js"></script>
   (si no lo cargas, greyx-menu-v2.js lo carga solo).
   Todo es SVG propio: sin emojis, sin librerías.
   Uso en cualquier pantalla:
     GXArt.icon.trophy        -> string SVG (usa degradados compartidos ga-*)
     GXArt.modeBg.local       -> fondo decorativo de tarjeta
     GXArt.pageBg()           -> url("data:...") con el patrón del fondo general
*/
(() => {
  "use strict";
  if (window.GXArt) return;

  const enc = s => 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';
  const sv = (vb, inner) =>
    `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`;

  /* ---------- Degradados compartidos (se inyectan una sola vez) ---------- */
  const GRADS = {
    gold:   ["#fff0a8", "#ffd23f", "#d98a00"],
    blue:   ["#8fe0ff", "#3b9bff", "#2358e0"],
    violet: ["#efe6ff", "#c4b5fd", "#8b5cf6"],
    green:  ["#9af5b8", "#34d36f", "#12853f"],
    pink:   ["#ffa0c8", "#f0529c", "#b8267a"],
    orange: ["#ffd08a", "#ff9a3d", "#e0561a"],
    teal:   ["#8cf5e6", "#2dd4bf", "#0d8f84"],
    silver: ["#ffffff", "#d9dcea", "#9aa0b8"],
    purple: ["#b79dff", "#7c4dff", "#3d1fb0"],
    gem:    ["#d4f6ff", "#8fb8ff", "#7c5cff"]
  };
  const grad = (id, st) =>
    `<linearGradient id="ga-${id}" x1="0" y1="0" x2="0" y2="1">${st.map((c, i) =>
      `<stop offset="${i / (st.length - 1)}" stop-color="${c}"/>`).join("")}</linearGradient>`;

  function defs() {
    if (document.getElementById("gaDefs") || !document.body) return;
    document.body.insertAdjacentHTML("beforeend",
      `<svg id="gaDefs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${
        Object.keys(GRADS).map(k => grad(k, GRADS[k])).join("")}</defs></svg>`);
  }

  /* ---------- Iconos ---------- */
  const people = sv("0 0 48 48",
    `<circle cx="19" cy="15" r="7" fill="url(#ga-blue)"/><circle cx="34" cy="18" r="5.5" fill="url(#ga-blue)" opacity=".85"/>
     <path d="M5 40c1.2-8 6.5-12 14-12s12.8 4 14 12z" fill="url(#ga-blue)"/>
     <path d="M31 29c1.2-.4 2.4-.6 3.6-.6 5.2 0 8.6 3.2 9.4 10.6H36c-.4-4-2.2-7.4-5-10z" fill="url(#ga-blue)" opacity=".85"/>`);

  const trophy = sv("0 0 24 24",
    `<path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="url(#ga-gold)"/>
     <path d="M7 5H4v1.6A3.6 3.6 0 0 0 7.6 10.2M17 5h3v1.6a3.6 3.6 0 0 1-3.6 3.6" fill="none" stroke="#e0a82a" stroke-width="1.7"/>
     <rect x="10.7" y="13" width="2.6" height="4" fill="#e0a82a"/><rect x="7.5" y="17" width="9" height="3" rx="1.2" fill="url(#ga-gold)"/>`);

  const crown = sv("0 0 24 24",
    `<path d="M3 18l1.5-10 4.5 4.5L12 5l3 7.5L19.5 8 21 18z" fill="url(#ga-gold)" stroke="#8a5a00" stroke-width="1" stroke-linejoin="round"/>
     <rect x="3.5" y="18.6" width="17" height="2.4" rx="1" fill="url(#ga-gold)" stroke="#8a5a00" stroke-width=".8"/>`);

  const icon = {
    people, trophy, crown,
    bulb: sv("0 0 24 24",
      `<path d="M12 2a6.6 6.6 0 0 0-4 11.8c.6.5 1 1.2 1 2V17h6v-1.2c0-.8.4-1.5 1-2A6.6 6.6 0 0 0 12 2z" fill="url(#ga-gold)"/>
       <path d="M9.5 9.5c.3-1.5 1.4-2.5 2.8-2.7" stroke="#fff" stroke-opacity=".85" stroke-width="1.4" stroke-linecap="round" fill="none"/>
       <path d="M10.5 17v-3l1.5 1.2 1.5-1.2v3" stroke="#b97a00" stroke-width="1" fill="none" stroke-linejoin="round"/>
       <rect x="8.8" y="18" width="6.4" height="2" rx="1" fill="#c98a1a"/><rect x="9.8" y="20.5" width="4.4" height="1.8" rx=".9" fill="#a8690f"/>`),
    mail: sv("0 0 24 24",
      `<rect x="3" y="5" width="18" height="14" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.9"/>
       <path d="M4.5 7.5 12 13l7.5-5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`),
    gear: sv("0 0 24 24",
      `<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/>
       <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></g>`),
    coin: sv("0 0 40 40",
      `<circle cx="20" cy="20" r="18" fill="url(#ga-gold)" stroke="#b97a00" stroke-width="1.6"/>
       <circle cx="20" cy="20" r="13.5" fill="none" stroke="#fff6c0" stroke-opacity=".7" stroke-width="1.2"/>
       <polygon points="20,9.5 23,16.3 30.4,17 24.8,21.8 26.5,29 20,25.2 13.5,29 15.2,21.8 9.6,17 17,16.3" fill="#fff6c0" stroke="#d99a00" stroke-width=".9" stroke-linejoin="round"/>`),
    gem: sv("0 0 40 40",
      `<path d="M10 6h20l8 10-18 20L2 16z" fill="url(#ga-gem)" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" stroke-linejoin="round"/>
       <path d="M2 16h36M14 16l6 20 6-20M10 6l4 10 6-10 6 10 4-10" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" stroke-linejoin="round"/>`),
    robot: sv("0 0 48 48",
      `<rect x="22.5" y="5" width="3" height="8" rx="1.5" fill="url(#ga-violet)"/><circle cx="24" cy="5" r="3.2" fill="url(#ga-violet)"/>
       <rect x="7" y="22" width="5" height="11" rx="2.5" fill="url(#ga-violet)"/><rect x="36" y="22" width="5" height="11" rx="2.5" fill="url(#ga-violet)"/>
       <rect x="11" y="12" width="26" height="24" rx="9" fill="url(#ga-violet)"/>
       <circle cx="19" cy="24" r="3.4" fill="#2a1070"/><circle cx="29" cy="24" r="3.4" fill="#2a1070"/>
       <path d="M19 31h10" stroke="#2a1070" stroke-width="2" stroke-linecap="round"/>`),
    globe: sv("0 0 48 48",
      `<g fill="none" stroke="#4fb3ff" stroke-width="2.8" stroke-linecap="round"><circle cx="24" cy="24" r="18"/>
       <path d="M6 24h36M24 6c5 5.6 7.6 11.6 7.6 18S29 36.4 24 42c-5-5.6-7.6-11.6-7.6-18S19 11.6 24 6z"/></g>`),
    shield: sv("0 0 64 72",
      `<path d="M32 2L60 13V38C60 54 48 65 32 70C16 65 4 54 4 38V13Z" fill="url(#ga-purple)" stroke="#fbbf24" stroke-width="3" stroke-linejoin="round"/>
       <path d="M32 16L44 36L32 56L20 36Z" fill="#fff" opacity=".28"/>
       <path d="M32 16L44 36L32 56L20 36Z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>`),
    swords: sv("0 0 24 24",
      `<path d="M5 4l12.5 12.5M19 4L6.5 16.5" stroke="#d5dbf0" stroke-width="2.2" stroke-linecap="round"/>
       <path d="M15.5 14.5l4 4M8.5 14.5l-4 4" stroke="#e0a82a" stroke-width="2.6" stroke-linecap="round"/>`),
    star: sv("0 0 24 24",
      `<polygon points="12,2.5 14.9,8.7 21.5,9.4 16.6,13.9 18,20.5 12,17.1 6,20.5 7.4,13.9 2.5,9.4 9.1,8.7" fill="url(#ga-green)" stroke="#0d6b32" stroke-width=".8" stroke-linejoin="round"/>`),
    target: sv("0 0 24 24",
      `<g fill="none" stroke="#f0529c" stroke-width="2.1"><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4.2"/></g><circle cx="11" cy="13" r="1.4" fill="#f0529c"/>
       <path d="M11 13l9-9M17 3.5V7h3.5" stroke="#d5dbf0" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    calendar: sv("0 0 24 24",
      `<rect x="3.5" y="5" width="17" height="16" rx="3.5" fill="url(#ga-gold)"/><path d="M8 3v4M16 3v4" stroke="#b97a00" stroke-width="2" stroke-linecap="round"/>
       <g fill="#6b4300"><circle cx="8.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="15.5" cy="12" r="1.2"/><circle cx="8.5" cy="16" r="1.2"/><circle cx="12" cy="16" r="1.2"/></g>`),
    chest: sv("0 0 100 76",
      `<ellipse cx="50" cy="70" rx="42" ry="5" fill="#000" opacity=".4"/>
       <path d="M8 36C8 18 26 8 50 8s42 10 42 28z" fill="url(#ga-purple)" stroke="#e0a82a" stroke-width="3" stroke-linejoin="round"/>
       <rect x="8" y="36" width="84" height="32" rx="5" fill="url(#ga-purple)" stroke="#e0a82a" stroke-width="3"/>
       <rect x="24" y="13" width="9" height="55" fill="url(#ga-gold)"/><rect x="67" y="13" width="9" height="55" fill="url(#ga-gold)"/>
       <rect x="8" y="33" width="84" height="6" fill="url(#ga-gold)"/>
       <circle cx="50" cy="40" r="11" fill="#1b0f4d" stroke="#ffd23f" stroke-width="3"/>
       <text x="50" y="44" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="10" fill="#ffd23f">GX</text>
       <path d="M90 12l1.6 4 4 1.6-4 1.6L90 23l-1.6-3.8-4-1.6 4-1.6z" fill="#ffe27a"/>
       <path d="M8 20l1.2 3 3 1.2-3 1.2L8 28.4l-1.2-3-3-1.2 3-1.2z" fill="#ffe27a" opacity=".85"/>`),
    logo: sv("40 10 630 540",
      `<g transform="translate(400,22)"><path d="M0 74L10 14L42 44L62 0L82 44L114 14L124 74Z" fill="url(#ga-gold)" stroke="#8a5a00" stroke-width="4" stroke-linejoin="round"/>
       <circle cx="10" cy="12" r="8" fill="#ffe27a"/><circle cx="62" cy="-2" r="8" fill="#ffe27a"/><circle cx="114" cy="12" r="8" fill="#ffe27a"/></g>
       <path fill="url(#ga-silver)" d="M555 110H245C130 110 60 200 60 310C60 420 120 500 210 526L285 455C230 450 150 400 150 310C150 240 190 195 260 195H475Z"/>
       <path fill="url(#ga-silver)" d="M255 295H440L385 365H275L237 318Z"/>
       <path fill="url(#ga-purple)" stroke="#2a1580" stroke-width="5" d="M505 295H645L525 415L652 535H530L465 470L405 535H280Z"/>`)
  };

  /* Accesos secundarios (cuadrícula de 6) */
  const tile = {
    friends: people,
    rank: trophy,
    missions: sv("0 0 32 32",
      `<rect x="6" y="5" width="20" height="23" rx="4" fill="#0f2a6b" stroke="#4fb3ff" stroke-width="2"/><rect x="11" y="3" width="10" height="5" rx="2" fill="#4fb3ff"/>
       <path d="M11 17l4 4 7-8" stroke="#4fe0ff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    shop: sv("0 0 32 32",
      `<path d="M4 12l3-7h18l3 7z" fill="url(#ga-gold)"/><path d="M4 12h24v2.5a4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0z" fill="url(#ga-orange)"/>
       <rect x="6" y="15" width="20" height="13" rx="2" fill="url(#ga-orange)"/><rect x="12.5" y="19" width="7" height="9" rx="1" fill="#7a3b10"/>`),
    inventory: sv("0 0 32 32",
      `<path d="M12 9V7a4 4 0 0 1 8 0v2" stroke="#2dd4bf" stroke-width="2.4" fill="none"/>
       <rect x="7" y="8" width="18" height="20" rx="7" fill="url(#ga-teal)"/><rect x="11" y="17" width="10" height="7" rx="3" fill="#0b5d57"/>`),
    events: sv("0 0 32 32",
      `<rect x="5" y="7" width="22" height="20" rx="4" fill="#3a0f4d" stroke="#e879f9" stroke-width="2"/><path d="M11 4v5M21 4v5" stroke="#e879f9" stroke-width="2.4" stroke-linecap="round"/>
       <polygon points="16,12.5 17.9,16.3 22,16.9 19,19.8 19.7,23.9 16,22 12.3,23.9 13,19.8 10,16.9 14.1,16.3" fill="#f0abfc"/>`)
  };

  /* Barra inferior (usa currentColor para marcar el activo) */
  const nav = {
    home: sv("0 0 24 24", `<path d="M12 3L2.8 11.2h2.7V20h5v-5.6h3V20h5v-8.8h2.7z" fill="currentColor"/>`),
    friends: sv("0 0 24 24",
      `<circle cx="9" cy="8" r="3.4" fill="currentColor"/><circle cx="16.5" cy="9" r="2.8" fill="currentColor" opacity=".85"/>
       <path d="M3 19c.7-3.6 3-5.5 6-5.5s5.3 1.9 6 5.5z" fill="currentColor"/>
       <path d="M14.5 14.2c.7-.3 1.3-.4 2-.4 2.4 0 4.2 1.5 4.8 4.2h-5.4c-.2-1.5-.6-2.8-1.4-3.8z" fill="currentColor" opacity=".85"/>`),
    rank: sv("0 0 24 24",
      `<path d="M7 3h10v4.5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H4v1.6A3.6 3.6 0 0 0 7.6 10.2M17 5h3v1.6a3.6 3.6 0 0 1-3.6 3.6" fill="none" stroke="currentColor" stroke-width="1.7"/>
       <rect x="10.7" y="12.5" width="2.6" height="4" fill="currentColor"/><rect x="7.5" y="16.5" width="9" height="3" rx="1.2" fill="currentColor"/>`),
    profile: sv("0 0 24 24", `<circle cx="12" cy="8" r="4.2" fill="currentColor"/><path d="M4 20.5c.8-4 3.7-6.2 8-6.2s7.2 2.2 8 6.2z" fill="currentColor"/>`)
  };

  /* ---------- Fondos decorativos de las tarjetas de modo ---------- */
  const dice = (x, y, r, s = 26) => `<g transform="rotate(${r} ${x + s / 2} ${y + s / 2})"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * .24}" fill="none" stroke-width="2"/>
    <circle cx="${x + s * .3}" cy="${y + s * .3}" r="2" stroke="none"/><circle cx="${x + s * .7}" cy="${y + s * .7}" r="2" stroke="none"/><circle cx="${x + s * .5}" cy="${y + s * .5}" r="2" stroke="none"/></g>`;
  const spark = (x, y, s = 4) => `<path d="M${x} ${y - s}l${s * .3} ${s * .7} ${s * .7} ${s * .3}-${s * .7} ${s * .3}-${s * .3} ${s * .7}-${s * .3}-${s * .7}-${s * .7}-${s * .3} ${s * .7}-${s * .3}z" stroke="none"/>`;
  const bg = inner => `<svg viewBox="0 0 120 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

  const modeBg = {
    local: bg(`<defs><radialGradient id="mbl" cx=".5" cy=".28" r=".6"><stop offset="0" stop-color="#4f9bff" stop-opacity=".55"/><stop offset="1" stop-color="#4f9bff" stop-opacity="0"/></radialGradient></defs>
      <rect width="120" height="160" fill="url(#mbl)"/>
      <g stroke="#7fb8ff" fill="#7fb8ff" opacity=".28">${dice(6, 104, -18)}${dice(88, 12, 16, 22)}${dice(84, 112, 12, 20)}${spark(20, 40)}${spark(100, 70, 3)}</g>
      <g fill="#fff" opacity=".35"><circle cx="14" cy="76" r="1.4"/><circle cx="108" cy="46" r="1.2"/><circle cx="60" cy="150" r="1.4"/></g>`),
    ai: bg(`<defs><radialGradient id="mba" cx=".5" cy=".28" r=".6"><stop offset="0" stop-color="#a78bfa" stop-opacity=".55"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></radialGradient></defs>
      <rect width="120" height="160" fill="url(#mba)"/>
      <g stroke="#b79dff" fill="none" stroke-width="1.6" opacity=".4"><path d="M0 120h28l10-10h26M120 96H92l-9 9H66M0 62h14l8-8M120 30h-18l-7 7"/>
      <rect x="86" y="112" width="26" height="22" rx="5"/><rect x="8" y="126" width="20" height="18" rx="4"/><path d="M96 4l9 5v10l-9 5-9-5V9z"/></g>
      <g fill="#c4b5fd" opacity=".45"><circle cx="38" cy="110" r="2.4"/><circle cx="64" cy="110" r="2.4"/><circle cx="14" cy="54" r="2.2"/><circle cx="102" cy="37" r="2.2"/><circle cx="66" cy="105" r="2.2"/></g>
      <text x="99" y="127" text-anchor="middle" font-family="Inter,Arial" font-weight="900" font-size="11" fill="#c4b5fd" opacity=".5">AI</text>
      <g fill="#c4b5fd" opacity=".4">${spark(24, 28)}${spark(100, 78, 3)}</g>`),
    online: bg(`<defs><radialGradient id="mbo" cx=".5" cy=".28" r=".62"><stop offset="0" stop-color="#38bdf8" stop-opacity=".6"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient></defs>
      <rect width="120" height="160" fill="url(#mbo)"/>
      <g fill="none" stroke="#5ccbff" stroke-width="1.4" opacity=".34"><circle cx="60" cy="46" r="40"/><circle cx="60" cy="46" r="56"/><path d="M0 138Q60 108 120 138M0 150Q60 122 120 150"/></g>
      <g stroke="#7fd3ff" fill="#7fd3ff" opacity=".3">${dice(88, 108, 14, 20)}${dice(8, 100, -14, 20)}${spark(18, 36)}${spark(104, 28)}${spark(98, 80, 3)}</g>
      <g fill="#fff" opacity=".4"><circle cx="30" cy="20" r="1.3"/><circle cx="110" cy="64" r="1.3"/><circle cx="12" cy="76" r="1.2"/><circle cx="70" cy="150" r="1.3"/></g>`)
  };

  /* ---------- Patrón del fondo general (dados, coronas, estrellas muy tenues) ---------- */
  function pageBg() {
    return enc(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" fill="none" stroke="#8b8fe8" stroke-opacity=".11" stroke-width="1.6" stroke-linejoin="round">
      <rect x="14" y="18" width="26" height="26" rx="6" transform="rotate(-14 27 31)"/><circle cx="23" cy="27" r="1.8" fill="#8b8fe8" fill-opacity=".11" stroke="none"/><circle cx="31" cy="35" r="1.8" fill="#8b8fe8" fill-opacity=".11" stroke="none"/>
      <path d="M100 100l2-13 6 6 5-10 5 10 6-6 2 13z"/><path d="M122 26l2.6 6 6 .6-4.6 4 1.4 6-5.4-3.2-5.4 3.2 1.4-6-4.6-4 6-.6z"/>
      <rect x="40" y="108" width="20" height="20" rx="5" transform="rotate(18 50 118)"/><circle cx="84" cy="34" r="2" fill="#8b8fe8" fill-opacity=".11" stroke="none"/><circle cx="148" cy="140" r="2" fill="#8b8fe8" fill-opacity=".11" stroke="none"/></svg>`);
  }

  defs();
  window.GXArt = { defs, icon, tile, nav, modeBg, pageBg, enc };
})();
