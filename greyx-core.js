(function (global) {
  "use strict";

  const CONFIG = {
    XP_DAILY_CAP: 300,
    XP_REDUCED: 5,
    TROPHY_START: 20,
    REWARDS: {
      2: { 1:{t:20,xp:100}, 2:{t:-8,xp:60} },
      3: { 1:{t:22,xp:100}, 2:{t:5,xp:75}, 3:{t:-8,xp:60} },
      4: { 1:{t:25,xp:100}, 2:{t:15,xp:75}, 3:{t:-5,xp:60}, 4:{t:-10,xp:50} }
    },
    MAX_CAPTURES: 40,
    MAX_GOALS: 4,
    MIN_GAME_MS: 60000,
    TZ_OFFSET_MS: -4 * 3600000
  };

  const ZERO = {
    played: 0, wins: 0, losses: 0, captures: 0, goals: 0,
    trophies: 0, streak: 0, bestStreak: 0, xp: 0, xpDayEarned: 0
  };

  const dayOf = ms => Math.floor((ms + CONFIG.TZ_OFFSET_MS) / 86400000);

  function planGame(o, input, sameDay) {
    const r = (CONFIG.REWARDS[input.players] || {})[input.place];
    if (!r) return null;
    const isNew = !o;
    o = Object.assign({}, ZERO, o || {});
    if (isNew) o.trophies = CONFIG.TROPHY_START;

    const won = input.place === 1;
    const earnedBefore = sameDay ? (o.xpDayEarned || 0) : 0;
    const xpGain = earnedBefore >= CONFIG.XP_DAILY_CAP
      ? Math.min(r.xp, CONFIG.XP_REDUCED) : r.xp;
    const streak = won ? o.streak + 1 : 0;

    return {
      played: o.played + 1,
      wins: o.wins + (won ? 1 : 0),
      losses: o.losses + (won ? 0 : 1),
      captures: o.captures + Math.min(Math.max(0, input.captures | 0), CONFIG.MAX_CAPTURES),
      goals: o.goals + Math.min(Math.max(0, input.goals | 0), CONFIG.MAX_GOALS),
      trophies: Math.max(0, o.trophies + r.t),
      streak,
      bestStreak: Math.max(o.bestStreak, streak),
      xp: o.xp + xpGain,
      xpDayEarned: earnedBefore + xpGain
    };
  }

  function publicDoc(profile, s, fs) {
    return {
      username: profile.username,
      usernameLower: profile.usernameLower,
      avatar: profile.avatar,
      xp: s.xp || 0,
      trophies: s.trophies || 0,
      wins: s.wins || 0,
      played: s.played || 0,
      updatedAt: fs.serverTimestamp()
    };
  }

  function validGame(input) {
    return input
      && typeof input.gameId === "string"
      && input.gameId.length >= 8 && input.gameId.length <= 40
      && [2, 3, 4].includes(input.players)
      && input.place >= 1 && input.place <= input.players
      && input.durationMs >= CONFIG.MIN_GAME_MS;
  }

  async function submitGame(ctx) {
    const { fb, fs, uid, profile, gameId } = ctx;
    if (!fb || !fb.db || !uid || !profile) return null;
    if (!validGame(ctx)) return null;

    const ref = fs.doc(fb.db, "stats", uid);
    const pref = fs.doc(fb.db, "publicProfiles", uid);
    const mref = fs.doc(fb.db, "matches", uid + "_" + gameId);

    // Si esta partida ya se procesó, no se entrega nada otra vez
    try { if ((await fs.getDoc(mref)).exists()) return null; } catch (e) {}

    for (let attempt = 0; attempt < 2; attempt++) {
      const snap = await fs.getDoc(ref);
      const old = snap.exists() ? snap.data() : null;
      const lastMs = old && old.updatedAt && old.updatedAt.toMillis
        ? old.updatedAt.toMillis() : 0;
      let same = dayOf(Date.now()) === dayOf(lastMs);
      if (attempt === 1) same = !same;

      const next = planGame(old, ctx, same);
      if (!next) return null;

      const prevT = old ? (old.trophies || 0) : CONFIG.TROPHY_START;
      const prevXp = old ? (old.xp || 0) : 0;
      const xpGranted = next.xp - prevXp;
      const trophyDelta = next.trophies - prevT;

      const batch = fs.writeBatch(fb.db);
      const withTs = Object.assign({}, next, {
        lastGameId: gameId, updatedAt: fs.serverTimestamp()
      });
      if (old) batch.update(ref, withTs); else batch.set(ref, withTs);
      batch.set(pref, publicDoc(profile, next, fs));
      batch.set(mref, {
        uid, gameId, place: ctx.place, players: ctx.players,
        xp: xpGranted, trophyDelta, at: fs.serverTimestamp()
      });

      try {
        await batch.commit();
        return { stats: next, xpGranted, trophyDelta };
      } catch (e) {
        if (e && e.code === "permission-denied" && attempt === 0) continue;
        throw e;
      }
    }
    return null;
  }

  async function syncPublicProfile(ctx) {
    const { fb, fs, uid, profile } = ctx;
    if (!fb || !fb.db || !uid || !profile) return;
    const sSnap = await fs.getDoc(fs.doc(fb.db, "stats", uid));
    const s = Object.assign({}, ZERO, sSnap.exists() ? sSnap.data() : {});
    const pref = fs.doc(fb.db, "publicProfiles", uid);
    const pSnap = await fs.getDoc(pref);
    if (pSnap.exists()) {
      const p = pSnap.data();
      if (p.avatar === profile.avatar && p.xp === s.xp && p.trophies === s.trophies &&
          p.wins === s.wins && p.played === s.played && p.username === profile.username) return;
    }
    await fs.setDoc(pref, publicDoc(profile, s, fs));
  }

  const api = { CONFIG, ZERO, dayOf, planGame, validGame, submitGame, syncPublicProfile };
  global.GreyxCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
