/* ==========================================================================
   طبقة البيانات: API-Football للمباريات والترتيب، GNews للأخبار
   لا يتم توليد أي نتيجة محلياً. كل البيانات تأتي من مزود مربوط.
   ========================================================================== */
"use strict";

async function fetchWithTimeout(url, options = {}, timeout = 14000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function apiHeaders() {
  const headers = { Accept: "application/json" };
  if (state.settings.apiKey.trim()) headers["x-apisports-key"] = state.settings.apiKey.trim();
  return headers;
}

function providerError(payload) {
  const errors = payload?.errors;
  if (!errors) return "";
  if (Array.isArray(errors) && errors.length) return errors.join(" — ");
  if (typeof errors === "object" && Object.keys(errors).length) {
    return Object.entries(errors).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" — ");
  }
  return "";
}

function mapFixture(item) {
  const fixture = item.fixture || {};
  const league = item.league || {};
  const teams = item.teams || {};
  const goals = item.goals || {};
  return {
    id: fixture.id || `${teams.home?.id}-${teams.away?.id}-${fixture.date}`,
    date: fixture.date,
    timestamp: fixture.timestamp,
    statusShort: fixture.status?.short || "NS",
    statusLong: fixture.status?.long || "",
    elapsed: fixture.status?.elapsed,
    league: {
      id: league.id,
      name: league.name || "بطولة",
      logo: league.logo || "",
      country: league.country || "",
      round: league.round || ""
    },
    home: {
      id: teams.home?.id,
      name: teams.home?.name || "الفريق الأول",
      logo: teams.home?.logo || "",
      winner: teams.home?.winner
    },
    away: {
      id: teams.away?.id,
      name: teams.away?.name || "الفريق الثاني",
      logo: teams.away?.logo || "",
      winner: teams.away?.winner
    },
    goals: {
      home: goals.home,
      away: goals.away
    },
    venue: fixture.venue?.name || ""
  };
}

function liveScoreMap(fixtures) {
  const map = {};
  fixtures.filter(isLiveFixture).forEach((fixture) => {
    map[fixture.id] = `${fixture.goals?.home ?? "-"}:${fixture.goals?.away ?? "-"}`;
  });
  return map;
}

async function fetchMatchesForDate(date = state.ui.matchDay, options = {}) {
  if (!state.settings.apiKey.trim()) {
    if (state.settings.openFootball) {
      await loadOpenFootballData(options);
      applyOpenFootballDate(date);
      refreshCurrentScreen();
    }
    return;
  }
  if (state.matches.status === "loading") return;
  const force = options.force === true;
  if (!force && state.matches.date === date && state.matches.status === "ready" && state.matches.updatedAt) {
    const age = Date.now() - new Date(state.matches.updatedAt).getTime();
    if (age < CACHE_TTL) return;
  }
  if (!force && state.matches.date === date && state.matches.status === "error" && state.matches.lastAttempt && Date.now() - state.matches.lastAttempt < 30000) {
    return;
  }

  const oldScores = liveScoreMap(state.matches.fixtures || []);
  state.matches.status = "loading";
  state.matches.date = date;
  state.matches.error = null;
  state.matches.lastAttempt = Date.now();
  refreshCurrentScreen();

  try {
    const base = (state.settings.apiBase || API_FOOTBALL_DEFAULT).replace(/\/+$/, "");
    const url = new URL(`${base}/fixtures`);
    url.searchParams.set("date", date);
    url.searchParams.set("timezone", "Asia/Riyadh");
    const response = await fetchWithTimeout(url.toString(), { headers: apiHeaders() });
    if (!response.ok) throw new Error(`تعذر الاتصال (HTTP ${response.status})`);
    const payload = await response.json();
    const errors = providerError(payload);
    if (errors) throw new Error(errors);
    const fixtures = Array.isArray(payload.response) ? payload.response.map(mapFixture) : [];
    fixtures.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!fixtures.length && state.settings.openFootball) {
      await loadOpenFootballData(options);
      applyOpenFootballDate(date);
      return;
    }

    state.matches = {
      status: "ready",
      source: "api",
      sourceLabel: "API-Football",
      fixtures,
      nextFixtures: [],
      error: null,
      updatedAt: new Date().toISOString(),
      date,
      lastAttempt: Date.now()
    };
    writeJSON(KEYS.matchCache, { ...state.matches, savedAt: Date.now() });

    const newScores = liveScoreMap(fixtures);
    Object.keys(newScores).forEach((id) => {
      if (oldScores[id] && oldScores[id] !== newScores[id]) {
        const fixture = fixtures.find((item) => item.id === id);
        if (fixture) {
          addNotification(
            "تحديث مباشر",
            `${fixture.home.name} ${newScores[id].replace(":", " - ")} ${fixture.away.name}`,
            "match"
          );
        }
      }
    });
  } catch (error) {
    state.matches.status = "error";
    state.matches.error = error?.name === "AbortError" ? "انتهت مهلة الاتصال. تحقق من الشبكة." : error.message || "خطأ غير معروف";
    if (state.settings.openFootball) {
      await loadOpenFootballData(options);
      applyOpenFootballDate(date);
    }
  }
  if (typeof mergeS365Matches === "function") mergeS365Matches();
  refreshCurrentScreen();
}

