/* ==========================================================================
   FotMob — المصدر الأساسي للمواعيد والتواريخ والترتيب والهدافين والتشكيلات
   المصدر: https://www.fotmob.com/ar
   الواجهة: https://www.fotmob.com/api/data   (CORS مفتوح عند إرسال Origin)
   ملاحظة مؤكدة بالاختبار: FotMob لا يغطي الدوري اليمني إطلاقاً،
   لذلك يبقى الدوري اليمني على 365Scores (provider-365.js).
   ========================================================================== */
"use strict";

const FM_BASE = "https://www.fotmob.com/api/data";
const FM_STATS_BASE = "https://data.fotmob.com";

/* معرّفات البطولات في FotMob (مؤكدة من allLeagues) */
const FM_LEAGUES = {
  epl: 47,
  laliga: 87,
  seriea: 55,
  bundesliga: 54,
  ligue1: 53,
  ucl: 42,
  worldcup: 77,
  saudi: 536,
  egypt: 519,
  morocco: 530,
  algeria: 516,
  uae: 538,
  qatar: 535,
  kuwait: 529,
  iraq: 524,
  "asia-elite": 525,
  "arab-club": 10474,
  "arab-cup": 10242,
  "gulf-cup": 329,
  "asian-cup": 290,
  afcon: 289,
  "egypt-cup": 9941
};

const FM_FRESH_MATCHES = 45 * 1000;
const FM_FRESH_STANDINGS = 60 * 1000;
const FM_THROTTLE = 20 * 1000;
const FM_FRESH_TEAM = 6 * 60 * 60 * 1000;
const FM_FRESH_SCORERS = 10 * 60 * 1000;
const FM_OFFLINE_MAX = 7 * 24 * 60 * 60 * 1000;

const FM_CACHE = {
  matches: "wasl.fm.matches.v2",
  standings: "wasl.fm.standings.v2",
  teams: "wasl.fm.teams.v3",
  scorers: "wasl.fm.scorers.v2"
};

function fmState() {
  if (!state.fotmob) {
    state.fotmob = { byDate: {}, teams: {}, scorers: {}, lineups: {} };
  }
  if (!state.fotmob.byDate) state.fotmob.byDate = {};
  if (!state.fotmob.teams) state.fotmob.teams = {};
  if (!state.fotmob.scorers) state.fotmob.scorers = {};
  if (!state.fotmob.lineups) state.fotmob.lineups = {};
  return state.fotmob;
}

function fmActive() {
  if (typeof state === "undefined" || !state || !state.settings) return false;
  if (state.settings.fotmob === false) return false;
  if (String(state.settings.apiKey || "").trim()) return false;
  return true;
}

function fmLeagueId(comp) {
  if (!comp) return null;
  const direct = Number(comp.fotmob);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return FM_LEAGUES[comp.id] || null;
}

function fmLeagueComp(leagueId) {
  const id = Number(leagueId);
  if (!Number.isFinite(id)) return null;
  const comps = state?.data?.competitions || [];
  const direct = comps.find((comp) => Number(comp.fotmob) === id);
  if (direct) return direct;
  const key = Object.keys(FM_LEAGUES).find((name) => FM_LEAGUES[name] === id);
  return key ? comps.find((comp) => comp.id === key) || null : null;
}

function fmLogo(team) {
  if (!team) return "";
  if (team.logo) return team.logo;
  if (typeof clubLogoFor === "function") {
    const local = clubLogoFor({ name: team.name, rawName: team.name });
    if (local) return local;
  }
  if (team.id) return `https://images.fotmob.com/image_resources/logo/teamlogo/${team.id}.png`;
  return "";
}

/* أسماء الدوريات بالعربية — FotMob يعيدها بالإنجليزية */
const FM_LEAGUE_AR = {
  47: "الدوري الإنجليزي الممتاز",
  87: "الدوري الإسباني",
  55: "الدوري الإيطالي",
  54: "الدوري الألماني",
  53: "الدوري الفرنسي",
  42: "دوري أبطال أوروبا",
  77: "كأس العالم",
  536: "دوري روشن السعودي",
  519: "الدوري المصري",
  530: "الدوري المغربي",
  516: "الدوري الجزائري",
  544: "الدوري التونسي",
  538: "دوري أدنوك الإماراتي",
  535: "دوري نجوم قطر",
  529: "الدوري الكويتي",
  524: "دوري نجوم العراق",
  525: "دوري أبطال آسيا للنخبة",
  10474: "البطولة العربية للأندية",
  10242: "كأس العرب",
  329: "كأس الخليج",
  290: "كأس آسيا",
  289: "كأس الأمم الأفريقية",
  9941: "كأس مصر",
  10608: "تصفيات كأس أمم أفريقيا",
  9821: "دوري أمم الكونكاكاف",
  9806: "دوري أمم أوروبا — الدرجة A",
  9808: "دوري أمم أوروبا — الدرجة C",
  9807: "دوري أمم أوروبا — الدرجة B",
  9809: "دوري أمم أوروبا — الدرجة D",
  114: "مباريات ودية",
  489: "مباريات ودية للأندية",
  344: "مباريات ودية تحت 21",
  9375: "دوري أبطال أوروبا للسيدات",
  138: "كأس ملك إسبانيا",
  10651: "كأس الملكة الإسبانية",
  335: "الدوري السلفادوري",
  9122: "الدوري الأوروغواياني — الدرجة الثانية",
  8814: "الدوري البرازيلي — الدرجة الثانية",
  9125: "الدوري الكولومبي — الدرجة الثانية",
  9906: "ملحق الدوري المكسيكي للسيدات",
  10699: "الدوري الأمريكي للسيدات",
  8938: "الدوري الأسترالي",
  10437: "تصفيات يورو تحت 21 — الملحق",
  512: "ريجيوناليغا الغرب",
  73: "الدوري الأوروبي",
  132: "كأس الاتحاد الإنجليزي",
  133: "كأس الرابطة الإنجليزية",
  247: "درع المجتمع الإنجليزي",
  134: "كأس فرنسا",
  207: "كأس السوبر الفرنسي",
  209: "كأس ألمانيا",
  8924: "كأس السوبر الألماني",
  141: "كأس إيطاليا",
  11015: "كأس السوبر الإيطالي",
  139: "كأس السوبر الإسباني",
  266: "كأس السوبر البلجيكي",
  237: "كأس السوبر الهولندي",
  188: "كأس السوبر البرتغالي",
  166: "كأس السوبر التركي",
  10721: "دوري يلو السعودي",
  9942: "كأس الملك السعودي",
  10074: "كأس السوبر السعودي",
  11018: "كأس أمير قطر",
  11016: "كأس قطر",
  11026: "كأس السوبر الإماراتي",
  10314: "كأس السوبر المصري",
  9469: "دوري أبطال آسيا 2",
  9467: "كأس السوبر الأفريقي",
  74: "كأس السوبر الأوروبي",
  292: "كأس أمم أوروبا للسيدات",
  76: "كأس العالم للسيدات",
  296: "كأس العالم تحت 20",
  306: "كأس العالم تحت 17",
  11038: "كأس الملك",
  10603: "الكأس الذهبية للكونكاكاف للسيدات",
  288: "كأس أمم أوروبا تحت 21"
};

