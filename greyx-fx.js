/* GREYX LUDO — FX: estilo, animaciones y sonidos (recompensa diaria + tienda)
   NO toca la lógica. Solo observa el DOM que ya crean greyx-daily.js y greyx-shop.js.
   Cargar como ÚLTIMO <script>:  <script src="greyx-fx.js"></script> */
(() => {
  "use strict";
  if (window.GXFx) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ================= SONIDO ================= */
  let ac = null, muted = false;
  try { muted = localStorage.getItem("gx-fx-mute") === "1"; } catch (e) {}
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = () => { if (!ac && AC) ac = new AC(); if (ac && ac.state !== "running") ac.resume().catch(() => {}); return ac; };
  ["pointerdown", "touchend", "click"].forEach(ev => document.addEventListener(ev, ctx, { passive: true }));
  function tone(f, d, type, v, delay, to) {
    if (muted) return;
    const c = ctx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (delay || 0);
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(v || .08, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .03);
  }
  const SND = {
    open: () => { tone(392, .14, "triangle", .07); tone(587, .2, "triangle", .07, .09); },
    tap: () => { tone(880, .07, "triangle", .08); tone(1320, .09, "sine", .05, .05); },
    coin: () => { tone(1568, .08, "square", .035); tone(2093, .18, "square", .03, .07); },
    prize: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .22, "triangle", .08, i * .08)); for (let i = 0; i < 6; i++) tone(2000 + i * 180, .1, "square", .025, .45 + i * .06); },
    error: () => { tone(180, .16, "sawtooth", .08); tone(120, .24, "sawtooth", .08, .13); }
  };
  const mi = () => muted ? "🔇" : "🔊";
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem("gx-fx-mute", muted ? "1" : "0"); } catch (e) {}
    $$(".gx-mute").forEach(b => b.textContent = mi());
    if (!muted) SND.tap();
  }

  /* ================= ESTILOS ================= */
  const css = `
/* ---------- RECOMPENSA DIARIA ---------- */
.gd-ov{background:rgba(2,4,14,.92)}
.gd-card{background:radial-gradient(120% 55% at 50% 0,#1d3fa855,transparent 65%),linear-gradient(170deg,#0a1440,#040720);border:2px solid #f2c14e;
  box-shadow:0 0 0 1px #000,0 0 44px #fbbf2433,0 26px 60px #000c;animation:gxZoom .38s cubic-bezier(.2,1.1,.3,1.15) both}
@keyframes gxZoom{0%{opacity:0;transform:scale(.7) translateY(20px)}100%{opacity:1;transform:none}}
.gd-grid{grid-template-columns:repeat(3,1fr);gap:9px}
.gd-day{flex-direction:column;justify-content:space-between;align-items:center;text-align:center;min-height:118px;padding:9px 6px 8px;border-radius:16px;
  background:linear-gradient(160deg,#102066,#070d30);border:2px solid #2d3f94;transition:transform .15s,box-shadow .25s}
.gd-day>div:first-child{width:100%;text-align:center}
.gd-day small{font:900 1.05rem/1 Inter,system-ui,sans-serif;color:#ffd23f;letter-spacing:.04em;-webkit-text-stroke:.6px #8a5a00;paint-order:stroke fill;text-shadow:0 2px 0 #8a5a00,0 0 12px #fbbf2499}
.gd-day b{justify-content:center;font-size:.95rem;color:#fff}
.gd-gift{width:58px;height:58px;margin:2px auto}
.gd-day:hover{transform:translateY(-2px)}
.gd-day.wide{min-height:132px;flex-direction:column;gap:2px}
.gd-day.wide .gd-gift{width:auto;height:74px;display:flex;justify-content:center;align-items:flex-end;gap:0}
.gd-day.wide .gd-gift svg{width:74px;height:74px;margin:0 -8px}
.gd-day.wide .gd-gift svg:nth-child(2){width:92px;height:92px;z-index:2}
.gd-day.lock{opacity:.45;background:linear-gradient(160deg,#0a1235,#04061a);border-color:#1c2766}
.gd-day.done{border-color:#22c55e;background:linear-gradient(160deg,#0f3a46,#071a2c)}
.gd-day.done .gd-gift{opacity:.7}
.gd-chk{top:50%;left:50%;right:auto;width:58px;height:58px;font-size:2.2rem;transform:translate(-50%,-30%);border:3px solid #fff;
  background:radial-gradient(circle at 35% 30%,#4ade80,#16a34a);box-shadow:0 0 22px #22c55e,0 4px 10px #000a;animation:gxCheck .5s cubic-bezier(.2,1.5,.3,1) both}
@keyframes gxCheck{from{transform:translate(-50%,-30%) scale(0) rotate(-90deg)}to{transform:translate(-50%,-30%) scale(1) rotate(0)}}
.gd-day.cur{border:2px solid #ffe98a;background:linear-gradient(160deg,#27308a,#0b1240);animation:gxGlow 1.3s ease-in-out infinite}
@keyframes gxGlow{0%,100%{box-shadow:0 0 0 2px #ffe98a55,0 0 16px #fbbf24aa;border-color:#ffd23f}50%{box-shadow:0 0 0 4px #fff3,0 0 38px #fbbf24,inset 0 0 18px #fbbf2455;border-color:#fff3b0}}
.gd-day.cur .gd-gift{animation:gxBounce 1.1s ease-in-out infinite;filter:drop-shadow(0 0 12px #fbbf24)}
@keyframes gxBounce{0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(-8px) scale(1.07)}60%{transform:translateY(-3px) scale(1.03)}}
.gd-day.sel{transform:scale(1.04)}
.gd-day.shake .gd-gift{animation:gxShake .4s ease-in-out infinite!important}
@keyframes gxShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-12deg) scale(1.12)}75%{transform:rotate(12deg) scale(1.12)}}
.gd-day.opened .gd-gift{animation:gxOpen .7s cubic-bezier(.2,1.3,.3,1) both}
@keyframes gxOpen{0%{transform:scale(.7)}50%{transform:scale(1.35) rotate(-6deg);filter:brightness(2) drop-shadow(0 0 30px #fff)}100%{transform:scale(1)}}
.gd-day.deny{animation:gxDeny .35s both}
@keyframes gxDeny{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
.gd-day.pulse{animation:gxTap .22s ease-out}
@keyframes gxTap{50%{transform:scale(.92)}}
.gx-mute{position:absolute;top:10px;left:10px;width:36px;height:36px;border-radius:12px;border:1px solid #ffffff2a;background:#ffffff14;color:#fff;font-size:1rem;cursor:pointer}
.gs-right .gx-mute{position:static;width:3.2em;height:3.2em;border-radius:50%}
.gx-flash{position:fixed;inset:0;z-index:1520;pointer-events:none;background:radial-gradient(circle at 50% 42%,#fff 0,#fff6c088 25%,transparent 60%);animation:gxFlash .7s ease-out both}
@keyframes gxFlash{from{opacity:1}to{opacity:0}}
.gx-conf{position:fixed;inset:0;z-index:1515;pointer-events:none;overflow:hidden}
.gx-conf i{position:absolute;top:-16px;width:8px;height:14px;border-radius:2px;animation:gxFall 2.4s linear both}
@keyframes gxFall{to{transform:translate(var(--dx),110vh) rotate(var(--r));opacity:.8}}
.gx-fly{position:fixed;z-index:1600;width:26px;height:26px;pointer-events:none}
.gx-fly svg{width:100%;height:100%;filter:drop-shadow(0 0 6px #fbbf24)}
.gx-plus{position:fixed;z-index:1601;pointer-events:none;font:900 1.3rem Inter,system-ui,sans-serif;color:#ffe98a;text-shadow:0 0 12px #fbbf24,0 2px 0 #8a5a00;animation:gxPlus 1.3s ease-out both}
@keyframes gxPlus{from{opacity:1;transform:translate(-50%,0) scale(.8)}20%{transform:translate(-50%,-10px) scale(1.25)}to{opacity:0;transform:translate(-50%,-48px) scale(1)}}
.gx-bump{animation:gxBump .45s ease-out}
@keyframes gxBump{0%,100%{transform:scale(1) rotate(0)}20%{transform:scale(1.28) rotate(-5deg)}40%{transform:scale(1.2) rotate(5deg)}60%{transform:scale(1.15) rotate(-3deg)}}
/* ---------- TIENDA ---------- */
.gs-card:hover,.gs-inv:hover{transform:translateY(-3px)}
.gs-card:active{transform:scale(.95)}
.gs-btn.poor,.gs-btn.poor:active{background:linear-gradient(135deg,#475569,#334155)!important;color:#cbd5e1!important;box-shadow:0 .3em 0 #1e293b!important}
.gx-miss{color:#fca5a5;font-size:.76em;font-weight:800}
.gs-state.ok{color:#4ade80}
.gs-card.sel .gs-th{animation:gxBounce 1.6s ease-in-out infinite}
`;
  const st = document.createElement("style"); st.id = "gx-fx-css"; st.textContent = css; document.head.appendChild(st);

  /* ================= EFECTOS ================= */
  const COIN = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#ffd23f" stroke="#b97a00" stroke-width="1.6"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="#fff6c0" stroke-opacity=".7"/><polygon points="20,9.5 23,16.3 30.4,17 24.8,21.8 26.5,29 20,25.2 13.5,29 15.2,21.8 9.6,17 17,16.3" fill="#fff6c0"/></svg>`;
  // contador de ORO: si tu menú usa otra clase, agrégala aquí
  const GOLD_SEL = ".g8-coins,.g8-gold,.g8-gc,[data-gold],.gx-gold,.gs-coins";
  function goldTarget() {
    const els = $$(GOLD_SEL).filter(e => e.offsetParent !== null || getComputedStyle(e).position === "fixed");
    return els.length ? els[els.length - 1] : null;
  }
  function confetti() {
    const el = document.createElement("div"); el.className = "gx-conf";
    const C = ["#ffd23f", "#fff3b0", "#f59e0b", "#fff", "#a78bfa"];
    el.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${C[Math.random() * 5 | 0]};--dx:${(Math.random() - .5) * 220}px;--r:${Math.random() * 900 - 450}deg;animation-delay:${Math.random() * .6}s"></i>`).join("");
    document.body.appendChild(el); setTimeout(() => el.remove(), 3400);
  }
  function flyCoins(n, amount) {
    const tg = goldTarget(), r = tg ? tg.getBoundingClientRect() : null;
    const tx = r ? r.left + r.width / 2 : window.innerWidth - 60, ty = r ? r.top + r.height / 2 : 30;
    const sx = window.innerWidth / 2, sy = window.innerHeight * .42;
    let landed = 0;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div"); c.className = "gx-fly"; c.innerHTML = COIN;
      c.style.left = sx - 13 + "px"; c.style.top = sy - 13 + "px"; document.body.appendChild(c);
      const mx = sx + (Math.random() - .5) * 160, my = sy - 30 - Math.random() * 90;
      const a = c.animate([
        { transform: "translate(0,0) scale(.4)", opacity: 0 },
        { transform: `translate(${mx - sx}px,${my - sy}px) scale(1.1)`, opacity: 1, offset: .35 },
        { transform: `translate(${tx - sx}px,${ty - sy}px) scale(.55)`, opacity: .9 }
      ], { duration: 1000 + i * 70, delay: 350 + i * 60, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
      a.onfinish = () => {
        c.remove(); SND.coin();
        if (++landed === n) arrive(tg, tx, ty, amount);
      };
    }
  }
  function arrive(tg, tx, ty, amount) {
    if (tg) { tg.classList.remove("gx-bump"); void tg.offsetWidth; tg.classList.add("gx-bump"); setTimeout(() => tg.classList.remove("gx-bump"), 500); }
    const p = document.createElement("div"); p.className = "gx-plus"; p.textContent = "+" + amount;
    p.style.left = tx + "px"; p.style.top = ty + 14 + "px"; document.body.appendChild(p); setTimeout(() => p.remove(), 1400);
  }
  function onReward(el) {
    const txt = ($("strong", el) || {}).textContent || "", amount = parseInt(txt.replace(/\D/g, ""), 10) || 0;
    const f = document.createElement("div"); f.className = "gx-flash"; document.body.appendChild(f); setTimeout(() => f.remove(), 800);
    SND.prize(); confetti();
    // las monedas salen cuando el jugador toca CONTINUAR (el overlay se cierra) o a los 1.6 s
    let done = false;
    const go = () => { if (done) return; done = true; flyCoins(10, amount); };
    const b = $("button", el); if (b) b.addEventListener("click", go, { once: true });
    setTimeout(go, 1600);
  }

  /* ================= DECORAR LO QUE YA EXISTE ================= */
  let busy = false;
  function decorateDaily(ov) {
    if (busy) return; busy = true;
    const card = $(".gd-card", ov);
    if (card && !$(".gx-mute", card)) { const b = document.createElement("button"); b.className = "gx-mute"; b.type = "button"; b.setAttribute("aria-label", "Silenciar"); b.textContent = mi(); card.prepend(b); }
    const g7 = $(".gd-day.wide .gd-gift", ov);
    if (g7 && !g7.dataset.fx) {
      const s = $("svg", g7);
      if (s) { g7.dataset.fx = "1"; const a = s.cloneNode(true), c = s.cloneNode(true); a.style.filter = "hue-rotate(110deg)"; c.style.filter = "hue-rotate(220deg)"; g7.innerHTML = ""; g7.append(a, s, c); }
    }
    busy = false;
  }
  let dObs = null;
  function watchDaily(ov) {
    SND.open(); decorateDaily(ov);
    dObs = new MutationObserver(() => decorateDaily(ov));
    dObs.observe(ov, { childList: true, subtree: true });
  }

  let pend = false;
  function decorateShop() {
    if (pend) return; pend = true;
    requestAnimationFrame(() => {
      pend = false;
      const sh = $("#gxShop"); if (!sh) return;
      const S = window.GXShop && window.GXShop.state(), C = window.GXShopCatalog;
      if (S && C) $$('[data-s="buy"]', sh).forEach(b => {
        const p = C.get(b.dataset.id); if (!p || S.coins == null) return;
        const poor = S.coins < p.price;
        b.classList.toggle("poor", poor);
        const nx = b.nextElementSibling, has = nx && nx.classList.contains("gx-miss");
        if (poor && !has) { const m = document.createElement("div"); m.className = "gx-miss"; m.textContent = "Te faltan " + (p.price - S.coins).toLocaleString("en-US") + " monedas"; b.after(m); }
        else if (poor && has) { const t = "Te faltan " + (p.price - S.coins).toLocaleString("en-US") + " monedas"; if (nx.textContent !== t) nx.textContent = t; }
        else if (!poor && has) nx.remove();
      });
      $$(".gs-state.ok,.gs-tag.ok", sh).forEach(e => { if (e.textContent.indexOf("OBTENIDO") > -1) e.textContent = "COMPRADO ✓"; });
      const r = $(".gs-right", sh); if (r && !$(".gx-mute", r)) { const b = document.createElement("button"); b.className = "gs-ic gx-mute"; b.type = "button"; b.textContent = mi(); r.prepend(b); }
    });
  }
  let sObs = null;
  function watchShop(el) { decorateShop(); sObs = new MutationObserver(decorateShop); sObs.observe(el, { childList: true, subtree: true }); }

  /* ================= OBSERVAR LA PÁGINA ================= */
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.id === "gdOv") watchDaily(n);
      else if (n.id === "gxShop") { SND.open(); watchShop(n); }
      else if (n.classList.contains("gd-rw")) onReward(n);
      else if (n.classList.contains("gs-ok")) {
        SND.prize(); confetti();
        const c = $(".gs-coins"); if (c) { c.classList.add("gx-bump"); setTimeout(() => c.classList.remove("gx-bump"), 600); }
      } else if (n.classList.contains("gs-toast") && n.classList.contains("bad")) {
        if (/suficientes|faltan/i.test(n.textContent)) n.textContent = "Te faltan monedas";
        SND.error();
      }
    }));
  }).observe(document.body, { childList: true });

  /* ================= TAP / HOVER / ERROR ================= */
  document.addEventListener("click", e => {
    const mu = e.target.closest && e.target.closest(".gx-mute");
    if (mu) { e.stopPropagation(); toggleMute(); return; }
    const d = e.target.closest && e.target.closest(".gd-day");
    if (d) {
      if (d.classList.contains("cur")) { SND.tap(); d.classList.remove("pulse"); void d.offsetWidth; d.classList.add("pulse"); }
      else { SND.error(); d.classList.remove("deny"); void d.offsetWidth; d.classList.add("deny"); }
    }
    const pk = e.target.closest && e.target.closest(".gs-card");
    if (pk) SND.tap();
    const bb = e.target.closest && e.target.closest('.gs-btn[data-s="buy"].poor');
    if (bb) { bb.classList.remove("gx-bump"); void bb.offsetWidth; bb.classList.add("gx-bump"); }
  }, true);

  /* ================= TIENDA / INVENTARIO: reemplazan el aviso "MUY PRONTO" ================= */
  const hook = document.createElement("style");
  hook.textContent = ".gd-sub{display:none!important}.gd-card h2{font-size:1.5rem;margin:4px 0 14px}";
  document.head.appendChild(hook);
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest(".g8-tile");
    if (!t) return;
    const name = (t.dataset.name || "").toUpperCase();
    if (name !== "TIENDA" && name !== "INVENTARIO") return;
    e.preventDefault(); e.stopImmediatePropagation();
    document.querySelectorAll(".g8-soon").forEach(x => x.remove());
    if (!window.GXShop) {
      const m = document.createElement("div"); m.className = "gs-toast bad"; m.textContent = "La tienda no cargó. Revisa que greyx-shop.js esté en index.html.";
      document.body.appendChild(m); setTimeout(() => m.remove(), 3000); return;
    }
    if (name === "TIENDA") window.GXShop.openShop(); else window.GXShop.openInventory();
  }, true);

  window.GXFx = { mute: toggleMute, sounds: SND };
})();