async function fetchStandingsForCompetition(comp, options = {}) {
  if (!comp) return;
  if (typeof fmLeagueId === "function" && fmLeagueId(comp) && typeof fetchFmStandings === "function") {
    return fetchFmStandings(comp, options);
  }
  if (comp.s365Id && typeof fetchS365Standings === "function") {
    return fetchS365Standings(comp, options);
  }
  if (comp.id === "yemen" && typeof fetchS365Standings === "function") {
    return fetchS365Standings(comp, options);
  }
  if (!state.settings.apiKey.trim()) return;
  const current = state.standings[comp.id];
  if (current?.status === "loading") return;
  const force = options.force === true;
  if (!force && current?.status === "ready" && current.updatedAt && Date.now() - new Date(current.updatedAt).getTime() < CACHE_TTL) {
    return;
  }
  if (!force && current?.status === "error" && current.lastAttempt && Date.now() - current.lastAttempt < 30000) {
    return;
  }

  const cache = readJSON(KEYS.standingsCache, {});
  const cached = cache[comp.id];
  if (!force && cached && cached.season === state.settings.season && Date.now() - cached.updatedAt < CACHE_TTL && Array.isArray(cached.rows)) {
    state.standings[comp.id] = { status: "ready", rows: cached.rows, updatedAt: cached.updatedAt, error: null, lastAttempt: Date.now() };
    refreshCurrentScreen();
    return;
  }

  state.standings[comp.id] = { status: "loading", rows: [], error: null, lastAttempt: Date.now() };
  refreshCurrentScreen();

  try {
    const base = (state.settings.apiBase || API_FOOTBALL_DEFAULT).replace(/\/+$/, "");
    const url = new URL(`${base}/standings`);
    url.searchParams.set("league", String(comp.apiId));
    url.searchParams.set("season", String(state.settings.season || comp.season));
    const response = await fetchWithTimeout(url.toString(), { headers: apiHeaders() });
    if (!response.ok) throw new Error(`تعذر الاتصال (HTTP ${response.status})`);
    const payload = await response.json();
    const errors = providerError(payload);
    if (errors) throw new Error(errors);
    const leagueData = payload.response?.[0]?.league;
    const group = leagueData?.standings?.[0] || [];
    const rows = group.map((row) => ({
      rank: row.rank,
      name: row.team?.name || "فريق",
      logo: row.team?.logo || "",
      points: row.points ?? 0,
      played: row.all?.played ?? 0,
      win: row.all?.win ?? 0,
      draw: row.all?.draw ?? 0,
      lose: row.all?.lose ?? 0,
      goalsFor: row.all?.goals?.for ?? 0,
      goalsAgainst: row.all?.goals?.against ?? 0,
      goalsDiff: row.goalsDiff ?? 0
    }));
    const updatedAt = new Date().toISOString();
    state.standings[comp.id] = { status: "ready", rows, updatedAt, error: null, lastAttempt: Date.now() };
    const nextCache = readJSON(KEYS.standingsCache, {});
    nextCache[comp.id] = { rows, updatedAt, season: state.settings.season };
    writeJSON(KEYS.standingsCache, nextCache);
  } catch (error) {
    state.standings[comp.id] = {
      status: "error",
      rows: [],
      error: error?.name === "AbortError" ? "انتهت مهلة الاتصال." : error.message || "خطأ غير معروف",
      lastAttempt: Date.now()
    };
  }
  refreshCurrentScreen();
}

