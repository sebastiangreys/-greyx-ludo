/* GREYX LUDO — MEJORAS
   Cargar como ÚLTIMO script, justo antes de </body>:
   <script src="greyx-mejoras.js"></script>
   Incluye: confirmaciones (modal), idiomas extra, likes, correo en panel admin,
   CSS de cambios 3, 4, 9 y 10. Requiere las ediciones de INSTRUCCIONES-GREYX.md */
(() => {
  "use strict";

  const G = () => window.GX;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lang = () => (G() && G().state && G().state.lang) || "es";
  const T = s => {
    const x = G();
    if (!x || !x.translateText || lang() === "es") return s;
    const r = x.translateText(s, lang());
    return r === null ? s : r;
  };

  function toast(m) {
    const t = document.createElement("div");
    t.className = "mj-toast";
    t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  /* ============================================================
     CSS: cambios 3, 4, 9, 10 + estilos de modal y likes
     ============================================================ */
  const HAS_MODE = ':is([data-key^="setup-2-local"],[data-key^="setup-3-local"],[data-key^="setup-2-solo"],[data-key^="setup-3-solo"])';
  const css = `
/* ---- CAMBIO 3: sin la ventanita de mensajes bajo el turno ---- */
.hint{display:none!important}
main:has(.dice-row){padding-bottom:150px}

/* ---- CAMBIO 4: menú sin descripciones ni subtítulos ---- */
.gx6-card small{display:none!important}
.gx6-card{min-height:128px!important;padding-bottom:30px}
body:has(.view${HAS_MODE}) .setup-lead,
body:has(.view${HAS_MODE}) .setup-modern .eyebrow{display:none!important}
body:has(.view${HAS_MODE}) .setup-copy::after{display:none!important}

/* ---- CAMBIO 9: centro con los colores de las fichas ---- */
:root{--gx-red:#e53935;--gx-blue:#2f6fe0;--gx-green:#2fa84f;--gx-yellow:#f5b301}
html body .board .finish{
  clip-path:none;border:0;border-radius:5%;filter:none;
  background:
    linear-gradient(45deg,transparent calc(50% - 1px),#ffffffcc calc(50% - 1px),#ffffffcc calc(50% + 1px),transparent calc(50% + 1px)),
    linear-gradient(-45deg,transparent calc(50% - 1px),#ffffffcc calc(50% - 1px),#ffffffcc calc(50% + 1px),transparent calc(50% + 1px)),
    conic-gradient(from -45deg,var(--gx-blue) 0 25%,var(--gx-yellow) 25% 50%,var(--gx-green) 50% 75%,var(--gx-red) 75% 100%);
}

/* ---- CAMBIO 10: rendimiento (animaciones continuas fuera) ---- */
html body{background-attachment:scroll!important}
body::before{animation:none!important}
body .board .cell[class*="lane-"]::after{animation:none!important;display:none}
html body .board .finish::before{animation:none!important;display:none}
body .board .token:not(.valid):not(.hop):not(.arrived):not(.captured):not(.capture-flying){animation:none!important}
html body .board .token:not(.valid){filter:none}
body .cell.safe::before,body .cell.safe:nth-child(odd)::before{animation:none!important}
.turn-chip::before{animation:none!important}
.roll-button:not(:disabled)::after{animation:none!important;display:none}

/* ---- Modal de confirmación ---- */
.mj-cf{position:fixed;inset:0;z-index:1000010;display:grid;place-items:center;padding:20px;background:rgba(5,6,12,.86);animation:mjFade .15s ease both}
.mj-cf-card{width:min(330px,100%);padding:22px 18px 18px;border-radius:24px;text-align:center;color:#fff;font-family:Inter,system-ui,sans-serif;
  border:1px solid #a78bfa66;background:linear-gradient(160deg,#252b60,#0d1027);box-shadow:0 25px 70px #000b}
.mj-cf-ico{font-size:2rem;margin-bottom:6px}
.mj-cf-card h3{margin:0 0 8px;font-size:1.08rem;font-weight:900}
.mj-cf-card p{margin:0 0 18px;color:#cbd5e1;font-size:.86rem;line-height:1.5}
.mj-cf-act{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mj-cf-act button{min-height:46px;border-radius:14px;border:1px solid #ffffff25;color:#fff;background:#252b48;font:800 .86rem Inter,system-ui,sans-serif;cursor:pointer}
.mj-cf-act button.ok{background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-color:#c4b5fd}
.mj-cf-act button.ok.danger{background:linear-gradient(135deg,#ef4444,#b91c1c);border-color:#fb7185}
.mj-cf-act button:active{transform:scale(.97)}
@keyframes mjFade{from{opacity:0}to{opacity:1}}
.mj-toast{position:fixed;left:50%;bottom:calc(40px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:1000020;
  padding:11px 20px;border-radius:99px;background:#111631;border:1px solid #a78bfa;color:#fff;font:800 .85rem Inter,system-ui,sans-serif;box-shadow:0 10px 30px #000c;max-width:90vw;text-align:center}

/* ---- Likes ---- */
.gx-likes{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px;min-height:34px}
.mj-lk-n{font:800 .9rem Inter,system-ui,sans-serif;color:#fecdd3}
.mj-lk-n b{color:#fff}
.mj-lk-b{padding:8px 14px;border-radius:99px;border:1px solid #fb718566;background:#ffffff10;color:#fecdd3;font:800 .76rem Inter,system-ui,sans-serif;cursor:pointer}
.mj-lk-b.on{background:linear-gradient(135deg,#fb7185,#e11d48);color:#fff;border-color:#fecdd3}
.mj-lk-b:disabled{opacity:.5}
`;
  const st = document.createElement("style");
  st.id = "gx-mejoras-css";
  st.textContent = css;
  document.head.appendChild(st);

  /* ============================================================
     CAMBIO 5: modal de confirmación (Aceptar / Cancelar)
     window.GXConfirm({title,text,ok,danger}) -> Promise<boolean>
     ============================================================ */
  let cfOpen = false;
  window.GXConfirm = function (o) {
    o = o || {};
    if (window.__gxSkipConfirm) { window.__gxSkipConfirm = false; return Promise.resolve(true); }
    if (cfOpen) return Promise.resolve(false);
    cfOpen = true;
    return new Promise(res => {
      const d = document.createElement("div");
      d.className = "mj-cf";
      d.innerHTML = `<div class="mj-cf-card" role="dialog" aria-modal="true">
        <div class="mj-cf-ico">${o.danger ? "⚠️" : "❔"}</div>
        <h3>${esc(T(o.title || "¿Seguro?"))}</h3>
        <p>${esc(T(o.text || ""))}</p>
        <div class="mj-cf-act">
          <button type="button" data-r="0">${esc(T("Cancelar"))}</button>
          <button type="button" class="ok ${o.danger ? "danger" : ""}" data-r="1">${esc(T(o.ok || "Aceptar"))}</button>
        </div></div>`;
      let done = false;
      const fin = v => {
        if (done) return;
        done = true;
        document.removeEventListener("keydown", onKey, true);
        d.remove(); cfOpen = false; res(v);
      };
      const onKey = e => { if (e.key === "Escape") fin(false); };
      d.addEventListener("click", e => {
        const b = e.target.closest("[data-r]");
        if (b) fin(b.dataset.r === "1");
        else if (e.target === d) fin(false);
      });
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(d);
    });
  };

  /* ============================================================
     CAMBIO 1: idiomas (estructura escalable)
     Para añadir un idioma: agrega su código a LANGS (index.html),
     a loadLang(), y una tabla [español, traducción] como FR_ROWS.
     Lo que falte cae al inglés, nunca queda en español.
     ============================================================ */
  const FR_ROWS = [
    ["El clásico juego de mesa, llevado a una experiencia moderna para compartir y competir.", "Le jeu de société classique, dans une expérience moderne pour partager et se mesurer."],
    ["NUEVA PARTIDA", "NOUVELLE PARTIE"], ["¿Cómo quieres jugar?", "Comment veux-tu jouer ?"],
    ["Elige una modalidad para comenzar.", "Choisis un mode pour commencer."], ["Jugar local", "Jouer en local"], ["Contra bot", "Contre le bot"],
    ["PARTIDA LOCAL", "PARTIE LOCALE"], ["ELIGE TU", "CHOISIS TA"], ["MESA.", "TABLE."],
    ["Decide cuántas personas participarán en esta partida.", "Décide combien de personnes joueront."],
    ["JUGADORES", "JOUEURS"], ["¿Cuántos juegan?", "Combien de joueurs ?"], ["Puedes cambiarlo para cada partida.", "Tu peux le changer à chaque partie."],
    ["DUELO", "DUEL"], ["TRÍO", "TRIO"], ["MESA COMPLETA", "TABLE PLEINE"], ["← Volver", "← Retour"], ["Continuar →", "Continuer →"],
    ["MODO BOT", "MODE BOT"], ["CONTRA", "CONTRE"], ["IA.", "L'IA."], ["RIVALES", "RIVAUX"], ["¿Cuántos bots?", "Combien de bots ?"],
    ["PERSONALIZAR", "PERSONNALISER"], ["PONGAN SUS", "CHOISISSEZ VOS"], ["NOMBRES.", "NOMS."], ["Nombre de cada ficha", "Nom de chaque pion"],
    ["Nombre", "Nom"], ["🎲 Comenzar partida", "🎲 Lancer la partie"], ["TU FICHA", "TON PION"], ["COLOR.", "COULEUR."], ["Tu color", "Ta couleur"],
    ["Seleccionado", "Sélectionné"], ["Elegir", "Choisir"], ["Tu nombre", "Ton nom"], ["🤖 Comenzar", "🤖 Commencer"],
    ["Turno del bot.", "Tour du bot."], ["Tu turno.", "À ton tour."], ["Turno actual", "Tour actuel"], ["Lanzando…", "Lancement…"],
    ["Elige una ficha", "Choisis un pion"], ["Lanzar dado", "Lancer le dé"], ["CASA", "MAISON"], ["TABLERO", "PLATEAU"], ["META", "ARRIVÉE"],
    ["Lanza el dado para comenzar. Un seis saca una ficha de casa.", "Lance le dé pour commencer. Un six sort un pion de la maison."],
    ["Tu turno. Lanza el dado para comenzar.", "À ton tour. Lance le dé pour commencer."], ["Tu turno. Lanza el dado.", "À ton tour. Lance le dé."],
    ["El dado está rodando…", "Le dé roule…"], ["Una ficha puede moverse. Tócala para jugar.", "Un pion peut bouger. Touche-le pour jouer."],
    ["Elige una ficha iluminada.", "Choisis un pion en surbrillance."], ["Moviendo ficha…", "Déplacement du pion…"],
    ["¡Captura! Tienes otro turno.", "Capture ! Tu rejoues."], ["🏁 ¡Ficha en la meta! Tienes otro turno.", "🏁 Pion à l'arrivée ! Tu rejoues."],
    ["¡Un seis! Tienes otro turno.", "Un six ! Tu rejoues."],
    ["Configuración", "Paramètres"], ["Sonido", "Son"], ["Música", "Musique"], ["Idioma", "Langue"], ["Efectos activados", "Effets activés"],
    ["Efectos desactivados", "Effets désactivés"], ["Música de fondo activada", "Musique de fond activée"], ["Música de fondo desactivada", "Musique de fond désactivée"],
    ["Nueva partida", "Nouvelle partie"], ["Reiniciar con los mismos jugadores", "Recommencer avec les mêmes joueurs"],
    ["Salir al menú", "Quitter vers le menu"], ["Volver a la pantalla inicial", "Retour à l'écran d'accueil"], ["Cómo jugar", "Comment jouer"],
    ["Reglas y funcionamiento", "Règles et fonctionnement"], ["Acerca de este juego", "À propos du jeu"],
    ["Conoce el proyecto y su creador", "Découvre le projet et son créateur"], ["Activado", "Activé"], ["Desactivado", "Désactivé"],
    ["Lanza el dado", "Lance le dé"], ["Tira el dado cuando sea tu turno y mueve una ficha según el número obtenido.", "Lance le dé à ton tour et déplace un pion selon le résultat."],
    ["Saca una ficha", "Sors un pion"], ["Necesitas sacar un 6 para sacar una ficha de casa y colocarla en la casilla inicial.", "Il faut un 6 pour sortir un pion de la maison et le placer sur la case de départ."],
    ["Captura fichas", "Capture des pions"], ["Si caes sobre una ficha rival en una casilla válida, la capturas y vuelve a su casa.", "Si tu tombes sur un pion adverse sur une case valide, tu le captures et il retourne à sa maison."],
    ["Casillas seguras", "Cases sûres"], ["Algunas casillas protegen las fichas y evitan que puedan ser capturadas.", "Certaines cases protègent les pions et empêchent leur capture."],
    ["Llega a la meta", "Atteins l'arrivée"], ["Lleva tus fichas hasta el centro del tablero para completar el recorrido.", "Amène tes pions au centre du plateau pour finir le parcours."],
    ["Un clásico juego de mesa reinventado como una experiencia digital moderna, sencilla y divertida.", "Un jeu de société classique réinventé en expérience numérique moderne, simple et amusante."],
    ["CREADOR", "CRÉATEUR"], ["CREADO CON", "CRÉÉ AVEC"], ["GREYX LUDO · PROYECTO INDEPENDIENTE", "GREYX LUDO · PROJET INDÉPENDANT"],
    ["¡Podio final!", "Podium final !"], ["La partida terminó. Estos son los puestos:", "La partie est terminée. Voici le classement :"],
    ["Configurar", "Configurer"], ["Jugar otra vez", "Rejouer"], ["¡Las 4 fichas llegaron!", "Les 4 pions sont arrivés !"],
    ["CARGANDO", "CHARGEMENT"], ["TOCA PARA ENTRAR", "TOUCHE POUR ENTRER"], ["TODO LISTO PARA JUGAR", "PRÊT À JOUER"],
    ["ELIGE TU DESAFÍO", "CHOISIS TON DÉFI"], ["RETO IA", "DÉFI IA"], ["MODO ONLINE", "MODE EN LIGNE"], ["TU PROGRESO", "TA PROGRESSION"],
    ["Iniciar sesión", "Se connecter"], ["Crear cuenta", "Créer un compte"], ["Entrar", "Entrer"], ["Correo electrónico", "E-mail"],
    ["Contraseña", "Mot de passe"], ["Jugar sin cuenta", "Jouer sans compte"], ["Cerrar sesión", "Se déconnecter"],
    ["Iniciar sesión o crear cuenta", "Se connecter ou créer un compte"], ["¿Olvidaste tu contraseña?", "Mot de passe oublié ?"],
    ["Ya tengo cuenta", "J'ai déjà un compte"]
  ];
  const FR_PATTERNS = [
    "Joueur $1 · à toi de jouer", "$1 TON TOUR · $2", "🤖 TOUR DE $1", "Tour de $1. Le bot réfléchit…",
    "$1 lance le dé…", "Aucun coup valide pour $1.", "$1 choisit un pion…", "Partie incroyable, $1 !", "$1 gagne !"
  ];

  // [español, inglés, portugués, francés] — textos de menú, correo, pausa, confirmaciones y likes
  const ROWS = [
    ["Inicio", "Home", "Início", "Accueil"], ["Amigos", "Friends", "Amigos", "Amis"], ["Ranking", "Ranking", "Ranking", "Classement"],
    ["Perfil", "Profile", "Perfil", "Profil"], ["PARTIDAS", "GAMES", "PARTIDAS", "PARTIES"], ["VICTORIAS", "WINS", "VITÓRIAS", "VICTOIRES"],
    ["Correo", "Mail", "Correio", "Courrier"], ["Tu correo está vacío", "Your mailbox is empty", "Seu correio está vazio", "Ta boîte est vide"],
    ["Aquí llegarán los mensajes y recompensas del equipo.", "Messages and rewards from the team will arrive here.", "As mensagens e recompensas da equipe chegarão aqui.", "Les messages et récompenses de l'équipe arriveront ici."],
    ["Reclamar recompensa", "Claim reward", "Resgatar recompensa", "Récupérer la récompense"],
    ["Recompensa reclamada ✓", "Reward claimed ✓", "Recompensa resgatada ✓", "Récompense récupérée ✓"],
    ["Sin reclamar", "Unclaimed", "Não resgatada", "Non récupérée"], ["Seleccionar todos", "Select all", "Selecionar todos", "Tout sélectionner"],
    ["Desmarcar todos", "Deselect all", "Desmarcar todos", "Tout désélectionner"], ["Eliminar seleccionados", "Delete selected", "Excluir selecionados", "Supprimer la sélection"],
    ["Borrar todo", "Delete all", "Apagar tudo", "Tout effacer"], ["Cancelar", "Cancel", "Cancelar", "Annuler"], ["Aceptar", "Accept", "Aceitar", "Accepter"],
    ["Eliminando…", "Deleting…", "Excluindo…", "Suppression…"],
    ["PAUSA", "PAUSED", "PAUSA", "PAUSE"], ["La partida está detenida.", "The game is on hold.", "A partida está parada.", "La partie est en pause."],
    ["Reanudar", "Resume", "Continuar", "Reprendre"], ["Salir", "Exit", "Sair", "Quitter"], ["¿Nueva partida?", "New game?", "Nova partida?", "Nouvelle partie ?"],
    ["Se reiniciará con los mismos jugadores.", "It will restart with the same players.", "Será reiniciada com os mesmos jogadores.", "Elle redémarrera avec les mêmes joueurs."],
    ["¿Salir al menú?", "Exit to menu?", "Sair para o menu?", "Quitter vers le menu ?"],
    ["Se reiniciará la partida con los mismos jugadores.", "The game will restart with the same players.", "A partida será reiniciada com os mesmos jogadores.", "La partie redémarrera avec les mêmes joueurs."],
    ["¿Cerrar sesión?", "Sign out?", "Sair da conta?", "Se déconnecter ?"],
    ["Saldrás de tu cuenta en este dispositivo.", "You will sign out of your account on this device.", "Você sairá da sua conta neste dispositivo.", "Tu seras déconnecté de ton compte sur cet appareil."],
    ["Cerrar sala", "Close room", "Fechar sala", "Fermer le salon"], ["¿Cerrar la sala para todos?", "Close the room for everyone?", "Fechar a sala para todos?", "Fermer le salon pour tous ?"],
    ["Salir de la sala", "Leave room", "Sair da sala", "Quitter le salon"], ["¿Salir de la sala?", "Leave the room?", "Sair da sala?", "Quitter le salon ?"],
    ["Borrar idea", "Delete idea", "Excluir ideia", "Supprimer l'idée"], ["¿Borrar esta idea? No se puede deshacer.", "Delete this idea? This can't be undone.", "Excluir esta ideia? Não dá para desfazer.", "Supprimer cette idée ? Irréversible."],
    ["Dar like", "Like", "Curtir", "J'aime"], ["Quitar like", "Remove like", "Remover curtida", "Retirer le j'aime"]
  ];

  function installLang() {
    const x = G();
    if (!x || !x.DICT || !x.LANGS) return;
    if (!x.LANGS.fr) x.LANGS.fr = "Français";
    x.DICT.fr = x.DICT.fr || {};
    FR_ROWS.forEach(([es, fr]) => { x.DICT.fr[es] = fr; });
    ROWS.forEach(([es, en, pt, fr]) => { x.DICT.en[es] = en; x.DICT.pt[es] = pt; x.DICT.fr[es] = fr; });
    (x.PATTERNS || []).forEach((p, i) => { p[1].fr = FR_PATTERNS[i] || p[1].en; });
  }
  installLang();

  // Traduce las pantallas que no pasan por render() (menú, correo, pausa, ranking, salas…)
  const SEL = ".gx6,.gx6-nav,.gx-mail,.gxp-ov,#gxx,#gxRank,.rm,#gxRoom,.inv,.mj-cf,.gx-warn,.gx-toast2";
  let lastLang = "es", qLang = false;
  function txNode(n, L) {
    const cur = n.nodeValue;
    let src;
    if (n.__tr !== undefined && cur === n.__tr) src = n.__es;
    else { src = cur; n.__es = undefined; n.__tr = undefined; }
    if (L === "es") {
      if (src !== cur) n.nodeValue = src;
      n.__es = undefined; n.__tr = undefined;
      return;
    }
    const x = G();
    const r = x && x.translateText ? x.translateText(src, L) : null;
    if (r !== null && r !== cur) { n.__es = src; n.__tr = r; n.nodeValue = r; }
  }
  function passAll() {
    const L = lang();
    document.querySelectorAll(SEL).forEach(root => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) txNode(n, L);
    });
    lastLang = L;
  }
  new MutationObserver(() => {
    if (lang() === "es" && lastLang === "es") return;
    if (qLang) return;
    qLang = true;
    requestAnimationFrame(() => { qLang = false; passAll(); });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  /* ============================================================
     CAMBIO 7: likes (likes/{to_from} + likeCounts/{to})
     ============================================================ */
  const LK = { cache: new Map(), busy: new Set() };

  async function fetchLike(uid) {
    const x = G();
    if (!x || !x.fb || !x.fb.db || !x.state.user) return null;
    const c = LK.cache.get(uid);
    if (c && Date.now() - c.at < 60000) return c;
    const fs = await x.fsModule(), db = x.fb.db, me = x.state.user.uid;
    const [cs, ls] = await Promise.all([
      fs.getDoc(fs.doc(db, "likeCounts", uid)).catch(() => null),
      uid === me ? Promise.resolve(null) : fs.getDoc(fs.doc(db, "likes", uid + "_" + me)).catch(() => null)
    ]);
    const v = { n: cs && cs.exists() ? (cs.data().n || 0) : 0, mine: !!(ls && ls.exists()), at: Date.now() };
    LK.cache.set(uid, v);
    return v;
  }

  function paintLike(el, v) {
    const x = G();
    const me = x && x.state.user ? x.state.user.uid : null;
    const uid = el.dataset.uid;
    const btn = (!me || uid === me) ? "" :
      `<button type="button" class="mj-lk-b ${v.mine ? "on" : ""}" data-lk="${esc(uid)}" ${LK.busy.has(uid) ? "disabled" : ""}>${esc(v.mine ? T("Quitar like") : T("Dar like"))}</button>`;
    el.innerHTML = `<span class="mj-lk-n">❤️ <b>${v.n}</b> likes</span>${btn}`;
  }

  function repaintLike(uid) {
    const v = LK.cache.get(uid);
    if (!v) return;
    document.querySelectorAll(".gx-likes").forEach(el => { if (el.dataset.uid === uid) paintLike(el, v); });
  }

  function scanLikes() {
    document.querySelectorAll(".gx-likes:not([data-lk-done])").forEach(el => {
      el.dataset.lkDone = "1";
      const uid = el.dataset.uid;
      if (!uid) return;
      const c = LK.cache.get(uid);
      if (c) paintLike(el, c);
      fetchLike(uid).then(v => { if (v) paintLike(el, v); }).catch(() => {});
    });
  }
  let qLike = false;
  new MutationObserver(() => {
    if (qLike) return;
    qLike = true;
    requestAnimationFrame(() => { qLike = false; scanLikes(); });
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener("click", async e => {
    const b = e.target.closest && e.target.closest("[data-lk]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const x = G();
    const uid = b.dataset.lk;
    if (!x || !x.state.user || !x.fb || !x.fb.db || LK.busy.has(uid)) return;
    const me = x.state.user.uid;
    if (uid === me) return;
    LK.busy.add(uid);
    repaintLike(uid);
    try {
      const fs = await x.fsModule(), db = x.fb.db;
      const lref = fs.doc(db, "likes", uid + "_" + me);
      const cref = fs.doc(db, "likeCounts", uid);
      let liked = false, total = 0;
      await fs.runTransaction(db, async tx => {
        const l = await tx.get(lref);
        const c = await tx.get(cref);
        const n = c.exists() ? (c.data().n || 0) : 0;
        if (l.exists()) {
          if (n < 1) throw new Error("count");
          tx.delete(lref);
          tx.set(cref, { n: n - 1 });
          liked = false; total = n - 1;
        } else {
          tx.set(lref, { from: me, to: uid, at: fs.serverTimestamp() });
          tx.set(cref, { n: n + 1 });
          liked = true; total = n + 1;
        }
      });
      LK.cache.set(uid, { n: total, mine: liked, at: Date.now() });
    } catch (err) {
      console.warn("like", err);
      toast(err && err.code === "permission-denied" ? "No se pudo (revisa las reglas de Firebase)." : "No se pudo completar. Intenta de nuevo.");
    } finally {
      LK.busy.delete(uid);
      if (!LK.cache.get(uid)) LK.cache.set(uid, { n: 0, mine: false, at: 0 });
      repaintLike(uid);
    }
  });

  /* ============================================================
     CAMBIO 6: correo desde el panel de administración
     (lo usa greyx-admin.js con las ediciones del .md)
     ============================================================ */
  const MA = { q: "", found: null, type: "message", title: "", body: "", xp: 0, tr: 0, step: "form", msg: "", ok: false, busy: false, nonce: "" };
  const $i = id => document.getElementById(id);

  function maGrab() {
    if ($i("mjQ")) MA.q = $i("mjQ").value;
    if ($i("mjT")) MA.title = $i("mjT").value;
    if ($i("mjB")) MA.body = $i("mjB").value;
    if ($i("mjX")) MA.xp = Math.max(0, parseInt($i("mjX").value, 10) || 0);
    if ($i("mjR")) MA.tr = Math.max(0, parseInt($i("mjR").value, 10) || 0);
  }
  const maTitle = () => (MA.type === "announce" && !/^📢/.test(MA.title) ? "📢 " + MA.title : MA.title).trim().slice(0, 60);

  function maHtml(o) {
    o = o || {};
    const msg = MA.msg ? `<p class="gxa-msg ${MA.ok ? "ok" : "err"}">${esc(MA.msg)}</p>` : "";
    if (MA.step === "preview" && MA.found) {
      const rw = MA.type === "reward" ? `<br><small>🎁 +${MA.xp} XP · 🏆 +${MA.tr}</small>` : "";
      return msg + `
        <div class="gxa-card">
          <h3>Revisar correo</h3>
          <p>Para: <b>@${esc(MA.found.username)}</b> · tipo: <b>${esc(MA.type === "reward" ? "Recompensa" : MA.type === "announce" ? "Anuncio oficial" : "Mensaje")}</b></p>
          <div class="gxa-log"><b>${esc(maTitle())}</b>${esc(MA.body)}${rw}</div>
          <div class="gxa-row">
            <button class="gxa-btn ghost" data-a="m-edit" type="button">Editar</button>
            <button class="gxa-btn" data-a="m-send" type="button" ${MA.busy ? "disabled" : ""}>${MA.busy ? "Enviando…" : "Enviar"}</button>
          </div>
        </div>`;
    }
    const types = [["message", "Mensaje"], ["announce", "Anuncio"]];
    if (o.isOwner) types.push(["reward", "Recompensa"]);
    const seg = types.map(([k, n]) => `<button type="button" data-a="m-type" data-v="${k}" class="${MA.type === k ? "on" : ""}">${n}</button>`).join("");
    const rewardBox = MA.type === "reward" ? `
      <span class="gxa-lbl">Recompensa</span>
      <div class="gxa-row">
        <input id="mjX" type="number" min="0" max="100000" inputmode="numeric" placeholder="XP" value="${MA.xp || ""}">
        <input id="mjR" type="number" min="0" max="1000" inputmode="numeric" placeholder="Trofeos" value="${MA.tr || ""}">
      </div>` : "";
    return msg + `
      <div class="gxa-card">
        <h3>Enviar correo</h3>
        <p>Mensajes y recompensas. Las sanciones se aplican desde Jugadores, no por correo.</p>
        <div class="gxa-row">
          <input id="mjQ" type="text" placeholder="@usuario o UID" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(MA.q)}">
          <button class="gxa-btn" data-a="m-find" type="button">Buscar</button>
        </div>
        ${MA.found ? `<div class="gxa-status info" style="margin-top:10px">@${esc(MA.found.username)} · ${esc(MA.found.uid)}</div>` : ""}
        <span class="gxa-lbl">Tipo</span>
        <div class="gxa-seg" style="margin-top:0">${seg}</div>
        <input id="mjT" type="text" maxlength="60" placeholder="Título" value="${esc(MA.title)}">
        <textarea id="mjB" maxlength="600" placeholder="Mensaje (hasta 600 caracteres)">${esc(MA.body)}</textarea>
        ${rewardBox}
        <div style="height:12px"></div>
        <button class="gxa-btn" data-a="m-review" type="button">Revisar antes de enviar</button>
      </div>`;
  }

  async function maAct(a, b, api) {
    maGrab();
    if (a === "m-type") { MA.type = b.dataset.v; MA.msg = ""; return api.draw(); }
    if (a === "m-edit") { MA.step = "form"; MA.msg = ""; return api.draw(); }

    if (a === "m-find") {
      MA.msg = ""; MA.ok = false;
      const raw = MA.q.trim().replace(/^@+/, "");
      if (!raw) { MA.msg = "Escribe un usuario o un UID."; return api.draw(); }
      try {
        const { fs, db } = await api.ctx();
        let f = null;
        const n = await fs.getDoc(fs.doc(db, "usernames", raw.toLowerCase())).catch(() => null);
        if (n && n.exists()) f = { uid: n.data().uid, username: n.data().username || raw };
        else if (raw.length >= 20) {
          const p = await fs.getDoc(fs.doc(db, "publicProfiles", raw)).catch(() => null);
          if (p && p.exists()) f = { uid: raw, username: p.data().username || "jugador" };
        }
        MA.found = f;
        if (!f) MA.msg = "No se encontró ese jugador.";
      } catch (e) { MA.msg = "No se pudo buscar (" + (e.code || "error") + ")."; }
      return api.draw();
    }

    if (a === "m-review") {
      MA.ok = false; MA.msg = "";
      if (!MA.found) MA.msg = "Busca y selecciona primero un jugador.";
      else if (!MA.title.trim() || !MA.body.trim()) MA.msg = "Completa el título y el mensaje.";
      else if (MA.type === "reward") {
        if (!api.isOwner) MA.msg = "Solo el owner puede enviar recompensas.";
        else if (!MA.xp && !MA.tr) MA.msg = "Pon al menos XP o trofeos.";
        else if (MA.xp > 100000 || MA.tr > 1000) MA.msg = "Máximo 100000 XP y 1000 trofeos.";
      }
      if (MA.msg) return api.draw();
      const arr = new Uint8Array(10); crypto.getRandomValues(arr);
      MA.nonce = "m" + Array.from(arr, x => x.toString(16).padStart(2, "0")).join("");
      MA.step = "preview";
      return api.draw();
    }

    if (a === "m-send") {
      if (MA.busy || !MA.found) return;
      MA.busy = true; MA.msg = ""; api.draw();
      try {
        const { g, fs, db, uid } = await api.ctx();
        const isR = MA.type === "reward";
        const title = maTitle();
        const batch = fs.writeBatch(db);
        // El ID sale de la revisión: un segundo envío sería una actualización y las reglas lo rechazan
        batch.set(fs.doc(db, "users", MA.found.uid, "mail", MA.nonce), {
          type: isR ? "reward" : "message",
          title, body: MA.body.trim(),
          reward: isR ? { xp: MA.xp, trophies: MA.tr } : null,
          read: false, claimed: false, ack: false, from: "admin",
          createdAt: fs.serverTimestamp()
        });
        api.logAction(batch, fs, db, g, uid, {
          action: "mail", target: MA.found.uid, targetName: MA.found.username,
          reason: ("Correo: " + title).slice(0, 200),
          change: isR ? "reward xp " + MA.xp + " · trofeos " + MA.tr : MA.type
        });
        await batch.commit();
        const who = MA.found.username;
        Object.assign(MA, { found: null, q: "", title: "", body: "", xp: 0, tr: 0, step: "form", nonce: "", ok: true, msg: "✓ Correo enviado a @" + who });
      } catch (e) {
        console.warn("mail send", e);
        MA.step = "form"; MA.ok = false;
        MA.msg = e && e.code === "permission-denied"
          ? "Las reglas rechazaron el envío. ¿Publicaste las reglas nuevas? (las recompensas solo las envía el owner)"
          : "No se pudo enviar (" + ((e && e.code) || "error") + ").";
      }
      MA.busy = false;
      return api.draw();
    }
  }

  window.GXMailAdmin = { html: maHtml, grab: maGrab, act: maAct };
})();
