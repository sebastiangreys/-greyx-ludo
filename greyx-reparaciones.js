/* GREYX LUDO — REPARACIONES v2 + DIAGNÓSTICO (reemplaza al archivo anterior)
   A) El widget VIEJO de recompensa diaria se sustituye por el nuevo.
   B) El reclamo diario se hace primero por el Worker (el servidor decide el día y la cantidad);
      si el Worker no responde, se usa el método directo de siempre (Firestore).
   C) El aviso «Sin conexión» de la tienda deja de culpar a tu Internet cuando el fallo es del servidor.
   D) Panel de diagnóstico 🩺 (solo owner, o añade #diag al final de la dirección).
   Cargar como ÚLTIMO script:  <script src="greyx-reparaciones.js?v=2"></script> */
(() => {
  "use strict";
  if (window.__gxRep) return; window.__gxRep = true;
  const G = () => window.GX;
  const BASE = String(window.GX_SHOP_API || "https://greyx-shop.greyx.workers.dev").replace(/\/+$/, "");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(Object.assign(new Error("tiempo agotado"), { name: "Timeout" })), ms))]);
  const toast = (m, bad) => { const t = document.createElement("div"); t.className = "gd-toast" + (bad ? " bad" : ""); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };

  /* ===== A) widget viejo -> nuevo ===== */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest('.gs-md [data-g="daily"]');
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    document.querySelectorAll(".gs-md").forEach(x => x.remove());
    if (window.GXDaily) window.GXDaily.open();
  }, true);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.id === "gsDaily") { n.remove(); if (window.GXDaily) window.GXDaily.open(); }
    // ===== C) mensaje honesto de la tienda =====
    if (n.classList.contains("gs-toast") && /^Sin conexi/i.test(n.textContent) && navigator.onLine)
      n.textContent = "El servidor de la tienda no respondió (no es tu Internet). Si se cobró, lo verificaremos al reintentar.";
  }))).observe(document.body, { childList: true });

  /* ===== B) reclamo diario por el Worker ===== */
  let bypass = false;
  function celebrate(day, gained) {
    const el = document.createElement("div"); el.className = "gd-rw";
    el.innerHTML = `<div class="gd-rwc"><strong>+${gained}</strong><p>RECOMPENSA DEL DÍA ${day}</p><button class="gd-btn" type="button">CONTINUAR</button></div>`;
    el.querySelector("button").onclick = () => el.remove();
    document.body.appendChild(el);
  }
  document.addEventListener("click", async e => {
    const b = e.target.closest && e.target.closest('#gdOv [data-k="claim"]');
    if (!b || bypass || b.disabled) return;
    e.preventDefault(); e.stopImmediatePropagation();
    b.disabled = true;
    try {
      const g = G(), tok = await g.fb.auth.currentUser.getIdToken();
      const r = await timeout(fetch(BASE + "/api/wallet/daily", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: "{}" }), 15000);
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { g.state.gold = j.coins; celebrate(j.day, j.gained); }
      else if (j.code === "already") toast("Ya reclamaste tu recompensa de hoy.");
      else toast(j.message || "No se pudo reclamar.", true);
    } catch (err) {              // el Worker no responde: método directo de siempre
      console.warn("[daily] worker no disponible, uso Firestore", err && err.name);
      bypass = true; b.disabled = false; b.click(); bypass = false;
    }
  }, true);

  /* ===== D) Diagnóstico ===== */
  const logs = [];
  const push = (k, m) => { logs.push(new Date().toLocaleTimeString() + " " + k + ": " + String(m).slice(0, 300)); if (logs.length > 40) logs.shift(); };
  addEventListener("error", e => push("error", e.message));
  addEventListener("unhandledrejection", e => { const r = e.reason; push("promesa", (r && (r.code || r.message)) || r); });
  const ow = console.warn;
  console.warn = function () {
    try { push("aviso", Array.from(arguments).map(a => a && a.code ? a.code + " " + (a.message || "") : a && a.message ? a.message : String(a)).join(" ")); } catch (e) {}
    return ow.apply(console, arguments);
  };
  const st = document.createElement("style");
  st.textContent = `
.gxd-b{position:fixed;left:10px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:1000020;width:42px;height:42px;border-radius:50%;border:1px solid #6d5cffaa;background:#0d1030;color:#fff;font-size:1.1rem;opacity:.75}
.gxd{position:fixed;inset:0;z-index:1000021;overflow-y:auto;background:#05060ff2;color:#fff;font-family:Inter,system-ui,sans-serif;padding:calc(14px + env(safe-area-inset-top,0px)) 14px 30px}
.gxd-in{max-width:520px;margin:0 auto}.gxd h2{margin:0 0 4px}.gxd p{color:#9aa4d6;font-size:.8rem;margin:0 0 12px}
.gxd-r{padding:10px 12px;margin-bottom:8px;border-radius:12px;background:#ffffff0a;border:1px solid #ffffff14;font-size:.76rem;line-height:1.4;word-break:break-word;white-space:pre-wrap}
.gxd-r b{display:block}.gxd-r.ok{border-color:#22c55e77}.gxd-r.no{border-color:#ef444499;background:#ef444414}.gxd-r.wa{border-color:#fbbf2488}
.gxd button.a{width:100%;min-height:46px;margin:6px 0;border:0;border-radius:13px;font:900 .85rem Inter,system-ui,sans-serif;color:#fff;background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
.gxd button.g{background:#ffffff12;border:1px solid #ffffff22}`;
  document.head.appendChild(st);
  const DAY = 86400000, TZ = -4 * 3600000;

  async function run(box) {
    const out = [];
    const draw = () => { box.querySelector(".res").innerHTML = out.map(o => `<div class="gxd-r ${o.st}"><b>${o.st === "ok" ? "✅" : o.st === "no" ? "❌" : "⚠️"} ${esc(o.n)}</b>${esc(o.d)}</div>`).join("") || "Midiendo…"; };
    const add = (st, n, d) => { out.push({ st, n, d }); draw(); };
    draw();
    const g = G(), u = g && g.state.user;
    add(navigator.onLine ? "ok" : "no", "Internet del dispositivo", navigator.onLine ? "Conectado." : "Sin conexión.");
    if (!u) return add("no", "Sesión", "No hay sesión iniciada.");
    add("ok", "Sesión", "UID " + u.uid);

    // Worker: /api/health debe responder {"ok":true,"time":...}. Si falla aquí, el Worker de la tienda NO está desplegado con este código.
    let healthy = false;
    try {
      const t0 = Date.now(), r = await timeout(fetch(BASE + "/api/health", { cache: "no-store" }), 10000), j = await r.json();
      healthy = !!j.ok;
      add("ok", j.local ? "Tienda en modo sin Worker" : "Worker de la tienda /api/health", j.local ? "Las compras las valida Firestore con tus reglas." : "Responde (HTTP " + r.status + ", " + (Date.now() - t0) + " ms).");
      try {
        const tr = await timeout(fetch("https://worldtimeapi.org/api/timezone/Etc/UTC", { cache: "no-store" }), 6000), tj = await tr.json();
        const skew = Math.round(tj.unixtime - Date.now() / 1000);
        add(Math.abs(skew) > 120 ? "no" : "ok", "Reloj del teléfono vs hora real", "Diferencia: " + skew + " s" + (Math.abs(skew) > 120 ? ". El reloj está mal: ponlo en «Automático» (Ajustes → General → Fecha y hora)." : ". Correcto."));
      } catch (e2) { add("wa", "Reloj del teléfono", "No se pudo comparar con la hora real."); }
    } catch (e) {
      add("no", "Worker de la tienda /api/health: NO RESPONDE", e.name + ": " + e.message + "\nEl Worker «greyx-shop» no está desplegado con el código de la tienda (o su nombre/subdominio es otro). Abre esta dirección en el navegador:\n" + BASE + "/api/health\nDebe mostrar {\"ok\":true,...}.");
    }
    if (healthy) {
      try {
        const tok = await g.fb.auth.currentUser.getIdToken(), t0 = performance.now();
        const r = await timeout(fetch(BASE + "/api/wallet/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: "{}" }), 15000);
        const txt = (await r.text()).slice(0, 220);
        add(r.ok ? "ok" : "no", "Worker /api/wallet/sync (con tu sesión)", "HTTP " + r.status + " en " + Math.round(performance.now() - t0) + " ms · " + txt + (r.status === 500 ? "\nError interno: faltan o están mal los secretos FIREBASE_* del Worker." : r.status === 401 ? "\nEl Worker rechaza tu sesión: FIREBASE_PROJECT_ID incorrecto." : ""));
      } catch (e) { add("no", "Worker /api/wallet/sync", e.name + ": " + e.message); }
    }

    try {
      const fs = await g.fsModule(), db = g.fb.db;
      const w = await fs.getDoc(fs.doc(db, "wallet", u.uid));
      if (!w.exists()) add("wa", "Billetera", "No existe todavía.");
      else {
        const d = w.data(), today = Math.floor((Date.now() + TZ) / DAY), dl = d.daily || {};
        const next = dl.lastDay === today - 1 ? (dl.streak % 7) + 1 : 1;
        add("ok", "Billetera (datos reales)", JSON.stringify(d, (k, v) => v && v.toMillis ? v.toMillis() : v));
        add(dl.lastDay !== today ? "ok" : "wa", "Recompensa diaria", dl.lastDay !== today ? "Disponible: día " + next + " (hoy RD = " + today + ")." : "Ya reclamada hoy.");
      }
      const b = await fs.getDoc(fs.doc(db, "bans", u.uid));
      add(b.exists() ? "wa" : "ok", "Sanciones", b.exists() ? "Existe un registro: " + JSON.stringify(b.data(), (k, v) => v && v.toMillis ? v.toMillis() : v) : "Sin registro.");
    } catch (e) { add("no", "Firestore", e.code || e.message); }
    add(logs.length ? "wa" : "ok", "Últimos avisos del juego (" + logs.length + ")", logs.slice(-12).join("\n") || "Ninguno.");
    box.dataset.report = out.map(o => (o.st === "ok" ? "OK " : o.st === "no" ? "FALLO " : "AVISO ") + o.n + " — " + o.d).join("\n");
  }

  function open() {
    if (document.getElementById("gxd")) return;
    const box = document.createElement("div"); box.id = "gxd"; box.className = "gxd";
    box.innerHTML = `<div class="gxd-in"><h2>Diagnóstico</h2><p>Mide la conexión real con la tienda y Firebase. No modifica tus datos.</p>
      <button class="a" data-d="run" type="button">Ejecutar de nuevo</button><button class="a g" data-d="copy" type="button">Copiar informe</button><button class="a g" data-d="close" type="button">Cerrar</button><div class="res">Midiendo…</div></div>`;
    box.addEventListener("click", async e => {
      const b = e.target.closest("[data-d]"); if (!b) return;
      if (b.dataset.d === "close") box.remove();
      else if (b.dataset.d === "run") run(box);
      else if (b.dataset.d === "copy") { try { await navigator.clipboard.writeText(box.dataset.report || ""); b.textContent = "¡Copiado!"; } catch (er) { b.textContent = "No se pudo copiar"; } }
    });
    document.body.appendChild(box); run(box);
  }
  setInterval(() => {
    const g = G(); if (!g) return;
    const show = !!(g.state.isOwner || /#diag/.test(location.hash));
    let b = document.querySelector(".gxd-b");
    if (show && !b) { b = document.createElement("button"); b.className = "gxd-b"; b.type = "button"; b.textContent = "🩺"; b.setAttribute("aria-label", "Diagnóstico"); b.onclick = open; document.body.appendChild(b); }
    else if (!show && b) b.remove();
  }, 1500);
  window.GXDiag = { open };
})();

/* ===================== TIENDA SIN WORKER =====================
   Sustituye las llamadas al Worker (/api/...) por operaciones directas a Firestore.
   El navegador no decide nada: el precio, el saldo y la propiedad de cada artículo los valida Firestore
   con las reglas de «reglas-tienda.txt». Las tarjetas (XP, renombre) y las monedas por partida
   necesitan un servidor: quedan desactivadas con un aviso claro. */
(() => {
  "use strict";
  if (window.__gxLocalShop || window.GX_SHOP_LOCAL !== true) return; window.__gxLocalShop = true;
  const G = () => window.GX;
  const BASE = String(window.GX_SHOP_API || "https://greyx-shop.izturriagasebastian.workers.dev").replace(/\/+$/, "");
  const API = BASE + "/api/";
  const P = {
    dice_gold: ["dice", 2500], dice_crystal: ["dice", 1800], dice_obsidian: ["dice", 2000], dice_celestial: ["dice", 4000],
    token_imperial: ["token", 3000], token_neon: ["token", 1800], token_eclipse: ["token", 2000], token_crystal: ["token", 4000],
    board_imperial: ["board", 5000], board_neon: ["board", 4000], board_sakura: ["board", 3500], board_galactic: ["board", 6000]
  };
  const CARDS = ["card_rename", "card_xp_double", "card_xp_extra", "card_pro"];
  const DAILY = [50, 75, 100, 125, 150, 200, 300], TZ = -4 * 3600000, DAY = 86400000;
  const dayKey = ms => Math.floor((ms + TZ) / DAY);
  const res = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { "Content-Type": "application/json" } });
  const fail = (code, message, s) => res({ ok: false, code, message }, s || 400);
  const SOON = "Esta función se activará pronto: necesita el servidor de la tienda.";

  function mapErr(e) {
    const c = e && e.code;
    if (c === "permission-denied") return fail("rules", "Firebase rechazó la operación (reglas de seguridad). Revisa que publicaste las reglas de la tienda.", 403);
    if (c === "unavailable" || c === "deadline-exceeded") return fail("net", "Sin conexión con Firebase.", 503);
    return fail("server", "Error inesperado: " + (c || (e && e.message)), 500);
  }

  async function handle(path, body) {
    if (path === "/health") return res({ ok: true, local: true, time: Date.now() });
    const g = G(), u = g && g.state.user;
    if (!u) return fail("auth", "Inicia sesión primero.", 401);
    const fs = await g.fsModule(), db = g.fb.db, uid = u.uid;
    const wref = fs.doc(db, "wallet", uid);

    if (path === "/wallet/sync") {
      let s = await fs.getDoc(wref);
      if (!s.exists()) {
        await fs.setDoc(wref, { coins: 500, bonusGiven: true, daily: { streak: 0, lastDay: -99 }, games: { day: -99, count: 0 }, createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp() });
        s = await fs.getDoc(wref);
      }
      return res({ ok: true, coins: s.data().coins, daily: s.data().daily });
    }

    if (path === "/wallet/daily") {
      const s = await fs.getDoc(wref);
      if (!s.exists()) return fail("nowallet", "Tu billetera aún no está lista. Abre la tienda una vez e intenta de nuevo.");
      const w = s.data(), d = w.daily || { streak: 0, lastDay: -99 }, today = dayKey(Date.now());
      if (d.lastDay === today) return fail("already", "Ya reclamaste la recompensa de hoy.");
      const day = d.lastDay === today - 1 ? (d.streak % 7) + 1 : 1, amount = DAILY[day - 1];
      const upd = () => ({ coins: w.coins + amount, daily: { streak: day, lastDay: today }, updatedAt: fs.serverTimestamp() });
      try {
        const b = fs.writeBatch(db);
        b.update(wref, upd());
        b.set(fs.doc(db, "walletTx", uid + "_daily_" + today), { uid, type: "daily", day, coins: amount, at: fs.serverTimestamp() });
        await b.commit();
      } catch (e) {
        if (!e || e.code !== "permission-denied") throw e;
        try { await fs.updateDoc(wref, upd()); }            // segundo intento sin el registro: así sabemos qué regla falla
        catch (e2) {
          if (!e2 || e2.code !== "permission-denied") throw e2;
          const again = await fs.getDoc(wref);
          if (again.exists() && again.data().daily && again.data().daily.lastDay === today) return fail("already", "Ya reclamaste la recompensa de hoy.");
          return fail("rules_wallet", "Las reglas de Firestore rechazan actualizar tu billetera para el reclamo diario. Revisa la regla de wallet.", 403);
        }
      }
      const n = await fs.getDoc(wref);
      return res({ ok: true, day, gained: amount, coins: n.data().coins });
    }

    if (path === "/shop/buy") {
      const id = String(body.productId || ""), tx = String(body.txId || "");
      if (CARDS.includes(id)) return fail("soon", SOON);
      const p = P[id];
      if (!p) return fail("noproduct", "Ese producto no existe.");
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(tx)) return fail("badtx", "Compra no válida.");
      if (Number(body.price) !== p[1]) return fail("price", "El precio cambió. Cierra y vuelve a abrir la tienda.");
      const iref = fs.doc(db, "shopInventory", uid, "items", id), pref = fs.doc(db, "purchases", tx);
      const [ws, is, ps] = await Promise.all([fs.getDoc(wref), fs.getDoc(iref), fs.getDoc(pref)]);
      if (ps.exists()) return res({ ok: true, productId: id, coins: ws.exists() ? ws.data().coins : 0, qty: 1, replay: true });
      if (!ws.exists()) return fail("nowallet", "Tu billetera aún no está lista. Intenta de nuevo.");
      if (is.exists()) return fail("owned", "Ya tienes este producto.");
      if (ws.data().coins < p[1]) return fail("funds", "No tienes suficientes monedas para realizar esta compra.");
      const b = fs.writeBatch(db);
      b.update(wref, { coins: fs.increment(-p[1]), lastBuy: tx, updatedAt: fs.serverTimestamp() });
      b.set(iref, { qty: 1, cat: p[0], acquiredAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp(), lastBuy: tx });
      b.set(pref, { uid, productId: id, price: p[1], at: fs.serverTimestamp() });
      try { await b.commit(); }
      catch (e) {                                            // ¿se aplicó aunque falló la respuesta?
        const again = await fs.getDoc(pref).catch(() => null);
        if (!(again && again.exists())) throw e;
      }
      const n = await fs.getDoc(wref);
      return res({ ok: true, productId: id, coins: n.data().coins, qty: 1 });
    }

    if (path === "/shop/equip") {
      const cat = String(body.category || ""), id = body.productId ? String(body.productId) : null;
      if (!["dice", "token", "board"].includes(cat)) return fail("badcat", "Categoría no válida.");
      if (id && (!P[id] || P[id][0] !== cat)) return fail("noproduct", "Ese producto no existe.");
      const eref = fs.doc(db, "shopEquip", uid), es = await fs.getDoc(eref), cur = es.exists() ? es.data() : {};
      const doc = { dice: cur.dice || null, token: cur.token || null, board: cur.board || null };
      doc[cat] = id;
      try { await fs.setDoc(eref, Object.assign({}, doc, { updatedAt: fs.serverTimestamp() })); }
      catch (e) { if (e && e.code === "permission-denied") return fail("notowned", "No tienes ese artículo.", 403); throw e; }
      return res({ ok: true, equip: doc });
    }

    if (path === "/shop/use" || path === "/shop/rename") return fail("soon", SOON);
    if (path === "/wallet/game") return fail("nocoins", "Las monedas por partida requieren el servidor de la tienda.");
    return fail("notfound", "Ruta no encontrada.", 404);
  }

  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.indexOf(API) !== 0) return origFetch(input, init);
    let body = {}; try { body = JSON.parse((init && init.body) || "{}"); } catch (e) {}
    return handle(url.slice(API.length - 1), body).catch(e => { console.warn("[tienda]", url, e); return mapErr(e); });
  };
})();

/* Redirige la dirección vieja del Worker (la que trae greyx-shop.js) a la real */
(() => {
  const OLD = "https://greyx-shop.izturriagasebastian.workers.dev", NEW = "https://greyx-shop.greyx.workers.dev";
  const f = window.fetch.bind(window);
  window.fetch = function (i, init) { if (typeof i === "string" && i.indexOf(OLD) === 0) i = NEW + i.slice(OLD.length); return f(i, init); };
})();