async function fetchNewsFeed(options = {}) {
  if (!state.settings.newsKey.trim()) return;
  if (state.newsFeed.status === "loading") return;
  const force = options.force === true;
  if (!force && state.newsFeed.status === "ready" && state.newsFeed.updatedAt && Date.now() - new Date(state.newsFeed.updatedAt).getTime() < CACHE_TTL) {
    return;
  }
  if (!force && state.newsFeed.status === "error" && state.newsFeed.lastAttempt && Date.now() - state.newsFeed.lastAttempt < 30000) {
    return;
  }

  state.newsFeed.status = "loading";
  state.newsFeed.error = null;
  state.newsFeed.lastAttempt = Date.now();
  refreshCurrentScreen();

  try {
    const url = new URL(`${GNEWS_DEFAULT}/search`);
    url.searchParams.set("q", state.settings.newsQuery || "كرة القدم");
    url.searchParams.set("lang", "ar");
    url.searchParams.set("max", "10");
    url.searchParams.set("apikey", state.settings.newsKey.trim());
    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) throw new Error(`تعذر الاتصال (HTTP ${response.status})`);
    const payload = await response.json();
    if (Array.isArray(payload.errors) && payload.errors.length) throw new Error(payload.errors.join(" — "));
    const articles = Array.isArray(payload.articles)
      ? payload.articles.map((item) => ({
          title: item.title,
          description: item.description,
          url: item.url,
          image: item.image,
          publishedAt: item.publishedAt,
          source: { name: item.source?.name || "مصدر إخباري" }
        }))
      : [];
    state.newsFeed = { status: "ready", articles, error: null, updatedAt: new Date().toISOString(), lastAttempt: Date.now() };
    writeJSON(KEYS.newsCache, { ...state.newsFeed, savedAt: Date.now() });
  } catch (error) {
    state.newsFeed.status = "error";
    state.newsFeed.error = error?.name === "AbortError" ? "انتهت مهلة الاتصال. تحقق من الشبكة." : error.message || "خطأ غير معروف";
  }
  refreshCurrentScreen();
}

