(function (global) {
  "use strict";

  const CONFIG = {
    XP_BY_PLACE: { 1: 60, 2: 40, 3: 20, 4: 0 },
    XP_DAILY_CAP: 300,
    XP_REDUCED: 5,
    TROPHY_BASE: 4,
    TROPHY_PER_BOT: 4,
    TROPHY_LOSS: 3,
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
    o = Object.assign({}, ZERO, o || {});
    const won = input.place === 1;
    const earnedBefore = sameDay ? (o.xpDayEarned || 0) : 0;
    const amount = CONFIG.XP_BY_PLACE[input.place] || 0;
    const xpGain = earnedBefore >= CONFIG.XP_DAILY_CAP
      ? Math.min(amount, CONFIG.XP_REDUCED) : amount;

    const bots = Math.min(3, Math.max(1, input.bots | 0));
    const gain = CONFIG.TROPHY_BASE + CONFIG.TROPHY_PER_BOT * bots;
    const streak = won ? o.streak + 1 : 0;

    return {
      played: o.played + 1,
      wins: o.wins + (won ? 1 : 0),
      losses: o.losses + (won ? 0 : 1),
      captures: o.captures + Math.min(Math.max(0, input.captures | 0), CONFIG.MAX_CAPTURES),
      goals: o.goals + Math.min(Math.max(0, input.goals | 0), CONFIG.MAX_GOALS),
      trophies: won ? o.trophies + gain
                    : (o.trophies > CONFIG.TROPHY_LOSS ? o.trophies - CONFIG.TROPHY_LOSS : 0),
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
    return input && input.place >= 1 && input.place <= 4 &&
      input.durationMs >= CONFIG.MIN_GAME_MS;
  }

  async function submitGame(ctx) {
    const { fb, fs, uid, profile } = ctx;
    if (!fb || !fb.db || !uid || !profile) return null;
    if (!validGame(ctx)) return null;

    const ref = fs.doc(fb.db, "stats", uid);
    const pref = fs.doc(fb.db, "publicProfiles", uid);

    for (let attempt = 0; attempt < 2; attempt++) {
      const snap = await fs.getDoc(ref);
      const old = snap.exists() ? snap.data() : null;
      const lastMs = old && old.updatedAt && old.updatedAt.toMillis
        ? old.updatedAt.toMillis() : 0;
      let same = dayOf(Date.now()) === dayOf(lastMs);
      if (attempt === 1) same = !same;

      const next = planGame(old, ctx, same);
      const batch = fs.writeBatch(fb.db);
      const withTs = Object.assign({}, next, { updatedAt: fs.serverTimestamp() });
      if (old) batch.update(ref, withTs); else batch.set(ref, withTs);
      batch.set(pref, publicDoc(profile, next, fs));

      try {
        await batch.commit();
        const prev = Object.assign({}, ZERO, old || {});
        return {
          stats: next,
          xpGranted: next.xp - prev.xp,
          trophyDelta: next.trophies - prev.trophies
        };
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