const FM_NAME_CACHE = new Map();

/* تحويل اسم الفريق الإنجليزي إلى العربي (قاموس + نقل صوتي) */
function fmTeamName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  if (/[\u0600-\u06FF]/.test(raw)) return raw;
  if (FM_NAME_CACHE.has(raw)) return FM_NAME_CACHE.get(raw);
  let arabic = raw;
  try {
    arabic = typeof arTeamName === "function" ? arTeamName(raw) : raw;
  } catch (error) {
    arabic = raw;
  }
  FM_NAME_CACHE.set(raw, arabic);
  return arabic;
}

function fmLeagueName(league) {
  if (!league) return "بطولة";
  const rawName = String(league.name || "");
  const group = rawName.match(/Group\s+([A-Z0-9]+)/i);
  const groupAr = group ? ` — المجموعة ${group[1]}` : "";
  const arabic = FM_LEAGUE_AR[Number(league.id)];
  if (arabic) return `${arabic}${groupAr}`;
  try {
    if (typeof arLeagueName === "function") {
      const translated = arLeagueName(league.name, league.ccode);
      if (translated) return translated;
    }
  } catch (error) {
    /* تجاهل */
  }
  return rawName || "بطولة";
}

function fmUrl(path, params = {}) {
  const url = new URL(`${FM_BASE}/${path}`);
  Object.keys(params || {}).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function fmGet(path, params = {}, timeout = 25000) {
  const response = await fetchWithTimeout(
    fmUrl(path, params),
    { mode: "cors", headers: { Accept: "application/json" } },
    timeout
  );
  if (!response.ok) throw new Error(`تعذر الاتصال بمصدر FotMob (HTTP ${response.status})`);
  return response.json();
}

function fmDateKey(value) {
  const text = String(value || "");
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : getTodayISO();
  return iso.replace(/-/g, "");
}

/* --------------------------------------------------------------------------
   المباريات — تبويب الأيام
   -------------------------------------------------------------------------- */

function fmStatus(match) {
  const status = match.status || {};
  const liveTime = status.liveTime || {};
  const clean = (value) => String(value || "").replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim();
  const reason = clean(status.reason?.short);
  const longClock = clean(liveTime.long);
  const shortClock = clean(liveTime.short);
  const clock = /^\d{1,3}:\d{2}$/.test(longClock)
    ? longClock
    : /^\d{1,3}:\d{2}$/.test(shortClock) ? shortClock : "";
  const minuteOnly = /^\d{1,3}[′']?$/.test(shortClock) ? Number(shortClock.replace(/[^\d]/g, "")) : null;
  if (status.cancelled) return { short: "CANC", long: "ملغاة", elapsed: null, live: false, started: false, clock: "" };
  if (status.finished) {
    const short = /pen/i.test(reason) ? "PEN" : /aet|extra/i.test(reason) ? "AET" : "FT";
    return { short, long: "انتهت", elapsed: 90, live: false, started: true, clock: "" };
  }
  if (status.started) {
    const isHalf = /^(ht|halftime)$/i.test(shortClock) || /^(ht|halftime)$/i.test(reason);
    const short = isHalf ? "HT" : "LIVE";
    const long = isHalf ? "استراحة بين الشوطين" : (clean(liveTime.long) || "مباشر الآن");
    const elapsed = clock ? Number(clock.split(":")[0]) : minuteOnly;
    return { short, long, elapsed, live: true, started: true, clock };
  }
  return { short: "NS", long: "لم تبدأ", elapsed: null, live: false, started: false, clock: "" };
}

function fmMapMatch(match, league) {
  const status = fmStatus(match);
  const home = match.home || {};
  const away = match.away || {};
  const homeScore = Number.isFinite(Number(home.score)) ? Number(home.score) : null;
  const awayScore = Number.isFinite(Number(away.score)) ? Number(away.score) : null;
  const leagueKey = Number(league.primaryId) || Number(league.id);
  const comp = fmLeagueComp(leagueKey);
  const utc = match.status?.utcTime || (match.timeTS ? new Date(match.timeTS).toISOString() : null);
  return {
    id: `fm-${match.id}`,
    fmId: match.id,
    date: utc,
    timestamp: match.timeTS ? Math.floor(match.timeTS / 1000) : null,
    statusShort: status.short,
    statusLong: status.long,
    elapsed: status.elapsed,
    clock: status.clock || "",
    clockAt: Date.now(),
    source: "fotmob",
    channel: "",
    league: {
      id: comp ? comp.apiId : leagueKey,
      appId: comp ? comp.id : null,
      fmId: leagueKey,
      name: comp ? comp.name : fmLeagueName(league),
      logo: comp ? comp.logo || "" : "",
      country: league.ccode || (comp && comp.country) || "",
      round: match.tournamentStage ? String(match.tournamentStage) : ""
    },
    home: {
      id: home.id,
      name: fmTeamName(home.name) || "الفريق الأول",
      logo: fmLogo(home),
      winner: status.started && homeScore !== null && awayScore !== null ? (homeScore > awayScore ? true : undefined) : undefined
    },
    away: {
      id: away.id,
      name: fmTeamName(away.name) || "الفريق الثاني",
      logo: fmLogo(away),
      winner: status.started && homeScore !== null && awayScore !== null ? (awayScore > homeScore ? true : undefined) : undefined
    },
    goals: {
      home: status.started ? homeScore : null,
      away: status.started ? awayScore : null
    },
    venue: ""
  };
}

/* جلب مباراة واحدة بالمعرّف — يتيح فتح رابط أي مباراة من FotMob مباشرة */
async function fetchFmMatchById(matchId) {
  const id = Number(matchId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const fixtureId = `fm-${id}`;
  const existing = typeof getFixtureById === "function" ? getFixtureById(fixtureId) : null;
  if (existing) return existing;
  try {
    const payload = await fmGet("matchDetails", { matchId: id }, 30000);
    const header = payload?.header || {};
    const teams = Array.isArray(header.teams) ? header.teams : [];
    if (teams.length < 2) return null;
    const general = payload?.general || {};
    const match = {
      id,
      home: { id: teams[0].id, name: teams[0].name, score: teams[0].score, imageUrl: teams[0].imageUrl },
      away: { id: teams[1].id, name: teams[1].name, score: teams[1].score, imageUrl: teams[1].imageUrl },
      status: { ...(header.status || {}) },
      timeTS: header.status?.utcTime ? new Date(header.status.utcTime).getTime() : null,
      tournamentStage: general.leagueRoundName || ""
    };
    const league = {
      id: general.leagueId,
      primaryId: general.leagueId,
      ccode: general.countryCode,
      name: general.leagueName || ""
    };
    const fixture = fmMapMatch(match, league);
    if (!Array.isArray(state.matches.fixtures)) state.matches.fixtures = [];
    if (!state.matches.fixtures.some((item) => String(item.id) === fixtureId)) {
      state.matches.fixtures.push(fixture);
    }
    refreshCurrentScreen();
    return fixture;
  } catch (error) {
    return null;
  }
}

function fmReadMatchesCache() {
  const cache = readJSON(FM_CACHE.matches, {});
  return cache && typeof cache === "object" ? cache : {};
}

function fmWriteMatchesCache(dateKey, fixtures) {
  const cache = fmReadMatchesCache();
  cache[dateKey] = { fixtures, updatedAt: new Date().toISOString() };
  /* لا نحتفظ بأكثر من 7 أيام لعدم إغراق التخزين */
  const keys = Object.keys(cache).sort();
  while (keys.length > 7) delete cache[keys.shift()];
  writeJSON(FM_CACHE.matches, cache);
}

async function loadFmMatches(dateISO, options = {}) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(dateISO || "")) ? dateISO : getTodayISO();
  const key = fmDateKey(iso);
  const fm = fmState();
  const entry = fm.byDate[key] || { status: "idle", fixtures: [], error: null, updatedAt: null };
  const force = options.force === true;
  const now = Date.now();

  if (!force && entry.status === "ready" && entry.updatedAt && now - new Date(entry.updatedAt).getTime() < FM_FRESH_MATCHES) {
    fmApplyMatches(iso, entry.fixtures, entry.updatedAt);
    return;
  }
  if (entry.status === "loading") return;

  fm.byDate[key] = { ...entry, status: "loading" };

  try {
    const payload = await fmGet("matches", { date: key });
    const leagues = Array.isArray(payload.leagues) ? payload.leagues : [];
    const fixtures = [];
    leagues.forEach((league) => {
      const list = Array.isArray(league.matches) ? league.matches : [];
      list.forEach((match) => fixtures.push(fmMapMatch(match, league)));
    });
    fixtures.sort((a, b) => new Date(a.date) - new Date(b.date));

    const updatedAt = new Date().toISOString();
    fm.byDate[key] = { status: "ready", fixtures, error: null, updatedAt };
    fmWriteMatchesCache(key, fixtures);
    fmApplyMatches(iso, fixtures, updatedAt);
  } catch (error) {
    const cached = fmReadMatchesCache()[key];
    const usable = cached && Array.isArray(cached.fixtures) && cached.fixtures.length
      && now - new Date(cached.updatedAt || 0).getTime() < FM_OFFLINE_MAX;

    if (usable) {
      fm.byDate[key] = {
        status: "ready",
        fixtures: cached.fixtures,
        error: "تعذر تحديث المباريات — تُعرض آخر نسخة محفوظة.",
        updatedAt: cached.updatedAt,
        stale: true
      };
      fmApplyMatches(iso, cached.fixtures, cached.updatedAt, true);
    } else {
      fm.byDate[key] = {
        status: "error",
        fixtures: [],
        error: error && error.name === "AbortError"
          ? "انتهت مهلة الاتصال بمصدر FotMob."
          : (error && error.message) || "خطأ غير معروف",
        updatedAt: null
      };
      state.matches = {
        ...state.matches,
        status: "error",
        source: "fotmob",
        fixtures: [],
        nextFixtures: [],
        recentFixtures: [],
        date: iso,
        error: fm.byDate[key].error
      };
    }
  }
  refreshCurrentScreen();
}

function fmApplyMatches(iso, fixtures, updatedAt, stale = false) {
  state.matches = {
    ...state.matches,
    status: "ready",
    source: "fotmob",
    fixtures: Array.isArray(fixtures) ? fixtures : [],
    nextFixtures: [],
    recentFixtures: [],
    date: iso,
    updatedAt: updatedAt || null,
    error: stale ? "تعذر تحديث المباريات — تُعرض آخر نسخة محفوظة." : null
  };
}

function getFmMatches(dateISO) {
  const key = fmDateKey(dateISO);
  const entry = fmState().byDate[key];
  return entry && Array.isArray(entry.fixtures) ? entry.fixtures : [];
}

/* --------------------------------------------------------------------------
   الترتيب المباشر
   -------------------------------------------------------------------------- */

function fmParseScoreStr(value) {
  const match = String(value || "").match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return [0, 0];
  return [Number(match[1]), Number(match[2])];
}

function fmMapStandingRow(row, formMap) {
  const [goalsFor, goalsAgainst] = fmParseScoreStr(row.scoresStr);
  const form = formMap && formMap.get(Number(row.id)) ? formMap.get(Number(row.id)).slice(-5) : [];
  return {
    rank: Number(row.idx) || 0,
    name: fmTeamName(row.name) || "فريق",
    short: fmTeamName(row.shortName) || "",
    teamId: row.id || null,
    logo: fmLogo({ id: row.id, name: row.name }),
    points: Number(row.pts) || 0,
    played: Number(row.played) || 0,
    win: Number(row.wins) || 0,
    draw: Number(row.draws) || 0,
    lose: Number(row.losses) || 0,
    goalsFor,
    goalsAgainst,
    goalsDiff: Number.isFinite(Number(row.goalConDiff)) ? Number(row.goalConDiff) : goalsFor - goalsAgainst,
    form
  };
}

function fmBuildFormMap(allMatches) {
  const map = new Map();
  const finished = (Array.isArray(allMatches) ? allMatches : [])
    .filter((match) => match?.status?.finished && !match.status.cancelled)
    .sort((a, b) => new Date(a.status.utcTime || 0) - new Date(b.status.utcTime || 0));
  finished.forEach((match) => {
    const homeId = Number(match.home?.id);
    const awayId = Number(match.away?.id);
    if (!homeId || !awayId) return;
    const [homeGoals, awayGoals] = fmParseScoreStr(match.status.scoreStr);
    const homeResult = homeGoals > awayGoals ? "W" : homeGoals < awayGoals ? "L" : "D";
    const awayResult = awayGoals > homeGoals ? "W" : awayGoals < homeGoals ? "L" : "D";
    if (!map.has(homeId)) map.set(homeId, []);
    if (!map.has(awayId)) map.set(awayId, []);
    map.get(homeId).push(homeResult);
    map.get(awayId).push(awayResult);
  });
  return map;
}

function fmReadStandingsCache() {
  const cache = readJSON(FM_CACHE.standings, {});
  return cache && typeof cache === "object" ? cache : {};
}

function fmWriteStandingsCache(compId, data) {
  const cache = fmReadStandingsCache();
  cache[compId] = data;
  writeJSON(FM_CACHE.standings, cache);
}

async function fetchFmStandings(comp, options = {}) {
  if (!comp) return;
  const leagueId = fmLeagueId(comp);
  if (!leagueId) return;

  const current = state.standings[comp.id];
  if (current && current.status === "loading") return;

  const force = options.force === true;
  const now = Date.now();
  if (!force && current && current.status === "ready" && current.updatedAt) {
    if (now - new Date(current.updatedAt).getTime() < FM_FRESH_STANDINGS) return;
  }
  if (!force && current && current.status === "error" && current.lastAttempt && now - current.lastAttempt < FM_THROTTLE) {
    return;
  }

  const previousRows = current && Array.isArray(current.rows) ? current.rows : [];

  if (!previousRows.length) {
    state.standings[comp.id] = {
      status: "loading",
      rows: [],
      error: null,
      source: "FotMob",
      lastAttempt: now
    };
    refreshCurrentScreen();
  }

  try {
    const payload = await fmGet("leagues", { id: leagueId }, 30000);
    const tableEntry = Array.isArray(payload?.table) ? payload.table[0] : payload?.table;
    const tableData = tableEntry?.data;
    const rows = Array.isArray(tableData?.table?.all) ? tableData.table.all : [];
    if (!rows.length) throw new Error("المصدر لم يُرجع جدولاً لهذه البطولة.");

    const formMap = fmBuildFormMap(payload?.fixtures?.allMatches);
    const mapped = rows.map((row) => fmMapStandingRow(row, formMap));
    const updatedAt = new Date().toISOString();
    const season = tableData?.selectedSeason || null;

    state.standings[comp.id] = {
      status: "ready",
      rows: mapped,
      updatedAt,
      error: null,
      source: "FotMob",
      stale: false,
      season,
      leagueId,
      lastAttempt: now
    };

    fmWriteStandingsCache(comp.id, { rows: mapped, updatedAt, season, leagueId });
    fmStoreScorersFromLeague(comp, payload);
  } catch (error) {
    const cached = fmReadStandingsCache()[comp.id];
    const cachedAge = cached ? now - new Date(cached.updatedAt || 0).getTime() : Infinity;
    const usable = cached && Array.isArray(cached.rows) && cached.rows.length && cachedAge < FM_OFFLINE_MAX;

    if (usable) {
      state.standings[comp.id] = {
        status: "ready",
        rows: cached.rows,
        updatedAt: cached.updatedAt,
        error: "تعذر تحديث الترتيب — تُعرض آخر نسخة محفوظة.",
        source: "FotMob",
        stale: true,
        season: cached.season || null,
        leagueId,
        lastAttempt: now
      };
    } else {
      state.standings[comp.id] = {
        status: "error",
        rows: previousRows,
        error: error && error.name === "AbortError"
          ? "انتهت مهلة الاتصال بمصدر FotMob."
          : (error && error.message) || "خطأ غير معروف",
        source: "FotMob",
        lastAttempt: now
      };
    }
  }
  refreshCurrentScreen();
}

function fmRefreshStandingsLive(comp) {
  if (!comp) return;
  if (!fmLeagueId(comp)) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const current = state.standings[comp.id];
  if (current && current.status === "loading") return;
  fetchFmStandings(comp, { force: true });
}

/* --------------------------------------------------------------------------
   الهدافون
   -------------------------------------------------------------------------- */

function fmStoreScorersFromLeague(comp, payload) {
  const groups = payload?.stats?.players;
  if (!Array.isArray(groups) || !groups.length) return;
  const group = groups.find((item) => item && item.header && /scorer|goal/i.test(item.header)) || groups[0];
  const url = group?.fetchAllUrl;
  const fm = fmState();
  fm.scorers[comp.id] = {
    status: "ready",
    list: fmMapScorerTopThree(group),
    fetchAllUrl: url || null,
    updatedAt: new Date().toISOString(),
    error: null
  };
}

function fmMapScorerTopThree(group) {
  if (!group) return [];
  const rows = Array.isArray(group.topThree) ? group.topThree : (group.participant ? [group.participant] : []);
  return rows.map((item) => ({
    rank: Number(item.rank) || 0,
    name: typeof arPlayerName === "function" ? arPlayerName(item.name) : (item.name || ""),
    teamId: item.teamId || null,
    teamName: fmTeamName(item.teamName) || "",
    value: Number(item.value ?? item.stat?.value) || 0,
    logo: fmLogo({ id: item.teamId, name: item.teamName })
  })).filter((item) => item.name);
}

async function fetchFmScorers(comp, options = {}) {
  if (!comp) return;
  const leagueId = fmLeagueId(comp);
  if (!leagueId) return;

  const fm = fmState();
  const current = fm.scorers[comp.id];
  const force = options.force === true;
  const now = Date.now();
  if (!force && current && current.status === "ready" && current.updatedAt
    && now - new Date(current.updatedAt).getTime() < FM_FRESH_SCORERS) {
    return;
  }
  if (!force && current && current.status === "error" && current.lastAttempt && now - current.lastAttempt < FM_THROTTLE) {
    return;
  }
  if (current && current.status === "loading") return;

  fm.scorers[comp.id] = { ...(current || {}), status: "loading", list: current?.list || [], error: null, lastAttempt: now };

  try {
    const cachedStandings = fmReadStandingsCache()[comp.id];
    let url = current?.fetchAllUrl;
    if (!url) {
      const payload = await fmGet("leagues", { id: leagueId }, 30000);
      const groups = payload?.stats?.players;
      const group = Array.isArray(groups)
        ? (groups.find((item) => item && item.header && /scorer|goal/i.test(item.header)) || groups[0])
        : null;
      url = group?.fetchAllUrl;
      if (!url) throw new Error("هذه البطولة لا توفّر قائمة هدافين في المصدر.");
    }

    const response = await fetchWithTimeout(url, { mode: "cors", headers: { Accept: "application/json" } }, 25000);
    if (!response.ok) throw new Error(`تعذر تحميل الهدافين (HTTP ${response.status})`);
    const payload = await response.json();
    const statList = Array.isArray(payload?.TopLists?.[0]?.StatList) ? payload.TopLists[0].StatList : [];
    const list = statList.map((item) => ({
      rank: Number(item.Rank) || 0,
      name: typeof arPlayerName === "function" ? arPlayerName(item.ParticipantName) : (item.ParticipantName || ""),
      teamId: item.TeamId || null,
      teamName: fmTeamName(item.TeamName) || "",
      value: Number(item.StatValue) || 0,
      logo: fmLogo({ id: item.TeamId, name: item.TeamName })
    })).filter((item) => item.name);

    const updatedAt = new Date().toISOString();
    fm.scorers[comp.id] = { status: "ready", list, fetchAllUrl: url, updatedAt, error: null };
    fmWriteScorersCache(comp.id, { list, updatedAt, fetchAllUrl: url });
    if (cachedStandings) {
      /* لا حاجة لعمل شيء إضافي — الهدافون مستقلون عن الترتيب */
    }
  } catch (error) {
    const cached = fmReadScorersCache()[comp.id];
    const age = cached ? now - new Date(cached.updatedAt || 0).getTime() : Infinity;
    if (cached && Array.isArray(cached.list) && cached.list.length && age < FM_OFFLINE_MAX) {
      fm.scorers[comp.id] = {
        status: "ready",
        list: cached.list,
        fetchAllUrl: cached.fetchAllUrl || null,
        updatedAt: cached.updatedAt,
        error: "تعذر تحديث الهدافين — تُعرض آخر نسخة محفوظة.",
        stale: true
      };
    } else {
      fm.scorers[comp.id] = {
        status: "error",
        list: [],
        error: error && error.name === "AbortError"
          ? "انتهت مهلة الاتصال بمصدر FotMob."
          : (error && error.message) || "خطأ غير معروف"
      };
    }
  }
  refreshCurrentScreen();
}

function fmReadScorersCache() {
  const cache = readJSON(FM_CACHE.scorers, {});
  return cache && typeof cache === "object" ? cache : {};
}

function fmWriteScorersCache(compId, data) {
  const cache = fmReadScorersCache();
  cache[compId] = data;
  writeJSON(FM_CACHE.scorers, cache);
}

/* --------------------------------------------------------------------------
   صفحة الفريق: اللاعبون + المدرب + المباريات
   -------------------------------------------------------------------------- */

function fmReadTeamsCache() {
  const cache = readJSON(FM_CACHE.teams, {});
  return cache && typeof cache === "object" ? cache : {};
}

function fmWriteTeamsCache(teamId, data) {
  const cache = fmReadTeamsCache();
  cache[teamId] = data;
  writeJSON(FM_CACHE.teams, cache);
}

function fmPlayerPhoto(id) {
  const playerId = Number(id);
  return Number.isFinite(playerId) && playerId > 0
    ? `https://images.fotmob.com/image_resources/playerimages/${playerId}.png`
    : "";
}

const FM_POSITION_AR = {
  GK: "حارس مرمى",
  CB: "قلب دفاع",
  LB: "ظهير أيسر",
  RB: "ظهير أيمن",
  LWB: "ظهير أيسر",
  RWB: "ظهير أيمن",
  CDM: "وسط مدافع",
  DM: "وسط مدافع",
  CM: "وسط ملعب",
  CAM: "صانع ألعاب",
  AM: "صانع ألعاب",
  LM: "جناح أيسر",
  RM: "جناح أيمن",
  LW: "جناح أيسر",
  RW: "جناح أيمن",
  CF: "مهاجم",
  ST: "مهاجم صريح",
  SS: "مهاجم ثانٍ"
};

function fmPositionLabel(desc) {
  const key = String(desc || "").split(",")[0].trim().toUpperCase();
  return FM_POSITION_AR[key] || key || "";
}

const FM_SQUAD_TITLE_AR = {
  keepers: "حراسة المرمى",
  defenders: "خط الدفاع",
  midfielders: "خط الوسط",
  attackers: "خط الهجوم",
  coach: "الجهاز الفني"
};

function fmMapSquad(squad) {
  const groups = Array.isArray(squad?.squad) ? squad.squad : [];
  return groups.map((group) => ({
    title: group.title || "",
    titleAr: FM_SQUAD_TITLE_AR[group.title] || group.title || "",
    members: (Array.isArray(group.members) ? group.members : []).map((member) => ({
      id: member.id,
      name: typeof arPlayerName === "function" ? arPlayerName(member.name) : (member.name || ""),
      age: member.age || null,
      ccode: member.ccode || "",
      cname: typeof arCountryName === "function" ? arCountryName(member.cname) : (member.cname || ""),
      role: member.role?.key || "",
      shirtNumber: member.shirtNumber || "",
      positionId: member.positionId ?? null,
      positionDesc: member.positionIdsDesc || "",
      position: fmPositionLabel(member.positionIdsDesc),
      height: member.height || null,
      rating: member.rating ?? null,
      goals: member.goals ?? null,
      assists: member.assists ?? null,
      injured: Boolean(member.injured),
      injury: member.injury || null,
      photo: fmPlayerPhoto(member.id)
    }))
  }));
}

function fmMapLastLineup(stats) {
  if (!stats || !Array.isArray(stats.starters) || !stats.starters.length) return null;
  const mapPlayer = (player) => ({
    id: player.id,
    name: typeof arPlayerName === "function" ? arPlayerName(player.name) : (player.name || ""),
    shirtNumber: player.shirtNumber || "",
    positionId: player.positionId ?? null,
    positionDesc: player.positionIdsDesc || "",
    position: fmPositionLabel(player.positionIdsDesc),
    countryName: typeof arCountryName === "function" ? arCountryName(player.countryName) : (player.countryName || ""),
    countryCode: player.countryCode || "",
    age: player.age ?? null,
    rating: Number(player.performance?.rating) > 0 ? Number(player.performance.rating) : null,
    isCaptain: Boolean(player.isCaptain),
    x: Number.isFinite(Number(player.verticalLayout?.x)) ? Number(player.verticalLayout.x) : null,
    y: Number.isFinite(Number(player.verticalLayout?.y)) ? Number(player.verticalLayout.y) : null,
    photo: fmPlayerPhoto(player.id)
  });
  return {
    formation: stats.formation || "",
    coach: stats.coach ? { id: stats.coach.id, name: stats.coach.name || "", countryName: stats.coach.countryName || "" } : null,
    starters: stats.starters.map(mapPlayer),
    subs: (Array.isArray(stats.subs) ? stats.subs : []).map(mapPlayer),
    unavailable: (Array.isArray(stats.unavailable) ? stats.unavailable : []).map((player) => ({
      id: player.id,
      name: player.name || "",
      reason: player.unavailability?.type === "suspension" ? "إيقاف" : "إصابة",
      expectedReturn: player.unavailability?.expectedReturn || "",
      photo: fmPlayerPhoto(player.id)
    })),
    averageAge: stats.averageStarterAge ?? null,
    lastMatch: stats.lastMatch ? {
      matchId: stats.lastMatch.matchId,
      home: stats.lastMatch.homeTeamName || "",
      away: stats.lastMatch.awayTeamName || ""
    } : null
  };
}

function fmMapTeamForm(list) {
  return (Array.isArray(list) ? list : []).map((item) => ({
    result: item.resultString || "",
    score: item.score || "",
    tournament: typeof arLeagueName === "function" ? arLeagueName(item.tournamentName) : (item.tournamentName || ""),
    date: item.date?.utcTime || null,
    home: fmTeamName(item.home?.name) || "",
    away: fmTeamName(item.away?.name) || ""
  }));
}

function fmMapTeamFixtures(fixtures) {
  const list = Array.isArray(fixtures) ? fixtures : [];
  return list.map((item) => ({
    id: item.id,
    date: item.status?.utcTime || null,
    home: {
      id: item.home?.id,
      name: fmTeamName(item.home?.name) || "",
      score: item.home?.score ?? null,
      logo: fmLogo(item.home)
    },
    away: {
      id: item.away?.id,
      name: fmTeamName(item.away?.name) || "",
      score: item.away?.score ?? null,
      logo: fmLogo(item.away)
    },
    tournament: typeof arLeagueName === "function" ? arLeagueName(item.tournament?.name) : (item.tournament?.name || ""),
    leagueId: item.tournament?.leagueId || null,
    statusShort: item.status?.finished ? "FT" : item.status?.started ? "LIVE" : "NS",
    notStarted: Boolean(item.notStarted)
  })).filter((item) => item.date);
}

async function fetchFmTeam(teamId, options = {}) {
  const id = Number(teamId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const fm = fmState();
  const current = fm.teams[id];
  const force = options.force === true;
  const now = Date.now();

  if (!force && current && current.status === "ready" && current.updatedAt
    && now - new Date(current.updatedAt).getTime() < FM_FRESH_TEAM) {
    return current;
  }
  if (!force && current && current.status === "error" && current.lastAttempt && now - current.lastAttempt < FM_THROTTLE) {
    return current;
  }
  if (current && current.status === "loading") return current;

  fm.teams[id] = { ...(current || {}), status: "loading", error: null, lastAttempt: now };

  try {
    const payload = await fmGet("teams", { id }, 30000);
    const details = payload?.details || {};
    const squad = fmMapSquad(payload?.squad);
    const coachGroup = squad.find((group) => group.title === "coach");
    const coach = coachGroup && coachGroup.members.length ? coachGroup.members[0] : null;
    const fixtures = fmMapTeamFixtures(payload?.fixtures?.allFixtures?.fixtures);
    const lastLineup = fmMapLastLineup(payload?.overview?.lastLineupStats);
    const teamForm = fmMapTeamForm(payload?.overview?.teamForm);
    const squadSize = squad
      .filter((group) => group.title !== "coach")
      .reduce((total, group) => total + group.members.length, 0);

    const profile = {
      status: "ready",
      id,
      name: fmTeamName(details.name) || "",
      country: typeof arCountryName === "function" ? arCountryName(details.country) : (details.country || ""),
      logo: fmLogo({ id, name: details.name }),
      coach,
      squad,
      squadSize,
      lastLineup,
      teamForm,
      venue: payload?.overview?.venue?.name || "",
      leagueName: FM_LEAGUE_AR[Number(details.primaryLeagueId)]
        || (typeof arLeagueName === "function" ? arLeagueName(details.primaryLeagueName, details.country) : (details.primaryLeagueName || "")),
      fixtures,
      updatedAt: new Date().toISOString(),
      error: null
    };
    fm.teams[id] = profile;
    fmWriteTeamsCache(id, {
      name: profile.name,
      country: profile.country,
      logo: profile.logo,
      coach: profile.coach,
      squad: profile.squad,
      squadSize: profile.squadSize,
      lastLineup: profile.lastLineup,
      teamForm: profile.teamForm,
      venue: profile.venue,
      leagueName: profile.leagueName,
      fixtures: profile.fixtures.slice(-60),
      updatedAt: profile.updatedAt
    });
    refreshCurrentScreen();
    return profile;
  } catch (error) {
    const cached = fmReadTeamsCache()[id];
    if (cached && Array.isArray(cached.squad) && cached.squad.length) {
      fm.teams[id] = {
        status: "ready",
        id,
        name: cached.name || "",
        country: cached.country || "",
        logo: cached.logo || "",
        coach: cached.coach || null,
        squad: cached.squad,
        squadSize: cached.squadSize || 0,
        lastLineup: cached.lastLineup || null,
        teamForm: cached.teamForm || [],
        venue: cached.venue || "",
        leagueName: cached.leagueName || "",
        fixtures: cached.fixtures || [],
        updatedAt: cached.updatedAt,
        error: "تعذر تحديث بيانات الفريق — تُعرض آخر نسخة محفوظة.",
        stale: true
      };
      refreshCurrentScreen();
      return fm.teams[id];
    }
    fm.teams[id] = {
      status: "error",
      id,
      error: error && error.name === "AbortError"
        ? "انتهت مهلة الاتصال بمصدر FotMob."
        : (error && error.message) || "خطأ غير معروف"
    };
    refreshCurrentScreen();
    return fm.teams[id];
  }
}

function getFmTeam(teamId) {
  return fmState().teams[Number(teamId)] || null;
}

/* --------------------------------------------------------------------------
   التشكيلات (Lineups) — متاحة من FotMob
   -------------------------------------------------------------------------- */

function fmMapLineupSide(side) {
  if (!side) return null;
  const mapPlayers = (list) => (Array.isArray(list) ? list : []).map((player) => ({
    id: player.id,
    name: typeof arPlayerName === "function" ? arPlayerName(player.name) : (player.name || ""),
    shirtNumber: player.shirtNumber || "",
    positionId: player.positionId || null,
    positionDesc: player.positionIdsDesc || "",
    ccode: player.countryCode || "",
    rating: Number(player.performance?.rating) > 0 ? Number(player.performance.rating) : null,
    x: Number.isFinite(Number(player.verticalLayout?.x)) ? Number(player.verticalLayout.x) : null,
    y: Number.isFinite(Number(player.verticalLayout?.y)) ? Number(player.verticalLayout.y) : null,
    photo: fmPlayerPhoto(player.id)
  }));
  return {
    id: side.id,
    name: fmTeamName(side.name) || "",
    formation: side.formation || "",
    starters: mapPlayers(side.starters),
    subs: mapPlayers(side.subs)
  };
}

function fmSplitStatValues(raw) {
  let text = String(raw || "").replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim();
  if (!text) return [];
  /* FotMob قد يفصل القيمتين بفاصلة: "231 (75%),487 (87%)" */
  text = text.replace(/\)\s*,\s*/g, ") ");
  const withPercent = text.match(/^(.*?\([^)]*\))\s+(.+)$/);
  if (withPercent) return [withPercent[1].trim(), withPercent[2].trim()];
  if (!/\s/.test(text) && text.includes(",")) {
    return text.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return text.split(/\s+/).filter(Boolean);
}

function notifyNewGoals(previous, events, matchId) {
  if (!previous || previous.status !== "ready" || !Array.isArray(previous.events)) return;
  const route = state.route || {};
  if (route.name !== "match") return;
  const prevGoals = previous.events.filter((event) => event.type === "Goal");
  const nextGoals = (events || []).filter((event) => event.type === "Goal");
  if (!nextGoals.length) return;
  let fresh = [];
  if (prevGoals.some((event) => event.eventId)) {
    const seen = new Set(prevGoals.map((event) => event.eventId).filter(Boolean));
    fresh = nextGoals.filter((event) => event.eventId && !seen.has(event.eventId));
  } else if (nextGoals.length > prevGoals.length) {
    fresh = nextGoals.slice(prevGoals.length);
  }
  if (!fresh.length) return;
  const goal = fresh[fresh.length - 1];
  const minute = `${goal.minute}${goal.extra ? `+${goal.extra}` : ""}′`;
  const score = goal.score ? ` (${goal.score})` : "";
  if (typeof showToast === "function") {
    showToast(`هدف! ${goal.player || "لاعب"} ${minute}${score}`);
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(140); } catch { /* ignore */ }
  }
}

