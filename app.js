/* ==========================================================================
   نقطة التشغيل: الأحداث، الإجراءات، النماذج، المؤقت، التثبيت والنسخ الاحتياطي
   ========================================================================== */
"use strict";

document.addEventListener("DOMContentLoaded", boot);

function boot() {
  loadState();
  applyTheme(currentTheme(), { silent: true });
  hydrateStaticIcons();
  bindEvents();
  bindWatchEvents();
  render();
  setupInstallPrompt();
  registerServiceWorker();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => hideSplash(reduced), reduced ? 350 : 1500);

  setInterval(autoRefreshTick, 60000);
  startMatchClockTicker();
  window.__waslBooted = true;
  if (state.settings.notifications && "Notification" in window && Notification.permission === "granted") {
    // permission already granted; nothing else required
  }
}

function hydrateStaticIcons() {
  $$(".nav-item__icon").forEach((element) => {
    element.innerHTML = icon(element.dataset.icon || "home");
  });
  $$("[data-icon]").forEach((element) => {
    if (!element.innerHTML.trim()) element.innerHTML = icon(element.dataset.icon);
  });
}

function startMatchClockTicker() {
  if (window.__waslClockTimer) return;
  window.__waslClockTimer = setInterval(() => {
    const nodes = document.querySelectorAll("[data-match-clock]");
    if (!nodes.length) return;
    nodes.forEach((node) => {
      const base = String(node.dataset.base || "");
      const at = Number(node.dataset.at) || 0;
      const match = base.match(/^(\d{1,3}):(\d{2})$/);
      if (!match) return;
      const baseSeconds = Number(match[1]) * 60 + Number(match[2]);
      const seconds = baseSeconds + Math.max(0, Math.floor((Date.now() - at) / 1000));
      const mm = Math.floor(seconds / 60);
      const ss = seconds % 60;
      node.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    });
  }, 1000);
}

function hideSplash(reduced) {
  const splash = $("#splash");
  if (!splash) return;
  splash.classList.add("is-hidden");
  state.splashDone = true;
  setTimeout(() => splash.remove(), reduced ? 20 : 550);
  if (state.deferredPrompt || isIOS()) {
    setTimeout(showInstallBar, 700);
  }
}

function refreshCurrentScreen() {
  if (!state.splashDone && !state.route) return;
  const route = state.route;
  renderTopbar(route);
  renderMain(route);
  updateNotificationBadge();
  if (typeof afterRender === "function") afterRender(route);
}

function focusDrillsSection() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const section = $("#drillsSection");
      if (!section) return;
      const scroller = document.scrollingElement || document.documentElement;
      const top = section.getBoundingClientRect().top + scroller.scrollTop - 84;
      scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  });
}

