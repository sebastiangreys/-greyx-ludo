/* GREYX LUDO — PERFIL (Mi perfil + Perfil de otro jugador)
   Una sola interfaz con dos modos de permisos:
     MI PERFIL        → editar avatar y descripción (50 caracteres máx.), preferidos y logros recientes.
     PERFIL DE OTRO   → solo lectura + estado de amistad (AMIGOS / AGREGAR AMIGO / solicitud pendiente).
   Carga: ponlo como el PRIMER <script> (antes de greyx-core.js) para que intercepte los toques
   de "Perfil" y de los jugadores antes que los módulos anteriores.
   Datos (todo real, nada inventado):
     users/{uid}, stats/{uid}, publicProfiles/{uid}, badges/{uid}, presence/{uid} (Realtime DB),
     friendRequests/{from_to}, users/{me}/friends/{uid}
     bios/{uid} {text}  ← NUEVO (descripción). Sin documento = "Amo Ludo Greyx". Ver reglas en la nota. */
(() => {
  "use strict";
  if (window.GXPerfil) return;

  const G = () => window.GX;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => Number(n || 0).toLocaleString("es");

  const DEFAULT_BIO = "Amo Ludo Greyx", BIO_MAX = 50;
  const AV_IDS = Array.from({ length: 16 }, (_, i) => "a" + (i + 1));
  const avatar = id => (G() && G().avatarEmoji ? G().avatarEmoji(id) : "👤");
  const COLOR_NAME = { red: "Coral", green: "Pradera", yellow: "Sol", blue: "Puerto" };
  const COLOR_HEX = { red: "#ef4444", green: "#22c55e", yellow: "#fbbf24", blue: "#3b82f6" };
  const BOARD_NAME = { neon: "Neón", wood: "Madera", ice: "Hielo", lava: "Lava" };
  const RAR = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, exclusive: 5 };

  const FLAG_DO = `<svg viewBox="0 0 28 18" width="22" height="14" aria-hidden="true"><rect width="28" height="18" rx="2.5" fill="#fff"/><rect width="12" height="7.5" fill="#1d4ed8"/><rect x="16" width="12" height="7.5" fill="#dc2626"/><rect y="10.5" width="12" height="7.5" fill="#dc2626"/><rect x="16" y="10.5" width="12" height="7.5" fill="#1d4ed8"/><rect x="12" width="4" height="18" fill="#fff"/><rect y="7.5" width="28" height="3" fill="#fff"/></svg>`;
  const BACK = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const PENCIL = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z" fill="currentColor"/></svg>`;
  const CUP = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="#fbbf24"/><path d="M7 5H4v1.6A3.6 3.6 0 0 0 7.6 10.2M17 5h3v1.6a3.6 3.6 0 0 1-3.6 3.6" fill="none" stroke="#e0a82a" stroke-width="1.7"/><rect x="10.7" y="13" width="2.6" height="4" fill="#e0a82a"/><rect x="7.5" y="17" width="9" height="3" rx="1.2" fill="#fbbf24"/></svg>`;

  /* ---------------- CSS ---------------- */
  const css = `
#gxPerfil{position:fixed;inset:0;z-index:940;display:block;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;color:#f1f3ff;
  font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  background:radial-gradient(circle at 50% 0,#3a1fa088,transparent 46%),radial-gradient(circle at 100% 45%,#2a3cc844,transparent 40%),radial-gradient(circle at 0 85%,#4c1d9555,transparent 42%),linear-gradient(180deg,#080a2a,#04051a);
  padding:calc(10px + env(safe-area-inset-top,0px)) 14px calc(108px + env(safe-area-inset-bottom,0px));animation:pfIn .28s cubic-bezier(.2,.8,.2,1) both}
@keyframes pfIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
#gxPerfil button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer}
#gxPerfil svg{display:block}
.pf-in{width:min(100%,520px);margin:0 auto;display:flex;flex-direction:column;gap:14px}
.pf-in>*{flex:none;min-width:0}
.pf-card{border:1.5px solid #3b46c9;border-radius:20px;background:linear-gradient(160deg,#121858ee,#080b2bee);box-shadow:0 0 16px #3b46c944,inset 0 1px 0 #ffffff1c}

.pf-bar{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;min-height:48px}
.pf-back{width:44px;height:44px;display:grid;place-items:center;padding:0;border-radius:50%;border:1.5px solid #6d5cffaa;background:linear-gradient(145deg,#232a66,#0d1030);box-shadow:0 0 14px #4f46e566}
.pf-back:active{transform:scale(.93)}
.pf-ttl{display:flex;align-items:center;justify-content:center;gap:10px;font-weight:900;font-size:1.1rem;letter-spacing:.08em;text-transform:uppercase}
.pf-ttl::before,.pf-ttl::after{content:"";width:26px;height:2px;background:linear-gradient(90deg,transparent,#8b9bff);box-shadow:0 0 8px #6d7bff}
.pf-ttl::after{transform:scaleX(-1)}

.pf-hero{padding:16px;display:flex;flex-direction:column;gap:14px;background:radial-gradient(120% 80% at 0 0,#6d28d933,transparent 60%),linear-gradient(160deg,#141a58,#080b2b)}
.pf-top{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:center}
.pf-avw{position:relative;width:96px;height:96px}
.pf-ring{width:100%;height:100%;padding:4px;border-radius:50%;background:conic-gradient(from 200deg,#a78bfa,#fff9,#6d28d9,#a78bfa);filter:drop-shadow(0 0 14px #8b5cf6aa)}
.pf-av{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;font-size:3rem;background:radial-gradient(circle at 35% 30%,#3b3f75,#12152c)}
.pf-lv{position:absolute;left:-6px;bottom:-4px;min-width:44px;height:28px;padding:0 8px;display:grid;place-items:center;border-radius:10px;border:2px solid #0b0e2e;
  background:linear-gradient(145deg,#fde68a,#d9a928);color:#3a2200;font:900 .74rem Inter,system-ui,sans-serif;box-shadow:0 4px 10px #0009}
.pf-edit{position:absolute;right:-4px;bottom:-4px;width:34px;height:34px;display:grid;place-items:center;padding:0;border-radius:50%;border:2px solid #0b0e2e;
  background:linear-gradient(145deg,#8b5cf6,#5b21b6);color:#fff;box-shadow:0 4px 10px #0009}
.pf-edit:active{transform:scale(.93)}
.pf-id{min-width:0;display:flex;flex-direction:column;gap:6px}
.pf-name{margin:0;display:flex;align-items:center;gap:4px;min-width:0;font-size:1.3rem;font-weight:900;letter-spacing:-.01em;overflow-wrap:anywhere}
.pf-name .gxb{margin-left:2px}
.pf-st{display:flex;align-items:center;gap:7px;font-size:.84rem;font-weight:800}
.pf-st i{flex:none;width:10px;height:10px;border-radius:50%;background:#64748b}
.pf-st.on{color:#4ade80}.pf-st.on i{background:#22c55e;box-shadow:0 0 10px #22c55e}
.pf-st.off{color:#94a3b8}
.pf-bio{margin:0;color:#d4d9f4;font-size:.9rem;line-height:1.35;overflow-wrap:anywhere}
.pf-biolnk{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;border:1px solid #a78bfa66;background:#8b5cf620;color:#c4b5fd;font-weight:800;font-size:.7rem}
.pf-bioedit{display:flex;flex-direction:column;gap:6px}
.pf-bioedit input{width:100%;padding:11px 12px;border-radius:12px;border:1.5px solid #6d5cff;background:#0a0d30;color:#fff;outline:0;font-size:16px;font-weight:600}
.pf-bioedit .pf-cnt{align-self:flex-end;color:#9aa4d6;font-size:.68rem;font-weight:700}
.pf-bioedit .pf-cnt.max{color:#fbbf24}
.pf-row2{display:flex;gap:8px}
.pf-btn{flex:1;min-height:40px;padding:0 12px;border:0;border-radius:12px;font-weight:900;font-size:.8rem;color:#fff;background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 3px 0 #3b1d8f}
.pf-btn.ghost{background:#ffffff12;box-shadow:none;border:1px solid #ffffff22}
.pf-btn:disabled{opacity:.55}
.pf-btn:active{transform:translateY(2px)}
.pf-country{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:99px;background:#ffffff10;border:1px solid #ffffff1c;font-size:.74rem;font-weight:800;color:#e5e9ff}
.pf-rt{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:10px}
.pf-rk,.pf-tr{display:flex;align-items:center;gap:10px;min-width:0;padding:10px 12px;border-radius:16px;background:#070a2899;border:1px solid #ffffff1c}
.pf-rk{border-color:color-mix(in srgb,var(--rc,#6d7bff) 55%,transparent);box-shadow:0 0 18px color-mix(in srgb,var(--rc,#6d7bff) 25%,transparent)}
.pf-rk .rkb{flex:none}
.pf-rk div,.pf-tr div{min-width:0;line-height:1.15}
.pf-rk small,.pf-tr small{display:block;color:#9aa4d6;font:800 .5rem Inter,system-ui,sans-serif;letter-spacing:.14em}
.pf-rk b{display:block;margin-top:3px;font-size:1rem;font-weight:900;color:var(--rc,#c4b5fd);white-space:nowrap}
.pf-tr{border-color:#fbbf2455}
.pf-tr b{display:block;margin-top:3px;font-size:1.25rem;font-weight:900;color:#fbbf24}
.pf-likes .gx-likes{margin-top:0}
.pf-fr{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 16px;border-radius:16px;font-weight:900;font-size:.9rem;letter-spacing:.06em;text-align:center}
.pf-fr.add{border:0;color:#fff;background:linear-gradient(135deg,#8b5cf6,#6d28d9);box-shadow:0 5px 0 #3b1d8f,0 0 20px #7c3aed55}
.pf-fr.add:active{transform:translateY(3px);box-shadow:0 2px 0 #3b1d8f}
.pf-fr.ok{color:#4ade80;border:1.5px solid #22c55e88;background:#22c55e1c}
.pf-fr.wait{color:#fde68a;border:1.5px solid #fbbf2477;background:#fbbf2418}
.pf-fr.no{color:#fca5a5;border:1.5px solid #ef444477;background:#ef44441a}
.pf-fr:disabled{opacity:.6}
.pf-msg{margin:0;padding:10px 12px;border-radius:12px;font-size:.8rem;font-weight:700;border:1px solid #ef444455;background:#ef444422;color:#fca5a5}
.pf-msg.ok{border-color:#22c55e55;background:#22c55e22;color:#86efac}

.pf-xp{padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.pf-xph{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:900;font-size:.8rem}
.pf-xph span{color:#a5b0ff}
.pf-xpb{height:10px;border-radius:99px;border:1.5px solid #6d5cff;background:#0a0d30;overflow:hidden}
.pf-xpb i{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#a78bfa,#fbbf24)}

.pf-sec{display:flex;align-items:center;gap:10px;font:900 .8rem Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}
.pf-sec::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,#6d5cff88,transparent)}
.pf-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.pf-s{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;text-align:center}
.pf-si{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;font-size:1.35rem;background:#0b1038;border:1px solid #ffffff1a}
.pf-si.pct{color:#38bdf8;font-weight:900;font-size:1.1rem}
.pf-s small{color:#9aa4d6;font:800 .6rem Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}
.pf-s b{font-size:1.3rem;font-weight:900;line-height:1}

.pf-ach{padding:14px;display:flex;flex-direction:column;gap:12px}
.pf-ah{display:flex;align-items:center;gap:12px}
.pf-ah>span{font-size:1.6rem}
.pf-ah div{flex:1;min-width:0}
.pf-ah b{display:block;font-size:.95rem;font-weight:900}
.pf-ah small{color:#9aa4d6;font-size:.75rem;font-weight:700}
.pf-ab{height:8px;border-radius:99px;border:1.5px solid #6d5cff;background:#0a0d30;overflow:hidden}
.pf-ab i{display:block;height:100%;background:linear-gradient(90deg,#fbbf24,#f59e0b)}
.pf-strip{display:flex;gap:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;padding:4px 2px 8px;margin:0 -2px}
.pf-bd{flex:none;width:82px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:0;border:0;background:none;scroll-snap-align:start;text-align:center}
.pf-hex{position:relative;width:60px;height:66px;display:grid;place-items:center;font-size:1.6rem;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:linear-gradient(145deg,#fde68a,#7c3aed)}
.pf-hex::before{content:"";position:absolute;inset:3px;clip-path:inherit;background:linear-gradient(160deg,#2a2370,#0d1030)}
.pf-hex span{position:relative}
.pf-bd.lock .pf-hex{background:#4b5280}
.pf-bd.lock .pf-hex span{filter:grayscale(1);opacity:.5}
.pf-bd.lock .pf-hex::after{content:"🔒";position:absolute;right:2px;bottom:6px;font-size:.7rem}
.pf-bd em{font-style:normal;font-size:.64rem;font-weight:800;line-height:1.15;color:#e5e9ff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pf-bd.lock em{color:#8e97c4}
.pf-note{margin:0;color:#7f89b8;font-size:.66rem;line-height:1.3}

.pf-pref{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pf-p{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;text-align:center}
.pf-p i{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;font-style:normal;font-size:1.15rem;background:#0b1038;border:1px solid #ffffff1a}
.pf-p small{color:#9aa4d6;font:800 .52rem Inter,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}
.pf-p b{font-size:.74rem;font-weight:900;line-height:1.15;overflow-wrap:anywhere}
.pf-p .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:-1px}

.pf-rec{display:flex;align-items:center;gap:12px;padding:12px}
.pf-rec .ic{flex:none;width:46px;height:46px;display:grid;place-items:center;border-radius:14px;font-size:1.5rem;background:#0b1038;border:1px solid #ffffff1a}
.pf-rec div{flex:1;min-width:0}
.pf-rec b{display:block;font-size:.9rem;font-weight:900}
.pf-rec small{display:block;margin-top:2px;color:#a3abbd;font-size:.74rem;line-height:1.3}
.pf-rec .rw{display:block;margin-top:4px;color:#fde68a;font-size:.7rem;font-weight:800}
.pf-empty{padding:16px;text-align:center;color:#94a3b8;font-size:.82rem}
.pf-admin{padding:12px;border-radius:16px;border:1px dashed #fbbf2488;background:#fbbf240d;text-align:center}
.pf-admin small{display:block;color:#fbbf24;font:800 .58rem monospace;letter-spacing:.14em}
.pf-admin code{display:block;margin:6px 0 10px;font:700 .7rem monospace;word-break:break-all;color:#fde68a}
.pf-admin button{min-height:38px;padding:0 16px;border:0;border-radius:12px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#3a2200;font-weight:900;font-size:.78rem}

.pf-md{position:fixed;inset:0;z-index:1060;display:grid;place-items:center;padding:20px;background:rgba(5,6,12,.86);animation:pfF .18s ease both}
@keyframes pfF{from{opacity:0}to{opacity:1}}
.pf-mdc{position:relative;width:min(360px,100%);max-height:88vh;overflow-y:auto;padding:22px 18px 18px;border-radius:26px;text-align:center;border:1.5px solid #a78bfa77;background:linear-gradient(160deg,#252b60,#0d1027);box-shadow:0 25px 70px #000b}
.pf-mdc h3{margin:0 0 12px;font-size:1.1rem;font-weight:900}
.pf-mdc p{margin:8px 0 14px;color:#cbd5e1;font-size:.85rem;line-height:1.45}
.pf-avg{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.pf-avp{aspect-ratio:1;display:grid;place-items:center;padding:0;border-radius:50%;font-size:1.8rem;border:2px solid #ffffff1c;background:radial-gradient(circle at 35% 30%,#3b3f75,#14172e)}
.pf-avp.sel{border-color:#fde68a;box-shadow:0 0 0 4px #fbbf2433,0 0 18px #8b5cf6}
.pf-chip{display:inline-block;padding:3px 10px;border-radius:99px;background:#ffffff14;font:800 .6rem Inter,system-ui,sans-serif;letter-spacing:.08em}
.pf-chip.on{background:#22c55e26;color:#4ade80}

/* la barra inferior sigue siendo la independiente de siempre; aquí solo se marca la pestaña */
body:has(#gxPerfil) .gx-fab{display:none!important}
body:has(#gxPerfil) .gx6-nav button.on{color:#7f8ad0}
body:has(#gxPerfil) .gx6-nav button.on svg{filter:none}
body:has(#gxPerfil) .gx6-nav button.on::after{display:none}
body:has(#gxPerfil.pf-mine) .gx6-nav button[data-go="profile"]{color:#b9adff}
body:has(#gxPerfil.pf-mine) .gx6-nav button[data-go="profile"] svg{filter:drop-shadow(0 0 7px #7c6cff)}
body:has(#gxPerfil.pf-mine) .gx6-nav button[data-go="profile"]::after{content:"";display:block;width:40px;height:3px;border-radius:3px;background:#7c6cff;box-shadow:0 0 10px #7c6cff}
@media (max-width:350px){.pf-top{grid-template-columns:1fr;justify-items:center;text-align:center}.pf-id{align-items:center}.pf-country,.pf-biolnk{align-self:center}.pf-rt{grid-template-columns:1fr}.pf-pref{grid-template-columns:repeat(2,1fr)}}
@media (min-width:768px){#gxPerfil{padding-left:24px;padding-right:24px}.pf-in{width:min(100%,600px)}}
`;
  const st = document.createElement("style");
  st.id = "gxPerfilCss";
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------------- Estado ---------------- */
  const v = { me: false, uid: null, d: null, loading: false, err: "", req: 0,
              editBio: false, bioDraft: "", pickAv: null, detail: null, busy: false, msg: "", ok: false };
  let el = null;

  /* ---------------- Datos ---------------- */
  async function presenceOf(uid) {
    try {
      const P = window.GXPresence;
      if (!P) return null;
      const { db, mod } = await P.get();
      if (!db) return null;
      const sn = await mod.get(mod.ref(db, "presence/" + uid));
      if (!sn.exists()) return false;
      const x = sn.val();
      return !!x && x.state === "online" && Date.now() - (x.last || 0) < (P.stale || 150000);
    } catch (e) { return null; }
  }

  async function loadData(uid, isMe) {
    const g = G(), s = g.state, fs = await g.fsModule(), db = g.fb.db, me = s.user.uid;
    const rd = p => fs.getDoc(fs.doc(db, ...p)).catch(() => null);
    const jobs = [rd(["publicProfiles", uid]), rd(["stats", uid]), rd(["bios", uid]), rd(["badges", uid]), presenceOf(uid)];
    if (!isMe) jobs.push(rd(["users", me, "friends", uid]), rd(["friendRequests", me + "_" + uid]), rd(["friendRequests", uid + "_" + me]));
    else jobs.push(rd(["admins", me]));
    const r = await Promise.all(jobs);
    const pub = r[0] && r[0].exists() ? r[0].data() : null;
    const stDoc = r[1] && r[1].exists() ? r[1].data() : null;
    const bio = r[2] && r[2].exists() ? String(r[2].data().text || "") : "";

    let S, hasFull = false;
    if (isMe) {
      const own = s.stats && s.statsUid === uid ? s.stats : null;
      S = Object.assign({ played: 0, wins: 0, losses: 0, captures: 0, goals: 0, trophies: 0, streak: 0, bestStreak: 0, xp: 0 }, stDoc || own || {});
      if (s.xpLoaded && s.xp > (S.xp || 0)) S.xp = s.xp;
      hasFull = true;
    } else if (stDoc) {
      S = Object.assign({ played: 0, wins: 0, losses: 0, captures: 0, goals: 0, trophies: 0, streak: 0, bestStreak: 0, xp: 0 }, stDoc);
      hasFull = true;
    } else if (pub) {
      S = { played: pub.played || 0, wins: pub.wins || 0, losses: Math.max(0, (pub.played || 0) - (pub.wins || 0)),
            trophies: pub.trophies || 0, xp: pub.xp || 0, streak: null };
    } else S = { played: 0, wins: 0, losses: 0, trophies: 0, xp: 0, streak: null };

    let friend = "none";
    if (!isMe) {
      const fDoc = r[5], out = r[6], inc = r[7];
      if ((fDoc && fDoc.exists()) || (out && out.exists() && out.data().status === "accepted") || (inc && inc.exists() && inc.data().status === "accepted")) friend = "friend";
      else if (out && out.exists() && out.data().status === "pending") friend = "sent";
      else if (inc && inc.exists() && inc.data().status === "pending") friend = "incoming";
      else if (out && out.exists() && out.data().status === "rejected") friend = "rejected";
    }
    return {
      uid, username: isMe ? s.profile.username : (pub && pub.username) || "jugador",
      avatar: isMe ? (s.profile.avatar || "a1") : (pub && pub.avatar) || "a1",
      S, hasFull, bio: bio || DEFAULT_BIO, online: isMe ? true : r[4],
      owner: !!(r[3] && r[3].exists() && r[3].data().type === "owner"),
      friend, admin: isMe ? false : false, isAdminViewer: isMe ? !!(r[5] && r[5].exists()) : false, missing: !pub && !isMe
    };
  }

  async function checkAdmin(d) {
    try {
      const g = G(), fs = await g.fsModule();
      const sn = await fs.getDoc(fs.doc(g.fb.db, "admins", g.state.user.uid));
      d.admin = sn.exists();
    } catch (e) { d.admin = false; }
  }

  /* ---------------- Logros (evaluados con los datos reales) ---------------- */
  function achievements(d) {
    const C = window.GreyxCatalog;
    if (!C) return { list: [], total: 0, got: 0, partial: false };
    let partial = false;
    const list = [];
    C.ACH.forEach((a, i) => {
      const c = a.cond;
      if (c.k === "own") { partial = true; return; }          // depende del inventario: no se puede verificar aquí
      const val = d.S[c.k];
      if (val == null) { partial = true; return; }            // dato no público de otro jugador
      list.push({ a, i, done: val >= c.v });
    });
    list.sort((x, y) => (y.done - x.done) || (x.i - y.i));
    return { list, total: list.length, got: list.filter(x => x.done).length, partial };
  }

  /* ---------------- Dibujo ---------------- */
  function heroHtml(d) {
    const g = G(), S = d.S, lv = g.xpLevelFromTotal(S.xp || 0);
    const r = window.GXRank && window.GXRank.rankOf ? window.GXRank.rankOf(S.trophies) : null;
    const rbadge = r && window.GXRank.badgeFor ? window.GXRank.badgeFor(r, 38) : "";
    const status = d.online === true ? `<div class="pf-st on"><i></i>En línea</div>`
                 : d.online === false ? `<div class="pf-st off"><i></i>Desconectado</div>` : "";
    const ownerB = d.owner && window.GXOwnerIcon ? window.GXOwnerIcon(20) : "";
    const bioHtml = v.me && v.editBio
      ? `<div class="pf-bioedit">
           <input id="pfBio" type="text" maxlength="${BIO_MAX}" value="${esc(v.bioDraft)}" autocomplete="off" autocapitalize="sentences" spellcheck="false" aria-label="Descripción">
           <span class="pf-cnt ${v.bioDraft.length >= BIO_MAX ? "max" : ""}" id="pfCnt">${v.bioDraft.length} / ${BIO_MAX}</span>
           <div class="pf-row2"><button class="pf-btn ghost" data-p="biocancel" type="button">Cancelar</button>
             <button class="pf-btn" data-p="biosave" type="button" ${v.busy ? "disabled" : ""}>${v.busy ? "Guardando…" : "Guardar"}</button></div>
         </div>`
      : `<p class="pf-bio">${esc(d.bio)}</p>${v.me ? `<button class="pf-biolnk" data-p="bioedit" type="button">${PENCIL}Editar descripción</button>` : ""}`;

    return `
    <section class="pf-card pf-hero">
      <div class="pf-top">
        <div class="pf-avw">
          <div class="pf-ring"><div class="pf-av">${avatar(d.avatar)}</div></div>
          <b class="pf-lv">NV. ${lv}</b>
          ${v.me ? `<button class="pf-edit" data-p="avatar" type="button" aria-label="Cambiar avatar">${PENCIL}</button>` : ""}
        </div>
        <div class="pf-id">
          <h2 class="pf-name">@${esc(d.username)}${ownerB}</h2>
          ${status}
          ${bioHtml}
          <span class="pf-country">${FLAG_DO}Rep. Dominicana</span>
        </div>
      </div>
      <div class="pf-rt">
        <div class="pf-rk" style="--rc:${r ? r.tier.c1 : "#7c86ad"}">${rbadge}<div><small>RANGO</small><b>${r ? esc(r.label) : "Sin rango"}</b></div></div>
        <div class="pf-tr">${CUP}<div><small>TROFEOS</small><b>${fmt(S.trophies)}</b></div></div>
      </div>
      <div class="pf-likes"><div class="gx-likes" data-uid="${esc(d.uid)}"></div></div>
    </section>`;
  }

  function friendHtml(d) {
    if (v.me) return "";
    const map = {
      friend: `<div class="pf-fr ok">✓ AMIGOS</div>`,
      sent: `<div class="pf-fr wait">⏳ SOLICITUD ENVIADA</div>`,
      incoming: `<div class="pf-fr wait">📨 TE ENVIÓ UNA SOLICITUD</div>`,
      rejected: `<div class="pf-fr no">SOLICITUD RECHAZADA</div>`
    };
    if (map[d.friend]) return map[d.friend] + (d.friend === "incoming" ? `<p class="pf-note" style="text-align:center">Respóndela desde la sección Amigos.</p>` : "");
    return `<button class="pf-fr add" data-p="add" type="button" ${v.busy ? "disabled" : ""}>${v.busy ? "ENVIANDO…" : "+ AGREGAR AMIGO"}</button>`;
  }

  function xpHtml(d) {
    const g = G(), xp = d.S.xp || 0, lv = g.xpLevelFromTotal(xp), max = lv >= 100;
    const base = g.xpForLevel(lv), next = g.xpForLevel(lv + 1);
    const pct = max ? 100 : Math.max(0, Math.min(100, Math.round((xp - base) / (next - base) * 100)));
    return `<section class="pf-card pf-xp"><div class="pf-xph"><span>${max ? "NIVEL MÁXIMO" : (xp - base) + " / " + (next - base) + " XP"}</span><span>NV. ${lv}</span></div>
      <div class="pf-xpb"><i style="width:${pct}%"></i></div></section>`;
  }

  function statsHtml(d) {
    const S = d.S, rate = S.played ? Math.round(S.wins * 100 / S.played) + "%" : "0%";
    const cells = [["🏆", "Trofeos", fmt(S.trophies)], ["🎮", "Partidas", fmt(S.played)], ["🥇", "Victorias", fmt(S.wins)],
      ["💔", "Derrotas", fmt(S.losses)], ["%", "% Victorias", rate], ["📈", "Racha actual", S.streak == null ? "—" : fmt(S.streak)]];
    return `<div class="pf-sec">Estadísticas</div>
      <div class="pf-stats">${cells.map(c => `<div class="pf-card pf-s"><span class="pf-si ${c[0] === "%" ? "pct" : ""}">${c[0]}</span><small>${c[1]}</small><b>${c[2]}</b></div>`).join("")}</div>`;
  }

  function achHtml(d) {
    const A = achievements(d);
    const pct = A.total ? Math.round(A.got * 100 / A.total) : 0;
    const strip = A.list.map(x => {
      const hide = x.a.secret && !x.done;
      return `<button class="pf-bd ${x.done ? "" : "lock"}" data-p="ach" data-id="${esc(x.a.id)}" type="button">
        <span class="pf-hex"><span>${hide ? "❔" : esc(x.a.icon)}</span></span><em>${hide ? "Secreto" : esc(x.a.name)}</em></button>`;
    }).join("");
    return `<section class="pf-card pf-ach">
      <div class="pf-ah"><span>🏆</span><div><b>Logros</b><small>${A.got}/${A.total} desbloqueados</small></div></div>
      <div class="pf-ab"><i style="width:${pct}%"></i></div>
      ${strip ? `<div class="pf-strip">${strip}</div>` : `<div class="pf-empty">Sin datos de logros.</div>`}
      ${A.partial ? `<p class="pf-note">${v.me ? "Los logros de coleccionista no se muestran aquí." : "Se muestran los logros que se pueden comprobar con los datos públicos."}</p>` : ""}
    </section>`;
  }

  function prefHtml() {
    const s = G().state, b = [...document.body.classList].find(c => /^b-/.test(c));
    const cells = [
      ["🎨", "Color", `<span class="dot" style="background:${COLOR_HEX[s.humanColor] || "#888"}"></span>${esc(COLOR_NAME[s.humanColor] || "—")}`],
      ["🎲", "Tablero", esc(b ? BOARD_NAME[b.slice(2)] || "Clásico" : "Clásico")],
      ["🎮", "Modo", s.mode === "solo" ? "Reto IA" : "Local"],
      ["🌐", "Idioma", esc((G().LANGS || {})[s.lang] || "Español")]
    ];
    return `<div class="pf-sec">Mis preferidos</div>
      <div class="pf-pref">${cells.map(c => `<div class="pf-card pf-p"><i>${c[0]}</i><small>${c[1]}</small><b>${c[2]}</b></div>`).join("")}</div>`;
  }

  function recentHtml(d) {
    const C = window.GreyxCatalog, A = achievements(d);
    const items = A.list.filter(x => x.done).sort((x, y) => (RAR[y.a.rarity] - RAR[x.a.rarity]) || (y.i - x.i)).slice(0, 3);
    const body = items.length ? items.map(x => {
      const rw = x.a.reward && C ? C.ITEMS.find(i => i.id === x.a.reward) : null;
      return `<div class="pf-card pf-rec"><span class="ic">${esc(x.a.icon)}</span><div><b>${esc(x.a.name)}</b><small>${esc(x.a.desc)}</small>${rw ? `<span class="rw">Premio: ${esc(rw.name)}</span>` : ""}</div></div>`;
    }).join("") : `<div class="pf-card pf-empty">Aún no has desbloqueado logros.</div>`;
    return `<div class="pf-sec">Logros recientes</div>${body}`;
  }

  function detailHtml(d) {
    const C = window.GreyxCatalog; if (!v.detail || !C) return "";
    const a = C.ACH.find(x => x.id === v.detail); if (!a) return "";
    const x = achievements(d).list.find(y => y.a.id === a.id), done = !!(x && x.done), hide = a.secret && !done;
    const rar = C.RARITY[a.rarity] || { n: "", c: "#9aa3b8" };
    return `<div class="pf-md" data-p="achclose"><div class="pf-mdc" role="dialog" aria-modal="true">
      <span class="pf-hex" style="margin:0 auto 10px;width:72px;height:80px;font-size:2rem;${done ? "" : "background:#4b5280"}"><span>${hide ? "❔" : esc(a.icon)}</span></span>
      <h3>${hide ? "Logro secreto" : esc(a.name)}</h3>
      <span class="pf-chip" style="color:${rar.c}">${esc(rar.n)}</span> <span class="pf-chip ${done ? "on" : ""}">${done ? "DESBLOQUEADO" : "PENDIENTE"}</span>
      <p>${hide ? "Sigue jugando para descubrirlo." : esc(a.desc)}</p>
      <button class="pf-btn" data-p="achclose" type="button" style="width:100%">Cerrar</button></div></div>`;
  }

  function avatarSheet() {
    if (!v.pickAv) return "";
    return `<div class="pf-md"><div class="pf-mdc" role="dialog" aria-modal="true"><h3>Elige tu avatar</h3>
      <div class="pf-avg">${AV_IDS.map(id => `<button class="pf-avp ${v.pickAv === id ? "sel" : ""}" data-p="pick" data-id="${id}" type="button" aria-label="Avatar">${avatar(id)}</button>`).join("")}</div>
      <div class="pf-row2"><button class="pf-btn ghost" data-p="avcancel" type="button">Cancelar</button>
        <button class="pf-btn" data-p="avsave" type="button" ${v.busy ? "disabled" : ""}>${v.busy ? "Guardando…" : "Guardar"}</button></div></div></div>`;
  }

  function adminHtml(d) {
    if (v.me || !d.admin) return "";
    return `<div class="pf-admin"><small>ID DE USUARIO</small><code>${esc(d.uid)}</code><button data-p="copy" type="button">${v.copied ? "¡Copiado!" : "Copiar ID"}</button></div>`;
  }

  function draw() {
    if (!el) return;
    const y = el.scrollTop, d = v.d;
    let body;
    if (v.loading || !d) body = `<div class="pf-card pf-empty">${v.err ? esc(v.err) : "Cargando…"}</div>`;
    else if (d.missing) body = `<div class="pf-card pf-empty">Este jugador aún no tiene perfil público.</div>`;
    else body = `${heroHtml(d)}
      ${v.msg ? `<p class="pf-msg ${v.ok ? "ok" : ""}">${esc(v.msg)}</p>` : ""}
      ${friendHtml(d)}${xpHtml(d)}${statsHtml(d)}${achHtml(d)}
      ${v.me ? prefHtml() + recentHtml(d) : ""}${adminHtml(d)}`;
    el.className = v.me ? "pf-mine" : "pf-other";
    el.innerHTML = `<div class="pf-in">
      <div class="pf-bar"><button class="pf-back" data-p="close" type="button" aria-label="Volver">${BACK}</button>
        <div class="pf-ttl">${v.me ? "Mi perfil" : "Perfil de jugador"}</div><span></span></div>
      ${body}</div>${d ? detailHtml(d) : ""}${avatarSheet()}`;
    el.scrollTop = y;
  }

  /* ---------------- Abrir / cerrar ---------------- */
  async function show(uid, isMe) {
    const g = G(); if (!g || !g.fb || !g.fb.db || !g.state.user) return;
    if (!el) {
      el = document.createElement("div");
      el.id = "gxPerfil";
      el.addEventListener("click", onClick);
      el.addEventListener("input", onInput);
      document.body.appendChild(el);
    }
    Object.assign(v, { me: isMe, uid, d: null, loading: true, err: "", editBio: false, bioDraft: "", pickAv: null, detail: null, busy: false, msg: "", ok: false, copied: false });
    const my = ++v.req;
    el.scrollTop = 0;
    draw();
    try {
      const d = await loadData(uid, isMe);
      if (my !== v.req) return;
      if (!isMe) await checkAdmin(d);
      v.d = d;
    } catch (e) {
      console.warn("perfil", e);
      if (my !== v.req) return;
      v.err = "No se pudo cargar el perfil.";
    }
    v.loading = false;
    draw();
  }

  function close() { v.req++; if (el) { el.remove(); el = null; } }

  function openMine() {
    const g = G(); if (!g) return;
    const s = g.state;
    if (!s.user) { s.settingsOpen = false; s.showAuth = true; s.authMode = "login"; g.render(); return; }
    if (!s.profile) { s.showProfile = "create"; s.profileName = ""; s.profileAvatar = "a1"; s.profileError = ""; s.profileNotice = ""; g.render(); return; }
    show(s.user.uid, true);
  }
  function openOther(uid) {
    const g = G(); if (!g || !uid) return;
    if (!g.state.user) { g.state.showAuth = true; g.state.authMode = "login"; g.render(); return; }
    if (uid === g.state.user.uid) return openMine();
    show(uid, false);
  }

  /* ---------------- Acciones ---------------- */
  function onInput(e) {
    if (e.target.id !== "pfBio") return;
    let t = e.target.value.replace(/[\r\n]+/g, " ");
    if (t.length > BIO_MAX) t = t.slice(0, BIO_MAX);
    if (t !== e.target.value) e.target.value = t;
    v.bioDraft = t;
    const c = $("#pfCnt", el);
    if (c) { c.textContent = t.length + " / " + BIO_MAX; c.classList.toggle("max", t.length >= BIO_MAX); }
  }

  async function onClick(e) {
    const b = e.target.closest("[data-p]"); if (!b) return;
    if (b.classList.contains("pf-md") && e.target !== b) return;
    const a = b.dataset.p, d = v.d;
    if (a === "close") return close();
    if (a === "ach") { v.detail = b.dataset.id; return draw(); }
    if (a === "achclose") { v.detail = null; return draw(); }
    if (!d) return;
    if (a === "copy") {
      const done = () => { v.copied = true; draw(); setTimeout(() => { v.copied = false; draw(); }, 1600); };
      try { await navigator.clipboard.writeText(d.uid); } catch (err) {}
      return done();
    }
    if (!v.me && a === "add") return addFriend(d);
    if (!v.me) return;
    if (a === "bioedit") { v.editBio = true; v.bioDraft = d.bio === DEFAULT_BIO ? d.bio : d.bio; v.msg = ""; draw(); const i = $("#pfBio", el); if (i) i.focus(); return; }
    if (a === "biocancel") { v.editBio = false; v.msg = ""; return draw(); }
    if (a === "biosave") return saveBio(d);
    if (a === "avatar") { v.pickAv = d.avatar; v.msg = ""; return draw(); }
    if (a === "pick") { v.pickAv = b.dataset.id; return draw(); }
    if (a === "avcancel") { v.pickAv = null; return draw(); }
    if (a === "avsave") return saveAvatar(d);
  }

  async function saveBio(d) {
    const text = v.bioDraft.replace(/\s+/g, " ").trim().slice(0, BIO_MAX);
    if (!text) { v.msg = "Escribe una descripción."; v.ok = false; return draw(); }
    v.busy = true; v.msg = ""; draw();
    try {
      const g = G(), fs = await g.fsModule();
      await fs.setDoc(fs.doc(g.fb.db, "bios", d.uid), { text, updatedAt: fs.serverTimestamp() });
      d.bio = text; v.editBio = false; v.msg = "Descripción actualizada."; v.ok = true;
    } catch (err) {
      console.warn("bio", err);
      v.msg = err.code === "permission-denied" ? "No se pudo guardar. Falta publicar la regla de Firestore para bios." : "No se pudo guardar (" + (err.code || "error") + ").";
      v.ok = false;
    }
    v.busy = false; draw();
  }

  async function saveAvatar(d) {
    const id = v.pickAv;
    if (!id || id === d.avatar) { v.pickAv = null; return draw(); }
    v.busy = true; v.msg = ""; draw();
    try {
      const g = G(), s = g.state, fs = await g.fsModule();
      await fs.updateDoc(fs.doc(g.fb.db, "users", d.uid), { avatar: id, updatedAt: fs.serverTimestamp() });
      s.profile = Object.assign({}, s.profile, { avatar: id });
      d.avatar = id;
      if (window.GreyxCore && window.GreyxCore.syncPublicProfile) {
        try { await window.GreyxCore.syncPublicProfile({ fb: g.fb, fs, uid: d.uid, profile: s.profile }); } catch (err) { console.warn("sync", err); }
      }
      v.pickAv = null; v.msg = "Avatar actualizado."; v.ok = true;
      g.render();
    } catch (err) {
      console.warn("avatar", err);
      v.msg = "No se pudo cambiar el avatar (" + (err.code || "error") + ")."; v.ok = false; v.pickAv = null;
    }
    v.busy = false; draw();
  }

  async function addFriend(d) {
    const g = G(), s = g.state;
    if (v.busy) return;
    if (!s.profile) { v.msg = "Crea tu perfil para agregar amigos."; v.ok = false; return draw(); }
    v.busy = true; v.msg = ""; draw();
    try {
      const fs = await g.fsModule(), me = s.user.uid;
      await fs.setDoc(fs.doc(g.fb.db, "friendRequests", me + "_" + d.uid), {
        from: me, to: d.uid, fromUsername: s.profile.username, fromAvatar: s.profile.avatar || "a1",
        toUsername: d.username || "", status: "pending", createdAt: fs.serverTimestamp()
      });
      d.friend = "sent";
    } catch (err) {
      console.warn("addFriend", err);
      v.msg = "No se pudo enviar la solicitud."; v.ok = false;
    }
    v.busy = false; draw();
  }

  /* ---------------- Entradas (se registran primero) ---------------- */
  window.addEventListener("click", e => {
    const t = e.target;
    if (!t || !t.closest) return;
    const nav = t.closest(".gx6-nav [data-go]");
    if (nav) {
      if (nav.dataset.go === "profile") { e.preventDefault(); e.stopImmediatePropagation(); openMine(); }
      else if (el) close();                      // Inicio / Amigos / Ranking: cierran el perfil y siguen su camino
      return;
    }
    const pl = t.closest('[data-action="player-open"]');
    if (pl && !(el && el.contains(pl))) { e.preventDefault(); e.stopImmediatePropagation(); openOther(pl.dataset.uid); }
  }, true);

  // Ranking y otras pantallas abren jugadores con GreyxExtras.open("user", uid)
  const hook = setInterval(() => {
    const X = window.GreyxExtras;
    if (!X || typeof X.open !== "function") return;
    clearInterval(hook);
    if (X.__gxPerfil) return;
    const orig = X.open;
    X.open = function (kind, arg) {
      if (kind === "user") return openOther(arg);
      return orig.apply(this, arguments);
    };
    X.__gxPerfil = true;
  }, 300);

  window.GXPerfil = { openMine, openOther, close };
})();
