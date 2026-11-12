/* ==========================================================================
   365Scores — مصدر مباشر للترتيب والنتائج (كل الدوريات)
   المصدر: https://www.365scores.com
   الواجهة: https://webws.365scores.com/web  (تدعم CORS)
   ========================================================================== */

const S365_BASE = "https://webws.365scores.com/web";
const S365_LOGO_DIR = "assets/logos/clubs/yemen/";
const S365_THROTTLE = 15 * 1000;
const S365_FRESH = 45 * 1000;
const S365_OFFLINE_MAX = 12 * 60 * 60 * 1000;
const S365_DAY_FRESH = 5 * 60 * 1000;
const S365_TEAM_FRESH = 60 * 60 * 1000;
const S365_SCORERS_FRESH = 60 * 60 * 1000;

/* معرّفات البطولات في 365Scores (مؤكدة) */
const S365_COMPETITIONS = {
  saudi: 649,
  yemen: 5478,
  ucl: 572,
  epl: 7,
  laliga: 11,
  seriea: 17,
  bundesliga: 25,
  ligue1: 35,
  worldcup: 5930,
  egypt: 552,
  algeria: 560,
  uae: 549,
  morocco: 557,
  syria: 564,
  iraq: 6822,
  afcon: 167,
  "asian-cup": 6196,
  "gulf-cup": 5452,
  "arab-cup": 7674,
  "arab-club": 6840,
  "asia-elite": 623,
  "egypt-cup": 553
};

/* شعارات محفوظة داخل التطبيق (تعمل دون اتصال) — الدوري اليمني */
const S365_TEAM_LOGOS = {
  "11492": "shaab-hadramout",
  "78083": "tadamun",
  "95074": "alsadd",
  "11490": "ahli-sanaa",
  "11491": "wahda-sanaa",
  "21867": "fahman",
  "11523": "yarmouk",
  "95076": "mukalla",
  "11496": "oruba",
  "11495": "ittihad-ibb",
  "95077": "ittihad-hadramout",
  "11488": "hilal-hodeidah",
  "78082": "salam-gharfa",
  "95075": "shabab-bayda"
};

function s365CompId(comp) {
  if (!comp) return null;
  const direct = Number(comp.s365);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const mapped = S365_COMPETITIONS[comp.id];
  return mapped || null;
}

function s365State() {
  if (!state.s365) {
    state.s365 = { status: "idle", matches: [], error: null, updatedAt: null, lastAttempt: 0 };
  }
  return state.s365;
}

function s365Timezone() {
  // توقيت مكة المكرمة ثابت في كل الطلبات — لا نعتمد على توقيت الجهاز.
  return "Asia/Riyadh";
}

function s365Url(path, compId, extra = {}) {
  const params = new URLSearchParams({
    appTypeId: "5",
    langId: "27",
    timezoneName: s365Timezone(),
    userCountryId: "0"
  });
  if (compId) params.set("competitions", String(compId));
  Object.keys(extra).forEach((key) => params.set(key, extra[key]));
  return `${S365_BASE}/${path}?${params.toString()}`;
}

/* الشعار: ملف محلي إن وُجد، وإلا صورة المصدر */
function s365TeamLogo(team) {
  if (!team) return "";
  const slug = S365_TEAM_LOGOS[String(team.id)];
  if (slug) return `${S365_LOGO_DIR}${slug}.png`;

  if (typeof clubLogoFor === "function") {
    const local = clubLogoFor({ name: team.name, rawName: team.nameForURL, short: team.shortName });
    if (local) return local;
  }
  if (!team.id) return "";
  return `https://imagecache.365scores.com/image/upload/f_png,w_128,h_128,c_fit/Competitors/${team.id}`;
}