async function testSourcesFromForm(form) {
  const apiKey = form?.querySelector('[name="apiKey"]')?.value?.trim() || state.settings.apiKey.trim();
  const apiBase = form?.querySelector('[name="apiBase"]')?.value?.trim() || state.settings.apiBase;
  const newsKey = form?.querySelector('[name="newsKey"]')?.value?.trim() || state.settings.newsKey.trim();
  const results = [];
  state.ui.sourceTest = { ok: false, message: "جارٍ اختبار الاتصال..." };
  refreshCurrentScreen();

  if (apiKey) {
    try {
      const url = `${(apiBase || API_FOOTBALL_DEFAULT).replace(/\/+$/, "")}/status`;
      const response = await fetchWithTimeout(url, { headers: { Accept: "application/json", "x-apisports-key": apiKey } }, 12000);
      const payload = await response.json();
      const errors = providerError(payload);
      if (!response.ok || errors) throw new Error(errors || `HTTP ${response.status}`);
      const subscription = payload.response?.subscription || {};
      const requests = payload.response?.requests || {};
      results.push(`API-Football: متصل ✓ (${subscription.plan || "خطة غير معروفة"}، ${requests.current ?? "?"}/${requests.limit_day ?? "?"} طلب اليوم)`);
    } catch (error) {
      results.push(`API-Football: فشل — ${error.message}`);
    }
  } else {
    results.push("API-Football: لا يوجد مفتاح");
  }

  if (newsKey) {
    try {
      const url = new URL(`${GNEWS_DEFAULT}/search`);
      url.searchParams.set("q", state.settings.newsQuery || "كرة القدم");
      url.searchParams.set("lang", "ar");
      url.searchParams.set("max", "1");
      url.searchParams.set("apikey", newsKey);
      const response = await fetchWithTimeout(url.toString(), {}, 12000);
      const payload = await response.json();
      if (!response.ok || (Array.isArray(payload.errors) && payload.errors.length)) {
        throw new Error((payload.errors || []).join(" — ") || `HTTP ${response.status}`);
      }
      results.push("GNews: متصل ✓");
    } catch (error) {
      results.push(`GNews: فشل — ${error.message}`);
    }
  } else {
    results.push("GNews: لا يوجد مفتاح (اختياري)");
  }

  try {
    const comp = state.data.competitions.find((item) => item.openKey);
    const response = await fetchWithTimeout(openFootballUrl(comp), { headers: { Accept: "application/json" } }, 16000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    results.push(`OpenFootball: متصل ✓ (${Array.isArray(payload.matches) ? payload.matches.length : 0} مباراة)`);
  } catch (error) {
    results.push(`OpenFootball: فشل — ${error.message}`);
  }

  try {
    const response = await fetchWithTimeout(`${YUMI_API}?day=today`, { headers: { Accept: "application/json" } }, 12000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload?.success) throw new Error("استجابة غير صالحة");
    results.push(`Yumi Sports: متصل ✓ (${Array.isArray(payload.matches) ? payload.matches.length : 0} مباراة)`);
  } catch (error) {
    results.push(`Yumi Sports: فشل — ${error.message}`);
  }

  const ok = results.some((line) => line.includes("متصل ✓")) && !results.some((line) => line.includes("فشل"));
  state.ui.sourceTest = { ok, message: results.join(" · ") };
  refreshCurrentScreen();
  showToast(ok ? "اكتمل اختبار الاتصال" : "بعض المصادر لم تتصل — راجع الرسالة", ok ? "" : "error");
}

/* --------------------------------------------------------------------------
   OpenFootball — مصدر مفتوح لنتائج ومواعيد الدوريات الخمسة الكبرى
   https://github.com/openfootball/football.json
   -------------------------------------------------------------------------- */
function slugId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function openFootballUrl(comp) {
  if (!comp?.openKey) return "";
  return `${OPEN_FOOTBALL_BASE}/${OPEN_FOOTBALL_SEASON}/${comp.openKey}.json`;
}

function mapOpenFixture(item, comp) {
  const date = item.date;
  const time = item.time || "00:00";
  const iso = `${date}T${time}:00`;
  const ft = Array.isArray(item.score?.ft) && item.score.ft.length === 2 ? item.score.ft : null;
  const today = getTodayISO();
  const statusShort = ft ? "FT" : date < today ? "UNK" : "NS";
  const homeName = teamNameAr(item.team1);
  const awayName = teamNameAr(item.team2);
  return {
    id: `of-${comp.id}-${date}-${slugId(item.team1)}-${slugId(item.team2)}`,
    source: "openfootball",
    sourceLabel: "OpenFootball",
    date: iso,
    timestamp: new Date(iso).getTime(),
    statusShort,
    statusLong: ft ? "انتهت" : date < today ? "النتيجة غير متاحة" : "لم تبدأ",
    elapsed: null,
    league: {
      id: comp.id,
      appId: comp.id,
      name: comp.name,
      logo: "",
      country: comp.country,
      round: item.round || ""
    },
    home: {
      id: `of-${slugId(item.team1)}`,
      name: homeName,
      rawName: item.team1,
      logo: "",
      winner: ft ? (ft[0] > ft[1] ? true : ft[0] < ft[1] ? false : null) : undefined
    },
    away: {
      id: `of-${slugId(item.team2)}`,
      name: awayName,
      rawName: item.team2,
      logo: "",
      winner: ft ? (ft[1] > ft[0] ? true : ft[1] < ft[0] ? false : null) : undefined
    },
    goals: { home: ft ? ft[0] : null, away: ft ? ft[1] : null },
    venue: "",
    raw: { team1: item.team1, team2: item.team2, score: item.score || null, round: item.round || "" }
  };
}

async function loadOpenFootballLeague(comp, options = {}) {
  if (!comp?.openKey || !state.settings.openFootball) return;
  const force = options.force === true;
  const silent = options.silent === true;
  const cache = readJSON(KEYS.openFootball, {});
  const cached = cache[comp.id];
  if (!force && cached && Array.isArray(cached.matches) && Date.now() - (cached.savedAt || 0) < OPEN_CACHE_TTL) {
    state.openFootball.leagues[comp.id] = {
      status: "ready",
      matches: cached.matches,
      updatedAt: cached.updatedAt || null,
      savedAt: cached.savedAt || 0,
      error: null
    };
    return;
  }

  state.openFootball.leagues[comp.id] = {
    status: "loading",
    matches: Array.isArray(cached?.matches) ? cached.matches : [],
    updatedAt: cached?.updatedAt || null,
    savedAt: cached?.savedAt || 0,
    error: null
  };
  if (!silent) refreshCurrentScreen();

  try {
    const response = await fetchWithTimeout(openFootballUrl(comp), { headers: { Accept: "application/json" } }, 20000);
    if (!response.ok) throw new Error(`تعذر تحميل البيانات المفتوحة (HTTP ${response.status})`);
    const payload = await response.json();
    if (!Array.isArray(payload?.matches)) throw new Error("صيغة بيانات OpenFootball غير متوقعة");
    const matches = payload.matches.map((item) => mapOpenFixture(item, comp)).sort((a, b) => new Date(a.date) - new Date(b.date));
    const updatedAt = new Date().toISOString();
    const savedAt = Date.now();
    state.openFootball.leagues[comp.id] = { status: "ready", matches, updatedAt, savedAt, error: null };
    const nextCache = readJSON(KEYS.openFootball, {});
    nextCache[comp.id] = { matches, updatedAt, savedAt, season: OPEN_FOOTBALL_SEASON };
    writeJSON(KEYS.openFootball, nextCache);
  } catch (error) {
    const fallback = Array.isArray(cached?.matches) ? cached.matches : [];
    state.openFootball.leagues[comp.id] = {
      status: fallback.length ? "ready" : "error",
      matches: fallback,
      updatedAt: cached?.updatedAt || null,
      savedAt: cached?.savedAt || 0,
      error: error?.name === "AbortError" ? "انتهت مهلة تحميل البيانات المفتوحة." : error.message || "تعذر تحميل البيانات المفتوحة"
    };
  }
  if (!silent) refreshCurrentScreen();
}

async function loadOpenFootballData(options = {}) {
  if (!state.settings.openFootball) return;
  if (state.openFootball.status === "loading") return;
  const comps = state.data.competitions.filter((comp) => comp.openKey);
  if (!comps.length) return;

  state.openFootball.status = "loading";
  state.openFootball.error = null;
  refreshCurrentScreen();

  await Promise.allSettled(comps.map((comp) => loadOpenFootballLeague(comp, { ...options, silent: true })));

  const entries = comps.map((comp) => state.openFootball.leagues[comp.id]).filter(Boolean);
  const ready = entries.filter((entry) => entry.status === "ready" && entry.matches.length);
  state.openFootball.status = ready.length ? "ready" : "error";
  state.openFootball.updatedAt = new Date().toISOString();
  state.openFootball.error = ready.length
    ? null
    : entries.find((entry) => entry.error)?.error || "تعذر تحميل البيانات المفتوحة. تحقق من الاتصال.";
  if (!state.settings.apiKey.trim()) applyOpenFootballDate(state.matches.date || getTodayISO());
  refreshCurrentScreen();
}

function applyOpenFootballDate(date) {
  if (!state.settings.openFootball) return;
  if (typeof fmActive === "function" && fmActive()) return;
  const comps = state.data.competitions.filter((comp) => comp.openKey);
  const all = comps.flatMap((comp) => state.openFootball.leagues[comp.id]?.matches || []);
  if (!all.length) {
    state.matches = {
      status: state.openFootball.status === "loading" ? "loading" : "error",
      source: "openfootball",
      sourceLabel: "OpenFootball",
      fixtures: [],
      nextFixtures: [],
      recentFixtures: [],
      error: state.openFootball.error || "لا توجد بيانات مفتوحة محملة بعد.",
      updatedAt: state.openFootball.updatedAt,
      date,
      lastAttempt: Date.now()
    };
    return;
  }

  const fixtures = all.filter((fixture) => String(fixture.date).slice(0, 10) === date);
  const nextFixtures = all
    .filter((fixture) => String(fixture.date).slice(0, 10) > date && fixture.statusShort === "NS")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);
  const recentFixtures = all
    .filter((fixture) => String(fixture.date).slice(0, 10) < date && fixture.goals?.home !== null && fixture.goals?.home !== undefined)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  state.matches = {
    status: "ready",
    source: "openfootball",
    sourceLabel: "OpenFootball",
    fixtures,
    nextFixtures,
    recentFixtures,
    error: null,
    updatedAt: state.openFootball.updatedAt || new Date().toISOString(),
    date,
    lastAttempt: Date.now()
  };
}

