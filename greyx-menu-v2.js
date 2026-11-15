/* GREYX LUDO — MENÚ PRINCIPAL v3 (diseño definitivo, basado en la imagen de referencia)
   Carga: greyx-icons.js y después greyx-menu-v2.js (ambos DESPUÉS de greyx-fijo.js). Reemplaza al archivo anterior.
   - Solo presentación + lectura de datos. No escribe en Firebase.
   - Estadísticas: stats/{uid}. Mientras carga muestra "—", nunca ceros inventados.
   - Rango: window.GXRank.rankOf(trofeos). Nombre/avatar: perfil de la cuenta (GX.state.profile).
   - Buzón 💡: window.GXIdeas.open(). Correo y engranaje conservan su funcionamiento.
   - TIENDA / INVENTARIO / MISIONES / EVENTOS: aviso "MUY PRONTO" (sin lógica interna todavía).
   - Contador "jugadores en línea": se lee de presence (Realtime Database). Si no hay permiso, se oculta solo. */
(() => {
  if (window.__gx8) return;
  window.__gx8 = true;

  function boot() {
    const A = window.GXArt, I = A.icon;
    A.defs();

    const $ = (s, r = document) => r.querySelector(s);
    const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const num = n => Number(n || 0).toLocaleString("es");
    const SI = k => A.tile[k] || I[k] || "";

    const FLAG_DO = `<svg class="g8-flag" viewBox="0 0 28 18" aria-label="República Dominicana"><rect width="28" height="18" rx="2.5" fill="#fff"/><rect width="12" height="7.5" fill="#1d4ed8"/><rect x="16" width="12" height="7.5" fill="#dc2626"/><rect y="10.5" width="12" height="7.5" fill="#dc2626"/><rect x="16" y="10.5" width="12" height="7.5" fill="#1d4ed8"/><rect x="12" width="4" height="18" fill="#fff"/><rect y="7.5" width="28" height="3" fill="#fff"/><rect x=".5" y=".5" width="27" height="17" rx="2.2" fill="none" stroke="#ffffff55"/></svg>`;
    const PENCIL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4.2L16.5 4.3a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

    /* ---------- CSS ---------- */
    const css = `
.gx6{display:none!important}
.g8{position:fixed;inset:0;z-index:85;display:none;color:#f1f3ff;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  background:${A.pageBg()} 0 0/150px,radial-gradient(circle at 50% 0,#3a1fa088,transparent 46%),radial-gradient(circle at 100% 42%,#2a3cc844,transparent 40%),radial-gradient(circle at 0 80%,#4c1d9555,transparent 42%),linear-gradient(180deg,#080a2a,#04051a);
  overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;
  padding:calc(10px + env(safe-area-inset-top,0px)) 14px calc(104px + env(safe-area-inset-bottom,0px))}
.g8::-webkit-scrollbar{display:none}
.g8.on{display:block}
.g8 button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer}
.g8 svg{display:block}
.g8-in{width:min(100%,520px);margin:0 auto;display:flex;flex-direction:column;gap:14px}
.g8-in>*{flex:none;min-width:0}

/* tarjeta base: borde dorado como en la referencia */
.g8-card{position:relative;border:1.5px solid #e6b449;border-radius:18px;background:linear-gradient(160deg,#16196aee,#080a30ee);
  box-shadow:0 0 14px #fbbf2433,inset 0 1px 0 #ffffff1c}
.g8-card::after{content:"";position:absolute;inset:3px;border-radius:15px;border:1px solid #fbbf2426;pointer-events:none}

/* encabezado: buzón | logo | correo + engranaje */
.g8-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;min-height:56px}
.g8-ic{position:relative;flex:none;width:46px;height:46px;display:grid;place-items:center;padding:0;border-radius:50%;
  border:1.5px solid #6d5cffaa;background:linear-gradient(145deg,#232a66,#0d1030);box-shadow:0 0 14px #4f46e566;color:#f1f3ff}
.g8-ic svg{width:60%;height:60%}
.g8-ic:active{transform:scale(.93)}
.g8-ic.idea{justify-self:start;border-color:#fbbf24aa;box-shadow:0 0 16px #fbbf2455}
.g8-ic.idea svg{width:66%;height:66%;filter:drop-shadow(0 0 5px #fbbf24)}
.g8-acts{justify-self:end;display:flex;gap:8px}
.g8-dot{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;display:none;place-items:center;border-radius:99px;background:#ef4444;color:#fff;font:900 .58rem Inter,system-ui,sans-serif;border:2px solid #080a2a;font-style:normal}
.g8-dot.on{display:grid}
.g8-logo{display:flex;align-items:center;gap:6px;min-width:0}
.g8-logo>svg{height:56px;width:auto;flex:none;filter:drop-shadow(0 0 12px #6d28d9cc)}
.g8-logo div{display:flex;flex-direction:column;line-height:.9}
.g8-lg1,.g8-lg2{font:900 clamp(1.1rem,5.2vw,1.55rem)/.95 Inter,system-ui,sans-serif;letter-spacing:-.01em;-webkit-background-clip:text;background-clip:text;color:transparent}
.g8-lg1{background-image:linear-gradient(180deg,#fff,#c3c7e6);filter:drop-shadow(0 3px 5px #0008)}
.g8-lg2{background-image:linear-gradient(180deg,#b79dff,#6d28d9);filter:drop-shadow(0 0 9px #7c3aedaa)}

/* monedas */
.g8-wallet{display:flex;align-items:center;padding:10px}
.g8-cur{flex:1;display:flex;align-items:center;gap:8px;min-width:0}
.g8-cur+.g8-cur{border-left:1px solid #ffffff1c;margin-left:10px;padding-left:10px}
.g8-coin{flex:none;width:38px;height:38px;filter:drop-shadow(0 0 8px #fbbf2488)}
.g8-coin.gem{filter:drop-shadow(0 0 8px #8b5cf6)}
.g8-coin svg{width:100%;height:100%}
.g8-cur div{flex:1;min-width:0;line-height:1.1}
.g8-cur small{display:block;color:#9aa4d6;font:800 .5rem Inter,system-ui,sans-serif;letter-spacing:.16em}
.g8-cur b{display:block;font-size:clamp(1rem,4.6vw,1.2rem);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-plus{flex:none;width:36px;height:36px;display:grid;place-items:center;padding:0;border-radius:10px;border:1.5px solid #5b6cff;background:#141a5acc;font-size:1.25rem;font-weight:900;line-height:1}
.g8-plus:active{transform:scale(.92)}

/* recompensa diaria */
.g8-daily{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 14px;
  background:radial-gradient(70% 150% at 10% 50%,#8b4dff77,transparent 62%),radial-gradient(40% 90% at 100% 20%,#fbbf2433,transparent 70%),
   linear-gradient(115deg,#2f1a7e,#0d0830 60%,#2a1d06)}
.g8-chest{width:clamp(64px,19vw,90px);aspect-ratio:100/76;filter:drop-shadow(0 4px 8px #000a)}
.g8-chest svg{width:100%;height:100%}
.g8-dt{min-width:0;line-height:1.25}
.g8-dt b{display:block;font-size:clamp(.78rem,3.5vw,.98rem);font-weight:900;letter-spacing:.03em;color:#ffd96a;text-shadow:0 2px 5px #000a}
.g8-dt small{display:block;margin-top:3px;color:#d4c7ff;font-size:clamp(.58rem,2.7vw,.72rem);font-weight:700}
.g8-claim{align-self:center;padding:11px 16px;border:0;border-radius:99px;background:linear-gradient(180deg,#ffe98a,#f5b301);color:#3a2200;
  font:900 clamp(.64rem,3vw,.78rem) Inter,system-ui,sans-serif;letter-spacing:.05em;white-space:nowrap;box-shadow:0 3px 0 #92600a,0 0 16px #fbbf2477}
.g8-claim:active{transform:translateY(2px);box-shadow:0 1px 0 #92600a}
@media (max-width:350px){.g8-daily{grid-template-columns:auto minmax(0,1fr)}.g8-claim{grid-column:1/-1}}

/* perfil: jugador | rango, y fila de 5 estadísticas */
.g8-prof{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"pl pc" "ps ps";overflow:hidden;
  background:radial-gradient(120% 90% at 50% 40%,#2a2f9a55,transparent 70%),${A.pageBg()} 0 0/120px,linear-gradient(160deg,#10164f,#070a28)}
.g8-pl{grid-area:pl;display:flex;align-items:center;gap:14px;padding:16px 8px 12px 16px;min-width:0}
.g8-avw{position:relative;flex:none;width:clamp(62px,19vw,86px);aspect-ratio:1}
.g8-av{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;font-size:clamp(1.9rem,8vw,2.7rem);
  background:radial-gradient(circle at 35% 30%,#4c3fa8,#14172e);border:2.5px solid #a78bfa;box-shadow:0 0 16px #8b5cf6aa,inset 0 0 10px #0008}
.g8-avc{position:absolute;top:-13px;left:50%;width:24px;height:24px;transform:translateX(-50%);filter:drop-shadow(0 0 6px #fbbf24);pointer-events:none}
.g8-edit{position:absolute;right:-5px;bottom:-3px;width:28px;height:28px;display:grid;place-items:center;padding:0;border-radius:50%;
  border:1.5px solid #a78bfa;background:#1b1d63;color:#fff;box-shadow:0 2px 8px #000a}
.g8-edit svg{width:15px;height:15px}
.g8-edit:active{transform:scale(.9)}
.g8-pt{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.g8-nm{display:flex;align-items:center;gap:8px;min-width:0}
.g8-nm b{min-width:0;font-size:clamp(1.05rem,5vw,1.4rem);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-flag{flex:none;width:24px;height:16px;border-radius:2px;box-shadow:0 0 0 1px #0006}
.g8-pt small{color:#a5b0ff;font-size:.78rem;font-weight:800}
.g8-pt small em{font-style:normal;font-size:1.35em;font-weight:900;color:#ffd96a}
.g8-xp{display:flex;align-items:center;gap:8px}
.g8-xp span{flex:1;min-width:0;height:9px;border-radius:9px;border:1.5px solid #e6b449;background:#0a0d30;overflow:hidden}
.g8-xp span i{display:block;height:100%;background:linear-gradient(90deg,#ffe27a,#f5b301)}
.g8-xp em{flex:none;font-style:normal;color:#c2c8ee;font-size:.62rem;font-weight:800;white-space:nowrap}
.g8-pc{grid-area:pc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:12px 16px 8px 4px;min-width:0}
.g8-embw{position:relative;flex:none;height:clamp(64px,17vw,86px);display:grid;place-items:center}
.g8-embw::before{content:"";position:absolute;inset:-10px;border-radius:50%;background:radial-gradient(circle,#7c5cff66,transparent 66%)}
.g8-embw svg{position:relative;height:100%;width:auto}
.g8-pc b{font-size:clamp(.68rem,3vw,.86rem);font-weight:900;letter-spacing:.06em;text-align:center;white-space:nowrap}
.g8-ps{grid-area:ps;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));padding:10px 4px 12px;border-top:1px solid #ffffff1c}
.g8-ps div{display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 2px;min-width:0;text-align:center;line-height:1.1}
.g8-ps div+div{border-left:1px solid #ffffff1c}
.g8-ps i{flex:none;width:24px;height:24px}
.g8-ps i svg{width:100%;height:100%}
.g8-ps b{display:block;max-width:100%;font-size:clamp(.82rem,3.8vw,1.05rem);font-weight:900}
.g8-ps b.sm{font-size:clamp(.54rem,2.4vw,.7rem);letter-spacing:.02em;line-height:1.1;text-transform:uppercase}
.g8-ps small{display:block;color:#9aa4d6;font-size:clamp(.46rem,2vw,.56rem);font-weight:800;letter-spacing:.05em}
.g8-prof.ld .g8-ps b,.g8-prof.ld .g8-pc b,.g8-prof.ld .g8-pt small em{animation:g8Ld 1.2s ease-in-out infinite}
.g8-prof.ld .g8-embw svg{opacity:.4}
@keyframes g8Ld{50%{opacity:.4}}

/* modos de juego: 3 tarjetas altas */
.g8-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding-top:8px}
.g8-mode{position:relative;min-width:0;min-height:clamp(210px,30dvh,320px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  padding:20px 8px 14px;border-radius:20px;border:2px solid #e6b449;background:var(--cb);box-shadow:0 0 18px var(--cg),0 0 10px #fbbf2430,inset 0 1px 0 #ffffff26}
.g8-mode::after{content:"";position:absolute;inset:4px;border-radius:16px;border:1px solid #fbbf2430;pointer-events:none}
.g8-mode.local{--cb:linear-gradient(165deg,#1a45b0,#0a1347);--cg:#2a7bff66;--ci:#4fb3ff}
.g8-mode.ai{--cb:linear-gradient(165deg,#5a26c9,#140b45);--cg:#8b5cf666;--ci:#c4b5fd}
.g8-mode.online{--cb:linear-gradient(165deg,#0f3d7a,#08122e);--cg:#38bdf888;--ci:#38bdf8}
.g8-mbg,.g8-mmid{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none}
.g8-mbg svg{width:100%;height:100%;filter:blur(1.6px);opacity:.5;transform:scale(1.05)}
.g8-mmid{background:radial-gradient(circle at 50% 34%,var(--cg),transparent 54%),linear-gradient(180deg,transparent 46%,#00000066)}
.g8-mico{position:relative;z-index:1;flex:none;width:clamp(54px,17vw,86px);height:clamp(54px,17vw,86px);filter:drop-shadow(0 4px 8px #0008) drop-shadow(0 0 12px var(--ci))}
.g8-mico svg{width:100%;height:100%}
.g8-mode strong{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;font-size:clamp(.85rem,4vw,1.2rem);font-weight:900;letter-spacing:.02em;text-shadow:0 2px 6px #000b;white-space:nowrap}
.g8-mode small{position:relative;z-index:1;flex:1;padding:0 2px;color:#c3cbf3;font-size:clamp(.58rem,2.7vw,.72rem);font-weight:600;line-height:1.3;text-align:center;text-shadow:0 1px 3px #000a}
.g8-live{display:inline-block;width:9px;height:9px;margin-right:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e}
.g8-onl{position:relative;z-index:1;flex:none;max-width:100%;padding:5px 8px;border-radius:99px;border:1.5px solid #22c55e;background:#0a2a1acc;text-align:center;line-height:1.15}
.g8-onl small{display:block;flex:none;padding:0;color:#86efac;font-size:clamp(.42rem,1.9vw,.52rem);font-weight:800;letter-spacing:.04em}
.g8-onl b{font-size:clamp(.78rem,3.4vw,.95rem);font-weight:900}
.g8-mode u{position:relative;z-index:1;flex:none;align-self:flex-end;width:28px;height:28px;display:grid;place-items:center;border-radius:50%;text-decoration:none;font-size:1.05rem;line-height:1;background:#0a0f3acc;border:1.5px solid #fbbf2477}
.g8-mode:active{transform:scale(.97)}

/* contenido */
.g8-sec{display:flex;align-items:center;justify-content:center;gap:12px;font:900 clamp(.78rem,3.4vw,.92rem) Inter,system-ui,sans-serif;letter-spacing:.16em;color:#ffd96a}
.g8-sec::before,.g8-sec::after{content:"";flex:1;max-width:80px;height:2px;background:linear-gradient(90deg,transparent,#e6b449)}
.g8-sec::after{transform:scaleX(-1)}
.g8-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.g8-tile{min-height:92px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px 6px;border-radius:16px;text-align:center}
.g8-tico{flex:none;display:grid;place-items:center;width:44px;height:44px}
.g8-tico svg{width:36px;height:36px;filter:drop-shadow(0 2px 4px #0008)}
.g8-tile b{font-size:clamp(.7rem,3.2vw,.86rem);font-weight:900;letter-spacing:.06em}
.g8-tile:active{transform:scale(.97)}

/* aviso MUY PRONTO */
.g8-soon{position:fixed;inset:0;z-index:1060;display:grid;place-items:center;padding:20px;background:rgba(5,6,20,.55);animation:g8F .15s ease both}
@keyframes g8F{from{opacity:0}to{opacity:1}}
@keyframes g8P{from{opacity:0;transform:translateY(10px) scale(.92)}to{opacity:1;transform:none}}
.g8-soonc{min-width:min(260px,100%);padding:22px 30px 20px;border-radius:24px;text-align:center;font-family:Inter,system-ui,sans-serif;color:#fff;
  border:2px solid #e6b449;background:linear-gradient(160deg,#252b8a,#0b0d38);box-shadow:0 0 34px #fbbf2455,0 24px 60px #000b;animation:g8P .25s cubic-bezier(.2,.9,.3,1.2) both}
.g8-soonc svg{width:56px;height:56px;margin:0 auto 10px;filter:drop-shadow(0 0 10px #fbbf2499)}
.g8-soonc strong{display:block;font-size:1.35rem;font-weight:900;letter-spacing:.14em;background:linear-gradient(180deg,#fff3b0,#f5b301);-webkit-background-clip:text;background-clip:text;color:transparent}
.g8-soonc small{display:block;margin-top:6px;color:#c3cbf3;font-size:.76rem;font-weight:700}
.g8-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:99;padding:10px 18px;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 .8rem Inter,system-ui,sans-serif;box-shadow:0 10px 30px #000c;white-space:nowrap}

/* ventana de monedas */
.g8-md{position:fixed;inset:0;z-index:1050;display:grid;place-items:center;padding:20px;background:rgba(5,6,12,.86);animation:g8F .18s ease both}
.g8-mdc{position:relative;width:min(340px,100%);padding:26px 20px 20px;border-radius:26px;text-align:center;color:#fff;font-family:Inter,system-ui,sans-serif;
  border:1.5px solid #a78bfa77;background:linear-gradient(160deg,#252b60,#0d1027);box-shadow:0 25px 70px #000b,0 0 40px #6d28d933}
.g8-mdx{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:12px;border:1px solid #ffffff22;background:#ffffff12;color:#fff;cursor:pointer}
.g8-mdi{display:block;width:64px;height:64px;margin:0 auto 8px;filter:drop-shadow(0 0 12px #fbbf24aa)}
.g8-mdi.gem{filter:drop-shadow(0 0 12px #8b5cf6)}
.g8-mdi svg{width:100%;height:100%}
.g8-mdc h3{margin:0 0 12px;font-size:1.15rem;font-weight:900}
.g8-mdb{display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;margin-bottom:12px;border-radius:14px;background:#ffffff0c;border:1px solid #ffffff1a;color:#9aa4d6;font:800 .66rem Inter,system-ui,sans-serif;letter-spacing:.12em}
.g8-mdb b{color:#fff;font-size:1.2rem;letter-spacing:0}
.g8-mdc p{margin:0 0 16px;color:#cbd5e1;font-size:.84rem;line-height:1.5}
.g8-mdok{width:100%;min-height:48px;border:0;border-radius:14px;color:#fff;font:900 .9rem Inter,system-ui,sans-serif;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 4px 0 #3b1d8f}
.g8-mdok:active{transform:translateY(3px)}

/* barra inferior: 4 botones iguales */
body .gx6-nav{max-width:520px;margin:0 auto;padding:7px 4px max(7px,env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;
  border:1.5px solid #e6b44988;border-bottom:0;background:linear-gradient(180deg,#0c1244f7,#060822);box-shadow:0 -8px 30px #2a3cc833,inset 0 1px 0 #ffffff1a}
body .gx6-nav button{flex:1 1 0;min-width:0;min-height:50px;gap:3px;justify-content:center;color:#7f8ad0;font:800 clamp(.58rem,2.8vw,.7rem) Inter,system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase}
body .gx6-nav button svg{width:25px;height:25px}
body .gx6-nav button.on{color:#b9adff}
body .gx6-nav button.on svg{filter:drop-shadow(0 0 7px #7c6cff)}
body .gx6-nav button.on::after{width:40px;height:3px;background:#7c6cff;box-shadow:0 0 10px #7c6cff}

/* tablet / escritorio: mismo diseño, más espacio */
@media (min-width:768px){
  .g8{padding-left:24px;padding-right:24px}
  .g8-in{width:min(100%,760px);gap:18px}
  .g8-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
  .g8-tile{min-height:104px}
  .g8-mode{min-height:clamp(240px,34dvh,340px)}
  body .gx6-nav{max-width:760px}
}
@media (min-width:1100px){
  .g8-in{width:min(100%,920px)}
  body .gx6-nav{max-width:920px}
}
@media (prefers-reduced-motion:reduce){.g8-prof.ld *,.g8-soonc,.g8-soon{animation:none!important}}
`;
    const st = document.createElement("style");
    st.id = "g8css";
    st.textContent = css;
    document.head.appendChild(st);

    /* ---------- Estadísticas reales (stats/{uid}) ---------- */
    const ms = { uid: null, status: "idle", data: null, t: 0, busy: false };

    async function loadStats() {
      const G = window.GX, s = G && G.state;
      if (!s || !s.user || !G.fb || !G.fb.db || ms.busy) return;
      const uid = s.user.uid;
      if (ms.uid === uid && ms.status === "ok") return;
      if (ms.uid === uid && ms.status === "error" && Date.now() - ms.t < 8000) return;
      ms.busy = true; ms.uid = uid; ms.status = "loading";
      try {
        const fs = await G.fsModule();
        const [a, b] = await Promise.all([
          fs.getDoc(fs.doc(G.fb.db, "stats", uid)),
          fs.getDoc(fs.doc(G.fb.db, "publicProfiles", uid)).catch(() => null)
        ]);
        if (G.state.user && G.state.user.uid === uid) {
          const pub = b && b.exists() ? b.data() : null;
          const src = a.exists() ? a.data() : pub;
          ms.data = src ? { played: src.played || 0, wins: src.wins || 0, trophies: src.trophies || 0 } : { played: 0, wins: 0, trophies: 0 };
          ms.status = "ok";
        }
      } catch (e) {
        console.warn("[menu] no se pudieron leer las estadísticas", e);
        ms.status = "error";
      }
      ms.busy = false; ms.t = Date.now(); sig = ""; queue();
    }

    /* ---------- Jugadores en línea (presence, solo lectura) ---------- */
    const ol = { n: null, t: 0, busy: false };
    async function loadOnline() {
      if (ol.busy || Date.now() - ol.t < 30000) return;
      ol.busy = true;
      try {
        const P = window.GXPresence;
        if (!P) throw new Error("sin presencia");
        const { db, mod } = await P.get();
        if (!db) throw new Error("sin db");
        const snap = await mod.get(mod.query(mod.ref(db, "presence"), mod.orderByChild("state"), mod.equalTo("online")));
        const now = Date.now(), stale = P.stale || 150000;
        let n = 0;
        snap.forEach(c => { const v = c.val(); if (v && now - (v.last || 0) < stale) n++; });
        ol.n = n;
      } catch (e) { ol.n = null; }
      ol.busy = false; ol.t = Date.now(); queue();
    }

    function rankInfo(tr) {
      const R = window.GXRank;
      if (!R || !R.rankOf) return null;
      try { return R.rankOf(tr); } catch (e) { return null; }
    }

    function data() {
      const G = window.GX, s = G && G.state;
      if (!s) return null;
      const u = s.user;
      if (u && ms.uid && ms.uid !== u.uid) { ms.uid = null; ms.status = "idle"; ms.data = null; }

      let status = "guest", stat = null;
      if (u) {
        if (s.stats && s.statsUid === u.uid) { stat = s.stats; status = "ok"; }
        else if (ms.uid === u.uid && ms.status === "ok") { stat = ms.data; status = "ok"; }
        else status = ms.uid === u.uid && ms.status === "error" ? "error" : "loading";
      }
      const ok = status === "ok";
      const tr = ok ? (stat.trophies || 0) : 0, played = ok ? (stat.played || 0) : 0, wins = ok ? (stat.wins || 0) : 0;

      const xpOk = !!(u && s.xpLoaded);
      const lv = xpOk ? s.xpLevel : null;
      let pct = 0, label = "";
      if (xpOk) {
        pct = G.xpBarPct(s.xp);
        const base = G.xpForLevel(lv), next = G.xpForLevel(lv + 1);
        label = lv >= 100 ? "MÁX" : (s.xp - base) + " / " + (next - base);
      }
      const p = s.profile;
      const name = p ? p.username : (u && u.email ? u.email.split("@")[0] : "Invitado");
      const avatar = p ? G.avatarEmoji(p.avatar) : "👤";
      const pick = (...v) => { for (const x of v) if (typeof x === "number") return x; return 0; };
      return {
        name, avatar, lv, pct, label, status, tr, played, wins,
        rate: ok ? (played ? Math.round(wins * 100 / played) + "%" : "0%") : null,
        gold: pick(s.gold, s.coins, s.oro, s.wallet && s.wallet.gold),
        gems: pick(s.gems, s.diamonds, s.diamantes, s.wallet && s.wallet.gems),
        req: (s.friendsIncoming || []).length,
        rank: ok ? rankInfo(tr) : null,
        online: ol.n
      };
    }

    /* ---------- Markup ---------- */
    const mode = (go, cls, title, desc, ico, bg, o = {}) => `
      <button class="g8-mode ${cls}" data-go="${go}" type="button" aria-label="${title}">
        <span class="g8-mbg">${bg}</span><span class="g8-mmid"></span>
        <span class="g8-mico">${ico}</span>
        <strong>${o.live ? '<i class="g8-live"></i>' : ""}${title}</strong>
        <small>${desc}</small>
        ${o.extra || ""}
        <u aria-hidden="true">›</u>
      </button>`;

    const tile = (label, key) => `
      <button class="g8-card g8-tile" data-go="soon" data-name="${label}" data-ico="${key}" type="button">
        <span class="g8-tico">${A.tile[key]}</span><b>${label}</b>
      </button>`;

    function draw(d) {
      const r = d.rank, R = window.GXRank, ok = d.status === "ok";
      const emblem = r && R && R.badgeFor ? R.badgeFor(r, 64) : I.shield;
      const rcol = r ? r.tier.c1 : "#c4b5fd";
      const rname = r ? r.label.toUpperCase()
        : ok ? "SIN RANGO" : d.status === "loading" ? "···" : d.status === "error" ? "SIN DATOS" : "SIN CUENTA";
      const v = x => ok ? x : "—";
      const stats = [
        [I.trophy, v(num(d.tr)), "TROFEOS", ""],
        [I.crown, ok ? rname : "—", "RANGO", "sm"],
        [I.swords, v(num(d.played)), "PARTIDAS", ""],
        [I.star, v(num(d.wins)), "VICTORIAS", ""],
        [I.target, v(d.rate), "WIN RATE", ""]
      ];
      const onl = d.online == null ? "" :
        `<span class="g8-onl"><small>JUGADORES EN LÍNEA</small><b>${num(d.online)}</b></span>`;

      box.innerHTML = `
      <div class="g8-in">
        <div class="g8-top">
          <button class="g8-ic idea" data-go="ideas" type="button" aria-label="Buzón de ideas">${I.bulb}<i class="g8-dot" id="g8IdeaDot"></i></button>
          <div class="g8-logo">${I.logo}<div><span class="g8-lg1">GREYX</span><span class="g8-lg2">LUDO</span></div></div>
          <div class="g8-acts">
            <button class="g8-ic" data-go="mail" type="button" aria-label="Correo">${I.mail}</button>
            <button class="g8-ic" data-go="settings" type="button" aria-label="Configuración">${I.gear}</button>
          </div>
        </div>

        <div class="g8-card g8-wallet">
          <div class="g8-cur"><span class="g8-coin">${I.coin}</span><div><small>ORO</small><b>${num(d.gold)}</b></div>
            <button class="g8-plus" data-go="wallet" data-w="gold" type="button" aria-label="Conseguir oro">+</button></div>
          <div class="g8-cur"><span class="g8-coin gem">${I.gem}</span><div><small>DIAMANTES</small><b>${num(d.gems)}</b></div>
            <button class="g8-plus" data-go="wallet" data-w="gems" type="button" aria-label="Conseguir diamantes">+</button></div>
        </div>

        <div class="g8-card g8-daily">
          <span class="g8-chest">${I.chest}</span>
          <div class="g8-dt"><b>RECOMPENSA DIARIA</b><small>¡No pierdas tu racha! Reclama tu recompensa</small></div>
          <button class="g8-claim" data-go="soon" data-name="RECOMPENSA DIARIA" data-ico="chest" type="button">RECLAMAR ›</button>
        </div>

        <div class="g8-card g8-prof ${d.status === "loading" ? "ld" : ""}">
          <div class="g8-pl">
            <div class="g8-avw">
              <span class="g8-avc">${I.crown}</span>
              <span class="g8-av">${d.avatar}</span>
              <button class="g8-edit" data-go="profile" type="button" aria-label="Editar perfil">${PENCIL}</button>
            </div>
            <div class="g8-pt">
              <div class="g8-nm">${FLAG_DO}<b>${esc(d.name)}</b></div>
              <small>NV. <em>${d.lv == null ? "—" : d.lv}</em></small>
              <div class="g8-xp"><span><i style="width:${d.pct}%"></i></span>${d.label ? `<em>${d.label}</em>` : ""}</div>
            </div>
          </div>
          <div class="g8-pc">
            <div class="g8-embw">${emblem}</div>
            <b style="color:${rcol}">${esc(rname)}</b>
          </div>
          <div class="g8-ps">
            ${stats.map(x => `<div><i>${x[0]}</i><b class="${x[3]}">${x[1]}</b><small>${x[2]}</small></div>`).join("")}
          </div>
        </div>

        <div class="g8-modes">
          ${mode("local", "local", "LOCAL", "Juega con tus amigos en el mismo dispositivo", I.people, A.modeBg.local)}
          ${mode("bot", "ai", "RETO IA", "Pon a prueba tu habilidad contra la IA", I.robot, A.modeBg.ai)}
          ${mode("online", "online", "ONLINE", "Juega con jugadores reales de todo el mundo", I.globe, A.modeBg.online, { live: true, extra: onl })}
        </div>

        <div class="g8-sec">CONTENIDO</div>

        <div class="g8-grid">
          ${tile("TIENDA", "shop")}
          ${tile("INVENTARIO", "inventory")}
          ${tile("MISIONES", "missions")}
          ${tile("EVENTOS", "events")}
        </div>
      </div>`;

      if (window.GX && GX.translateDOM) { try { GX.translateDOM(box); } catch (e) {} }
      badges(d);
    }

    function badges(d) {
      d = d || data();
      const set = (el, txt, show) => {
        if (!el) return;
        if (el.textContent !== txt) el.textContent = txt;
        if (el.classList.contains("on") !== show) el.classList.toggle("on", show);
      };
      const n = window.GXIdeas ? window.GXIdeas.unread() : 0;
      set($("#g8IdeaDot"), n > 99 ? "99+" : String(n || ""), n > 0);
    }

    /* ---------- Contenedor y barra ---------- */
    document.querySelectorAll(".g8,.g8-nav").forEach(e => e.remove());
    const box = document.createElement("div");
    box.className = "g8";
    document.body.appendChild(box);

    function setupNav() {
      const n = $(".gx6-nav");
      if (!n || n.dataset.g8 === "4") return;
      n.dataset.g8 = "4";
      n.innerHTML = `
        <button class="on" data-go="home" type="button">${A.nav.home}<span>Inicio</span></button>
        <button data-go="friends" type="button">${A.nav.friends}<span>Amigos</span></button>
        <button data-go="rank" type="button">${A.nav.rank}<span>Ranking</span></button>
        <button data-go="profile" type="button">${A.nav.profile}<span>Perfil</span></button>`;
    }

    /* ---------- Acciones ---------- */
    function toast(m) {
      const t = document.createElement("div");
      t.className = "g8-toast";
      t.textContent = m;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 1800);
    }

    function soon(name, key) {
      const old = $(".g8-soon");
      if (old) old.remove();
      const m = document.createElement("div");
      m.className = "g8-soon";
      m.innerHTML = `<div class="g8-soonc" role="status">${SI(key)}<strong>MUY PRONTO</strong><small>${esc(name)} estará disponible próximamente</small></div>`;
      const close = () => m.remove();
      m.addEventListener("click", close);
      document.body.appendChild(m);
      setTimeout(close, 2200);
    }

    const act = a => { const b = $('[data-action="' + a + '"]'); if (b) { b.click(); return true; } return false; };
    const viaNav = g => { const b = $('.gx6-nav [data-go="' + g + '"]'); if (b) { b.click(); return true; } return false; };

    function wallet(kind) {
      if ($(".g8-md")) return;
      const gold = kind === "gold", d = data() || {};
      const m = document.createElement("div");
      m.className = "g8-md";
      m.innerHTML = `<div class="g8-mdc" role="dialog" aria-modal="true">
        <button class="g8-mdx" type="button" aria-label="Cerrar">✕</button>
        <span class="g8-mdi ${gold ? "" : "gem"}">${gold ? I.coin : I.gem}</span>
        <h3>${gold ? "Conseguir oro" : "Conseguir diamantes"}</h3>
        <div class="g8-mdb">TU SALDO <b>${num(gold ? d.gold : d.gems)}</b></div>
        <p>La tienda de ${gold ? "oro" : "diamantes"} todavía no está habilitada. Cuando se active, aquí podrás conseguir más.</p>
        <button class="g8-mdok" type="button">Entendido</button></div>`;
      const close = () => m.remove();
      m.addEventListener("click", e => { if (e.target === m || e.target.closest(".g8-mdx,.g8-mdok")) close(); });
      document.body.appendChild(m);
    }

    function findMail() {
      const re = /correo|mail|buz[oó]n|inbox|mensaje/i;
      for (const e of document.querySelectorAll("button,[role=button],a,[data-action],[data-go]")) {
        if (box.contains(e) || e.closest("#gxIdeas,.gx6-nav") || e.classList.contains("gxi-btn")) continue;
        const cls = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className;
        if (re.test([e.id, cls, e.getAttribute("aria-label"), e.dataset.action, e.dataset.go, e.title].join(" "))) return e;
      }
      return null;
    }

    box.addEventListener("click", e => {
      const b = e.target.closest("[data-go]");
      if (!b) return;
      const g = b.dataset.go;
      if (g === "soon") return soon(b.dataset.name || "Esta sección", b.dataset.ico);
      if (g === "wallet") return wallet(b.dataset.w);
      if (g === "local") return void act("local");
      if (g === "bot") return void act("mode");
      if (g === "online") return void act("online-open");
      if (g === "settings") return void act("settings");
      if (g === "profile") return void (viaNav("profile") || act("profile-open"));
      if (g === "ideas") {
        if (window.GXIdeas) return window.GXIdeas.open();
        return toast("Buzón de ideas no disponible");
      }
      if (g === "mail") { const m = findMail(); return m ? m.click() : toast("Correo no disponible"); }
    });

    /* ---------- Sincronización con el menú original ---------- */
    let sig = "", raf = 0;
    function sync() {
      raf = 0;
      setupNav();
      const on = !!$(".gx6.on");
      box.classList.toggle("on", on);
      if (!on) { sig = ""; return; }
      const d = data();
      if (!d) return;
      if (d.status === "loading" || d.status === "error") loadStats();
      if (window.GX.state.user) loadOnline();
      const k = JSON.stringify([d.name, d.avatar, d.lv, d.pct, d.label, d.status, d.tr, d.played, d.wins, d.gold, d.gems, d.rank ? d.rank.label : "", d.online]);
      if (k !== sig) { sig = k; draw(d); } else badges(d);
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(sync); };
    new MutationObserver(queue).observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true, childList: true });
    setInterval(sync, 500);
    sync();
  }

  if (window.GXArt) boot();
  else {
    const s = document.createElement("script");
    s.src = "greyx-icons.js";
    s.onload = boot;
    s.onerror = () => console.warn("greyx-icons.js no se encontró");
    document.head.appendChild(s);
  }
})();
