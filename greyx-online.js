/* GREYX LUDO — Partida online sincronizada (Fase 2B)
   Conecta la sala con el servidor de Cloudflare y dibuja el tablero con su estado. */
(() => {
  "use strict";

  const RAW = "PEGA_AQUI_TU_DIRECCION";
  const SERVER = (/^https?:/.test(RAW) ? RAW : "https://" + RAW).replace(/\/+$/, "");
  const WS_BASE = SERVER.replace(/^http/, "ws");

  const G = () => window.GX;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const O = {
    ws: null, room: null, you: null, snap: null, v: -1,
    q: Promise.resolve(), retry: 0, timer: null, closing: false,
    lastRoll: null, note: "", finished: false
  };

  const ERR = {
    auth: "No se pudo verificar tu cuenta. Recarga el juego.",
    notmember: "No perteneces a esta sala.",
    started: "La partida ya empezó.",
    nothost: "Solo el anfitrión puede iniciar.",
    notfull: "Faltan jugadores en la sala.",
    notready: "Algún jugador aún no está conectado. Espera unos segundos.",
    members: "La sala tiene un problema. Ciérrala y crea otra.",
    noroom: "No se encontró la sala.",
    turn: "No es tu turno.",
    phase: "Acción no válida ahora.",
    move: "Movimiento no válido.",
    nogame: "No hay partida activa.",
    server: "Error del servidor. Intenta de nuevo."
  };

  const st0 = document.createElement("style");
  st0.textContent = `
  .ol-toast{position:fixed;left:50%;bottom:calc(110px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:1200;
    padding:12px 18px;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 .82rem Inter,system-ui,sans-serif;
    box-shadow:0 10px 30px #000c;max-width:90vw;text-align:center}
  .ol-back{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:995;
    padding:14px 22px;border:0;border-radius:99px;color:#fff;font:900 .9rem Inter,system-ui,sans-serif;
    background:linear-gradient(135deg,#34d399,#059669);box-shadow:0 5px 0 #065f46,0 12px 28px #000a}
  `;
  document.head.appendChild(st0);

  function toast(m) {
    const t = document.createElement("div");
    t.className = "ol-toast"; t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  /* ---------- Conexión ---------- */
  async function token() {
    const u = G() && G().fb && G().fb.auth && G().fb.auth.currentUser;
    return u ? u.getIdToken() : null;
  }

  function send(o) {
    if (O.ws && O.ws.readyState === 1) { O.ws.send(JSON.stringify(o)); return true; }
    return false;
  }

  function later() {
    if (!O.room || O.closing) return;
    clearTimeout(O.timer);
    O.retry++;
    O.timer = setTimeout(connect, Math.min(8000, 1000 * O.retry));
  }

  function connect() {
    if (!O.room || O.closing) return;
    if (O.ws && O.ws.readyState <= 1) return;
    let ws;
    try { ws = new WebSocket(WS_BASE + "/ws?room=" + O.room); }
    catch (e) { return later(); }
    O.ws = ws;
    ws.onopen = async () => {
      O.retry = 0;
      const t = await token();
      if (t) send({ t: "auth", token: t });
    };
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      onMsg(m);
    };
    ws.onclose = ev => {
      if (O.ws === ws) O.ws = null;
      if (ev && ev.code === 4403) { O.room = null; return; }
      later();
    };
    ws.onerror = () => {};
  }

  function closeAll() {
    O.closing = true;
    clearTimeout(O.timer);
    if (O.ws) { try { O.ws.close(); } catch (e) {} }
    O.ws = null; O.room = null; O.snap = null; O.v = -1;
    O.finished = false; O.note = ""; O.lastRoll = null;
    O.closing = false;
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && O.room && (!O.ws || O.ws.readyState > 1)) connect();
  });

  /* ---------- Mensajes del servidor ---------- */
  const enqueue = fn => { O.q = O.q.then(fn).catch(e => console.warn("online", e)); };
  const mineNow = s => !!(s && O.you && s.phase !== "over" && s.players[s.turn] === O.you.color);

  function onMsg(m) {
    const g = G();
    if (m.t === "hello") {
      O.you = m.you;
      if (m.started && m.snap) {
        if (g.state.phase === "playing") enqueue(() => applySnap(m.snap));
        else { O.snap = m.snap; O.v = m.snap.v; }
      }
    } else if (m.t === "start") {
      enqueue(() => beginGame(m.snap));
    } else if (m.t === "ev") {
      enqueue(() => handleEv(m));
    } else if (m.t === "err") {
      if (ERR[m.code]) toast(ERR[m.code]);
    }
  }

  /* ---------- Pintar el estado del servidor en tu tablero ---------- */
  function msgFor(s) {
    if (s.phase === "over") return "Partida terminada.";
    const cur = s.players[s.turn];
    if (mineNow(s)) {
      if (s.phase === "roll") return "Tu turno. Lanza el dado.";
      return s.valid.length === 1 ? "Moviendo…" : "Elige una ficha iluminada.";
    }
    return "Turno de " + (s.names[cur] || cur) + ".";
  }

  function applySnap(s) {
    const g = G(), st = g.state;
    if (!s || s.v < O.v) return;
    O.snap = s; O.v = s.v;
    const me = O.you && O.you.color;

    const tk = {};
    ["red", "green", "yellow", "blue"].forEach(c => {
      tk[c] = [0, 1, 2, 3].map(id => ({ id, progress: -1 }));
    });
    s.players.forEach(c => { tk[c] = s.tokens[c].map((p, i) => ({ id: i, progress: p })); });

    st.mode = "local"; st.humanColor = me;
    st.players = s.players.slice(); st.count = s.players.length;
    st.tokens = tk; st.active = s.turn;
    st.playerNames = { red: "", green: "", yellow: "", blue: "" };
    Object.keys(s.names).forEach(c => { st.playerNames[c] = s.names[c]; });
    st.finishedOrder = (s.finished || []).slice();

    const mine = mineNow(s);
    st.roll = (mine && s.phase === "move") ? s.roll : null;
    st.lastRoll = s.roll || O.lastRoll;
    st.rolling = false; st.moving = false; st.hop = null; st.arrived = null;
    st.valid = new Set(mine && s.phase === "move" ? s.valid.map(i => me + "-" + i) : []);
    st.message = (O.note ? O.note + " " : "") + msgFor(s);

    if (s.phase === "over") return showResult(s);
    g.render();

    if (mine && s.phase === "move" && s.valid.length === 1) {
      const v = s.v, id = s.valid[0];
      setTimeout(() => { if (O.snap && O.snap.v === v) send({ t: "move", id }); }, 450);
    }
  }

  function beginGame(s) {
    if (!s || s.phase === "over") return;
    const st = G().state;
    O.note = ""; O.lastRoll = null; O.finished = false; O.v = -1;
    st.settingsOpen = false; st.showFriends = false; st.showOnline = false;
    st.showAuth = false; st.showProfile = null; st.celebrating = false;
    st.winner = null; st.ranking = null;
    st.phase = "playing"; st.setupStep = 1;
    if (window.GreyxRooms) GreyxRooms.hide();
    applySnap(s);
  }

  async function animateMove(e) {
    const g = G(), st = g.state;
    const steps = [];
    if (e.from === -1) steps.push(0);
    else for (let p = e.from + 1; p <= e.to; p++) steps.push(p);
    for (const p of steps) {
      st.tokens[e.color][e.id] = { id: e.id, progress: p };
      st.hop = { color: e.color, id: e.id };
      g.render();
      await wait(150);
    }
    st.hop = null;
  }

  async function handleEv(m) {
    const g = G(), st = g.state, s = m.snap;
    if (st.phase !== "playing") { O.snap = s; O.v = s.v; return; }
    const nm = c => (s.names[c] || c);
    for (const e of m.evs) {
      if (e.type === "roll" || e.type === "pass") { O.lastRoll = e.n; st.lastRoll = e.n; }
      if (e.type === "pass") O.note = nm(e.color) + " sacó " + e.n + ": sin movimientos.";
      if (e.type === "timeout") {
        O.note = e.left ? nm(e.color) + " abandonó la partida." : nm(e.color) + " se tardó: jugó el servidor.";
      }
      if (e.type === "move") {
        O.note = e.captured && e.captured.length ? "¡Captura!" : (e.goal ? "¡Ficha en la meta!" : "");
        await animateMove(e);
      }
      if (e.type === "finish") O.note = nm(e.color) + " terminó en " + e.place + "º lugar.";
    }
    applySnap(s);
  }

  function showResult(s) {
    const g = G(), st = g.state;
    const order = s.ranking.map(r => r.color);
    st.ranking = order; st.finishedOrder = order.slice();
    st.winner = order[0]; st.valid = new Set(); st.roll = null;
    st.phase = "winner";
    g.render();
    if (!O.finished) {
      O.finished = true;
      if (window.GreyxRooms) GreyxRooms.finish();
    }
  }

  /* ---------- Tus toques: ahora se mandan al servidor ---------- */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-action]");
    if (!b || !O.snap) return;
    const st = G().state, a = b.dataset.action, s = O.snap;

    if (st.phase === "playing") {
      if (a === "roll") {
        e.preventDefault(); e.stopImmediatePropagation();
        if (mineNow(s) && s.phase === "roll") send({ t: "roll" });
        return;
      }
      if (a === "token") {
        e.preventDefault(); e.stopImmediatePropagation();
        if (mineNow(s) && s.phase === "move" && b.dataset.color === O.you.color) {
          send({ t: "move", id: Number(b.dataset.token) });
        }
        return;
      }
      if (a === "settings-new-game") {
        e.preventDefault(); e.stopImmediatePropagation();
        toast("No disponible en partidas online.");
        return;
      }
    }
    if (st.phase === "winner" && a === "again") {
      e.preventDefault(); e.stopImmediatePropagation();
      const back = document.querySelector('[data-action="setup"]');
      if (back) back.click();
    }
  }, true);

  new MutationObserver(() => {
    const b = document.querySelector(".roll-button");
    if (!b || !O.snap || G().state.phase !== "playing") return;
    if (!(mineNow(O.snap) && O.snap.phase === "roll")) b.disabled = true;
  }).observe(document.getElementById("app"), { childList: true, subtree: true });

  /* ---------- "Volver a la partida" y limpieza ---------- */
  setInterval(() => {
    const g = G();
    if (!g || !g.state) return;
    const st = g.state;
    let btn = document.querySelector(".ol-back");

    const running = O.snap && O.snap.phase !== "over" && st.phase === "setup";
    if (running && !btn) {
      btn = document.createElement("button");
      btn.className = "ol-back"; btn.type = "button";
      btn.textContent = "▶ Volver a la partida";
      btn.addEventListener("click", () => { enqueue(() => beginGame(O.snap)); });
      document.body.appendChild(btn);
    } else if (!running && btn) btn.remove();

    if (O.snap && O.snap.phase === "over" && st.phase === "setup") closeAll();
  }, 700);

  /* ---------- API para greyx-rooms.js ---------- */
  window.GreyxOnline = {
    attach(roomId) {
      if (O.room === roomId && O.ws) return;
      O.room = roomId; O.closing = false; O.retry = 0;
      connect();
    },
    detach(force) {
      if (!force && O.snap && O.snap.phase !== "over") return;
      closeAll();
    },
    async start() {
      if (!O.ws || O.ws.readyState !== 1) { toast("Conectando con el servidor…"); connect(); return; }
      const t = await token();
      if (!t) return toast(ERR.auth);
      send({ t: "start", token: t });
    }
  };
})();