function s365GameStatus(game) {
  const home = game.homeCompetitor || {};
  const away = game.awayCompetitor || {};
  const hasScore = typeof home.score === "number" && home.score >= 0 && typeof away.score === "number" && away.score >= 0;
  const minute = Number(game.gameTime) > 0 ? Number(game.gameTime) : null;
  if (minute) {
    return { short: "LIVE", long: "مباشر الآن", elapsed: minute, live: true, started: true };
  }
  if (hasScore) {
    return { short: "FT", long: "انتهت", elapsed: 90, live: false, started: true };
  }
  return { short: "NS", long: "لم تبدأ", elapsed: null, live: false, started: false };
}

function mapS365Game(game, comp) {
  const status = s365GameStatus(game);
  const home = game.homeCompetitor || {};
  const away = game.awayCompetitor || {};
  const round = game.roundName ? `${game.roundName} ${game.roundNum || ""}`.trim() : "";
  return {
    id: `s365-${game.id}`,
    date: game.startTime,
    timestamp: Math.floor(new Date(game.startTime).getTime() / 1000),
    statusShort: status.short,
    statusLong: status.long,
    elapsed: status.elapsed,
    source: "s365",
    channel: "",
    league: {
      id: comp ? comp.apiId : S365_COMPETITIONS.yemen,
      appId: comp ? comp.id : "yemen",
      name: game.competitionDisplayName || (comp && comp.name) || "بطولة",
      logo: comp ? comp.logo || "" : "",
      country: (comp && comp.country) || "",
      round
    },
    home: {
      id: home.id,
      name: home.name || "الفريق الأول",
      logo: s365TeamLogo(home),
      winner: home.isWinner ? true : undefined
    },
    away: {
      id: away.id,
      name: away.name || "الفريق الثاني",
      logo: s365TeamLogo(away),
      winner: away.isWinner ? true : undefined
    },
    goals: {
      home: status.started ? home.score : null,
      away: status.started ? away.score : null
    },
    venue: (game.venue && game.venue.name) || ""
  };
}

function getS365Matches(compId) {
  const data = s365State();
  const list = data.matches || [];
  if (!compId) return list;
  return list.filter((fixture) => fixture.league && fixture.league.appId === compId);
}

function mergeS365Matches() {
  const dayKey = (value) => String(value || "").slice(0, 10);
  const day = dayKey(state.ui?.matchDay || state.matches?.date);
  const all = s365State().matches || [];
  if (!state.matches) return;
  const extra = day ? all.filter((fixture) => dayKey(fixture.date) === day) : [];
  const current = state.matches.fixtures || [];
  const existing = day ? current.filter((fixture) => dayKey(fixture.date) === day) : current;
  if (!extra.length) {
    if (existing.length !== current.length) state.matches.fixtures = existing;
    return;
  }
  const map = new Map(existing.map((fixture) => [fixture.id, fixture]));
  let changed = existing.length !== current.length;
  extra.forEach((fixture) => {
    const previous = map.get(fixture.id);
    if (!previous) {
      map.set(fixture.id, fixture);
      changed = true;
      return;
    }
    const prevScore = `${previous.goals?.home}:${previous.goals?.away}:${previous.statusShort}`;
    const nextScore = `${fixture.goals?.home}:${fixture.goals?.away}:${fixture.statusShort}`;
    if (prevScore !== nextScore) {
      map.set(fixture.id, fixture);
      changed = true;
    }
  });
  if (!changed) return;
  state.matches.fixtures = [...map.values()];
  if (state.matches.status !== "ready") {
    state.matches.status = "ready";
    state.matches.error = null;
  }
}

