/* ==========================================================================
   الشاشات الرئيسية: الرئيسية، المباريات، البطولات، الأخبار، الأكاديمية
   ========================================================================== */
"use strict";

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "P", "LIVE", "INT"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO", "UNK"]);

function isLiveFixture(fixture) {
  return LIVE_STATUSES.has(String(fixture?.statusShort || "").toUpperCase());
}

function isFinishedFixture(fixture) {
  return FINISHED_STATUSES.has(String(fixture?.statusShort || "").toUpperCase());
}

function matchStatusLabel(fixture) {
  const short = String(fixture?.statusShort || "").toUpperCase();
  const clock = String(fixture?.clock || "");
  const map = {
    NS: "لم تبدأ",
    TBD: "لم تحدد",
    LIVE: "مباشر",
    UNK: "النتيجة غير متاحة",
    "1H": "الشوط الأول",
    HT: "استراحة بين الشوطين",
    "2H": "الشوط الثاني",
    ET: "وقت إضافي",
    BT: "استراحة إضافية",
    P: "ركلات الترجيح",
    SUSP: "موقوفة",
    INT: "متوقفة مؤقتاً",
    FT: "انتهت",
    AET: "انتهت بعد الإضافي",
    PEN: "انتهت بالترجيح",
    PST: "مؤجلة",
    CANC: "ملغاة",
    ABD: "ألغيت",
    AWD: "محسومة إدارياً",
    WO: "انسحاب"
  };
  if (["LIVE", "1H", "2H", "ET", "P"].includes(short)) {
    if (/^\d{1,3}:\d{2}$/.test(clock)) return clock;
    if (fixture.elapsed) return `${fixture.elapsed}′`;
  }
  if (short === "1H" || short === "2H") {
    return fixture.elapsed ? `${map[short]} · ${fixture.elapsed}′` : map[short];
  }
  return map[short] || short || "غير معروف";
}

/* ساعة المباراة الحية — تُعرض كـ 59:57 وتتقدم كل ثانية */
function matchClockAttr(fixture) {
  const clock = String(fixture?.clock || "");
  if (!["LIVE", "1H", "2H", "ET", "P"].includes(String(fixture?.statusShort || "").toUpperCase())) return "";
  if (!/^\d{1,3}:\d{2}$/.test(clock)) return "";
  return ` data-match-clock data-base="${esc(clock)}" data-at="${Number(fixture.clockAt) || Date.now()}"`;
}

function matchCrest(team) {
  const logo = clubLogoFor(team);
  if (logo) return `<span class="match-team__crest">${crestImageHtml(team)}</span>`;
  return `<span class="match-team__crest">${esc(team?.name?.slice(0, 3) || "?")}</span>`;
}

function scorePair(home, away) {
  return `<span class="score-pair"><b>${esc(home)}</b><i>–</i><b>${esc(away)}</b></span>`;
}

function matchSourceBadge(fixture) {
  if (fixture?.source === "yumi") return `<span class="source-badge source-badge--live">${icon("play")} Yumi</span>`;
  if (fixture?.source === "s365") return `<span class="source-badge source-badge--s365">365</span>`;
  if (fixture?.source === "fotmob") return `<span class="source-badge source-badge--fotmob">FotMob</span>`;
  if (fixture?.source === "api") return `<span class="source-badge">API</span>`;
  if (fixture?.source === "openfootball") return `<span class="source-badge source-badge--open">مفتوح</span>`;
  return "";
}

function compactMatchCard(fixture) {
  const home = fixture.home || {};
  const away = fixture.away || {};
  const scoreHome = fixture.goals?.home;
  const scoreAway = fixture.goals?.away;
  const hasScore = scoreHome !== null && scoreHome !== undefined && scoreAway !== null && scoreAway !== undefined;
  const live = isLiveFixture(fixture);
  return `
    <div class="match-card match-card--clickable" role="button" tabindex="0" data-action="openMatch" data-id="${esc(fixture.id)}" aria-label="${esc(`${home.name || "مباراة"} ضد ${away.name || ""}`)}">
      <div class="match-card__league">
        ${leagueMark(fixture.league, "league-mark--inline")}
        <span class="match-card__league-name">${esc(fixture.league?.name || "مباراة")}</span>
        ${fixture.league?.round ? `<span class="match-card__round">${esc(fixture.league.round)}</span>` : ""}
      </div>
      <div class="match-card__teams">
        <div class="match-team">
          ${matchCrest(home)}
          <span class="match-team__name">${esc(home.name || "الفريق الأول")}</span>
        </div>
        <div class="match-score">
          ${hasScore
            ? `<div class="match-score__numbers">${scorePair(scoreHome, scoreAway)}</div>`
            : `<div class="match-score__time" dir="ltr">${esc(formatClock(fixture.date))}</div>`}
          <div class="match-score__date">${esc(formatDateShort(String(fixture.date).slice(0, 10)))}</div>
        </div>
        <div class="match-team match-team--away">
          <span class="match-team__name">${esc(away.name || "الفريق الثاني")}</span>
          ${matchCrest(away)}
        </div>
      </div>
      <div class="match-card__status">
        ${live ? '<span class="live-dot"></span>' : ""}
        <span>${esc(matchStatusLabel(fixture))}</span>
        ${fixture.channel ? `<span class="match-card__channel"> · ${esc(fixture.channel)}</span>` : ""}
        ${fixture.venue ? `<span class="match-card__venue"> · ${esc(fixture.venue)}</span>` : ""}
        ${matchSourceBadge(fixture)}
        <button class="match-card__watch" data-action="watchMatch" data-id="${esc(fixture.id)}" aria-label="مشاهدة البث">${icon("play")} شاهد</button>
      </div>
    </div>`;
}

function fullMatchCard(fixture) {
  return compactMatchCard(fixture);
}

