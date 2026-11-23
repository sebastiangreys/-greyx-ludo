/* GREYX LUDO — ECONOMÍA SIN WORKER (reglas de Firestore como validador)
   Cargar ANTES de greyx-shop.js.
   - Intercepta las llamadas que greyx-shop.js haría al Worker y las ejecuta contra Firestore.
   - Las reglas de Firebase (firestore.rules) validan precios, saldo, inventario y hora (UTC-4) en el servidor.
   - Expone window.GXEconomy { loadWallet, claimDaily } para el widget de recompensa diaria. */
(() => {
  "use strict";
  if (window.GXEconomy) return;

  const BASE = "https://economy.greyx.invalid";       // dirección ficticia: nunca sale a internet
  window.GX_SHOP_API = BASE;

  const G = () => window.GX;
  const DAY = 86400000, TZ = -4 * 3600000;            // República Dominicana UTC-4
  const dayKey = ms => Math.floor((ms + TZ) / DAY);
  const DAILY = [50, 75, 100, 125, 150, 200, 300];
  const GAME = { 1: 100, 2: 60, 3: 35, 4: 20 }, LIMIT = 10, SIGNUP = 500;

  // Precios oficiales (los mismos están en firestore.rules; si no coinciden, Firebase rechaza)
  const PRODUCTS = {
    dice_gold: { cat: "dice", price: 2500, perm: true }, dice_crystal: { cat: "dice", price: 1800, perm: true },
    dice_obsidian: { cat: "dice", price: 2000, perm: true }, dice_celestial: { cat: "dice", price: 4000, perm: true },
    token_imperial: { cat: "token", price: 3000, perm: true }, token_neon: { cat: "token", price: 1800, perm: true },
    token_eclipse: { cat: "token", price: 2000, perm: true }, token_crystal: { cat: "token", price: 4000, perm: true },
    board_imperial: { cat: "board", price: 5000, perm: true }, board_neon: { cat: "board", price: 4000, perm: true },
    board_sakura: { cat: "board", price: 3500, perm: true }, board_galactic: { cat: "board", price: 6000, perm: true },
    card_rename: { cat: "card", price: 5500, perm: false }, card_xp_double: { cat: "card", price: 3000, perm: false },
    card_xp_extra: { cat: "card", price: 1800, perm: false }, card_pro: { cat: "card", price: 4500, perm: false }
  };

  const E = (code, message, status) => Object.assign(new Error(message), { code, status: status || 400 });

  // Una operación a la vez: evita doble toque y lecturas viejas del saldo
  let chain = Promise.resolve();
  const queue = fn => { const run = chain.then(fn); chain = run.catch(() => {}); return run; };

  function mapErr(e) {
    if (e && e.status) return e;
    const c = (e && e.code) || "";
    if (c === "unavailable" || c === "deadline-exceeded") return E("net", "Sin conexión. Intenta de nuevo.", 503);
    if (c === "permission-denied") return E("rules", "Firebase rechazó la operación (permission-denied). Publica las reglas nuevas.", 403);
    return E("server", (e && e.message) || "Error inesperado.", 500);
  }

  async function ctx() {
    const g = G();
    if (!g || !g.state || !g.state.user || !g.fb || !g.fb.db) throw E("auth", "Inicia sesión primero.", 401);
    return { fs: await g.fsModule(), db: g.fb.db, uid: g.state.user.uid };
  }

  /* ---------- Billetera (se crea una sola vez con el bono de 500) ---------- */
  async function _load() {
    const { fs, db, uid } = await ctx(), ref = fs.doc(db, "wallet", uid);
    let s = await fs.getDoc(ref);
    if (!s.exists()) {
      await fs.setDoc(ref, { coins: SIGNUP, bonusGiven: true, daily: { streak: 0, lastDay: -99 }, games: { day: -99, count: 0 }, createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp() });
      s = await fs.getDoc(ref);
    }
    const d = s.data();
    return { fs, db, uid, ref, w: { coins: d.coins, daily: d.daily || { streak: 0, lastDay: -99 }, games: d.games || { day: -99, count: 0 } } };
  }

  /* ---------- Recompensa diaria ---------- */
  async function _daily() {
    const { fs, db, uid, ref, w } = await _load(), today = dayKey(Date.now()), d = w.daily;
    if (d.lastDay === today) throw E("already", "Ya reclamaste hoy.");
    const day = d.lastDay === today - 1 ? (d.streak % 7) + 1 : 1, amount = DAILY[day - 1];
    try {
      await fs.updateDoc(ref, { coins: w.coins + amount, daily: { streak: day, lastDay: today }, updatedAt: fs.serverTimestamp() });
    } catch (e) {
      if (e.code === "permission-denied") {
        const again = await fs.getDoc(ref);
        if (again.exists() && again.data().daily && again.data().daily.lastDay === today) throw E("already", "Ya reclamaste hoy.");
        throw E("rules", "Firebase rechazó el reclamo (permission-denied). Publica las reglas nuevas y deja la hora del teléfono en automático.", 403);
      }
      throw e;
    }
    try {                                   // registro de auditoría (si falla, las monedas ya están bien)
      await fs.setDoc(fs.doc(db, "walletTx", uid + "_daily_" + today), { uid, type: "daily", day, coins: amount, at: fs.serverTimestamp() });
    } catch (e) { console.warn("[economy] registro diario", e.code); }
    return { day, gained: amount, coins: w.coins + amount };
  }

  /* ---------- Compra (atómica: saldo + inventario + historial en un solo lote) ---------- */
  async function _buy(body) {
    const id = String(body.productId || ""), txId = String(body.txId || ""), p = PRODUCTS[id];
    if (!p) throw E("noproduct", "Ese producto no existe.");
    if (!p.perm) throw E("soon", "Las tarjetas se activan muy pronto. Todavía no están a la venta.");
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(txId)) throw E("badtx", "Compra no válida.");
    if (Number(body.price) !== p.price) throw E("price", "El precio cambió. Cierra y vuelve a abrir la tienda.");
    const { fs, db, uid, ref, w } = await _load();
    const pRef = fs.doc(db, "purchases", txId), iRef = fs.doc(db, "shopInventory", uid, "items", id);
    const [pS, iS] = await Promise.all([fs.getDoc(pRef), fs.getDoc(iRef)]);
    if (pS.exists()) {                      // el mismo envío repetido: no se cobra otra vez
      if (pS.data().uid !== uid) throw E("forbidden", "Operación no permitida.", 403);
      return { productId: pS.data().productId, coins: w.coins, qty: 1, replay: true };
    }
    if (iS.exists()) throw E("owned", "Ya tienes este producto.");
    if (w.coins < p.price) throw E("funds", "No tienes suficientes monedas para realizar esta compra.");
    const left = w.coins - p.price, b = fs.writeBatch(db);
    b.update(ref, { coins: left, lastBuy: txId, updatedAt: fs.serverTimestamp() });
    b.set(pRef, { uid, productId: id, price: p.price, currency: "greyx_coins", at: fs.serverTimestamp(), txId, status: "completed", balanceAfter: left });
    b.set(iRef, { qty: 1, cat: p.cat, acquiredAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp() });
    try { await b.commit(); }
    catch (e) {
      if (e.code === "permission-denied" || e.code === "already-exists") {
        const again = await fs.getDoc(pRef).catch(() => null);
        if (again && again.exists()) return { productId: id, coins: left, qty: 1, replay: true };
        throw E("rules", "Firebase rechazó la compra (" + e.code + "). Publica las reglas nuevas e intenta otra vez.", 403);
      }
      throw e;
    }
    return { productId: id, coins: left, qty: 1 };
  }

  /* ---------- Equipar / desequipar ---------- */
  async function _equip(body) {
    const cat = String(body.category || ""), id = body.productId ? String(body.productId) : null;
    if (!["dice", "token", "board"].includes(cat)) throw E("badcat", "Categoría no válida.");
    if (id && (!PRODUCTS[id] || PRODUCTS[id].cat !== cat)) throw E("noproduct", "Ese producto no existe.");
    const { fs, db, uid } = await ctx(), ref = fs.doc(db, "shopEquip", uid);
    if (id) {
      const i = await fs.getDoc(fs.doc(db, "shopInventory", uid, "items", id));
      if (!i.exists()) throw E("notowned", "No tienes ese artículo.", 403);
    }
    const s = await fs.getDoc(ref), cur = s.exists() ? s.data() : {};
    const eq = { dice: cur.dice || null, token: cur.token || null, board: cur.board || null };
    eq[cat] = id;
    await fs.setDoc(ref, { dice: eq.dice, token: eq.token, board: eq.board, updatedAt: fs.serverTimestamp() });
    return { equip: eq };
  }

  /* ---------- Monedas por partida terminada (máx. 10 al día) ---------- */
  async function _game(body) {
    const gameId = String(body.gameId || "");
    if (!/^[A-Za-z0-9_-]{8,40}$/.test(gameId)) throw E("badgame", "Partida no válida.");
    const { fs, db, uid, ref, w } = await _load();
    const txRef = fs.doc(db, "walletTx", uid + "_game_" + gameId);
    const [tS, mS] = await Promise.all([fs.getDoc(txRef), fs.getDoc(fs.doc(db, "matches", uid + "_" + gameId))]);
    if (tS.exists()) return { already: true, coins: w.coins };
    if (!mS.exists()) throw E("nomatch", "Partida todavía no registrada.", 404);
    const m = mS.data(), at = m.at && m.at.toMillis ? m.at.toMillis() : Date.now();
    if (Date.now() - at > 10 * 60000) throw E("expired", "Esa partida ya no se puede reclamar.");
    const today = dayKey(Date.now()), g = w.games.day === today ? w.games : { day: today, count: 0 };
    if (g.count >= LIMIT) return { gained: 0, coins: w.coins, bonusXp: 0, capped: true, count: g.count };
    const coins = GAME[m.place] || 0;
    if (!coins) return { gained: 0, coins: w.coins, bonusXp: 0, capped: false, count: g.count };
    const b = fs.writeBatch(db);
    b.update(ref, { coins: w.coins + coins, games: { day: today, count: g.count + 1 }, lastGame: gameId, updatedAt: fs.serverTimestamp() });
    b.set(txRef, { uid, type: "game", gameId, place: m.place, coins, at: fs.serverTimestamp() });
    await b.commit();
    return { gained: coins, coins: w.coins + coins, bonusXp: 0, capped: false, count: g.count + 1 };
  }

  const soon = () => { throw E("soon", "Las tarjetas se activan muy pronto.", 400); };
  const ROUTES = {
    "/wallet/sync": async () => { const x = await _load(); return { coins: x.w.coins, daily: x.w.daily }; },
    "/wallet/daily": _daily,
    "/wallet/game": _game,
    "/shop/buy": _buy,
    "/shop/equip": _equip,
    "/shop/use": soon,
    "/shop/rename": soon
  };
  const run = (path, body) => {
    const fn = ROUTES[path];
    if (!fn) return Promise.reject(E("notfound", "Ruta no encontrada.", 404));
    return queue(() => fn(body || {})).catch(e => { throw mapErr(e); });
  };

  /* ---------- Intercepta las llamadas de greyx-shop.js ---------- */
  const realFetch = window.fetch.bind(window);
  const reply = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.indexOf(BASE) !== 0) return realFetch(input, init);
    const path = url.slice(BASE.length).replace(/^\/api/, "");
    let body = {};
    try { body = JSON.parse((init && init.body) || "{}"); } catch (e) {}
    return run(path, body)
      .then(r => reply(Object.assign({ ok: true }, r), 200))
      .catch(e => reply({ ok: false, code: e.code || "server", message: e.message || "Error" }, e.status || 400));
  };

  window.GXEconomy = {
    loadWallet: () => run("/wallet/sync").then(r => ({ coins: r.coins, daily: r.daily })),
    claimDaily: () => run("/wallet/daily")
  };
})();