async function loadS365Matches(comp, options = {}) {
  const target = comp || { id: "yemen", apiId: S365_COMPETITIONS.yemen, name: "الدوري اليمني الممتاز", country: "اليمن" };
  const compId = s365CompId(target);
  if (!compId) return;

  const data = s365State();
  if (data.status === "loading") return;
  const force = options.force === true;
  if (!force && data.updatedAt && Date.now() - new Date(data.updatedAt).getTime() < S365_FRESH) {
    mergeS365Matches();
    return;
  }
  if (!force && data.lastAttempt && Date.now() - data.lastAttempt < S365_THROTTLE) {
    mergeS365Matches();
    return;
  }

  data.status = "loading";
  data.lastAttempt = Date.now();

  try {
    const response = await fetchWithTimeout(s365Url("games/current/", compId), {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`تعذر الاتصال بمصدر 365Scores (HTTP ${response.status})`);
    const payload = await response.json();
    const games = Array.isArray(payload.games) ? payload.games : [];
    data.matches = games.map((game) => mapS365Game(game, target));
    data.status = "ready";
    data.error = null;
    data.updatedAt = new Date().toISOString();
    mergeS365Matches();
  } catch (error) {
    data.status = "error";
    data.error = error && error.name === "AbortError"
      ? "انتهت مهلة الاتصال بمصدر 365Scores."
      : (error && error.message) || "خطأ غير معروف";
  }
  refreshCurrentScreen();
}

/* --------------------------------------------------------------------------
   الترتيب المباشر
   -------------------------------------------------------------------------- */

/* تحويل معرف فريق 365Scores إلى معرف النادي المحلي إن وُجد */
function s365LocalTeamId(competitorId) {
  const id = Number(competitorId);
  if (!Number.isFinite(id) || id <= 0) return null;
  if (typeof S365_TEAM_IDS !== "undefined") {
    const found = Object.keys(S365_TEAM_IDS).find((key) => Number(S365_TEAM_IDS[key]) === id);
    if (found) return found;
  }
  return null;
}

function s365MapStandingRow(row) {
  const team = row.competitor || {};
  const goalsFor = Number(row.for) || 0;
  const goalsAgainst = Number(row.against) || 0;
  return {
    rank: Number(row.position) || Number(row.rank) || 0,
    name: team.name || "فريق",
    short: team.shortName || "",
    teamId: s365LocalTeamId(team.id) || team.id || null,
    logo: s365TeamLogo(team),
    points: Number(row.points) || 0,
    played: Number(row.gamePlayed) || 0,
    win: Number(row.gamesWon) || 0,
    draw: Number(row.gamesEven) || 0,
    lose: Number(row.gamesLost) || 0,
    goalsFor,
    goalsAgainst,
    goalsDiff: Number.isFinite(Number(row.ratio)) ? Number(row.ratio) : goalsFor - goalsAgainst,
    form: Array.isArray(row.recentForm) ? row.recentForm.slice(-5) : []
  };
}

function s365ReadCache(compId) {
  try {
    const cache = readJSON(KEYS.standingsCache, {});
    return cache && cache[compId] ? cache[compId] : null;
  } catch (error) {
    return null;
  }
}

function s365WriteCache(compId, rows, updatedAt) {
  try {
    const cache = readJSON(KEYS.standingsCache, {});
    cache[compId] = { rows, updatedAt };
    writeJSON(KEYS.standingsCache, cache);
  } catch (error) {
    /* التخزين ممتلئ أو محظور — لا نكسر الشاشة */
  }
}

async function fetchS365Standings(comp, options = {}) {
  if (!comp) return;
  const compId = s365CompId(comp);
  if (!compId) return;

  const current = state.standings[comp.id];
  if (current && current.status === "loading") return;

  const force = options.force === true;
  const now = Date.now();
  if (!force && current && current.status === "ready" && current.updatedAt) {
    if (now - new Date(current.updatedAt).getTime() < S365_FRESH) return;
  }
  if (!force && current && current.status === "error" && current.lastAttempt && now - current.lastAttempt < S365_THROTTLE) {
    return;
  }

  const previousRows = (current && current.rows && current.rows.length) ? current.rows : [];

  if (!previousRows.length) {
    state.standings[comp.id] = {
      status: "loading",
      rows: [],
      error: null,
      source: "365Scores",
      lastAttempt: now
    };
    refreshCurrentScreen();
  }

  try {
    const response = await fetchWithTimeout(
      s365Url("standings/", compId, { live: "true", withSeasons: "true" }),
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) throw new Error(`تعذر الاتصال بمصدر 365Scores (HTTP ${response.status})`);
    const payload = await response.json();
    const table = Array.isArray(payload.standings) ? payload.standings[0] : null;
    const rawRows = (table && table.rows) || [];
    if (!rawRows.length) throw new Error("المصدر لم يُرجع جدولاً لهذا الموسم.");

    const rows = rawRows.map(s365MapStandingRow);
    const updatedAt = new Date().toISOString();

    state.standings[comp.id] = {
      status: "ready",
      rows,
      updatedAt,
      error: null,
      source: "365Scores",
      stale: false,
      seasonNum: table.seasonNum || null,
      lastAttempt: now
    };
    s365WriteCache(comp.id, rows, updatedAt);
  } catch (error) {
    const cached = s365ReadCache(comp.id);
    const cachedAge = cached ? now - new Date(cached.updatedAt).getTime() : Infinity;
    const usableCache = cached && Array.isArray(cached.rows) && cached.rows.length && cachedAge < S365_OFFLINE_MAX;

    if (usableCache) {
      state.standings[comp.id] = {
        status: "ready",
        rows: cached.rows,
        updatedAt: cached.updatedAt,
        error: "تعذر تحديث الترتيب — تُعرض آخر نسخة محفوظة.",
        source: "365Scores",
        stale: true,
        lastAttempt: now
      };
    } else {
      state.standings[comp.id] = {
        status: "error",
        rows: previousRows,
        error: error && error.name === "AbortError"
          ? "انتهت مهلة الاتصال بمصدر 365Scores."
          : (error && error.message) || "خطأ غير معروف",
        source: "365Scores",
        lastAttempt: now
      };
    }
  }
  refreshCurrentScreen();
}

/* تحديث صامت للترتيب (لا يظهر هيكلاً عظمياً) */
function s365RefreshStandingsLive(comp) {
  if (!comp) return;
  const compId = s365CompId(comp);
  if (!compId) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const current = state.standings[comp.id];
  if (current && current.status === "loading") return;
  fetchS365Standings(comp, { force: true });
}

/* --------------------------------------------------------------------------
   التخزين المحلي: أيام + فرق + هدافون (يبقى بعد إعادة التحميل دون اتصال)
   -------------------------------------------------------------------------- */

function s365Store() {
  const stored = readJSON(KEYS.s365, {});
  const store = stored && typeof stored === "object" ? stored : {};
  if (!store.days || typeof store.days !== "object") store.days = {};
  if (!store.teams || typeof store.teams !== "object") store.teams = {};
  if (!store.scorers || typeof store.scorers !== "object") store.scorers = {};
  if (!store.competitors || typeof store.competitors !== "object") store.competitors = {};
  return store;
}

function s365SaveStore(store) {
  try {
    writeJSON(KEYS.s365, store);
  } catch (error) {
    /* التخزين ممتلئ — نكمل بالبيانات في الذاكرة */
  }
}

function s365DayKey(value) {
  const text = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return typeof meccaTodayISO === "function" ? meccaTodayISO() : getTodayISO();
}

function s365DdMmYyyy(dateISO) {
  const parts = s365DayKey(dateISO).split("-");
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function s365CompBy365Id(id) {
  if (!id) return null;
  return (state.data.competitions || []).find((comp) => Number(s365CompId(comp)) === Number(id)) || null;
}

function s365CompactGame(game) {
  const status = s365GameStatus(game);
  const home = game.homeCompetitor || {};
  const away = game.awayCompetitor || {};
  return {
    id: game.id,
    date: game.startTime,
    competition: game.competitionDisplayName || "",
    competitionId: game.competitionId || null,
    statusShort: status.short,
    statusGroup: Number(game.statusGroup) || 0,
    home: { id: home.id, name: home.name || "", score: Number.isFinite(Number(home.score)) ? Number(home.score) : null },
    away: { id: away.id, name: away.name || "", score: Number.isFinite(Number(away.score)) ? Number(away.score) : null }
  };
}

/* --------------------------------------------------------------------------
   مباريات يوم كامل (كل البطولات المربوطة) — الصيغة DD/MM/YYYY
   -------------------------------------------------------------------------- */

async function fetchS365Day(dateISO, options = {}) {
  const date = s365DayKey(dateISO);
  const store = s365Store();
  const cached = store.days[date];
  const now = Date.now();
  const force = options.force === true;

  if (!force && cached && cached.games && cached.games.length
    && now - new Date(cached.updatedAt || 0).getTime() < S365_DAY_FRESH) {
    mergeS365Day(date);
    return cached.games;
  }
  if (state.s365Day && state.s365Day.loadingDate === date) {
    mergeS365Day(date);
    return cached ? cached.games || [] : [];
  }
  if (!force && state.s365Day && state.s365Day.date === date && state.s365Day.lastAttempt
    && now - state.s365Day.lastAttempt < S365_THROTTLE) {
    return state.s365Day.games || [];
  }

  state.s365Day = { loadingDate: date, status: "loading", date, games: cached ? cached.games || [] : [], lastAttempt: now, error: null };
  if (!cached) refreshCurrentScreen();

  try {
    const response = await fetchWithTimeout(
      s365Url("games/", null, { sports: "1", startDate: s365DdMmYyyy(date), endDate: s365DdMmYyyy(date) }),
      { headers: { Accept: "application/json" } },
      30000
    );
    if (!response.ok) throw new Error(`تعذر الاتصال بمصدر 365Scores (HTTP ${response.status})`);
    const payload = await response.json();
    const rawGames = Array.isArray(payload.games) ? payload.games : [];
    const games = rawGames
      .map((game) => {
        const comp = s365CompBy365Id(game.competitionId);
        if (!comp) return null;
        return { ...s365CompactGame(game), appId: comp.id };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const updatedAt = new Date().toISOString();
    store.days[date] = { games, updatedAt };
    const keys = Object.keys(store.days).sort();
    while (keys.length > 10) delete store.days[keys.shift()];
    s365SaveStore(store);

    state.s365Day = { status: "ready", date, games, updatedAt, stale: false, lastAttempt: now, error: null };
    mergeS365Day(date);
  } catch (error) {
    const usable = cached && Array.isArray(cached.games) && cached.games.length;
    state.s365Day = {
      status: "ready",
      date,
      games: usable ? cached.games : [],
      updatedAt: usable ? cached.updatedAt : null,
      stale: usable,
      lastAttempt: now,
      error: error && error.name === "AbortError"
        ? "انتهت مهلة الاتصال بمصدر 365Scores."
        : (error && error.message) || "خطأ غير معروف"
    };
    if (usable) mergeS365Day(date);
  }
  refreshCurrentScreen();
  return state.s365Day.games || [];
}

/* يدمج مباريات 365 في قائمة اليوم الحالي فقط، ويتجنب التكرار مع FotMob */
function mergeS365Day(dateISO) {
  const date = s365DayKey(dateISO);
  if (state.matches.date !== date) return;
  const games = (state.s365Day && state.s365Day.date === date ? state.s365Day.games : []) || [];
  if (!games.length) return;
  const fmOn = typeof fmActive === "function" && fmActive();
  const existing = state.matches.fixtures || [];
  const keyOf = (fixture) => `${fixture.home?.name || ""}|${fixture.away?.name || ""}|${String(fixture.date || "").slice(0, 10)}`;
  const known = new Set(existing.map(keyOf));
  const additions = games
    .filter((game) => {
      const comp = getCompetitionById(game.appId);
      if (fmOn && comp && typeof fmLeagueId === "function" && fmLeagueId(comp)) return false;
      return !known.has(`${game.home?.name || ""}|${game.away?.name || ""}|${String(game.date || "").slice(0, 10)}`);
    })
    .map((game) => {
      const comp = getCompetitionById(game.appId);
      return mapS365Game(
        {
          id: game.id,
          startTime: game.date,
          competitionDisplayName: game.competition,
          competitionId: game.competitionId,
          statusGroup: game.statusGroup,
          homeCompetitor: game.home,
          awayCompetitor: game.away
        },
        comp
      );
    });
  if (!additions.length) return;
  state.matches.fixtures = [...existing, ...additions].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (state.matches.status !== "ready") {
    state.matches.status = "ready";
    state.matches.error = null;
  }
}

/* --------------------------------------------------------------------------
   ملف الفريق: آخر 5 + أقرب 5 + مواجهات مباشرة
   -------------------------------------------------------------------------- */

function s365TeamId(team) {
  if (!team) return null;
  const direct = Number(team.s365Id);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const mapped = typeof S365_TEAM_IDS !== "undefined" ? S365_TEAM_IDS[team.id] : null;
  if (mapped) return Number(mapped);
  if (typeof nationalTeams !== "undefined") {
    const national = nationalTeams.find((item) => item.id === team.id);
    if (national && national.s365Id) return Number(national.s365Id);
  }
  return null;
}

function s365CachedTeam(id) {
  const store = s365Store();
  return store.teams[String(id)] || null;
}

async function fetchS365Team(teamRef, options = {}) {
  const id = s365TeamId(teamRef);
  if (!id) return null;
  const store = s365Store();
  const cached = store.teams[String(id)];
  const now = Date.now();
  const force = options.force === true;

  if (state.s365Teams && state.s365Teams[id] && state.s365Teams[id].status === "ready"
    && !force && now - new Date(state.s365Teams[id].updatedAt || 0).getTime() < S365_TEAM_FRESH) {
    return state.s365Teams[id];
  }
  if (state.s365Teams && state.s365Teams[id] && state.s365Teams[id].status === "loading") return state.s365Teams[id];
  if (!force && state.s365Teams && state.s365Teams[id] && state.s365Teams[id].lastAttempt
    && now - state.s365Teams[id].lastAttempt < S365_THROTTLE) {
    return state.s365Teams[id];
  }

  if (!state.s365Teams) state.s365Teams = {};
  state.s365Teams[id] = {
    status: "loading",
    id,
    name: (teamRef && teamRef.name) || (cached && cached.name) || "",
    logo: (teamRef && teamRef.logo) || (cached && cached.logo) || "",
    last5: (cached && cached.last5) || [],
    next5: (cached && cached.next5) || [],
    h2h: (cached && cached.h2h) || [],
    honors: (teamRef && teamRef.honors) || [],
    updatedAt: cached ? cached.updatedAt : null,
    lastAttempt: now,
    error: null
  };
  if (!cached) refreshCurrentScreen();

  try {
    const infoResponse = await fetchWithTimeout(
      s365Url("competitors/", null, { competitors: String(id) }),
      { headers: { Accept: "application/json" } }
    );
    if (!infoResponse.ok) throw new Error(`تعذر الاتصال بمصدر 365Scores (HTTP ${infoResponse.status})`);
    const infoPayload = await infoResponse.json();
    const info = (Array.isArray(infoPayload.competitors) ? infoPayload.competitors : []).find((item) => Number(item.id) === id)
      || (Array.isArray(infoPayload.competitors) ? infoPayload.competitors[0] : null)
      || {};
    const compIds = Array.isArray(info.competitions) && info.competitions.length
      ? info.competitions.slice(0, 4)
      : [info.mainCompetitionId].filter(Boolean);
    const compList = compIds.join(",");

    const fetchCompGames = (kind, cid) => fetchWithTimeout(
      s365Url(`games/${kind}/`, cid, { pageNumber: "1" }),
      { headers: { Accept: "application/json" } }
    )
      .then((response) => (response.ok ? response.json() : { games: [] }))
      .catch(() => ({ games: [] }));

    const [resultsPayloads, fixturesPayloads] = await Promise.all([
      Promise.all(compIds.map((cid) => fetchCompGames("results", cid))),
      Promise.all(compIds.map((cid) => fetchCompGames("fixtures", cid)))
    ]);

    const dedupeGames = (payloads) => {
      const seen = new Set();
      const list = [];
      payloads.forEach((payload) => {
        (Array.isArray(payload.games) ? payload.games : []).forEach((game) => {
          if (!game || seen.has(game.id)) return;
          seen.add(game.id);
          list.push(game);
        });
      });
      return list;
    };
    const resultGames = dedupeGames(resultsPayloads);
    const fixtureGames = dedupeGames(fixturesPayloads);

    const involvesTeam = (game) => Number(game.homeCompetitor?.id) === id || Number(game.awayCompetitor?.id) === id;
    const results = resultGames
      .filter(involvesTeam)
      .map(s365CompactGame)
      .filter((game) => game.home.score !== null && game.home.score >= 0 && game.away.score !== null && game.away.score >= 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    const next5 = fixtureGames
      .filter(involvesTeam)
      .map(s365CompactGame)
      .filter((game) => game.home.score === null || game.home.score < 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    const nextOpponent = next5[0]
      ? (Number(next5[0].home.id) === id ? next5[0].away : next5[0].home)
      : null;
    const h2h = nextOpponent
      ? resultGames
        .filter((game) => {
          const homeId = Number(game.homeCompetitor?.id);
          const awayId = Number(game.awayCompetitor?.id);
          return (homeId === id && awayId === Number(nextOpponent.id)) || (awayId === id && homeId === Number(nextOpponent.id));
        })
        .map(s365CompactGame)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)
      : [];

    const updatedAt = new Date().toISOString();
    const profile = {
      status: "ready",
      id,
      name: info.name || (teamRef && teamRef.name) || "",
      logo: s365TeamLogo(info) || (teamRef && teamRef.logo) || "",
      competitions: (infoPayload.competitions || []).map((comp) => ({ id: comp.id, name: comp.name })),
      last5: results,
      next5,
      h2h,
      h2hOpponent: nextOpponent,
      honors: (teamRef && teamRef.honors) || [],
      updatedAt,
      stale: false,
      error: null
    };
    state.s365Teams[id] = profile;
    store.teams[String(id)] = {
      name: profile.name,
      logo: profile.logo,
      competitions: profile.competitions,
      last5: profile.last5,
      next5: profile.next5,
      h2h: profile.h2h,
      h2hOpponent: profile.h2hOpponent,
      updatedAt
    };
    s365SaveStore(store);
  } catch (error) {
    if (cached) {
      state.s365Teams[id] = {
        status: "ready",
        id,
        name: cached.name || (teamRef && teamRef.name) || "",
        logo: cached.logo || (teamRef && teamRef.logo) || "",
        competitions: cached.competitions || [],
        last5: cached.last5 || [],
        next5: cached.next5 || [],
        h2h: cached.h2h || [],
        h2hOpponent: cached.h2hOpponent || null,
        honors: (teamRef && teamRef.honors) || [],
        updatedAt: cached.updatedAt,
        stale: true,
        lastAttempt: now,
        error: "تعذر تحديث بيانات الفريق — تُعرض آخر نسخة محفوظة."
      };
    } else {
      state.s365Teams[id] = {
        status: "error",
        id,
        name: (teamRef && teamRef.name) || "",
        logo: (teamRef && teamRef.logo) || "",
        last5: [],
        next5: [],
        h2h: [],
        honors: (teamRef && teamRef.honors) || [],
        lastAttempt: now,
        error: error && error.name === "AbortError"
          ? "انتهت مهلة الاتصال بمصدر 365Scores."
          : (error && error.message) || "خطأ غير معروف"
      };
    }
  }
  refreshCurrentScreen();
  return state.s365Teams[id];
}

function getS365Team(id) {
  return state.s365Teams && state.s365Teams[Number(id)] ? state.s365Teams[Number(id)] : null;
}

/* --------------------------------------------------------------------------
   الهدافون — /stats/ مع seasonNum المقروء من الترتيب
   -------------------------------------------------------------------------- */

function s365CachedScorers(compId) {
  const store = s365Store();
  return store.scorers[String(compId)] || null;
}

async function fetchS365Scorers(comp, options = {}) {
  if (!comp) return null;
  const compId = s365CompId(comp);
  if (!compId) return null;
  if (!state.s365Scorers) state.s365Scorers = {};

  const cached = s365CachedScorers(compId);
  const now = Date.now();
  const force = options.force === true;
  const current = state.s365Scorers[compId];
  if (!force && current && current.status === "ready" && current.updatedAt
    && now - new Date(current.updatedAt).getTime() < S365_SCORERS_FRESH) {
    return current;
  }
  if (current && current.status === "loading") return current;
  if (!force && current && current.lastAttempt
    && now - current.lastAttempt < S365_THROTTLE) {
    return current;
  }

  state.s365Scorers[compId] = {
    status: "loading",
    list: (current && current.list) || (cached && cached.list) || [],
    updatedAt: cached ? cached.updatedAt : null,
    lastAttempt: now,
    error: null
  };
  if (!cached) refreshCurrentScreen();

  try {
    let seasonNum = state.standings[comp.id] && state.standings[comp.id].seasonNum;
    if (!seasonNum) {
      const standingResponse = await fetchWithTimeout(
        s365Url("standings/", compId, { live: "true", withSeasons: "true" }),
        { headers: { Accept: "application/json" } }
      );
      if (standingResponse.ok) {
        const standingPayload = await standingResponse.json();
        seasonNum = standingPayload.standings?.[0]?.seasonNum || null;
      }
    }
    if (!seasonNum) throw new Error("الموسم غير معروف في المصدر لهذه البطولة.");

    const response = await fetchWithTimeout(
      s365Url("stats/", compId, { statsType: "1", seasonNum: String(seasonNum), stageNum: "1" }),
      { headers: { Accept: "application/json" } },
      25000
    );
    if (!response.ok) throw new Error(`تعذر الاتصال بمصدر 365Scores (HTTP ${response.status})`);
    const payload = await response.json();
    const tables = payload.stats?.athletesStats?.tables || [];
    const goalTable = tables.find((table) => /هدف|أهداف|goals/i.test(table.name || "")) || tables[0];
    const rawRows = (goalTable && goalTable.rows) || [];
    if (!rawRows.length) throw new Error("المصدر لا يوفّر قائمة هدافين لهذه البطولة.");

    const competitors = new Map((payload.competitors || []).map((item) => [Number(item.id), item]));
    const list = rawRows.map((row, index) => {
      const entity = row.entity || {};
      const teamId = Number(entity.competitorId) || null;
      const team = teamId ? competitors.get(teamId) : null;
      const goalsStat = (row.stats || []).find((stat) => Number(stat.typeId) === 1);
      return {
        rank: index + 1,
        name: entity.name || "",
        teamId,
        teamName: team ? team.name : "",
        logo: team ? s365TeamLogo(team) : "",
        value: Number(goalsStat ? goalsStat.value : 0) || 0
      };
    }).filter((row) => row.name);

    const updatedAt = new Date().toISOString();
    state.s365Scorers[compId] = {
      status: "ready",
      list,
      seasonNum,
      updatedAt,
      stale: false,
      error: null
    };
    s365SaveStore(Object.assign(s365Store(), { scorers: { ...s365Store().scorers, [String(compId)]: { list, seasonNum, updatedAt } } }));
  } catch (error) {
    if (cached && Array.isArray(cached.list) && cached.list.length) {
      state.s365Scorers[compId] = {
        status: "ready",
        list: cached.list,
        seasonNum: cached.seasonNum || null,
        updatedAt: cached.updatedAt,
        stale: true,
        lastAttempt: now,
        error: "تعذر تحديث الهدافين — تُعرض آخر نسخة محفوظة."
      };
    } else {
      state.s365Scorers[compId] = {
        status: "error",
        list: [],
        lastAttempt: now,
        error: error && error.name === "AbortError"
          ? "انتهت مهلة الاتصال بمصدر 365Scores."
          : (error && error.message) || "خطأ غير معروف"
      };
    }
  }
  refreshCurrentScreen();
  return state.s365Scorers[compId];
}

function getS365Scorers(comp) {
  const compId = s365CompId(comp);
  if (!compId || !state.s365Scorers) return null;
  return state.s365Scorers[compId] || null;
}