async function fetchFmLineups(matchId, options = {}) {
  const id = Number(matchId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const fm = fmState();
  const current = fm.lineups[id];
  const force = options.force === true;
  const now = Date.now();

  if (!force && current && current.status === "ready" && current.updatedAt
    && now - new Date(current.updatedAt).getTime() < FM_FRESH_MATCHES) {
    return current;
  }
  if (current && current.status === "loading") return current;

  fm.lineups[id] = { status: "loading", home: null, away: null, error: null };

  try {
    const payload = await fmGet("matchDetails", { matchId: id }, 30000);
    const liveHeader = payload?.header || null;
    if (liveHeader?.status) {
      const mapped = fmStatus({ status: liveHeader.status });
      const fixture = typeof getFixtureById === "function" ? getFixtureById(`fm-${id}`) : null;
      if (fixture) {
        fixture.statusShort = mapped.short;
        fixture.statusLong = mapped.long;
        fixture.elapsed = mapped.elapsed;
        fixture.clock = mapped.clock || "";
        fixture.clockAt = Date.now();
        const headerTeams = Array.isArray(liveHeader.teams) ? liveHeader.teams : [];
        if (mapped.started && headerTeams.length >= 2) {
          const hs = Number(headerTeams[0].score);
          const as = Number(headerTeams[1].score);
          fixture.goals = {
            home: Number.isFinite(hs) ? hs : null,
            away: Number.isFinite(as) ? as : null
          };
        }
      }
    }
    const lineup = payload?.content?.lineup || null;
    const h2h = payload?.content?.h2h?.matches;
    const rawEvents = payload?.content?.matchFacts?.events?.events;
    const events = (Array.isArray(rawEvents) ? rawEvents : [])
      .filter((event) => ["Goal", "Card", "Substitution", "Half", "AddedTime"].includes(event.type))
      .map((event) => ({
        type: event.type,
        eventId: event.eventId || null,
        minute: event.time,
        extra: event.overloadTime || null,
        side: event.isHome ? "home" : "away",
        player: typeof arPlayerName === "function"
          ? arPlayerName(event.player?.name || event.nameStr || "")
          : (event.player?.name || event.nameStr || ""),
        playerId: event.player?.id || event.playerId || null,
        assist: (() => {
          const raw = String(event.assistStr || "").replace(/^assist\s+by\s+/i, "").trim();
          if (!raw) return "";
          return typeof arPlayerName === "function" ? arPlayerName(raw) : raw;
        })(),
        card: event.card || "",
        ownGoal: Boolean(event.ownGoal),
        isPenalty: /penalty/i.test(String(event.goalDescription || "")),
        half: event.halfStrShort || "",
        swapIn: typeof arPlayerName === "function" ? arPlayerName(event.swap?.[0]?.name || "") : (event.swap?.[0]?.name || ""),
        swapOut: typeof arPlayerName === "function" ? arPlayerName(event.swap?.[1]?.name || "") : (event.swap?.[1]?.name || ""),
        score: Array.isArray(event.newScore) ? event.newScore.join(" - ") : ""
      }));
    const statGroups = payload?.content?.stats?.Periods?.All?.stats;
    const stats = (Array.isArray(statGroups) ? statGroups : []).map((group) => ({
      key: group.key || "",
      title: group.title || "",
      items: (Array.isArray(group.stats) ? group.stats : []).map((item) => ({
        key: item.key || "",
        title: item.title || "",
        values: fmSplitStatValues(item.stats),
        type: item.type || "text"
      }))
    }));
    if (!lineup?.homeTeam && !lineup?.awayTeam && !events.length && !stats.length) {
      throw new Error("المصدر لم يُرجع تشكيلاً أو أحداثاً لهذه المباراة بعد.");
    }
    const entry = {
      status: "ready",
      home: lineup?.homeTeam ? fmMapLineupSide(lineup.homeTeam) : null,
      away: lineup?.awayTeam ? fmMapLineupSide(lineup.awayTeam) : null,
      h2h: Array.isArray(h2h) ? h2h.slice(0, 12) : [],
      events,
      stats,
      updatedAt: new Date().toISOString(),
      error: null
    };
    fm.lineups[id] = entry;
    refreshCurrentScreen();
    notifyNewGoals(current, events, id);
    return entry;
  } catch (error) {
    fm.lineups[id] = {
      status: "error",
      home: null,
      away: null,
      error: error && error.name === "AbortError"
        ? "انتهت مهلة الاتصال بمصدر FotMob."
        : (error && error.message) || "خطأ غير معروف"
    };
    refreshCurrentScreen();
    return fm.lineups[id];
  }
}

function getFmLineups(matchId) {
  return fmState().lineups[Number(matchId)] || null;
}

/* --------------------------------------------------------------------------
   التحديث المباشر — كل 45 ثانية + عند العودة للتطبيق
   -------------------------------------------------------------------------- */

let fmLiveTimer = null;
let fmLiveCompId = null;

function fmStartLive(comp) {
  fmStopLive();
  if (!comp) return;
  fmLiveCompId = comp.id;
  fmLiveTimer = setInterval(() => {
    const route = state.route || {};
    if (route.name !== "competition" || route.id !== fmLiveCompId) {
      fmStopLive();
      return;
    }
    if (typeof document !== "undefined" && document.hidden) return;
    fmRefreshStandingsLive(comp);
  }, 45 * 1000);
}

function fmStopLive() {
  if (fmLiveTimer) clearInterval(fmLiveTimer);
  fmLiveTimer = null;
  fmLiveCompId = null;
}

/* تحديث مجريات المباراة المفتوحة أثناء سيرها */
let fmMatchTimer = null;
let fmMatchRouteId = null;

function fmWatchMatch(fixture) {
  fmStopMatchWatch();
  if (!fixture || fixture.source !== "fotmob" || !fixture.fmId) return;
  fmMatchRouteId = String(fixture.id);
  fmMatchTimer = setInterval(() => {
    const route = state.route || {};
    if (route.name !== "match" || String(route.id) !== fmMatchRouteId) {
      fmStopMatchWatch();
      return;
    }
    if (typeof document !== "undefined" && document.hidden) return;
    fetchFmLineups(fixture.fmId, { force: true });
  }, 20 * 1000);
}

function fmStopMatchWatch() {
  if (fmMatchTimer) clearInterval(fmMatchTimer);
  fmMatchTimer = null;
  fmMatchRouteId = null;
}

/* --------------------------------------------------------------------------
   الأخبار — FotMob العربي (مصدر مباشر بلا مفتاح)
   -------------------------------------------------------------------------- */
const FM_NEWS_BASE = "https://www.fotmob.com";

function fmNewsArticle(item) {
  const raw = String(item?.page?.url || "");
  const url = /^https?:/i.test(raw) ? raw : raw ? `${FM_NEWS_BASE}${raw}` : "";
  return {
    id: String(item?.id || url),
    title: String(item?.title || "").trim(),
    lead: String(item?.lead || "").trim(),
    image: String(item?.imageUrl || ""),
    url,
    publishedAt: item?.gmtTime || null,
    source: { name: item?.sourceStr || "FotMob" }
  };
}

async function fetchFmNews(options = {}) {
  const force = options.force === true;
  const current = state.fmNews || { status: "idle", trending: [], latest: [], error: null, updatedAt: null };
  const fresh = current.updatedAt && Date.now() - new Date(current.updatedAt).getTime() < 4 * 60 * 1000;
  if (!force && current.status === "ready" && fresh) return current;
  if (current.status === "loading") return current;

  state.fmNews = { ...current, status: "loading", error: null };
  refreshCurrentScreen();

  const getJson = async (url) => {
    const response = await fetchWithTimeout(url, { mode: "cors", headers: { Accept: "application/json" } }, 22000);
    if (!response.ok) throw new Error(`تعذر الاتصال بأخبار FotMob (HTTP ${response.status})`);
    return response.json();
  };

  try {
    const results = await Promise.allSettled([
      getJson(`${FM_NEWS_BASE}/api/trendingnews?lang=ar`),
      getJson(`${FM_NEWS_BASE}/api/news/latestNews?startIndex=0&lang=ar&page=1`)
    ]);
    const pick = (index) => results[index].status === "fulfilled" && Array.isArray(results[index].value)
      ? results[index].value.map(fmNewsArticle).filter((item) => item.title && item.url)
      : [];
    const trending = pick(0);
    const latest = pick(1);
    if (!trending.length && !latest.length) {
      const reason = results.find((item) => item.status === "rejected");
      throw new Error(reason?.reason?.message || "لم يرجع مصدر FotMob أي أخبار الآن.");
    }
    state.fmNews = {
      status: "ready",
      trending,
      latest,
      error: null,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    state.fmNews = {
      status: "error",
      trending: current.trending || [],
      latest: current.latest || [],
      error: error?.name === "AbortError" ? "انتهت مهلة الاتصال بأخبار FotMob." : error.message || "خطأ غير معروف",
      updatedAt: current.updatedAt || null
    };
  }
  refreshCurrentScreen();
}

/* --------------------------------------------------------------------------
   كل البطولات — قائمة FotMob الكاملة (دوريات، كؤوس، بطولات دولية)
   -------------------------------------------------------------------------- */
const FM_ALL_LEAGUES_CACHE = "wasl.fm.allLeagues.v2";
const FM_ALL_LEAGUES_TTL = 24 * 60 * 60 * 1000;

function fmAllLeaguesState() {
  const fm = fmState();
  if (!fm.allLeagues) {
    fm.allLeagues = { status: "idle", countries: [], international: null, popular: [], error: null, updatedAt: null };
  }
  return fm.allLeagues;
}

/* قائمة موحّدة: الدول + البطولات الدولية + الأكثر شعبية (بلا تكرار) */
function fmAllLeagueEntries(entry) {
  const source = entry || fmAllLeaguesState();
  const seen = new Set();
  const list = [];
  const push = (league, countryCode, countryName) => {
    const id = Number(league?.id);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
    seen.add(id);
    list.push({
      id,
      name: String(league.name || ""),
      countryCode: String(league.ccode || countryCode || ""),
      countryName: String(countryName || ""),
      pageUrl: String(league.pageUrl || "")
    });
  };

  (source.countries || []).forEach((country) => {
    (country.leagues || []).forEach((league) => push(league, country.ccode, country.localizedName || country.name));
  });
  const international = source.international;
  if (international) {
    (international.leagues || []).forEach((league) => push(league, "INT", "دولي"));
  }
  (source.popular || []).forEach((league) => push(league, league.ccode, ""));
  return list;
}

async function fetchFmAllLeagues(options = {}) {
  const force = options.force === true;
  const entry = fmAllLeaguesState();
  const fresh = entry.updatedAt && Date.now() - new Date(entry.updatedAt).getTime() < FM_ALL_LEAGUES_TTL;
  if (!force && entry.status === "ready" && fresh) return entry;
  if (entry.status === "loading") return entry;

  if (!force && !(entry.countries || []).length) {
    const cached = readJSON(FM_ALL_LEAGUES_CACHE, null);
    if (cached && Array.isArray(cached.countries) && cached.countries.length
      && cached.international && Array.isArray(cached.international.leagues)) {
      const fm = fmState();
      fm.allLeagues = {
        status: "ready",
        countries: cached.countries,
        international: cached.international || null,
        popular: Array.isArray(cached.popular) ? cached.popular : [],
        error: null,
        updatedAt: cached.updatedAt || null
      };
      refreshCurrentScreen();
      return fm.allLeagues;
    }
  }

  entry.status = "loading";
  entry.error = null;
  refreshCurrentScreen();

  try {
    const response = await fetchWithTimeout(
      `${FM_BASE}/allLeagues`,
      { mode: "cors", headers: { Accept: "application/json" } },
      25000
    );
    if (!response.ok) throw new Error(`تعذر تحميل البطولات من FotMob (HTTP ${response.status})`);
    const data = await response.json();
    const countries = Array.isArray(data?.countries) ? data.countries : [];
    const intlRaw = Array.isArray(data?.international) ? data.international[0] : data?.international;
    const international = intlRaw && Array.isArray(intlRaw.leagues) ? intlRaw : null;
    const popular = Array.isArray(data?.popular) ? data.popular : [];
    if (!countries.length && !international) throw new Error("لم يرجع مصدر FotMob أي بطولات الآن.");

    const updatedAt = new Date().toISOString();
    const fm = fmState();
    fm.allLeagues = { status: "ready", countries, international, popular, error: null, updatedAt };
    writeJSON(FM_ALL_LEAGUES_CACHE, { countries, international, popular, updatedAt });
  } catch (error) {
    const fm = fmState();
    fm.allLeagues = {
      status: entry.countries?.length ? "ready" : "error",
      countries: entry.countries || [],
      international: entry.international || null,
      popular: entry.popular || [],
      error: error?.name === "AbortError" ? "انتهت مهلة الاتصال بمصدر البطولات." : error.message || "خطأ غير معروف",
      updatedAt: entry.updatedAt || null
    };
  }
  refreshCurrentScreen();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    const route = state.route || {};
    if (route.name === "competition" && route.id) {
      const comp = getCompetitionById(route.id);
      if (comp) fmRefreshStandingsLive(comp);
    }
    if (route.name === "match" && route.id) {
      const fixture = getFixtureById(route.id);
      if (fixture && fixture.source === "fotmob") fetchFmLineups(fixture.fmId, { force: true });
    }
    if (route.name === "matches") loadFmMatches(state.ui.matchDay);
  });
}