function afterRender(route) {
  if (!route) return;

  if (route.name === "home") {
    if (typeof fmActive === "function" && fmActive()) {
      loadFmMatches(getTodayISO());
    } else if (state.settings.openFootball && state.openFootball.status === "idle") {
      loadOpenFootballData();
    } else if (state.settings.openFootball && !state.settings.apiKey.trim() && state.matches.status === "idle") {
      applyOpenFootballDate(getTodayISO());
    }
    if (state.settings.yumi && state.yumi.status === "idle") fetchYumiMatches(state.ui.yumiDay);
    if (typeof loadS365Matches === "function") loadS365Matches();
    if (state.settings.apiKey.trim() && state.matches.status === "idle") {
      fetchMatchesForDate(state.matches.date || getTodayISO());
    }
  }

  if (route.name === "matches") {
    if (typeof fmActive === "function" && fmActive()) {
      if (state.matches.date !== state.ui.matchDay || state.matches.status === "idle" || state.matches.source !== "fotmob") {
        loadFmMatches(state.ui.matchDay);
      }
    } else if (state.settings.openFootball && state.openFootball.status === "idle") {
      loadOpenFootballData();
    }
    if (typeof fetchS365Day === "function") fetchS365Day(state.ui.matchDay);
    if (state.settings.yumi && state.yumi.status === "idle") fetchYumiMatches(state.ui.yumiDay);
    if (typeof loadS365Matches === "function") loadS365Matches();
    if (state.settings.apiKey.trim()) {
      if (state.matches.date !== state.ui.matchDay) {
        state.matches.date = state.ui.matchDay;
        state.matches.fixtures = [];
        state.matches.status = "idle";
      }
      if (state.matches.status === "idle") fetchMatchesForDate(state.ui.matchDay);
    } else if (!(typeof fmActive === "function" && fmActive()) && state.settings.openFootball) {
      if (state.openFootball.status === "idle") loadOpenFootballData();
      else if (state.matches.status === "idle" || state.matches.date !== state.ui.matchDay) {
        applyOpenFootballDate(state.ui.matchDay);
        refreshCurrentScreen();
      }
    }
  }

  if (route.name === "live") {
    if (state.settings.yumi) fetchYumiMatches(state.ui.yumiDay);
  }

  if (route.name === "team" && route.id) {
    const team = getTeamById(route.id);
    if (team && typeof fetchS365Team === "function") fetchS365Team(team);
    if (/^\d+$/.test(String(route.id)) && typeof fetchFmTeam === "function") {
      fetchFmTeam(route.id);
    } else {
      const fmId = team && team.fotmobId ? Number(team.fotmobId) : null;
      if (fmId && typeof fetchFmTeam === "function") fetchFmTeam(fmId);
    }
  }
  if (route.name === "match" && route.id) {
    const fixture = getFixtureById(route.id);
    if (!fixture && /^fm-/.test(String(route.id)) && typeof fetchFmMatchById === "function") {
      fetchFmMatchById(String(route.id).replace(/^fm-/, ""));
    }
    if (fixture) {
      const comp = getCompetitionForFixture(fixture);
      if (fixture.source === "fotmob" && typeof fetchFmLineups === "function") {
        fetchFmLineups(fixture.fmId);
        if (typeof fetchFmTeam === "function") {
          if (fixture.home?.id) fetchFmTeam(fixture.home.id);
          if (fixture.away?.id) fetchFmTeam(fixture.away.id);
        }
        if (typeof fmWatchMatch === "function") fmWatchMatch(fixture);
      } else if (fixture.source === "api" && state.settings.apiKey.trim()) {
        fetchFixtureLineups(fixture.id);
      }
      fetchFixturePrediction(fixture, comp);
    }
  } else if (typeof fmStopMatchWatch === "function") {
    fmStopMatchWatch();
  }

  if (route.name === "competition" && route.id) {
    const comp = getCompetitionById(route.id);
    if (comp && (state.settings.apiKey.trim() || comp.s365Id || comp.id === "yemen" || (typeof fmLeagueId === "function" && fmLeagueId(comp)))) {
      fetchStandingsForCompetition(comp);
    }
    if (comp && comp.id === "yemen" && typeof loadS365Matches === "function") loadS365Matches();
    if (comp && typeof fetchFmScorers === "function") fetchFmScorers(comp);
    if (comp && typeof fetchS365Scorers === "function"
      && (typeof fmLeagueId !== "function" || !fmLeagueId(comp)) && comp.s365Id) {
      fetchS365Scorers(comp);
    }
    if (comp && typeof fmStartLive === "function") fmStartLive(comp);
  } else if (typeof fmStopLive === "function") {
    fmStopLive();
  }

  if (route.name === "competitions") {
    if (typeof fetchFmAllLeagues === "function") fetchFmAllLeagues();
  }

  if (route.name === "news") {
    if (typeof fetchFmNews === "function") fetchFmNews();
    if (state.settings.newsKey.trim()) fetchNewsFeed();
  }

  if (route.name === "search") {
    const input = $("#searchInput");
    if (input) {
      setTimeout(() => {
        input.focus({ preventScroll: true });
        const length = input.value.length;
        try {
          input.setSelectionRange(length, length);
        } catch {
          /* ignore */
        }
      }, 80);
    }
  }

  if (route.name === "drill") {
    updateTimerUI();
  }
}

function autoRefreshTick() {
  if (!state.settings.autoRefresh) return;
  if (document.visibilityState !== "visible") return;
  const watchedRoutes = ["home", "matches", "live"];
  if (state.settings.yumi && watchedRoutes.includes(state.route.name)) {
    fetchYumiMatches(state.ui.yumiDay);
  }
  if (state.settings.openFootball && state.openFootball.status === "ready") {
    const stamp = new Date(state.openFootball.updatedAt || 0).getTime();
    if (Date.now() - stamp > OPEN_CACHE_TTL) loadOpenFootballData({ force: true });
  }
  if (!state.settings.apiKey.trim()) return;
  if (!["home", "matches"].includes(state.route.name)) return;
  const hasLive = state.matches.fixtures.some(isLiveFixture);
  const today = getTodayISO();
  if (hasLive && state.matches.date === today) {
    fetchMatchesForDate(today, { force: true });
  }
}

/* --------------------------------------------------------------------------
   الأحداث العامة
   -------------------------------------------------------------------------- */
function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleInput);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("hashchange", () => {
    closeSheet();
    closeModal();
    render();
  });
  window.addEventListener("online", () => {
    showToast("عاد الاتصال بالإنترنت");
    if (state.settings.yumi) fetchYumiMatches(state.ui.yumiDay);
    if (state.settings.openFootball && state.openFootball.status !== "loading") loadOpenFootballData();
    if (state.settings.apiKey.trim() && ["home", "matches"].includes(state.route.name)) {
      fetchMatchesForDate(state.ui.matchDay, { force: true });
    }
  });
  window.addEventListener("offline", () => showToast("أنت غير متصل — المحتوى المحلي يعمل", "error"));
}

function handleClick(event) {
  const closeSheetButton = event.target.closest("[data-close-sheet]");
  if (closeSheetButton) {
    event.preventDefault();
    closeSheet();
    return;
  }
  const closeModalButton = event.target.closest("[data-close-modal]");
  if (closeModalButton) {
    event.preventDefault();
    closeModal();
    return;
  }

  const navButton = event.target.closest(".nav-item[data-route]");
  if (navButton) {
    event.preventDefault();
    go(navButton.dataset.route);
    return;
  }

  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    event.preventDefault();
    saveRecentSearchForElement(goButton);
    go(goButton.dataset.go);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    event.preventDefault();
    doAction(actionButton.dataset.action, actionButton);
  }
}

