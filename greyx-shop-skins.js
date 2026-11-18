/* GREYX LUDO — APARIENCIAS EQUIPADAS (dado, ficha, tablero)
   Solo cambia el ASPECTO con CSS. No toca reglas, casillas, tamaños ni el generador de números del dado.
   GXSkins.apply({dice:"dice_gold"|null, token:"token_neon"|null, board:"board_sakura"|null}) */
(function (g) {
  "use strict";
  const COL = { red: "#ef4444", green: "#22c55e", yellow: "#fbbf24", blue: "#3b82f6" };
  const uri = s => 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';
  let el = null, lastKey = "";

  /* ---------- DADOS ---------- */
  const DICE = {
    dice_gold: `.die{background:linear-gradient(145deg,#fff7c2,#f0b92a 45%,#8a5a00);border:2px solid #fff3b0;box-shadow:0 0 0 2px #b9801a,0 0 22px #fbbf2488,0 12px 24px #0008,inset 0 2px 4px #fff9,inset 0 -6px 8px #7a4d0066}
      .pip{background:radial-gradient(circle at 35% 30%,#4b3a1a,#0d0a05)}.die.rolling{filter:drop-shadow(0 0 10px #fbbf24)}`,
    dice_crystal: `.die{background:linear-gradient(145deg,#f3e8ffdd,#a78bfaaa 50%,#4c1d95dd);border:2px solid #f3e8ffaa;box-shadow:0 0 26px #a855f799,0 12px 24px #0008,inset 0 0 18px #ffffff66}
      .pip{background:radial-gradient(circle,#fff,#ede9fe 60%,#c4b5fd);box-shadow:0 0 10px #e9d5ff,0 0 18px #a78bfa}.die.rolling{filter:drop-shadow(0 0 12px #c084fc)}`,
    dice_obsidian: `.die{background:linear-gradient(112deg,transparent 46%,#ff5a3655 47%,#ff7a45 48%,transparent 49.2%),linear-gradient(62deg,transparent 62%,#ff5a3644 63%,transparent 65%),linear-gradient(145deg,#2c2c36,#0c0c12);border:2px solid #3a3a46;box-shadow:0 0 22px #ff3b1e55,0 12px 24px #0008,inset 0 0 12px #000a}
      .pip{background:radial-gradient(circle at 40% 35%,#ff9a6a,#c42b12 60%,#3a0a04);box-shadow:0 0 8px #ff5a36aa}.die.rolling{filter:drop-shadow(0 0 10px #ff4a2e)}`,
    dice_celestial: `.die{background:radial-gradient(1.5px 1.5px at 22% 72%,#fff,transparent),radial-gradient(1.5px 1.5px at 78% 22%,#fff,transparent),radial-gradient(1px 1px at 60% 88%,#fff,transparent),radial-gradient(circle at 25% 20%,#ff6bd677,transparent 42%),radial-gradient(circle at 75% 82%,#38bdf877,transparent 46%),linear-gradient(145deg,#33218c,#0b0a3a);border:2px solid #a78bfaaa;box-shadow:0 0 26px #7c3aed99,0 12px 24px #0008,inset 0 0 14px #ffffff22}
      .pip{background:radial-gradient(circle,#fff7cf,#ffe27a 55%,#ffb300);box-shadow:0 0 10px #ffe27a,0 0 18px #ffb30088}.die.rolling{filter:drop-shadow(0 0 12px #a78bfa)}`
  };

  /* ---------- TABLEROS ---------- */
  const slots = (a, b) => [[17.8, 17.8], [82.2, 17.8], [17.8, 82.2], [82.2, 82.2]]
    .map(([x, y]) => `radial-gradient(circle closest-side,${a} 0 82%,${b} 88%,transparent 92%) ${x}% ${y}%/34% 34% no-repeat`).join(",");
  const BOARD = {
    board_imperial: { fr: "linear-gradient(145deg,#fff0b0,#b9862a 40%,#6b4608 60%,#f2cf6b)", glow: "#fbbf2455", bg: "#14121c", edge: "#e6b449",
      cell: "linear-gradient(160deg,#2a2536,#14121c)", cs: "#e6b44977", star: "#fbbf24", yard: slots("#2a2536", "#e6b449") + ",linear-gradient(#1b1826,#100e17)" },
    board_neon: { fr: "linear-gradient(145deg,#7dd3fc,#6d28d9 50%,#38bdf8)", glow: "#38bdf877", bg: "#070b24", edge: "#38bdf8",
      cell: "linear-gradient(160deg,#101a52,#0a1032)", cs: "#38bdf8cc", star: "#c4b5fd", yard: slots("#16226a", "#38bdf8") + ",linear-gradient(#0a0f2e,#060a22)" },
    board_sakura: { fr: "linear-gradient(145deg,#f5b8c8,#b4536b 50%,#f2a9bd)", glow: "#f9a8d455", bg: "#fff1f4", edge: "#b4536b",
      cell: "linear-gradient(160deg,#fff4f7,#f6d6df)", cs: "#e6a0b4", star: "#e0527a", yard: slots("#f6d6df", "#e6a0b4") + ",linear-gradient(#fffafb,#fdecf1)" },
    board_galactic: { fr: "linear-gradient(145deg,#e9d5ff,#7c3aed 50%,#312e81)", glow: "#a78bfa66", bg: "#05051c", edge: "#a78bfa",
      cell: "linear-gradient(160deg,#2c2270cc,#161046cc)", cs: "#a78bfa99", star: "#ffe27a", yard: slots("#2a2072", "#a78bfa") + ",linear-gradient(#150f40,#0a0624)" }
  };

  function boardCss(id) {
    const B = BOARD[id], A = g.GXShopArt, s = `body[data-gx-board="${id}"]`;
    return `${s} .board-frame{background:${B.fr};box-shadow:0 34px 80px #000c,0 0 0 2px #1a1030,0 0 56px ${B.glow},inset 0 2px 2px #fff8}
      ${s} .board{background:${uri(A.boardPattern(id))} center/100% 100% no-repeat,${B.bg} !important;box-shadow:inset 0 0 0 3px ${B.edge},inset 0 0 40px #0006}
      ${s} .board .cell.track{background:${B.cell};border:1px solid ${B.cs} !important;box-shadow:inset 0 1px 0 #ffffff22 !important}
      ${s} .cell.safe::before{color:${B.star};text-shadow:0 0 10px ${B.star}aa}
      ${s} .board .yard{background:${B.yard}}`;
  }

  function tokenCss(id) {
    const A = g.GXShopArt, s = `body[data-gx-token="${id}"] .board .token`;
    return Object.keys(COL).map(c => `${s}.${c}{--pw:${uri(A.pawn(id, COL[c]))}}`).join("");
  }

  function apply(eq) {
    eq = eq || {};
    const d = DICE[eq.dice] ? eq.dice : null, t = g.GXShopArt && g.GXShopArt.hasToken(eq.token) ? eq.token : null, b = BOARD[eq.board] ? eq.board : null;
    const key = [d, t, b].join("|");
    const bd = document.body;
    ["dice", "token", "board"].forEach((k, i) => { const v = [d, t, b][i]; if (v) bd.setAttribute("data-gx-" + k, v); else bd.removeAttribute("data-gx-" + k); });
    if (key === lastKey) return;
    lastKey = key;
    if (!el) { el = document.createElement("style"); el.id = "gx-skin-css"; document.head.appendChild(el); }
    el.textContent = (d ? DICE[d].split(".").filter(Boolean).length && ("body[data-gx-dice=\"" + d + "\"] " + DICE[d].replace(/\n\s*/g, " ").replace(/\}\s*\./g, "} body[data-gx-dice=\"" + d + "\"] .")) : "")
      + (t ? tokenCss(t) : "") + (b ? boardCss(b) : "");
  }

  g.GXSkins = { apply, ids: { dice: Object.keys(DICE), board: Object.keys(BOARD) } };
})(typeof window !== "undefined" ? window : globalThis);
