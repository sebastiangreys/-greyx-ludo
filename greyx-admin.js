(() => {
  const ITEMS = ["frame_lv10","bg_lv20","title_lv30","frame_lv40","bg_lv50",
    "title_lv60","frame_lv70","bg_lv80","fx_lv90","frame_lv100","title_lv100",
    "title_novato","title_campeon","title_cazador","frame_racha",
    "bg_veterano","fx_chispas","frame_trofeo"];
  let checkedUid = null, fab = null;

  async function checkAdmin() {
    const G = window.GX;
    if (!G) return;
    const u = G.state.user;
    if (!u) {
      checkedUid = null;
      G.state.isOwner = false;
      if (fab) { fab.remove(); fab = null; }
      return;
    }
    if (checkedUid === u.uid || !G.fb || !G.fb.db) return;
    checkedUid = u.uid;
    try {
      const fs = await G.fsModule();
      const snap = await fs.getDoc(fs.doc(G.fb.db, "admins", u.uid));
      if (!snap.exists()) return;
      G.state.isOwner = true;
      G.render();
      makeButton();
    } catch (e) { console.warn("admin", e); }
  }
  setInterval(checkAdmin, 1000);

  function makeButton() {
    if (fab) return;
    fab = document.createElement("button");
    fab.textContent = "🛡️";
    fab.style.cssText = "position:fixed;z-index:999;top:12px;left:14px;width:46px;height:46px;border-radius:50%;border:1px solid #fbbf24;background:#1b1f4a;font-size:19px";
    fab.onclick = () => {
      const o = prompt("1 = Banear\n2 = Desbloquear todo");
      if (o === "1") {
        const t = prompt("Username o UID:");
        const type = prompt("warning / temp / permanent");
        const r = prompt("Razón (3-200 caracteres):");
        const d = type === "temp" ? Number(prompt("Días:")) : 0;
        if (t && type && r) ban(t, type, r, d).then(() => alert("Listo")).catch(e => alert("Error: " + e.code));
      }
      if (o === "2") unlockAll().then(() => alert("Listo"));
    };
    document.body.appendChild(fab);
  }

  async function ban(target, type, reason, days) {
    const G = window.GX, fs = await G.fsModule(), db = G.fb.db;
    let uid = target.trim();
    const n = await fs.getDoc(fs.doc(db, "usernames", uid.replace(/^@/, "").toLowerCase()));
    if (n.exists()) uid = n.data().uid;
    const data = { type, reason, by: G.state.user.uid, at: fs.serverTimestamp() };
    if (type === "temp") data.until = fs.Timestamp.fromMillis(Date.now() + days * 864e5);
    if (type === "permanent") data.permanent = true;
    await fs.setDoc(fs.doc(db, "bans", uid), data);
  }

  async function unlockAll() {
    const G = window.GX, fs = await G.fsModule(), db = G.fb.db, uid = G.state.user.uid;
    for (const id of ITEMS) {
      try {
        const ref = fs.doc(db, "inventory", uid, "items", id);
        if ((await fs.getDoc(ref)).exists()) continue;
        await fs.setDoc(ref, { at: fs.serverTimestamp(), by: uid, reason: "owner unlock" });
      } catch (e) { console.warn(id, e.code); }
    }
  }
})();