async function doAction(action, element) {
  switch (action) {
    case "back":
      goBack();
      return;
    case "reload":
      location.reload();
      return;
    case "toggleFavorite": {
      const type = element.dataset.type;
      const id = element.dataset.id;
      if (!type || !id) return;
      const added = toggleFavorite(type, id);
      showToast(added ? "تمت الإضافة إلى المفضلة" : "تمت الإزالة من المفضلة");
      refreshCurrentScreen();
      return;
    }
    case "toggleFollowLeague": {
      const id = element.dataset.id;
      if (!id) return;
      const added = toggleFollowedLeague(id, element.dataset.name, element.dataset.country);
      element.classList.toggle("is-on", added);
      element.setAttribute("aria-pressed", added ? "true" : "false");
      element.innerHTML = `${icon(added ? "check" : "plus")}<span>${added ? "متابع" : "تابع"}</span>`;
      const counter = $("[data-follow-count]");
      if (counter) counter.textContent = `${followedLeagueCount()} متابعة`;
      const followedBox = $("#followedLeagues");
      if (followedBox) followedBox.innerHTML = followedLeaguesHtml();
      showToast(added ? `تابعت ${element.dataset.name || "البطولة"}` : "تم إلغاء المتابعة");
      return;
    }
    case "clearCompSearch": {
      state.ui.compQuery = "";
      render();
      return;
    }
    case "refreshAllLeagues": {
      if (typeof fetchFmAllLeagues === "function") fetchFmAllLeagues({ force: true });
      return;
    }
    case "shareArticle": {
      const article = getArticleById(element.dataset.id);
      if (article) {
        await shareContent(
          article.title,
          article.excerpt || "مقال من مجلة وصل الحسيني",
          `${location.href.split("#")[0]}#/article/${article.id}`
        );
      }
      return;
    }
    case "shareApp":
      await shareContent("وصل الحسيني — سكون الرياضي", "تطبيق كرة القدم العربي: مباريات، بطولات، أخبار وأكاديمية تدريبية.", location.href.split("#")[0]);
      return;
    case "installApp":
      await installApp();
      return;
    case "openInstallHelp":
      await installApp();
      return;
    case "dismissInstall":
      state.ui.installDismissed = true;
      writeJSON(KEYS.installDismissed, true);
      hideInstallBar();
      return;
    case "requestNotifications": {
      await requestNotificationPermission();
      refreshCurrentScreen();
      return;
    }
    case "markAllRead":
      state.notifications = state.notifications.map((item) => ({ ...item, read: true }));
      saveNotifications();
      refreshCurrentScreen();
      showToast("تم تعليم كل الإشعارات كمقروءة");
      return;
    case "markNotifRead": {
      const item = state.notifications.find((notification) => notification.id === element.dataset.id);
      if (item && !item.read) {
        item.read = true;
        saveNotifications();
        refreshCurrentScreen();
      }
      return;
    }
    case "setMatchDay": {
      const date = element.dataset.date;
      if (!date) return;
      state.ui.matchDay = date;
      if (state.matches.date !== date) {
        state.matches.date = date;
        state.matches.fixtures = [];
        state.matches.status = "idle";
        state.matches.error = null;
      }
      render();
      if (state.settings.apiKey.trim()) fetchMatchesForDate(date);
      else if (typeof fmActive === "function" && fmActive()) loadFmMatches(date);
      else if (state.settings.openFootball) {
        if (state.openFootball.status === "idle") loadOpenFootballData();
        else applyOpenFootballDate(date);
        refreshCurrentScreen();
      }
      if (typeof fetchS365Day === "function") fetchS365Day(date);
      return;
    }
    case "setMatchFilter": {
      const group = element.dataset.group;
      const value = element.dataset.value || "all";
      if (group === "comp") state.ui.matchComp = value;
      if (group === "team") state.ui.matchTeam = value;
      closeSheet();
      refreshCurrentScreen();
      return;
    }
    case "openMatchFilters":
      openSheet("تصفية المباريات", filterSheet());
      return;
    case "refreshMatches":
      if (typeof fmActive === "function" && fmActive()) {
        await loadFmMatches(state.ui.matchDay, { force: true });
        refreshCurrentScreen();
        showToast("تم تحديث مباريات اليوم من FotMob");
        return;
      }
      if (!state.settings.apiKey.trim() && !state.settings.openFootball) {
        showToast("فعّل مصدر النتائج من الإعدادات أولاً", "error");
        go("settings");
        return;
      }
      if (state.settings.openFootball) await loadOpenFootballData({ force: true });
      if (state.settings.apiKey.trim()) await fetchMatchesForDate(state.ui.matchDay, { force: true });
      else applyOpenFootballDate(state.ui.matchDay);
      refreshCurrentScreen();
      showToast("تم تحديث المباريات");
      return;
    case "refreshStandings": {
      const comp = getCompetitionById(element.dataset.id);
      if (comp) await fetchStandingsForCompetition(comp, { force: true });
      return;
    }
    case "openMatch": {
      const id = element.dataset.id;
      if (id) go(`match/${encodeURIComponent(id)}`);
      return;
    }
    case "watchMatch": {
      const fixture = getFixtureById(element.dataset.id);
      if (!fixture) {
        showToast("تعذر تحديد المباراة", "error");
        return;
      }
      const title = `${fixture.home?.name || "الفريق الأول"} ضد ${fixture.away?.name || "الفريق الثاني"}`;
      openWatch(watchUrlForFixture(fixture), title, fixture.sourceLabel || "Yumi Sports");
      return;
    }
    case "openWatch":
      openWatch(element.dataset.url || "", element.dataset.title || "مشاهدة المباراة", element.dataset.subtitle || "Yumi Sports");
      return;
    case "closeWatch":
      closeWatch();
      return;
    case "shareMatch": {
      const fixture = getFixtureById(element.dataset.id);
      if (fixture) {
        await shareContent(
          `${fixture.home?.name || "مباراة"} ضد ${fixture.away?.name || ""}`,
          `${fixture.league?.name || "مباراة"} · ${formatDateShort(String(fixture.date).slice(0, 10))} · من وصل الحسيني`,
          `${location.href.split("#")[0]}#/match/${encodeURIComponent(fixture.id)}`
        );
      }
      return;
    }
    case "setYumiDay": {
      const day = element.dataset.day || "today";
      state.ui.yumiDay = day;
      if (state.settings.yumi) await fetchYumiMatches(day);
      else render();
      return;
    }
    case "refreshYumi":
      if (!state.settings.yumi) {
        showToast("فعّل مصدر البث من الإعدادات أولاً", "error");
        go("settings");
        return;
      }
      await fetchYumiMatches(state.ui.yumiDay, { force: true });
      showToast("تم تحديث مباريات البث");
      return;
    case "toggleTheme":
      toggleTheme();
      return;
    case "setTheme":
      applyTheme(element.dataset.theme);
      return;
    case "refreshLineups":
      if (element.dataset.id) {
        const fixture = getFixtureById(element.dataset.id);
        if (fixture && fixture.source === "fotmob" && typeof fetchFmLineups === "function") {
          await fetchFmLineups(fixture.fmId, { force: true });
          refreshCurrentScreen();
          return;
        }
        await fetchFixtureLineups(element.dataset.id);
      }
      return;
    case "refreshPredictions": {
      const fixture = getFixtureById(element.dataset.id);
      if (fixture) await fetchFixturePrediction(fixture, getCompetitionForFixture(fixture), { force: true });
      return;
    }
    case "setNewsCat":
      state.ui.newsCat = element.dataset.value || "الكل";
      refreshCurrentScreen();
      return;
    case "setAcademyLevel":
      state.ui.academyLevel = element.dataset.value || "الكل";
      refreshCurrentScreen();
      focusDrillsSection();
      return;
    case "setAcademyCat":
      state.ui.academyCat = element.dataset.value || "الكل";
      refreshCurrentScreen();
      focusDrillsSection();
      return;
    case "setAcademyTrack":
      state.ui.academyLevel = "الكل";
      state.ui.academyCat = element.dataset.value || "الكل";
      refreshCurrentScreen();
      focusDrillsSection();
      return;
    case "resetAcademyFilters":
      state.ui.academyLevel = "الكل";
      state.ui.academyCat = "الكل";
      refreshCurrentScreen();
      focusDrillsSection();
      return;
    case "setTeamCountry":
      state.ui.teamCountry = element.dataset.value || "الكل";
      refreshCurrentScreen();
      return;
    case "setTeamTab":
      state.ui.teamTab = element.dataset.value || "clubs";
      refreshCurrentScreen();
      return;
    case "setFavTab":
      state.ui.favTab = element.dataset.value || "all";
      refreshCurrentScreen();
      return;
    case "scrollToDrills": {
      const section = $("#drillsSection");
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    case "startTimer":
      startTimer();
      return;
    case "pauseTimer":
      pauseTimer();
      return;
    case "resetTimer":
      resetTimer();
      return;
    case "completeDrill": {
      const drill = getDrillById(element.dataset.id);
      if (drill && completeDrill(drill)) {
        addNotification("أحسنت! تمرين مكتمل", `أتممت «${drill.title}» وأضفت ${drill.duration} دقيقة إلى سجلك.`, "training", { push: false });
        refreshCurrentScreen();
      }
      return;
    }
    case "testSources": {
      const form = $('[data-form="settings"]');
      await testSourcesFromForm(form);
      return;
    }
    case "toggleAutoRefresh":
      state.settings.autoRefresh = !state.settings.autoRefresh;
      saveSettings();
      refreshCurrentScreen();
      return;
    case "clearCache":
      clearNetworkCaches();
      return;
    case "resetContent":
      confirmAction(
        "إعادة ضبط المحتوى",
        "سيتم استبدال المقالات والتمارين والأندية والبطولات بالنسخة الأصلية. هل تريد المتابعة؟",
        () => {
          state.data = deepClone(SEED);
          saveData();
          refreshCurrentScreen();
          showToast("تمت إعادة ضبط المحتوى");
        }
      );
      return;
    case "useSearch": {
      const value = element.dataset.value || "";
      state.ui.searchQuery = value;
      const input = $("#searchInput");
      if (input) {
        input.value = value;
        input.focus();
      }
      renderSearchResults();
      return;
    }
    case "clearSearch":
      state.ui.searchQuery = "";
      const input = $("#searchInput");
      if (input) {
        input.value = "";
        input.focus();
      }
      renderSearchResults();
      return;
    case "setAdminTab":
      state.ui.adminTab = element.dataset.value || "overview";
      refreshCurrentScreen();
      return;
    case "addAdmin":
      openAdminForm(element.dataset.type);
      return;
    case "editAdmin":
      openAdminForm(element.dataset.type, element.dataset.id);
      return;
    case "deleteAdmin":
      deleteAdminItem(element.dataset.type, element.dataset.id);
      return;
    case "deleteNotification": {
      state.notifications = state.notifications.filter((item) => item.id !== element.dataset.id);
      saveNotifications();
      refreshCurrentScreen();
      showToast("تم حذف التنبيه");
      return;
    }
    case "clearNotifications":
      confirmAction("حذف كل التنبيهات", "سيتم حذف كل التنبيهات من هذا الجهاز. هل تريد المتابعة؟", () => {
        state.notifications = [];
        saveNotifications();
        refreshCurrentScreen();
        showToast("تم حذف كل التنبيهات");
      });
      return;
    case "exportBackup":
      exportBackup();
      return;
    case "copyBackup":
      copyBackup();
      return;
    default:
      return;
  }
}

/* --------------------------------------------------------------------------
   نافذة المشاهدة المدمجة (Yumi Sports)
   -------------------------------------------------------------------------- */
function openWatch(url, title = "مشاهدة المباراة", subtitle = "Yumi Sports") {
  const layer = $("#watchLayer");
  const frame = $("#watchFrame");
  if (!layer || !frame) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const safe = isYumiUrl(url) ? String(url) : "";
  state.ui.watch = { open: Boolean(safe), url: safe, title, subtitle };
  $("#watchTitle").textContent = title;
  $("#watchSubtitle").textContent = subtitle || "Yumi Sports";
  const external = $("#watchExternal");
  if (external) {
    external.href = safe || `${YUMI_BASE}/matches-today/`;
    external.hidden = !safe;
  }
  const loader = $("#watchLoader");
  if (loader) loader.hidden = false;
  frame.src = safe || "about:blank";
  layer.classList.add("is-open");
  layer.setAttribute("aria-hidden", "false");
  document.body.classList.add("watch-open");
  if (!safe) {
    showToast("رابط البث غير صالح", "error");
    closeWatch();
    return;
  }
  const closeBtn = layer.querySelector("[data-action='closeWatch']");
  if (closeBtn) closeBtn.focus({ preventScroll: true });
}

function closeWatch() {
  const layer = $("#watchLayer");
  const frame = $("#watchFrame");
  if (frame) frame.src = "about:blank";
  if (layer) {
    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("watch-open");
  state.ui.watch = { open: false, url: "", title: "", subtitle: "" };
}

function bindWatchEvents() {
  const frame = $("#watchFrame");
  if (!frame) return;
  frame.addEventListener("load", () => {
    const loader = $("#watchLoader");
    if (loader && frame.src && frame.src !== "about:blank") loader.hidden = true;
  });
}

function handleSubmit(event) {
  const form = event.target.closest("form");
  if (!form) return;
  const type = form.dataset.form;
  if (!type) return;
  event.preventDefault();

  if (type === "settings") {
    saveSettingsForm(form);
    return;
  }
  if (type === "adminPin") {
    const pin = form.querySelector('[name="pin"]')?.value?.trim() || "";
    if (pin === String(state.settings.adminPin)) {
      state.ui.adminUnlocked = true;
      state.ui.adminTab = "overview";
      render();
      showToast("مرحباً بك في لوحة التحكم");
    } else {
      showToast("رمز الدخول غير صحيح", "error");
      form.querySelector('[name="pin"]')?.select?.();
    }
    return;
  }
  if (type === "adminArticle") {
    saveAdminArticle(form);
    return;
  }
  if (type === "adminDrill") {
    saveAdminDrill(form);
    return;
  }
  if (type === "adminTeam") {
    saveAdminTeam(form);
    return;
  }
  if (type === "adminCompetition") {
    saveAdminCompetition(form);
    return;
  }
  if (type === "adminNotification") {
    const title = form.querySelector('[name="title"]')?.value?.trim();
    const text = form.querySelector('[name="text"]')?.value?.trim();
    if (!title || !text) {
      showToast("أكمل عنوان ونص التنبيه", "error");
      return;
    }
    addNotification(title, text, "admin");
    form.reset();
    refreshCurrentScreen();
    showToast("تم إرسال التنبيه");
    return;
  }
  if (type === "importBackup") {
    importBackup(form);
  }
}

function handleInput(event) {
  if (event.target.id === "searchInput") {
    state.ui.searchQuery = event.target.value;
    renderSearchResults();
  }
  if (event.target.id === "compSearch") {
    state.ui.compQuery = event.target.value;
    const list = document.getElementById("allLeaguesList");
    if (list && typeof compLeaguesListHtml === "function") list.innerHTML = compLeaguesListHtml();
  }
  if (event.target.dataset?.action === "setMatchDayInput") {
    const date = String(event.target.value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date !== state.ui.matchDay) {
      doAction("setMatchDay", { dataset: { date } });
    }
  }
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    if (state.ui.watch?.open) {
      closeWatch();
      return;
    }
    closeSheet();
    closeModal();
    return;
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.closest?.('[role="button"][data-action]')) {
    event.preventDefault();
    event.target.closest('[role="button"][data-action]').click();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    go("search");
    return;
  }
  if (event.key === "Enter" && event.target.id === "searchInput") {
    saveRecentSearch(state.ui.searchQuery);
    renderSearchResults();
  }
}

function saveRecentSearch(query) {
  const value = String(query || "").trim();
  if (value.length < 2) return;
  state.ui.recentSearches = [value, ...state.ui.recentSearches.filter((item) => item !== value)].slice(0, 6);
  saveRecentSearches();
}

function saveRecentSearchForElement(element) {
  if (element?.closest("#searchResults") || element?.dataset?.go?.startsWith("article/") || element?.dataset?.go?.startsWith("drill/")) {
    saveRecentSearch(state.ui.searchQuery);
  }
}

/* --------------------------------------------------------------------------
   الإعدادات
   -------------------------------------------------------------------------- */
function saveSettingsForm(form) {
  const data = new FormData(form);
  const previousApi = state.settings.apiKey;
  const previousNews = state.settings.newsKey;
  const pin = String(data.get("adminPin") || "").trim();
  if (pin.length < 4) {
    showToast("رمز لوحة التحكم يجب أن يكون 4 أحرف على الأقل", "error");
    return;
  }
  state.settings = {
    ...state.settings,
    apiBase: String(data.get("apiBase") || API_FOOTBALL_DEFAULT).trim(),
    apiKey: String(data.get("apiKey") || "").trim(),
    season: clamp(Number(data.get("season")) || state.settings.season, 2000, 2100),
    newsKey: String(data.get("newsKey") || "").trim(),
    newsQuery: String(data.get("newsQuery") || "كرة القدم").trim() || "كرة القدم",
    adminPin: pin,
    openFootball: data.get("openFootball") === "on" || data.get("openFootball") === "yes",
    yumi: data.get("yumi") === "on" || data.get("yumi") === "yes"
  };
  saveSettings();
  if (previousApi !== state.settings.apiKey) {
    removeKey(KEYS.matchCache);
    removeKey(KEYS.standingsCache);
    removeKey(KEYS.lineups);
    removeKey(KEYS.predictions);
    state.matches = { status: "idle", source: "openfootball", fixtures: [], nextFixtures: [], error: null, updatedAt: null, date: getTodayISO() };
    state.standings = {};
    state.lineups = {};
    state.predictions = {};
  }
  if (previousNews !== state.settings.newsKey) {
    removeKey(KEYS.newsCache);
    state.newsFeed = { status: "idle", articles: [], error: null, updatedAt: null };
  }
  if (state.settings.openFootball) {
    loadOpenFootballData();
    applyOpenFootballDate(state.ui.matchDay);
  }
  if (state.settings.yumi) fetchYumiMatches(state.ui.yumiDay);
  state.ui.sourceTest = { ok: true, message: "تم حفظ الإعدادات. اضغط «اختبار الاتصال» للتأكد من صلاحية المفاتيح." };
  refreshCurrentScreen();
  showToast("تم حفظ إعدادات المصادر");
}

/* --------------------------------------------------------------------------
   إدارة المحتوى
   -------------------------------------------------------------------------- */
function parseArticleBody(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("## ")) return { type: "h", text: line.slice(3).trim() };
      if (line.startsWith("> ")) return { type: "quote", text: line.slice(2).trim() };
      return { type: "p", text: line };
    });
}

