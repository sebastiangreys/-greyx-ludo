(() => {
  const css = document.createElement("style");
  css.textContent = `
html,body{height:100%;overflow:hidden;overscroll-behavior:none;touch-action:manipulation;
  -webkit-text-size-adjust:100%}
.shell{min-height:0;height:100dvh;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}
.shell::-webkit-scrollbar,.gx6::-webkit-scrollbar{display:none}
.shell:has(.game-layout){overflow:hidden}
.gx6,.settings-panel,.gxa,.gxx,.rk,.rm,.gx-mail{overscroll-behavior:contain;scrollbar-width:none}
/* menú principal: que quepa sin scroll (hoy "Tu progreso" queda detrás de la barra) */
.gx6-in{padding-top:30px}
.gx6-hero{height:clamp(70px,12dvh,130px)}
.gx6-hero svg{height:clamp(60px,10dvh,110px)}
.gx6-t1,.gx6-t2{font-size:min(15.5vw,7dvh,5rem)}
.gx6-sec{margin:12px 0 10px}
.gx6-card{min-height:clamp(100px,15dvh,128px)!important}
.gx6-prog{margin-top:10px}
`;
  document.head.appendChild(css);

  // Zoom: pellizco y doble toque (Safari iOS ignora user-scalable)
  ["gesturestart","gesturechange","gestureend"].forEach(t =>
    document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  let lastTap = 0;
  document.addEventListener("touchend", e => {
    const n = Date.now();
    if (n - lastTap < 300) e.preventDefault();
    lastTap = n;
  }, { passive: false });
  document.addEventListener("wheel", e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && ["+","-","=","0"].includes(e.key)) e.preventDefault();
  });

  // Scroll: solo se permite dentro de contenedores que realmente se desplazan
  const scrollable = el => {
    for (; el && el !== document.body; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
  };
  document.addEventListener("touchmove", e => {
    if (e.touches.length > 1 || !scrollable(e.target)) e.preventDefault();
  }, { passive: false });
})();
