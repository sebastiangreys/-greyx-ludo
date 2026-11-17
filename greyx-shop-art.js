/* GREYX LUDO — ARTE DE LA TIENDA (todo dibujado en SVG, cada producto tiene su propio dibujo)
   GXShopArt.product(id)        -> SVG grande del producto (200x200)
   GXShopArt.pawn(skin,color)   -> SVG de ficha (100x100) para usar dentro del juego
   GXShopArt.boardPattern(skin) -> SVG de fondo del tablero para el juego
   GXShopArt.gift(n)            -> caja de regalo (recompensa diaria) */
(function (g) {
  "use strict";
  const f = n => Math.round(n * 100) / 100;
  const stops = s => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ""}/>`).join("");
  const lin = (id, s, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`;
  const rad = (id, s, cx = .5, cy = .5, r = .5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(s)}</radialGradient>`;
  const svg = (vb, inner) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`;
  const rnd = seed => { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const star = (x, y, r, fill, op = 1) => `<path d="M${x} ${y - r}L${f(x + r * .28)} ${f(y - r * .28)}L${x + r} ${y}L${f(x + r * .28)} ${f(y + r * .28)}L${x} ${y + r}L${f(x - r * .28)} ${f(y + r * .28)}L${x - r} ${y}L${f(x - r * .28)} ${f(y - r * .28)}Z" fill="${fill}" opacity="${op}"/>`;
  function sparks(seed, n, colors, rmin, rmax, a = [14, 14, 186, 186]) {
    const r = rnd(seed); let s = "";
    for (let i = 0; i < n; i++) s += star(f(a[0] + r() * (a[2] - a[0])), f(a[1] + r() * (a[3] - a[1])), f(rmin + r() * (rmax - rmin)), colors[i % colors.length], f(.5 + r() * .5));
    return s;
  }
  const frame = (id, c1, c2) => `<defs>${rad(id + "bg", [[0, c1], [1, c2]], .5, .45, .75)}</defs><rect width="200" height="200" rx="22" fill="url(#${id}bg)"/>`;

  /* ================= DADOS (cubo isométrico) ================= */
  const PIPS = { 2: [[.27, .27], [.73, .73]], 3: [[.27, .27], [.5, .5], [.73, .73]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]],
    5: [[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6: [[.28, .24], [.72, .24], [.28, .5], [.72, .5], [.28, .76], [.72, .76]] };
  const FACE = { top: { o: [100, 26], u: [64, 37], v: [-64, 37] }, left: { o: [36, 63], u: [64, 37], v: [0, 74] }, right: { o: [100, 100], u: [64, -37], v: [0, 74] } };
  const mat = F => `matrix(${F.u[0]} ${F.u[1]} ${F.v[0]} ${F.v[1]} ${F.o[0]} ${F.o[1]})`;
  const base = (id, k, extra = "") => `<rect x=".02" y=".02" width=".96" height=".96" rx=".12" fill="url(#${id}${k[0]})"/>${extra}`;
  const CRACKS = {
    top: ["M.05 .3L.28 .42L.4 .3L.62 .5L.8 .38L.95 .55", "M.5 .95L.55 .7L.7 .62L.66 .45"],
    left: ["M.1 .1L.3 .35L.25 .55L.5 .62L.6 .85L.9 .9", "M.95 .2L.75 .3L.7 .5"],
    right: ["M.05 .7L.3 .6L.45 .72L.7 .5L.95 .6", "M.5 .05L.45 .3L.3 .38"]
  };
  const DICE = {
    dice_gold: {
      defs: id => lin(id + "t", [[0, "#fff7c2"], [1, "#f2c230"]], 0, 0, 1, 1) + lin(id + "l", [[0, "#f0b92a"], [1, "#9a6208"]], 0, 0, 1, 1) + lin(id + "r", [[0, "#d79a18"], [1, "#6e4204"]], 0, 0, 1, 1),
      bg: ["#5b3bd0", "#120a3a"], edge: "#fff3b0",
      face: (id, k) => base(id, k, `<rect x=".09" y=".09" width=".82" height=".82" rx=".08" fill="none" stroke="#fff6c8" stroke-opacity=".8" stroke-width=".024"/><rect x=".14" y=".14" width=".72" height=".72" rx=".06" fill="none" stroke="#7a4d06" stroke-opacity=".4" stroke-width=".012"/>`),
      pip: (x, y) => `<circle cx="${x}" cy="${y}" r=".105" fill="#12100a" stroke="#fff3b0" stroke-width=".018"/><ellipse cx="${x - .03}" cy="${y - .04}" rx=".04" ry=".024" fill="#fff" opacity=".4"/>`,
      fx: () => sparks(7, 12, ["#fff7c2", "#fff"], 2, 5.5, [28, 18, 176, 172])
    },
    dice_crystal: {
      defs: id => lin(id + "t", [[0, "#f3e8ff", .95], [1, "#b58bff", .9]], 0, 0, 1, 1) + lin(id + "l", [[0, "#c9a2ff", .92], [1, "#6d28d9", .9]], 0, 0, 1, 1) + lin(id + "r", [[0, "#9d6cf0", .92], [1, "#4c1d95", .92]], 0, 0, 1, 1) + rad(id + "g", [[0, "#fff"], [.45, "#f5eaff", .9], [1, "#c4b5fd", 0]]),
      bg: ["#3b1a8a", "#0d0626"], edge: "#e9d5ff",
      face: (id, k) => base(id, k, `<rect x=".12" y=".12" width=".76" height=".76" rx=".08" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".5" stroke-width=".016"/><path d="M.1 .9L.9 .1" stroke="#fff" stroke-opacity=".28" stroke-width=".03"/><path d="M.3 .95L.95 .3" stroke="#fff" stroke-opacity=".14" stroke-width=".02"/>`),
      pip: (x, y, id) => `<circle cx="${x}" cy="${y}" r=".19" fill="url(#${id}g)"/><circle cx="${x}" cy="${y}" r=".085" fill="#fff"/>`,
      fx: () => sparks(11, 12, ["#e9d5ff", "#fff", "#c4b5fd"], 2, 6, [24, 14, 180, 176])
    },
    dice_obsidian: {
      defs: id => lin(id + "t", [[0, "#3a3a46"], [1, "#15151c"]], 0, 0, 1, 1) + lin(id + "l", [[0, "#26262f"], [1, "#0a0a0f"]], 0, 0, 1, 1) + lin(id + "r", [[0, "#18181f"], [1, "#050507"]], 0, 0, 1, 1),
      bg: ["#4a1210", "#0b0507"], edge: "#4a1a14",
      face: (id, k) => base(id, k, `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${CRACKS[k].map(d => `<path d="${d}" stroke="#ff4a2e" stroke-opacity=".28" stroke-width=".07"/><path d="${d}" stroke="#ff7a45" stroke-width=".022"/>`).join("")}</g>`),
      pip: (x, y) => `<circle cx="${x}" cy="${y}" r=".105" fill="#07070a" stroke="#ff7a45" stroke-width=".022"/><circle cx="${x}" cy="${y}" r=".04" fill="#ff5a36"/>`,
      fx: () => sparks(5, 10, ["#ff7a45", "#ffb089"], 1.5, 4, [30, 30, 172, 172])
    },
    dice_celestial: {
      defs: id => lin(id + "t", [[0, "#4a35b8"], [1, "#160b4a"]], 0, 0, 1, 1) + lin(id + "l", [[0, "#3a2a9a"], [1, "#12093f"]], 0, 0, 1, 1) + lin(id + "r", [[0, "#2a1c78"], [1, "#0a0630"]], 0, 0, 1, 1)
        + rad(id + "n1", [[0, "#ff6bd6", .6], [1, "#ff6bd6", 0]]) + rad(id + "n2", [[0, "#38bdf8", .6], [1, "#38bdf8", 0]]) + rad(id + "g", [[0, "#fff2b8"], [.5, "#ffe27a", .8], [1, "#ffb300", 0]])
        + `<clipPath id="${id}c"><rect x=".02" y=".02" width=".96" height=".96" rx=".12"/></clipPath>`,
      bg: ["#2a1470", "#070522"], edge: "#a78bfa",
      face: (id, k) => base(id, k, `<g clip-path="url(#${id}c)"><circle cx=".3" cy=".3" r=".5" fill="url(#${id}n1)"/><circle cx=".74" cy=".76" r=".55" fill="url(#${id}n2)"/></g><g fill="#fff"><circle cx=".12" cy=".6" r=".014"/><circle cx=".86" cy=".14" r=".016"/><circle cx=".6" cy=".9" r=".012"/><circle cx=".9" cy=".5" r=".012"/><circle cx=".16" cy=".9" r=".012"/></g><path d="M.1 .45L.25 .55L.4 .42L.5 .6" fill="none" stroke="#ffe27a" stroke-opacity=".7" stroke-width=".01"/>`),
      pip: (x, y, id) => `<circle cx="${x}" cy="${y}" r=".18" fill="url(#${id}g)"/><circle cx="${x}" cy="${y}" r=".08" fill="#fff7cf"/>`,
      fx: () => sparks(21, 16, ["#ffe27a", "#fff", "#ff9ee9", "#7dd3fc"], 2, 6, [14, 14, 186, 186])
    }
  };
  function diceSvg(key) {
    const S = DICE[key], id = "d" + key.slice(5, 8);
    let body = "";
    [["left", 5], ["right", 6], ["top", 4]].forEach(([k, n]) => {
      body += `<g transform="${mat(FACE[k])}">${S.face(id, k)}${PIPS[n].map(p => S.pip(p[0], p[1], id)).join("")}</g>`;
    });
    return svg("0 0 200 200", `<defs>${S.defs(id)}</defs>${frame(id, S.bg[0], S.bg[1])}
      <ellipse cx="100" cy="184" rx="52" ry="7" fill="#000" opacity=".35"/>
      <polygon points="100,26 164,63 164,137 100,174 36,137 36,63" fill="${S.edge}"/>${body}
      <path d="M36 63L100 26L164 63M100 100V174" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" stroke-linejoin="round"/>${S.fx()}`);
  }

  /* ================= FICHAS (peón) ================= */
  const P = {
    base: "M18 90Q18 80 50 80Q82 80 82 90Q82 97 50 97Q18 97 18 90Z",
    stem: "M33 82Q37 56 43 47H57Q63 56 67 82Z"
  };
  const accentBits = a => `<ellipse cx="50" cy="85" rx="27.5" ry="5.8" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="5"/><ellipse cx="50" cy="85" rx="27.5" ry="5.8" fill="none" stroke="${a}" stroke-width="3.4"/>`;
  const accentGem = a => `<circle cx="50" cy="48" r="3.6" fill="${a}" stroke="#fff" stroke-width="1"/>`;
  const shadowP = `<ellipse cx="50" cy="96" rx="31" ry="3.6" fill="#000" opacity=".3"/>`;
  const PAWN = {
    token_imperial: a => `<defs>${lin("ig", [[0, "#fff3b0"], [.5, "#f0b92a"], [1, "#8a5a00"]], 0, 0, 1, 0)}${rad("ih", [[0, "#fffbe0"], [.35, "#f0c23a"], [1, "#8a5a00"]], .35, .3, .8)}${lin("ip", [[0, "#c084fc"], [1, "#5b21b6"]])}</defs>${shadowP}
      <path d="${P.base}" fill="url(#ig)" stroke="#6b4608" stroke-width="1.2"/>${accentBits(a)}<path d="${P.stem}" fill="url(#ig)" stroke="#6b4608" stroke-width="1.2"/>
      <path d="M35 68Q50 73 65 68L66 75Q50 80 34 75Z" fill="url(#ip)" stroke="#3b1d8f" stroke-width=".8"/><ellipse cx="50" cy="47" rx="16" ry="5.5" fill="url(#ig)" stroke="#6b4608" stroke-width="1"/>
      <circle cx="50" cy="30" r="17" fill="url(#ih)" stroke="#6b4608" stroke-width="1.2"/>
      <path d="M36 24L38 10L45 18L50 7L55 18L62 10L64 24Z" fill="url(#ig)" stroke="#6b4608" stroke-width="1"/><circle cx="38" cy="10" r="2.4" fill="#a855f7"/><circle cx="50" cy="7" r="2.8" fill="#a855f7"/><circle cx="62" cy="10" r="2.4" fill="#a855f7"/>
      ${accentGem(a)}<ellipse cx="43" cy="30" rx="5" ry="3" fill="#fff" opacity=".55" transform="rotate(-30 43 30)"/>`,
    token_neon: a => `<defs>${rad("nh", [[0, "#1a2260"], [1, "#070a22"]], .4, .3, .8)}</defs>${shadowP}
      <path d="${P.base}" fill="#0a0f2e" stroke="#38bdf8" stroke-opacity=".3" stroke-width="5"/><path d="${P.base}" fill="#0a0f2e" stroke="#7dd3fc" stroke-width="1.6"/>${accentBits(a)}
      <path d="${P.stem}" fill="#0a0f2e" stroke="#a78bfa" stroke-opacity=".3" stroke-width="5"/><path d="${P.stem}" fill="#0a0f2e" stroke="#c4b5fd" stroke-width="1.6"/><path d="M50 52V78" stroke="#38bdf8" stroke-width="1.6"/>
      <ellipse cx="50" cy="47" rx="16" ry="5.5" fill="#0a0f2e" stroke="#7dd3fc" stroke-width="1.6"/>
      <circle cx="50" cy="30" r="17" fill="url(#nh)" stroke="#38bdf8" stroke-opacity=".3" stroke-width="5"/><circle cx="50" cy="30" r="17" fill="none" stroke="#7dd3fc" stroke-width="1.8"/><circle cx="50" cy="30" r="10" fill="none" stroke="#c4b5fd" stroke-width="1.4"/><circle cx="50" cy="30" r="3.4" fill="#fff"/>
      ${accentGem(a)}`,
    token_eclipse: a => `<defs>${lin("eg", [[0, "#4a4e5e"], [.45, "#14151c"], [1, "#050608"]], 0, 0, 1, 0)}<clipPath id="ec"><circle cx="50" cy="30" r="17"/></clipPath></defs>${shadowP}
      <path d="${P.base}" fill="url(#eg)" stroke="#cfd6e6" stroke-width="1.2"/>${accentBits(a)}<path d="${P.stem}" fill="url(#eg)" stroke="#cfd6e6" stroke-width="1.2"/><path d="M42 54L38 78" stroke="#e5e9f5" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="50" cy="47" rx="16" ry="5.5" fill="url(#eg)" stroke="#cfd6e6" stroke-width="1"/>
      <circle cx="50" cy="30" r="17" fill="#dfe4f0"/><g clip-path="url(#ec)"><circle cx="57" cy="30" r="15" fill="#07080c"/></g><circle cx="50" cy="30" r="17" fill="none" stroke="#9aa3b8" stroke-width="1"/>
      ${accentGem(a)}`,
    token_crystal: a => `${shadowP}<g stroke="#fff" stroke-opacity=".55" stroke-width=".8" stroke-linejoin="round">
      <polygon points="16,90 24,80 76,80 84,90 76,97 24,97" fill="#8b5cf6" fill-opacity=".92"/><polygon points="24,80 76,80 84,90 16,90" fill="#c4b5fd" fill-opacity=".9"/></g>${accentBits(a)}
      <g stroke="#fff" stroke-opacity=".55" stroke-width=".8" stroke-linejoin="round"><polygon points="34,82 40,52 50,52 50,82" fill="#8b5cf6" fill-opacity=".92"/><polygon points="50,52 60,52 66,82 50,82" fill="#5b21b6" fill-opacity=".92"/>
      <polygon points="50,11 66,21 66,39 50,49 34,39 34,21" fill="#7c4dff" fill-opacity=".9"/><polygon points="50,11 66,21 50,30" fill="#ddd0ff"/><polygon points="66,21 66,39 50,30" fill="#a78bfa"/><polygon points="66,39 50,49 50,30" fill="#6d3fe0"/><polygon points="50,49 34,39 50,30" fill="#7c4dff"/><polygon points="34,39 34,21 50,30" fill="#b79dff"/><polygon points="34,21 50,11 50,30" fill="#efe6ff"/></g>
      ${accentGem(a)}<ellipse cx="44" cy="22" rx="4" ry="2" fill="#fff" opacity=".7" transform="rotate(-30 44 22)"/>`
  };
  const pawnSvg = (skin, accent) => svg("0 0 100 100", (PAWN[skin] || PAWN.token_imperial)(accent || "#a78bfa"));
  const pawnInner = (skin, accent) => (PAWN[skin] || PAWN.token_imperial)(accent || "#a78bfa");

  function tokenArt(key) {
    const cols = ["#ef4444", "#22c55e", "#fbbf24", "#3b82f6"];
    const mini = cols.map((c, i) => `<g transform="translate(${22 + i * 40} 150) scale(.36)">${pawnInner(key, c)}</g>`).join("");
    const cfg = { token_imperial: ["#5b3bd0", "#150a40"], token_neon: ["#0f2a7a", "#050818"], token_eclipse: ["#2b2f45", "#07080f"], token_crystal: ["#3b1a8a", "#0d0626"] }[key];
    return svg("0 0 200 200", `${frame("t" + key.slice(6, 9), cfg[0], cfg[1])}<g transform="translate(40 4) scale(1.2)">${pawnInner(key, "#ef4444")}</g>${mini}
      ${sparks(13, 8, ["#fff", "#fde68a", "#c4b5fd"], 2, 5, [20, 14, 180, 130])}`);
  }

  /* ================= TABLEROS ================= */
  const HOME = { red: "#e53935", blue: "#2f6fe0", green: "#2fa84f", yellow: "#f5b301" };
  const TH = {
    board_imperial: { bgA: "#1d1a26", bgB: "#08070d", frame: ["#fff0b0", "#b9862a", "#6b4608"], track: "#2a2536", trackS: "#e6b449", star: "#fbbf24", yard: "#16131f", slot: "#2a2536", home: c => c, glow: "#fbbf24" },
    board_neon:     { bgA: "#0b1236", bgB: "#04061a", frame: ["#7dd3fc", "#6d28d9", "#38bdf8"], track: "#0b1236", trackS: "#38bdf8", star: "#c4b5fd", yard: "#070b24", slot: "#16226a", home: c => c, glow: "#38bdf8" },
    board_sakura:   { bgA: "#fff1f4", bgB: "#f8d4de", frame: ["#f5b8c8", "#b4536b", "#8a3a52"], track: "#fbe3ea", trackS: "#e6a0b4", star: "#e0527a", yard: "#fff7f9", slot: "#f6d6df", home: c => c, glow: "#f9a8d4" },
    board_galactic: { bgA: "#2a0b5e", bgB: "#05051c", frame: ["#e9d5ff", "#7c3aed", "#312e81"], track: "#241c5a", trackS: "#a78bfa", star: "#ffe27a", yard: "#120c36", slot: "#2a2072", home: c => c, glow: "#a78bfa" }
  };
  function boardInner(key, x0, y0, size, opt) {
    const T = TH[key], s = size / 15, o = opt || {};
    const R = (c, r, w, h, fill, st, sw, rx) => `<rect x="${f(x0 + c * s)}" y="${f(y0 + r * s)}" width="${f(w * s)}" height="${f(h * s)}" rx="${rx || 0}" fill="${fill}"${st ? ` stroke="${st}" stroke-width="${sw}"` : ""}/>`;
    let out = "";
    // casas
    [[0, 0, "red"], [9, 0, "blue"], [0, 9, "green"], [9, 9, "yellow"]].forEach(([c, r, k]) => {
      const col = T.home(HOME[k]);
      out += R(c, r, 6, 6, col, T.trackS, .6, f(s * .8));
      out += R(c + .9, r + .9, 4.2, 4.2, T.yard, "none", 0, f(s * .6));
      [[1.9, 1.9], [4.1, 1.9], [1.9, 4.1], [4.1, 4.1]].forEach(([dx, dy]) => { out += `<circle cx="${f(x0 + (c + dx) * s)}" cy="${f(y0 + (r + dy) * s)}" r="${f(s * .75)}" fill="${T.slot}" stroke="${col}" stroke-width=".8"/>`; });
    });
    // pista + pasillos
    for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
      const cross = (r >= 6 && r <= 8) || (c >= 6 && c <= 8), center = r >= 6 && r <= 8 && c >= 6 && c <= 8;
      if (!cross || center) continue;
      let fill = T.track;
      if (r === 7 && c >= 1 && c <= 5) fill = HOME.red; else if (c === 7 && r >= 1 && r <= 5) fill = HOME.blue;
      else if (r === 7 && c >= 9 && c <= 13) fill = HOME.yellow; else if (c === 7 && r >= 9 && r <= 13) fill = HOME.green;
      else if (r === 6 && c === 1) fill = HOME.red; else if (r === 1 && c === 8) fill = HOME.blue; else if (r === 8 && c === 13) fill = HOME.yellow; else if (r === 13 && c === 6) fill = HOME.green;
      out += R(c, r, 1, 1, fill, T.trackS, .35, f(s * .12));
    }
    // centro
    const cx = x0 + 7.5 * s, cy = y0 + 7.5 * s, a = 1.5 * s;
    [[HOME.blue, `${cx - a},${cy - a} ${cx + a},${cy - a} ${cx},${cy}`], [HOME.yellow, `${cx + a},${cy - a} ${cx + a},${cy + a} ${cx},${cy}`], [HOME.green, `${cx + a},${cy + a} ${cx - a},${cy + a} ${cx},${cy}`], [HOME.red, `${cx - a},${cy + a} ${cx - a},${cy - a} ${cx},${cy}`]]
      .forEach(([c, p]) => { out += `<polygon points="${p}" fill="${c}" stroke="#fff" stroke-opacity=".8" stroke-width=".6"/>`; });
    [[6, 2], [8, 6], [12, 8], [6, 12]].forEach(([c, r]) => { if (!o.noStars) out += star(f(x0 + (c + .5) * s), f(y0 + (r + .5) * s), f(s * .42), T.star); });
    return out;
  }
  function boardDecor(key) {
    if (key === "board_imperial") return `<g fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1"><path d="M14 40C60 50 90 20 130 60S190 80 200 110"/><path d="M0 120C50 100 80 150 130 130S180 170 200 160"/><path d="M40 0C50 40 30 70 70 100"/></g>${sparks(3, 8, ["#fbbf24", "#fff0b0"], 1.5, 3.5, [20, 20, 180, 180])}`;
    if (key === "board_neon") return `<g stroke="#38bdf8" stroke-opacity=".12" stroke-width=".6">${Array.from({ length: 10 }, (_, i) => `<path d="M${i * 22} 0V200M0 ${i * 22}H200"/>`).join("")}</g>`;
    if (key === "board_sakura") return `<path d="M0 30Q40 20 60 0" stroke="#8a3a52" stroke-width="3" fill="none" stroke-linecap="round"/>` + Array.from({ length: 16 }, (_, i) => { const r = rnd(i * 7 + 3); return `<ellipse cx="${f(r() * 200)}" cy="${f(r() * 200)}" rx="4" ry="2.2" fill="#f9a8c4" opacity=".8" transform="rotate(${f(r() * 180)} ${f(r() * 200)} ${f(r() * 200)})"/>`; }).join("");
    return sparks(9, 26, ["#fff", "#c4b5fd", "#ffe27a", "#7dd3fc"], 1, 3.2, [10, 10, 190, 190]);
  }
  function boardArt(key) {
    const T = TH[key], id = "b" + key.slice(6, 9);
    return svg("0 0 200 200", `<defs>${lin(id + "f", [[0, T.frame[0]], [.5, T.frame[1]], [1, T.frame[2]]], 0, 0, 1, 1)}${rad(id + "x", [[0, T.bgA], [1, T.bgB]], .5, .5, .8)}</defs>
      <rect x="6" y="6" width="188" height="188" rx="22" fill="url(#${id}f)"/><rect x="14" y="14" width="172" height="172" rx="14" fill="url(#${id}x)"/>
      <g opacity=".9">${boardDecor(key)}</g>${boardInner(key, 22, 22, 156)}`);
  }
  // fondo del tablero dentro del juego (se estira al .board)
  function boardPattern(key) {
    const T = TH[key];
    return svg("0 0 200 200", `<defs>${rad("bp", [[0, T.bgA], [1, T.bgB]], .5, .5, .8)}</defs><rect width="200" height="200" fill="url(#bp)"/>${boardDecor(key)}`);
  }

  /* ================= TARJETAS ================= */
  function cardArt(key) {
    const C = {
      card_rename: { c: ["#7dd3fc", "#0369a1"], bg: ["#0b3a5a", "#04101e"], top: "RENOMBRE", icon: `<rect x="62" y="62" width="76" height="48" rx="8" fill="#fff" fill-opacity=".92"/><circle cx="82" cy="80" r="9" fill="#0369a1"/><path d="M68 106c2-9 8-13 14-13s12 4 14 13z" fill="#0369a1"/><path d="M104 76h26M104 88h20" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/><path d="M118 120l20-20 8 8-20 20-10 2z" fill="#fbbf24" stroke="#92600a" stroke-width="2" stroke-linejoin="round"/>` },
      card_xp_double: { c: ["#e9d5ff", "#7c3aed"], bg: ["#3b1a8a", "#0d0626"], top: "XP DOBLE", icon: `<text x="100" y="112" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="58" fill="#fff" stroke="#6d28d9" stroke-width="3">2X</text>` + star(138, 64, 12, "#ffe27a") + star(62, 118, 8, "#ffe27a") },
      card_xp_extra: { c: ["#bbf7d0", "#16a34a"], bg: ["#0f4a2a", "#04120a"], top: "XP EXTRA", icon: `<text x="100" y="108" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="38" fill="#fff" stroke="#15803d" stroke-width="2.5">+50%</text><path d="M100 118l-14 14h28z" fill="#86efac"/>` + star(140, 66, 9, "#ffe27a") },
      card_pro: { c: ["#fff0b0", "#d97706"], bg: ["#5b21b6", "#150a40"], top: "PRO", icon: `<path d="M64 96l8-30 20 18 8-28 8 28 20-18 8 30z" fill="#ffd23f" stroke="#8a5a00" stroke-width="2.5" stroke-linejoin="round"/><rect x="64" y="98" width="72" height="8" rx="3" fill="#ffd23f" stroke="#8a5a00" stroke-width="2"/><text x="100" y="132" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="22" fill="#fff" letter-spacing="3">PRO</text>` + star(142, 60, 10, "#fff") + star(58, 70, 7, "#fff") }
    }[key];
    const id = "c" + key.slice(5, 8);
    return svg("0 0 200 200", `<defs>${rad(id + "bg", [[0, C.bg[0]], [1, C.bg[1]]], .5, .45, .75)}${lin(id + "f", [[0, C.c[0]], [1, C.c[1]]], 0, 0, 1, 1)}${lin(id + "h", [[0, "#fff", .5], [.5, "#fff", 0], [1, "#fff", .25]], 0, 0, 1, 1)}</defs>
      <rect width="200" height="200" rx="22" fill="url(#${id}bg)"/><g transform="rotate(-5 100 100)"><rect x="40" y="22" width="120" height="156" rx="14" fill="url(#${id}f)"/>
      <rect x="47" y="29" width="106" height="142" rx="10" fill="#0b0e2a" fill-opacity=".9"/><text x="100" y="50" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="11" fill="${C.c[0]}" letter-spacing="2.5">${C.top}</text>
      <path d="M62 56h76" stroke="${C.c[0]}" stroke-opacity=".5"/>${C.icon}<text x="100" y="164" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="8" fill="#aab3d6" letter-spacing="2">GREYX LUDO</text>
      <rect x="40" y="22" width="120" height="156" rx="14" fill="url(#${id}h)"/></g>${sparks(31, 7, ["#fff", "#ffe27a"], 2, 5, [14, 14, 186, 186])}`);
  }

  /* ================= REGALOS (recompensa diaria) ================= */
  const GIFTS = [["#a855f7", "#fbbf24"], ["#22c55e", "#38bdf8"], ["#f59e0b", "#fde68a"], ["#38bdf8", "#f97316"], ["#ef4444", "#22c55e"], ["#7c3aed", "#fff"], ["#f43f5e", "#fbbf24"]];
  function gift(n) {
    const [b, r] = GIFTS[(n - 1) % 7], id = "gf" + n;
    return svg("0 0 64 64", `<defs>${lin(id, [[0, b], [1, "#000"]], 0, 0, 0, 1.6)}</defs><ellipse cx="32" cy="58" rx="22" ry="3" fill="#000" opacity=".3"/>
      <rect x="10" y="26" width="44" height="30" rx="4" fill="${b}"/><rect x="10" y="26" width="44" height="30" rx="4" fill="url(#${id})" opacity=".35"/>
      <rect x="6" y="18" width="52" height="12" rx="4" fill="${b}"/><rect x="6" y="18" width="52" height="12" rx="4" fill="#fff" opacity=".18"/>
      <rect x="28" y="18" width="8" height="38" fill="${r}"/><path d="M32 18C22 6 12 12 20 18M32 18C42 6 52 12 44 18" fill="none" stroke="${r}" stroke-width="4.5" stroke-linecap="round"/><circle cx="32" cy="18" r="4" fill="${r}"/>`);
  }

  const PRODUCT_ART = {};
  Object.keys(DICE).forEach(k => { PRODUCT_ART[k] = () => diceSvg(k); });
  Object.keys(PAWN).forEach(k => { PRODUCT_ART[k] = () => tokenArt(k); });
  Object.keys(TH).forEach(k => { PRODUCT_ART[k] = () => boardArt(k); });
  ["card_rename", "card_xp_double", "card_xp_extra", "card_pro"].forEach(k => { PRODUCT_ART[k] = () => cardArt(k); });
  const cache = {};
  g.GXShopArt = {
    product: id => (cache[id] = cache[id] || (PRODUCT_ART[id] ? PRODUCT_ART[id]() : "")),
    pawn: pawnSvg, boardPattern, gift,
    hasBoard: k => !!TH[k], hasToken: k => !!PAWN[k]
  };
})(typeof window !== "undefined" ? window : globalThis);
