/* GREYX LUDO — CONEXIÓN TIENDA / INVENTARIO
   Reemplaza el aviso "MUY PRONTO" por la tienda e inventario reales (greyx-shop.js).
   Cargar como ÚLTIMO <script>, con versión para romper la caché:
   <script src="greyx-tienda.js?v=1"></script> */
(() => {
  "use strict";
  if (window.__gxTienda) return;
  window.__gxTienda = true;

  const KINDS = { TIENDA: "openShop", INVENTARIO: "openInventory" };

  function missing() {
    const m = [];
    if (!window.GXShopCatalog) m.push("greyx-shop-catalog.js");
    if (!window.GXShopArt) m.push("greyx-shop-art.js");
    if (!window.GXSkins) m.push("greyx-shop-skins.js");
    if (!window.GXShop) m.push("greyx-shop.js");
    return m;
  }

  function warn(list) {
    const t = document.createElement("div");
    t.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2000000;max-width:90vw;padding:12px 18px;border-radius:16px;background:#3b0a0a;border:1px solid #ef4444;color:#fecaca;font:800 13px Inter,system-ui,sans-serif;text-align:center;box-shadow:0 10px 30px #000c";
    t.textContent = "La tienda no cargó. Falta o falla: " + list.join(", ");
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  }

  function openFor(name) {
    const fn = KINDS[name];
    if (!fn) return false;
    document.querySelectorAll(".g8-soon").forEach(e => e.remove());
    const miss = missing();
    if (miss.length) { warn(miss); return true; }
    try { window.GXShop[fn](); } catch (e) { console.error("[tienda]", e); warn(["error: " + (e && e.message || e)]); }
    return true;
  }

  // 1) Intercepta el toque antes de que el menú muestre "MUY PRONTO"
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest(".g8-tile");
    if (!t) return;
    const name = (t.dataset.name || "").trim().toUpperCase();
    if (!KINDS[name]) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openFor(name);
  }, true);

  // 2) Red de seguridad: si aun así aparece el aviso, se cierra y se abre la tienda real
  new MutationObserver(ms => {
    ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1 || !n.classList.contains("g8-soon")) return;
      const txt = (n.textContent || "").toUpperCase();
      if (txt.indexOf("INVENTARIO") > -1) { n.remove(); openFor("INVENTARIO"); }
      else if (txt.indexOf("TIENDA") > -1) { n.remove(); openFor("TIENDA"); }
    }));
  }).observe(document.body, { childList: true });

  console.log("[tienda] conexión activa. Módulos que faltan:", missing().join(", ") || "ninguno");
})();
