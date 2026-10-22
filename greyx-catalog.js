/* GREYX — CATÁLOGO (logros, objetos, hitos). Cambia premios/requisitos AQUÍ.
   Si cambias una condición, regenera y vuelve a publicar firestore.rules
   (las reglas son las que realmente validan en el servidor). */
(function (g) {
  const RARITY = {
    common:    { n: "Común",          c: "#9aa3b8" },
    uncommon:  { n: "Poco común",     c: "#4ade80" },
    rare:      { n: "Raro",           c: "#38bdf8" },
    epic:      { n: "Épico",          c: "#c084fc" },
    legendary: { n: "Legendario",     c: "#D9A928" },
    exclusive: { n: "Exclusivo GREYX", c: "#7C3AED" }
  };

  const CATS = [
    ["first", "Primeros pasos"], ["wins", "Victorias"], ["played", "Partidas jugadas"],
    ["mastery", "Dominio del tablero"], ["progress", "Progreso y niveles"],
    ["social", "Amigos y social"], ["special", "Desafíos especiales"],
    ["secret", "Secretos"], ["collector", "Coleccionista"], ["season", "Temporada"]
  ];

  // cond: {k:'wins',v:10} | {k:'xp',v:730,lvl:10} | {k:'own',ids:[...]}
  const ITEMS = [
    // --- Hitos de nivel (reclamables) ---
    { id: "frame_lv10",  type: "frame", name: "Marco Plata Greyx",   rarity: "uncommon",  vis: ["#e5e7eb", "#94a3b8"], how: "Nivel 10",  cond: { k: "xp", v: 730,    lvl: 10 } },
    { id: "bg_lv20",     type: "bg",    name: "Fondo Aurora",        rarity: "rare",      vis: ["#0f766e", "#4c1d95"], how: "Nivel 20",  cond: { k: "xp", v: 4520,   lvl: 20 } },
    { id: "title_lv30",  type: "title", name: "Estratega",           rarity: "rare",                                    how: "Nivel 30",  cond: { k: "xp", v: 15310,  lvl: 30 } },
    { id: "frame_lv40",  type: "frame", name: "Marco Coleccionista", rarity: "epic",      vis: ["#A78BFA", "#22d3ee"], how: "Nivel 40",  cond: { k: "xp", v: 37100,  lvl: 40 } },
    { id: "bg_lv50",     type: "bg",    name: "Fondo Nebulosa",      rarity: "epic",      vis: ["#7C3AED", "#11132E"], how: "Nivel 50",  cond: { k: "xp", v: 73890,  lvl: 50 } },
    { id: "title_lv60",  type: "title", name: "Veterano",            rarity: "epic",                                    how: "Nivel 60",  cond: { k: "xp", v: 129680, lvl: 60 } },
    { id: "frame_lv70",  type: "frame", name: "Marco Legendario",    rarity: "legendary", vis: ["#D9A928", "#f97316"], how: "Nivel 70",  cond: { k: "xp", v: 208470, lvl: 70 } },
    { id: "bg_lv80",     type: "bg",    name: "Fondo Legendario",    rarity: "legendary", vis: ["#b45309", "#D9A928"], how: "Nivel 80",  cond: { k: "xp", v: 314260, lvl: 80 } },
    { id: "fx_lv90",     type: "fx",    name: "Aura Violeta",        rarity: "legendary", vis: "fx-aura",              how: "Nivel 90",  cond: { k: "xp", v: 451050, lvl: 90 } },
    { id: "frame_lv100", type: "frame", name: "Corona Greyx",        rarity: "exclusive", vis: ["#fde68a", "#7C3AED"], how: "Nivel 100", cond: { k: "xp", v: 622840, lvl: 100 } },
    { id: "title_lv100", type: "title", name: "Leyenda Greyx",       rarity: "exclusive",                               how: "Nivel 100", cond: { k: "xp", v: 622840, lvl: 100 } },
    // --- Objetos por logros (automáticos) ---
    { id: "title_novato",   type: "title", name: "Novato",            rarity: "common",   how: "Logro: Bienvenido",  cond: { k: "played", v: 1 } },
    { id: "title_campeon",  type: "title", name: "Campeón",           rarity: "rare",     how: "Logro: Campeón",     cond: { k: "wins", v: 50 } },
    { id: "title_cazador",  type: "title", name: "Cazador",           rarity: "uncommon", how: "Logro: Cazador",     cond: { k: "captures", v: 100 } },
    { id: "frame_racha",    type: "frame", name: "Marco Racha",       rarity: "rare",     vis: ["#fb7185", "#f97316"], how: "Logro: En racha",   cond: { k: "bestStreak", v: 5 } },
    { id: "bg_veterano",    type: "bg",    name: "Fondo Veterano",    rarity: "rare",     vis: ["#1e3a8a", "#0ea5e9"], how: "Logro: Veterano",   cond: { k: "played", v: 100 } },
    { id: "fx_chispas",     type: "fx",    name: "Chispas Doradas",   rarity: "epic",     vis: "fx-spark",            how: "Logro: Centenario", cond: { k: "wins", v: 100 } },
    { id: "frame_trofeo",   type: "frame", name: "Marco Trofeo",      rarity: "epic",     vis: ["#D9A928", "#fde68a"], how: "Logro: Cazatrofeos", cond: { k: "trophies", v: 500 } }
  ];

  const ACH = [
    { id: "first_game",  cat: "first",    icon: "🎲", name: "Bienvenido",      desc: "Completa tu primera partida válida.", rarity: "common",   cond: { k: "played", v: 1 },   reward: "title_novato" },
    { id: "first_win",   cat: "first",    icon: "🥇", name: "Primera victoria", desc: "Gana una partida.",                  rarity: "common",   cond: { k: "wins", v: 1 } },
    { id: "first_cap",   cat: "first",    icon: "💥", name: "Primer golpe",     desc: "Captura una ficha rival.",           rarity: "common",   cond: { k: "captures", v: 1 } },
    { id: "first_goal",  cat: "first",    icon: "🏁", name: "A casa",           desc: "Lleva una ficha a la meta.",         rarity: "common",   cond: { k: "goals", v: 1 } },
    { id: "wins_10",     cat: "wins",     icon: "🏆", name: "Ganador",          desc: "Gana 10 partidas.",                  rarity: "uncommon", cond: { k: "wins", v: 10 } },
    { id: "wins_50",     cat: "wins",     icon: "🏆", name: "Campeón",          desc: "Gana 50 partidas.",                  rarity: "rare",     cond: { k: "wins", v: 50 },  reward: "title_campeon" },
    { id: "wins_100",    cat: "wins",     icon: "👑", name: "Centenario",       desc: "Gana 100 partidas.",                 rarity: "epic",     cond: { k: "wins", v: 100 }, reward: "fx_chispas" },
    { id: "played_10",   cat: "played",   icon: "🎮", name: "Aficionado",       desc: "Juega 10 partidas.",                 rarity: "common",   cond: { k: "played", v: 10 } },
    { id: "played_50",   cat: "played",   icon: "🎮", name: "Habitual",         desc: "Juega 50 partidas.",                 rarity: "uncommon", cond: { k: "played", v: 50 } },
    { id: "played_100",  cat: "played",   icon: "🎖️", name: "Veterano",         desc: "Completa 100 partidas.",             rarity: "rare",     cond: { k: "played", v: 100 }, reward: "bg_veterano" },
    { id: "cap_25",      cat: "mastery",  icon: "⚔️", name: "Rompefichas",      desc: "Captura 25 fichas.",                 rarity: "uncommon", cond: { k: "captures", v: 25 } },
    { id: "cap_100",     cat: "mastery",  icon: "🗡️", name: "Cazador",          desc: "Captura 100 fichas.",                rarity: "rare",     cond: { k: "captures", v: 100 }, reward: "title_cazador" },
    { id: "goal_25",     cat: "mastery",  icon: "🏁", name: "Corredor",         desc: "Lleva 25 fichas a la meta.",         rarity: "uncommon", cond: { k: "goals", v: 25 } },
    { id: "goal_100",    cat: "mastery",  icon: "🚀", name: "Maratonista",      desc: "Lleva 100 fichas a la meta.",        rarity: "rare",     cond: { k: "goals", v: 100 } },
    { id: "lvl_10",      cat: "progress", icon: "⭐", name: "Nivel 10",         desc: "Alcanza el nivel 10.",               rarity: "uncommon", cond: { k: "xp", v: 730, lvl: 10 } },
    { id: "lvl_25",      cat: "progress", icon: "🌟", name: "Nivel 25",         desc: "Alcanza el nivel 25.",               rarity: "rare",     cond: { k: "xp", v: 8790, lvl: 25 } },
    { id: "lvl_50",      cat: "progress", icon: "💫", name: "Nivel 50",         desc: "Alcanza el nivel 50.",               rarity: "epic",     cond: { k: "xp", v: 73890, lvl: 50 } },
    { id: "streak_3",    cat: "special",  icon: "🔥", name: "Calentando",       desc: "Gana 3 partidas seguidas.",          rarity: "uncommon", cond: { k: "bestStreak", v: 3 } },
    { id: "streak_5",    cat: "special",  icon: "🔥", name: "En racha",         desc: "Gana 5 partidas seguidas.",          rarity: "rare",     cond: { k: "bestStreak", v: 5 }, reward: "frame_racha" },
    { id: "trophy_100",  cat: "special",  icon: "🏅", name: "Cien trofeos",     desc: "Llega a 100 trofeos.",               rarity: "uncommon", cond: { k: "trophies", v: 100 } },
    { id: "trophy_500",  cat: "special",  icon: "👑", name: "Cazatrofeos",      desc: "Llega a 500 trofeos.",               rarity: "epic",     cond: { k: "trophies", v: 500 }, reward: "frame_trofeo" },
    { id: "secret_15",   cat: "secret",   icon: "🕶️", name: "Imparable",        desc: "Gana 15 partidas seguidas.",         rarity: "legendary", secret: true, cond: { k: "bestStreak", v: 15 } },
    { id: "coll_1",      cat: "collector", icon: "🧩", name: "Coleccionista I",  desc: "Consigue el Marco Plata, el Fondo Aurora y el título Estratega.", rarity: "rare", cond: { k: "own", ids: ["frame_lv10", "bg_lv20", "title_lv30"] } },
    { id: "coll_2",      cat: "collector", icon: "🧩", name: "Coleccionista II", desc: "Consigue los 4 objetos de logros: Novato, Campeón, Marco Racha y Fondo Veterano.", rarity: "epic", cond: { k: "own", ids: ["title_novato", "title_campeon", "frame_racha", "bg_veterano"] } }
  ];

  // Hitos de nivel: premios agrupados
  const HITOS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(l => ({
    lvl: l, items: ITEMS.filter(i => i.cond.k === "xp" && i.cond.lvl === l).map(i => i.id)
  }));

  const api = { RARITY, CATS, ITEMS, ACH, HITOS };
  g.GreyxCatalog = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
