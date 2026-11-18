/* GREYX LUDO — CATÁLOGO DE LA TIENDA (datos para mostrar en pantalla)
   IMPORTANTE: el PRECIO OFICIAL vive en el servidor (greyx-shop-worker.js, tabla PRODUCTS).
   Aquí el precio solo se muestra; si no coincide con el del servidor, la compra se rechaza. */
(function (g) {
  "use strict";

  const RARITY = {
    common:    { n: "Común",      c: "#9aa3b8" },
    uncommon:  { n: "Poco común", c: "#4ade80" },
    epic:      { n: "Épico",      c: "#c084fc" },
    legendary: { n: "Legendario", c: "#fbbf24" },
    mythic:    { n: "Mítico",     c: "#ff5fd2" },
    special:   { n: "Especial",   c: "#38bdf8" }
  };

  const CATS = [
    { id: "dice",  n: "DADOS",    one: "Dado",    slot: "dice"  },
    { id: "token", n: "FICHAS",   one: "Ficha",   slot: "token" },
    { id: "board", n: "TABLEROS", one: "Tablero", slot: "board" },
    { id: "card",  n: "TARJETAS", one: "Tarjeta", slot: null    }
  ];

  // rl = etiqueta de rareza tal como la escribiste (género según el producto)
  const PRODUCTS = [
    { id: "dice_gold",      cat: "dice",  name: "Dado Dorado",    rarity: "legendary", rl: "Legendario", price: 2500, perm: true,
      desc: "La elegancia está en cada lanzamiento.", design: "Dado metálico dorado, puntos oscuros y bordes brillantes." },
    { id: "dice_crystal",   cat: "dice",  name: "Dado Cristal",   rarity: "epic",      rl: "Épico",      price: 1800, perm: true,
      desc: "Un brillo diferente en cada lanzamiento.", design: "Cristal violeta translúcido con puntos luminosos." },
    { id: "dice_obsidian",  cat: "dice",  name: "Dado Obsidiana", rarity: "epic",      rl: "Épico",      price: 2000, perm: true,
      desc: "Nacido de la oscuridad.", design: "Piedra volcánica negra con grietas luminosas rojizas." },
    { id: "dice_celestial", cat: "dice",  name: "Dado Celestial", rarity: "mythic",    rl: "Mítico",     price: 4000, perm: true,
      desc: "El universo acompaña tu destino.", design: "Dado cósmico con nebulosas y estrellas." },

    { id: "token_imperial", cat: "token", name: "Ficha Imperial", rarity: "legendary", rl: "Legendaria", price: 3000, perm: true,
      desc: "El poder no necesita presentación.", design: "Dorado metálico con detalles reales morados." },
    { id: "token_neon",     cat: "token", name: "Ficha Neón",     rarity: "epic",      rl: "Épica",      price: 1800, perm: true,
      desc: "Haz que tu presencia ilumine el tablero.", design: "Iluminación de neón azul y violeta." },
    { id: "token_eclipse",  cat: "token", name: "Ficha Eclipse",  rarity: "epic",      rl: "Épica",      price: 2000, perm: true,
      desc: "La elegancia también puede ser misteriosa.", design: "Metal negro con reflejos plateados." },
    { id: "token_crystal",  cat: "token", name: "Ficha Cristal",  rarity: "mythic",    rl: "Mítica",     price: 4000, perm: true,
      desc: "Una pieza digna de una colección extraordinaria.", design: "Cristal violeta translúcido." },

    { id: "board_imperial", cat: "board", name: "Tablero Imperial",  rarity: "legendary", rl: "Legendario", price: 5000, perm: true,
      desc: "Donde cada partida se convierte en una conquista.", design: "Mármol oscuro, bordes dorados y detalles reales." },
    { id: "board_neon",     cat: "board", name: "Tablero Neón",      rarity: "epic",      rl: "Épico",      price: 4000, perm: true,
      desc: "El futuro está sobre la mesa.", design: "Superficie futurista con líneas luminosas azules y violetas." },
    { id: "board_sakura",   cat: "board", name: "Tablero Sakura",    rarity: "epic",      rl: "Épico",      price: 3500, perm: true,
      desc: "La tranquilidad también es una forma de poder.", design: "Jardín oriental, flores de cerezo y piedra decorativa." },
    { id: "board_galactic", cat: "board", name: "Tablero Galáctico", rarity: "mythic",    rl: "Mítico",     price: 6000, perm: true,
      desc: "Más allá del tablero, comienza el universo.", design: "Nebulosas, estrellas y superficie cósmica." },

    { id: "card_rename",    cat: "card",  name: "Tarjeta de Renombre", rarity: "special", rl: "Especial", price: 5500, perm: false, kind: "rename",
      desc: "Un nuevo nombre, una nueva identidad.", fn: "Cambia tu nombre de usuario una vez. No caduca mientras no la uses." },
    { id: "card_xp_double", cat: "card",  name: "Tarjeta XP Doble",    rarity: "epic",    rl: "Épica",    price: 3000, perm: false, kind: "boost", mult: 1,   hours: 24,
      desc: "Duplica tu experiencia y acelera tu progreso.", fn: "+100% de experiencia durante 24 horas desde que la activas." },
    { id: "card_xp_extra",  cat: "card",  name: "Tarjeta XP Extra",    rarity: "epic",    rl: "Épica",    price: 1800, perm: false, kind: "boost", mult: 0.5, hours: 24,
      desc: "Cada partida cuenta un poco más.", fn: "+50% de experiencia durante 24 horas desde que la activas." },
    { id: "card_pro",       cat: "card",  name: "Tarjeta Pro",         rarity: "mythic",  rl: "Mítica",   price: 4500, perm: false, kind: "boost", mult: 1,   hours: 24, pro: true,
      desc: "El progreso tiene una categoría superior.", fn: "+100% de experiencia durante 24 horas y presentación visual exclusiva." }
  ];

  const byId = {};
  PRODUCTS.forEach(p => { byId[p.id] = p; });

  g.GXShopCatalog = {
    RARITY, CATS, PRODUCTS, byId,
    get: id => byId[id] || null,
    ofCat: cat => PRODUCTS.filter(p => p.cat === cat),
    DAILY: [50, 75, 100, 125, 150, 200, 300],
    GAME_COINS: { 1: 100, 2: 60, 3: 35, 4: 20 },
    GAME_DAILY_LIMIT: 10,
    SIGNUP_BONUS: 500
  };
  if (typeof module !== "undefined") module.exports = g.GXShopCatalog;
})(typeof window !== "undefined" ? window : globalThis);
