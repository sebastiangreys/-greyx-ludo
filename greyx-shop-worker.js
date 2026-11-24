/* GREYX LUDO — SERVIDOR DE LA TIENDA (Cloudflare Worker, módulo ES)
   Esta versión NO usa comillas invertidas, para que se pueda copiar y pegar sin errores.
   Variables necesarias (Settings > Variables and Secrets): FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY */

const PRODUCTS = {
  dice_gold:      { cat: "dice",  price: 2500, perm: true },
  dice_crystal:   { cat: "dice",  price: 1800, perm: true },
  dice_obsidian:  { cat: "dice",  price: 2000, perm: true },
  dice_celestial: { cat: "dice",  price: 4000, perm: true },
  token_imperial: { cat: "token", price: 3000, perm: true },
  token_neon:     { cat: "token", price: 1800, perm: true },
  token_eclipse:  { cat: "token", price: 2000, perm: true },
  token_crystal:  { cat: "token", price: 4000, perm: true },
  board_imperial: { cat: "board", price: 5000, perm: true },
  board_neon:     { cat: "board", price: 4000, perm: true },
  board_sakura:   { cat: "board", price: 3500, perm: true },
  board_galactic: { cat: "board", price: 6000, perm: true },
  card_rename:    { cat: "card",  price: 5500, perm: false, kind: "rename" },
  card_xp_double: { cat: "card",  price: 3000, perm: false, kind: "boost", mult: 1,   hours: 24 },
  card_xp_extra:  { cat: "card",  price: 1800, perm: false, kind: "boost", mult: 0.5, hours: 24 },
  card_pro:       { cat: "card",  price: 4500, perm: false, kind: "boost", mult: 1,   hours: 24, pro: true }
};
const DAILY = [50, 75, 100, 125, 150, 200, 300];
const GAME_COINS = { 1: 100, 2: 60, 3: 35, 4: 20 };
const GAME_LIMIT = 10;
const SIGNUP = 500;
const RESERVED = ["admin", "administrador", "greyx", "ludogreyx", "soporte", "support", "moderador", "mod", "root", "sistema", "system"];
const TZ = -4 * 3600000, DAY = 86400000;
const dayKey = ms => Math.floor((ms + TZ) / DAY);

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Max-Age": "86400" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: Object.assign({ "Content-Type": "application/json" }, CORS) });
const ERR = (code, message, status = 400) => Object.assign(new Error(message), { code, status });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const pubWallet = w => ({ coins: w.coins, daily: w.daily });
const newWallet = now => ({ coins: SIGNUP, bonusGiven: true, daily: { streak: 0, lastDay: -99 }, games: { day: -99, count: 0 }, createdAt: new Date(now), updatedAt: new Date(now) });
const signupTx = (uid, now) => ({ t: "create", path: "walletTx/" + uid + "_signup", data: { uid: uid, type: "signup", coins: SIGNUP, at: new Date(now) } });
const walletWrites = (uid, w, isNew, now) => {
  w.updatedAt = new Date(now);
  const out = [{ t: isNew ? "create" : "set", path: "wallet/" + uid, data: w }];
  if (isNew) out.push(signupTx(uid, now));
  return out;
};
const qtyWrite = (path, inv, qty, now) => qty > 0
  ? { t: "set", path: path, data: { qty: qty, cat: inv.cat, acquiredAt: inv.acquiredAt, updatedAt: new Date(now) } }
  : { t: "del", path: path };