function normalizeImage(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("assets/")) return raw;
  return safeUrl(raw);
}

function saveAdminArticle(form) {
  const id = form.dataset.id;
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  const bodyText = String(data.get("body") || "").trim();
  if (!title || !bodyText) {
    showToast("العنوان ونص المقال مطلوبان", "error");
    return;
  }
  const body = parseArticleBody(bodyText);
  const excerpt = String(data.get("excerpt") || "").trim() || body.find((block) => block.type === "p")?.text?.slice(0, 150) || "";
  const readTime = Math.max(2, Math.ceil(wordCount(bodyText) / 180));
  const featured = data.get("featured") === "yes";
  const existing = id ? getArticleById(id) : null;
  if (featured) state.data.articles.forEach((article) => { article.featured = false; });
  const article = {
    id: existing?.id || uid("a"),
    title,
    category: String(data.get("category") || "تحليل").trim(),
    excerpt,
    date: existing?.date || getTodayISO(),
    readTime,
    author: "مجلة وصل",
    art: String(data.get("art") || "tactics"),
    featured,
    image: normalizeImage(data.get("image")),
    body
  };
  if (existing) Object.assign(existing, article);
  else state.data.articles.unshift(article);
  saveData();
  closeModal();
  refreshCurrentScreen();
  showToast(existing ? "تم تحديث المقال" : "تمت إضافة المقال");
}

