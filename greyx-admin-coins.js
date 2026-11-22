/* GREYX LUDO — GESTIONAR MONEDAS (panel admin, solo owner)
   Añade un botón en la ficha de cada jugador. No modifica greyx-admin.js.
   La seguridad real está en Firestore Rules (reglas-nuevas.txt): sin ellas la entrega es rechazada.
   Cargar al final:  <script src="greyx-admin-coins.js?v=1"></script> */
(() => {
  "use strict";
  if (window.GXAdminCoins) return;
  const G = () => window.GX;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Number(n || 0).toLocaleString("es");
  const MAX = 1000000000;

  const st = document.createElement("style");
  st.textContent = `
.gxc-ov{position:fixed;inset:0;z-index:1000010;display:grid;place-items:center;padding:16px;background:rgba(4,5,18,.9);font-family:Inter,system-ui,sans-serif;color:#fff}
.gxc-c{position:relative;width:min(440px,100%);max-height:94dvh;overflow-y:auto;padding:18px 16px 16px;border-radius:24px;border:1.5px solid #e6b449aa;background:linear-gradient(160deg,#252b8a,#0b0d38);box-shadow:0 24px 60px #000b}
.gxc-c h3{margin:0 0 4px;font-size:1.1rem;font-weight:900}.gxc-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:12px;border:1px solid #ffffff2a;background:#ffffff14;color:#fff}
.gxc-bal{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.gxc-bal div{padding:10px;border-radius:14px;background:#ffffff0d;border:1px solid #ffffff14;text-align:center}
.gxc-bal b{display:block;font-size:1.25rem;color:#ffd96a}.gxc-bal small{color:#9aa4d6;font-size:.62rem;font-weight:800;letter-spacing:.12em}
.gxc-c label{display:block;margin:10px 0 5px;color:#9aa4d6;font:800 .62rem monospace;letter-spacing:.12em}
.gxc-c input{width:100%;padding:12px;border-radius:13px;border:1.5px solid #ffffff22;background:#0a0d1acc;color:#fff;font:600 16px Inter,system-ui,sans-serif;outline:0;box-sizing:border-box}
.gxc-c input:focus{border-color:#ffd96a}.gxc-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gxc-b{width:100%;min-height:50px;margin-top:14px;border:0;border-radius:15px;font:900 .9rem Inter,system-ui,sans-serif;color:#3a2200;background:linear-gradient(180deg,#ffe98a,#f5b301);box-shadow:0 4px 0 #92600a}
.gxc-b.cf{background:linear-gradient(180deg,#fb923c,#ea580c);color:#fff;box-shadow:0 4px 0 #7c2d12}.gxc-b:disabled{opacity:.5}
.gxc-m{margin:10px 0 0;padding:10px 12px;border-radius:12px;font-size:.8rem;font-weight:700}.gxc-m.ok{background:#22c55e22;color:#86efac}.gxc-m.er{background:#ef444422;color:#fca5a5}
.gxc-h{padding:9px 11px;margin-top:6px;border-radius:12px;background:#ffffff0a;border:1px solid #ffffff10;font-size:.74rem;line-height:1.4}.gxc-h small{color:#94a3b8}
.gxc-sec{margin:14px 0 4px;color:#a78bfa;font:800 .62rem monospace;letter-spacing:.14em}`;
  document.head.appendChild(st);

  /* ---- Botón dentro de la ficha del jugador ---- */
  function target() {
    const p = $("#gxAdm .gxa-player"); if (!p) return null;
    const uid = ((p.querySelector("small") || {}).textContent || "").trim();
    const name = ((p.querySelector("strong") || {}).textContent || "").replace(/^@/, "").trim();
    return uid.length >= 10 ? { uid, name } : null;
  }
  setInterval(() => {
    const g = G(); if (!g || !g.state.isOwner) return;
    const t = target(); if (!t) return;
    const adm = $("#gxAdm"); if (!adm || $(".gxc-card", adm)) return;
    const card = $(".gxa-player", adm).closest(".gxa-card");
    card.insertAdjacentHTML("afterend", `<div class="gxa-card gxc-card"><h3>Monedas</h3>
      <p>Entrega oro y diamantes. Queda registrado con tu nombre.</p>
      <button class="gxa-btn" data-gxc="open" type="button">GESTIONAR MONEDAS</button></div>`);
  }, 700);
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest('[data-gxc="open"]');
    if (b) { const t = target(); if (t) open(t); }
  }, true);

  /* ---- Errores comprensibles (el detalle técnico queda en la consola) ---- */
  function classify(e) {
    if (e && e.app) return e.app;
    const c = (e && e.code) || "";
    if (c === "permission-denied") return "PERMISO_DENEGADO";
    if (c === "unauthenticated") return "ERROR_DE_AUTENTICACION";
    if (c === "invalid-argument") return "DATOS_INVALIDOS";
    if (["unavailable", "deadline-exceeded", "aborted", "resource-exhausted"].includes(c)) return "ERROR_DE_BASE_DE_DATOS";
    return "ERROR_DEL_SERVIDOR";
  }
  const TXT = {
    WALLET_NO_EXISTE: "El jugador aún no tiene billetera (se crea la primera vez que inicia sesión con la tienda/recompensa diaria).",
    DATOS_INVALIDOS: "Cantidades o motivo no válidos.",
    PERMISO_DENEGADO: "Firebase rechazó la operación. ¿Publicaste las reglas nuevas y eres owner?",
    ERROR_DE_AUTENTICACION: "Sesión no válida. Vuelve a iniciar sesión.",
    ERROR_DE_BASE_DE_DATOS: "Sin conexión con la base de datos. Reintenta: no se duplicará.",
    ERROR_DEL_SERVIDOR: "Error inesperado. Revisa la consola."
  };
  const bad = code => Object.assign(new Error(code), { app: code });

  /* ---- Ventana ---- */
  function open(t) {
    const old = $("#gxcM"); if (old) old.remove();
    const m = document.createElement("div"); m.id = "gxcM"; m.className = "gxc-ov"; document.body.appendChild(m);
    const S = { t, w: undefined, hist: null, g: "", v: "", r: "", confirm: false, busy: false, msg: "", ok: false, op: null };

    const grab = () => { if ($("#gxcG", m)) { S.g = $("#gxcG", m).value; S.v = $("#gxcV", m).value; S.r = $("#gxcR", m).value; } };
    const num = x => (x === "" || x == null) ? 0 : Number(x);

    function draw() {
      const w = S.w, gold = num(S.g), gems = num(S.v);
      const bal = w === undefined ? `<div><b>…</b><small>ORO</small></div><div><b>…</b><small>DIAMANTES</small></div>`
        : w === null ? `<div style="grid-column:1/-1"><small>SIN BILLETERA TODAVÍA</small></div>`
        : `<div><b>${fmt(w.coins)}</b><small>ORO</small></div><div><b>${fmt(w.gems || 0)}</b><small>DIAMANTES</small></div>`;
      const after = w && Number.isFinite(gold + gems) && (gold || gems)
        ? `<p style="margin:8px 0 0;color:#c3cbf3;font-size:.76rem">Después: <b>${fmt(w.coins + gold)}</b> oro · <b>${fmt((w.gems || 0) + gems)}</b> diamantes</p>` : "";
      const hist = S.hist === null ? `<div class="gxc-h"><small>Cargando historial…</small></div>`
        : !S.hist.length ? `<div class="gxc-h"><small>Sin entregas anteriores.</small></div>`
        : S.hist.map(h => `<div class="gxc-h"><b>+${fmt(h.gold)} oro · +${fmt(h.gems)} 💎</b> · ${esc(h.reason)}<br><small>${esc(h.adminName || "admin")} · ${h.at && h.at.toDate ? esc(h.at.toDate().toLocaleString()) : ""} · ${esc(h._id)}</small></div>`).join("");
      m.innerHTML = `<div class="gxc-c" role="dialog" aria-modal="true"><button class="gxc-x" data-k="x" type="button">✕</button>
        <h3>Gestionar monedas</h3><div style="color:#c3cbf3;font-size:.82rem">Jugador: <b>@${esc(t.name)}</b><br><small style="color:#94a3b8;word-break:break-all">${esc(t.uid)}</small></div>
        <div class="gxc-bal">${bal}</div>
        <div class="gxc-2"><div><label>ORO A ENTREGAR</label><input id="gxcG" type="number" min="0" inputmode="numeric" placeholder="0" value="${esc(S.g)}"></div>
        <div><label>DIAMANTES A ENTREGAR</label><input id="gxcV" type="number" min="0" inputmode="numeric" placeholder="0" value="${esc(S.v)}"></div></div>
        <label>MOTIVO (3 a 200 caracteres)</label><input id="gxcR" type="text" maxlength="200" placeholder="Ej: compensación por error" value="${esc(S.r)}">
        ${after}${S.msg ? `<p class="gxc-m ${S.ok ? "ok" : "er"}">${esc(S.msg)}</p>` : ""}
        <button class="gxc-b ${S.confirm ? "cf" : ""}" data-k="go" type="button" ${S.busy || w === undefined || w === null ? "disabled" : ""}>${S.busy ? "ENTREGANDO…" : S.confirm ? "TOCA OTRA VEZ PARA CONFIRMAR" : "CONFIRMAR ENTREGA"}</button>
        <div class="gxc-sec">HISTORIAL DE ENTREGAS A ESTE JUGADOR</div>${hist}</div>`;
    }

    async function load() {
      try {
        const g = G(), fs = await g.fsModule(), db = g.fb.db;
        const ws = await fs.getDoc(fs.doc(db, "wallet", t.uid));
        S.w = ws.exists() ? ws.data() : null;
        const hs = await fs.getDocs(fs.query(fs.collection(db, "adminCoinLog"), fs.where("target", "==", t.uid), fs.limit(30)));
        S.hist = hs.docs.map(d => Object.assign({ _id: d.id }, d.data())).sort((a, b) => (b.at ? b.at.toMillis() : 0) - (a.at ? a.at.toMillis() : 0)).slice(0, 15);
      } catch (e) { console.warn("[monedas] carga", e); S.w = S.w === undefined ? null : S.w; S.hist = S.hist || []; S.msg = "No se pudo leer: " + TXT[classify(e)]; S.ok = false; }
      draw();
    }

    async function submit() {
      const gold = num(S.g), gems = num(S.v), reason = S.r.trim();
      if (!Number.isSafeInteger(gold) || !Number.isSafeInteger(gems) || gold < 0 || gems < 0 || gold > MAX || gems > MAX || gold + gems <= 0 || reason.length < 3 || reason.length > 200)
        throw bad("DATOS_INVALIDOS");
      const g = G(), fs = await g.fsModule(), db = g.fb.db, uid = g.state.user.uid;
      const wref = fs.doc(db, "wallet", t.uid), snap = await fs.getDoc(wref);
      if (!snap.exists()) throw bad("WALLET_NO_EXISTE");
      const w = snap.data();
      if (!S.op) S.op = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);   // mismo id al reintentar = sin duplicados
      const adminName = (g.state.profile && g.state.profile.username) || "admin";
      const upd = { lastOp: S.op, updatedAt: fs.serverTimestamp() };
      if (gold) upd.coins = fs.increment(gold);
      if (gems) upd.gems = fs.increment(gems);
      const b = fs.writeBatch(db);
      b.update(wref, upd);
      b.set(fs.doc(db, "adminCoinLog", S.op), { admin: uid, adminName, target: t.uid, targetName: t.name, gold, gems, reason, goldBefore: w.coins || 0, gemsBefore: w.gems || 0, at: fs.serverTimestamp() });
      b.set(fs.doc(fs.collection(db, "adminLog")), { admin: uid, adminName, action: "coins", target: t.uid, targetName: t.name, reason, change: "+" + gold + " oro, +" + gems + " diamantes", at: fs.serverTimestamp() });
      try { await b.commit(); }
      catch (e) {   // ¿se aplicó aunque falló la respuesta? (red caída): se comprueba por el id de operación
        const ex = await fs.getDoc(fs.doc(db, "adminCoinLog", S.op)).catch(() => null);
        if (!(ex && ex.exists())) throw e;
      }
      S.op = null;
      return { gold, gems };
    }

    m.addEventListener("click", async e => {
      const k = e.target.closest("[data-k]");
      if (e.target === m || (k && k.dataset.k === "x")) return m.remove();
      if (!k || k.dataset.k !== "go" || S.busy) return;
      grab(); S.msg = "";
      if (!S.confirm) { S.confirm = true; return draw(); }
      S.confirm = false; S.busy = true; draw();
      try {
        const r = await submit();
        S.g = ""; S.v = ""; S.r = ""; S.ok = true; S.msg = "Entregado: +" + fmt(r.gold) + " oro, +" + fmt(r.gems) + " diamantes.";
        S.busy = false; await load();
      } catch (er) {
        console.warn("[monedas]", er);
        const c = classify(er); S.ok = false; S.msg = c + ": " + (TXT[c] || ""); S.busy = false; draw();
      }
    });
    draw(); load();
  }

  window.GXAdminCoins = { open };
})();
