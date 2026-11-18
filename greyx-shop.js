/* GREYX LUDO — TIENDA + INVENTARIO + MONEDAS (pantallas y lógica en el navegador)
   Necesita cargarse DESPUÉS de: greyx-shop-catalog.js, greyx-shop-art.js, greyx-shop-skins.js y del juego (index.html).
   El navegador solo MUESTRA y PIDE. Quien cobra, entrega y equipa es el servidor (greyx-shop-worker.js). */
(() => {
  "use strict";
  if (window.GXShop) return;
  const G = () => window.GX, C = window.GXShopCatalog, ART = window.GXShopArt, SK = window.GXSkins;
  if (!C || !ART || !SK) { console.warn("[tienda] faltan greyx-shop-catalog.js, greyx-shop-art.js o greyx-shop-skins.js"); return; }

  // Dirección del servidor de la tienda. Cámbiala en index.html con:  window.GX_SHOP_API = "https://TU-WORKER.workers.dev"
  const API = String(window.GX_SHOP_API || "https://greyx-shop.izturriagasebastian.workers.dev").replace(/\/+$/, "") + "/api";

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Number(n || 0).toLocaleString("en-US");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const DAY = 86400000, TZ = -4 * 3600000, dayKey = ms => Math.floor((ms + TZ) / DAY);
  const pad = n => String(n).padStart(2, "0");
  const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s % 3600 / 60)) + ":" + pad(s % 60); };
  const COIN = `<svg class="gs-coin" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#ffd23f" stroke="#b97a00" stroke-width="1.6"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="#fff6c0" stroke-opacity=".7"/><polygon points="20,9.5 23,16.3 30.4,17 24.8,21.8 26.5,29 20,25.2 13.5,29 15.2,21.8 9.6,17 17,16.3" fill="#fff6c0" stroke="#d99a00" stroke-width=".9"/></svg>`;
  const BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`;
  const BAG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7V6a3 3 0 0 1 6 0v1M6 7h12l1 13H5z"/></svg>`;
  const SHOP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9l1.5-5h13L20 9M4 9h16v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-4 0zM5 13v7h14v-7"/></svg>`;

  /* ======================= ESTADO ======================= */
  const S = { uid: null, wallet: null, inv: {}, equip: { dice: null, token: null, board: null }, boost: null, unsubs: [] };
  const V = { open: false, mode: "shop", cat: "dice", sel: { dice: "dice_gold", token: "token_imperial", board: "board_imperial", card: "card_rename" }, busy: false };
  let uiTick = null;

  const owned = id => (S.inv[id] ? (S.inv[id].qty || 1) : 0);
  function activeBoost() {
    const b = S.boost; if (!b || !b.until) return null;
    const until = b.until.toMillis ? b.until.toMillis() : +b.until, left = until - Date.now();
    if (left <= 0) return null;
    const p = C.get(b.cardId) || {};
    return { cardId: b.cardId, left, pro: !!b.pro, name: p.name || "Tarjeta", label: "XP +" + Math.round((b.mult || 0) * 100) + "%" };
  }
  function dailyState() {
    const w = S.wallet, d = (w && w.daily) || { streak: 0, lastDay: -99 }, today = dayKey(Date.now());
    const claimedToday = d.lastDay === today, cont = d.lastDay === today - 1;
    const done = claimedToday ? d.streak : cont ? d.streak % 7 : 0;
    const next = claimedToday || cont ? (d.streak % 7) + 1 : 1;
    return { claimedToday, next, done, msLeft: (today + 1) * DAY - TZ - Date.now() };
  }
  function emit() {
    const g = G();
    if (g && g.state && S.wallet) g.state.gold = S.wallet.coins;
    SK.apply(S.equip);
    const b = activeBoost();
    document.body.classList.toggle("gx-pro", !!(b && b.pro));
    if (V.open) draw();
  }

  /* ======================= SERVIDOR ======================= */
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
      const n = new Error("Sin conexión con el servidor de la tienda."); n.code = "net"; throw n;
    } finally { clearTimeout(to); }
  }
  async function callRetry(path, body, tries = 3) {
    let last;
    for (let i = 0; i < tries; i++) { try { return await api(path, body); } catch (e) { last = e; if (e.code !== "net") throw e; await sleep(1200 * (i + 1)); } }
    throw last;
  }

  /* ======================= SESIÓN: monedas, inventario, equipo ======================= */
  async function start(uid) {
    const g = G(), fs = await g.fsModule(), db = g.fb.db;
    S.uid = uid;
    const on = (ref, fn) => S.unsubs.push(fs.onSnapshot(ref, fn, e => console.warn("[tienda]", e.code || e)));
    on(fs.doc(db, "wallet", uid), s => { S.wallet = s.exists() ? s.data() : null; emit(); });
    on(fs.collection(db, "shopInventory", uid, "items"), sn => { S.inv = {}; sn.forEach(d => { S.inv[d.id] = d.data(); }); emit(); });
    on(fs.doc(db, "shopEquip", uid), s => { S.equip = Object.assign({ dice: null, token: null, board: null }, s.exists() ? s.data() : {}); emit(); });
    on(fs.doc(db, "boosts", uid), s => { S.boost = s.exists() ? s.data() : null; emit(); });
    api("/wallet/sync").catch(e => console.warn("[tienda] sync", e.code));   // crea la billetera y da los 500 de registro (una sola vez)
    resolvePending();
  }
  function stop() {
    S.unsubs.forEach(u => { try { u(); } catch (e) {} });
    Object.assign(S, { uid: null, wallet: null, inv: {}, equip: { dice: null, token: null, board: null }, boost: null, unsubs: [] });
    SK.apply(null); document.body.classList.remove("gx-pro");
    const g = G(); if (g && g.state) delete g.state.gold;
    closeAll();
  }
  setInterval(() => {
    const g = G(); if (!g || !g.state || !g.fb || !g.fb.db) return;
    const uid = g.state.user ? g.state.user.uid : null;
    if (uid === S.uid) return;
    if (S.uid) stop();
    if (uid) start(uid).catch(e => console.warn("[tienda]", e));
  }, 1000);

  /* ======================= AVISOS ======================= */
  function toast(msg, bad) {
    const t = document.createElement("div");
    t.className = "gs-toast" + (bad ? " bad" : "");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }
  function pop(html, top) {
    const p = document.createElement("div");
    p.className = "gs-pop"; p.style.top = top || "30%"; p.innerHTML = html;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
  const errMsg = e => e && e.code === "net" ? "Sin conexión. Intenta de nuevo." : (e && e.message) || "No se pudo completar.";
  function needLogin() {
    const g = G();
    if (g.state.user) return true;
    closeAll(); g.state.showAuth = true; g.state.authMode = "login"; g.render();
    return false;
  }

  /* ======================= VENTANAS (diálogo genérico) ======================= */
  function dlg(o) {
    return new Promise(res => {
      const m = document.createElement("div");
      m.className = "gs-md";
      m.innerHTML = `<div class="gs-mdc" role="dialog" aria-modal="true">${o.art ? `<div class="gs-mdart">${ART.product(o.art)}</div>` : ""}<h3>${esc(o.title)}</h3><p>${o.text || ""}</p>
        ${o.input ? `<input id="gsIn" class="gs-in" maxlength="16" placeholder="${esc(o.input)}" autocomplete="off" autocapitalize="off" spellcheck="false">` : ""}
        <div class="gs-err" id="gsErr"></div>
        <div class="gs-row"><button class="gs-btn ghost" data-d="0" type="button">${o.cancel || "CANCELAR"}</button><button class="gs-btn gold" data-d="1" type="button">${o.ok || "ACEPTAR"}</button></div></div>`;
      const done = v => { m.remove(); res(v); };
      m.addEventListener("click", e => {
        const b = e.target.closest("[data-d]");
        if (b && b.dataset.d === "1") {
          if (o.input) {
            const v = $("#gsIn", m).value.trim(), bad = o.validate && o.validate(v);
            if (bad) { $("#gsErr", m).textContent = bad; return; }
            return done(v);
          }
          return done(true);
        }
        if (b || e.target === m) done(null);
      });
      document.body.appendChild(m);
      const i = $("#gsIn", m); if (i) i.focus();
    });
  }

  /* ======================= COMPRA ======================= */
  const newTx = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(36) + Math.random().toString(36).slice(2) + "xxxxxxxx").slice(0, 40);
  const PKEY = "gx-shop-pending";
  const getPending = () => { try { const p = JSON.parse(localStorage.getItem(PKEY) || "null"); return p && p.uid === S.uid ? p : null; } catch (e) { return null; } };
  const setPending = p => { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) {} };
  const clearPending = () => { try { localStorage.removeItem(PKEY); } catch (e) {} };

  async function buy(id) {
    const p = C.get(id);
    if (!p || V.busy || !needLogin()) return;
    if (p.perm && owned(id)) return toast("Ya tienes este producto.", true);
    if (!S.wallet) return toast("Tu billetera todavía se está preparando. Espera un momento.", true);
    if (S.wallet.coins < p.price) return toast("No tienes suficientes monedas para realizar esta compra.", true);
    const ok = await dlg({ title: "Confirmar compra", art: p.id, ok: "COMPRAR",
      text: `<b>${esc(p.name)}</b><br>${COIN} <b>${fmt(p.price)}</b> monedas<br><small>Te quedarán ${fmt(S.wallet.coins - p.price)}</small>` });
    if (!ok) return;
    V.busy = true; draw();
    const txId = newTx();
    setPending({ uid: S.uid, txId, id, price: p.price });          // si se cae el internet, se verifica al volver
    try {
      const r = await callRetry("/shop/buy", { productId: id, txId, price: p.price });
      clearPending(); V.busy = false;
      if (S.wallet && r.coins != null) S.wallet.coins = r.coins;
      emit();
      success(p);
    } catch (e) {
      V.busy = false;
      if (e.code === "net") toast("Sin conexión. Verificaremos tu compra apenas vuelvas a conectarte.", true);
      else { clearPending(); toast(errMsg(e), true); }
      draw();
    }
  }
  async function resolvePending() {
    const p = getPending(); if (!p) return;
    try {
      const r = await api("/shop/buy", { productId: p.id, txId: p.txId, price: p.price });
      clearPending();
      toast("Compra confirmada: " + (C.get(p.id) || {}).name + (r.replay ? "" : ""));
    } catch (e) { if (e.code !== "net") clearPending(); }
  }

  function success(p) {
    const R = C.RARITY[p.rarity], m = document.createElement("div");
    m.className = "gs-ok"; m.style.setProperty("--rc", R.c);
    const parts = Array.from({ length: 22 }, (_, i) => { const a = i / 22 * 6.283, d = 90 + (i % 5) * 22; return `<i style="--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;animation-delay:${(i % 6) * .05}s"></i>`; }).join("");
    m.innerHTML = `<div class="gs-okc" role="dialog" aria-modal="true"><h3>¡COMPRA EXITOSA!</h3>
      <div class="gs-okart"><div class="gs-burst">${parts}</div>${ART.product(p.id)}</div>
      <h2>${esc(p.name)}</h2><div class="gs-added">AÑADIDO AL INVENTARIO</div><div class="gs-q">¿Qué deseas hacer?</div>
      <div class="gs-col"><button class="gs-btn gold" data-o="now" type="button">${p.perm ? "EQUIPAR AHORA" : "UTILIZAR AHORA"}</button>
      <button class="gs-btn ghost" data-o="later" type="button">${p.perm ? "EQUIPAR LUEGO" : "UTILIZAR LUEGO"}</button></div></div>`;
    m.addEventListener("click", async e => {
      const b = e.target.closest("[data-o]"); if (!b) return;
      if (b.dataset.o === "later") return m.remove();
      b.disabled = true;
      m.remove();
      if (p.perm) await equip(p.cat, p.id); else useCard(p.id);
    });
    document.body.appendChild(m);
  }

  /* ======================= EQUIPAR / USAR ======================= */
  async function equip(cat, id) {
    if (!needLogin()) return;
    try {
      const r = await callRetry("/shop/equip", { category: cat, productId: id });
      S.equip = Object.assign({ dice: null, token: null, board: null }, r.equip);
      emit(); toast("EQUIPADO ✓");
    } catch (e) { toast(errMsg(e), true); }
  }
  async function useCard(id) {
    const p = C.get(id);
    if (!p || !needLogin() || owned(id) < 1) return;
    if (p.kind === "boost") {
      const b = activeBoost();
      if (b) return toast("Ya tienes una tarjeta activa. Termina en " + hms(b.left) + ".", true);
      const ok = await dlg({ title: "Utilizar tarjeta", art: id, ok: "UTILIZAR", text: `<b>${esc(p.name)}</b><br>${esc(p.fn)}<br><small>Empieza a contar desde ahora y se gasta 1 tarjeta.</small>` });
      if (!ok) return;
      try { const r = await callRetry("/shop/use", { productId: id }); toast("¡Activada! " + (r.mult * 100) + "% XP por 24 h"); }
      catch (e) { toast(errMsg(e), true); }
    } else {
      const cur = G().state.profile && G().state.profile.username;
      if (!cur) return toast("Primero crea tu perfil.", true);
      const name = await dlg({ title: "Nuevo nombre", art: id, ok: "CAMBIAR", input: "Nuevo nombre de usuario", text: `Tu nombre actual: <b>@${esc(cur)}</b><br><small>3 a 16 caracteres: letras, números y _. La tarjeta se gasta solo si el cambio se completa.</small>`,
        validate: v => !/^[A-Za-z0-9_]{3,16}$/.test(v) ? "Usa 3 a 16 caracteres: letras, números y _." : v === cur ? "Ese ya es tu nombre." : "" });
      if (!name) return;
      try {
        const r = await callRetry("/shop/rename", { name });
        const g = G(); g.state.profile = Object.assign({}, g.state.profile, { username: r.username, usernameLower: r.usernameLower }); g.render();
        toast("Nombre actualizado ✓");
      } catch (e) { toast(errMsg(e), true); }
    }
  }

  /* ======================= PANTALLA TIENDA / INVENTARIO ======================= */
  const col = p => C.RARITY[p.rarity].c;
  const stateOf = p => !p.perm ? "card" : !owned(p.id) ? "buy" : S.equip[p.cat] === p.id ? "eq" : "own";
  const DEF = {
    dice: `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="#1a1f4a"/><rect x="24" y="24" width="52" height="52" rx="10" fill="#fff"/><g fill="#1a1f4a"><circle cx="38" cy="38" r="4.5"/><circle cx="62" cy="38" r="4.5"/><circle cx="50" cy="50" r="4.5"/><circle cx="38" cy="62" r="4.5"/><circle cx="62" cy="62" r="4.5"/></g></svg>`,
    token: `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="#1a1f4a"/><ellipse cx="50" cy="78" rx="24" ry="8" fill="#ef4444"/><path d="M38 76Q41 52 45 46h10q4 6 7 30z" fill="#ef4444"/><circle cx="50" cy="36" r="14" fill="#ff8a80"/></svg>`,
    board: `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="#1a1f4a"/><rect x="14" y="14" width="72" height="72" rx="6" fill="#fffdf6"/><rect x="14" y="14" width="26" height="26" fill="#e53935"/><rect x="60" y="14" width="26" height="26" fill="#2f6fe0"/><rect x="14" y="60" width="26" height="26" fill="#2fa84f"/><rect x="60" y="60" width="26" height="26" fill="#f5b301"/></svg>`
  };

  function productCard(p) {
    const st = stateOf(p);
    const tag = st === "eq" ? `<span class="gs-tag eq">EQUIPADO ✓</span>` : st === "own" ? `<span class="gs-tag ok">OBTENIDO ✓</span>` : `<span class="gs-tag pr">${COIN}${fmt(p.price)}</span>`;
    const q = !p.perm && owned(p.id) ? `<i class="gs-qty">x${owned(p.id)}</i>` : "";
    return `<button class="gs-card ${V.sel[p.cat] === p.id ? "sel" : ""}" style="--rc:${col(p)}" data-s="pick" data-id="${p.id}" type="button"><span class="gs-th">${ART.product(p.id)}${q}</span><b>${esc(p.name)}</b>${tag}</button>`;
  }
  function detail(p) {
    const st = stateOf(p), R = C.RARITY[p.rarity], busy = V.busy;
    let act;
    if (st === "own") act = `<div class="gs-state ok">OBTENIDO ✓</div><button class="gs-btn" data-s="equip" data-id="${p.id}" type="button">EQUIPAR</button>`;
    else if (st === "eq") act = `<div class="gs-state eq">EQUIPADO ✓</div>`;
    else act = `<div class="gs-price">${COIN}<b>${fmt(p.price)}</b> monedas</div><button class="gs-btn gold" data-s="buy" data-id="${p.id}" type="button" ${busy ? "disabled" : ""}>${busy ? "PROCESANDO…" : "COMPRAR"}</button>${!p.perm && owned(p.id) ? `<div class="gs-have">En tu inventario: ${owned(p.id)}</div>` : ""}`;
    return `<section class="gs-det" style="--rc:${R.c}"><div class="gs-art"><div class="gs-glow"></div>${ART.product(p.id)}</div>
      <div class="gs-info"><h2>${esc(p.name)}</h2><span class="gs-rar">${p.rl.toUpperCase()}</span><p class="gs-desc">«${esc(p.desc)}»</p>${p.fn ? `<p class="gs-fn">${esc(p.fn)}</p>` : ""}${act}</div></section>`;
  }
  function invCard(it, cat) {
    if (it.def) {
      const on = !S.equip[cat];
      return `<article class="gs-inv" style="--rc:#9aa3b8"><div class="gs-th">${DEF[cat]}</div><b>Clásico</b><span class="gs-rar">PREDETERMINADO</span>
        ${on ? `<div class="gs-state eq">EQUIPADO ✓</div>` : `<button class="gs-btn sm" data-s="equipdef" data-cat="${cat}" type="button">EQUIPAR</button>`}</article>`;
    }
    const p = it.p, st = stateOf(p);
    const btn = !p.perm ? `<div class="gs-have">Cantidad: <b>${owned(p.id)}</b></div><button class="gs-btn gold sm" data-s="use" data-id="${p.id}" type="button">UTILIZAR</button>`
      : st === "eq" ? `<div class="gs-state eq">EQUIPADO ✓</div>` : `<div class="gs-state ok">OBTENIDO ✓</div><button class="gs-btn sm" data-s="equip" data-id="${p.id}" type="button">EQUIPAR</button>`;
    return `<article class="gs-inv" style="--rc:${col(p)}"><div class="gs-th">${ART.product(p.id)}</div><b>${esc(p.name)}</b><span class="gs-rar">${p.rl.toUpperCase()}</span>${btn}</article>`;
  }
  function boostChip() {
    const b = activeBoost(); if (!b) return "";
    return `<div class="gs-boost ${b.pro ? "pro" : ""}"><span>⚡ ${esc(b.name)} · ${b.label}</span><b data-boost>${hms(b.left)}</b></div>`;
  }

  function draw() {
    const el = $("#gxShop"); if (!el) return;
    const inv = V.mode === "inv", cat = V.cat, scrollY = (el.querySelector(".gs-invg") || {}).scrollTop || 0;
    const tabs = C.CATS.map(c => `<button class="gs-tab ${c.id === cat ? "on" : ""}" data-s="tab" data-id="${c.id}" type="button">${c.n}</button>`).join("");
    let main;
    if (!inv) {
      const list = C.ofCat(cat), sel = C.get(V.sel[cat]) || list[0];
      main = `<div class="gs-main"><div class="gs-list">${list.map(productCard).join("")}</div>${detail(sel)}</div>`;
    } else {
      const items = (cat !== "card" ? [{ def: true }] : []).concat(C.ofCat(cat).filter(p => owned(p.id) > 0).map(p => ({ p })));
      main = items.length ? `<div class="gs-invg">${items.map(i => invCard(i, cat)).join("")}</div>`
        : `<div class="gs-empty">Aún no tienes tarjetas.<br><button class="gs-btn gold" data-s="swap" type="button">IR A LA TIENDA</button></div>`;
    }
    el.innerHTML = `<div class="gs-in"><div class="gs-top"><button class="gs-ic" data-s="close" type="button" aria-label="Volver">${BACK}</button>
      <h1>${inv ? "INVENTARIO" : "TIENDA"}</h1>
      <div class="gs-right"><button class="gs-ic" data-s="swap" type="button" aria-label="${inv ? "Ir a la tienda" : "Ir al inventario"}">${inv ? SHOP : BAG}</button>
      <button class="gs-coins" data-s="earn" type="button">${COIN}<b>${S.wallet ? fmt(S.wallet.coins) : "—"}</b></button></div></div>
      <div class="gs-tabs">${tabs}</div>${boostChip()}${main}</div>`;
    const g = el.querySelector(".gs-invg"); if (g) g.scrollTop = scrollY;
  }

  function open(mode, cat) {
    if (!needLogin()) return;
    V.mode = mode || "shop"; if (cat) V.cat = cat; V.busy = false;
    let el = $("#gxShop");
    if (!el) { el = document.createElement("div"); el.id = "gxShop"; el.className = "gs"; el.addEventListener("click", onClick); document.body.appendChild(el); }
    V.open = true; draw();
    clearInterval(uiTick);
    uiTick = setInterval(() => { const b = activeBoost(), n = $("[data-boost]"); if (n && b) n.textContent = hms(b.left); else if (V.open && !b && $(".gs-boost")) draw(); }, 1000);
  }
  function closeShop() { V.open = false; clearInterval(uiTick); const el = $("#gxShop"); if (el) el.remove(); }
  function closeAll() { closeShop(); closeDaily(); document.querySelectorAll(".gs-md,.gs-ok").forEach(e => e.remove()); }

  function onClick(e) {
    const b = e.target.closest("[data-s]"); if (!b) return;
    const a = b.dataset.s, id = b.dataset.id;
    if (a === "close") return closeShop();
    if (a === "swap") { V.mode = V.mode === "shop" ? "inv" : "shop"; return draw(); }
    if (a === "tab") { V.cat = id; return draw(); }
    if (a === "pick") { V.sel[V.cat] = id; return draw(); }
    if (a === "buy") return buy(id);
    if (a === "equip") return equip(C.get(id).cat, id);
    if (a === "equipdef") return equip(b.dataset.cat, null);
    if (a === "use") return useCard(id);
    if (a === "earn") return openEarn();
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && V.open && !$(".gs-md,.gs-ok")) closeShop(); });

  /* ======================= RECOMPENSA DIARIA ======================= */
  let dTick = null;
  function closeDaily() { clearInterval(dTick); const m = $("#gsDaily"); if (m) m.remove(); }
  function openDaily() {
    if (!needLogin()) return;
    closeDaily();
    const m = document.createElement("div"); m.id = "gsDaily"; m.className = "gs-md";
    m.addEventListener("click", async e => {
      if (e.target === m || e.target.closest("[data-x]")) return closeDaily();
      const b = e.target.closest("[data-claim]"); if (!b || b.disabled) return;
      b.disabled = true;
      try {
        const r = await callRetry("/wallet/daily");
        if (S.wallet) { S.wallet.coins = r.coins; S.wallet.daily = { streak: r.day, lastDay: dayKey(Date.now()) }; }
        emit(); pop(`<div class="gs-pb">${COIN} +${r.gained} monedas</div><div class="gs-pl">RECOMPENSA DIARIA · DÍA ${r.day}</div>`);
      } catch (er) { toast(errMsg(er), true); }
      drawDaily();
    });
    document.body.appendChild(m); drawDaily();
    dTick = setInterval(drawDaily, 1000);
  }
  function drawDaily() {
    const m = $("#gsDaily"); if (!m) return clearInterval(dTick);
    const d = dailyState();
    const cells = C.DAILY.map((amt, i) => {
      const n = i + 1, done = n <= d.done, cur = !d.claimedToday && n === d.next;
      return `<div class="gs-day ${done ? "done" : ""} ${cur ? "cur" : ""} ${n === 7 ? "wide" : ""}"><small>DÍA ${n}</small><div class="gs-gift">${ART.gift(n)}</div><b>${COIN}${amt}</b>${done ? `<i class="gs-chk">✓</i>` : ""}</div>`;
    }).join("");
    const btn = !S.wallet ? `<button class="gs-btn" disabled>CARGANDO…</button>` : d.claimedToday ? `<button class="gs-btn" disabled>VUELVE EN ${hms(d.msLeft)}</button>` : `<button class="gs-btn gold" data-claim="1">RECLAMAR DÍA ${d.next}</button>`;
    m.innerHTML = `<div class="gs-mdc wide"><button class="gs-x" data-x="1" type="button" aria-label="Cerrar">✕</button><h3>RECOMPENSA DIARIA</h3>
      <p>Reclama cada día. Si pierdes un día vuelves al día 1, pero nunca pierdes las monedas que ya recibiste.</p><div class="gs-days">${cells}</div>${btn}</div>`;
  }
  function openEarn() {
    if (!needLogin()) return;
    const m = document.createElement("div"); m.className = "gs-md";
    m.innerHTML = `<div class="gs-mdc"><button class="gs-x" data-x="1" type="button">✕</button><div class="gs-mdcoin">${COIN}</div><h3>Monedas GREYX</h3>
      <div class="gs-bal">TU SALDO <b>${S.wallet ? fmt(S.wallet.coins) : "—"}</b></div>
      <ul class="gs-rules"><li>🥇 1.º lugar: <b>100</b> · 🥈 2.º: <b>60</b> · 🥉 3.º: <b>35</b> · 4.º: <b>20</b></li><li>Hasta <b>10 partidas</b> con premio por día.</li><li>Las partidas abandonadas no dan monedas.</li><li>Recompensa diaria: de 50 a 300 monedas.</li></ul>
      <div class="gs-col"><button class="gs-btn gold" data-g="daily" type="button">RECOMPENSA DIARIA</button><button class="gs-btn" data-g="shop" type="button">IR A LA TIENDA</button></div></div>`;
    m.addEventListener("click", e => {
      if (e.target === m || e.target.closest("[data-x]")) return m.remove();
      const b = e.target.closest("[data-g]"); if (!b) return;
      m.remove(); if (b.dataset.g === "daily") openDaily(); else open("shop");
    });
    document.body.appendChild(m);
  }

  /* ======================= MONEDAS POR PARTIDA + XP EXTRA ======================= */
  async function claimGame(gameId) {
    for (let i = 0; i < 4; i++) {
      try {
        const r = await api("/wallet/game", { gameId });
        if (r.already) return;
        if (S.wallet) S.wallet.coins = r.coins;
        const g = G(), st = g.state;
        if (r.bonusXp > 0) {                                           // el servidor ya sumó el XP; solo actualizamos la pantalla
          st.xp = (st.xp || 0) + r.bonusXp; st.xpLevel = g.xpLevelFromTotal(st.xp);
          if (st.stats) st.stats = Object.assign({}, st.stats, { xp: (st.stats.xp || 0) + r.bonusXp });
        }
        emit();
        setTimeout(() => {
          if (r.gained > 0) pop(`<div class="gs-pb">${COIN} +${r.gained} monedas</div><div class="gs-pl">${r.count}/10 PARTIDAS CON PREMIO HOY</div>`, "26%");
          else if (r.capped) toast("Ya llegaste al límite de 10 partidas con monedas hoy.");
          if (r.bonusXp > 0) setTimeout(() => pop(`<div class="gs-pb xp">⚡ +${r.bonusXp} XP extra</div>`, "36%"), r.gained > 0 ? 1200 : 0);
        }, 1800);
        return;
      } catch (e) {
        if (e.code === "nomatch" || e.code === "net") { await sleep(1500 * (i + 1)); continue; }
        return;                                                        // expired / otro: no se reintenta
      }
    }
  }
  setInterval(() => {                                                  // cada partida terminada y guardada por el juego dispara el cobro
    const Cc = window.GreyxCore;
    if (!Cc || Cc.__gxShop) return;
    const orig = Cc.submitGame;
    Cc.submitGame = async function (ctx) {
      const r = await orig.apply(this, arguments);
      if (r && ctx && ctx.gameId && S.uid) setTimeout(() => claimGame(ctx.gameId), 700);
      return r;
    };
    Cc.__gxShop = true;
  }, 800);

  /* ======================= ESTILOS ======================= */
  const css = `
.gs{position:fixed;inset:0;z-index:1100;display:flex;flex-direction:column;color:#f1f3ff;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:clamp(12px,min(3.4vw,1.9dvh),17px);
  background:radial-gradient(circle at 50% -10%,#4c1d95aa,transparent 55%),radial-gradient(circle at 100% 60%,#1e3a8a55,transparent 45%),linear-gradient(180deg,#0a0c2e,#04051a);
  padding:calc(.7em + env(safe-area-inset-top,0px)) .8em calc(.8em + env(safe-area-inset-bottom,0px));animation:gsIn .25s ease both}
@keyframes gsIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.gs *,.gs-md *,.gs-ok *{box-sizing:border-box}
.gs button,.gs-md button,.gs-ok button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.gs svg,.gs-md svg,.gs-ok svg{display:block}
.gs-in{width:min(100%,1100px);margin:0 auto;flex:1;min-height:0;display:flex;flex-direction:column;gap:.7em}
.gs-top{display:grid;grid-template-columns:3.2em 1fr auto;gap:.6em;align-items:center}
.gs-top h1{margin:0;text-align:center;font-size:1.3em;font-weight:900;letter-spacing:.16em;background:linear-gradient(180deg,#fff3b0,#f5b301);-webkit-background-clip:text;background-clip:text;color:transparent}
.gs-ic{width:3.2em;height:3.2em;display:grid;place-items:center;padding:0;border-radius:50%;border:1.5px solid #6d5cffaa;background:linear-gradient(145deg,#232a66,#0d1030);box-shadow:0 0 .9em #4f46e566}
.gs-ic svg{width:52%;height:52%}.gs-ic:active{transform:scale(.93)}
.gs-right{display:flex;gap:.5em;align-items:center}
.gs-coins{display:flex;align-items:center;gap:.45em;height:3.2em;padding:0 1em 0 .7em;border-radius:99px;border:1.5px solid #e6b449;background:linear-gradient(145deg,#2a1d06,#0d0a05);font-weight:900;font-size:1.05em}
.gs-coin{width:1.5em;height:1.5em;flex:none;display:inline-block;vertical-align:middle}
.gs-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:.4em;padding:.3em;border-radius:1.1em;background:#070a24;border:1px solid #ffffff18}
.gs-tab{height:2.8em;border:0;border-radius:.8em;background:transparent;color:#9aa6d8;font-weight:900;font-size:.72em;letter-spacing:.08em}
.gs-tab.on{color:#2a1700;background:linear-gradient(135deg,#ffe98a,#f5b301);box-shadow:0 0 14px #f5b30066}
.gs-boost{display:flex;justify-content:space-between;align-items:center;padding:.5em .9em;border-radius:.9em;border:1px solid #22d3ee88;background:#0a2a3acc;font-size:.78em;font-weight:800;color:#a5f3fc}
.gs-boost.pro{border-color:#fbbf24;background:linear-gradient(90deg,#3a2406,#2a1060);color:#fde68a;box-shadow:0 0 16px #fbbf2455}
.gs-boost b{font-variant-numeric:tabular-nums}
.gs-main{flex:1;min-height:0;display:flex;flex-direction:column;gap:.7em}
.gs-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5em}
.gs-card{position:relative;display:flex;flex-direction:column;gap:.25em;padding:.35em;border-radius:.9em;border:1.5px solid color-mix(in srgb,var(--rc) 55%,transparent);background:#0b0f33cc;text-align:center;min-width:0;transition:transform .15s,box-shadow .2s}
.gs-card.sel{border-color:var(--rc);box-shadow:0 0 1.1em color-mix(in srgb,var(--rc) 60%,transparent);transform:translateY(-2px)}
.gs-card b{font-size:.62em;font-weight:800;line-height:1.15;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gs-th{position:relative;display:block;aspect-ratio:1;border-radius:.7em;overflow:hidden}.gs-th svg{width:100%;height:100%}
.gs-qty{position:absolute;right:.3em;top:.3em;padding:.1em .45em;border-radius:99px;background:#000a;font-style:normal;font-size:.7em;font-weight:900}
.gs-tag{display:flex;align-items:center;justify-content:center;gap:.25em;font-size:.6em;font-weight:900;padding:.2em .4em;border-radius:99px;white-space:nowrap}
.gs-tag .gs-coin{width:1.2em;height:1.2em}
.gs-tag.pr{background:#2a1d06;color:#ffd96a;border:1px solid #e6b44988}.gs-tag.ok{background:#22c55e26;color:#4ade80}.gs-tag.eq{background:#fbbf2426;color:#fde68a}
.gs-det{flex:1;min-height:0;display:flex;flex-direction:column;gap:.5em;padding:.7em;border-radius:1.2em;border:1.5px solid color-mix(in srgb,var(--rc) 60%,transparent);background:linear-gradient(160deg,#121858ee,#080b2bee);box-shadow:0 0 1.4em color-mix(in srgb,var(--rc) 35%,transparent)}
.gs-art{position:relative;flex:1;min-height:0;display:grid;place-items:center}
.gs-art svg{position:absolute;inset:0;margin:auto;width:100%;height:100%;filter:drop-shadow(0 .5em 1em #000a);animation:gsFloat 4s ease-in-out infinite}
.gs-glow{position:absolute;inset:8%;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--rc) 45%,transparent),transparent 65%);animation:gsPulse 3s ease-in-out infinite}
@keyframes gsFloat{50%{transform:translateY(-3%)}}@keyframes gsPulse{50%{opacity:.55;transform:scale(1.08)}}
.gs-info{display:flex;flex-direction:column;align-items:center;gap:.35em;text-align:center}
.gs-info h2{margin:0;font-size:1.3em;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
.gs-rar{font-size:.68em;font-weight:900;letter-spacing:.18em;color:var(--rc);text-shadow:0 0 .8em color-mix(in srgb,var(--rc) 60%,transparent)}
.gs-desc{margin:0;font-style:italic;color:#d4d9f4;font-size:.85em}.gs-fn{margin:0;color:#9fe8ff;font-size:.76em;font-weight:700}
.gs-price{display:flex;align-items:center;gap:.4em;font-size:1.05em}.gs-price b{font-size:1.2em;color:#ffd96a}
.gs-state{font-weight:900;letter-spacing:.1em;font-size:.95em}.gs-state.ok{color:#4ade80}.gs-state.eq{color:#fde68a}
.gs-have{font-size:.74em;color:#a5b0ff;font-weight:700}
.gs-btn{min-height:3.2em;padding:0 1.6em;border:0;border-radius:1em;font-weight:900;font-size:.9em;letter-spacing:.06em;color:#fff;background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 .3em 0 #3b1d8f}
.gs-btn.gold{color:#3a2200;background:linear-gradient(180deg,#ffe98a,#f5b301);box-shadow:0 .3em 0 #92600a,0 0 1em #fbbf2466}
.gs-btn.ghost{background:#ffffff12;box-shadow:none;border:1px solid #ffffff2a}.gs-btn.sm{min-height:2.6em;font-size:.78em;padding:0 1em}
.gs-btn:active:not(:disabled){transform:translateY(.2em)}.gs-btn:disabled{opacity:.55;transform:none}
.gs-invg{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5em,1fr));gap:.7em;align-content:start}
.gs-inv{display:flex;flex-direction:column;align-items:center;gap:.35em;padding:.55em;border-radius:1em;border:1.5px solid color-mix(in srgb,var(--rc) 55%,transparent);background:#0b0f33cc;text-align:center}
.gs-inv .gs-th{width:100%}.gs-inv b{font-size:.78em}.gs-inv .gs-btn{width:100%}
.gs-empty{flex:1;display:grid;place-content:center;gap:1em;text-align:center;color:#9aa4d6}
.gs-toast{position:fixed;left:50%;bottom:calc(5em + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:1400;max-width:90vw;padding:.8em 1.3em;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 13px Inter,system-ui,sans-serif;box-shadow:0 10px 30px #000c;text-align:center;animation:gsIn .2s both}
.gs-toast.bad{border-color:#ef4444;color:#fecaca}
.gs-pop{position:fixed;left:50%;z-index:1400;transform:translateX(-50%);pointer-events:none;text-align:center;font-family:Inter,system-ui,sans-serif;animation:gsPop 3s cubic-bezier(.2,.8,.2,1) forwards}
.gs-pb{display:flex;align-items:center;gap:.5em;padding:.6em 1.2em;border-radius:99px;font-size:20px;font-weight:900;color:#3a2200;background:linear-gradient(135deg,#ffe98a,#f5b301);box-shadow:0 0 28px #fbbf24aa,0 8px 20px #0008}
.gs-pb.xp{color:#fff;background:linear-gradient(135deg,#8b5cf6,#4f46e5);box-shadow:0 0 28px #8b5cf6aa}.gs-pb .gs-coin{width:1.3em;height:1.3em}
.gs-pl{margin-top:.4em;color:#fde68a;font:800 10px monospace;letter-spacing:.12em}
@keyframes gsPop{0%{opacity:0;transform:translate(-50%,10px) scale(.8)}12%{opacity:1;transform:translate(-50%,-6px) scale(1.06)}80%{opacity:1;transform:translate(-50%,-36px)}100%{opacity:0;transform:translate(-50%,-60px)}}
.gs-md,.gs-ok{position:fixed;inset:0;z-index:1300;display:grid;place-items:center;padding:20px;background:rgba(5,6,16,.86);font-family:Inter,system-ui,sans-serif;animation:gsFade .18s both}
@keyframes gsFade{from{opacity:0}to{opacity:1}}
.gs-mdc{position:relative;width:min(340px,100%);max-height:92dvh;overflow-y:auto;scrollbar-width:none;padding:22px 18px 18px;border-radius:24px;text-align:center;color:#fff;border:1.5px solid #e6b449aa;background:linear-gradient(160deg,#252b8a,#0b0d38);box-shadow:0 0 34px #fbbf2444,0 24px 60px #000b;animation:gsPopIn .25s cubic-bezier(.2,.9,.3,1.2) both}
.gs-mdc.wide{width:min(460px,100%)}.gs-mdc h3{margin:0 0 8px;font-size:1.1rem;font-weight:900;letter-spacing:.06em}.gs-mdc p{margin:0 0 12px;color:#cbd5e1;font-size:.86rem;line-height:1.5}
@keyframes gsPopIn{from{opacity:0;transform:translateY(12px) scale(.93)}to{opacity:1;transform:none}}
.gs-mdart{width:130px;height:130px;margin:0 auto 10px}.gs-mdart svg{width:100%;height:100%}
.gs-in{font-size:inherit}.gs-mdc .gs-in,.gs-in.gs-in{}
input.gs-in{width:100%;padding:13px;border-radius:14px;border:1.5px solid #ffffff33;background:#0a0d1acc;color:#fff;font-size:16px;font-weight:600;outline:0;margin-bottom:6px;flex:none}
input.gs-in:focus{border-color:#ffd96a}.gs-err{min-height:1.2em;margin-bottom:8px;color:#fca5a5;font-size:.78rem;font-weight:700}
.gs-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.gs-col{display:grid;gap:10px}
.gs-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:11px;border:1px solid #ffffff22;background:#ffffff12;color:#fff}
.gs-mdcoin{width:56px;height:56px;margin:0 auto 6px}.gs-mdcoin svg{width:100%;height:100%}
.gs-bal{display:flex;gap:10px;justify-content:center;align-items:center;padding:9px;margin-bottom:10px;border-radius:12px;background:#ffffff0c;color:#9aa4d6;font:800 .66rem monospace;letter-spacing:.12em}.gs-bal b{color:#fff;font-size:1.2rem;letter-spacing:0}
.gs-rules{margin:0 0 14px;padding:0;list-style:none;text-align:left;color:#cbd5e1;font-size:.8rem;line-height:1.7}.gs-rules b{color:#ffd96a}
.gs-days{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px}
.gs-day{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 4px;border-radius:12px;border:1px solid #ffffff1a;background:#0a0d30aa}
.gs-day small{font:900 .6rem Inter,sans-serif;color:#ffd96a;letter-spacing:.08em}.gs-day b{display:flex;align-items:center;gap:4px;font-size:.78rem}.gs-day b .gs-coin{width:14px;height:14px}
.gs-gift{width:42px;height:42px}.gs-gift svg{width:100%;height:100%}.gs-day.wide{grid-column:1/-1;flex-direction:row;justify-content:center;gap:14px}
.gs-day.done{opacity:.55}.gs-day.cur{border-color:#ffd96a;box-shadow:0 0 16px #fbbf2488;animation:gsPulse 1.4s ease-in-out infinite}
.gs-chk{position:absolute;top:4px;right:6px;color:#4ade80;font-style:normal;font-weight:900}
.gs-okc{position:relative;width:min(360px,100%);padding:20px 16px 16px;border-radius:26px;text-align:center;color:#fff;border:2px solid var(--rc);background:linear-gradient(160deg,#252b8a,#0b0d38);box-shadow:0 0 50px color-mix(in srgb,var(--rc) 55%,transparent),0 24px 60px #000b;animation:gsPopIn .35s cubic-bezier(.2,.9,.3,1.25) both}
.gs-okc h3{margin:0 0 6px;font-size:1.15rem;font-weight:900;letter-spacing:.12em;background:linear-gradient(180deg,#fff3b0,#f5b301);-webkit-background-clip:text;background-clip:text;color:transparent}
.gs-okc h2{margin:4px 0 2px;font-size:1.3rem;text-transform:uppercase;letter-spacing:.05em}
.gs-okart{position:relative;width:min(230px,60vw);aspect-ratio:1;margin:0 auto}.gs-okart svg{position:relative;width:100%;height:100%;animation:gsArrive .7s cubic-bezier(.2,1.2,.3,1) both}
@keyframes gsArrive{from{opacity:0;transform:scale(.3) rotate(-12deg)}to{opacity:1;transform:none}}
.gs-burst{position:absolute;inset:0;pointer-events:none}.gs-burst i{position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:50%;background:var(--rc);box-shadow:0 0 8px var(--rc);animation:gsB 1s ease-out both}
@keyframes gsB{from{opacity:1;transform:translate(0,0)}to{opacity:0;transform:translate(var(--x),var(--y)) scale(.4)}}
.gs-added{margin:2px 0 10px;color:#4ade80;font-weight:900;font-size:.78rem;letter-spacing:.16em}.gs-q{margin-bottom:10px;color:#cbd5e1;font-size:.9rem}
body.gx-pro .g8-av{border-color:#fbbf24;box-shadow:0 0 18px #fbbf24cc,0 0 34px #7c3aedaa;animation:gsPulse 2.4s ease-in-out infinite}
@media (min-width:820px) and (min-aspect-ratio:5/4){
  .gs-main{flex-direction:row;gap:1em}.gs-list{width:44%;flex:none;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:.8em}
  .gs-card b{font-size:.8em}.gs-tag{font-size:.74em}.gs-det{padding:1em}
}
@media (prefers-reduced-motion:reduce){.gs *,.gs-ok *,.gs-md *{animation:none!important}}
`;
  const st = document.createElement("style"); st.id = "gx-shop-css"; st.textContent = css; document.head.appendChild(st);

  /* ======================= PUERTA PARA EL MENÚ ======================= */
  window.GXShop = {
    openShop: cat => open("shop", cat), openInventory: cat => open("inv", cat), openDaily, openEarn,
    state() {
      const b = activeBoost();
      return { coins: S.wallet ? S.wallet.coins : null, ready: !!S.wallet, dailyReady: !!S.wallet && !dailyState().claimedToday,
        boost: b ? { label: b.label, left: b.left, pro: b.pro, name: b.name } : null };
    },
    hms
  };
})();