function saveAdminDrill(form) {
  const id = form.dataset.id;
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  if (!title) {
    showToast("عنوان التمرين مطلوب", "error");
    return;
  }
  const existing = id ? getDrillById(id) : null;
  const drill = {
    id: existing?.id || uid("d"),
    title,
    category: String(data.get("category") || "تحكم").trim(),
    level: String(data.get("level") || "مبتدئ"),
    duration: clamp(Number(data.get("duration")) || 10, 1, 120),
    equipment: String(data.get("equipment") || "كرة").trim(),
    art: String(data.get("art") || "control"),
    featured: existing?.featured || false,
    goal: String(data.get("goal") || "").trim(),
    desc: String(data.get("desc") || "").trim(),
    steps: String(data.get("steps") || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    tips: String(data.get("tips") || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  };
  if (existing) Object.assign(existing, drill);
  else state.data.drills.unshift(drill);
  saveData();
  closeModal();
  refreshCurrentScreen();
  showToast(existing ? "تم تحديث التمرين" : "تمت إضافة التمرين");
}

function saveAdminTeam(form) {
  const id = form.dataset.id;
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) {
    showToast("اسم النادي مطلوب", "error");
    return;
  }
  const existing = id ? getTeamById(id) : null;
  const team = {
    id: existing?.id || uid("t"),
    name,
    short: String(data.get("short") || name.slice(0, 3)).trim(),
    city: String(data.get("city") || "").trim(),
    country: String(data.get("country") || "").trim(),
    founded: Number(data.get("founded")) || existing?.founded || 1950,
    stadium: String(data.get("stadium") || "").trim(),
    leagueId: String(data.get("leagueId") || state.data.competitions[0]?.id || ""),
    logo: existing?.logo || "",
    colors: [safeColor(data.get("color1")), safeColor(data.get("color2"), "#d92700")],
    bio: String(data.get("bio") || "").trim()
  };
  if (existing) Object.assign(existing, team);
  else state.data.teams.push(team);
  saveData();
  closeModal();
  refreshCurrentScreen();
  showToast(existing ? "تم تحديث النادي" : "تمت إضافة النادي");
}

function saveAdminCompetition(form) {
  const id = form.dataset.id;
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) {
    showToast("اسم البطولة مطلوب", "error");
    return;
  }
  const existing = id ? getCompetitionById(id) : null;
  const c1 = safeColor(data.get("color1"), "#ff6a00");
  const c2 = safeColor(data.get("color2"), "#d92700");
  const comp = {
    id: existing?.id || uid("c"),
    name,
    short: String(data.get("short") || name).trim(),
    country: String(data.get("country") || "").trim(),
    type: String(data.get("type") || "دوري").trim(),
    teams: clamp(Number(data.get("teams")) || 20, 2, 100),
    season: Number(data.get("season")) || state.settings.season,
    apiId: Number(data.get("apiId")) || existing?.apiId || 0,
    icon: String(data.get("icon") || "trophy"),
    colors: [hexToRgba(c1, 0.32), `linear-gradient(145deg,${c1},${c2})`],
    desc: String(data.get("desc") || "").trim()
  };
  if (existing) Object.assign(existing, comp);
  else state.data.competitions.push(comp);
  saveData();
  closeModal();
  refreshCurrentScreen();
  showToast(existing ? "تم تحديث البطولة" : "تمت إضافة البطولة");
}