function computeOpenStandings(comp) {
  if (!comp) return [];
  const matches = getOpenMatches(comp.id);
  const table = new Map();
  const ensure = (raw) => {
    const key = normalizeTeamName(raw);
    if (!table.has(key)) {
      table.set(key, {
        name: teamNameAr(raw),
        raw,
        played: 0,
        win: 0,
        draw: 0,
        lose: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        form: []
      });
    }
    return table.get(key);
  };

  matches.forEach((fixture) => {
    const ft = fixture.raw?.score?.ft;
    if (!Array.isArray(ft) || ft.length !== 2) return;
    const home = ensure(fixture.raw.team1);
    const away = ensure(fixture.raw.team2);
    const [hg, ag] = ft;
    home.played += 1;
    away.played += 1;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;
    if (hg > ag) {
      home.win += 1;
      away.lose += 1;
      home.points += 3;
      home.form.push("W");
      away.form.push("L");
    } else if (hg < ag) {
      away.win += 1;
      home.lose += 1;
      away.points += 3;
      away.form.push("W");
      home.form.push("L");
    } else {
      home.draw += 1;
      away.draw += 1;
      home.points += 1;
      away.points += 1;
      home.form.push("D");
      away.form.push("D");
    }
  });

  const rows = [...table.values()].map((row) => ({
    ...row,
    goalsDiff: row.goalsFor - row.goalsAgainst,
    form: row.form.slice(-5)
  }));
  rows.sort((a, b) => b.points - a.points || b.goalsDiff - a.goalsDiff || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name, "ar"));
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

function poissonProb(goals, lambda) {
  let factorial = 1;
  for (let i = 2; i <= goals; i += 1) factorial *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, goals)) / factorial;
}

