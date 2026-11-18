/* GREYX LUDO — RECOMPENSA DIARIA (independiente de la tienda)
   Cargar como ÚLTIMO <script>:  <script src="greyx-daily.js"></script>
   - Usa el servidor /wallet/sync y /wallet/daily (el servidor decide y cobra; aquí solo se muestra).
   - No usa GXShop, ni inventario, ni catálogo de la tienda.
   - Funciona aunque aún no hayas publicado reglas de lectura de wallet (usa la respuesta del servidor). */
(() => {
  "use strict";
  if (window.GXDaily) return;

  const G = () => window.GX;
  const API = String(window.GX_SHOP_API || "https://greyx-shop.izturriagasebastian.workers.dev").replace(/\/+$/, "") + "/api";
  const AMOUNTS = [50, 75, 100, 125, 150, 200, 300];
  const DAY = 86400000, TZ = -4 * 3600000;               // República Dominicana UTC-4
  const dayKey = ms => Math.floor((ms + TZ) / DAY);
  const pad = n => String(n).padStart(2, "0");
  const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s % 3600 / 60)) + ":" + pad(s % 60); };
  const fmt = n => Number(n || 0).toLocaleString("en-US");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = (s, r) => (r || document).querySelector(s);

  const S = { uid: null, wallet: null, unsub: null, busy: false, sel: null, open: false, reward: null, drawnDay: null, loading: false };

  /* ---------- Estado del ciclo (misma lógica que el servidor) ---------- */
  function info() {
    if (!S.wallet) return null;
    const d = S.wallet.daily || { streak: 0, lastDay: -99 }, today = dayKey(Date.now());
    const claimedToday = d.lastDay === today, cont = d.lastDay === today - 1;
    const next = claimedToday ? null : cont ? (d.streak % 7) + 1 : 1;
    const done = claimedToday ? d.streak : cont ? d.streak % 7 : 0;
    return { claimedToday, next, done, today, msLeft: (today + 1) * DAY - TZ - Date.now() };
  }
  function setGold() { const g = G(); if (g && g.state && S.wallet) g.state.gold = S.wallet.coins; }

  /* ---------- Servidor ---------- */
  async function api(path, body) {
    const g = G(), u = g && g.fb && g.fb.auth && g.fb.auth.currentUser;
    if (!u) { const e = new Error("Inicia sesión primero."); e.code = "auth"; throw e; }
    const tok = await u.getIdToken(), ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify(body || {}), signal: ctrl.signal });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { const e = new Error(j.message || "No se pudo completar."); e.code = j.code || "http_" + r.status; throw e; }
      return j;
    } catch (e) {
      if (e.code) throw e;
      const n = new Error("Sin conexión con el servidor."); n.code = "net"; throw n;
    } finally { clearTimeout(to); }
  }
  async function retry(path, tries = 3) {
    let last;
    for (let i = 0; i < tries; i++) { try { return await api(path); } catch (e) { last = e; if (e.code !== "net") throw e; await sleep(1200 * (i + 1)); } }
    throw last;
  }
  async function load() {
    if (S.loading) return;
    S.loading = true;
    try {
      const r = await retry("/wallet/sync");
      S.wallet = { coins: r.coins, daily: r.daily || { streak: 0, lastDay: -99 } };
      setGold();
    } catch (e) { console.warn("[daily] sync", e.code); }
    S.loading = false;
    if (S.open) draw();
  }

  /* ---------- Arte: regalos cerrados y abiertos ---------- */
  const COLORS = [["#a855f7", "#fbbf24"], ["#22c55e", "#38bdf8"], ["#f59e0b", "#fde68a"], ["#38bdf8", "#f97316"], ["#ef4444", "#22c55e"], ["#7c3aed", "#ffffff"], ["#f43f5e", "#fbbf24"]];
  function gift(n, open) {
    const [b, r] = COLORS[(n - 1) % 7];
    const lid = open
      ? `<g transform="rotate(-22 14 26) translate(-4 -12)"><rect x="6" y="18" width="52" height="12" rx="4" fill="${b}"/><rect x="6" y="18" width="52" height="12" rx="4" fill="#fff" opacity=".2"/><rect x="28" y="18" width="8" height="12" fill="${r}"/></g><circle cx="32" cy="22" r="14" fill="#fff6c0" opacity=".55"/>${[[20, 10], [44, 8], [32, 2]].map(p => `<path d="M${p[0]} ${p[1] - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#fff6c0"/>`).join("")}`
      : `<rect x="6" y="18" width="52" height="12" rx="4" fill="${b}"/><rect x="6" y="18" width="52" height="12" rx="4" fill="#fff" opacity=".2"/><rect x="28" y="18" width="8" height="38" fill="${r}"/><path d="M32 18C22 6 12 12 20 18M32 18C42 6 52 12 44 18" fill="none" stroke="${r}" stroke-width="4.5" stroke-linecap="round"/><circle cx="32" cy="18" r="4" fill="${r}"/>`;
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="58" rx="22" ry="3" fill="#000" opacity=".3"/>
      <rect x="10" y="28" width="44" height="28" rx="4" fill="${b}"/><rect x="10" y="28" width="44" height="28" rx="4" fill="#000" opacity=".18"/>${open ? "" : ""}
      <rect x="28" y="28" width="8" height="28" fill="${r}"/>${lid}</svg>`;
  }
  const COIN = `<svg class="gd-coin" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#ffd23f" stroke="#b97a00" stroke-width="1.6"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="#fff6c0" stroke-opacity=".7"/><polygon points="20,9.5 23,16.3 30.4,17 24.8,21.8 26.5,29 20,25.2 13.5,29 15.2,21.8 9.6,17 17,16.3" fill="#fff6c0" stroke="#d99a00" stroke-width=".9"/></svg>`;

  /* ---------- Estilos ---------- */
  const css = `
.gd-ov{position:fixed;inset:0;z-index:1400;display:grid;place-items:center;padding:14px;background:rgba(4,5,18,.88);font-family:Inter,system-ui,-apple-system,sans-serif;animation:gdFade .22s ease both}
.gd-ov.out{animation:gdFadeOut .2s ease both}.gd-ov.out .gd-card{animation:gdPopOut .2s ease both}
@keyframes gdFade{from{opacity:0}to{opacity:1}}@keyframes gdFadeOut{to{opacity:0}}
@keyframes gdPop{from{opacity:0;transform:translateY(16px) scale(.93)}to{opacity:1;transform:none}}
@keyframes gdPopOut{to{opacity:0;transform:translateY(10px) scale(.95)}}
.gd-card{position:relative;width:min(560px,100%);max-height:96dvh;overflow-y:auto;scrollbar-width:none;padding:18px 14px 14px;border-radius:26px;color:#fff;text-align:center;
  border:2px solid #e6b449;background:radial-gradient(120% 60% at 50% 0,#5b2fc9aa,transparent 65%),linear-gradient(170deg,#1c1670,#090b30);
  box-shadow:0 0 40px #fbbf2444,0 0 70px #7c3aed44,0 26px 60px #000b;animation:gdPop .3s cubic-bezier(.2,.9,.3,1.15) both}
.gd-card::-webkit-scrollbar{display:none}
.gd-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:12px;border:1px solid #ffffff2a;background:#ffffff14;color:#fff;font-size:1rem;cursor:pointer}
.gd-card h2{margin:2px 0 4px;font-size:1.25rem;font-weight:900;letter-spacing:.14em;background:linear-gradient(180deg,#fff3b0,#f5b301);-webkit-background-clip:text;background-clip:text;color:transparent}
.gd-sub{margin:0 0 12px;color:#c3cbf3;font-size:.76rem;line-height:1.4}
.gd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.gd-day{position:relative;display:flex;align-items:center;justify-content:space-between;gap:4px;min-height:92px;padding:8px 10px;border-radius:16px;border:1.5px solid #ffffff1c;
  background:radial-gradient(circle at 70% 50%,#2a3a9a44,transparent 70%),#080b2acc;color:#fff;font:inherit;text-align:left;cursor:default}
.gd-day.wide{grid-column:1/-1;min-height:104px;justify-content:center;gap:26px}
.gd-day small{display:block;color:#ffd96a;font:900 .6rem Inter,sans-serif;letter-spacing:.1em}
.gd-day b{display:flex;align-items:center;gap:4px;margin-top:4px;font-size:.92rem;font-weight:900}
.gd-day .gd-coin{width:15px;height:15px}
.gd-gift{width:54px;height:54px;flex:none;transition:transform .2s}.gd-gift svg{width:100%;height:100%;filter:drop-shadow(0 4px 6px #0008)}
.gd-day.wide .gd-gift{width:70px;height:70px}
.gd-day.lock{opacity:.5}.gd-day.lock .gd-gift{filter:grayscale(.7) brightness(.7)}
.gd-day.done{border-color:#22c55e77}.gd-day.done .gd-gift{opacity:.85}
.gd-chk{position:absolute;top:6px;right:8px;width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:#22c55e;color:#fff;font-size:.8rem;font-weight:900;box-shadow:0 0 10px #22c55e}
.gd-day.cur{cursor:pointer;border-color:#ffe98a;background:radial-gradient(circle at 70% 50%,#fbbf2455,transparent 70%),#0d1038;box-shadow:0 0 0 2px #ffe98a55,0 0 22px #fbbf24aa;animation:gdPulse 1.5s ease-in-out infinite}
.gd-day.cur .gd-gift{animation:gdBob 1.4s ease-in-out infinite}
.gd-day.sel{box-shadow:0 0 0 3px #fff,0 0 30px #fde68a;transform:scale(1.03)}
.gd-day.today{border-color:#a5f3fc;box-shadow:0 0 0 2px #a5f3fc66,0 0 18px #22d3ee88}
.gd-day.shake .gd-gift{animation:gdShake .45s ease-in-out infinite}
.gd-day.opened .gd-gift{animation:gdOpen .6s cubic-bezier(.2,1.2,.3,1) both}
@keyframes gdPulse{50%{box-shadow:0 0 0 3px #ffe98a88,0 0 34px #fbbf24}}
@keyframes gdBob{50%{transform:translateY(-4px) rotate(3deg)}}
@keyframes gdShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-9deg) scale(1.08)}75%{transform:rotate(9deg) scale(1.08)}}
@keyframes gdOpen{from{transform:scale(.7)}60%{transform:scale(1.22)}to{transform:scale(1)}}
.gd-bal{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;color:#9aa4d6;font:800 .66rem Inter,sans-serif;letter-spacing:.14em}
.gd-bal b{display:flex;align-items:center;gap:6px;color:#fff;font-size:1.15rem;letter-spacing:0}.gd-bal .gd-coin{width:20px;height:20px}
.gd-btn{width:100%;min-height:54px;border:0;border-radius:16px;font:900 .95rem Inter,sans-serif;letter-spacing:.06em;color:#3a2200;cursor:pointer;
  background:linear-gradient(180deg,#ffe98a,#f5b301);box-shadow:0 5px 0 #92600a,0 0 20px #fbbf2466}
.gd-btn:active:not(:disabled){transform:translateY(4px);box-shadow:0 1px 0 #92600a}
.gd-btn:disabled{color:#cbd5e1;background:linear-gradient(135deg,#475569,#334155);box-shadow:0 3px 0 #1e293b}
.gd-hint{min-height:1.2em;margin:0 0 8px;color:#fde68a;font-size:.74rem;font-weight:700}
.gd-rw{position:fixed;inset:0;z-index:1500;display:grid;place-items:center;background:rgba(4,5,18,.7);animation:gdFade .2s both}
.gd-rwc{position:relative;text-align:center;color:#fff;animation:gdPop .35s cubic-bezier(.2,1.1,.3,1.2) both}
.gd-rwc .gd-gift{width:130px;height:130px;margin:0 auto 6px;filter:drop-shadow(0 0 30px #fbbf24)}
.gd-rwc strong{display:flex;align-items:center;justify-content:center;gap:10px;font-size:2.4rem;font-weight:900;color:#ffe98a;text-shadow:0 0 24px #fbbf24}
.gd-rwc strong .gd-coin{width:44px;height:44px}
.gd-rwc p{margin:6px 0 16px;color:#c3cbf3;font:800 .72rem Inter,sans-serif;letter-spacing:.16em}
.gd-rwc .gd-btn{width:min(260px,80vw)}
.gd-p{position:absolute;left:50%;top:40%;width:8px;height:8px;border-radius:50%;background:#ffe98a;box-shadow:0 0 10px #fbbf24;animation:gdSpark 1.1s ease-out both;pointer-events:none}
@keyframes gdSpark{from{opacity:1;transform:translate(0,0)}to{opacity:0;transform:translate(var(--x),var(--y)) scale(.3)}}
.gd-rain{position:fixed;inset:0;z-index:1510;pointer-events:none;overflow:hidden}
.gd-rain i{position:absolute;top:-40px;width:26px;height:26px;animation:gdFall 1.9s ease-in both}
.gd-rain svg{width:100%;height:100%}
@keyframes gdFall{to{transform:translateY(110vh) rotate(var(--r))}}
.gd-toast{position:fixed;left:50%;bottom:calc(40px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:1600;padding:11px 20px;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 .82rem Inter,sans-serif;box-shadow:0 10px 30px #000c;max-width:90vw;text-align:center}
.gd-toast.bad{border-color:#ef4444;color:#fecaca}
@media (max-width:420px){.gd-gift{width:44px;height:44px}.gd-day{padding:6px 8px;min-height:84px}}
@media (prefers-reduced-motion:reduce){.gd-ov *,.gd-rw *{animation:none!important}}
`;
  const st = document.createElement("style"); st.id = "gd-css"; st.textContent = css; document.head.appendChild(st);

  /* ---------- Widget ---------- */
  function toast(m, bad) { const t = document.createElement("div"); t.className = "gd-toast" + (bad ? " bad" : ""); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }

  function draw() {
    const ov = $("#gdOv"); if (!ov) return;
    const i = info(); S.drawnDay = i ? i.today : null;
    const cells = AMOUNTS.map((amt, k) => {
      const n = k + 1;
      let cls = "";
      if (i) {
        if (n <= i.done) cls = "done";
        else if (n === i.next) cls = "cur";
        else cls = "lock";
        if (i.claimedToday ? n === i.done : n === i.next) cls += " today";
      } else cls = "lock";
      if (S.sel === n) cls += " sel";
      if (S.reward && S.reward.day === n) cls += " opened";
      const open = cls.includes("done");
      return `<button type="button" class="gd-day ${cls} ${n === 7 ? "wide" : ""}" data-d="${n}" ${cls.includes("cur") ? "" : "tabindex='-1'"}>
        <div><small>DÍA ${n}</small><b>${COIN}${amt}</b></div><span class="gd-gift">${gift(n, open)}</span>${open ? `<i class="gd-chk">✓</i>` : ""}</button>`;
    }).join("");
    let hint = "", label, dis = true;
    if (!i) label = "CARGANDO…";
    else if (i.claimedToday) label = "VUELVE EN <span data-cd>" + hms(i.msLeft) + "</span>";
    else if (S.busy) label = "RECLAMANDO…";
    else if (S.sel === i.next) { label = "RECLAMAR DÍA " + i.next; dis = false; }
    else { label = "RECLAMAR"; hint = "Toca el regalo que brilla (día " + i.next + ")"; }
    ov.innerHTML = `<div class="gd-card" role="dialog" aria-modal="true">
      <button class="gd-x" data-k="close" type="button" aria-label="Cerrar">✕</button>
      <h2>RECOMPENSA DIARIA</h2>
      <p class="gd-sub">Reclama cada día. Si pierdes un día vuelves al día 1, pero nunca pierdes las monedas que ya recibiste.</p>
      <div class="gd-grid">${cells}</div>
      <div class="gd-bal">TU SALDO <b>${COIN}<span id="gdCoins">${S.wallet ? fmt(S.wallet.coins) : "—"}</span></b></div>
      <p class="gd-hint">${hint}</p>
      <button class="gd-btn" data-k="claim" type="button" ${dis || S.busy ? "disabled" : ""}>${label}</button></div>`;
  }

  function openWidget() {
    const g = G(); if (!g) return;
    if (!g.state.user) { g.state.showAuth = true; g.state.authMode = "login"; g.render(); return; }
    if ($("#gdOv")) return;
    S.open = true; S.sel = null; S.reward = null;
    const ov = document.createElement("div"); ov.id = "gdOv"; ov.className = "gd-ov";
    ov.addEventListener("click", onClick);
    document.body.appendChild(ov);
    draw();
    load();                                   // siempre pide el estado real al servidor
  }
  function closeWidget() {
    const ov = $("#gdOv"); if (!ov) return;
    S.open = false; ov.classList.add("out");
    setTimeout(() => ov.remove(), 200);
  }

  function onClick(e) {
    if (e.target.id === "gdOv") return closeWidget();
    const k = e.target.closest("[data-k]");
    if (k) { if (k.dataset.k === "close") closeWidget(); else if (k.dataset.k === "claim") claim(); return; }
    const d = e.target.closest("[data-d]"), i = info();
    if (d && i && !S.busy && Number(d.dataset.d) === i.next) { S.sel = i.next; draw(); }
  }

  /* ---------- Reclamo (la animación va DESPUÉS de la confirmación) ---------- */
  async function claim() {
    const i = info();
    if (S.busy || !i || i.claimedToday || S.sel !== i.next) return;
    S.busy = true; draw();
    const cell = $(`.gd-day[data-d="${i.next}"]`); if (cell) cell.classList.add("shake");   // solo "tiembla" mientras espera
    try {
      const r = await retry("/wallet/daily");
      S.wallet = { coins: r.coins, daily: { streak: r.day, lastDay: dayKey(Date.now()) } };
      setGold();
      S.reward = { day: r.day, gained: r.gained };
      S.sel = null; S.busy = false;
      if (S.open) draw();
      celebrate(r.day, r.gained);
    } catch (e) {
      S.busy = false; S.sel = null;
      if (e.code === "already") {            // ya estaba registrada (por ejemplo, se perdió la respuesta)
        await load();
        toast("Tu recompensa de hoy ya estaba registrada ✓");
      } else toast(e.code === "net" ? "Sin conexión. Intenta de nuevo." : (e.message || "No se pudo reclamar."), true);
      if (S.open) draw();
    }
  }

  function celebrate(day, gained) {
    const el = document.createElement("div"); el.className = "gd-rw";
    const sparks = Array.from({ length: 26 }, (_, k) => { const a = k / 26 * 6.283, d = 90 + (k % 5) * 30; return `<i class="gd-p" style="--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;animation-delay:${(k % 6) * .04}s"></i>`; }).join("");
    el.innerHTML = `<div class="gd-rwc">${sparks}<span class="gd-gift">${gift(day, true)}</span>
      <strong>${COIN}+${gained}</strong><p>RECOMPENSA DEL DÍA ${day}</p><button class="gd-btn" type="button">CONTINUAR</button></div>`;
    el.querySelector("button").onclick = () => { el.remove(); S.reward = null; if (S.open) draw(); };
    document.body.appendChild(el);
    const rain = document.createElement("div"); rain.className = "gd-rain";
    rain.innerHTML = Array.from({ length: 22 }, () => `<i style="left:${Math.random() * 100}%;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * .8}s">${COIN}</i>`).join("");
    document.body.appendChild(rain); setTimeout(() => rain.remove(), 3000);
  }

  /* ---------- Botón RECLAMAR del menú (Inicio) ---------- */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest(".g8-claim");
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openWidget();
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#gdOv") && !$(".gd-rw")) closeWidget(); });

  function patchMenu() {
    const b = $(".g8-claim"); if (!b) return;
    const i = info(), sub = $(".g8-dt small");
    const txt = !i ? "RECLAMAR ›" : i.claimedToday ? "VUELVE EN " + hms(i.msLeft) : "RECLAMAR ›";
    if (b.textContent !== txt) b.textContent = txt;
    if (sub && i) { const t = i.claimedToday ? "¡Ya reclamaste hoy!" : "¡Día " + i.next + " listo para reclamar!"; if (sub.textContent !== t) sub.textContent = t; }
  }

  /* ---------- Sesión: carga y refresco ---------- */
  async function startUser(uid) {
    S.uid = uid; S.wallet = null;
    load();
    try {                                    // en vivo si las reglas lo permiten; si no, se usa la respuesta del servidor
      const g = G(), fs = await g.fsModule();
      S.unsub = fs.onSnapshot(fs.doc(g.fb.db, "wallet", uid), s => {
        if (!s.exists() || S.busy || S.uid !== uid) return;
        const d = s.data(); S.wallet = { coins: d.coins, daily: d.daily || { streak: 0, lastDay: -99 } }; setGold();
        if (S.open && !$(".gd-rw")) draw();
      }, () => {});
    } catch (e) {}
  }
  function stopUser() { if (S.unsub) { try { S.unsub(); } catch (e) {} } S.unsub = null; S.uid = null; S.wallet = null; closeWidget(); }

  setInterval(() => {
    const g = G(); if (!g || !g.state || !g.fb || !g.fb.db) return;
    const uid = g.state.user ? g.state.user.uid : null;
    if (uid !== S.uid) { if (S.uid) stopUser(); if (uid) startUser(uid); }
    patchMenu();
    // contador sin redibujar el widget (no corta animaciones)
    const i = info();
    if (S.open && i) {
      if (S.drawnDay !== i.today) { load(); S.drawnDay = i.today; }
      const cd = $("[data-cd]"); if (cd) cd.textContent = hms(i.msLeft);
    }
  }, 1000);

  window.GXDaily = { open: openWidget, close: closeWidget };
})();