function hexToRgba(hex, alpha = 1) {
  const value = safeColor(hex, "#ff6a00").replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function deleteAdminItem(type, id) {
  const labels = { article: "المقال", drill: "التمرين", team: "النادي", competition: "البطولة" };
  confirmAction(`حذف ${labels[type] || "العنصر"}`, "لا يمكن التراجع عن الحذف. هل تريد المتابعة؟", () => {
    if (type === "article") state.data.articles = state.data.articles.filter((item) => item.id !== id);
    if (type === "drill") state.data.drills = state.data.drills.filter((item) => item.id !== id);
    if (type === "team") state.data.teams = state.data.teams.filter((item) => item.id !== id);
    if (type === "competition") state.data.competitions = state.data.competitions.filter((item) => item.id !== id);
    cleanupFavorites();
    saveData();
    refreshCurrentScreen();
    showToast("تم الحذف");
  });
}

function cleanupFavorites() {
  const articleIds = new Set(state.data.articles.map((item) => item.id));
  const drillIds = new Set(state.data.drills.map((item) => item.id));
  const teamIds = new Set(state.data.teams.map((item) => item.id));
  const compIds = new Set(state.data.competitions.map((item) => item.id));
  state.favorites.articles = state.favorites.articles.filter((id) => articleIds.has(id));
  state.favorites.drills = state.favorites.drills.filter((id) => drillIds.has(id));
  state.favorites.teams = state.favorites.teams.filter((id) => teamIds.has(id));
  state.favorites.competitions = state.favorites.competitions.filter((id) => compIds.has(id));
  saveFavorites();
}

/* --------------------------------------------------------------------------
   النسخ الاحتياطي
   -------------------------------------------------------------------------- */
function backupPayload() {
  return {
    app: "وصل الحسيني",
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      version: DATA_VERSION,
      articles: state.data.articles,
      drills: state.data.drills,
      teams: state.data.teams,
      competitions: state.data.competitions
    }
  };
}

