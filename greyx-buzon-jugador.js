/* GREYX LUDO — LADO DEL JUGADOR: reclamar recompensas con oro/diamantes, ver anuncios y mostrar diamantes.
   Cargar al final:  <script src="greyx-buzon-jugador.js?v=1"></script> */
(() => {
  "use strict";
  if (window.__gxBuzonJ) return; window.__gxBuzonJ = true;
  const G = () => window.GX;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = t => { const d = document.createElement("div"); d.className = "gx-toast2"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); };
  let lastId = null, busy = false;

  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest(".gx-mail [data-m]"); if (!t) return;
    if (t.dataset.m === "open") lastId = t.dataset.id;
    if (t.dataset.m === "claim") { e.preventDefault(); e.stopImmediatePropagation(); claim(); }
  }, true);

  async function claim() {
    if (busy || !lastId) return; busy = true;
    try {
      const g = G(), s = g.state, fs = await g.fsModule(), db = g.fb.db, uid = s.user.uid, p = s.profile;
      const mref = fs.doc(db, "users", uid, "mail", lastId), ms = await fs.getDoc(mref);
      if (!ms.exists() || ms.data().claimed) throw { app: "Ya reclamada." };
      const r = ms.data().reward || {}, xp = r.xp | 0, tr = r.trophies | 0, gold = r.gold | 0, gems = r.gems | 0;
      const b = fs.writeBatch(db); let nxp = null;
      b.update(mref, { claimed: true, read: true });
      if (xp || tr) {
        const sref = fs.doc(db, "stats", uid), ss = await fs.getDoc(sref);
        if (!ss.exists()) throw { app: "Juega una partida primero para poder reclamar XP/trofeos." };
        const d = ss.data(); nxp = (d.xp || 0) + xp;
        b.update(sref, { xp: nxp, trophies: (d.trophies || 0) + tr, lastClaimId: lastId, updatedAt: fs.serverTimestamp() });
        b.set(fs.doc(db, "publicProfiles", uid), { username: p.username, usernameLower: p.usernameLower, avatar: p.avatar || "a1", xp: nxp, trophies: (d.trophies || 0) + tr, wins: d.wins || 0, played: d.played || 0, updatedAt: fs.serverTimestamp() });
      }
      if (gold || gems) {
        const wref = fs.doc(db, "wallet", uid), ws = await fs.getDoc(wref);
        if (!ws.exists()) throw { app: "Abre la Recompensa diaria una vez para crear tu billetera y vuelve a reclamar." };
        const u = { lastClaimId: lastId, updatedAt: fs.serverTimestamp() };
        if (gold) u.coins = fs.increment(gold);
        if (gems) u.gems = fs.increment(gems);
        b.update(wref, u);
      }
      await b.commit();
      if (nxp !== null) { s.xp = nxp; s.xpLevel = g.xpLevelFromTotal(nxp); s.xpLoaded = true; g.render(); }
      toast("🎁 Recompensa reclamada");
    } catch (e) { console.warn("[claim]", e); toast(e && e.app ? e.app : "No se pudo reclamar. Intenta de nuevo."); }
    busy = false;
  }

  /* Diamantes en el menú + anuncios generales */
  let cur = null, un = [], anns = [];
  async function sub(uid) {
    const g = G(), fs = await g.fsModule(), db = g.fb.db;
    un.push(fs.onSnapshot(fs.doc(db, "wallet", uid), s => { g.state.gems = s.exists() ? (s.data().gems || 0) : 0; }, () => {}));
    un.push(fs.onSnapshot(fs.query(fs.collection(db, "announcements"), fs.orderBy("createdAt", "desc"), fs.limit(5)),
      sn => { anns = sn.docs.map(d => Object.assign({ id: d.id }, d.data())); }, () => {}));
  }
  const key = () => "gx-ann-" + cur;
  const seen = () => { try { return JSON.parse(localStorage.getItem(key()) || "[]"); } catch (e) { return []; } };
  function showNext() {
    if (!cur || document.querySelector(".gx-intro,.gx-gate,.gx-warn")) return;
    const sn = seen(), a = anns.find(x => x.createdAt && x.createdAt.toMillis && Date.now() - x.createdAt.toMillis() < 14 * 864e5 && !sn.includes(x.id));
    if (!a) return;
    const w = document.createElement("div"); w.className = "gx-warn";
    w.innerHTML = `<div class="gx-warn-card"><div class="gx-warn-ico">📢</div><h3>Anuncio</h3><h4>${esc(a.title)}</h4><p>${esc(a.body)}</p><button class="gx-mail-btn" type="button">Entendido</button></div>`;
    w.querySelector("button").onclick = () => { w.remove(); try { localStorage.setItem(key(), JSON.stringify(seen().concat(a.id).slice(-50))); } catch (e) {} };
    document.body.appendChild(w);
  }
  setInterval(() => {
    const g = G(); if (!g || !g.fb || !g.fb.db) return;
    const uid = g.state.user ? g.state.user.uid : null;
    if (uid !== cur) { un.forEach(f => { try { f(); } catch (e) {} }); un = []; anns = []; cur = uid; if (uid) sub(uid); else g.state.gems = 0; }
    showNext();
  }, 2000);
})();