function statisticalPrediction(fixture, comp) {
  if (!fixture || !comp) return null;
  const table = computeOpenStandings(comp);
  const homeKey = normalizeTeamName(fixture.home?.rawName || fixture.home?.name);
  const awayKey = normalizeTeamName(fixture.away?.rawName || fixture.away?.name);
  const home = table.find((row) => normalizeTeamName(row.raw) === homeKey || normalizeTeamName(row.name) === homeKey);
  const away = table.find((row) => normalizeTeamName(row.raw) === awayKey || normalizeTeamName(row.name) === awayKey);
  if (!home || !away || home.played < 3 || away.played < 3) return null;

  const played = getOpenMatches(comp.id).filter((item) => Array.isArray(item.raw?.score?.ft));
  const total = played.length || 1;
  const avgHome = played.reduce((sum, item) => sum + item.raw.score.ft[0], 0) / total || 1.45;
  const avgAway = played.reduce((sum, item) => sum + item.raw.score.ft[1], 0) / total || 1.15;
  const homeAttack = (home.goalsFor / home.played) / (avgHome || 1.4);
  const homeDefense = (home.goalsAgainst / home.played) / (avgAway || 1.15);
  const awayAttack = (away.goalsFor / away.played) / (avgAway || 1.15);
  const awayDefense = (away.goalsAgainst / away.played) / (avgHome || 1.4);
  const lambdaHome = clamp(homeAttack * awayDefense * avgHome, 0.2, 4.5);
  const lambdaAway = clamp(awayAttack * homeDefense * avgAway, 0.2, 4.5);

  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  for (let h = 0; h <= 7; h += 1) {
    for (let a = 0; a <= 7; a += 1) {
      const probability = poissonProb(h, lambdaHome) * poissonProb(a, lambdaAway);
      if (h > a) pHome += probability;
      else if (h < a) pAway += probability;
      else pDraw += probability;
    }
  }
  const sum = pHome + pDraw + pAway || 1;
  return {
    source: "openfootball",
    home: pHome / sum,
    draw: pDraw / sum,
    away: pAway / sum,
    lambdaHome,
    lambdaAway,
    homeForm: home.form,
    awayForm: away.form,
    sample: Math.min(home.played, away.played)
  };
}

/* --------------------------------------------------------------------------
   Yumi Sports — البث المباشر وروابط المشاهدة
   -------------------------------------------------------------------------- */
function yumiDayDate(day) {
  const today = getTodayISO();
  if (day === "tomorrow") return addDaysISO(today, 1);
  if (day === "yesterday") return addDaysISO(today, -1);
  return today;
}

