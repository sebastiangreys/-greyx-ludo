/* GREYX LUDO — Botón de pausa en partida (pausa / nueva partida / salir)
   Se agrega UNA línea antes de </body>, como último script:
   <script src="greyx-pausa.js"></script>
*/
(() => {
  const _st = window.setTimeout.bind(window);

  /* ---------- Estado de pausa ---------- */
  let paused = false;
  let gen = 0;                 // cambia al reiniciar/salir: invalida timers viejos de la partida
  const held = [];             // callbacks que vencieron mientras estaba en pausa
  let pausedAnims = [];

  const phase = () => (window.GX && GX.state ? GX.state.phase : null);

  /* Envuelve setTimeout: congela bots, movimientos y animaciones por tiempo */
  window.setTimeout = function (fn, ms, ...args) {
    if (typeof fn !== "function") return _st(fn, ms, ...args);
    const g = phase() === "playing" ? gen : -1;
    return _st(function () {
      if (g !== -1 && g !== gen) return;           // timer de una partida anterior
      if (paused && g !== -1) { held.push(() => fn.apply(this, args)); return; }
      fn.apply(this, args);
    }, ms);
  };

  function freezeAnimations() {
    try {
      pausedAnims = document.getAnimations().filter(a => a.playState === "running");
      pausedAnims.forEach(a => a.pause());
    } catch (e) { pausedAnims = []; }
  }
  function unfreezeAnimations() {
    pausedAnims.forEach(a => { try { a.play(); } catch (e) {} });
    pausedAnims = [];
  }

  /* ---------- Textos (es / en / pt) ---------- */
  const T = {
    es: { pause:"PAUSA", sub:"La partida está detenida.", resume:"Reanudar", again:"Nueva partida", exit:"Salir",
          qNew:"¿Nueva partida?", dNew:"Se reiniciará con los mismos jugadores.",
          qExit:"¿Salir al menú?", dExit:"Se perderá la partida actual.", cancel:"Cancelar", ok:"Aceptar" },
    en: { pause:"PAUSED", sub:"The game is on hold.", resume:"Resume", again:"New game", exit:"Exit",
          qNew:"New game?", dNew:"It will restart with the same players.",
          qExit:"Exit to menu?", dExit:"The current game will be lost.", cancel:"Cancel", ok:"Accept" },
    pt: { pause:"PAUSA", sub:"A partida está parada.", resume:"Continuar", again:"Nova partida", exit:"Sair",
          qNew:"Nova partida?", dNew:"Será reiniciada com os mesmos jogadores.",
          qExit:"Sair para o menu?", dExit:"A partida atual será perdida.", cancel:"Cancelar", ok:"Aceitar" }
  };
  const t = () => T[(window.GX && GX.state && GX.state.lang)] || T.es;

  /* ---------- Estilos ---------- */
  const css = `
body.gx-playing .gx-fab,
body.gx-playing .top-actions{display:none!important}

.gxp-btn-open{
  position:fixed;z-index:999;
  top:calc(12px + env(safe-area-inset-top,0px));right:14px;
  width:46px;height:46px;display:none;place-items:center;
  border-radius:50%;cursor:pointer;color:#fff;padding:0;
  background:linear-gradient(145deg,#232a66,#0d1030);
  border:1px solid #6d5cffaa;
  box-shadow:0 0 18px #4f46e577,0 6px 16px #000a;
}
.gxp-btn-open.show{display:grid}
.gxp-btn-open:active{transform:scale(.93)}
.gxp-btn-open svg{width:20px;height:20px}

.gxp-ov{
  position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:20px;
  background:rgba(5,6,12,.82);animation:gxpFade .2s ease-out both;
}
.gxp-card{
  width:min(320px,100%);padding:24px 18px 18px;border-radius:28px;text-align:center;color:#fff;
  border:1px solid #a78bfa44;background:linear-gradient(160deg,#242a4d,#0f1326);
  box-shadow:0 30px 80px #000c,0 0 40px #6d28d933,inset 0 1px 0 #ffffff1a;
  animation:gxpPop .28s cubic-bezier(.2,.8,.2,1) both;
}
.gxp-card.small{width:min(268px,100%);padding:20px 16px 16px;border-radius:24px}
.gxp-ico{
  width:60px;height:60px;margin:0 auto 10px;display:grid;place-items:center;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#4c3fa8,#14172e);
  border:2px solid #a78bfa;box-shadow:0 0 24px #8b5cf666;
}
.gxp-ico svg{width:26px;height:26px}
.gxp-card h2{margin:0;font:900 1.15rem Inter,system-ui,sans-serif;letter-spacing:.18em}
.gxp-card.small h2{font-size:1.02rem;letter-spacing:0}
.gxp-card p{margin:6px 0 16px;color:#a3abbd;font-size:.8rem;line-height:1.4}
.gxp-col{display:grid;gap:10px}
.gxp-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.gxp-b{
  min-height:50px;border:0;border-radius:16px;color:#fff;cursor:pointer;
  font:900 .9rem Inter,system-ui,sans-serif;letter-spacing:.02em;
  background:linear-gradient(160deg,#2a3170,#161a40);
  border:1px solid #ffffff22;box-shadow:0 4px 0 #0b0d26;
}
.gxp-b:active{transform:translateY(3px);box-shadow:0 1px 0 #0b0d26}
.gxp-b.go{
  min-height:56px;color:#032016;border-color:#ffffff40;
  background:linear-gradient(135deg,#34d399,#059669);box-shadow:0 5px 0 #065f46,0 10px 22px #05966955;
}
.gxp-b.go:active{box-shadow:0 1px 0 #065f46}
.gxp-b.out{color:#fca5a5;border-color:#ef444477;background:linear-gradient(160deg,#4a1218,#1c0a0d);box-shadow:0 4px 0 #1c0a0d}
.gxp-b.ok{background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 4px 0 #3b1d8f}
@keyframes gxpFade{from{opacity:0}to{opacity:1}}
@keyframes gxpPop{from{opacity:0;transform:translateY(14px) scale(.94)}to{opacity:1;transform:none}}
`;
  const style = document.createElement("style");
  style.id = "gx-pausa-css";
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- Botón de pausa (arriba a la derecha) ---------- */
  const openBtn = document.createElement("button");
  openBtn.className = "gxp-btn-open";
  openBtn.type = "button";
  openBtn.setAttribute("aria-label", "Pausa");
  openBtn.innerHTML =
    `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1.4"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4"/></svg>`;
  document.body.appendChild(openBtn);

  /* ---------- Ventanas ---------- */
  let ov = null;

  function show(view) {
    const L = t();
    if (!ov) {
      ov = document.createElement("div");
      ov.className = "gxp-ov";
      ov.addEventListener("click", onClick);
      document.body.appendChild(ov);
    }
    if (view === "menu") {
      ov.innerHTML = `
        <section class="gxp-card" role="dialog" aria-modal="true">
          <div class="gxp-ico"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1.4"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4"/></svg></div>
          <h2>${L.pause}</h2>
          <p>${L.sub}</p>
          <div class="gxp-col">
            <button class="gxp-b go" data-p="resume" type="button">${L.resume}</button>
            <button class="gxp-b" data-p="ask-new" type="button">${L.again}</button>
            <button class="gxp-b out" data-p="ask-exit" type="button">${L.exit}</button>
          </div>
        </section>`;
    } else {
      const isExit = view === "exit";
      ov.innerHTML = `
        <section class="gxp-card small" role="dialog" aria-modal="true">
          <h2>${isExit ? L.qExit : L.qNew}</h2>
          <p>${isExit ? L.dExit : L.dNew}</p>
          <div class="gxp-row">
            <button class="gxp-b" data-p="back" type="button">${L.cancel}</button>
            <button class="gxp-b ok" data-p="${isExit ? "do-exit" : "do-new"}" type="button">${L.ok}</button>
          </div>
        </section>`;
    }
  }

  function hide() {
    if (ov) { ov.remove(); ov = null; }
  }

  function pause() {
    if (paused || phase() !== "playing") return;
    paused = true;
    freezeAnimations();
    show("menu");
  }

  function resume() {
    hide();
    paused = false;
    unfreezeAnimations();
    held.splice(0).forEach(f => { try { f(); } catch (e) { console.warn(e); } });
  }

  /* Reinicia o sale reutilizando los botones de configuración del juego */
  function viaSettings(action) {
    const gear = document.querySelector('.top-actions [data-action="settings"]');
    if (!gear) return;
    gear.click();
    for (let i = 0; i < 2; i++) {            // el 1er toque pide confirmación, el 2º ejecuta
      const b = document.querySelector('.settings-overlay [data-action="' + action + '"]');
      if (!b) break;
      b.click();
    }
  }

  function leaveGame(action) {
    gen++;                                    // invalida timers de la partida vieja
    held.length = 0;
    paused = false;
    pausedAnims = [];
    hide();
    document.querySelectorAll(".arrival-confetti,.capture-mark,.capture-flying,.xp-popup,.trophy-popup")
      .forEach(el => el.remove());
    viaSettings(action);
  }

  function onClick(e) {
    const b = e.target.closest("[data-p]");
    if (!b) return;
    switch (b.dataset.p) {
      case "resume":   resume(); break;
      case "ask-new":  show("new"); break;
      case "ask-exit": show("exit"); break;
      case "back":     show("menu"); break;
      case "do-new":   leaveGame("settings-new-game"); break;
      case "do-exit":  leaveGame("settings-menu"); break;
    }
  }

  openBtn.addEventListener("click", pause);

  /* ---------- Mostrar el botón solo durante la partida ---------- */
  function sync() {
    const playing =
      phase() === "playing" &&
      !(GX.state.celebrating) &&
      !document.querySelector(".settings-overlay,.gx-intro,.gx-gate,.winner,.celebration");
    document.body.classList.toggle("gx-playing", phase() === "playing");
    openBtn.classList.toggle("show", !!playing || (paused && !!ov));
    if (paused && phase() !== "playing") { hide(); paused = false; unfreezeAnimations(); }
  }

  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
  setInterval(sync, 300);
  sync();
})();