const H = {
  "/wallet/sync": async function (c) {
    const uid = c.uid, store = c.store, now = c.now, key = "wallet/" + uid;
    return store.tx([key], async d => {
      const w = d[key];
      if (w) return { writes: [], result: pubWallet(w) };
      const nw = newWallet(now);
      return { writes: walletWrites(uid, nw, true, now), result: pubWallet(nw) };
    });
  },

  "/wallet/daily": async function (c) {
    const uid = c.uid, store = c.store, now = c.now, key = "wallet/" + uid;
    return store.tx([key], async d => {
      let w = d[key], isNew = false;
      if (!w) { w = newWallet(now); isNew = true; }
      const today = dayKey(now), last = w.daily || { streak: 0, lastDay: -99 };
      if (last.lastDay === today) throw ERR("already", "Ya reclamaste la recompensa de hoy.");
      const day = last.lastDay === today - 1 ? (last.streak % 7) + 1 : 1;
      const amount = DAILY[day - 1];
      w.coins += amount; w.daily = { streak: day, lastDay: today };
      const writes = walletWrites(uid, w, isNew, now);
      writes.push({ t: "create", path: "walletTx/" + uid + "_daily_" + today, data: { uid: uid, type: "daily", day: day, coins: amount, at: new Date(now) } });
      return { writes: writes, result: { day: day, gained: amount, coins: w.coins } };
    });
  },

  "/wallet/game": async function (c) {
    const uid = c.uid, body = c.body, store = c.store, now = c.now;
    const gameId = String(body.gameId || "");
    if (!/^[A-Za-z0-9_-]{8,40}$/.test(gameId)) throw ERR("badgame", "Partida no válida.");
    const P = { w: "wallet/" + uid, m: "matches/" + uid + "_" + gameId, t: "walletTx/" + uid + "_game_" + gameId, b: "boosts/" + uid, s: "stats/" + uid, p: "publicProfiles/" + uid };
    return store.tx(Object.values(P), async d => {
      if (d[P.t]) return { writes: [], result: { already: true, coins: d[P.w] ? d[P.w].coins : 0 } };
      const m = d[P.m];
      if (!m) throw ERR("nomatch", "Partida todavía no registrada.", 404);
      const at = m.at instanceof Date ? m.at.getTime() : now;
      if (now - at > 10 * 60000) throw ERR("expired", "Esa partida ya no se puede reclamar.");
      let w = d[P.w], isNew = false;
      if (!w) { w = newWallet(now); isNew = true; }
      const today = dayKey(now), g = w.games && w.games.day === today ? w.games : { day: today, count: 0 };
      const capped = g.count >= GAME_LIMIT;
      const coins = capped ? 0 : (GAME_COINS[m.place] || 0);
      w.games = { day: today, count: g.count + (coins > 0 ? 1 : 0) };
      w.coins += coins;
      const b = d[P.b];
      let bonus = 0;
      if (b && b.mult > 0 && b.startedAt && b.until && b.startedAt.getTime() <= at && at <= b.until.getTime()) bonus = Math.floor((m.xp || 0) * b.mult);
      const writes = walletWrites(uid, w, isNew, now);
      if (bonus > 0 && d[P.s]) writes.push({ t: "patch", path: P.s, data: { xp: (d[P.s].xp || 0) + bonus } });
      if (bonus > 0 && d[P.p]) writes.push({ t: "patch", path: P.p, data: { xp: (d[P.p].xp || 0) + bonus } });
      writes.push({ t: "create", path: P.t, data: { uid: uid, type: "game", gameId: gameId, place: m.place, players: m.players, coins: coins, bonusXp: bonus, capped: capped, at: new Date(now) } });
      return { writes: writes, result: { gained: coins, coins: w.coins, bonusXp: bonus, capped: capped, count: w.games.count } };
    });
  },

  "/shop/buy": async function (c) {
    const uid = c.uid, body = c.body, store = c.store, now = c.now;
    const id = String(body.productId || ""), p = PRODUCTS[id], txId = String(body.txId || "");
    if (!p) throw ERR("noproduct", "Ese producto no existe.");
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(txId)) throw ERR("badtx", "Compra no válida.");
    const P = { w: "wallet/" + uid, pu: "purchases/" + txId, i: "shopInventory/" + uid + "/items/" + id, bn: "bans/" + uid };
    return store.tx(Object.values(P), async d => {
      const w = d[P.w], pu = d[P.pu], inv = d[P.i];
      if (pu) {
        if (pu.uid !== uid) throw ERR("forbidden", "Operación no permitida.", 403);
        return { writes: [], result: { productId: pu.productId, coins: w ? w.coins : 0, qty: inv ? inv.qty : 1, replay: true } };
      }
      const bn = d[P.bn];
      if (bn && (bn.permanent === true || (bn.until && bn.until.getTime() > now))) throw ERR("banned", "Tu cuenta está suspendida.", 403);
      if (!w) throw ERR("nowallet", "Tu billetera aún no está lista. Intenta de nuevo.");
      if (Number(body.price) !== p.price) throw ERR("price", "El precio cambió. Cierra y vuelve a abrir la tienda.");
      if (p.perm && inv) throw ERR("owned", "Ya tienes este producto.");
      if (w.coins < p.price) throw ERR("funds", "No tienes suficientes monedas para realizar esta compra.");
      w.coins -= p.price;
      const qty = p.perm ? 1 : (inv ? inv.qty : 0) + 1;
      const writes = walletWrites(uid, w, false, now);
      writes.push({ t: inv ? "set" : "create", path: P.i, data: { qty: qty, cat: p.cat, acquiredAt: inv ? inv.acquiredAt : new Date(now), updatedAt: new Date(now) } });
      writes.push({ t: "create", path: P.pu, data: { uid: uid, productId: id, price: p.price, currency: "greyx_coins", at: new Date(now), txId: txId, status: "completed", balanceAfter: w.coins } });
      return { writes: writes, result: { productId: id, coins: w.coins, qty: qty } };
    });
  },

  "/shop/equip": async function (c) {
    const uid = c.uid, body = c.body, store = c.store, now = c.now;
    const cat = String(body.category || ""), id = body.productId ? String(body.productId) : null;
    if (["dice", "token", "board"].indexOf(cat) < 0) throw ERR("badcat", "Categoría no válida.");
    if (id && (!PRODUCTS[id] || PRODUCTS[id].cat !== cat)) throw ERR("noproduct", "Ese producto no existe.");
    const P = { e: "shopEquip/" + uid, i: id ? "shopInventory/" + uid + "/items/" + id : null };
    return store.tx([P.e, P.i].filter(Boolean), async d => {
      if (id && !d[P.i]) throw ERR("notowned", "No tienes ese artículo.", 403);
      const eq = Object.assign({ dice: null, token: null, board: null }, d[P.e] || {});
      eq[cat] = id; eq.updatedAt = new Date(now);
      return { writes: [{ t: "set", path: P.e, data: eq }], result: { equip: { dice: eq.dice, token: eq.token, board: eq.board } } };
    });
  },

  "/shop/use": async function (c) {
    const uid = c.uid, body = c.body, store = c.store, now = c.now;
    const id = String(body.productId || ""), p = PRODUCTS[id];
    if (!p || p.kind !== "boost") throw ERR("noproduct", "Esa tarjeta no se puede utilizar así.");
    const P = { i: "shopInventory/" + uid + "/items/" + id, b: "boosts/" + uid, l: "cardUses/" + uid + "_" + now + "_" + id };
    return store.tx(Object.values(P), async d => {
      const inv = d[P.i], b = d[P.b];
      if (!inv || inv.qty < 1) throw ERR("noqty", "No tienes esa tarjeta.", 403);
      if (b && b.until && b.until.getTime() > now) throw ERR("active", "Ya tienes una tarjeta activa. Espera a que termine.");
      const until = new Date(now + p.hours * 3600000);
      return { writes: [
        { t: "set", path: P.b, data: { cardId: id, mult: p.mult, pro: !!p.pro, startedAt: new Date(now), until: until } },
        qtyWrite(P.i, inv, inv.qty - 1, now),
        { t: "create", path: P.l, data: { uid: uid, cardId: id, at: new Date(now) } }
      ], result: { cardId: id, until: until.getTime(), mult: p.mult, pro: !!p.pro } };
    });
  },

  "/shop/rename": async function (c) {
    const uid = c.uid, body = c.body, store = c.store, now = c.now;
    const name = String(body.name || "").trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw ERR("badname", "Usa 3 a 16 caracteres: letras, números y _.");
    const lower = name.toLowerCase();
    const pre = await store.tx(["users/" + uid], async d => ({ writes: [], result: d["users/" + uid] }));
    if (!pre) throw ERR("noprofile", "Primero crea tu perfil.");
    const oldLower = pre.usernameLower;
    const P = { i: "shopInventory/" + uid + "/items/card_rename", u: "users/" + uid, n: "usernames/" + lower, o: "usernames/" + oldLower, p: "publicProfiles/" + uid, a: "admins/" + uid, l: "cardUses/" + uid + "_" + now + "_card_rename" };
    return store.tx(Array.from(new Set(Object.values(P))), async d => {
      const inv = d[P.i], usr = d[P.u];
      if (!inv || inv.qty < 1) throw ERR("noqty", "No tienes una Tarjeta de Renombre.", 403);
      if (!usr || usr.usernameLower !== oldLower) throw ERR("conflict", "Intenta de nuevo.");
      if (RESERVED.indexOf(lower) >= 0 && !d[P.a]) throw ERR("reserved", "Ese nombre no está disponible.");
      if (name === usr.username) throw ERR("same", "Ese ya es tu nombre actual.");
      const changed = lower !== oldLower;
      if (changed && d[P.n]) throw ERR("taken", "Ese nombre ya está en uso.");
      const writes = [{ t: "patch", path: P.u, data: { username: name, usernameLower: lower, updatedAt: new Date(now) } }];
      if (changed) { writes.push({ t: "create", path: P.n, data: { uid: uid, username: name, avatar: usr.avatar || "a1" } }); writes.push({ t: "del", path: P.o }); }
      else writes.push({ t: "patch", path: P.n, data: { username: name } });
      if (d[P.p]) writes.push({ t: "patch", path: P.p, data: { username: name, usernameLower: lower } });
      writes.push(qtyWrite(P.i, inv, inv.qty - 1, now));
      writes.push({ t: "create", path: P.l, data: { uid: uid, cardId: "card_rename", from: usr.username, to: name, at: new Date(now) } });
      return { writes: writes, result: { username: name, usernameLower: lower } };
    });
  }
};

