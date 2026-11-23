/* GREYX LUDO — REPARACIONES + DIAGNÓSTICO
   A) Quita el widget VIEJO de recompensa diaria (el del botón de monedas de la tienda, que usaba el Worker)
      y abre siempre el NUEVO (greyx-daily.js).
   B) Panel de diagnóstico (solo owner, o abre la web con  #diag  al final de la dirección):
      mide la conexión REAL con el Worker de la tienda y con Firebase, y te da un informe para copiar.
   Cargar como ÚLTIMO script:  <script src="greyx-reparaciones.js?v=1"></script> */
(() => {
  "use strict";
  if (window.__gxRep) return; window.__gxRep = true;
  const G = () => window.GX;
  const BASE = String(window.GX_SHOP_API || "https://greyx-shop.izturriagasebastian.workers.dev").replace(/\/+$/, "");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ============ A) Widget viejo de recompensa diaria -> el nuevo ============ */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest('.gs-md [data-g="daily"]');
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    document.querySelectorAll(".gs-md").forEach(x => x.remove());
    if (window.GXDaily) window.GXDaily.open();
  }, true);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType === 1 && n.id === "gsDaily") { n.remove(); if (window.GXDaily) window.GXDaily.open(); }
  }))).observe(document.body, { childList: true });

  /* ============ B) Diagnóstico ============ */
  const logs = [];
  const push = (k, m) => { logs.push(new Date().toLocaleTimeString() + " " + k + ": " + String(m).slice(0, 300)); if (logs.length > 40) logs.shift(); };
  addEventListener("error", e => push("error", e.message));
  addEventListener("unhandledrejection", e => { const r = e.reason; push("promesa", (r && (r.code || r.message)) || r); });
  const ow = console.warn;
  console.warn = function () {
    try { push("aviso", Array.from(arguments).map(a => a && a.code ? a.code + " " + (a.message || "") : a && a.message ? a.message : String(a)).join(" ")); } catch (e) {}
    return ow.apply(console, arguments);
  };

  const st = document.createElement("style");
  st.textContent = `
.gxd-b{position:fixed;left:10px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:1000020;width:42px;height:42px;border-radius:50%;border:1px solid #6d5cffaa;background:#0d1030;color:#fff;font-size:1.1rem;opacity:.75}
.gxd{position:fixed;inset:0;z-index:1000021;overflow-y:auto;background:#05060fee;color:#fff;font-family:Inter,system-ui,sans-serif;padding:calc(14px + env(safe-area-inset-top,0px)) 14px 30px}
.gxd-in{max-width:520px;margin:0 auto}.gxd h2{margin:0 0 4px}.gxd p{color:#9aa4d6;font-size:.8rem;margin:0 0 12px}
.gxd-r{padding:10px 12px;margin-bottom:8px;border-radius:12px;background:#ffffff0a;border:1px solid #ffffff14;font-size:.78rem;line-height:1.4;word-break:break-word}
.gxd-r b{display:block}.gxd-r.ok{border-color:#22c55e77}.gxd-r.no{border-color:#ef444499;background:#ef444414}.gxd-r.wa{border-color:#fbbf2488}
.gxd button.a{width:100%;min-height:46px;margin:6px 0;border:0;border-radius:13px;font:900 .85rem Inter,system-ui,sans-serif;color:#fff;background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
.gxd button.g{background:#ffffff12;border:1px solid #ffffff22}`;
  document.head.appendChild(st);

  const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(Object.assign(new Error("tiempo agotado"), { name: "Timeout" })), ms))]);
  const DAY = 86400000, TZ = -4 * 3600000;

  async function run(box) {
    const out = [], add = (st, n, d) => { out.push({ st, n, d }); draw(); };
    const draw = () => {
      box.querySelector(".res").innerHTML = out.map(o => `<div class="gxd-r ${o.st}"><b>${o.st === "ok" ? "✅" : o.st === "no" ? "❌" : "⚠️"} ${esc(o.n)}</b>${esc(o.d)}</div>`).join("") || "Midiendo…";
    };
    out.length = 0; draw();
    const g = G(), u = g && g.state.user;
    add(navigator.onLine ? "ok" : "no", "Internet del dispositivo", navigator.onLine ? "Conectado." : "El navegador dice que no hay conexión.");
    if (!u) return add("no", "Sesión", "No hay sesión iniciada.");
    add("ok", "Sesión", "UID " + u.uid + " · " + (u.email || ""));

    // 1) ¿El Worker existe y responde? (sin CORS: solo comprueba que alguien contesta)
    let reach = false;
    try { await timeout(fetch(BASE + "/", { mode: "no-cors", cache: "no-store" }), 9000); reach = true; add("ok", "Worker de la tienda: alcanzable", BASE); }
    catch (e) { add("no", "Worker de la tienda: NO alcanzable", e.name + ". La dirección no existe, el Worker no está desplegado o hay bloqueo de red. Esto produce «Sin conexión»."); }

    // 2) Llamada real con permisos (la que usa la tienda). Es idempotente.
    if (reach) {
      try {
        const tok = await g.fb.auth.currentUser.getIdToken(), t0 = performance.now();
        const r = await timeout(fetch(BASE + "/api/wallet/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: "{}" }), 15000);
        const txt = (await r.text()).slice(0, 200), ms = Math.round(performance.now() - t0);
        add(r.ok ? "ok" : "no", "Worker /api/wallet/sync", "HTTP " + r.status + " en " + ms + " ms · " + txt);
      } catch (e) {
        add("no", "Worker /api/wallet/sync: la respuesta fue BLOQUEADA", e.name + ": " + e.message + ". Si el paso anterior fue ✅, esto es casi seguro CORS faltante o una excepción del Worker (un Worker que falla responde sin cabeceras CORS y el navegador lo muestra como «Sin conexión»). Revisa los logs del Worker en Cloudflare (Workers → tu Worker → Logs).");
      }
    }

    // 3) Firestore: billetera, inventario y equipo
    try {
      const fs = await g.fsModule(), db = g.fb.db;
      const w = await fs.getDoc(fs.doc(db, "wallet", u.uid));
      if (!w.exists()) add("wa", "Billetera", "No existe todavía (se crea con el bono de 500).");
      else {
        const d = w.data(), today = Math.floor((Date.now() + TZ) / DAY), dl = d.daily || {};
        const can = dl.lastDay !== today;
        add("ok", "Billetera", "Oro " + d.coins + " · diamantes " + (d.gems || 0) + " · racha " + (dl.streak || 0) + " · último día reclamado " + dl.lastDay + " · hoy (hora RD) " + today);
        add(can ? "ok" : "wa", "Recompensa diaria", can ? "Disponible para reclamar." : "Ya reclamada hoy; vuelve mañana (hora de República Dominicana, UTC-4).");
      }
      for (const [n, p] of [["Inventario de tienda", ["shopInventory", u.uid, "items"]], ["Equipo de tienda", ["shopEquip", u.uid]]]) {
        try { p.length === 3 ? await fs.getDocs(fs.collection(db, ...p)) : await fs.getDoc(fs.doc(db, ...p)); add("ok", n, "Lectura permitida."); }
        catch (e) { add("no", n, "No se pudo leer: " + (e.code || e.message)); }
      }
    } catch (e) { add("no", "Firestore", (e.code || e.message)); }

    add(logs.length ? "wa" : "ok", "Últimos errores del juego (" + logs.length + ")", logs.slice(-12).join("\n") || "Ninguno.");
    box.dataset.report = out.map(o => (o.st === "ok" ? "OK " : o.st === "no" ? "FALLO " : "AVISO ") + o.n + " — " + o.d).join("\n");
  }

  function open() {
    if (document.getElementById("gxd")) return;
    const box = document.createElement("div");
    box.id = "gxd"; box.className = "gxd";
    box.innerHTML = `<div class="gxd-in"><h2>Diagnóstico</h2><p>Mide la conexión real con la tienda y Firebase. No modifica tus datos.</p>
      <button class="a" data-d="run" type="button">Ejecutar de nuevo</button><button class="a g" data-d="copy" type="button">Copiar informe</button><button class="a g" data-d="close" type="button">Cerrar</button><div class="res">Midiendo…</div></div>`;
    box.addEventListener("click", async e => {
      const b = e.target.closest("[data-d]"); if (!b) return;
      if (b.dataset.d === "close") box.remove();
      else if (b.dataset.d === "run") run(box);
      else if (b.dataset.d === "copy") { try { await navigator.clipboard.writeText(box.dataset.report || ""); b.textContent = "¡Copiado!"; } catch (er) { b.textContent = "No se pudo copiar"; } }
    });
    document.body.appendChild(box); run(box);
  }

  setInterval(() => {
    const g = G(); if (!g) return;
    const show = !!(g.state.isOwner || /#diag/.test(location.hash));
    let b = document.querySelector(".gxd-b");
    if (show && !b) { b = document.createElement("button"); b.className = "gxd-b"; b.type = "button"; b.textContent = "🩺"; b.setAttribute("aria-label", "Diagnóstico"); b.onclick = open; document.body.appendChild(b); }
    else if (!show && b) b.remove();
  }, 1500);
  window.GXDiag = { open };
})();