function yumiAbsolute(path) {
  if (!path) return "";
  const value = String(path);
  return value.startsWith("http") ? value : `${YUMI_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
}

function mapYumiMatch(item, day) {
  const status = String(item.status || "").toLowerCase();
  const statusShort = status === "live" ? "LIVE" : status === "finished" ? "FT" : "NS";
  const homeScore = Number.parseInt(item.score_home, 10);
  const awayScore = Number.parseInt(item.score_away, 10);
  const hasScore = Number.isFinite(homeScore) && Number.isFinite(awayScore) && (status === "live" || status === "finished");
  const date = yumiDayDate(day);
  return {
    id: `yumi-${day}-${item.id}`,
    source: "yumi",
    sourceLabel: "Yumi Sports",
    date: `${date}T${item.time || "00:00"}:00`,
    timestamp: new Date(`${date}T${item.time || "00:00"}:00`).getTime(),
    statusShort,
    statusLong: item.status_text || (statusShort === "LIVE" ? "مباشر" : statusShort === "FT" ? "انتهت" : "لم تبدأ"),
    elapsed: null,
    league: {
      id: `yumi-${slugId(item.league || "yumi")}`,
      appId: null,
      name: item.league || "Yumi Sports",
      logo: "",
      country: "",
      round: ""
    },
    home: { id: `yumi-home-${item.id}`, name: item.home_team || "الفريق الأول", logo: yumiAbsolute(item.home_logo) },
    away: { id: `yumi-away-${item.id}`, name: item.away_team || "الفريق الثاني", logo: yumiAbsolute(item.away_logo) },
    goals: { home: hasScore ? homeScore : null, away: hasScore ? awayScore : null },
    venue: "",
    channel: item.channel && item.channel !== "غير معروف" ? item.channel : "",
    commentator: item.commentator && item.commentator !== "غير معروف" ? item.commentator : "",
    watchUrl: `${YUMI_BASE}/match/${day}/${item.id}/`
  };
}

async function fetchYumiMatches(day = state.ui.yumiDay, options = {}) {
  if (!state.settings.yumi) return;
  const normalizedDay = ["today", "tomorrow", "yesterday"].includes(day) ? day : "today";
  const force = options.force === true;
  const cache = readJSON(KEYS.yumi, {});
  const cached = cache[normalizedDay];
  if (!force && cached && Date.now() - (cached.savedAt || 0) < YUMI_CACHE_TTL && state.yumi.day === normalizedDay) {
    return;
  }
  if (!force && state.yumi.status === "loading" && state.yumi.day === normalizedDay) return;

  state.yumi = {
    status: "loading",
    day: normalizedDay,
    matches: Array.isArray(cached?.matches) ? cached.matches : state.yumi.day === normalizedDay ? state.yumi.matches : [],
    error: null,
    updatedAt: cached?.updatedAt || null,
    savedAt: cached?.savedAt || 0
  };
  refreshCurrentScreen();

  try {
    const response = await fetchWithTimeout(`${YUMI_API}?day=${encodeURIComponent(normalizedDay)}`, { headers: { Accept: "application/json" } }, 16000);
    if (!response.ok) throw new Error(`تعذر الاتصال بـ Yumi Sports (HTTP ${response.status})`);
    const payload = await response.json();
    if (!payload?.success || !Array.isArray(payload.matches)) throw new Error("لم تُرجع Yumi Sports بيانات صالحة");
    const matches = payload.matches.map((item) => mapYumiMatch(item, normalizedDay));
    const updatedAt = new Date().toISOString();
    const savedAt = Date.now();
    state.yumi = { status: "ready", day: normalizedDay, matches, error: null, updatedAt, savedAt };
    const nextCache = readJSON(KEYS.yumi, {});
    nextCache[normalizedDay] = { matches, updatedAt, savedAt, date: yumiDayDate(normalizedDay) };
    writeJSON(KEYS.yumi, nextCache);
  } catch (error) {
    const fallback = Array.isArray(cached?.matches) ? cached.matches : [];
    state.yumi = {
      status: fallback.length ? "ready" : "error",
      day: normalizedDay,
      matches: fallback,
      error: error?.name === "AbortError" ? "انتهت مهلة الاتصال بـ Yumi Sports." : error.message || "تعذر تحميل البث المباشر",
      updatedAt: cached?.updatedAt || null,
      savedAt: cached?.savedAt || 0
    };
  }
  refreshCurrentScreen();
}

function findYumiMatchForFixture(fixture) {
  if (!fixture) return null;
  if (fixture.source === "yumi" && fixture.watchUrl) return fixture;
  const home = normalizeArabic(fixture.home?.name);
  const away = normalizeArabic(fixture.away?.name);
  if (!home || !away) return null;
  return (state.yumi.matches || []).find((item) => {
    const yHome = normalizeArabic(item.home?.name);
    const yAway = normalizeArabic(item.away?.name);
    return (yHome === home && yAway === away) || (yHome === away && yAway === home);
  }) || null;
}

function watchUrlForFixture(fixture) {
  if (fixture?.watchUrl) return fixture.watchUrl;
  const yumi = findYumiMatchForFixture(fixture);
  if (yumi?.watchUrl) return yumi.watchUrl;
  const date = String(fixture?.date || "").slice(0, 10);
  const today = getTodayISO();
  if (date === addDaysISO(today, 1)) return `${YUMI_BASE}/matches-tomorrow/`;
  if (date === addDaysISO(today, -1)) return `${YUMI_BASE}/matches-yesterday/`;
  return `${YUMI_BASE}/matches-today/`;
}

function isYumiUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && (url.hostname === "yumisports.online" || url.hostname === "www.yumisports.online");
  } catch {
    return false;
  }
}

/* --------------------------------------------------------------------------
   API-Football — التشكيلات والتوقعات عند توفر مفتاح
   -------------------------------------------------------------------------- */
async function fetchFixtureLineups(fixtureId) {
  const id = String(fixtureId);
  const current = state.lineups[id];
  if (current?.status === "ready" && Date.now() - new Date(current.updatedAt).getTime() < CACHE_TTL) return;
  if (!state.settings.apiKey.trim()) {
    state.lineups[id] = { status: "unavailable", error: "التشكيلات تحتاج مفتاح API-Football.", updatedAt: null };
    return;
  }
  state.lineups[id] = { status: "loading", data: null, error: null, updatedAt: null };
  refreshCurrentScreen();
  try {
    const base = (state.settings.apiBase || API_FOOTBALL_DEFAULT).replace(/\/+$/, "");
    const url = new URL(`${base}/fixtures/lineups`);
    url.searchParams.set("fixture", id);
    const response = await fetchWithTimeout(url.toString(), { headers: apiHeaders() });
    if (!response.ok) throw new Error(`تعذر تحميل التشكيلات (HTTP ${response.status})`);
    const payload = await response.json();
    const errors = providerError(payload);
    if (errors) throw new Error(errors);
    const teams = (Array.isArray(payload.response) ? payload.response : []).map((team) => ({
      name: team.team?.name || "فريق",
      logo: team.team?.logo || "",
      formation: team.formation || "",
      startXI: (team.startXI || []).map((entry) => ({
        name: entry.player?.name || "",
        number: entry.player?.number ?? "",
        pos: entry.player?.pos || "",
        grid: entry.player?.grid || ""
      })),
      substitutes: (team.substitutes || []).map((entry) => ({
        name: entry.player?.name || "",
        number: entry.player?.number ?? "",
        pos: entry.player?.pos || ""
      }))
    }));
    const updatedAt = new Date().toISOString();
    state.lineups[id] = { status: teams.length ? "ready" : "empty", data: teams, error: null, updatedAt };
    const cache = readJSON(KEYS.lineups, {});
    cache[id] = { data: teams, updatedAt };
    writeJSON(KEYS.lineups, cache);
  } catch (error) {
    const cache = readJSON(KEYS.lineups, {});
    const cached = cache[id];
    state.lineups[id] = cached?.data
      ? { status: "ready", data: cached.data, error: error.message, updatedAt: cached.updatedAt }
      : { status: "error", data: null, error: error.message || "تعذر تحميل التشكيلات", updatedAt: null };
  }
  refreshCurrentScreen();
}

async function fetchFixturePrediction(fixture, comp, options = {}) {
  const id = String(fixture?.id || "");
  if (!id) return;
  const fallback = statisticalPrediction(fixture, comp);
  if (!state.settings.apiKey.trim() || fixture?.source === "openfootball") {
    const current = state.predictions[id];
    if (!options.force && current?.status === "ready" && current.data) return;
    if (!fallback && current && !options.force) return;
    state.predictions[id] = { status: fallback ? "ready" : "unavailable", data: fallback, error: fallback ? null : "لا توجد بيانات كافية لحساب توقع إحصائي.", updatedAt: new Date().toISOString() };
    refreshCurrentScreen();
    return;
  }
  const current = state.predictions[id];
  if (current?.status === "ready" && Date.now() - new Date(current.updatedAt).getTime() < CACHE_TTL) return;
  state.predictions[id] = { status: "loading", data: fallback, error: null, updatedAt: null };
  refreshCurrentScreen();
  try {
    const base = (state.settings.apiBase || API_FOOTBALL_DEFAULT).replace(/\/+$/, "");
    const url = new URL(`${base}/predictions`);
    url.searchParams.set("fixture", id);
    const response = await fetchWithTimeout(url.toString(), { headers: apiHeaders() });
    if (!response.ok) throw new Error(`تعذر تحميل التوقع (HTTP ${response.status})`);
    const payload = await response.json();
    const errors = providerError(payload);
    if (errors) throw new Error(errors);
    const prediction = payload.response?.[0]?.predictions;
    const percent = prediction?.percent || {};
    const data = {
      source: "api",
      home: (Number.parseFloat(percent.home) || 0) / 100,
      draw: (Number.parseFloat(percent.draw) || 0) / 100,
      away: (Number.parseFloat(percent.away) || 0) / 100,
      advice: prediction?.advice || "",
      winner: prediction?.winner?.name || "",
      underOver: prediction?.under_over || "",
      goals: prediction?.goals || null,
      fallback
    };
    const updatedAt = new Date().toISOString();
    state.predictions[id] = { status: "ready", data, error: null, updatedAt };
    const cache = readJSON(KEYS.predictions, {});
    cache[id] = { data, updatedAt };
    writeJSON(KEYS.predictions, cache);
  } catch (error) {
    state.predictions[id] = { status: fallback ? "ready" : "error", data: fallback, error: error.message || "تعذر تحميل التوقع", updatedAt: new Date().toISOString() };
  }
  refreshCurrentScreen();
}

function clearNetworkCaches() {
  removeKey(KEYS.matchCache);
  removeKey(KEYS.standingsCache);
  removeKey(KEYS.newsCache);
  removeKey(KEYS.openFootball);
  removeKey(KEYS.yumi);
  removeKey(KEYS.lineups);
  removeKey(KEYS.predictions);
  state.matches = { status: "idle", source: "openfootball", fixtures: [], nextFixtures: [], error: null, updatedAt: null, date: getTodayISO() };
  state.openFootball = { status: "idle", leagues: {}, error: null, updatedAt: null };
  state.yumi = { status: "idle", day: "today", matches: [], error: null, updatedAt: null, savedAt: null };
  state.standings = {};
  state.lineups = {};
  state.predictions = {};
  state.newsFeed = { status: "idle", articles: [], error: null, updatedAt: null };
  showToast("تم مسح ذاكرة البيانات المؤقتة");
  refreshCurrentScreen();
}