async function handle(req, env, store) {
  const now = Date.now();
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (url.pathname === "/api/health") return json({ ok: true, time: now });
  if (req.method !== "POST") return json({ ok: false, code: "method" }, 405);
  const route = H[url.pathname.replace(/^\/api/, "")];
  if (!route) return json({ ok: false, code: "notfound", message: "Ruta no encontrada." }, 404);
  let uid;
  try { uid = await verifyIdToken((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env); }
  catch (e) { return json({ ok: false, code: "auth", message: "Sesión no válida. Vuelve a iniciar sesión." }, 401); }
  let body = {};
  try { body = await req.json(); } catch (e) { }
  try { return json(Object.assign({ ok: true }, await route({ uid: uid, body: body, store: store, now: now }))); }
  catch (e) {
    if (e && e.code && e.status) return json({ ok: false, code: e.code, message: e.message }, e.status);
    console.error("shop", e);
    return json({ ok: false, code: "server", message: "Error del servidor. Intenta de nuevo." }, 500);
  }
}

export default {
  async fetch(req, env) {
    try { return await handle(req, env, firestoreStore(env)); }
    catch (e) { console.error("fatal", e); return json({ ok: false, code: "server", message: "Error del servidor." }, 500); }
  }
};

const enc = new TextEncoder();
const b64uToBytes = s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); s += "=".repeat((4 - s.length % 4) % 4); const b = atob(s); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const bytesToB64u = buf => btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const strB64u = s => bytesToB64u(enc.encode(s));
let jwks = { at: 0, keys: [] };

