/* GREYX LUDO — Perfiles
   - Insignia de Creador (SVG) junto al nombre del owner, visible para todos
   - Solo el owner puede cambiar su nombre de usuario
   - Tarjeta de perfil mejorada para todos (nivel, título, barra de XP)
   Requiere greyx-admin.js (comparte estilos de ventana) y las reglas nuevas de Firestore. */
(() => {
  "use strict";

  const G = () => window.GX;
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  const owners = new Map();      // username en minúsculas -> uid
  let badgesFor = null, lastLoad = 0, badgeSynced = "", running = false;

  /* ---------- Insignia (SVG propio) ---------- */
  const shape = id => `
    <path d="M12 1.6l8.2 3v6.3c0 4.9-3.3 9.1-8.2 11.2C7.1 20 3.8 15.8 3.8 10.9V4.6z" fill="url(#${id})" stroke="#7c4a03" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M7.4 14.2l-.9-5.1 3.1 2.6L12 7.4l2.4 4.3 3.1-2.6-.9 5.1z" fill="#fff" stroke="#7c4a03" stroke-width=".7" stroke-linejoin="round"/>
    <rect x="7.6" y="15" width="8.8" height="1.6" rx=".6" fill="#fff" stroke="#7c4a03" stroke-width=".6"/>`;
  const GRAD = id => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></linearGradient>`;

  document.body.insertAdjacentHTML("beforeend",
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${GRAD("gxbG")}</defs></svg>`);

  const badge = (s = 16) =>
    `<svg class="gxb" viewBox="0 0 24 24" width="${s}" height="${s}" role="img" aria-label="Creador">${shape("gxbG")}</svg>`;
  window.GXOwnerIcon = badge;

  const badgeUri = "url('data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs>${GRAD("g")}</defs>${shape("g")}</svg>`) + "')";

  /* ---------- Niveles ---------- */
  function tier(lv, owner) {
    if (owner) return { n:"Creador del juego", c:"#fbbf24", c2:"#f59e0b", g:"#fbbf2433" };
    if (lv >= 100) return { n:"Gran maestro", c:"#fbbf24", c2:"#fb923c", g:"#fbbf2433" };
    if (lv >= 75)  return { n:"Leyenda",  c:"#f472b6", c2:"#a78bfa", g:"#f472b633" };
    if (lv >= 50)  return { n:"Maestro",  c:"#a78bfa", c2:"#6d28d9", g:"#a78bfa33" };
    if (lv >= 25)  return { n:"Veterano", c:"#38bdf8", c2:"#2563eb", g:"#38bdf833" };
    if (lv >= 10)  return { n:"Aprendiz", c:"#34d399", c2:"#059669", g:"#34d39933" };
    return { n:"Novato", c:"#94a3b8", c2:"#64748b", g:"#94a3b822" };
  }

  /* ---------- Estilos ---------- */
  const css = `
  .gxb{display:inline-block;vertical-align:-3px;margin-left:6px;filter:drop-shadow(0 0 5px #fbbf2499)}
  .gx-oname{background:linear-gradient(90deg,#fff1a8,#fbbf24 60%,#f59e0b);-webkit-background-clip:text;background-clip:text;color:transparent!important;text-shadow:none!important}

  body.gx-owner .account-avatar{position:relative;border:2px solid #fbbf24;
    background:linear-gradient(145deg,#6d28d9,#2a1580);box-shadow:0 0 0 3px #fbbf2433,0 0 20px #fbbf2488}
  body.gx-owner .account-avatar::after{content:"";position:absolute;right:-7px;top:-9px;width:22px;height:22px;
    background:${badgeUri} center/contain no-repeat;filter:drop-shadow(0 2px 3px #0009)}
  body.gx-owner .account-info small::before{content:"CREADOR · ";color:#fbbf24;font-weight:900;letter-spacing:.06em}

  .gxh{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;
    padding:22px 14px 18px;margin:0 0 16px;border-radius:24px;border:1px solid #ffffff18;overflow:hidden;
    background:radial-gradient(120% 90% at 50% 0,var(--tg),transparent 70%),linear-gradient(160deg,#1c2142,#0e1226);
    box-shadow:inset 0 1px 0 #ffffff1a,0 14px 30px #0007}
  .gxh.owner{border-color:#fbbf2477;box-shadow:inset 0 1px 0 #fff3,0 0 34px #fbbf2433,0 14px 30px #0007}
  .gxh-crown{margin-bottom:-6px;filter:drop-shadow(0 0 12px #fbbf24aa)}
  .gxh-ring{position:relative;width:96px;height:96px;border-radius:50%;display:grid;place-items:center;padding:4px;
    background:conic-gradient(from 200deg,var(--tc),#ffffffaa,var(--tc2),var(--tc));filter:drop-shadow(0 0 14px var(--tc))}
  .gxh-av{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;font-size:2.9rem;
    background:radial-gradient(circle at 35% 30%,#3b3f75,#12152c)}
  .gxh-lv{position:absolute;right:-8px;bottom:-4px;min-width:36px;height:34px;padding:0 7px;display:grid;place-items:center;
    border-radius:12px;border:2px solid #0e1226;background:linear-gradient(145deg,var(--tc),var(--tc2));color:#fff;
    font:900 .95rem Inter,system-ui,sans-serif;text-shadow:0 1px 2px #0008;box-shadow:0 4px 10px #0009}
  .gxh-name{margin-top:16px;color:#fff;font:900 1.3rem Inter,system-ui,sans-serif;letter-spacing:-.01em;word-break:break-all}
  .gxh-title{margin-top:4px;color:var(--tc);font:800 .76rem Inter,system-ui,sans-serif;letter-spacing:.06em}
  .gxh-bar{width:100%;max-width:240px;height:8px;margin-top:13px;border-radius:9px;background:#0a0d1acc;border:1px solid #ffffff1c;overflow:hidden}
  .gxh-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--tc),var(--tc2));box-shadow:0 0 10px var(--tc)}
  .gxh-xp{margin-top:6px;color:#8e97aa;font-size:.7rem}

  body.gx-owner .setup-card-modern:has(.gxh.owner){border-color:#fbbf2455!important;box-shadow:0 30px 80px #000a,0 0 50px #fbbf2422,inset 0 1px 0 #ffffff1a!important}

  .gxa-ren{position:relative;z-index:2;width:100%;min-height:44px;margin:-4px 0 14px;border-radius:14px;
    border:1.5px solid #fbbf2477;background:linear-gradient(135deg,#fbbf2422,#ffffff08);color:#fde68a;
    font:800 .82rem Inter,system-ui,sans-serif}
  .gxa-ren:active{transform:scale(.98)}
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Insignias de todos los usuarios ---------- */
  async function tick() {
    if (running) return;
    const g = G();
    if (!g || !g.fb || !g.fb.db) return;
    running = true;
    try {
      const s = g.state, u = s.user;
      document.body.classList.toggle("gx-owner", !!s.isOwner);

      if (!u) { owners.clear(); badgesFor = null; badgeSynced = ""; running = false; return; }
      const fs = await g.fsModule(), db = g.fb.db;

      if (badgesFor !== u.uid || Date.now() - lastLoad > 300000) {
        badgesFor = u.uid; lastLoad = Date.now();
        try {
          const sn = await fs.getDocs(fs.collection(db, "badges"));
          owners.clear();
          sn.docs.forEach(d => {
            const n = String(d.data().username || "").toLowerCase();
            if (n) owners.set(n, d.id);
          });
        } catch (e) { console.warn("badges", e.code || e); }
      }

      if (s.isOwner && s.profile) {
        owners.set(s.profile.username.toLowerCase(), u.uid);
        const key = u.uid + "|" + s.profile.username;
        if (badgeSynced !== key) {
          badgeSynced = key;
          try {
            await fs.setDoc(fs.doc(db, "badges", u.uid), {
              type: "owner", username: s.profile.username, at: fs.serverTimestamp()
            });
          } catch (e) { console.warn("badge write", e.code || e); }
        }
      }
      schedule();
    } catch (e) { console.warn("tick", e); }
    running = false;
  }
  setInterval(tick, 1500);

  /* ---------- Pintar sobre la interfaz ---------- */
  const app = document.getElementById("app");
  let queued = false;
  const obs = new MutationObserver(schedule);

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; run(); });
  }

  function run() {
    obs.disconnect();
    try {
      const g = G();
      if (g) {
        document.body.classList.toggle("gx-owner", !!g.state.isOwner);
        profileHero(g);
        renameButton(g);
        if (g.state.phase !== "playing") scan();
      }
    } catch (e) { console.warn("gx-profile", e); }
    obs.observe(app, { childList:true, subtree:true, characterData:true });
  }
  obs.observe(app, { childList:true, subtree:true, characterData:true });

  function scan() {
    if (!owners.size) return;
    const w = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (w.nextNode()) {
      const t = w.currentNode.nodeValue.trim();
      if (t.length < 4 || t[0] !== "@") continue;
      if (owners.has(t.slice(1).toLowerCase())) hits.push(w.currentNode.parentElement);
    }
    hits.forEach(el => {
      if (!el) return;
      el.classList.add("gx-oname");
      if (!el.querySelector(":scope > .gxb")) el.insertAdjacentHTML("beforeend", badge(16));
    });
  }

  function profileHero(g) {
    const s = g.state;
    const old = app.querySelector(".gxh");
    const card = app.querySelector(".setup-card-modern:has(.profile-name)");
    if (!card || !s.profile || s.showProfile !== "edit") { if (old) old.remove(); return; }

    const lv = s.xpLoaded ? s.xpLevel : 1;
    const pct = s.xpLoaded ? g.xpBarPct(s.xp) : 0;
    const owner = !!s.isOwner;
    const avatar = s.profileAvatar || s.profile.avatar || "a1";
    const sig = [s.profile.username, avatar, lv, pct, owner].join("|");
    if (old && old.dataset.sig === sig && old.parentNode === card) return;
    if (old) old.remove();

    const t = tier(lv, owner);
    const xpText = lv >= 100 ? "Nivel máximo" : g.xpToNext(s.xp) + " XP para el nivel " + (lv + 1);
    const html = `
      <div class="gxh ${owner ? "owner" : ""}" data-sig="${esc(sig)}" style="--tc:${t.c};--tc2:${t.c2};--tg:${t.g}">
        ${owner ? `<span class="gxh-crown">${badge(44)}</span>` : ""}
        <div class="gxh-ring">
          <div class="gxh-av">${g.avatarEmoji(avatar)}</div>
          <b class="gxh-lv">${lv}</b>
        </div>
        <div class="gxh-name">@${esc(s.profile.username)}</div>
        <div class="gxh-title">${esc(t.n)}</div>
        <div class="gxh-bar"><i style="width:${pct}%"></i></div>
        <div class="gxh-xp">${esc(xpText)}</div>
      </div>`;
    const head = card.querySelector(".setup-card-header");
    if (head) head.insertAdjacentHTML("afterend", html);
    else card.insertAdjacentHTML("afterbegin", html);
  }

  function renameButton(g) {
    const s = g.state;
    const ex = app.querySelector(".gxa-ren");
    const nameBox = app.querySelector(".profile-name");
    if (!s.isOwner || !nameBox || s.showProfile !== "edit") { if (ex) ex.remove(); return; }

    const hint = app.querySelector(".setup-card-header p");
    if (hint && /no se puede cambiar/i.test(hint.textContent)) {
      hint.textContent = "Como creador, puedes cambiar tu nombre.";
    }
    if (ex) return;
    const field = nameBox.closest(".auth-field") || nameBox.parentNode;
    field.insertAdjacentHTML("afterend",
      `<button type="button" class="gxa-ren" data-gxren="1">Cambiar nombre de usuario</button>`);
  }

  document.addEventListener("click", e => {
    if (e.target.closest("[data-gxren]")) openRename();
  }, true);

  /* ---------- Cambiar nombre (solo owner) ---------- */
  function toast(m) {
    const t = document.createElement("div");
    t.className = "gxa-toast";
    t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }

  function openRename() {
    const g = G();
    if (!g || !g.state.isOwner || !g.state.profile || document.getElementById("gxRen")) return;
    const el = document.createElement("div");
    el.id = "gxRen";
    el.className = "gxa";
    el.innerHTML = `
      <div class="gxa-in">
        <div class="gxa-top">
          <button class="gxa-back" data-r="close" type="button" aria-label="Volver">←</button>
          <div class="gxa-title">${badge(22)}<strong>Cambiar nombre</strong></div>
          <span class="gxa-sp"></span>
        </div>
        <div class="gxa-card">
          <h3>Nuevo nombre de usuario</h3>
          <p>3 a 16 caracteres: letras, números y _. Como creador puedes usar nombres reservados.</p>
          <input id="gxrN" type="text" maxlength="16" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(g.state.profile.username)}">
          <div style="height:12px"></div>
          <p id="gxrM" class="gxa-msg err" style="display:none;margin:0 0 12px"></p>
          <button class="gxa-btn" data-r="save" type="button">Guardar nombre</button>
        </div>
      </div>`;
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-r]");
      if (!b) return;
      if (b.dataset.r === "close") el.remove();
      if (b.dataset.r === "save") doRename(el, b);
    });
    document.body.appendChild(el);
  }

  function note(el, text, ok) {
    const m = el.querySelector("#gxrM");
    m.textContent = text;
    m.className = "gxa-msg " + (ok ? "ok" : "err");
    m.style.display = "block";
  }

  async function doRename(el, btn) {
    const g = G(), s = g.state, p = s.profile;
    const name = el.querySelector("#gxrN").value.trim();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return note(el, "Usa 3 a 16 caracteres: letras, números y _.", false);
    if (name === p.username) return note(el, "Ese ya es tu nombre actual.", false);

    btn.disabled = true;
    try {
      const fs = await g.fsModule(), db = g.fb.db, uid = s.user.uid;
      const lower = name.toLowerCase();
      const oldLower = p.usernameLower || p.username.toLowerCase();
      const changesKey = lower !== oldLower;

      if (changesKey) {
        const taken = await fs.getDoc(fs.doc(db, "usernames", lower));
        if (taken.exists()) { btn.disabled = false; return note(el, "Ese nombre ya está en uso.", false); }
      }

      const sSnap = await fs.getDoc(fs.doc(db, "stats", uid));
      const sd = sSnap.exists() ? sSnap.data() : {};
      const ts = fs.serverTimestamp();

      const b = fs.writeBatch(db);
      b.update(fs.doc(db, "users", uid), { username: name, usernameLower: lower, updatedAt: ts });
      if (changesKey) {
        b.set(fs.doc(db, "usernames", lower), { uid });
        b.delete(fs.doc(db, "usernames", oldLower));
      }
      b.set(fs.doc(db, "publicProfiles", uid), {
        username: name, usernameLower: lower, avatar: p.avatar,
        xp: sd.xp || 0, trophies: sd.trophies || 0, wins: sd.wins || 0, played: sd.played || 0,
        updatedAt: ts
      });
      b.set(fs.doc(db, "badges", uid), { type: "owner", username: name, at: ts });
      await b.commit();

      owners.delete(p.username.toLowerCase());
      owners.set(lower, uid);
      badgeSynced = uid + "|" + name;
      s.profile = Object.assign({}, p, { username: name, usernameLower: lower });
      el.remove();
      g.render();
      toast("Nombre actualizado");
    } catch (e) {
      console.warn("rename", e);
      btn.disabled = false;
      note(el, e.code === "permission-denied"
        ? "Firebase rechazó el cambio. Publica las reglas nuevas y vuelve a intentar."
        : "No se pudo cambiar (" + (e.code || "error") + ").", false);
    }
  }

  run();
})();
