/* GREYX LUDO — Presencia en tiempo real (Realtime Database)
   - Cada jugador con sesión iniciada escribe presence/{uid}
   - onDisconnect lo marca offline si se cierra la app o se pierde la conexión
   - Un latido cada 45 s detecta conexiones que dejaron de responder (>150 s)
   - También pone el estado "online" de la lista de amigos */
(() => {
  "use strict";

  // === CAMBIA ESTO si la URL de tu Realtime Database es otra ===
  // (la ves arriba de la pestaña "Datos" en Firebase → Realtime Database)
  const DB_URL = "https://ludo-greyx-default-rtdb.firebaseio.com";

  const BASE = "https://www.gstatic.com/firebasejs/10.12.2/";
  const BEAT = 45000;
  const STALE = 150000;

  const G = () => window.GX;
  let mod = null, db = null, loading = null;
  let uidNow = null, ref = null, beatTimer = null, unsubConn = null;
  let lastScreen = null, lastFriendsList = null, lastFriendsAt = 0;

  async function load() {
    if (db) return { db, mod };
    if (loading) return loading;
    loading = (async () => {
      const g = G();
      if (!g || !g.fb || !g.fb.auth) return { db: null, mod: null };
      try {
        mod = await import(BASE + "firebase-database.js");
        db = mod.getDatabase(g.fb.auth.app, DB_URL);
      } catch (e) {
        console.warn("presence load", e);
        mod = null; db = null;
      }
      return { db, mod };
    })();
    const r = await loading;
    loading = null;
    return r;
  }

  const screen = () => (G().state.phase === "playing" ? "game" : "menu");
  const who = () => {
    const p = G().state.profile || {};
    return { name: String(p.username || "").slice(0, 16), avatar: String(p.avatar || "a1").slice(0, 4) };
  };
  const onlineData = () => Object.assign(
    { state: "online", last: mod.serverTimestamp(), screen: screen() }, who());
  const offlineData = () => Object.assign(
    { state: "offline", last: mod.serverTimestamp(), screen: "menu" }, who());

  async function start(uid) {
    ref = mod.ref(db, "presence/" + uid);
    lastScreen = screen();

    unsubConn = mod.onValue(mod.ref(db, ".info/connected"), snap => {
      if (snap.val() !== true || !ref) return;
      mod.onDisconnect(ref).set(offlineData())
        .then(() => mod.set(ref, onlineData()))
        .catch(e => console.warn("presence connect", e));
    });

    beatTimer = setInterval(beat, BEAT);
  }

  function beat() {
    if (!ref || !mod) return;
    mod.update(ref, onlineData()).catch(e => console.warn("presence beat", e));
  }

  async function goOffline() {
    if (!ref || !mod) return;
    try {
      await mod.onDisconnect(ref).cancel();
      await mod.set(ref, offlineData());
    } catch (e) { /* si ya no hay sesión, onDisconnect se encarga */ }
  }

  function stop() {
    if (unsubConn) { try { unsubConn(); } catch (e) {} unsubConn = null; }
    if (beatTimer) { clearInterval(beatTimer); beatTimer = null; }
    ref = null;
  }

  // Marca offline ANTES de cerrar sesión (después ya no habría permiso)
  function wrapSignOut() {
    const g = G();
    if (!g || !g.fb || g.fb._gxPresenceWrapped || typeof g.fb.signOut !== "function") return;
    const orig = g.fb.signOut;
    g.fb.signOut = async (...args) => {
      await goOffline();
      stop();
      uidNow = null;
      return orig.apply(g.fb, args);
    };
    g.fb._gxPresenceWrapped = true;
  }

  // Estado "en línea" de los amigos, tomado de presence
  async function refreshFriends() {
    const g = G();
    if (!g || !db || !g.state.showFriends) return;
    const list = g.state.friendsList || [];
    lastFriendsList = list;
    lastFriendsAt = Date.now();
    if (!list.length) return;
    const now = Date.now();
    let changed = false;
    await Promise.all(list.map(async f => {
      try {
        const v = (await mod.get(mod.ref(db, "presence/" + f.uid))).val();
        const on = !!(v && v.state === "online" && now - (v.last || 0) < STALE);
        if (f.online !== on) { f.online = on; changed = true; }
      } catch (e) {}
    }));
    if (changed) g.render();
  }

  setInterval(async () => {
    const g = G();
    if (!g || !g.state) return;
    wrapSignOut();

    const uid = g.state.user ? g.state.user.uid : null;

    if (uid !== uidNow) {
      if (uidNow) { stop(); }
      uidNow = uid;
      if (uid) {
        const r = await load();
        if (r.db && uidNow === uid) start(uid);
      }
      return;
    }

    if (!uid || !db) return;

    // Cambió entre menú y partida
    const sc = screen();
    if (sc !== lastScreen) { lastScreen = sc; beat(); }

    // Amigos: refrescar al abrir la lista, al cambiar y cada 15 s
    if (g.state.showFriends) {
      const changedList = g.state.friendsList !== lastFriendsList;
      if (changedList || Date.now() - lastFriendsAt > 15000) refreshFriends();
    } else {
      lastFriendsList = null;
    }
  }, 2000);

  // Para el panel de administrador
  window.GXPresence = { get: load, stale: STALE };
})();