function homeTodaySection() {
  const today = getTodayISO();
  const fmList = typeof getFmMatches === "function" ? getFmMatches(today) : [];
  const stateToday = (state.matches.fixtures || []).filter((fixture) => String(fixture?.date || "").slice(0, 10) === today);
  const yumiLive = (state.yumi.matches || []).filter(isLiveFixture);

  const seen = new Set();
  const fixtures = [...(fmList.length ? fmList : stateToday), ...yumiLive]
    .filter((fixture) => {
      const key = String(fixture?.id || `${fixture?.home?.name}-${fixture?.away?.name}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const live = fixtures.filter(isLiveFixture);
  const finished = fixtures.filter(isFinishedFixture);
  const upcoming = fixtures.filter((fixture) => !isLiveFixture(fixture) && !isFinishedFixture(fixture));

  const fmEntry = typeof fmActive === "function" && fmActive() && typeof fmState === "function"
    ? fmState().byDate[fmDateKey(today)]
    : null;
  const loading = !fixtures.length && (state.matches.status === "loading" || (fmEntry && fmEntry.status === "loading"));
  const failed = !fixtures.length && (state.matches.status === "error" || (fmEntry && fmEntry.status === "error"));

  const group = (title, items, tone, limit) => {
    if (!items.length) return "";
    const shown = items.slice(0, limit);
    const rest = items.length - shown.length;
    return `
      <div class="home-day__group">
        <div class="home-day__label">
          <span class="home-day__dot home-day__dot--${tone}"></span>
          <span>${title}</span>
          <span class="home-day__count">${items.length}</span>
        </div>
        <div class="match-list">${shown.map(compactMatchCard).join("")}</div>
        ${rest > 0 ? `<button class="home-day__more" data-go="matches">عرض ${rest} مباريات أخرى ${icon("arrowLeft")}</button>` : ""}
      </div>`;
  };

  let body = "";
  if (loading) {
    body = `
      <div class="home-day__skeleton">
        <div class="skeleton" style="height:66px;border-radius:14px"></div>
        <div class="skeleton" style="height:66px;border-radius:14px"></div>
        <div class="skeleton" style="height:66px;border-radius:14px"></div>
      </div>`;
  } else if (failed) {
    body = notice("alert", `تعذر تحديث مباريات اليوم. ${esc(state.matches.error || "تحقق من الاتصال بالإنترنت.")}`, "notice--danger");
  } else if (!fixtures.length) {
    body = `
      <div class="home-day__empty">
        <span class="home-day__empty-icon">${icon("calendar")}</span>
        <strong>لا توجد مباريات اليوم</strong>
        <span>لا توجد مباريات مسجّلة في المصادر حتى الآن. يمكنك تصفّح الأيام السابقة والقادمة.</span>
        <button class="btn btn--soft btn--small" data-go="matches">${icon("ball")} تصفّح المباريات</button>
      </div>`;
  } else if (fixtures.some((fixture) => fixture.source === "fotmob")) {
    const blocks = fmLeagueBlocks(fixtures, { maxGroups: 6, maxRows: 6, liveFirst: true });
    body = `
      ${blocks.html}
      ${blocks.truncated ? `<button class="home-day__more" data-go="matches">عرض كل مباريات اليوم ${icon("arrowLeft")}</button>` : ""}`;
  } else {
    body = `
      ${group("مباشر الآن", live, "live", 4)}
      ${group("النتائج", finished, "done", 6)}
      ${group("لم تبدأ بعد", upcoming, "soon", 5)}`;
  }

  const updated = state.matches.updatedAt ? `آخر تحديث ${timeAgo(state.matches.updatedAt)}` : "تحديث تلقائي";

  return `
    <div class="home-day">
      <div class="home-day__head">
        <div class="home-day__heading">
          <span class="home-day__eyebrow">${icon("calendar")} ${esc(formatDateLong(today))}</span>
          <h2 class="home-day__title">مباريات ونتائج اليوم</h2>
        </div>
        <button class="home-day__all" data-go="matches">الكل ${icon("arrowLeft")}</button>
      </div>
      <div class="home-day__meta">
        <span class="home-day__live ${live.length ? "is-live" : ""}"><span class="live-dot ${live.length ? "" : "live-dot--off"}"></span>${live.length ? `${live.length} مباشر` : "لا مباريات مباشرة"}</span>
        <span class="home-day__sep"></span>
        <span>${esc(updated)}</span>
      </div>
      ${body}
    </div>`;
}


function renderHome() {
  const teams = state.data.teams.slice(0, 8);
  const majorIds = ["epl", "laliga", "seriea", "bundesliga", "ligue1"];
  const competitions = [
    ...majorIds.map((id) => getCompetitionById(id)).filter(Boolean),
    ...state.data.competitions.filter((comp) => !majorIds.includes(comp.id))
  ].slice(0, 6);

  return `
    <section class="section section--home-top">
      ${homeTodaySection()}
    </section>

    <section class="section">
      ${sectionHead("البطولات", "الدوريات المحلية والعالمية", viewAllLink("competitions"))}
      <div class="h-scroll">${competitions.map(competitionCard).join("")}</div>
    </section>

    <section class="section">
      ${sectionHead("أندية مختارة", "دليل سريع للفرق", viewAllLink("teams"))}
      <div class="team-strip">${teams.map(teamChip).join("")}</div>
    </section>

    <p class="version-note">وصل الحسيني — سكون الرياضي · الإصدار ${APP_VERSION}<br>النتائج من OpenFootball مفتوح المصدر · البث من Yumi Sports · دون بيانات وهمية.</p>`;
}

/* --------------------------------------------------------------------------
   المباريات
   -------------------------------------------------------------------------- */
function dateStrip() {
  const today = meccaTodayISO();
  const current = state.ui.matchDay;
  const days = [-3, -2, -1, 0, 1, 2, 3].map((offset) => addDaysISO(today, offset));
  const inStrip = days.includes(current);
  return `
      ${days.map((date) => {
        const active = date === current;
        const isToday = date === today;
        return `
        <button class="date-pill ${active ? "is-active" : ""}${isToday ? " is-today" : ""}" data-action="setMatchDay" data-date="${date}" aria-label="${esc(formatDateLong(date))}">
          <span class="date-pill__day">${isToday ? "اليوم" : esc(weekdayAr(date))}</span>
          <strong class="date-pill__num">${esc(dayNumAr(date))}</strong>
          <span class="date-pill__month">${esc(monthAr(date))}</span>
        </button>`;
      }).join("")}
      <label class="date-pill date-pill--picker ${inStrip ? "" : "is-active"}" title="اختيار يوم آخر">
        <span class="date-pill__icon">${icon("calendar")}</span>
        <span class="date-pill__day">${inStrip ? "تاريخ" : "مختار"}</span>
        <input type="date" value="${esc(current)}" data-action="setMatchDayInput" aria-label="اختيار تاريخ المباريات" />
      </label>`;
}

function weekdayAr(iso) {
  return formatMecca(iso, { weekday: "long" });
}

function dayNumAr(iso) {
  return formatMecca(iso, { day: "numeric" });
}

function monthAr(iso) {
  return formatMecca(iso, { month: "short" });
}


function fmDayLabel(date) {
  const diff = Math.round((isoToDate(date) - isoToDate(getTodayISO())) / 86400000);
  if (diff === -2) return "قبل يومين";
  if (diff === -1) return "أمس";
  if (diff === 0) return "اليوم";
  if (diff === 1) return "غداً";
  if (diff === 2) return "بعد غد";
  try {
    return new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(isoToDate(date));
  } catch {
    return formatDateShort(date);
  }
}

/* تجميع مباريات FotMob حسب البطولة — نفس ترتيب موقع FotMob */
function fmRoundAr(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const group = text.match(/^Group\s+([A-Z0-9]+)$/i);
  if (group) return `المجموعة ${group[1]}`;
  const round = text.match(/^Round\s+(\d+)$/i);
  if (round) return `الجولة ${round[1]}`;
  const map = {
    "Round of 16": "دور الـ16",
    "Round of 32": "دور الـ32",
    "Quarter-finals": "ربع النهائي",
    "Quarterfinals": "ربع النهائي",
    "Semi-finals": "نصف النهائي",
    "Semifinals": "نصف النهائي",
    "Final": "النهائي",
    "Group Stage": "دور المجموعات",
    "League Stage": "دور الدوري"
  };
  return map[text] || text;
}

function fmLeagueRow(fixture) {
  const home = fixture.home || {};
  const away = fixture.away || {};
  const hasScore = fixture.goals?.home !== null && fixture.goals?.home !== undefined
    && fixture.goals?.away !== null && fixture.goals?.away !== undefined;
  const live = isLiveFixture(fixture);
  const finished = isFinishedFixture(fixture);
  const center = hasScore
    ? `<span class="fm-row__score">${scorePair(fixture.goals.home, fixture.goals.away)}</span>`
    : `<span class="fm-row__time" dir="ltr">${esc(formatClock(fixture.date))}</span>`;
  const state = live
    ? `<span class="fm-row__state is-live"><span class="live-dot"></span>${esc(matchStatusLabel(fixture))}</span>`
    : finished
      ? `<span class="fm-row__state">${esc(matchStatusLabel(fixture))}</span>`
      : "";
  return `
    <div class="fm-row${live ? " is-live" : ""}" role="button" tabindex="0" data-action="openMatch" data-id="${esc(fixture.id)}" aria-label="${esc(`${home.name || "مباراة"} ضد ${away.name || ""}`)}">
      <span class="fm-row__team fm-row__team--home">
        <span class="fm-row__name">${esc(home.name || "الفريق الأول")}</span>
        ${matchCrest(home)}
      </span>
      <span class="fm-row__center">${center}${state}</span>
      <span class="fm-row__team fm-row__team--away">
        ${matchCrest(away)}
        <span class="fm-row__name">${esc(away.name || "الفريق الثاني")}</span>
      </span>
    </div>`;
}

function fmLeagueBlocks(fixtures, options = {}) {
  const maxGroups = Number(options.maxGroups) || 0;
  const maxRows = Number(options.maxRows) || 0;
  const groups = new Map();
  fixtures.forEach((fixture) => {
    const key = String(fixture.league?.fmId || fixture.league?.name || "other");
    if (!groups.has(key)) {
      groups.set(key, {
        name: fixture.league?.name || "بطولة",
        country: fixture.league?.country || "",
        league: fixture.league,
        items: []
      });
    }
    groups.get(key).items.push(fixture);
  });

  const order = ["yemen", "saudi", "epl", "laliga", "seriea", "bundesliga", "ligue1", "ucl", "worldcup"];
  const priority = (group) => {
    const index = order.indexOf(String(group.league?.appId || ""));
    return index === -1 ? order.length : index;
  };
  const hasLive = (group) => group.items.some(isLiveFixture);

  let list = [...groups.values()].sort((a, b) => {
    if (options.liveFirst) {
      const liveDiff = Number(hasLive(b)) - Number(hasLive(a));
      if (liveDiff !== 0) return liveDiff;
    }
    const diff = priority(a) - priority(b);
    return diff !== 0 ? diff : a.name.localeCompare(b.name, "ar");
  });

  let truncated = false;
  if (maxGroups && list.length > maxGroups) {
    list = list.slice(0, maxGroups);
    truncated = true;
  }

  const html = list.map((group) => {
    group.items.sort((a, b) => new Date(a.date) - new Date(b.date));
    const rows = maxRows ? group.items.slice(0, maxRows) : group.items;
    if (rows.length < group.items.length) truncated = true;
    const rounds = [...new Set(group.items.map((item) => fmRoundAr(item.league?.round)).filter(Boolean))];
    const country = group.country && typeof arCountryName === "function" ? arCountryName(group.country) : group.country;
    return `
      <details class="fm-block" open>
        <summary class="fm-block__head">
          <span class="fm-block__mark">${leagueMark(group.league)}</span>
          <span class="fm-block__name">${esc(group.name)}</span>
          ${country ? `<span class="fm-block__country">${esc(country)}</span>` : ""}
          <span class="fm-block__count">${group.items.length}</span>
          <span class="fm-block__arrow">${icon("arrowLeft")}</span>
        </summary>
        ${rounds.length ? `<div class="fm-block__rounds">${rounds.map((round) => `<span class="fm-block__round">${esc(round)}</span>`).join("")}</div>` : ""}
        <div class="fm-block__rows">${rows.map(fmLeagueRow).join("")}</div>
        ${rows.length < group.items.length ? `<button class="fm-block__more" data-go="matches">+${group.items.length - rows.length} مباريات أخرى</button>` : ""}
      </details>`;
  }).join("");

  return { html, truncated, groups: list.length };
}

function fmLeagueGrouped(fixtures) {
  return fmLeagueBlocks(fixtures).html;
}


function sourceStatusCard() {
  const hasKey = Boolean(state.settings.apiKey.trim());
  const fmMode = state.matches.source === "fotmob";
  const source = hasKey
    ? "API-Football"
    : fmMode
      ? "FotMob"
      : state.matches.source === "openfootball" ? "OpenFootball (مفتوح المصدر)" : "مصادر مفتوحة";
  const statusText = state.matches.status === "error"
    ? "تعذر الاتصال بالمصدر"
    : state.matches.updatedAt
      ? `آخر تحديث ${timeAgo(state.matches.updatedAt)}`
      : state.matches.status === "loading"
        ? "جارٍ تحميل البيانات..."
        : "المصدر جاهز";
  return `
    <div class="source-card">
      <div class="source-card__top">
        <div class="source-card__icon">${icon(state.matches.status === "error" ? "wifiOff" : "database")}</div>
        <div>
          <div class="source-card__title">${hasKey ? "مصدر المباريات" : fmMode ? "مباريات FotMob" : "النتائج المفتوحة"}</div>
          <div class="source-card__meta">${esc(source)} · ${esc(statusText)}</div>
        </div>
      </div>
      <div class="source-card__actions">
        <button class="btn btn--soft btn--small" data-go="settings">${icon("settings")} إعدادات المصادر</button>
        <button class="btn btn--dark btn--small" data-action="refreshMatches">${icon("refresh")} تحديث</button>
      </div>
    </div>`;
}

function filterSheet() {
  const comps = state.data.competitions;
  const teamsMap = new Map();
  state.matches.fixtures.forEach((fixture) => {
    [fixture.home, fixture.away].forEach((team) => {
      if (team?.name) teamsMap.set(team.name, team.name);
    });
  });
  const teams = [...teamsMap.values()];
  return `
    <div class="form">
      <div class="field">
        <span class="field__label">البطولة</span>
        <div class="chip-row">
          <button class="chip ${state.ui.matchComp === "all" ? "is-active" : ""}" data-action="setMatchFilter" data-group="comp" data-value="all">كل البطولات</button>
          ${comps.map((comp) => `<button class="chip ${state.ui.matchComp === String(comp.apiId) ? "is-active" : ""}" data-action="setMatchFilter" data-group="comp" data-value="${comp.apiId}">${esc(comp.name)}</button>`).join("")}
        </div>
      </div>
      <div class="field mt-12">
        <span class="field__label">الفريق</span>
        <div class="chip-row">
          <button class="chip ${state.ui.matchTeam === "all" ? "is-active" : ""}" data-action="setMatchFilter" data-group="team" data-value="all">كل الفرق</button>
          ${teams.length ? teams.map((team) => `<button class="chip ${state.ui.matchTeam === team ? "is-active" : ""}" data-action="setMatchFilter" data-group="team" data-value="${esc(team)}">${esc(team)}</button>`).join("") : `<span class="field__hint">ستظهر الفرق بعد تحميل مباريات اليوم.</span>`}
        </div>
      </div>
      <button class="btn btn--primary btn--block mt-16" data-close-sheet>عرض النتائج</button>
    </div>`;
}

function renderMatches() {
  const day = state.ui.matchDay;
  const fixtures = state.matches.fixtures.filter((fixture) => {
    if (state.ui.matchComp !== "all" && String(fixture.league?.id) !== String(state.ui.matchComp) && String(fixture.league?.appId) !== String(state.ui.matchComp)) return false;
    if (state.ui.matchTeam !== "all") {
      const names = [fixture.home?.name, fixture.away?.name].filter(Boolean);
      if (!names.includes(state.ui.matchTeam)) return false;
    }
    return true;
  });
  const nextFixtures = (state.matches.nextFixtures || []).filter((fixture) => {
    if (state.ui.matchComp !== "all" && String(fixture.league?.id) !== String(state.ui.matchComp) && String(fixture.league?.appId) !== String(state.ui.matchComp)) return false;
    return true;
  }).slice(0, 8);
  const recentFixtures = (state.matches.recentFixtures || []).filter((fixture) => {
    if (state.ui.matchComp !== "all" && String(fixture.league?.id) !== String(state.ui.matchComp) && String(fixture.league?.appId) !== String(state.ui.matchComp)) return false;
    return true;
  }).slice(0, 6);

  const live = fixtures.filter(isLiveFixture);
  const upcoming = fixtures.filter((fixture) => !isLiveFixture(fixture) && !isFinishedFixture(fixture));
  const finished = fixtures.filter(isFinishedFixture);
  const loading = state.matches.status === "loading";
  const fmMode = state.matches.source === "fotmob";

  let content = sourceStatusCard();
  const savedBadge = (() => {
    if (state.s365Day && state.s365Day.date === day && state.s365Day.stale && state.s365Day.updatedAt) {
      return notice("warn", `بيانات محفوظة · ${esc(formatTime(state.s365Day.updatedAt))} — تعذر تحديث مباريات 365Scores.`, "mt-12");
    }
    if (state.matches.source === "fotmob" && state.matches.status === "ready" && state.matches.error) {
      return notice("warn", `بيانات محفوظة · ${esc(formatTime(state.matches.updatedAt) || "")} — تعذر تحديث مباريات FotMob.`, "mt-12");
    }
    return "";
  })();
  content += savedBadge;
  if (loading && !fixtures.length && !nextFixtures.length) {
    content += `<div class="match-list mt-12">${[1, 2, 3].map(() => `<div class="match-card"><div class="skeleton" style="width:45%;height:10px"></div><div class="skeleton" style="width:100%;height:70px;margin-top:12px;border-radius:14px"></div></div>`).join("")}</div>`;
  } else if (state.matches.status === "error" && !fixtures.length && !nextFixtures.length) {
    content += `<div class="mt-12">${notice("alert", `تعذر تحميل مباريات ${esc(formatDateLong(day))}.<br>${esc(state.matches.error || "تحقق من الاتصال.")}`, "notice--danger")}</div>
      <button class="btn btn--soft btn--block mt-12" data-action="refreshMatches">${icon("refresh")} إعادة المحاولة</button>`;
  } else {
    if (fixtures.length) {
      if (fmMode) {
        content += `<div class="mt-12">${fmLeagueGrouped(fixtures)}</div>`;
      } else {
        content += `
          ${live.length ? `<div class="match-list__group">مباشر الآن</div><div class="match-list">${live.map(fullMatchCard).join("")}</div>` : ""}
          ${upcoming.length ? `<div class="match-list__group">قادمة</div><div class="match-list">${upcoming.map(fullMatchCard).join("")}</div>` : ""}
          ${finished.length ? `<div class="match-list__group">انتهت</div><div class="match-list">${finished.map(fullMatchCard).join("")}</div>` : ""}`;
      }
    } else {
      content += `<div class="mt-12">${emptyState("calendar", "لا توجد مباريات في هذا اليوم", "جرّب يوماً آخر من شريط الأيام أعلاه. كل يوم يُجلب على حدة من FotMob.", "")}</div>`;
    }
    if (!fmMode && nextFixtures.length) {
      content += `<div class="match-list__group">أقرب المباريات القادمة</div><div class="match-list">${nextFixtures.map(fullMatchCard).join("")}</div>`;
    }
    if (!fmMode && recentFixtures.length) {
      content += `<div class="match-list__group">آخر النتائج</div><div class="match-list">${recentFixtures.map(fullMatchCard).join("")}</div>`;
    }
    const sourceName = state.settings.apiKey.trim() ? "API-Football" : fmMode ? "FotMob" : "OpenFootball — بيانات مفتوحة المصدر";
    content += `<p class="version-note">المصدر: ${sourceName} · ${MECCA_LABEL}</p>`;
  }

  const activeFilters = (state.ui.matchComp !== "all" ? 1 : 0) + (state.ui.matchTeam !== "all" ? 1 : 0);
  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">المركز الرياضي</div>
      <h1>المباريات</h1>
      <p>نتائج ومواعيد الدوريات الخمسة الكبرى من مصدر مفتوح، مع البث المباشر من Yumi Sports.</p>
    </div>
    <div class="segmented mb-12">
      <button class="segmented__btn is-active" data-go="matches">${icon("ball")} المباريات</button>
      <button class="segmented__btn" data-go="live">${icon("play")} البث المباشر</button>
      <button class="segmented__btn" data-go="competitions">${icon("trophy")} البطولات</button>
    </div>
    <div class="date-strip">${dateStrip()}</div>
    <div class="section__head mt-16" style="margin-bottom:10px">
      <div>
        <div class="section__title" style="font-size:15px">مباريات ${esc(dayLabel(day, Math.round((isoToDate(day) - isoToDate(meccaTodayISO())) / 86400000)))}</div>
        <div class="section__sub">${esc(formatDateLong(day))} · ${MECCA_LABEL}</div>
      </div>
      <button class="icon-btn filter-btn ${activeFilters ? "is-active" : ""}" data-action="openMatchFilters" aria-label="تصفية المباريات">${icon("filter")}</button>
    </div>
    ${content}`;
}

/* --------------------------------------------------------------------------
   البطولات — جميع الدوريات والكؤوس مع زر متابعة
   -------------------------------------------------------------------------- */
function compLeagueName(league) {
  if (!league) return "بطولة";
  if (typeof fmLeagueName === "function") {
    return fmLeagueName({ id: league.id, name: league.name, ccode: league.countryCode });
  }
  return league.name || "بطولة";
}

function compLeagueCountry(league) {
  if (!league) return "";
  if (league.countryCode === "INT" || league.countryName === "International") return "دولي";
  const raw = league.countryName || league.countryCode || "";
  if (!raw) return "";
  return typeof arCountryName === "function" ? arCountryName(raw) : raw;
}

function compFollowButton(league) {
  const followed = isFollowedLeague(league.id);
  return `<button class="follow-btn ${followed ? "is-on" : ""}" data-action="toggleFollowLeague" data-id="${esc(league.id)}" data-name="${esc(compLeagueName(league))}" data-country="${esc(compLeagueCountry(league))}" aria-pressed="${followed ? "true" : "false"}">${followed ? icon("check") : icon("plus")}<span>${followed ? "متابع" : "تابع"}</span></button>`;
}

function compLeagueRow(league, options = {}) {
  const country = compLeagueCountry(league);
  const appComp = league.appId
    ? getCompetitionById(String(league.appId))
    : (typeof fmLeagueComp === "function" ? fmLeagueComp(league.id) : null);
  const external = !appComp && league.pageUrl ? `https://www.fotmob.com/ar${league.pageUrl}` : "";
  const body = `
    <span class="league-row__name">${esc(compLeagueName(league))}</span>
    ${options.hideCountry || !country ? "" : `<span class="league-row__meta">${esc(country)}</span>`}`;
  const bodyHtml = appComp
    ? `<button class="league-row__body league-row__body--link" data-go="competition/${esc(appComp.id)}">${body}</button>`
    : external
      ? `<a class="league-row__body league-row__body--link" href="${esc(safeUrl(external))}" target="_blank" rel="noopener noreferrer">${body}</a>`
      : `<span class="league-row__body">${body}</span>`;
  return `
    <div class="league-row">
      ${leagueMark({ fmId: league.fmId || league.id, id: league.appId || league.id, name: league.name }, "league-mark--sm")}
      ${bodyHtml}
      ${compFollowButton(league)}
    </div>`;
}

function compCountryGroup(country, open) {
  const countryAr = arCountryName(country.ccode || country.localizedName || country.name);
  const leagues = (country.leagues || [])
    .map((league) => ({
      id: Number(league.id),
      name: league.name,
      countryCode: league.ccode || country.ccode,
      countryName: countryAr,
      pageUrl: league.pageUrl
    }))
    .filter((league) => Number.isFinite(league.id));
  if (!leagues.length) return "";
  return `
    <details class="league-group" ${open ? "open" : ""}>
      <summary class="league-group__head">
        <span class="league-group__name">${esc(countryAr)}</span>
        <span class="league-group__count">${leagues.length}</span>
        <span class="league-group__arrow">${icon("chevronDown")}</span>
      </summary>
      <div class="league-group__rows">${leagues.map((league) => compLeagueRow(league)).join("")}</div>
    </details>`;
}

function followedLeaguesHtml() {
  const list = state.followedLeagues || [];
  if (!list.length) {
    return `<div class="league-followed__empty">
      <span class="league-followed__icon">${icon("star")}</span>
      <span class="league-followed__text">
        <strong>لم تتابع أي بطولة بعد</strong>
        <span>اضغط «تابع» بجانب أي دوري أو كأس ليظهر هنا.</span>
      </span>
    </div>`;
  }
  return list.map((item) => `
    <div class="league-row league-row--followed">
      ${leagueMark({ fmId: item.id, id: item.id, name: item.name }, "league-mark--sm")}
      <span class="league-row__body">
        <span class="league-row__name">${esc(item.name || "بطولة")}</span>
        <span class="league-row__meta">${esc(item.country || "متابعة")}</span>
      </span>
      <button class="follow-btn is-on" data-action="toggleFollowLeague" data-id="${esc(item.id)}" data-name="${esc(item.name || "")}" data-country="${esc(item.country || "")}" aria-pressed="true">${icon("check")}<span>متابع</span></button>
    </div>`).join("");
}

/* الدوريات الكبرى + الدوري اليمني في مقدمة قائمة البطولات */
const COMP_TOP_FALLBACK = [
  { id: 47, name: "Premier League", countryCode: "ENG", countryName: "إنجلترا" },
  { id: 87, name: "LaLiga", countryCode: "ESP", countryName: "إسبانيا" },
  { id: 55, name: "Serie A", countryCode: "ITA", countryName: "إيطاليا" },
  { id: 54, name: "Bundesliga", countryCode: "GER", countryName: "ألمانيا" },
  { id: 53, name: "Ligue 1", countryCode: "FRA", countryName: "فرنسا" }
];

const COMP_FAMOUS_CODES = new Set([
  "KSA", "EGY", "MAR", "ALG", "TUN", "UAE", "QAT", "KUW", "IRQ",
  "ENG", "ESP", "ITA", "GER", "FRA", "POR", "NED", "TUR",
  "USA", "MEX", "ARG", "BRA", "SCO", "BEL"
]);

const COMP_INTL_IDS = new Set([
  42, 73, 10216, 77, 50, 44, 45, 299, 290, 525, 9469, 289, 526,
  10474, 10242, 329, 78, 74, 9806, 9807, 9808, 9809, 9467, 298, 9821, 9375, 296, 306
]);

function compTopLeagues(entry) {
  const all = typeof fmAllLeagueEntries === "function" ? fmAllLeagueEntries(entry) : [];
  const rows = COMP_TOP_FALLBACK.map((fallback) => all.find((league) => Number(league.id) === Number(fallback.id)) || fallback);
  const yemen = (state.data.competitions || []).find((comp) => comp.id === "yemen");
  rows.push({
    id: "yemen",
    appId: "yemen",
    name: yemen ? yemen.name : "الدوري اليمني الممتاز",
    countryCode: "YEM",
    countryName: "اليمن"
  });
  return rows;
}

function compLeaguesListHtml() {
  const entry = typeof fmAllLeaguesState === "function" ? fmAllLeaguesState() : null;
  const countries = entry?.countries || [];
  const international = entry?.international;
  const intlLeagues = (international?.leagues || []).filter((league) => Number.isFinite(Number(league.id)));
  const hasData = countries.length || intlLeagues.length;
  const allEntries = typeof fmAllLeagueEntries === "function" ? fmAllLeagueEntries(entry) : [];
  const query = String(state.ui.compQuery || "").trim().toLowerCase();

  const topLeagues = compTopLeagues(entry);
  const topHtml = topLeagues.length
    ? `<div class="league-subhead">${icon("trophy")} الدوريات الكبرى</div>
       <div class="league-group league-group--top"><div class="league-group__rows">${topLeagues.map((league) => compLeagueRow(league)).join("")}</div></div>`
    : "";

  if (query) {
    const results = allEntries
      .filter((league) => `${compLeagueName(league)} ${league.name} ${compLeagueCountry(league)}`.toLowerCase().includes(query))
      .slice(0, 80);
    if (!results.length) {
      return emptyState("search", "لا نتائج مطابقة", "جرّب اسماً آخر بالعربية أو الإنجليزية.", `<button class="btn btn--soft" data-action="clearCompSearch">مسح البحث</button>`);
    }
    return `<div class="league-results-note">${results.length} نتيجة</div>
      <div class="league-group"><div class="league-group__rows">${results.map((league) => compLeagueRow(league)).join("")}</div></div>`;
  }

  if (!hasData) {
    if (entry?.status === "loading") {
      return `${topHtml}<div class="league-loading">${[1, 2, 3, 4, 5, 6].map(() => `<div class="league-row"><span class="skeleton" style="width:28px;height:28px;border-radius:50%"></span><span class="league-row__body"><span class="skeleton" style="display:block;width:58%;height:11px"></span><span class="skeleton" style="display:block;width:30%;height:8px;margin-top:6px"></span></span><span class="skeleton" style="width:58px;height:26px;border-radius:999px"></span></div>`).join("")}</div>`;
    }
    if (entry?.status === "error") {
      return `${topHtml}${notice("alert", `تعذر تحميل بقية البطولات. ${esc(entry.error || "تحقق من الاتصال بالإنترنت.")}`, "notice--danger")}`;
    }
    return `${topHtml}${notice("info", "لم تُحمّل بقية البطولات بعد. اضغط «إعادة المحاولة» لتحميلها من FotMob.", "")}`;
  }

  const famousCountries = [...countries]
    .filter((country) => COMP_FAMOUS_CODES.has(String(country.ccode || "").toUpperCase()))
    .sort((a, b) => String(arCountryName(a.ccode || a.localizedName || a.name)).localeCompare(String(arCountryName(b.ccode || b.localizedName || b.name)), "ar"));
  const countryHtml = famousCountries.map((country) => compCountryGroup(country)).join("");

  const famousIntl = intlLeagues
    .filter((league) => COMP_INTL_IDS.has(Number(league.id)))
    .map((league) => ({ id: Number(league.id), name: league.name, countryCode: "INT", countryName: "دولي", pageUrl: league.pageUrl }));
  const intlHtml = famousIntl.length
    ? `<details class="league-group league-group--intl">
        <summary class="league-group__head">
          <span class="league-group__name">${icon("globe")} البطولات الدولية والكؤوس</span>
          <span class="league-group__count">${famousIntl.length}</span>
          <span class="league-group__arrow">${icon("chevronDown")}</span>
        </summary>
        <div class="league-group__rows">${famousIntl.map((league) => compLeagueRow(league)).join("")}</div>
      </details>`
    : "";

  return `${topHtml}
    <div class="league-subhead">${icon("globe")} دوريات وبطولات الدول المشهورة</div>
    ${countryHtml}
    ${intlHtml}`;
}

function renderCompetitions() {
  const entry = typeof fmAllLeaguesState === "function" ? fmAllLeaguesState() : null;
  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">البطولات</div>
      <h1>الدوريات والبطولات</h1>
      <p>الدوريات الخمسة الكبرى والدوري اليمني في المقدمة، ثم أشهر دوريات وكؤوس الدول. اضغط «تابع» بجانب أي بطولة لتصلك أولاً.</p>
    </div>

    <div class="section">
      ${sectionHead("البطولات", "الدوريات والكؤوس والبطولات", `<span class="follow-count" data-follow-count>${followedLeagueCount()} متابعة</span>`)}
      <div class="comp-search">
        ${icon("search")}
        <input id="compSearch" type="search" inputmode="search" autocomplete="off" placeholder="ابحث عن دوري أو كأس..." value="${esc(state.ui.compQuery || "")}" />
        ${state.ui.compQuery ? `<button class="comp-search__clear" data-action="clearCompSearch" aria-label="مسح البحث">${icon("x")}</button>` : ""}
      </div>
      <div class="league-subhead league-subhead--followed">${icon("star")} متابعاتك</div>
      <div class="league-followed" id="followedLeagues">${followedLeaguesHtml()}</div>
      <div id="allLeaguesList" class="league-list">${compLeaguesListHtml()}</div>
      ${entry?.status === "error" ? `<button class="btn btn--soft btn--block mt-12" data-action="refreshAllLeagues">${icon("refresh")} إعادة المحاولة</button>` : ""}
      <p class="version-note">المصدر: FotMob · تتحدث القائمة تلقائياً كل 24 ساعة.</p>
    </div>

    <div class="section mt-20">
      ${sectionHead("دليل الأندية", "تعرّف على الفرق", viewAllLink("teams"))}
      <div class="team-strip">${state.data.teams.slice(0, 8).map(teamChip).join("")}</div>
    </div>`;
}

function s365ScorersSection(comp) {
  if (typeof getS365Scorers !== "function") return "";
  const entry = getS365Scorers(comp);
  if (!entry) return "";
  const head = sectionHead("هدافو البطولة", "أفضل المسجلين");
  if (entry.status === "loading" && !(entry.list || []).length) {
    return `<div class="section">${head}<div class="table-wrap"><div style="padding:14px">${[1, 2, 3].map(() => `<div class="skeleton" style="height:30px;margin-bottom:6px"></div>`).join("")}</div></div></div>`;
  }
  if (entry.status === "error") {
    return `<div class="section">${head}${notice("info", esc(entry.error || "المصدر لا يوفّر قائمة هدافين لهذه البطولة."), "")}</div>`;
  }
  const list = (entry.list || []).slice(0, 15);
  if (!list.length) {
    return `<div class="section">${head}${emptyState("chart", "لا توجد قائمة هدافين", "المصدر لا يوفّر إحصاء هدافين لهذه البطولة حالياً.", "")}</div>`;
  }
  return `<div class="section">
    ${head}
    ${entry.stale ? notice("warn", `بيانات محفوظة · ${esc(formatTime(entry.updatedAt) || "")}`, "mb-12") : ""}
    <div class="table-wrap">
      <table class="standings scorers">
        <thead><tr><th>#</th><th>اللاعب</th><th>الفريق</th><th>أهداف</th></tr></thead>
        <tbody>${list.map((player) => `<tr>
          <td>${player.rank}</td>
          <td class="scorers__name">${esc(player.name)}</td>
          <td><div class="standings__team">${player.logo ? `<img src="${esc(safeUrl(player.logo))}" alt="" loading="lazy" decoding="async" />` : ""}<span>${esc(player.teamName)}</span></div></td>
          <td style="font-weight:900;color:var(--orange-soft)">${player.value}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
    <p class="version-note">المصدر: 365Scores${entry.updatedAt ? ` · آخر تحديث ${esc(formatTime(entry.updatedAt))} بتوقيت مكة` : ""}</p>
  </div>`;
}

function fmScorersSection(comp) {
  const fmId = typeof fmLeagueId === "function" ? fmLeagueId(comp) : null;
  if (!fmId) return s365ScorersSection(comp);
  const fm = typeof fmState === "function" ? fmState() : null;
  const entry = fm && fm.scorers ? fm.scorers[comp.id] : null;
  if (!entry) return comp.s365Id ? s365ScorersSection(comp) : "";
  const head = sectionHead("هدافو البطولة", "أفضل المسجلين");
  if (entry.status === "loading" && !(entry.list || []).length) {
    return `<div class="section">${head}<div class="table-wrap"><div style="padding:14px">${[1, 2, 3].map(() => `<div class="skeleton" style="height:30px;margin-bottom:6px"></div>`).join("")}</div></div></div>`;
  }
  if (entry.status === "error") {
    return `<div class="section">${head}${notice("info", esc(entry.error || "هذه البطولة لا توفّر قائمة هدافين في المصدر."), "")}</div>`;
  }
  const list = (entry.list || []).slice(0, 15);
  if (!list.length) return "";
  return `<div class="section">
    ${head}
    ${entry.stale ? notice("warn", `بيانات محفوظة · ${esc(formatTime(entry.updatedAt) || "")}`, "mb-12") : ""}
    <div class="table-wrap">
      <table class="standings scorers">
        <thead><tr><th>#</th><th>اللاعب</th><th>الفريق</th><th>أهداف</th></tr></thead>
        <tbody>${list.map((player) => `<tr>
          <td>${player.rank}</td>
          <td class="scorers__name">${esc(player.name)}</td>
          <td><div class="standings__team">${player.logo ? `<img src="${esc(safeUrl(player.logo))}" alt="" loading="lazy" decoding="async" />` : ""}<span>${esc(player.teamName)}</span></div></td>
          <td style="font-weight:900;color:var(--orange-soft)">${player.value}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
    <p class="version-note">المصدر: FotMob</p>
  </div>`;
}

function competitionClubsSection(comp, rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    if (!row.teamId) return;
    map.set(String(row.teamId), { id: String(row.teamId), name: row.name, logo: row.logo || "" });
  });
  const usedNames = new Set([...map.values()].map((club) => (typeof arKey === "function" ? arKey(club.name) : club.name)));
  state.data.teams
    .filter((team) => team.leagueId === comp.id)
    .forEach((team) => {
      const id = String(team.id);
      const nameKey = typeof arKey === "function" ? arKey(team.name) : team.name;
      if (!map.has(id) && !usedNames.has(nameKey)) {
        map.set(id, { id, name: team.name, logo: clubLogoFor(team) });
        usedNames.add(nameKey);
      }
    });
  const clubs = [...map.values()];
  const head = sectionHead("أندية البطولة", clubs.length ? `${clubs.length} نادياً · اضغط لفتح ملف النادي` : "دليل الأندية");
  if (!clubs.length) {
    return `<div class="section">${head}<p class="text-muted" style="font-size:11px">ستظهر الأندية بعد تحميل ترتيب البطولة من المصدر.</p></div>`;
  }
  return `<div class="section">
    ${head}
    <div class="club-grid">${clubs.map((club) => `
      <button class="club-tile" data-go="team/${esc(club.id)}" aria-label="${esc(club.name)}">
        <span class="club-tile__logo">
          <span class="club-tile__fallback">${icon("shield")}</span>
          ${club.logo ? `<img src="${esc(safeUrl(club.logo))}" alt="" loading="lazy" decoding="async" onerror="this.remove()" />` : ""}
        </span>
        <span class="club-tile__name">${esc(club.name)}</span>
      </button>`).join("")}</div>
    <p class="version-note">اضغط على أي نادٍ لعرض اللاعبين والتشكيل والصور والمواعيد.</p>
  </div>`;
}

function renderCompetitionDetail(route) {
  const comp = getCompetitionById(route.id);
  if (!comp) return renderNotFound();
  const hasKey = Boolean(state.settings.apiKey.trim());
  const standing = state.standings[comp.id] || { status: "idle", rows: [], error: null };
  const openRows = comp.openKey ? computeOpenStandings(comp) : [];
  const apiRows = standing.status === "ready" && standing.rows.length ? standing.rows : [];
  const rows = apiRows.length ? apiRows : openRows;
  const rowsSource = apiRows.length
    ? (standing.source === "365Scores" ? "365Scores" : standing.source === "FotMob" ? "FotMob" : standing.source || "API-Football")
    : "OpenFootball (محسوب من النتائج)";
  const liveSource = standing.source === "FotMob" || standing.source === "365Scores";

  let standingsHtml = "";
  if (!rows.length && standing.status === "loading") {
    standingsHtml = `<div class="table-wrap"><div style="padding:14px">${[1, 2, 3, 4, 5].map(() => `<div class="skeleton" style="height:34px;margin-bottom:6px"></div>`).join("")}</div></div>`;
  } else if (!rows.length && standing.status === "error") {
    standingsHtml = `${notice("alert", `تعذر تحميل الترتيب. ${esc(standing.error || "تحقق من إعدادات المصدر.")}`, "notice--danger")}
      <button class="btn btn--soft btn--block mt-12" data-action="refreshStandings" data-id="${esc(comp.id)}">${icon("refresh")} إعادة المحاولة</button>`;
  } else if (!rows.length) {
    standingsHtml = emptyState("chart", "لا يوجد ترتيب متاح", "لم تُلعب مباريات كافية بعد، أو أن هذه البطولة لا يغطيها المصدر المفتوح.", "");
  } else {
    standingsHtml = `
      ${standing.stale ? notice("warn", `بيانات محفوظة · ${esc(formatTime(standing.updatedAt) || "")} — تعذر التحديث الآن.`, "mb-12") : ""}
      <div class="table-wrap">
        <table class="standings">
          <thead><tr><th>#</th><th>الفريق</th><th>آخر ٥</th><th>ل</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>عليه</th><th>فرق</th><th>نقاط</th></tr></thead>
          <tbody>${rows.map((row) => {
            const diff = Number.isFinite(Number(row.goalsDiff)) ? Number(row.goalsDiff) : (Number(row.goalsFor) || 0) - (Number(row.goalsAgainst) || 0);
            const form = Array.isArray(row.form) ? row.form.slice(-5) : [];
            return `
            <tr>
              <td>${row.rank}</td>
              <td><div class="standings__team ${row.teamId ? "is-link" : ""}" ${row.teamId ? `data-go="team/${esc(String(row.teamId))}" role="button" tabindex="0"` : ""}>${row.logo ? `<img src="${esc(safeUrl(row.logo))}" alt="" loading="lazy" decoding="async" />` : ""}<span>${esc(row.name)}</span></div></td>
              <td class="standings__form">${form.length ? formDots(form) : `<span class="standings__form-empty">—</span>`}</td>
              <td>${row.played}</td><td>${row.win}</td><td>${row.draw}</td><td>${row.lose}</td><td>${row.goalsFor}</td><td>${row.goalsAgainst}</td>
              <td class="${diff > 0 ? "is-plus" : diff < 0 ? "is-minus" : ""}">${diff > 0 ? "+" : ""}${diff}</td>
              <td style="font-weight:900;color:var(--orange-soft)">${row.points}</td>
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>
      <p class="version-note">
        المصدر: ${rowsSource} · موسم ${esc(comp.seasonLabel || String(state.settings.season || comp.season))}
        ${liveSource && standing.updatedAt ? ` · آخر تحديث ${esc(formatTime(standing.updatedAt))} بتوقيت مكة` : ""}
      </p>
      ${liveSource ? `<p class="version-note">${icon("refresh")} يتحدث الترتيب تلقائياً كل 45 ثانية وعند العودة إلى التطبيق.</p>` : ""}
      ${comp.id === "yemen" ? `<p class="version-note">ملاحظة: نادي شعب إب غير مُدرج في جدول المصدر الحالي (365Scores)، ويبقى ظاهراً في التطبيق بشعاره الأصلي.</p>` : ""}`;
  }

  const scorersHtml = fmScorersSection(comp);

  const openFixtures = comp.openKey ? getOpenMatches(comp.id) : [];
  const currentFixtures = state.matches.fixtures.filter((fixture) => String(fixture.league?.id) === String(comp.apiId) || String(fixture.league?.appId) === String(comp.id));
  const merged = new Map();
  [...openFixtures, ...currentFixtures].forEach((fixture) => merged.set(fixture.id, fixture));
  const compFixtures = [...merged.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = compFixtures.filter((fixture) => !isLiveFixture(fixture) && !isFinishedFixture(fixture)).slice(0, 6);
  const recent = compFixtures.filter((fixture) => fixture.goals?.home !== null && fixture.goals?.home !== undefined).slice(-6).reverse();

  return `
    <div class="comp-hero" style="${compStyle(comp)}">
      <div class="comp-hero__mark">${comp.logo ? `<img src="${esc(safeUrl(comp.logo))}" alt="" loading="lazy" decoding="async" />` : icon(comp.icon || "trophy")}</div>
      <h1>${esc(comp.name)}</h1>
      <p>${esc(comp.desc || "")}</p>
      <div class="comp-hero__facts">
        <div class="comp-hero__fact"><strong>${comp.teams}</strong><span>فريق</span></div>
        <div class="comp-hero__fact"><strong>${esc(comp.seasonLabel || String(comp.season))}</strong><span>الموسم</span></div>
        <div class="comp-hero__fact"><strong>${esc(comp.country)}</strong><span>الدولة</span></div>
      </div>
    </div>
    <div class="comp-actions">
      <button class="btn btn--primary btn--small" data-go="live">${icon("play")} البث المباشر</button>
      <button class="btn btn--soft btn--small" data-action="refreshStandings" data-id="${esc(comp.id)}">${icon("refresh")} تحديث الترتيب</button>
    </div>
    <div class="section">
      ${sectionHead("ترتيب الفرق", "النقاط والمباريات والأهداف")}
      ${standingsHtml}
    </div>
    ${scorersHtml}
    ${upcoming.length ? `<div class="section">${sectionHead("المباريات القادمة", "أقرب مواجهات البطولة")}<div class="match-list">${upcoming.map(fullMatchCard).join("")}</div></div>` : ""}
    ${recent.length ? `<div class="section">${sectionHead("آخر النتائج", "نتائج مباريات البطولة")}<div class="match-list">${recent.map(fullMatchCard).join("")}</div></div>` : ""}
    ${competitionClubsSection(comp, rows)}`;
}

/* --------------------------------------------------------------------------
   البث المباشر (Yumi Sports)
   -------------------------------------------------------------------------- */
function renderLive() {
  const day = state.ui.yumiDay || "today";
  const dayNames = { today: "اليوم", tomorrow: "غداً", yesterday: "أمس" };
  const matches = state.yumi.matches || [];
  const live = matches.filter(isLiveFixture);
  const upcoming = matches.filter((fixture) => !isLiveFixture(fixture) && !isFinishedFixture(fixture));
  const finished = matches.filter(isFinishedFixture);
  const sourceUrl = `${YUMI_BASE}/matches-${day}/`;

  let content = "";
  if (!state.settings.yumi) {
    content = emptyState("wifiOff", "البث المباشر متوقف", "فعّل مصدر البث من إعدادات المصادر لعرض مباريات Yumi Sports.", `<button class="btn btn--primary" data-go="settings">${icon("settings")} تفعيل المصدر</button>`);
  } else if (state.yumi.status === "loading" && !matches.length) {
    content = `<div class="match-list">${[1, 2, 3].map(() => `<div class="match-card"><div class="skeleton" style="width:45%;height:10px"></div><div class="skeleton" style="width:100%;height:70px;margin-top:12px;border-radius:14px"></div></div>`).join("")}</div>`;
  } else if (state.yumi.status === "error" && !matches.length) {
    content = `${notice("alert", `تعذر تحميل البث من Yumi Sports. ${esc(state.yumi.error || "تحقق من الاتصال.")}`, "notice--danger")}
      <button class="btn btn--soft btn--block mt-12" data-action="refreshYumi">${icon("refresh")} إعادة المحاولة</button>`;
  } else if (!matches.length) {
    content = emptyState("calendar", `لا توجد مباريات ${dayNames[day]}`, "قد لا يكون جدول Yumi Sports محدثاً بعد. جرّب يوماً آخر أو افتح الموقع مباشرة.", `<a class="btn btn--soft" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${icon("external")} فتح Yumi Sports</a>`);
  } else {
    content = `
      ${live.length ? `<div class="match-list__group">مباشر الآن</div><div class="match-list">${live.map(fullMatchCard).join("")}</div>` : ""}
      ${upcoming.length ? `<div class="match-list__group">قادمة</div><div class="match-list">${upcoming.map(fullMatchCard).join("")}</div>` : ""}
      ${finished.length ? `<div class="match-list__group">انتهت</div><div class="match-list">${finished.map(fullMatchCard).join("")}</div>` : ""}`;
  }

  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">بث مباشر</div>
      <h1>البث المباشر</h1>
      <p>اضغط على أي مباراة لمشاهدتها مباشرة من Yumi Sports داخل التطبيق، وعند الرجوع تبقى في مكانك.</p>
    </div>
    <div class="segmented mb-12">
      <button class="segmented__btn" data-go="matches">${icon("ball")} المباريات</button>
      <button class="segmented__btn is-active" data-go="live">${icon("play")} البث المباشر</button>
      <button class="segmented__btn" data-go="competitions">${icon("trophy")} البطولات</button>
    </div>
    <div class="date-strip">
      ${["today", "tomorrow", "yesterday"].map((value) => `<button class="date-pill ${day === value ? "is-active" : ""}" data-action="setYumiDay" data-day="${value}"><strong>${dayNames[value]}</strong><span>${esc(formatDateShort(yumiDayDate(value)))}</span></button>`).join("")}
    </div>
    <div class="source-card mt-16">
      <div class="source-card__top">
        <div class="source-card__icon">${icon("play")}</div>
        <div>
          <div class="source-card__title">Yumi Sports</div>
          <div class="source-card__meta">${state.yumi.updatedAt ? `آخر تحديث ${timeAgo(state.yumi.updatedAt)}` : "مصدر البث الخارجي"} · ${esc(dayNames[day])}</div>
        </div>
      </div>
      <div class="source-card__actions">
        <a class="btn btn--soft btn--small" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${icon("external")} فتح الموقع</a>
        <button class="btn btn--dark btn--small" data-action="refreshYumi">${icon("refresh")} تحديث</button>
      </div>
    </div>
    <div class="mt-12">${content}</div>
    <div class="notice mt-16">${icon("info")}<div>البث يُعرض من موقع Yumi Sports الخارجي. التطبيق لا يستضيف أي بث ولا يخزنه. عند إغلاق نافذة المشاهدة تعود تلقائياً إلى التطبيق.</div></div>
    <p class="version-note">مصدر البث: Yumi Sports · تتطلب المشاهدة اتصالاً بالإنترنت.</p>`;
}

/* --------------------------------------------------------------------------
   تفاصيل المباراة: البث، التشكيلات، والتوقع
   -------------------------------------------------------------------------- */
function formDots(form) {
  if (!Array.isArray(form) || !form.length) return "";
  return `<span class="form-dots">${form.map((result) => `<span class="form-dot form-dot--${result === "W" ? "win" : result === "L" ? "loss" : "draw"}">${result === "W" ? "ف" : result === "L" ? "خ" : "ت"}</span>`).join("")}</span>`;
}

function predictionHtml(prediction, fixture) {
  if (!prediction) return `<div class="skeleton" style="height:90px;border-radius:14px"></div>`;
  if (prediction.status === "loading" && !prediction.data) return `<div class="skeleton" style="height:90px;border-radius:14px"></div>`;
  if (!prediction.data) return emptyState("chart", "التوقع غير متاح", prediction.error || "لا توجد بيانات كافية لحساب توقع إحصائي لهذه المباراة.", "");
  const data = prediction.data;
  const home = Math.round((data.home || 0) * 100);
  const draw = Math.round((data.draw || 0) * 100);
  const away = Math.max(0, 100 - home - draw);
  const source = data.source === "api" ? "API-Football" : "توقع إحصائي مبني على نتائج OpenFootball";
  return `
    <div class="prediction">
      <div class="prediction__row">
        <span>${esc(fixture.home?.name || "الفريق الأول")}</span>
        <strong>${home}%</strong>
      </div>
      <div class="prediction__bar"><span class="prediction__fill prediction__fill--home" style="width:${home}%"></span></div>
      <div class="prediction__row">
        <span>تعادل</span>
        <strong>${draw}%</strong>
      </div>
      <div class="prediction__bar"><span class="prediction__fill prediction__fill--draw" style="width:${draw}%"></span></div>
      <div class="prediction__row">
        <span>${esc(fixture.away?.name || "الفريق الثاني")}</span>
        <strong>${away}%</strong>
      </div>
      <div class="prediction__bar"><span class="prediction__fill prediction__fill--away" style="width:${away}%"></span></div>
      ${data.lambdaHome ? `<div class="prediction__meta"><span>الأهداف المتوقعة: ${data.lambdaHome.toFixed(1)} — ${data.lambdaAway.toFixed(1)}</span><span>عينة: ${data.sample || 0} مباراة</span></div>` : ""}
      ${data.advice ? `<div class="prediction__advice">${icon("sparkles")} ${esc(data.advice)}</div>` : ""}
      ${data.homeForm || data.awayForm ? `<div class="prediction__form"><span>آخر ${esc(fixture.home?.name || "الأول")}: ${formDots(data.homeForm)}</span><span>آخر ${esc(fixture.away?.name || "الثاني")}: ${formDots(data.awayForm)}</span></div>` : ""}
      <p class="version-note">${esc(source)} — تقدير وليس ضماناً للنتيجة.</p>
    </div>`;
}

function lineupsHtml(lineup, fixture) {
  if (!state.settings.apiKey.trim()) {
    return emptyState("database", "التشكيلات تحتاج مفتاح API-Football", "التشكيلات الرسمية والبدلاء تُجلب من API-Football عند إضافة مفتاح مجاني. المصدر المفتوح الحالي يوفر النتائج والترتيب فقط.", `<button class="btn btn--primary" data-go="settings">${icon("settings")} إضافة المفتاح</button>`);
  }
  if (!lineup || lineup.status === "idle") return `<div class="skeleton" style="height:90px;border-radius:14px"></div>`;
  if (lineup.status === "loading" && !lineup.data) return `<div class="skeleton" style="height:90px;border-radius:14px"></div>`;
  if (lineup.status === "unavailable") return emptyState("database", "التشكيلات غير متاحة", lineup.error || "هذه المباراة من مصدر لا يوفر التشكيلات.", "");
  if (lineup.status === "error" || !Array.isArray(lineup.data) || !lineup.data.length) {
    return `${notice("alert", `تعذر تحميل التشكيلات. ${esc(lineup.error || "قد لا تكون التشكيلات منشورة بعد.")}`, "notice--danger")}
      <button class="btn btn--soft btn--block mt-12" data-action="refreshLineups" data-id="${esc(fixture.id)}">${icon("refresh")} إعادة المحاولة</button>`;
  }
  return `
    <div class="lineups">
      ${lineup.data.map((team) => `
        <div class="lineup">
          <div class="lineup__head">
            <div class="lineup__team">${team.logo ? `<img src="${esc(safeUrl(team.logo))}" alt="" loading="lazy" />` : ""}<strong>${esc(team.name)}</strong></div>
            <span class="lineup__formation">${esc(team.formation || "—")}</span>
          </div>
          <ul class="lineup__list">
            ${team.startXI.map((player) => `<li><span class="lineup__num">${esc(player.number)}</span><span class="lineup__name">${esc(player.name)}</span><em>${esc(player.pos)}</em></li>`).join("")}
          </ul>
          ${team.substitutes.length ? `<details class="lineup__subs"><summary>البدلاء (${team.substitutes.length})</summary><ul class="lineup__list">${team.substitutes.map((player) => `<li><span class="lineup__num">${esc(player.number)}</span><span class="lineup__name">${esc(player.name)}</span><em>${esc(player.pos)}</em></li>`).join("")}</ul></details>` : ""}
        </div>`).join("")}
    </div>`;
}

function fmLineupsHtml(lineup, fixture) {
  if (!lineup || lineup.status === "idle" || lineup.status === "loading") {
    return `<div class="skeleton" style="height:90px;border-radius:14px"></div>`;
  }
  if (lineup.status === "error") {
    return `${notice("info", esc(lineup.error || "لم يُعلن التشكيل بعد."), "")}
      <button class="btn btn--soft btn--block mt-12" data-action="refreshLineups" data-id="${esc(fixture.id)}">${icon("refresh")} إعادة المحاولة</button>`;
  }
  const sides = [lineup.home, lineup.away].filter(Boolean);
  if (!sides.length) return emptyState("database", "التشكيل غير متاح", "لم يُعلن تشكيل هذه المباراة بعد.", "");
  return `
    <div class="lineups">
      ${sides.map((team) => `
        <div class="lineup">
          <div class="lineup__head">
            <div class="lineup__team"><strong>${esc(team.name)}</strong></div>
            <span class="lineup__formation">${esc(team.formation || "?")}</span>
          </div>
          <ul class="lineup__list">
            ${team.starters.map((player) => `<li><span class="lineup__num">${esc(player.shirtNumber)}</span><span class="lineup__name">${esc(player.name)}</span>${player.rating ? `<em>${esc(String(player.rating))}</em>` : ""}</li>`).join("")}
          </ul>
          ${team.subs.length ? `<details class="lineup__subs"><summary>البدلاء (${team.subs.length})</summary><ul class="lineup__list">${team.subs.map((player) => `<li><span class="lineup__num">${esc(player.shirtNumber)}</span><span class="lineup__name">${esc(player.name)}</span></li>`).join("")}</ul></details>` : ""}
        </div>`).join("")}
    </div>
    <p class="version-note">التشكيل: FotMob</p>`;
}

/* --------------------------------------------------------------------------
   مركز المباراة — المجريات والإحصائيات والملعب والغيابات
   -------------------------------------------------------------------------- */
const FM_STAT_AR = {
  "ball possession": "الاستحواذ",
  possession: "الاستحواذ",
  "total shots": "التسديدات",
  shots: "التسديدات",
  "shots on target": "تسديدات على المرمى",
  "shots off target": "تسديدات خارج المرمى",
  "blocked shots": "تسديدات مصدودة",
  "shots inside box": "تسديدات داخل المنطقة",
  "shots outside box": "تسديدات خارج المنطقة",
  "big chances": "الفرص الكبرى",
  "big chances missed": "فرص كبرى مهدرة",
  corners: "الركنيات",
  fouls: "الأخطاء",
  "yellow cards": "بطاقات صفراء",
  "red cards": "بطاقات حمراء",
  offsides: "التسلل",
  passes: "التمريرات",
  "total passes": "إجمالي التمريرات",
  "accurate passes": "تمريرات صحيحة",
  "pass accuracy": "دقة التمرير",
  "long balls": "الكرات الطويلة",
  crosses: "العرضيات",
  "cross accuracy": "دقة العرضيات",
  tackles: "الاعتراضات",
  "tackles won": "اعتراضات ناجحة",
  interceptions: "قطع الكرات",
  clearances: "التشتيت",
  "duels won": "التحامات ناجحة",
  duels: "الالتحامات",
  "aerials won": "كرات هوائية مكتسبة",
  "ground duels won": "التحامات أرضية",
  saves: "تصديات",
  "goalkeeper saves": "تصديات الحارس",
  "keeper saves": "تصديات الحارس",
  blocks: "تسديدات مصدودة",
  "aerial duels won": "التحامات هوائية",
  "successful dribbles": "مراوغات ناجحة",
  "hit woodwork": "العارضة",
  punches: "لكمات الحارس",
  "expected goals (xg)": "الأهداف المتوقعة (xG)",
  "expected goals": "الأهداف المتوقعة (xG)",
  "expected assists (xa)": "التمريرات المتوقعة (xA)",
  "distance covered": "المسافة المقطوعة",
  sprints: "الانطلاقات",
  "top speed": "أقصى سرعة",
  touches: "اللمسات",
  "touches in opposition box": "لمسات داخل منطقة الخصم",
  "final third entries": "دخول الثلث الأخير",
  "errors leading to goal": "أخطاء أدت إلى هدف",
  dispossessed: "فقدان الكرة",
  "possession lost": "فقدان الاستحواذ"
};

const FM_STAT_GROUP_AR = {
  top_stats: "الأرقام الأبرز",
  shots: "التسديدات",
  expected_goals: "الأهداف المتوقعة",
  physical_metrics: "الأرقام البدنية",
  passes: "التمرير",
  defense: "الدفاع",
  duels: "الالتحامات",
  discipline: "الانضباط",
  attack: "الهجوم"
};

function fmStatLabel(item) {
  const title = String(item?.title || "").trim().toLowerCase();
  const key = String(item?.key || "").trim().toLowerCase();
  return FM_STAT_AR[title] || FM_STAT_AR[key] || item?.title || "إحصائية";
}

function fmGroupLabel(group) {
  const key = String(group?.key || "").trim().toLowerCase();
  return FM_STAT_GROUP_AR[key] || group?.title || "إحصائيات";
}

function fmRatingClass(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return "";
  if (value >= 7.5) return "is-great";
  if (value >= 6.5) return "is-good";
  if (value >= 5.5) return "is-ok";
  return "is-bad";
}

function fmEventMinute(event) {
  if (event?.minute === null || event?.minute === undefined) return "—";
  return `${event.minute}${event.extra ? `+${event.extra}` : ""}′`;
}

function fmGoalTagText(event) {
  const tags = [];
  if (event.isPenalty) tags.push("ركلة جزاء");
  if (event.ownGoal) tags.push("هدف عكسي");
  return tags.join(" · ");
}

function fmGoalSummaryHtml(fmLineup, fixture) {
  if (!fmLineup || fmLineup.status !== "ready") return "";
  const goals = (Array.isArray(fmLineup.events) ? fmLineup.events : []).filter((event) => event.type === "Goal");
  if (!goals.length) return "";
  const build = (side) => {
    const map = new Map();
    goals.filter((event) => event.side === side).forEach((event) => {
      const key = event.playerId || event.player || "player";
      if (!map.has(key)) map.set(key, { name: event.player || "لاعب", minutes: [] });
      const tag = event.isPenalty ? " (ج)" : event.ownGoal ? " (ع)" : "";
      map.get(key).minutes.push(`${fmEventMinute(event)}${tag}`);
    });
    return [...map.values()]
      .map((player) => `<span class="goal-summary__row"><strong>${esc(player.name)}</strong><span>${esc(player.minutes.join("، "))}</span></span>`)
      .join("");
  };
  const home = build("home");
  const away = build("away");
  if (!home && !away) return "";
  return `
    <div class="goal-summary" aria-label="هدافو المباراة">
      <div class="goal-summary__col goal-summary__col--home">${home}</div>
      <div class="goal-summary__col goal-summary__col--away">${away}</div>
    </div>`;
}

function fmTimelineRow(event, fixture) {
  if (!event) return "";
  const minute = fmEventMinute(event);
  const teamName = event.side === "home" ? (fixture.home?.name || "") : (fixture.away?.name || "");
  const sideClass = event.side === "home" ? "is-home" : "is-away";
  if (event.type === "Goal") {
    const meta = [];
    if (event.assist) meta.push(`بمساعدة ${event.assist}`);
    const tag = fmGoalTagText(event);
    if (tag) meta.push(tag);
    return `
      <div class="tl-row tl-row--goal ${sideClass}">
        <span class="tl-row__minute">${esc(minute)}</span>
        <span class="tl-row__icon tl-row__icon--goal">${icon("ball")}</span>
        <div class="tl-row__body">
          <span class="tl-row__title"><strong>${esc(event.player || "لاعب")}</strong>${event.score ? `<em class="tl-row__score">(${esc(event.score)})</em>` : ""}</span>
          <span class="tl-row__meta">${esc(meta.length ? meta.join(" · ") : teamName)}</span>
        </div>
      </div>`;
  }
  if (event.type === "Card") {
    const yellow = /yellow/i.test(event.card || "");
    const red = /red|second/i.test(event.card || "");
    return `
      <div class="tl-row ${sideClass}">
        <span class="tl-row__minute">${esc(minute)}</span>
        <span class="tl-row__icon"><i class="timeline__card ${red ? "timeline__card--red" : "timeline__card--yellow"}"></i></span>
        <div class="tl-row__body">
          <span class="tl-row__title"><strong>${esc(event.player || "لاعب")}</strong></span>
          <span class="tl-row__meta">${esc(teamName)} · ${red ? "بطاقة حمراء" : yellow ? "بطاقة صفراء" : "بطاقة"}</span>
        </div>
      </div>`;
  }
  if (event.type === "Substitution") {
    return `
      <div class="tl-row ${sideClass}">
        <span class="tl-row__minute">${esc(minute)}</span>
        <span class="tl-row__icon tl-row__icon--sub">${icon("refresh")}</span>
        <div class="tl-row__body">
          <span class="tl-row__title tl-row__in"><span class="tl-row__arrow">↑</span> ${esc(event.swapIn || event.player || "لاعب")}</span>
          <span class="tl-row__title tl-row__out"><span class="tl-row__arrow">↓</span> ${esc(event.swapOut || "—")}</span>
        </div>
      </div>`;
  }
  if (event.type === "AddedTime") {
    return `
      <div class="tl-row tl-row--added">
        <span class="tl-row__added">${icon("timer")} وقت بدل ضائع</span>
      </div>`;
  }
  if (event.type === "Half") {
    const label = /FT/i.test(event.half || "") ? "نهاية المباراة" : /HT/i.test(event.half || "") ? "نهاية الشوط الأول" : "نهاية شوط";
    return `
      <div class="tl-row tl-row--half">
        <span class="tl-row__half">${esc(label)}${event.score ? ` <b>${esc(event.score)}</b>` : ""}</span>
      </div>`;
  }
  return "";
}

function fmTimelineHtml(fmLineup, fixture) {
  if (!fmLineup || fmLineup.status === "loading") {
    return `<div class="skeleton" style="height:120px;border-radius:14px"></div>`;
  }
  if (fmLineup.status === "error") {
    return `${notice("info", esc(fmLineup.error || "لم تُنشر مجريات المباراة بعد."), "")}
      <button class="btn btn--soft btn--block mt-12" data-action="refreshLineups" data-id="${esc(fixture.id)}">${icon("refresh")} تحديث المجريات</button>`;
  }
  const events = Array.isArray(fmLineup.events) ? fmLineup.events : [];
  if (!events.length) {
    return emptyState("timer", "لا توجد أحداث بعد", "لم يُرصد أي هدف أو بطاقة أو تبديل حتى الآن. تُحدَّث المجريات تلقائياً من FotMob أثناء المباراة.", "");
  }
  const goals = events.filter((event) => event.type === "Goal").length;
  const live = isLiveFixture(fixture);
  return `
    <div class="timeline__status">
      ${live ? '<span class="live-dot"></span><b>مباشر</b>' : ""}
      <span>آخر تحديث ${esc(timeAgo(fmLineup.updatedAt))}</span>
      <button class="timeline__refresh" data-action="refreshLineups" data-id="${esc(fixture.id)}" aria-label="تحديث المجريات">${icon("refresh")}</button>
    </div>
    <div class="timeline">${events.map((event) => fmTimelineRow(event, fixture)).join("")}</div>
    <p class="version-note">${goals ? `${goals} هدف — ` : ""}المصدر: FotMob · تحديث تلقائي كل 20 ثانية أثناء المباراة.</p>`;
}

/* الإحصائيات المهمة فقط — تُعرض بترتيب ثابت ومختصر */
const FM_KEY_STATS = [
  { key: "ballpossesion", possession: true },
  { key: "expected_goals" },
  { key: "total_shots" },
  { key: "shotsontarget" },
  { key: "big_chance" },
  { key: "accurate_passes" },
  { key: "corners" },
  { key: "fouls" },
  { key: "yellow_cards" },
  { key: "offsides" },
  { key: "keeper_saves" }
];

function fmStatParts(raw) {
  const text = String(raw || "").replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim();
  const match = text.match(/^(.+?)\s*\((\d{1,3})%\)$/);
  return match ? { value: match[1].trim(), pct: match[2] } : { value: text, pct: "" };
}

function fmStatsHtml(fmLineup, fixture) {
  if (!fmLineup || fmLineup.status === "loading") {
    return `<div class="skeleton" style="height:140px;border-radius:14px"></div>`;
  }
  if (fmLineup.status === "error") {
    return notice("info", "إحصائيات المباراة غير متاحة من المصدر حالياً.", "");
  }
  const flat = new Map();
  (Array.isArray(fmLineup.stats) ? fmLineup.stats : []).forEach((group) => {
    (group.items || []).forEach((item) => {
      const key = String(item?.key || "").trim().toLowerCase();
      if (!key || flat.has(key) || !Array.isArray(item.values) || !item.values.length) return;
      flat.set(key, item);
    });
  });
  const rows = FM_KEY_STATS.map((def) => {
    const item = flat.get(def.key);
    if (!item) return "";
    const homeRaw = item.values[0] ?? "0";
    const awayRaw = item.values[1] ?? "0";
    const label = fmStatLabel(item);
    if (def.possession) {
      const homeText = `${homeRaw}${/%/.test(homeRaw) ? "" : "%"}`;
      const awayText = `${awayRaw}${/%/.test(awayRaw) ? "" : "%"}`;
      const homeNum = Number(String(homeRaw).replace(/[^\d.]/g, "")) || 0;
      const awayNum = Number(String(awayRaw).replace(/[^\d.]/g, "")) || 0;
      const total = homeNum + awayNum;
      const homePct = total > 0 ? Math.round((homeNum / total) * 100) : 50;
      return `
        <div class="stat-poss">
          <div class="stat-poss__bar" role="img" aria-label="${esc(`${label}: ${homeText} مقابل ${awayText}`)}">
            <span class="stat-poss__home" style="width:${homePct}%">${esc(homeText)}</span>
            <span class="stat-poss__away" style="width:${100 - homePct}%">${esc(awayText)}</span>
          </div>
          <span class="stat-poss__label">${esc(label)}</span>
        </div>`;
    }
    const home = fmStatParts(homeRaw);
    const away = fmStatParts(awayRaw);
    return `
      <div class="stat-line">
        <span class="stat-line__val stat-line__val--home">${esc(home.value)}${home.pct ? ` <em>${esc(home.pct)}%</em>` : ""}</span>
        <span class="stat-line__label">${esc(label)}</span>
        <span class="stat-line__val stat-line__val--away">${esc(away.value)}${away.pct ? ` <em>${esc(away.pct)}%</em>` : ""}</span>
      </div>`;
  }).filter(Boolean);
  if (!rows.length) {
    return emptyState("chart", "لا توجد إحصائيات منشورة", "لم يوفر المصدر أرقاماً لهذه المباراة بعد. تظهر الإحصائيات عادة بعد انتهاء الشوط الأول.", "");
  }
  return `
    <div class="match-stats match-stats--compact">${rows.join("")}</div>
    <p class="version-note">أهم الإحصائيات من FotMob — ${esc(fixture.home?.name || "الأول")} يميناً و${esc(fixture.away?.name || "الثاني")} يساراً.</p>`;
}

function fmPitchPlayer(player, teamName, info = {}) {
  if (!player) return "";
  const photo = player.photo || (typeof fmPlayerPhoto === "function" ? fmPlayerPhoto(player.id) : "");
  const rating = Number(player.rating);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const style = Number.isFinite(player.x) && Number.isFinite(player.y)
    ? ` style="left:${(player.x * 100).toFixed(2)}%;top:${((1 - player.y) * 100).toFixed(2)}%"`
    : "";
  const subMinute = info.subOutMinute;
  return `
    <div class="pitch-player${info.static ? " pitch-player--static" : ""}"${style} title="${esc(player.name || "")}${hasRating ? ` — ${rating.toFixed(1)}` : ""}">
      <span class="pitch-player__photo">
        ${photo ? `<img src="${esc(safeUrl(photo))}" alt="" loading="lazy" decoding="async" onerror="this.remove()" />` : ""}
        ${player.shirtNumber ? `<span class="pitch-player__num">${esc(player.shirtNumber)}</span>` : ""}
        ${hasRating ? `<span class="pitch-player__rating ${info.isMotm ? "is-motm" : fmRatingClass(rating)}">${rating.toFixed(1)}</span>` : ""}
        ${subMinute ? `<span class="pitch-player__sub" title="خرج في الدقيقة ${esc(subMinute)}">↓ ${esc(subMinute)}′</span>` : ""}
      </span>
      <span class="pitch-player__name">${esc(player.name || "")}</span>
    </div>`;
}

function fmPitchRows(team, info = {}) {
  const starters = Array.isArray(team?.starters) ? team.starters : [];
  if (!starters.length) return "";
  const lines = String(team.formation || "").split("-").map((part) => Number(part)).filter((n) => n > 0);
  const rows = [];
  let index = 0;
  rows.push([starters[index++]]);
  lines.forEach((count) => {
    const slice = starters.slice(index, index + count);
    index += count;
    if (slice.length) rows.push(slice);
  });
  while (index < starters.length) {
    rows.push([starters[index++]]);
  }
  return `
    <div class="pitch pitch--rows">
      ${rows.slice().reverse().map((row) => `
        <div class="pitch__row">
          ${row.map((player) => fmPitchPlayer(player, team.name, {
            static: true,
            isMotm: info.motmRating > 0 && Number(player.rating) === info.motmRating,
            subOutMinute: info.subOut ? info.subOut.get(player.name) : null
          })).join("")}
        </div>`).join("")}
    </div>`;
}

function fmMatchPitchHtml(fmLineup, fixture) {
  if (!fmLineup || fmLineup.status === "loading") {
    return `<div class="skeleton" style="height:220px;border-radius:14px"></div>`;
  }
  if (fmLineup.status === "error") {
    return `${notice("info", esc(fmLineup.error || "لم يُعلن التشكيل بعد."), "")}
      <button class="btn btn--soft btn--block mt-12" data-action="refreshLineups" data-id="${esc(fixture.id)}">${icon("refresh")} إعادة المحاولة</button>`;
  }
  const sides = [fmLineup.home, fmLineup.away].filter(Boolean);
  if (!sides.length) return emptyState("tactics", "التشكيل غير متاح", "لم يُعلن تشكيل هذه المباراة بعد.", "");
  const subEvents = (Array.isArray(fmLineup.events) ? fmLineup.events : []).filter((event) => event.type === "Substitution");
  const subOut = new Map();
  const subIn = new Map();
  subEvents.forEach((event) => {
    if (event.swapOut) subOut.set(event.swapOut, event.minute);
    if (event.swapIn) subIn.set(event.swapIn, event.minute);
  });
  const allRatings = sides
    .flatMap((team) => [...(team.starters || []), ...(team.subs || [])])
    .map((player) => Number(player.rating))
    .filter((value) => Number.isFinite(value) && value > 0);
  const motmRating = allRatings.length ? Math.max(...allRatings) : 0;
  return `
    <div class="pitch-stack">
      ${sides.map((team) => {
        const hasCoords = (team.starters || []).some((player) => Number.isFinite(player.x) && Number.isFinite(player.y));
        const ratings = (team.starters || []).map((player) => Number(player.rating)).filter((value) => Number.isFinite(value) && value > 0);
        const avg = ratings.length ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length) : null;
        return `
          <div class="pitch-block">
            <div class="pitch-block__head">
              <strong>${esc(team.name || "الفريق")}</strong>
              <span class="pitch-block__meta">
                ${team.formation ? `<em>${esc(team.formation)}</em>` : ""}
                ${avg !== null ? `<span class="pitch-block__avg ${fmRatingClass(avg)}">${avg.toFixed(1)}</span>` : ""}
              </span>
            </div>
            ${hasCoords
              ? `<div class="pitch">${(team.starters || []).map((player) => fmPitchPlayer(player, team.name, {
                  isMotm: motmRating >= 7 && Number(player.rating) === motmRating,
                  subOutMinute: subOut.get(player.name)
                })).join("")}</div>`
              : fmPitchRows(team, { motmRating, subOut })}
            ${team.subs?.length ? `
              <details class="lineup__subs">
                <summary>البدلاء (${team.subs.length})</summary>
                <ul class="lineup__list">
                  ${team.subs.map((player) => `<li><span class="lineup__num">${esc(player.shirtNumber)}</span><span class="lineup__name">${esc(player.name)}${subIn.has(player.name) ? `<em class="lineup__in">↑ دخل ${esc(subIn.get(player.name))}′</em>` : ""}</span>${Number.isFinite(Number(player.rating)) && Number(player.rating) > 0 ? `<em class="lineup__rating ${fmRatingClass(player.rating)}">${Number(player.rating).toFixed(1)}</em>` : ""}</li>`).join("")}
                </ul>
              </details>` : ""}
          </div>`;
      }).join("")}
    </div>
    <p class="version-note">التشكيل والتقييمات: FotMob — التقييم يظهر عند توفره بعد المباراة.</p>`;
}

const FM_RETURN_MONTHS = {
  january: "يناير", february: "فبراير", march: "مارس", april: "أبريل",
  may: "مايو", june: "يونيو", july: "يوليو", august: "أغسطس",
  september: "سبتمبر", october: "أكتوبر", november: "نوفمبر", december: "ديسمبر"
};

function fmReturnAr(text) {
  const raw = String(text || "").trim();
  if (!raw) return "غير محدد";
  const low = raw.toLowerCase();
  const fixed = {
    doubtful: "مشكوك في مشاركته",
    "out for season": "غائب حتى نهاية الموسم",
    "a few weeks": "بضعة أسابيع",
    "day to day": "تقييم يومي",
    "return unknown": "غير محدد",
    unknown: "غير محدد"
  };
  if (fixed[low]) return fixed[low];
  const part = low.match(/^(early|mid|late)\s+([a-z]+)\s+(\d{4})$/);
  if (part) {
    const prefix = part[1] === "early" ? "أوائل" : part[1] === "mid" ? "منتصف" : "أواخر";
    return `${prefix} ${FM_RETURN_MONTHS[part[2]] || part[2]} ${part[3]}`;
  }
  const monthOnly = low.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthOnly && FM_RETURN_MONTHS[monthOnly[1]]) return `${FM_RETURN_MONTHS[monthOnly[1]]} ${monthOnly[2]}`;
  return raw;
}

function fmInjuryItem(member) {
  const reason = member.injury && member.injury.expectedReturn
    ? `العودة المتوقعة: ${fmReturnAr(member.injury.expectedReturn)}`
    : "مدة الغياب غير محددة";
  return `
    <li class="injury-item">
      <span class="injury-item__photo">
        ${member.photo ? `<img src="${esc(safeUrl(member.photo))}" alt="" loading="lazy" decoding="async" onerror="this.remove()" />` : ""}
        ${member.shirtNumber ? `<span class="injury-item__num">${esc(member.shirtNumber)}</span>` : ""}
      </span>
      <span class="injury-item__body">
        <strong>${esc(member.name || "لاعب")}</strong>
        <span>${esc(member.position || member.positionDesc || "—")} · ${esc(reason)}</span>
      </span>
      <em class="injury-item__tag">إصابة</em>
    </li>`;
}

function fmInjuriesHtml(fixture) {
  if (fixture.source !== "fotmob") {
    return notice("info", "الإصابات والموقوفون غير متوفرة لهذا المصدر. تُعرض فقط لمباريات FotMob.", "");
  }
  const sides = [
    { team: fixture.home, name: fixture.home?.name || "الفريق الأول" },
    { team: fixture.away, name: fixture.away?.name || "الفريق الثاني" }
  ];
  const profiles = sides.map((side) => (typeof getFmTeam === "function" && side.team?.id ? getFmTeam(side.team.id) : null));
  const anyReady = profiles.some((profile) => profile && profile.status === "ready");
  if (!anyReady) {
    return `${notice("info", "جارٍ جلب قائمة الإصابات من FotMob…", "")}
      <div class="skeleton mt-12" style="height:64px;border-radius:14px"></div>`;
  }
  return `
    <div class="injury-stack">
      ${sides.map((side, index) => {
        const profile = profiles[index];
        if (!profile) {
          return `
            <div class="injury-block">
              <div class="injury-block__head"><strong>${esc(side.name)}</strong></div>
              <p class="injury-block__empty">جارٍ جلب بيانات الفريق…</p>
            </div>`;
        }
        if (profile.status !== "ready") {
          return `
            <div class="injury-block">
              <div class="injury-block__head"><strong>${esc(side.name)}</strong></div>
              <p class="injury-block__empty">${profile.status === "loading" ? "جارٍ جلب بيانات الفريق…" : "تعذر جلب بيانات هذا الفريق من المصدر."}</p>
            </div>`;
        }
        const injured = (profile.squad || [])
          .filter((group) => group.title !== "coach")
          .flatMap((group) => group.members || [])
          .filter((member) => member.injured || member.injury);
        return `
          <div class="injury-block">
            <div class="injury-block__head">
              <strong>${esc(side.name)}</strong>
              <span>${injured.length ? `${injured.length} غياب` : "لا إصابات"}</span>
            </div>
            ${injured.length
              ? `<ul class="injury-list">${injured.map(fmInjuryItem).join("")}</ul>`
              : `<p class="injury-block__empty">لا توجد إصابات موثّقة في قائمة الفريق حالياً.</p>`}
          </div>`;
      }).join("")}
    </div>
    <p class="version-note">الإصابات من قائمة فرق FotMob. الإيقافات تظهر عند نشرها ضمن بيانات المباراة من المصدر.</p>`;
}

function fmH2hHtml(fmLineup, fixture) {
  const now = Date.now();
  const matches = (Array.isArray(fmLineup?.h2h) ? fmLineup.h2h : [])
    .filter((match) => match?.status?.scoreStr && new Date(match.time?.utcTime || 0).getTime() < now)
    .sort((a, b) => new Date(b.time?.utcTime || 0) - new Date(a.time?.utcTime || 0))
    .slice(0, 4);
  if (!matches.length) return "";
  return `
    <div class="h2h-list">
      ${matches.map((match) => {
        const [homeGoals, awayGoals] = fmParseScoreStr(match.status.scoreStr);
        const homeName = fmTeamName(match.home?.name) || match.home?.name || "";
        const awayName = fmTeamName(match.away?.name) || match.away?.name || "";
        const homeWin = homeGoals > awayGoals;
        const awayWin = awayGoals > homeGoals;
        return `
          <div class="h2h-row">
            <span class="h2h-row__date">${esc(formatMecca(match.time?.utcTime, { year: "numeric" }))}</span>
            <span class="h2h-row__team ${homeWin ? "is-win" : ""}">${esc(homeName)}</span>
            <strong class="h2h-row__score">${scorePair(homeGoals, awayGoals)}</strong>
            <span class="h2h-row__team h2h-row__team--away ${awayWin ? "is-win" : ""}">${esc(awayName)}</span>
          </div>`;
      }).join("")}
    </div>
    <p class="version-note">المواجهات السابقة: FotMob</p>`;
}

function fmMatchFormHtml(fixture) {
  if (fixture.source !== "fotmob" || typeof getFmTeam !== "function") return "";
  const block = (teamId, teamName) => {
    const profile = getFmTeam(teamId);
    if (!profile || profile.status !== "ready") return "";
    const past = (Array.isArray(profile.fixtures) ? profile.fixtures : [])
      .filter((item) => item.statusShort === "FT" && item.home?.score !== null && item.home?.score !== undefined
        && item.away?.score !== null && item.away?.score !== undefined && String(item.id) !== String(fixture.fmId))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
    if (!past.length) return "";
    return `
      <div class="form-block">
        <div class="form-block__head"><strong>${esc(teamName || "الفريق")}</strong><span>آخر ${past.length} مباريات</span></div>
        <div class="team-results">${past.map((item) => fmTeamResultRow(item, teamId)).join("")}</div>
      </div>`;
  };
  const home = block(fixture.home?.id, fixture.home?.name);
  const away = block(fixture.away?.id, fixture.away?.name);
  if (!home && !away) return "";
  return `${home}${away}`;
}

function headToHeadFixtures(fixture, comp) {
  if (!comp) return [];
  const home = normalizeTeamName(fixture.home?.rawName || fixture.home?.name);
  const away = normalizeTeamName(fixture.away?.rawName || fixture.away?.name);
  if (!home || !away) return [];
  return getOpenMatches(comp.id)
    .filter((item) => {
      const a = normalizeTeamName(item.home?.rawName || item.home?.name);
      const b = normalizeTeamName(item.away?.rawName || item.away?.name);
      return (a === home && b === away) || (a === away && b === home);
    })
    .filter((item) => item.goals?.home !== null && item.goals?.home !== undefined)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);
}

function renderMatchDetail(route) {
  const fixture = getFixtureById(route.id);
  if (!fixture) {
    if (/^fm-/.test(String(route.id))) {
      return `
        <div class="page-intro">
          <div class="page-intro__eyebrow">مركز المباراة</div>
          <h1>جارٍ تحميل المباراة</h1>
          <p>نجلب النتيجة والأهداف والإحصائيات والتشكيل من FotMob مباشرة.</p>
        </div>
        <div class="section">
          <div class="skeleton" style="height:120px;border-radius:18px"></div>
          <div class="skeleton mt-12" style="height:180px;border-radius:18px"></div>
        </div>`;
    }
    return `${emptyState("alert", "المباراة غير متوفرة", "ربما تغيّر جدول المباريات أو انتهت صلاحية الرابط. عد إلى قائمة المباريات واختر مباراة أخرى.", `<button class="btn btn--primary" data-go="matches">${icon("ball")} العودة للمباريات</button>`)}`;
  }
  const comp = getCompetitionForFixture(fixture);
  const lineup = state.lineups[fixture.id] || { status: "idle" };
  const fmLineup = fixture.source === "fotmob" && typeof getFmLineups === "function" ? getFmLineups(fixture.fmId) : null;
  const prediction = state.predictions[fixture.id] || null;
  const h2h = headToHeadFixtures(fixture, comp);
  const fmH2h = fixture.source === "fotmob" ? fmH2hHtml(fmLineup, fixture) : "";
  const showPrediction = fixture.source !== "fotmob" || Boolean(prediction && prediction.data);
  const hasScore = fixture.goals?.home !== null && fixture.goals?.home !== undefined;
  const watchUrl = watchUrlForFixture(fixture);

  return `
    <div class="match-hero">
      <div class="match-hero__top">
        <span class="match-hero__league">${leagueMark(fixture.league, "league-mark--inline")} ${esc(fixture.league?.name || "مباراة")}</span>
        ${matchSourceBadge(fixture)}
      </div>
      <div class="match-hero__teams">
        <div class="match-hero__team">${matchCrest(fixture.home)}<strong>${esc(fixture.home?.name || "الفريق الأول")}</strong></div>
        <div class="match-hero__center">
          <div class="match-hero__score">${hasScore ? scorePair(fixture.goals.home, fixture.goals.away) : "VS"}</div>
          <div class="match-hero__status ${isLiveFixture(fixture) && fixture.statusShort !== "HT" ? "is-live" : ""}">${isLiveFixture(fixture) && fixture.statusShort !== "HT" ? '<span class="live-dot"></span>' : ""}<span${matchClockAttr(fixture)}>${esc(matchStatusLabel(fixture))}</span></div>
          <div class="match-hero__time">${esc(formatDateShort(String(fixture.date).slice(0, 10)))} · ${esc(formatClock(fixture.date))} · ${MECCA_LABEL}</div>
        </div>
        <div class="match-hero__team">${matchCrest(fixture.away)}<strong>${esc(fixture.away?.name || "الفريق الثاني")}</strong></div>
      </div>
      ${fixture.source === "fotmob" ? fmGoalSummaryHtml(fmLineup, fixture) : ""}
      <div class="match-hero__meta">
        ${fixture.league?.round ? `<span>${icon("calendar")} ${esc(fixture.league.round)}</span>` : ""}
        ${fixture.channel ? `<span>${icon("play")} ${esc(fixture.channel)}</span>` : ""}
        ${fixture.venue ? `<span>${icon("location")} ${esc(fixture.venue)}</span>` : ""}
      </div>
      <div class="match-hero__actions">
        <button class="btn btn--primary" data-action="openWatch" data-url="${esc(watchUrl)}" data-title="${esc(`${fixture.home?.name || ""} ضد ${fixture.away?.name || ""}`)}">${icon("play")} شاهد البث المباشر</button>
        <button class="btn btn--soft" data-action="shareMatch" data-id="${esc(fixture.id)}">${icon("share")} مشاركة</button>
      </div>
    </div>

    ${fixture.source === "fotmob" ? `
    <div class="section">
      ${sectionHead("مجريات المباراة", "الأهداف والبطاقات والتبديلات لحظة بلحظة")}
      ${fmTimelineHtml(fmLineup, fixture)}
    </div>

    <div class="section">
      ${sectionHead("إحصائيات المباراة", "مقارنة الأداء بين الفريقين")}
      ${fmStatsHtml(fmLineup, fixture)}
    </div>

    <div class="section">
      ${sectionHead("التشكيلات والتقييمات", "الرسم التكتيكي وتقييم كل لاعب في المباراة")}
      ${fmMatchPitchHtml(fmLineup, fixture)}
    </div>

    <div class="section">
      ${sectionHead("الإصابات والموقوفون", "غيابات الفريقين حسب المصدر")}
      ${fmInjuriesHtml(fixture)}
    </div>` : `
    <div class="section">
      ${sectionHead("التشكيلات", "التشكيل الرسمي والبدلاء")}
      ${lineupsHtml(lineup, fixture)}
    </div>`}

    ${showPrediction ? `
    <div class="section">
      ${sectionHead("توقع المباراة", "احتمالات الفوز والتعادل")}
      ${predictionHtml(prediction, fixture)}
    </div>` : ""}

    ${fixture.source === "fotmob" ? `<div class="section">${sectionHead("مستوى الفريق", "آخر 5 مباريات لكل فريق")}${fmMatchFormHtml(fixture)}</div>` : ""}

    ${fmH2h ? `<div class="section">${sectionHead("المواجهات السابقة", "آخر المواجهات بين الفريقين")}${fmH2h}</div>` : ""}
    ${h2h.length ? `<div class="section">${sectionHead("المواجهات السابقة", "آخر المواجهات بين الفريقين")}<div class="match-list">${h2h.map(fullMatchCard).join("")}</div></div>` : ""}

    <div class="notice mt-16">${icon("info")}<div>المجريات والإحصائيات والتشكيلات والتقييمات من FotMob. التوقع الإحصائي تقدير وليس ضماناً للنتيجة.</div></div>
    <p class="version-note">${esc(fixture.sourceLabel || "مصدر مفتوح")} · ${esc(comp?.name || fixture.league?.name || "كرة القدم")}</p>`;
}

/* --------------------------------------------------------------------------
   الأخبار
   -------------------------------------------------------------------------- */
function externalNewsCard(item) {
  const url = safeUrl(item.url);
  if (!url) return "";
  return `
    <a class="external-news" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
      ${item.image ? `<span class="external-news__img"><img src="${esc(safeUrl(item.image))}" alt="" loading="lazy" decoding="async" /></span>` : `<span class="external-news__img external-news__img--art">${icon("news")}</span>`}
      <span class="external-news__body">
        <span class="external-news__source">${esc(item.source?.name || "مصدر خارجي")}</span>
        <span class="external-news__title">${esc(item.title || "")}</span>
        <span class="external-news__meta">${icon("clock")} ${timeAgo(item.publishedAt)} ${icon("external")}</span>
      </span>
    </a>`;
}

/* تصنيف أخبار FotMob حسب البطولة عبر كلمات مفتاحية موثوقة في العناوين */
const FM_NEWS_LEAGUES = [
  { id: "epl", fmId: 47, name: "الدوري الإنجليزي", strong: ["الدوري الإنجليزي", "البريميرليغ", "البريميرليج", "بريميرليغ"], clubs: ["مانشستر", "ليفربول", "أرسنال", "تشيلسي", "توتنهام", "نيوكاسل", "إيفرتون", "أستون فيلا", "وست هام"] },
  { id: "laliga", fmId: 87, name: "الدوري الإسباني", strong: ["الدوري الإسباني", "الليغا", "لاليغا"], clubs: ["ريال مدريد", "برشلونة", "أتلتيكو", "إشبيلية", "فالنسيا", "ريال سوسيداد", "فياريال", "بيتيس"] },
  { id: "seriea", fmId: 55, name: "الدوري الإيطالي", strong: ["الدوري الإيطالي", "الكالتشيو", "سيري آ"], clubs: ["يوفنتوس", "إنتر", "ميلان", "نابولي", "روما", "لاتسيو", "أتالانتا"] },
  { id: "bundesliga", fmId: 54, name: "الدوري الألماني", strong: ["الدوري الألماني", "البوندسليغا", "بوندسليغا"], clubs: ["بايرن", "دورتموند", "ليفركوزن", "لايبزيغ", "شتوتغارت"] },
  { id: "ligue1", fmId: 53, name: "الدوري الفرنسي", strong: ["الدوري الفرنسي", "ليغ 1", "ليغ1"], clubs: ["باريس سان جيرمان", "مارسيليا", "ليون", "موناكو", "ليل"] },
  { id: "saudi", fmId: 536, name: "دوري روشن السعودي", strong: ["دوري روشن", "الدوري السعودي"], clubs: ["الهلال", "النصر", "الاتحاد", "الأهلي", "الشباب", "الاتفاق", "الفتح"] },
  { id: "yemen", fmId: 0, name: "الدوري اليمني", strong: ["الدوري اليمني", "دوري اليمن"], clubs: ["شعب إب", "الصقر", "العروبة", "الوحدة", "حضرموت"] },
  { id: "ucl", fmId: 42, name: "دوري أبطال أوروبا", strong: ["دوري أبطال أوروبا", "دوري الأبطال", "أبطال أوروبا"], clubs: [] }
];

function fmNewsGroups(articles) {
  const used = new Set();
  const groups = new Map();
  const add = (league, item) => {
    if (!groups.has(league.id)) groups.set(league.id, { ...league, items: [] });
    groups.get(league.id).items.push(item);
    used.add(item.id);
  };

  FM_NEWS_LEAGUES.forEach((league) => {
    articles.forEach((item) => {
      if (used.has(item.id)) return;
      const text = `${item.title} ${item.lead || ""}`;
      if (league.strong.some((word) => text.includes(word))) add(league, item);
    });
  });

  const clubOrder = [...FM_NEWS_LEAGUES].sort((a, b) => Number(a.id === "ucl") - Number(b.id === "ucl"));
  clubOrder.forEach((league) => {
    if (!league.clubs.length) return;
    articles.forEach((item) => {
      if (used.has(item.id)) return;
      const text = `${item.title} ${item.lead || ""}`;
      if (league.clubs.some((word) => text.includes(word))) add(league, item);
    });
  });

  const other = articles.filter((item) => !used.has(item.id)).slice(0, 6);
  if (other.length) groups.set("other", { id: "other", name: "أخبار أخرى", items: other });

  return [...groups.values()].map((group) => ({ ...group, items: group.items.slice(0, 4) }));
}

function trendingNewsRow(item, index) {
  const url = safeUrl(item.url);
  if (!url) return "";
  return `
    <a class="trend-news" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
      <span class="trend-news__rank">${index + 1}</span>
      <span class="trend-news__body">
        <span class="trend-news__title">${esc(item.title || "")}</span>
        <span class="trend-news__meta">${esc(item.source?.name || "FotMob")} · ${timeAgo(item.publishedAt)}</span>
      </span>
      <span class="trend-news__thumb">${item.image ? `<img src="${esc(safeUrl(item.image))}" alt="" loading="lazy" decoding="async" onerror="this.remove()" />` : icon("news")}</span>
    </a>`;
}

function newsBlock(title, items, options = {}) {
  if (!items.length) return "";
  const mark = options.league ? leagueMark(options.league, "league-mark--inline") : `<span class="news-block__icon">${icon(options.icon || "sparkles")}</span>`;
  const moreUrl = options.moreUrl ? safeUrl(options.moreUrl) : "";
  return `
    <div class="news-block">
      <div class="news-block__head">
        ${mark}
        <span class="news-block__title">${esc(title)}</span>
        ${options.badge ? `<span class="news-block__badge">${esc(options.badge)}</span>` : ""}
      </div>
      <div class="trend-list">${items.map(trendingNewsRow).join("")}</div>
      ${moreUrl ? `<a class="news-block__more" href="${esc(moreUrl)}" target="_blank" rel="noopener noreferrer">شاهد المزيد ${icon("arrowLeft")}</a>` : ""}
    </div>`;
}

function renderNews() {
  const hasNewsKey = Boolean(state.settings.newsKey.trim());
  const categories = ["الكل", ...new Set(state.data.articles.map((article) => article.category))];
  const local = state.data.articles.filter((article) => state.ui.newsCat === "الكل" || article.category === state.ui.newsCat);
  const featured = local.find((article) => article.featured) || local[0];
  const rest = local.filter((article) => article.id !== featured?.id);
  const fmNews = state.fmNews || { status: "idle", trending: [], latest: [] };
  const trending = (fmNews.trending || []).filter((item) => item.title && item.url);
  const latest = (fmNews.latest || []).filter((item) => item.title && item.url);
  const seen = new Set();
  const pool = [...trending, ...latest].filter((item) => {
    const key = item.id || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const groups = fmNewsGroups(pool);
  const gnews = (state.newsFeed.articles || []).filter((item) => item.title);

  let fmHtml = "";
  if (fmNews.status === "loading" && !pool.length) {
    fmHtml = `<div class="news-block"><div class="trend-list">${[1, 2, 3, 4].map(() => `<div class="trend-news"><span class="skeleton" style="width:26px;height:26px;border-radius:50%"></span><span class="trend-news__body"><span class="skeleton" style="display:block;width:82%;height:11px"></span><span class="skeleton" style="display:block;width:45%;height:8px;margin-top:7px"></span></span><span class="skeleton" style="width:74px;height:52px;border-radius:10px"></span></div>`).join("")}</div></div>`;
  } else if (fmNews.status === "error" && !pool.length) {
    fmHtml = notice("alert", `تعذر تحديث أخبار FotMob. ${esc(fmNews.error || "تحقق من الاتصال بالإنترنت.")}`, "notice--danger");
  } else {
    fmHtml = [
      newsBlock("الأكثر رواجاً", trending.slice(0, 5), { icon: "sparkles", badge: "FotMob", moreUrl: "https://www.fotmob.com/ar/news" }),
      ...groups.map((group) => newsBlock(group.name, group.items, {
        league: group.fmId ? { fmId: group.fmId, appId: group.id, name: group.name } : null,
        icon: "trophy",
        moreUrl: group.fmId ? `https://www.fotmob.com/ar/leagues/${group.fmId}/news` : "https://www.fotmob.com/ar/news"
      }))
    ].join("");
  }

  let gnewsHtml = "";
  if (hasNewsKey && gnews.length) {
    gnewsHtml = `<div class="section">${sectionHead("مصادر إضافية", "أخبار عربية من GNews")}<div class="external-news-list mt-12">${gnews.slice(0, 8).map(externalNewsCard).join("")}</div></div>`;
  }

  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">مجلة وصل</div>
      <h1>الأخبار والتحليلات</h1>
      <p>أخبار كرة القدم العربية والعالمية مباشرة من FotMob، مصنّفة حسب البطولة، مع محتوى تحريري أصلي من فريق وصل الحسيني.</p>
    </div>
    <div class="chip-row">${categories.map((category) => `<button class="chip ${state.ui.newsCat === category ? "is-active" : ""}" data-action="setNewsCat" data-value="${esc(category)}">${esc(category)}</button>`).join("")}</div>

    <div class="section">
      ${sectionHead("أخبار الدوريات", "من FotMob العربي · تصنيف حسب البطولة", `<a class="section__link" href="https://www.fotmob.com/ar/news" target="_blank" rel="noopener noreferrer">${icon("external")} المصدر</a>`)}
      ${fmHtml}
    </div>

    ${gnewsHtml}

    <div class="section">
      ${sectionHead("مجلة وصل", "محتوى تحريري من فريق التطبيق")}
      ${featured ? `
        <button class="article-feature" data-go="article/${esc(featured.id)}">
          <img class="article-feature__img" src="${esc(featured.image || "assets/images/hero.jpg")}" alt="" loading="lazy" decoding="async" />
          <span class="article-feature__body">
            <span class="article-feature__badge">${icon("sparkles")} ${esc(featured.category)}</span>
            <span class="article-feature__title">${esc(featured.title)}</span>
            <span class="article-feature__meta"><span>${featured.readTime || 4} دقائق قراءة</span><span class="sep"></span><span>${esc(featured.author || "مجلة وصل")}</span></span>
          </span>
        </button>` : ""}
      <div class="article-list mt-12">${rest.map(articleRow).join("")}</div>
      ${!local.length ? emptyState("news", "لا توجد مقالات في هذا التصنيف", "اختر تصنيفاً آخر أو تصفح كل المحتوى.", `<button class="btn btn--soft" data-action="setNewsCat" data-value="الكل">كل المقالات</button>`) : ""}
    </div>`;
}

function renderArticle(route) {
  const article = getArticleById(route.id);
  if (!article) return renderNotFound();
  markArticleRead(article.id);
  const related = state.data.articles.filter((item) => item.id !== article.id && item.category === article.category).slice(0, 3);
  const body = (article.body || []).map((block) => {
    if (block.type === "h") return `<h3>${esc(block.text)}</h3>`;
    if (block.type === "quote") return `<blockquote>${esc(block.text)}</blockquote>`;
    return `<p>${esc(block.text)}</p>`;
  }).join("");

  const hero = article.image
    ? `<img src="${esc(article.image)}" alt="" />`
    : `<div class="article-art" style="${artStyle(article.art)}"><span class="article-art__num">وصل</span><span class="article-art__icon">${icon((ART[article.art] || ART.tactics).icon)}</span></div>`;

  return `
    <div class="article-hero">
      ${hero}
      <div class="article-hero__content">
        <span class="article-detail__cat">${esc(article.category)}</span>
        <h1 class="article-detail__title">${esc(article.title)}</h1>
        <div class="article-detail__meta">
          <span>${icon("user")} ${esc(article.author || "مجلة وصل")}</span>
          <span>${icon("calendar")} ${formatDateShort(article.date)}</span>
          <span>${icon("clock")} ${article.readTime || 3} دقائق</span>
        </div>
      </div>
    </div>
    <div class="article-body">
      <p style="font-weight:700;color:var(--orange-soft)">${esc(article.excerpt || "")}</p>
      ${body}
      <div class="article-source">${icon("info")} هذا المقال محتوى تحريري أصلي من فريق وصل الحسيني، وليس خبراً عاجلاً منقولاً. الأخبار الخارجية تظهر فقط عند ربط مصدر أخبار موثوق.</div>
      <div class="article-actions">
        <button class="btn ${isFavorite("article", article.id) ? "btn--soft" : "btn--primary"}" data-action="toggleFavorite" data-type="article" data-id="${esc(article.id)}">${heartIcon(isFavorite("article", article.id))} ${isFavorite("article", article.id) ? "محفوظ في المفضلة" : "حفظ المقال"}</button>
        <button class="btn btn--dark" data-action="shareArticle" data-id="${esc(article.id)}">${icon("share")} مشاركة</button>
      </div>
    </div>
    ${related.length ? `<div class="section">${sectionHead("مقالات ذات صلة", "من نفس التصنيف")}<div class="related-list">${related.map(articleRow).join("")}</div></div>` : ""}`;
}

/* --------------------------------------------------------------------------
   الأكاديمية
   -------------------------------------------------------------------------- */
function drillCard(drill) {
  const art = ART[drill.art] || ART.control;
  const done = isDrillDone(drill.id);
  return `
    <button class="drill-card" data-go="drill/${esc(drill.id)}">
      <span class="drill-card__art">
        <img class="drill-card__img" src="${esc(academyImage(drill.art))}" alt="" decoding="async" />
      </span>
      <span class="drill-card__glyph">${icon(art.icon)}</span>
      ${done ? `<span class="drill-card__done">${icon("check")}</span>` : ""}
      <span class="drill-card__body">
        <span class="drill-card__level">${esc(drill.level)}</span>
        <span class="drill-card__title">${esc(drill.title)}</span>
        <span class="drill-card__meta"><span>${icon("clock")} ${drill.duration} د</span><span>${icon("target")} ${esc(drill.category)}</span></span>
      </span>
    </button>`;
}

function renderAcademy() {
  const levels = ["الكل", "مبتدئ", "متوسط", "متقدم"];
  const categories = ["الكل", ...new Set(state.data.drills.map((drill) => drill.category))];
  const activeCat = state.ui.academyCat;
  const drills = state.data.drills.filter((drill) => {
    if (state.ui.academyLevel !== "الكل" && drill.level !== state.ui.academyLevel) return false;
    if (activeCat === "التمرير والتحكم") return ["تمرير", "تحكم"].includes(drill.category);
    if (activeCat !== "الكل" && drill.category !== activeCat) return false;
    return true;
  });
  const done = completedDrillIds().length;
  const minutes = completedMinutes();
  const streak = computeStreak();

  const tracks = [
    { cat: "مراوغة", title: "المرواغات", desc: "تجاوز المدافع وتغيير الاتجاه بثقة", img: "assets/images/academy/dribbling.svg", icon: "dribble" },
    { cat: "لياقة", title: "الرشاقة", desc: "سرعة القدمين والتوازن والاستجابة", img: "assets/images/academy/agility.svg", icon: "speed" },
    { cat: "تسديد", title: "التسديد", desc: "قوة ودقة واختيار الزاوية المناسبة", img: "assets/images/academy/shooting.svg", icon: "shoot" },
    { cat: "التمرير والتحكم", title: "التمرير والتحكم", desc: "أول لمسة سليمة وتمرير بلمستين", img: "assets/images/academy/passing.svg", icon: "target" }
  ];
  const trackCount = (cat) => (cat === "التمرير والتحكم"
    ? state.data.drills.filter((drill) => ["تمرير", "تحكم"].includes(drill.category)).length
    : state.data.drills.filter((drill) => drill.category === cat).length);
  const trackLabel = (count) => (count === 1 ? "تمرين واحد" : count === 2 ? "تمرينان" : count <= 10 ? `${count} تمارين` : `${count} تمريناً`);

  const week = [
    { day: "السبت", id: "d1", focus: "تحكم وأول لمسة" },
    { day: "الأحد", id: "d2", focus: "مراوغة في مساحة ضيقة" },
    { day: "الاثنين", rest: true, focus: "راحة وإطالة خفيفة" },
    { day: "الثلاثاء", id: "d3", focus: "تمرير بلمستين" },
    { day: "الأربعاء", id: "d7", focus: "رشاقة وسرعة قدمين" },
    { day: "الخميس", id: "d4", focus: "تسديد من حدود المنطقة" },
    { day: "الجمعة", id: "d8", focus: "إنهاء الهجمة بلمسة واحدة" }
  ];

  const safety = [
    "ابدأ بإحماء 5–8 دقائق قبل أي تمرين، خصوصاً في الطقس الحار.",
    "اشرب ماءً بين المجموعات، وخُذ راحة كافية قبل التمرين التالي.",
    "اختر أرضاً مستوية وحذاءً رياضياً مناسباً، وأبعد الأقماع عن الطريق.",
    "توقف فوراً عند أي ألم في الكاحل أو الركبة أو العضلات."
  ];

  return `
    <div class="academy-hero">
      <img class="academy-hero__img" src="assets/images/academy/team.svg" alt="" />
      <span class="academy-hero__eyebrow">أكاديمية وصل الحسيني</span>
      <span class="academy-hero__title">من الغويزي<br>إلى الملعب</span>
      <span class="academy-hero__text">فريق شعبي من حضرموت — الغويزي، يضم لاعبين وشباباً من المنطقة. هنا نبني الأساس: مهارة، رشاقة، وتسديد.</span>
      <button class="btn btn--primary btn--small academy-hero__cta" data-action="scrollToDrills">${icon("play")} ابدأ التدريب</button>
    </div>

    <div class="progress-strip">
      <div class="progress-stat"><strong>${done}</strong><span>تمرين مكتمل</span></div>
      <div class="progress-stat"><strong>${minutes}</strong><span>دقيقة تدريب</span></div>
      <div class="progress-stat"><strong>${streak}</strong><span>يوم متتالي</span></div>
    </div>

    <div class="section">
      ${sectionHead("قصة الفريق", "وصل الحسيني — الغويزي، حضرموت")}
      <div class="academy-story">
        <img class="academy-story__img" src="assets/images/academy/team.svg" alt="" decoding="async" />
        <div class="academy-story__body">
          <p>وصل الحسيني فريق شعبي في اليمن، محافظة حضرموت — الغويزي. فريق كرة قدم يضم لاعبين وشباباً من المنطقة، يجمعهم حب اللعبة وروح الفريق الواحد.</p>
          <p>الطموح كبير جداً: أن يتطور كل لاعب، وأن يمثّل الفريق منطقته بأفضل صورة. هذه الأكاديمية امتداد لذلك الحلم.</p>
          <div class="academy-story__tags">
            <span>${icon("ball")} فريق شعبي</span>
            <span>${icon("users")} شباب المنطقة</span>
            <span>${icon("flame")} طموح كبير</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      ${sectionHead("مسارات التدريب", "اختر المسار الذي تريد تطويره")}
      <div class="track-list">
        ${tracks.map((track) => `
          <button class="track-card ${activeCat === track.cat ? "is-active" : ""}" data-action="setAcademyTrack" data-value="${esc(track.cat)}">
            <span class="track-card__img"><img src="${esc(track.img)}" alt="" decoding="async" /></span>
            <span class="track-card__body">
              <span class="track-card__title">${icon(track.icon)} ${esc(track.title)}</span>
              <span class="track-card__desc">${esc(track.desc)}</span>
              <span class="track-card__meta">${trackLabel(trackCount(track.cat))} · من المبتدئ إلى المتقدم</span>
            </span>
            <span class="track-card__arrow">${icon("arrowLeft")}</span>
          </button>`).join("")}
      </div>
    </div>

    <div class="section" id="drillsSection">
      ${sectionHead("التمارين", "اختر المستوى والفئة")}
      <div class="chip-row">${levels.map((level) => `<button class="chip ${state.ui.academyLevel === level ? "is-active" : ""}" data-action="setAcademyLevel" data-value="${level}">${level}</button>`).join("")}</div>
      <div class="chip-row mt-8">${categories.map((category) => `<button class="chip ${activeCat === category ? "is-active" : ""}" data-action="setAcademyCat" data-value="${esc(category)}">${esc(category)}</button>`).join("")}</div>
      <div class="drill-grid mt-12">${drills.map(drillCard).join("")}</div>
      ${!drills.length ? emptyState("academy", "لا توجد تمارين بهذا الفلتر", "جرّب مستوى أو فئة أخرى.", `<button class="btn btn--soft" data-action="resetAcademyFilters">كل التمارين</button>`) : ""}
    </div>

    <div class="section">
      ${sectionHead("خطة الأسبوع", "سبعة أيام، سبع خطوات")}
      <div class="week-plan">
        ${week.map((item) => {
          const drill = item.id ? getDrillById(item.id) : null;
          const inner = `
            <span class="week-row__day">${esc(item.day)}</span>
            <span class="week-row__focus">${esc(item.focus)}</span>
            <span class="week-row__meta">${item.rest ? "استشفاء" : `${drill ? drill.duration : 0} دقيقة`}</span>`;
          return item.rest
            ? `<div class="week-row is-rest">${inner}</div>`
            : `<button class="week-row" data-go="drill/${esc(item.id)}">${inner}</button>`;
        }).join("")}
      </div>
    </div>

    <div class="section">
      ${sectionHead("قبل أن تبدأ", "سلامتك أولاً")}
      <div class="tips-list">${safety.map((tip) => `<div class="tip">${icon("shield")}<span>${esc(tip)}</span></div>`).join("")}</div>
    </div>`;
}

function renderDrill(route) {
  const drill = getDrillById(route.id);
  if (!drill) return renderNotFound();
  if (state.timer.drillId !== drill.id) {
    state.timer.drillId = drill.id;
    state.timer.seconds = (Number(drill.duration) || 10) * 60;
    state.timer.running = false;
  }
  const art = ART[drill.art] || ART.control;
  const done = isDrillDone(drill.id);
  const related = state.data.drills.filter((item) => item.id !== drill.id && item.category === drill.category).slice(0, 3);
  return `
    <div class="drill-hero" style="${artStyle(drill.art)}">
      <img class="drill-hero__img" src="${esc(academyImage(drill.art))}" alt="" />
      <div class="drill-hero__glyph">${icon(art.icon)}</div>
      <div class="drill-hero__content">
        <span class="drill-card__level">${esc(drill.level)}</span>
        <h1>${esc(drill.title)}</h1>
        <div class="drill-hero__meta">
          <span>${icon("clock")} ${drill.duration} دقيقة</span>
          <span>${icon("target")} ${esc(drill.category)}</span>
          <span>${icon("footballBoot")} ${esc(drill.equipment || "بدون معدات")}</span>
        </div>
      </div>
    </div>

    <div class="article-body">
      <p style="font-weight:700;color:var(--orange-soft)">${esc(drill.goal || "")}</p>
      <p>${esc(drill.desc || "")}</p>
    </div>

    <div class="timer-card">
      <div class="timer-card__label">مؤقت التمرين</div>
      <div class="timer-card__time" id="timerTime">${formatTimer(state.timer.seconds)}</div>
      <div class="timer-card__actions">
        <button class="btn btn--primary btn--small" data-action="startTimer">${icon("play")} ${state.timer.running ? "متابعة" : "ابدأ"}</button>
        <button class="btn btn--dark btn--small" data-action="pauseTimer">${icon("pause")} إيقاف</button>
        <button class="btn btn--soft btn--small" data-action="resetTimer">${icon("reset")} تصفير</button>
      </div>
    </div>

    <div class="section">
      ${sectionHead("خطوات التمرين", "نفّذها بالترتيب")}
      <div class="steps">${(drill.steps || []).map((step, index) => `<div class="step"><span class="step__num">${index + 1}</span><span class="step__text">${esc(step)}</span></div>`).join("")}</div>
    </div>

    <div class="section">
      ${sectionHead("نصائح مهمة", "لأداء أفضل وأكثر أماناً")}
      <div class="tips-list">${(drill.tips || []).map((tip) => `<div class="tip">${icon("check")}<span>${esc(tip)}</span></div>`).join("")}</div>
    </div>

    <div class="section">
      <button class="btn ${done ? "btn--dark" : "btn--primary"} btn--block" data-action="completeDrill" data-id="${esc(drill.id)}" ${done ? "disabled" : ""}>
        ${done ? `${icon("check")} تمرين مكتمل` : `${icon("check")} أتممت التمرين`}
      </button>
      <button class="btn btn--soft btn--block mt-8" data-action="toggleFavorite" data-type="drill" data-id="${esc(drill.id)}">${heartIcon(isFavorite("drill", drill.id))} ${isFavorite("drill", drill.id) ? "إزالة من المفضلة" : "حفظ التمرين"}</button>
    </div>

    ${related.length ? `<div class="section">${sectionHead("تمارين مشابهة", "للتطوير المستمر")}<div class="drill-grid">${related.map(drillCard).join("")}</div></div>` : ""}`;
}

function formatTimer(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
