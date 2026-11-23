/* GREYX LUDO — CORREO DEL PANEL ADMIN (window.GXMailAdmin)  — reemplaza al archivo del mismo nombre
   Lo usa greyx-admin.js:  html({isOwner}) · grab() · act(a, btn, {draw, ctx, isOwner})
   Tipos: MENSAJE (a 1 jugador) · ANUNCIO (todos / grupo / 1 jugador) · RECOMPENSA (solo owner; oro, diamantes, XP, trofeos)
   Destinatarios: se validan contra users/{uid}. Cada envío usa un id fijo => reintentar no duplica. */
(() => {
  "use strict";
  const G = () => window.GX;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = id => document.getElementById(id);
  const MAXR = 100;
  const S = { kind: "message", aud: "one", q: "", res: null, searching: false, sel: [], title: "", body: "",
              gold: "", gems: "", xp: "", tr: "", prev: false, busy: false, msg: "", ok: false, run: null };
  const KINDS = [["message", "Mensaje"], ["announcement", "Anuncio"], ["reward", "Recompensa"]];
  const AUD = [["all", "Todos"], ["group", "Grupo"], ["one", "Uno"]];
  const TXT = {
    DESTINATARIO_NO_ENCONTRADO: "La cuenta no existe o no se pudo leer.",
    PERMISO_DENEGADO: "Firebase rechazó el envío (reglas o rol sin permiso).",
    ERROR_DE_AUTENTICACION: "Sesión no válida. Vuelve a iniciar sesión.",
    DATOS_INVALIDOS: "Datos no válidos.",
    ERROR_DE_BASE_DE_DATOS: "Sin conexión con la base de datos.",
    ERROR_DEL_SERVIDOR: "Error inesperado (ver consola)."
  };
  const bad = code => Object.assign(new Error(code), { app: code });
  function classify(e) {
    if (e && e.app) return e.app;
    const c = (e && e.code) || "";
    if (c === "permission-denied") return "PERMISO_DENEGADO";
    if (c === "unauthenticated") return "ERROR_DE_AUTENTICACION";
    if (c === "invalid-argument" || e instanceof TypeError) return "DATOS_INVALIDOS";
    if (["unavailable", "deadline-exceeded", "aborted", "resource-exhausted"].includes(c)) return "ERROR_DE_BASE_DE_DATOS";
    return "ERROR_DEL_SERVIDOR";
  }
  const multi = () => S.kind === "reward" || (S.kind === "announcement" && S.aud === "group");
  const needsRecipients = () => !(S.kind === "announcement" && S.aud === "all");
  const num = x => (x === "" || x == null) ? 0 : Number(x);
  const av = id => (G() && G().avatarEmoji ? G().avatarEmoji(id) : "👤");

  function rewardObj() {
    const r = { xp: num(S.xp), trophies: num(S.tr) }, gold = num(S.gold), gems = num(S.gems);
    if (gold) r.gold = gold;
    if (gems) r.gems = gems;
    return r;
  }

  function statusRows() {
    const run = S.run; if (!run) return "";
    const chip = { pending: ["Pendiente", "warn"], sent: ["Enviado", "lifted"], failed: ["Fallido", "active"] };
    const failed = run.items.filter(i => i.st === "failed").length;
    return `<div class="gxa-card"><h3>Estado del envío</h3>
      ${run.items.map(i => `<div class="gxa-log"><b>${esc(i.name)}<span class="gxa-chip ${chip[i.st][1]}">${chip[i.st][0]}</span></b>
        ${i.st === "failed" ? `<small>${esc(i.code)}: ${esc(TXT[i.code] || "")}</small>` : i.note ? `<small>${esc(i.note)}</small>` : ""}</div>`).join("")}
      ${failed && !S.busy ? `<button class="gxa-btn" data-a="m-retry" type="button">Reintentar fallidos (${failed})</button>` : ""}</div>`;
  }

  function html(o) {
    const owner = !!(o && o.isOwner);
    if (!owner && S.kind === "reward") S.kind = "message";
    const seg = (items, a, cur) => `<div class="gxa-seg">${items.map(([k, n]) => `<button type="button" data-a="${a}" data-v="${k}" class="${cur === k ? "on" : ""}">${n}</button>`).join("")}</div>`;
    const kinds = KINDS.filter(k => owner || k[0] !== "reward");
    const rec = needsRecipients() ? `
      <div class="gxa-card"><h3>Destinatario${multi() ? "s" : ""}</h3>
        <p>Busca por nombre de usuario (o el inicio del nombre) o pega el UID.</p>
        <div class="gxa-row"><input id="gxmQ" type="text" placeholder="@usuario o UID" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(S.q)}">
          <button class="gxa-btn" data-a="m-search" type="button" ${S.searching ? "disabled" : ""}>${S.searching ? "…" : "Buscar"}</button></div>
        ${S.res ? `<span class="gxa-lbl">Resultados</span>${S.res.length ? S.res.map(r => `<button class="gxa-prow" data-a="m-pick" data-uid="${esc(r.uid)}" type="button">
          <span class="gxa-av sm">${av(r.avatar)}</span><span class="gxa-pi"><strong>@${esc(r.name)}</strong><small>${esc(r.uid)}</small></span><span class="gxa-chev">＋</span></button>`).join("")
          : `<p style="margin:0;color:#fca5a5">DESTINATARIO_NO_ENCONTRADO: no hay cuentas con ese nombre o UID.</p>`}` : ""}
        ${S.sel.length ? `<span class="gxa-lbl">Seleccionados (${S.sel.length})</span>${S.sel.map(r => `<div class="gxa-prow"><span class="gxa-av sm">${av(r.avatar)}</span>
          <span class="gxa-pi"><strong>@${esc(r.name)}</strong><small>${esc(r.uid)}${r.st ? " · " + esc(r.st) : ""}</small></span>
          <button type="button" data-a="m-unpick" data-uid="${esc(r.uid)}" style="border:0;background:none;color:#fca5a5;font-size:1.1rem">✕</button></div>`).join("")}` : ""}
      </div>` : `<div class="gxa-card"><h3>Destinatarios</h3><p style="margin:0">Todos los jugadores verán el anuncio al abrir el juego.</p></div>`;
    const rw = S.kind === "reward" ? `<span class="gxa-lbl">Recompensa (se reclama desde el correo)</span>
      <div class="gxa-row"><input id="gxmGo" type="number" min="0" inputmode="numeric" placeholder="Oro" value="${esc(S.gold)}"><input id="gxmGe" type="number" min="0" inputmode="numeric" placeholder="Diamantes" value="${esc(S.gems)}"></div>
      <div style="height:8px"></div><div class="gxa-row"><input id="gxmXp" type="number" min="0" inputmode="numeric" placeholder="XP" value="${esc(S.xp)}"><input id="gxmTr" type="number" min="0" inputmode="numeric" placeholder="Trofeos" value="${esc(S.tr)}"></div>` : "";
    const r = rewardObj();
    const prev = S.prev ? `<div class="gxa-card"><h3>Vista previa</h3><div class="gxa-log"><b>${S.kind === "reward" ? "🎁" : S.kind === "announcement" ? "📢" : "✉️"} ${esc(S.title || "(sin asunto)")}</b>${esc(S.body || "(sin contenido)")}
      ${S.kind === "reward" ? `<br><small>Premio: ${[r.gold && r.gold + " oro", r.gems && r.gems + " diamantes", r.xp && r.xp + " XP", r.trophies && r.trophies + " trofeos"].filter(Boolean).join(" · ") || "—"}</small>` : ""}</div></div>` : "";
    return `<div class="gxa-card"><h3>Correo interno</h3><p>Se entrega al buzón del jugador dentro del juego.</p>${seg(kinds, "m-kind", S.kind)}
      ${S.kind === "announcement" ? seg(AUD, "m-aud", S.aud) : ""}</div>${rec}
      <div class="gxa-card"><h3>Contenido</h3>
        <input id="gxmT" type="text" maxlength="60" placeholder="Asunto" value="${esc(S.title)}">
        <textarea id="gxmB" maxlength="600" placeholder="Mensaje (máx. 600)" style="height:110px">${esc(S.body)}</textarea>${rw}
        ${S.msg ? `<p class="gxa-msg ${S.ok ? "ok" : "err"}" style="margin-top:12px">${esc(S.msg)}</p>` : ""}
        <div style="height:12px"></div><div class="gxa-row"><button class="gxa-btn ghost" data-a="m-preview" type="button" style="flex:1">${S.prev ? "Ocultar vista previa" : "Vista previa"}</button>
        <button class="gxa-btn" data-a="m-send" type="button" style="flex:1" ${S.busy ? "disabled" : ""}>${S.busy ? "Enviando…" : "Enviar"}</button></div></div>${prev}${statusRows()}`;
  }

  function grab() {
    const v = id => ($(id) ? $(id).value : null);
    const set = (k, id) => { const x = v(id); if (x !== null) S[k] = x; };
    set("q", "gxmQ"); set("title", "gxmT"); set("body", "gxmB"); set("gold", "gxmGo"); set("gems", "gxmGe"); set("xp", "gxmXp"); set("tr", "gxmTr");
  }

  async function search(api) {
    const raw = S.q.trim().replace(/^@+/, ""); if (!raw) return;
    S.searching = true; S.msg = ""; api.draw();
    try {
      const g = G(), fs = await g.fsModule(), db = g.fb.db, map = new Map();
      if (/^[A-Za-z0-9]{20,}$/.test(raw)) {
        const u = await fs.getDoc(fs.doc(db, "users", raw));
        if (u.exists()) map.set(u.id, { uid: u.id, name: u.data().username || "jugador", avatar: u.data().avatar || "a1" });
      }
      const lo = raw.toLowerCase();
      const sn = await fs.getDocs(fs.query(fs.collection(db, "users"), fs.where("usernameLower", ">=", lo), fs.where("usernameLower", "<=", lo + "\uf8ff"), fs.limit(15)));
      sn.docs.forEach(d => { if (!map.has(d.id)) map.set(d.id, { uid: d.id, name: d.data().username || "jugador", avatar: d.data().avatar || "a1" }); });
      S.res = [...map.values()];
    } catch (e) { console.warn("[correo] búsqueda", e); S.res = []; S.msg = classify(e) + ": " + (TXT[classify(e)] || ""); S.ok = false; }
    S.searching = false; api.draw();
  }

  async function pick(uid, api) {
    const r = (S.res || []).find(x => x.uid === uid); if (!r) return;
    if (!multi()) S.sel = [];
    if (S.sel.some(x => x.uid === uid)) return;
    if (S.sel.length >= MAXR) { S.msg = "Máximo " + MAXR + " destinatarios por envío."; S.ok = false; return api.draw(); }
    const item = Object.assign({}, r);
    S.sel.push(item); api.draw();
    try {   // estado de la cuenta
      const g = G(), fs = await g.fsModule(), b = await fs.getDoc(fs.doc(g.fb.db, "bans", uid));
      const d = b.exists() ? b.data() : null;
      item.st = d && (d.permanent || (d.until && d.until.toMillis() > Date.now())) ? "Sancionado" : "Cuenta activa";
      api.draw();
    } catch (e) {}
  }

  function validate() {
    const t = S.title.trim(), b = S.body.trim();
    if (t.length < 1 || t.length > 60) throw Object.assign(bad("DATOS_INVALIDOS"), { why: "El asunto debe tener 1 a 60 caracteres." });
    if (b.length < 1 || b.length > 600) throw Object.assign(bad("DATOS_INVALIDOS"), { why: "El mensaje debe tener 1 a 600 caracteres." });
    if (needsRecipients() && !S.sel.length) throw Object.assign(bad("DATOS_INVALIDOS"), { why: "Selecciona al menos un destinatario." });
    if (S.kind === "reward") {
      const r = rewardObj(), vals = [r.xp, r.trophies, r.gold || 0, r.gems || 0];
      if (vals.some(x => !Number.isSafeInteger(x) || x < 0)) throw Object.assign(bad("DATOS_INVALIDOS"), { why: "Cantidades no válidas." });
      if (r.xp > 100000 || r.trophies > 1000 || (r.gold || 0) > 1e9 || (r.gems || 0) > 1e9) throw Object.assign(bad("DATOS_INVALIDOS"), { why: "Cantidad fuera del máximo permitido por las reglas (XP 100000, trofeos 1000, monedas 1.000.000.000)." });
      if (!vals.some(x => x > 0)) throw Object.assign(bad("DATOS_INVALIDOS"), { why: "La recompensa debe incluir algo." });
    }
    return { title: t, body: b };
  }

  async function send(api, retry) {
    if (S.busy) return;
    let run = S.run;
    if (!retry || !run) {
      try { var { title, body } = validate(); }
      catch (e) { S.msg = e.why || TXT[classify(e)]; S.ok = false; return api.draw(); }
      run = S.run = { op: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9), kind: S.kind, title, body,
        reward: S.kind === "reward" ? rewardObj() : null,
        items: needsRecipients() ? S.sel.map(r => ({ uid: r.uid, name: "@" + r.name, st: "pending" })) : [{ uid: "*", name: "Todos los jugadores", st: "pending" }] };
    }
    S.busy = true; S.msg = ""; api.draw();
    const g = G(), fs = await g.fsModule(), db = g.fb.db, me = g.state.user.uid;
    const byName = (g.state.profile && g.state.profile.username) || "admin";
    const todo = run.items.filter(i => i.st !== "sent");
    const one = async it => {
      try {
        if (it.uid === "*") {
          await fs.setDoc(fs.doc(db, "announcements", run.op), { title: run.title, body: run.body, by: me, byName, createdAt: fs.serverTimestamp() });
        } else {
          const u = await fs.getDoc(fs.doc(db, "users", it.uid)).catch(e => { throw e; });
          if (!u.exists()) throw bad("DESTINATARIO_NO_ENCONTRADO");
          await fs.setDoc(fs.doc(db, "users", it.uid, "mail", run.op), {
            type: run.kind === "reward" ? "reward" : "message",
            title: (run.kind === "announcement" ? "📢 " : "") + run.title, body: run.body,
            reward: run.reward, read: false, claimed: false, ack: false, from: "admin", createdAt: fs.serverTimestamp()
          });
        }
        it.st = "sent"; it.code = null; it.note = it.maybe ? "Ya estaba entregado." : "";
      } catch (e) {
        const c = classify(e);
        if (it.maybe && c === "PERMISO_DENEGADO") { it.st = "sent"; it.note = "Ya estaba entregado (no se duplicó)."; return; }
        console.warn("[correo] envío a", it.uid, e);
        it.st = "failed"; it.code = c; it.maybe = c === "ERROR_DE_BASE_DE_DATOS";
      }
    };
    for (let i = 0; i < todo.length; i += 10) await Promise.all(todo.slice(i, i + 10).map(one));
    const ok = run.items.filter(i => i.st === "sent").length, fail = run.items.length - ok;
    try {
      await fs.addDoc(fs.collection(db, "adminLog"), { admin: me, adminName: byName, action: "mail_" + run.kind,
        target: run.items.length === 1 ? run.items[0].uid : "*", targetName: run.items.length === 1 ? run.items[0].name.replace(/^@/, "") : run.items.length + " destinatarios",
        reason: ("Correo: " + run.title).slice(0, 200), change: "enviados " + ok + " · fallidos " + fail, at: fs.serverTimestamp() });
    } catch (e) { console.warn("[correo] registro", e); }
    S.busy = false; S.ok = fail === 0;
    S.msg = fail ? "Enviados " + ok + ", fallidos " + fail + ". Puedes reintentar los fallidos sin duplicar." : "Enviado a " + ok + " destinatario" + (ok === 1 ? "" : "s") + ".";
    if (!fail) { S.title = ""; S.body = ""; S.gold = S.gems = S.xp = S.tr = ""; S.sel = []; S.res = null; S.prev = false; }
    api.draw();
  }

  async function act(a, b, api) {
    if (a === "m-kind") { S.kind = b.dataset.v; S.sel = S.sel.slice(0, multi() ? MAXR : 1); S.run = null; S.msg = ""; }
    else if (a === "m-aud") { S.aud = b.dataset.v; S.sel = S.sel.slice(0, multi() ? MAXR : 1); S.run = null; S.msg = ""; }
    else if (a === "m-preview") S.prev = !S.prev;
    else if (a === "m-unpick") S.sel = S.sel.filter(x => x.uid !== b.dataset.uid);
    else if (a === "m-search") return search(api);
    else if (a === "m-pick") return pick(b.dataset.uid, api);
    else if (a === "m-send") { S.run = null; return send(api, false); }
    else if (a === "m-retry") return send(api, true);
    api.draw();
  }

  window.GXMailAdmin = { html, grab, act };
})();