function exportBackup() {
  const payload = backupPayload();
  const json = JSON.stringify(payload, null, 2);
  try {
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wasl-alhusaini-backup-${getTodayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("تم تنزيل النسخة الاحتياطية");
  } catch {
    copyText(json).then((ok) => showToast(ok ? "تم نسخ النسخة الاحتياطية" : "تعذر تصدير النسخة", ok ? "" : "error"));
  }
}

async function copyBackup() {
  const ok = await copyText(JSON.stringify(backupPayload(), null, 2));
  showToast(ok ? "تم نسخ JSON إلى الحافظة" : "تعذر النسخ", ok ? "" : "error");
}

function importBackup(form) {
  const text = form.querySelector('[name="json"]')?.value?.trim();
  if (!text) {
    showToast("ألصق محتوى النسخة أولاً", "error");
    return;
  }
  try {
    const parsed = JSON.parse(text);
    const data = parsed.data || parsed;
    if (!Array.isArray(data.articles) || !Array.isArray(data.drills) || !Array.isArray(data.teams) || !Array.isArray(data.competitions)) {
      throw new Error("بنية الملف غير صحيحة");
    }
    confirmAction("استيراد النسخة", "سيتم استبدال المحتوى الحالي بالمحتوى الموجود في النسخة. هل تريد المتابعة؟", () => {
      state.data = {
        version: DATA_VERSION,
        articles: data.articles,
        drills: data.drills,
        teams: data.teams,
        competitions: data.competitions
      };
      cleanupFavorites();
      saveData();
      refreshCurrentScreen();
      showToast("تم استيراد المحتوى");
    });
  } catch (error) {
    showToast(`تعذر الاستيراد: ${error.message}`, "error");
  }
}

function confirmAction(title, text, onConfirm) {
  openModal(
    title,
    `<div class="article-body"><p>${esc(text)}</p></div>
     <div class="form-actions">
       <button class="btn btn--danger" type="button" data-confirm-yes>تأكيد</button>
       <button class="btn btn--dark" type="button" data-close-modal>إلغاء</button>
     </div>`
  );
  const button = $("[data-confirm-yes]");
  if (button) {
    button.addEventListener("click", () => {
      closeModal();
      onConfirm();
    }, { once: true });
  }
}

/* --------------------------------------------------------------------------
   المؤقت
   -------------------------------------------------------------------------- */
function startTimer() {
  if (state.timer.running) return;
  if (!state.timer.seconds) {
    const drill = getDrillById(state.route.id);
    state.timer.seconds = (Number(drill?.duration) || 10) * 60;
  }
  state.timer.running = true;
  clearInterval(state.timer.interval);
  state.timer.interval = setInterval(tickTimer, 1000);
  updateTimerUI();
}

function pauseTimer() {
  state.timer.running = false;
  clearInterval(state.timer.interval);
  state.timer.interval = null;
  updateTimerUI();
}

function resetTimer() {
  pauseTimer();
  const drill = getDrillById(state.route.id);
  state.timer.seconds = (Number(drill?.duration) || 10) * 60;
  updateTimerUI();
}

function stopTimer() {
  clearInterval(state.timer.interval);
  state.timer.interval = null;
  state.timer.running = false;
}

function tickTimer() {
  state.timer.seconds = Math.max(0, state.timer.seconds - 1);
  updateTimerUI();
  if (state.timer.seconds <= 0) {
    pauseTimer();
    showToast("انتهى وقت التمرين — أحسنت!");
    sendLocalNotification("انتهى وقت التمرين", "أكملت جلسة التدريب. لا تنسَ تسجيل الإنجاز.");
  }
}

function updateTimerUI() {
  const time = $("#timerTime");
  if (time) time.textContent = formatTimer(state.timer.seconds);
  const start = $('[data-action="startTimer"]');
  if (start) start.innerHTML = `${icon("play")} ${state.timer.running ? "متابعة" : "ابدأ"}`;
}

/* --------------------------------------------------------------------------
   التثبيت
   -------------------------------------------------------------------------- */
function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    if (state.splashDone) showInstallBar();
  });
  window.addEventListener("appinstalled", () => {
    state.deferredPrompt = null;
    hideInstallBar();
    showToast("تم تثبيت وصل الحسيني بنجاح");
  });
  const installBtn = $("#installBtn");
  if (installBtn) installBtn.addEventListener("click", installApp);
  const dismissBtn = $("#dismissInstall");
  if (dismissBtn) dismissBtn.addEventListener("click", () => {
    state.ui.installDismissed = true;
    writeJSON(KEYS.installDismissed, true);
    hideInstallBar();
  });
}
