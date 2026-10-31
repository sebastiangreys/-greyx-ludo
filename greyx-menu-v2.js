/* GREYX LUDO — MENÚ PRINCIPAL v2 (fase 2: refinamiento)
   Carga: <script src="greyx-icons.js"></script> y después <script src="greyx-menu-v2.js"></script>
          (ambos DESPUÉS de greyx-fijo.js).
   - Solo presentación + lectura de datos. No escribe en Firebase, no toca tablero, auth ni partidas.
   - Estadísticas: lee stats/{uid} (el mismo documento que usa el perfil) y respeta GX.state.stats
     cuando una partida lo actualiza. Mientras carga muestra "—", nunca ceros inventados.
   - Rango: window.GXRank.rankOf(trofeos) (sistema de greyx-ranking.js).
   - Cada acceso reenvía el clic al botón/acción original: no hay widgets duplicados. */
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

    /* ---------- CSS ---------- */
    const css = `
.gx6{display:none!important}
.g8{position:fixed;inset:0;z-index:85;display:none;color:#f1f3ff;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  background:${A.pageBg()} 0 0/150px,radial-gradient(circle at 50% 0,#3a1fa088,transparent 46%),radial-gradient(circle at 100% 42%,#2a3cc844,transparent 40%),radial-gradient(circle at 0 80%,#4c1d9555,transparent 42%),linear-gradient(180deg,#080a2a,#04051a);
  overflow-x:hidden;overflow-y:auto;overscroll-behavior:none;-webkit-overflow-scrolling:touch;
  padding:calc(8px + env(safe-area-inset-top,0px)) 14px calc(66px + max(7px,env(safe-area-inset-bottom,0px)))}
.g8.on{display:block}
.g8 button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer}
.g8 svg{display:block}
.g8-in{width:min(100%,520px);height:100%;min-height:500px;margin:0 auto;display:flex;flex-direction:column;justify-content:center;gap:clamp(7px,1.45dvh,14px)}
.g8-card{border:1.5px solid #3b46c9;border-radius:18px;background:linear-gradient(160deg,#121858ee,#080b2bee);box-shadow:0 0 16px #3b46c944,inset 0 1px 0 #ffffff1c}

/* encabezado */
.g8-top{flex:none;height:clamp(42px,6.6dvh,56px);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px}
.g8-ic{position:relative;flex:none;width:clamp(38px,6dvh,46px);aspect-ratio:1;display:grid;place-items:center;padding:0;border-radius:50%;
  border:1.5px solid #6d5cffaa;background:linear-gradient(145deg,#232a66,#0d1030);box-shadow:0 0 14px #4f46e566;color:#f1f3ff}
.g8-ic svg{width:60%;height:60%}
.g8-ic:active{transform:scale(.93)}
.g8-ic.idea{justify-self:start;border-color:#fbbf24aa;box-shadow:0 0 16px #fbbf2455}
.g8-ic.idea svg{width:66%;height:66%;filter:drop-shadow(0 0 5px #fbbf24)}
.g8-acts{justify-self:end;display:flex;gap:8px}
.g8-dot{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;display:none;place-items:center;border-radius:99px;background:#ef4444;color:#fff;font:900 .58rem Inter,system-ui,sans-serif;border:2px solid #080a2a;font-style:normal}
.g8-dot.on{display:grid}
.g8-logo{display:flex;align-items:center;gap:6px;min-width:0}
.g8-logo>svg{height:clamp(40px,6.6dvh,56px);width:auto;filter:drop-shadow(0 0 12px #6d28d9cc)}
.g8-logo div{display:flex;flex-direction:column;line-height:.9}
.g8-lg1,.g8-lg2{font:900 clamp(1.05rem,3.1dvh,1.5rem)/.95 Inter,system-ui,sans-serif;letter-spacing:-.01em;-webkit-background-clip:text;background-clip:text;color:transparent}
.g8-lg1{background-image:linear-gradient(180deg,#fff,#c3c7e6);filter:drop-shadow(0 3px 5px #0008)}
.g8-lg2{background-image:linear-gradient(180deg,#b79dff,#6d28d9);filter:drop-shadow(0 0 9px #7c3aedaa)}

/* monedas */
.g8-wallet{flex:none;height:clamp(40px,6dvh,50px);display:flex;align-items:center;padding:0 9px}
.g8-cur{flex:1;display:flex;align-items:center;gap:8px;min-width:0;height:100%}
.g8-cur+.g8-cur{border-left:1px solid #ffffff1c;margin-left:9px;padding-left:9px}
.g8-coin{flex:none;height:74%;aspect-ratio:1;filter:drop-shadow(0 0 8px #fbbf2488)}
.g8-coin.gem{filter:drop-shadow(0 0 8px #8b5cf6)}
.g8-coin svg{width:100%;height:100%}
.g8-cur div{flex:1;min-width:0;line-height:1.05}
.g8-cur small{display:block;color:#9aa4d6;font:800 .5rem Inter,system-ui,sans-serif;letter-spacing:.16em}
.g8-cur b{display:block;font-size:clamp(.9rem,2.6dvh,1.15rem);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-plus{flex:none;height:70%;aspect-ratio:1;display:grid;place-items:center;padding:0;border-radius:10px;border:1.5px solid #5b6cff;background:#141a5acc;font-size:1.15rem;font-weight:900;line-height:1}

/* título de sección */
.g8-sec{flex:none;display:flex;align-items:center;justify-content:center;gap:12px;font:900 clamp(.72rem,2dvh,.92rem) Inter,system-ui,sans-serif;letter-spacing:.16em}
.g8-sec::before,.g8-sec::after{content:"";flex:1;max-width:80px;height:2px;background:linear-gradient(90deg,transparent,#6d5cff)}
.g8-sec::after{transform:scaleX(-1)}

/* modos: 3 capas  (fondo borroso · plano intermedio luminoso · primer plano nítido) */
.g8-modes{flex:1.2 1 0;min-height:112px;max-height:240px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.g8-mode{position:relative;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(4px,1.1dvh,10px);
  padding:6px 4px clamp(28px,4.8dvh,36px);border-radius:20px;border:2px solid var(--cc);background:var(--cb);box-shadow:0 0 18px var(--cg),inset 0 1px 0 #ffffff26}
.g8-mode.local{--cc:#2f8bff;--cb:linear-gradient(165deg,#1a45b0,#0a1347);--cg:#2a7bff77;--ci:#4fb3ff}
.g8-mode.ai{--cc:#9b6bff;--cb:linear-gradient(165deg,#5a26c9,#140b45);--cg:#8b5cf677;--ci:#c4b5fd}
.g8-mode.online{--cc:#38bdf8;--cb:linear-gradient(165deg,#0f3d7a,#08122e);--cg:#38bdf8aa;--ci:#38bdf8;box-shadow:0 0 28px #38bdf8aa,0 0 8px #38bdf866,inset 0 0 18px #38bdf822}
.g8-mbg,.g8-mmid{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none}
.g8-mbg svg{width:100%;height:100%;filter:blur(1.6px);opacity:.5;transform:scale(1.05)}
.g8-mmid{background:radial-gradient(circle at 50% 34%,var(--cg),transparent 54%),linear-gradient(180deg,transparent 46%,#00000066)}
.g8-mcrown{position:absolute;top:-11px;left:50%;width:24px;height:24px;transform:translateX(-50%);filter:drop-shadow(0 0 6px #fbbf24);z-index:2}
.g8-mico{position:relative;z-index:1;height:clamp(44px,10.4dvh,76px);aspect-ratio:1;filter:drop-shadow(0 4px 8px #0008) drop-shadow(0 0 12px var(--ci))}
.g8-mico svg{width:100%;height:100%}
.g8-mode strong{position:relative;z-index:1;font-size:clamp(.88rem,2.6dvh,1.12rem);font-weight:900;letter-spacing:.02em;text-shadow:0 2px 6px #000b;white-space:nowrap}
.g8-mode u{position:absolute;z-index:1;right:7px;bottom:7px;width:clamp(24px,4.2dvh,30px);aspect-ratio:1;display:grid;place-items:center;border-radius:50%;text-decoration:none;font-size:1.1rem;line-height:1;background:#0a0f3acc;border:1.5px solid #ffffff66}
.g8-live{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e}
.g8-mode:active{transform:scale(.97)}

/* perfil + rango (el rango NO es un botón) */
.g8-prof{flex:1.1 1 0;min-height:96px;max-height:190px;display:grid;grid-template-columns:1.6fr .95fr 1.05fr;overflow:hidden;position:relative;
  background:radial-gradient(120% 90% at 50% 50%,#2a2f9a55,transparent 70%),${A.pageBg()} 0 0/120px,linear-gradient(160deg,#10164f,#070a28)}
.g8-pl{display:flex;align-items:center;gap:9px;padding:8px 6px 8px 10px;min-width:0}
.g8-av{flex:none;height:clamp(42px,8.6dvh,60px);aspect-ratio:1;display:grid;place-items:center;border-radius:50%;font-size:clamp(1.3rem,3.7dvh,1.9rem);
  background:radial-gradient(circle at 35% 30%,#4c3fa8,#14172e);border:2.5px solid #a78bfa;box-shadow:0 0 16px #8b5cf6aa,inset 0 0 10px #0008}
.g8-pt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.g8-pt b{font-size:clamp(.74rem,2.1dvh,.92rem);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g8-pt small{color:#a5b0ff;font-size:clamp(.58rem,1.6dvh,.7rem);font-weight:800}
.g8-pt small em{font-style:normal;font-size:1.25em;font-weight:900;color:#c4b5fd}
.g8-xp{display:flex;align-items:center;gap:5px}
.g8-xp span{flex:1;min-width:0;height:7px;border-radius:9px;border:1.5px solid #6d5cff;background:#0a0d30;overflow:hidden}
.g8-xp span i{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#a78bfa)}
.g8-xp em{flex:none;font-style:normal;color:#9aa4d6;font-size:.5rem;font-weight:800;white-space:nowrap}
.g8-pc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px 3px;min-width:0;border-left:1px solid #ffffff22;border-right:1px solid #ffffff22;margin:10px 0}
.g8-embw{position:relative;height:clamp(46px,10dvh,72px);display:grid;place-items:center}
.g8-embw::before{content:"";position:absolute;inset:-10px;border-radius:50%;background:radial-gradient(circle,#7c5cff66,transparent 66%)}
.g8-embw svg{position:relative;height:100%;width:auto}
.g8-pc b{font-size:clamp(.62rem,1.8dvh,.78rem);font-weight:900;letter-spacing:.05em;text-align:center;white-space:nowrap}
.g8-ps{display:grid;grid-template-rows:repeat(4,1fr);padding:6px 8px 6px 11px;min-width:0}
.g8-ps div{display:flex;align-items:center;gap:7px;min-height:0;line-height:1.05}
.g8-ps i{flex:none;width:clamp(16px,2.8dvh,22px);height:clamp(16px,2.8dvh,22px)}
.g8-ps i svg{width:100%;height:100%}
.g8-ps b{display:block;font-size:clamp(.78rem,2.3dvh,1rem);font-weight:900}
.g8-ps small{display:block;color:#9aa4d6;font-size:clamp(.44rem,1.2dvh,.52rem);font-weight:800;letter-spacing:.1em}
.g8-prof.ld .g8-ps b,.g8-prof.ld .g8-pc b,.g8-prof.ld .g8-pt small em{animation:g8Ld 1.2s ease-in-out infinite}
.g8-prof.ld .g8-embw svg{opacity:.4}
@keyframes g8Ld{50%{opacity:.4}}

/* accesos */
.g8-grid{flex:1.15 1 0;min-height:96px;max-height:170px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:1fr 1fr;gap:8px}
.g8-tile{--ts:clamp(24px,4.4dvh,36px);position:relative;min-height:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;padding:3px 10px;border-radius:15px;text-align:left}
.g8-tico{display:block;flex:none;width:var(--ts);height:var(--ts);filter:drop-shadow(0 2px 4px #0008)}
.g8-tico svg{width:100%;height:100%}
.g8-tile b{font-size:clamp(.56rem,1.55dvh,.68rem);font-weight:900;letter-spacing:.06em;line-height:1}
.g8-tile em{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-style:normal;color:#7e88e6;font-size:1.2rem}
.g8-tile i{position:absolute;right:7px;top:6px;font-style:normal;padding:2px 6px;border-radius:99px;background:#ffffff14;color:#aab3e8;font:800 .42rem Inter,system-ui,sans-serif;letter-spacing:.1em}
.g8-tile.soon{opacity:.9}
.g8-tile:active{transform:scale(.97)}
.g8-badge{position:absolute;left:34px;top:2px;min-width:16px;height:16px;padding:0 4px;display:none;place-items:center;border-radius:99px;background:#ef4444;color:#fff;font:900 .6rem Inter,system-ui,sans-serif;border:2px solid #080a2a}
.g8-badge.on{display:grid}

/* recompensa diaria */
.g8-daily{--ch:clamp(58px,10.6dvh,90px);flex:.72 1 0;min-height:60px;max-height:104px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:6px 12px 6px 8px;position:relative;border-color:#e0a82acc;
  background:radial-gradient(70% 150% at 10% 50%,#8b4dff77,transparent 62%),radial-gradient(40% 90% at 100% 20%,#fbbf2433,transparent 70%),
   linear-gradient(115deg,#2f1a7e,#0d0830 60%,#2a1d06);box-shadow:0 0 20px #fbbf2440,inset 0 1px 0 #ffffff30,inset 0 0 0 1px #ffffff0d}
.g8-daily::after{content:"";position:absolute;inset:4px;border-radius:14px;border:1px solid #fbbf2426;pointer-events:none}
.g8-chest{width:calc(var(--ch)*1.25);height:var(--ch);margin:-5px 0 -5px -2px;filter:drop-shadow(0 4px 8px #000a)}
.g8-chest svg{width:100%;height:100%}
.g8-dt{min-width:0;line-height:1.2}
.g8-dt b{display:block;font-size:clamp(.7rem,2dvh,.9rem);font-weight:900;letter-spacing:.03em;text-shadow:0 2px 5px #000a}
.g8-dt small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:3px;color:#d4c7ff;font-size:clamp(.54rem,1.45dvh,.66rem);font-weight:700}
.g8-claim{align-self:center;padding:clamp(8px,1.6dvh,12px) clamp(11px,3.2vw,17px);border:0;border-radius:99px;background:linear-gradient(180deg,#ffe98a,#f5b301);color:#3a2200;
  font:900 clamp(.62rem,1.7dvh,.76rem) Inter,system-ui,sans-serif;letter-spacing:.05em;white-space:nowrap;box-shadow:0 3px 0 #92600a,0 0 16px #fbbf2477}
.g8-claim:active{transform:translateY(2px);box-shadow:0 1px 0 #92600a}

.g8-toast{position:fixed;left:50%;bottom:calc(86px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:90;padding:10px 18px;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 .8rem Inter,system-ui,sans-serif;box-shadow:0 10px 30px #000c;white-space:nowrap}

/* barra inferior: la misma .gx6-nav de siempre, con el aspecto de la referencia */
body .gx6-nav{max-width:520px;margin:0 auto;padding:7px 4px max(7px,env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;
  border:1.5px solid #3b46c9aa;border-bottom:0;background:linear-gradient(180deg,#0c1244f7,#060822);box-shadow:0 -8px 30px #2a3cc833,inset 0 1px 0 #ffffff1a}
body .gx6-nav button{min-height:50px;gap:3px;justify-content:center;color:#7f8ad0;font:800 clamp(.56rem,1.5dvh,.68rem) Inter,system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase}
body .gx6-nav button svg{width:25px;height:25px}
body .gx6-nav button.on{color:#b9adff}
body .gx6-nav button.on svg{filter:drop-shadow(0 0 7px #7c6cff)}
body .gx6-nav button.on::after{width:40px;height:3px;background:#7c6cff;box-shadow:0 0 10px #7c6cff}

@media (min-width:768px){.g8{padding-left:24px;padding-right:24px}.g8-in{width:min(100%,600px)}}
@media (prefers-reduced-motion:reduce){.g8-prof.ld *{animation:none!important}}
`;
    const st = document.createElement("style");
    st.id = "g8css";
    st.textContent = css;
    document.head.appendChild(st);

    /* ---------- Estadísticas reales (stats/{uid}) ---------- */
    // Causa del bug anterior: state.stats solo se cargaba al abrir la pantalla de perfil
    // (loadStats() se llama desde profileMarkup). El menú leía null y pintaba ceros.
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
          const src = a.exists() ? a.data() : pub;           // stats manda; publicProfiles solo si falta
          ms.data = src ? { played: src.played || 0, wins: src.wins || 0, trophies: src.trophies || 0 } : { played: 0, wins: 0, trophies: 0 };
          if (a.exists() && pub && (pub.trophies || 0) !== (a.data().trophies || 0))
            console.warn("[menu] trophies difiere: stats=" + a.data().trophies + " publicProfiles=" + pub.trophies);
          ms.status = "ok";
        }
      } catch (e) {
        console.warn("[menu] no se pudieron leer las estadísticas", e);
        ms.status = "error";
      }
      ms.busy = false; ms.t = Date.now(); sig = ""; queue();
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
        if (s.stats && s.statsUid === u.uid) { stat = s.stats; status = "ok"; }          // actualizado por partidas/perfil
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
        rank: ok ? rankInfo(tr) : null
      };
    }

    /* ---------- Markup ---------- */
    const mode = (go, cls, title, ico, bg, o = {}) => `
      <button class="g8-mode ${cls}" data-go="${go}" type="button" aria-label="${title}">
        <span class="g8-mbg">${bg}</span><span class="g8-mmid"></span>
        ${o.crown ? `<span class="g8-mcrown">${I.crown}</span>` : ""}
        <span class="g8-mico">${ico}</span>
        <strong>${o.live ? '<i class="g8-live"></i>' : ""}${title}</strong>
        <u aria-hidden="true">›</u>
      </button>`;

    const tile = (go, ico, label, soon) => `
      <button class="g8-card g8-tile ${soon ? "soon" : ""}" data-go="${go}" ${soon ? `data-msg="${label[0] + label.slice(1).toLowerCase()}: próximamente"` : ""} type="button">
        <span class="g8-tico">${ico}</span><b>${label}</b>${soon ? "<i>PRONTO</i>" : "<em>›</em>"}
        ${go === "friends" ? '<strong class="g8-badge"></strong>' : ""}
      </button>`;

    function draw(d) {
      const r = d.rank, R = window.GXRank, ok = d.status === "ok";
      const emblem = r && R && R.badgeFor ? R.badgeFor(r, 56) : I.shield;
      const rcol = r ? r.tier.c1 : "#c4b5fd";
      const rname = r ? r.label.toUpperCase()
        : ok ? "SIN RANGO" : d.status === "loading" ? "···" : d.status === "error" ? "SIN DATOS" : "SIN CUENTA";
      const v = x => ok ? x : "—";
      const stats = [[I.trophy, v(d.tr), "TROFEOS"], [I.swords, v(d.played), "PARTIDAS"], [I.star, v(d.wins), "VICTORIAS"], [I.target, v(d.rate), "WIN RATE"]];

      box.innerHTML = `
      <div class="g8-in">
        <div class="g8-top">
          <button class="g8-ic idea" data-go="ideas" type="button" aria-label="Buzón de ideas">${I.bulb}<i class="g8-dot" id="g8IdeaDot"></i></button>
          <div class="g8-logo">${I.logo}<div><span class="g8-lg1">GREYX</span><span class="g8-lg2">LUDO</span></div></div>
          <div class="g8-acts">
            <button class="g8-ic" data-go="mail" type="button" aria-label="Mensajes">${I.mail}</button>
            <button class="g8-ic" data-go="settings" type="button" aria-label="Configuración">${I.gear}</button>
          </div>
        </div>

        <div class="g8-card g8-wallet">
          <div class="g8-cur"><span class="g8-coin">${I.coin}</span><div><small>ORO</small><b>${num(d.gold)}</b></div>
            <button class="g8-plus" data-go="soon" data-msg="Conseguir oro: próximamente" type="button" aria-label="Conseguir oro">+</button></div>
          <div class="g8-cur"><span class="g8-coin gem">${I.gem}</span><div><small>DIAMANTES</small><b>${num(d.gems)}</b></div>
            <button class="g8-plus" data-go="soon" data-msg="Conseguir diamantes: próximamente" type="button" aria-label="Conseguir diamantes">+</button></div>
        </div>

        <div class="g8-sec">ELIGE TU MODO</div>

        <div class="g8-modes">
          ${mode("local", "local", "LOCAL", I.people, A.modeBg.local)}
          ${mode("bot", "ai", "RETO IA", I.robot, A.modeBg.ai)}
          ${mode("online", "online", "ONLINE", I.globe, A.modeBg.online, { live: true, crown: true })}
        </div>

        <div class="g8-card g8-prof ${d.status === "loading" ? "ld" : ""}">
          <div class="g8-pl">
            <span class="g8-av">${d.avatar}</span>
            <div class="g8-pt">
              <b>${esc(d.name)}</b>
              <small>NV. <em>${d.lv == null ? "—" : d.lv}</em></small>
              <div class="g8-xp"><span><i style="width:${d.pct}%"></i></span>${d.label ? `<em>${d.label}</em>` : ""}</div>
            </div>
          </div>
          <div class="g8-pc">
            <div class="g8-embw">${emblem}</div>
            <b style="color:${rcol}">${esc(rname)}</b>
          </div>
          <div class="g8-ps">
            ${stats.map(x => `<div><i>${x[0]}</i><p style="margin:0"><b>${x[1]}</b><small>${x[2]}</small></p></div>`).join("")}
          </div>
        </div>

        <div class="g8-grid">
          ${tile("friends", A.tile.friends, "AMIGOS")}
          ${tile("rank", A.tile.rank, "RANKING")}
          ${tile("soon", A.tile.missions, "MISIONES", true)}
          ${tile("soon", A.tile.shop, "TIENDA", true)}
          ${tile("soon", A.tile.inventory, "INVENTARIO", true)}
          ${tile("soon", A.tile.events, "EVENTOS", true)}
        </div>

        <div class="g8-card g8-daily">
          <span class="g8-chest">${I.chest}</span>
          <div class="g8-dt"><b>RECOMPENSA DIARIA</b><small>Muy pronto podrás reclamar tu premio</small></div>
          <button class="g8-claim" data-go="soon" data-msg="La recompensa diaria llegará pronto" type="button">RECLAMAR ›</button>
        </div>
      </div>`;

      if (window.GX && GX.translateDOM) { try { GX.translateDOM(box); } catch (e) {} }
      badges(d);
    }

    function badges(d) {
      d = d || data();
      const set = (el, txt, show) => {            // solo escribe si cambió (evita bucles del observer)
        if (!el) return;
        if (el.textContent !== txt) el.textContent = txt;
        if (el.classList.contains("on") !== show) el.classList.toggle("on", show);
      };
      if (d) set(box.querySelector(".g8-badge"), d.req > 9 ? "9+" : String(d.req || ""), d.req > 0);
      const src = $(".gx6 .gxi-dot"), t = src && src.style.display !== "none" ? src.textContent.trim() : "";
      set($("#g8IdeaDot"), t, !!t);
    }

    /* ---------- Contenedor y barra ---------- */
    document.querySelectorAll(".g8,.g8-nav").forEach(e => e.remove());
    const box = document.createElement("div");
    box.className = "g8";
    document.body.appendChild(box);

    function setupNav() {
      const n = $(".gx6-nav");
      if (!n || n.dataset.g8) return;
      n.dataset.g8 = "1";
      n.innerHTML = `
        <button class="on" data-go="home" type="button">${A.nav.home}<span>Inicio</span></button>
        <button data-go="friends" type="button">${A.nav.friends}<span>Amigos</span></button>
        <button data-go="rank" type="button">${A.nav.rank}<span>Ranking</span></button>
        <button data-go="profile" type="button">${A.nav.profile}<span>Perfil</span></button>`;
    }

    /* ---------- Acciones: reenvían a lo que ya existe ---------- */
    function toast(m) {
      const t = document.createElement("div");
      t.className = "g8-toast";
      t.textContent = m;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 1800);
    }
    const act = a => { const b = $('[data-action="' + a + '"]'); if (b) { b.click(); return true; } return false; };
    const viaNav = g => { const b = $('.gx6-nav [data-go="' + g + '"]'); if (b) { b.click(); return true; } return false; };

    function findMail() {
      const re = /correo|mail|buz[oó]n|inbox|mensaje/i;
      for (const e of document.querySelectorAll("button,[role=button],a,[data-action],[data-go]")) {
        if (box.contains(e) || e.closest("#gxIdeas,.gxi-row,.gx6-nav") || e.classList.contains("gxi-btn")) continue;
        const cls = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className;
        if (re.test([e.id, cls, e.getAttribute("aria-label"), e.dataset.action, e.dataset.go, e.title].join(" "))) return e;
      }
      return null;
    }

    box.addEventListener("click", e => {
      const b = e.target.closest("[data-go]");
      if (!b) return;
      const g = b.dataset.go;
      if (g === "soon") return toast(b.dataset.msg || "Próximamente");
      if (g === "local") return void act("local");
      if (g === "bot") return void act("mode");
      if (g === "online") return void act("online-open");
      if (g === "settings") return void act("settings");
      if (g === "friends") return void (viaNav("friends") || act("friends-open"));    // mismo destino que la barra
      if (g === "rank") return void (viaNav("rank") || toast("Ranking: próximamente")); // mismo destino que la barra
      if (g === "ideas") {
        const i = $(".gx6 .gxi-btn") || $(".gxi-btn");
        return i ? i.click() : toast("Buzón de ideas no disponible");
      }
      if (g === "mail") { const m = findMail(); return m ? m.click() : toast("Mensajes: próximamente"); }
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
      const k = JSON.stringify([d.name, d.avatar, d.lv, d.pct, d.label, d.status, d.tr, d.played, d.wins, d.gold, d.gems, d.rank ? d.rank.label : ""]);
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