async function verifyIdToken(token, env) {
  const parts = String(token).split(".");
  const h = parts[0], p = parts[1], s = parts[2];
  if (!h || !p || !s) throw new Error("token");
  const head = JSON.parse(new TextDecoder().decode(b64uToBytes(h))), pay = JSON.parse(new TextDecoder().decode(b64uToBytes(p)));
  const pid = env.FIREBASE_PROJECT_ID, now = Math.floor(Date.now() / 1000);
  if (head.alg !== "RS256" || !head.kid) throw new Error("alg");
  if (pay.aud !== pid || pay.iss !== "https://securetoken.google.com/" + pid || !pay.sub || pay.exp < now || pay.iat > now + 300) throw new Error("claims");
  if (Date.now() - jwks.at > 3600000 || !jwks.keys.find(k => k.kid === head.kid)) {
    const r = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
    jwks = { at: Date.now(), keys: (await r.json()).keys || [] };
  }
  const jwk = jwks.keys.find(k => k.kid === head.kid);
  if (!jwk) throw new Error("kid");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64uToBytes(s), enc.encode(h + "." + p));
  if (!ok) throw new Error("firma");
  return pay.sub;
}

let tokCache = { v: null, exp: 0 };
async function accessToken(env) {
  if (tokCache.v && Date.now() < tokCache.exp - 60000) return tokCache.v;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = strB64u(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + strB64u(JSON.stringify({
    iss: env.FIREBASE_CLIENT_EMAIL, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const pem = String(env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const key = await crypto.subtle.importKey("pkcs8", b64uToBytes(pem.replace(/\+/g, "-").replace(/\//g, "_")), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + unsigned + "." + bytesToB64u(sig) });
  const j = await r.json();
  if (!j.access_token) throw new Error("No se pudo autenticar con Firebase: " + JSON.stringify(j));
  tokCache = { v: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokCache.v;
}

const toV = v => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toV) } };
  return { mapValue: { fields: toF(v) } };
};
const toF = o => { const f = {}; for (const k in o) if (o[k] !== undefined) f[k] = toV(o[k]); return f; };
const fromV = v => {
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("mapValue" in v) return fromF(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromV);
  return null;
};
const fromF = f => { const o = {}; for (const k in f) o[k] = fromV(f[k]); return o; };

function firestoreStore(env) {
  const root = "projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)";
  const base = "https://firestore.googleapis.com/v1/" + root + "/documents";
  const nm = p => root + "/documents/" + p;
  const strip = n => n.slice((root + "/documents/").length);
  const call = async (suffix, body) => {
    const r = await fetch(base + suffix, { method: "POST", headers: { Authorization: "Bearer " + await accessToken(env), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.error && j.error.message) || "firestore"); e.fs = j.error && j.error.status; e.http = r.status; throw e; }
    return j;
  };
  const toWrite = w => {
    const name = nm(w.path);
    if (w.t === "del") return { delete: name };
    if (w.t === "patch") return { update: { name: name, fields: toF(w.data) }, updateMask: { fieldPaths: Object.keys(w.data) }, currentDocument: { exists: true } };
    const o = { update: { name: name, fields: toF(w.data) } };
    if (w.t === "create") o.currentDocument = { exists: false };
    return o;
  };
  return {
    async tx(paths, fn) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const begun = await call(":beginTransaction", { options: { readWrite: {} } });
        const transaction = begun.transaction;
        let out;
        try {
          const rows = await call(":batchGet", { documents: paths.map(nm), transaction: transaction });
          const docs = {};
          paths.forEach(p => { docs[p] = null; });
          rows.forEach(r => { if (r.found) docs[strip(r.found.name)] = fromF(r.found.fields || {}); });
          out = await fn(docs);
        } catch (e) { call(":rollback", { transaction: transaction }).catch(() => {}); throw e; }
        if (!out.writes.length) { call(":rollback", { transaction: transaction }).catch(() => {}); return out.result; }
        try { await call(":commit", { transaction: transaction, writes: out.writes.map(toWrite) }); return out.result; }
        catch (e) {
          if (e.fs === "ABORTED" || e.fs === "ALREADY_EXISTS" || e.http === 409) { await sleep(80 * (attempt + 1)); continue; }
          throw e;
        }
      }
      throw ERR("busy", "El servidor está ocupado. Intenta de nuevo.", 503);
    }
  };
}
