/* GREYX LUDO — Salas con amigos (Fase 1)
   Salas, invitaciones y sala de espera en tiempo real.
   Requiere window.GX (HTML principal) y las reglas de rooms/roomInvites/userRoom. */
(() => {
  "use strict";

  const G = () => window.GX;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  const SLOTS = {
    2: ["red", "yellow"],
    3: ["red", "green", "yellow"],
    4: ["red", "green", "yellow", "blue"]
  };
  const NAMES = { red: "CORAL", green: "PRADERA", yellow: "SOL", blue: "PUERTO" };
  const HEX = { red: "#ef4444", green: "#10b981", yellow: "#f59e0b", blue: "#3b82f6" };

  const INVITE_MS = 4 * 60 * 1000;     // vigencia de la invitación
  const BEAT_MS = 30000;               // latido de conexión
  const ONLINE_MS = 75000;             // "conectado" si hubo latido reciente
  const MAX_AGE = 2 * 3600 * 1000;     // una sala vieja se descarta al volver

  const R = {
    uid: null, fs: null, db: null,
    roomId: null, color: null, room: null, members: {}, seenMe: false,
    view: "hidden", mode: 4, msg: "", friends: null, pub: {},
    incoming: [], outgoing: [], unsubUser: [], unsubRoom: [], hb: null, busy: false
  };

  const ts = t => (t && t.toMillis) ? t.toMillis() : (t ? +t : 0);

  function rid() {
    const a = new Uint8Array(10);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  }

  /* ---------- Estilos ---------- */
  const st = document.createElement("style");
  st.textContent = `
  .rm{position:fixed;inset:0;z-index:960;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#F7F1E6;
    background:radial-gradient(circle at 50% 0,#7C3AED55,transparent 55%),linear-gradient(180deg,#11132E,#070a1c);
    padding:calc(12px + env(safe-area-inset-top,0px)) 14px calc(28px + env(safe-area-inset-bottom,0px));
    font-family:Inter,system-ui,-apple-system,sans-serif;animation:rmIn .25s ease both}
  @keyframes rmIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  .rm-in{max-width:460px;margin:0 auto}
  .rm button{font:inherit;cursor:pointer}
  .rm-top{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;margin-bottom:12px}
  .rm-top h1{margin:0;text-align:center;font-size:1.1rem;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rm-ib{width:42px;height:42px;border-radius:14px;border:1px solid #ffffff22;background:#263B7899;color:#fff;font-size:1.1rem;padding:0}
  .rm-sub{margin:0 0 14px;text-align:center;color:#9aa3c8;font-size:.8rem}
  .rm-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:8px 0 16px}
  .rm-mode{padding:18px 4px;border-radius:20px;border:1.5px solid #ffffff1c;background:#ffffff08;color:#fff;text-align:center}
  .rm-mode b{display:block;font-size:2rem;line-height:1}
  .rm-mode span{display:block;margin-top:6px;color:#9aa3c8;font:700 .6rem monospace;letter-spacing:.08em}
  .rm-mode.sel{border-color:#A78BFA;background:#7C3AED33;box-shadow:0 0 22px #7C3AED55}
  .rm-main{width:100%;min-height:56px;border:0;border-radius:18px;color:#fff;font-weight:900;letter-spacing:.04em;
    background:linear-gradient(135deg,#A78BFA,#7C3AED);box-shadow:0 5px 0 #3b1d8f}
  .rm-main:disabled{opacity:.45;box-shadow:0 3px 0 #3b1d8f;cursor:not-allowed}
  .rm-main:active:not(:disabled){transform:translateY(4px);box-shadow:0 1px 0 #3b1d8f}
  .rm-ghost{width:100%;min-height:48px;margin-top:10px;border-radius:16px;border:1.5px dashed #7c3aed88;background:transparent;color:#c4b5fd;font-weight:800}
  .rm-ghost:disabled{opacity:.4;cursor:not-allowed}
  .rm-danger{width:100%;min-height:46px;margin-top:10px;border-radius:16px;border:1px solid #ef444466;background:#ef444414;color:#fca5a5;font-weight:800}
  .rm-msg{margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#ffffff10;color:#e2e8f0;font-size:.8rem;text-align:center}
  .rm-hint{margin:8px 0 0;text-align:center;color:#8e97b8;font-size:.72rem;line-height:1.4}
  .rm-slots{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:6px 0 14px}
  .rm-slot{min-height:150px;border-radius:22px;border:2px solid var(--c);padding:12px 8px;text-align:center;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}
  .rm-slot.taken{background:linear-gradient(160deg,#ffffff14,#ffffff05);box-shadow:0 0 20px color-mix(in srgb,var(--c) 40%,transparent)}
  .rm-slot.empty{border-style:dashed;opacity:.55}
  .rm-slot small{font:800 .58rem monospace;letter-spacing:.14em;color:var(--c)}
  .rm-av{position:relative;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;font-size:1.9rem;
    background:radial-gradient(circle at 35% 30%,#3b3f75,#12152c);border:3px solid var(--c)}
  .rm-dot{position:absolute;right:-2px;bottom:-2px;width:14px;height:14px;border-radius:50%;background:#64748b;border:2px solid #0f1326}
  .rm-dot.on{background:#22c55e;box-shadow:0 0 8px #22c55e}
  .rm-slot b{font-size:.78rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rm-slot em{font-style:normal;font-size:.64rem;color:#aab3d6}
  .rm-plus{width:52px;height:52px;border-radius:50%;border:2px dashed var(--c);display:grid;place-items:center;font-size:1.5rem;color:var(--c)}
  .rm-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;margin-bottom:8px;background:#0005;border:1px solid #ffffff12}
  .rm-row .a{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:1.3rem;background:#1b1f45;border:2px solid #a78bfa88;flex:none}
  .rm-row .i{flex:1;min-width:0}
  .rm-row .i b{display:block;font-size:.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rm-row .i small{color:#9aa3c8;font-size:.66rem}
  .rm-sm{flex:none;min-height:36px;padding:0 14px;border:0;border-radius:12px;color:#fff;font-weight:900;font-size:.74rem;
    background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 3px 0 #3b1d8f}
  .rm-sm.no{background:#334155;box-shadow:0 3px 0 #1e293b}
  .rm-sm:disabled{opacity:.4}
  .rm-h{font:800 .68rem monospace;letter-spacing:.14em;color:#A78BFA;margin:14px 2px 8px;text-transform:uppercase}
  .inv{position:fixed;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top,0px));z-index:990;max-width:440px;margin:0 auto;
    padding:12px 14px;border-radius:18px;color:#fff;border:1px solid #a78bfa;background:linear-gradient(160deg,#2a2155,#12142e);
    box-shadow:0 14px 34px #000c;animation:rmIn .25s ease both}
  .inv-t{font-size:.84rem;line-height:1.35}
  .inv-b{display:flex;gap:8px;margin-top:10px}
  .inv-b button{flex:1;min-height:40px;border:0;border-radius:12px;font-weight:900;color:#fff;background:#334155}
  .inv-b button.ok{background:linear-gradient(135deg,#34d399,#059669)}
  .rm-toast{position:fixed;left:50%;bottom:calc(30px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:1000;
    padding:12px 18px;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font-weight:800;font-size:.82rem;
    box-shadow:0 10px 30px #000c;max-width:90vw;text-align:center}
  `;
  document.head.appendChild(st);

  function toast(m) {
    const t = document.createElement("div");
    t.className = "rm-toast"; t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  /* ---------- Sesión ---------- */
  async function startUser(g) {
    R.uid = g.state.user.uid;
    R.fs = await g.fsModule();
    R.db = g.fb.db;
    const { fs, db, uid } = R;

    R.unsubUser.push(fs.onSnapshot(
      fs.query(fs.collection(db, "roomInvites"), fs.where("to", "==", uid)),
      sn => {
        R.incoming = sn.docs.map(d => Object.assign({ id: d.id }, d.data()));
        drawBanner();
      }, e => console.warn("invites in", e)));

    R.unsubUser.push(fs.onSnapshot(
      fs.query(fs.collection(db, "roomInvites"), fs.where("from", "==", uid)),
      sn => {
        R.outgoing = sn.docs.map(d => Object.assign({ id: d.id }, d.data()));
        if (R.view === "room" || R.view === "invite") draw();
      }, e => console.warn("invites out", e)));

    restore();
  }

  function stopUser() {
    R.unsubUser.forEach(u => { try { u(); } catch (e) {} });
    R.unsubUser = [];
    stopRoom();
    R.uid = null; R.roomId = null; R.incoming = []; R.outgoing = [];
    R.view = "hidden";
    draw(); drawBanner();
  }

  async function restore() {
    const { fs, db, uid } = R;
    try {
      const u = await fs.getDoc(fs.doc(db, "userRoom", uid));
      if (!u.exists()) return;
      const { roomId, color } = u.data();
      const [r, m] = await Promise.all([
        fs.getDoc(fs.doc(db, "rooms", roomId)),
        fs.getDoc(fs.doc(db, "rooms", roomId, "members", color))
      ]);
      const mine = m.exists() && m.data().uid === uid;
      const ok = r.exists() && r.data().status === "waiting" && mine
        && Date.now() - ts(r.data().createdAt) < MAX_AGE;
      if (ok) { enterRoom(roomId, color); return; }
      if (mine) await fs.deleteDoc(m.ref).catch(() => {});
      await fs.deleteDoc(u.ref).catch(() => {});
    } catch (e) { console.warn("restore", e); }
  }

  /* ---------- Sala en tiempo real ---------- */
  function enterRoom(roomId, color) {
    stopRoom();
    R.roomId = roomId; R.color = color;
    R.seenMe = false; R.members = {}; R.room = null;
    const { fs, db } = R;

    R.unsubRoom.push(fs.onSnapshot(fs.doc(db, "rooms", roomId), s => {
      if (!s.exists() || s.data().status === "closed") return closedRoom("La sala se cerró.");
      R.room = s.data();
      if (R.view === "room") draw();
    }, e => console.warn("room", e)));

    R.unsubRoom.push(fs.onSnapshot(fs.collection(db, "rooms", roomId, "members"), sn => {
      R.members = {};
      sn.docs.forEach(d => { R.members[d.id] = d.data(); });
      if (R.members[R.color]) R.seenMe = true;
      else if (R.seenMe) return closedRoom("Ya no estás en la sala.");
      loadPub();
      if (R.view === "room") draw();
    }, e => console.warn("members", e)));

    R.hb = setInterval(beat, BEAT_MS);
  }

  function stopRoom() {
    R.unsubRoom.forEach(u => { try { u(); } catch (e) {} });
    R.unsubRoom = [];
    if (R.hb) { clearInterval(R.hb); R.hb = null; }
  }

  function beat() {
    if (!R.roomId || !R.color) return;
    const { fs, db } = R;
    fs.updateDoc(fs.doc(db, "rooms", R.roomId, "members", R.color),
      { seen: fs.serverTimestamp() }).catch(() => {});
  }

  function closedRoom(msg) {
    stopRoom();
    const { fs, db, uid } = R;
    if (uid) fs.deleteDoc(fs.doc(db, "userRoom", uid)).catch(() => {});
    R.roomId = null; R.color = null; R.room = null; R.members = {};
    R.msg = msg;
    if (R.view !== "hidden") { R.view = "mode"; draw(); } else toast(msg);
  }

  async function loadPub() {
    const { fs, db } = R;
    const ids = Object.values(R.members).map(m => m.uid).filter(u => !(u in R.pub));
    if (!ids.length) return;
    ids.forEach(u => { R.pub[u] = {}; });
    await Promise.all(ids.map(async u => {
      try {
        const s = await fs.getDoc(fs.doc(db, "publicProfiles", u));
        R.pub[u] = s.exists() ? s.data() : {};
      } catch (e) { R.pub[u] = {}; }
    }));
    if (R.view === "room") draw();
  }

  /* ---------- Acciones ---------- */
  async function createRoom(mode) {
    const g = G();
    if (R.busy) return;
    if (R.roomId) return toast("Ya estás en una sala.");
    const p = g.state.profile;
    if (!p) return toast("Primero crea tu perfil.");

    R.busy = true; R.msg = ""; draw();
    const { fs, db, uid } = R;
    const roomId = rid();
    try {
      const batch = fs.writeBatch(db);
      batch.set(fs.doc(db, "rooms", roomId), {
        host: uid, hostName: p.username, mode, status: "waiting",
        createdAt: fs.serverTimestamp()
      });
      batch.set(fs.doc(db, "userRoom", uid), { roomId, color: "red", at: fs.serverTimestamp() });
      batch.set(fs.doc(db, "rooms", roomId, "members", "red"), {
        uid, username: p.username, avatar: p.avatar || "a1",
        joinedAt: fs.serverTimestamp(), seen: fs.serverTimestamp()
      });
      await batch.commit();
      enterRoom(roomId, "red");
      R.view = "room";
    } catch (e) {
      console.warn("createRoom", e);
      R.msg = (e && e.code === "permission-denied")
        ? "No se pudo crear. ¿Ya estás en otra sala?" : "No se pudo crear la sala.";
    }
    R.busy = false; draw();
  }

  async function joinRoom(roomId) {
    const g = G();
    if (R.busy) return;
    if (R.roomId) return toast("Ya estás en una sala. Sal primero.");
    const p = g.state.profile;
    if (!p) return toast("Primero crea tu perfil.");

    const { fs, db, uid } = R;
    const invRef = fs.doc(db, "roomInvites", roomId + "_" + uid);
    R.busy = true;

    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const rs = await fs.getDoc(fs.doc(db, "rooms", roomId));
        if (!rs.exists() || rs.data().status !== "waiting") {
          await fs.deleteDoc(invRef).catch(() => {});
          toast("La sala ya no está disponible.");
          break;
        }
        const room = rs.data();
        const ms = await fs.getDocs(fs.collection(db, "rooms", roomId, "members"));
        const taken = new Set(ms.docs.map(d => d.id));
        const free = SLOTS[room.mode].find(c => !taken.has(c));
        if (!free) { toast("La sala está llena."); break; }

        const batch = fs.writeBatch(db);
        batch.set(fs.doc(db, "userRoom", uid), { roomId, color: free, at: fs.serverTimestamp() });
        batch.set(fs.doc(db, "rooms", roomId, "members", free), {
          uid, username: p.username, avatar: p.avatar || "a1",
          joinedAt: fs.serverTimestamp(), seen: fs.serverTimestamp()
        });
        batch.delete(invRef);
        try {
          await batch.commit();
          enterRoom(roomId, free);
          R.view = "room"; R.msg = "";
          draw();
          break;
        } catch (e) {
          if (e && e.code === "permission-denied" && attempt < 2) continue;
          toast("No se pudo entrar. ¿La invitación venció o ya estás en otra sala?");
          break;
        }
      }
    } catch (e) {
      console.warn("joinRoom", e);
      toast("No se pudo entrar a la sala.");
    }
    R.busy = false; drawBanner();
  }

  async function leaveRoom() {
    if (!R.roomId || R.busy) return;
    R.busy = true;
    const { fs, db, uid } = R;
    const roomId = R.roomId, color = R.color;
    const isHost = R.room && R.room.host === uid;
    const others = Object.keys(R.members).filter(c => c !== color);

    stopRoom();                       // evita el aviso de "saliste" al borrarnos
    try {
      const batch = fs.writeBatch(db);
      if (isHost) {
        batch.update(fs.doc(db, "rooms", roomId), { status: "closed", updatedAt: fs.serverTimestamp() });
        others.forEach(c => batch.delete(fs.doc(db, "rooms", roomId, "members", c)));
      }
      batch.delete(fs.doc(db, "rooms", roomId, "members", color));
      batch.delete(fs.doc(db, "userRoom", uid));
      await batch.commit();
      toast(isHost ? "Sala cerrada." : "Saliste de la sala.");
    } catch (e) {
      console.warn("leaveRoom", e);
      toast("No se pudo salir. Intenta de nuevo.");
      enterRoom(roomId, color);       // seguimos dentro
      R.busy = false; return;
    }
    R.roomId = null; R.color = null; R.room = null; R.members = {};
    R.view = "mode"; R.msg = "";
    R.busy = false; draw();
  }

  async function loadFriends() {
    const { fs, db, uid } = R;
    R.view = "invite"; R.friends = null; draw();
    try {
      const sn = await fs.getDocs(fs.collection(db, "users", uid, "friends"));
      R.friends = sn.docs.map(d => {
        const x = d.data() || {};
        return { uid: d.id, username: x.username || "jugador", avatar: x.avatar || "a1" };
      });
    } catch (e) { console.warn("friends", e); R.friends = []; }
    if (R.view === "invite") draw();
  }

  async function invite(toUid) {
    const g = G();
    if (!R.roomId || !R.room || R.busy) return;
    const { fs, db, uid } = R;
    if (Object.keys(R.members).length >= R.room.mode) return toast("La sala ya está llena.");
    const iid = R.roomId + "_" + toUid;
    const ref = fs.doc(db, "roomInvites", iid);
    R.busy = true;
    try {
      const ex = await fs.getDoc(ref);
      if (ex.exists()) {
        if (ts(ex.data().expiresAt) > Date.now()) { toast("Ya lo invitaste."); R.busy = false; return; }
        await fs.deleteDoc(ref);
      }
      await fs.setDoc(ref, {
        from: uid, to: toUid, roomId: R.roomId,
        fromUsername: g.state.profile.username, mode: R.room.mode,
        status: "pending", createdAt: fs.serverTimestamp(),
        expiresAt: fs.Timestamp.fromMillis(Date.now() + INVITE_MS)
      });
      toast("Invitación enviada.");
    } catch (e) {
      console.warn("invite", e);
      toast("No se pudo invitar.");
    }
    R.busy = false;
  }

  function dropInvite(id) {
    const { fs, db } = R;
    return fs.deleteDoc(fs.doc(db, "roomInvites", id)).catch(() => toast("No se pudo completar."));
  }

  /* ---------- Pantallas ---------- */
  const lvl = u => {
    const p = R.pub[u] || {};
    return { lv: G().xpLevelFromTotal(p.xp || 0), tr: p.trophies || 0 };
  };

  function modeHtml() {
    const cards = [2, 3, 4].map(n => `
      <button class="rm-mode ${R.mode === n ? "sel" : ""}" data-k="mode" data-v="${n}" type="button">
        <b>${n}</b><span>JUGADORES</span>
      </button>`).join("");
    return `
      <div class="rm-top">
        <button class="rm-ib" data-k="close" type="button" aria-label="Volver">←</button>
        <h1>Sala con amigos</h1><span></span>
      </div>
      <p class="rm-sub">Elige cuántos jugadores tendrá tu sala.</p>
      <div class="rm-modes">${cards}</div>
      <button class="rm-main" data-k="create" type="button" ${R.busy ? "disabled" : ""}>
        ${R.busy ? "CREANDO…" : "CREAR SALA"}
      </button>
      ${R.msg ? `<p class="rm-msg">${esc(R.msg)}</p>` : ""}
      <p class="rm-hint">Fase 1: sala de espera e invitaciones. La partida sincronizada llega en la Fase 2.</p>`;
  }

  function roomHtml() {
    if (!R.room) {
      return `<div class="rm-top"><button class="rm-ib" data-k="close" type="button">←</button><h1>Sala</h1><span></span></div>
        <p class="rm-sub">Cargando…</p>`;
    }
    const mode = R.room.mode, n = Object.keys(R.members).length;
    const isHost = R.room.host === R.uid, full = n >= mode;
    const now = Date.now();

    const slots = SLOTS[mode].map(c => {
      const m = R.members[c];
      if (!m) {
        return `<div class="rm-slot empty" style="--c:${HEX[c]}"><small>${NAMES[c]}</small>
          <span class="rm-plus">+</span><em>Disponible</em></div>`;
      }
      const on = m.uid === R.uid || (now - (ts(m.seen) || now)) < ONLINE_MS;
      const x = lvl(m.uid);
      return `<div class="rm-slot taken" style="--c:${HEX[c]}"><small>${NAMES[c]}</small>
        <span class="rm-av">${G().avatarEmoji(m.avatar)}<i class="rm-dot ${on ? "on" : ""}"></i></span>
        <b>${m.uid === R.room.host ? "👑 " : ""}@${esc(m.username)}</b>
        <em>NV. ${x.lv} · 🏆 ${x.tr}</em></div>`;
    }).join("");

    const pend = R.outgoing.filter(i => i.roomId === R.roomId && ts(i.expiresAt) > now);
    const pendHtml = pend.length ? `<div class="rm-h">Invitaciones pendientes</div>` + pend.map(i => `
      <div class="rm-row"><span class="a">✉️</span>
        <div class="i"><b>Invitación enviada</b><small>Vence en pocos minutos</small></div>
        <button class="rm-sm no" data-k="cancel" data-id="${esc(i.id)}" type="button">Cancelar</button>
      </div>`).join("") : "";

    const missing = mode - n;
    const startBlock = isHost
      ? `<button class="rm-main" data-k="start" type="button" ${full ? "" : "disabled"}>INICIAR PARTIDA</button>
         <p class="rm-hint">${full
           ? "Sala completa ✓ El inicio sincronizado llega en la Fase 2."
           : `Faltan ${missing} jugador${missing > 1 ? "es" : ""}.`}</p>`
      : `<p class="rm-hint">Esperando a que el anfitrión inicie la partida.</p>`;

    return `
      <div class="rm-top">
        <button class="rm-ib" data-k="close" type="button" aria-label="Minimizar">←</button>
        <h1>Sala de @${esc(R.room.hostName)}</h1><span></span>
      </div>
      <p class="rm-sub">Clasificatoria · ${mode} jugadores · ${n}/${mode} dentro · #${esc(R.roomId.slice(0, 6).toUpperCase())}</p>
      <div class="rm-slots">${slots}</div>
      ${isHost ? `<button class="rm-ghost" data-k="invite-open" type="button" ${full ? "disabled" : ""}>+ Invitar amigos</button>` : ""}
      ${pendHtml}
      <div style="margin-top:14px">${startBlock}</div>
      <button class="rm-danger" data-k="leave" type="button">${isHost ? "Cerrar sala" : "Salir de la sala"}</button>`;
  }

  function inviteHtml() {
    const now = Date.now();
    const inRoom = new Set(Object.values(R.members).map(m => m.uid));
    const pending = new Map(R.outgoing.filter(i => i.roomId === R.roomId && ts(i.expiresAt) > now).map(i => [i.to, i]));
    const full = R.room && Object.keys(R.members).length >= R.room.mode;

    let list;
    if (R.friends === null) list = `<p class="rm-sub">Cargando…</p>`;
    else if (!R.friends.length) list = `<p class="rm-sub">Aún no tienes amigos. Agrégalos desde Amigos.</p>`;
    else list = R.friends.map(f => {
      let btn;
      if (inRoom.has(f.uid)) btn = `<span class="rm-sub" style="margin:0">En la sala</span>`;
      else if (pending.has(f.uid)) btn = `<button class="rm-sm no" data-k="cancel" data-id="${esc(pending.get(f.uid).id)}" type="button">Cancelar</button>`;
      else btn = `<button class="rm-sm" data-k="invite" data-uid="${esc(f.uid)}" type="button" ${full ? "disabled" : ""}>Invitar</button>`;
      return `<div class="rm-row"><span class="a">${G().avatarEmoji(f.avatar)}</span>
        <div class="i"><b>@${esc(f.username)}</b><small>${pending.has(f.uid) ? "Invitación pendiente" : "Amigo"}</small></div>${btn}</div>`;
    }).join("");

    return `
      <div class="rm-top">
        <button class="rm-ib" data-k="invite-back" type="button" aria-label="Volver">←</button>
        <h1>Invitar amigos</h1><span></span>
      </div>
      <p class="rm-sub">La invitación vence en 4 minutos.</p>
      ${list}`;
  }

  function draw() {
    let el = $("#gxRoom");
    if (R.view === "hidden") { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "gxRoom"; el.className = "rm";
      el.addEventListener("click", onClick);
      document.body.appendChild(el);
    }
    const y = el.scrollTop;
    el.innerHTML = `<div class="rm-in">${
      R.view === "mode" ? modeHtml() : R.view === "invite" ? inviteHtml() : roomHtml()}</div>`;
    el.scrollTop = y;
  }

  function onClick(e) {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    const k = b.dataset.k;
    if (k === "close") { R.view = "hidden"; draw(); }
    else if (k === "mode") { R.mode = +b.dataset.v; draw(); }
    else if (k === "create") createRoom(R.mode);
    else if (k === "leave") {
      const host = R.room && R.room.host === R.uid;
      if (confirm(host ? "¿Cerrar la sala para todos?" : "¿Salir de la sala?")) leaveRoom();
    }
    else if (k === "start") toast("La partida sincronizada llega en la Fase 2.");
    else if (k === "invite-open") loadFriends();
    else if (k === "invite-back") { R.view = "room"; draw(); }
    else if (k === "invite") invite(b.dataset.uid);
    else if (k === "cancel") dropInvite(b.dataset.id);
  }

  /* ---------- Banner de invitación recibida ---------- */
  function drawBanner() {
    let b = $("#gxInv");
    const now = Date.now();
    const inv = R.incoming.find(i => i.status === "pending" && ts(i.expiresAt) > now);
    if (!inv) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement("div");
      b.id = "gxInv"; b.className = "inv";
      b.addEventListener("click", e => {
        const k = e.target.closest("[data-k]");
        if (!k) return;
        const id = b.dataset.id;
        const cur = R.incoming.find(i => i.id === id);
        if (!cur) return;
        if (k.dataset.k === "no") dropInvite(id);
        else if (k.dataset.k === "yes") joinRoom(cur.roomId);
      });
      document.body.appendChild(b);
    }
    b.dataset.id = inv.id;
    b.innerHTML = `<div class="inv-t"><b>@${esc(inv.fromUsername)}</b> te invita a una sala clasificatoria de ${inv.mode} jugadores</div>
      <div class="inv-b"><button data-k="no" type="button">Rechazar</button><button class="ok" data-k="yes" type="button">Aceptar</button></div>`;
  }

  function open() {
    const g = G();
    if (!R.uid || !R.fs) return toast("Inicia sesión primero.");
    if (!g.state.profile) return toast("Primero crea tu perfil.");
    R.view = R.roomId ? "room" : "mode";
    draw();
  }

  // "Jugar con amigos" del menú online abre estas salas en vez de la maqueta local
  window.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest('[data-action="online-friends"]');
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    open();
  }, true);

  /* ---------- Arranque ---------- */
  let starting = false;
  setInterval(() => {
    const g = G();
    const u = g && g.state && g.state.user && g.fb && g.fb.db ? g.state.user.uid : null;
    if (u && R.uid !== u && !starting) {
      starting = true;
      if (R.uid) stopUser();
      startUser(g).catch(e => console.warn("rooms start", e)).finally(() => { starting = false; });
    } else if (!u && R.uid) {
      stopUser();
    }
  }, 1000);

  setInterval(() => {            // vence invitaciones y refresca el estado de conexión
    drawBanner();
    if (R.view === "room") draw();
  }, 15000);
})();
