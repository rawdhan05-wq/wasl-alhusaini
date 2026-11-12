/* ==========================================================================
   شاشات إضافية: المزيد، المفضلة، الإشعارات، حول، الإعدادات، الأندية، البحث
   ========================================================================== */
"use strict";

function competitionRow(comp) {
  return `
    <div class="team-card">
      <button class="competition-card__mark" style="${compStyle(comp)};width:48px;height:48px;border-radius:14px;flex:none" data-go="competition/${esc(comp.id)}" aria-label="${esc(comp.name)}">${comp.logo ? `<img src="${esc(safeUrl(comp.logo))}" alt="" loading="lazy" decoding="async" />` : icon(comp.icon || "trophy")}</button>
      <button class="team-card__body" data-go="competition/${esc(comp.id)}">
        <div class="team-card__name">${esc(comp.name)}</div>
        <div class="team-card__meta">${icon("globe")} ${esc(comp.country)} <span>•</span> ${esc(comp.type)}</div>
      </button>
      ${saveButton("competition", comp.id)}
    </div>`;
}

function menuRow(route, iconName, title, subtitle = "", end = "") {
  return `
    <button class="menu-row" data-go="${esc(route)}">
      <span class="menu-row__icon">${icon(iconName)}</span>
      <span class="menu-row__body">
        <span class="menu-row__title">${esc(title)}</span>
        ${subtitle ? `<span class="menu-row__sub">${esc(subtitle)}</span>` : ""}
      </span>
      <span class="menu-row__end">${end}${icon("arrowLeft")}</span>
    </button>`;
}

function renderMore() {
  const favs = favoriteCount();
  const done = completedDrillIds().length;
  const read = articleReadCount();
  const hasApi = Boolean(state.settings.apiKey.trim());
  const hasNews = Boolean(state.settings.newsKey.trim());
  return `
    <div class="profile-card">
      <div class="profile-card__row">
        <img class="profile-card__logo" src="assets/icon-192.png" alt="" width="62" height="62" />
        <div>
          <div class="profile-card__name">وصل الحسيني</div>
          <div class="profile-card__tag">سكون الرياضي</div>
        </div>
      </div>
      <div class="profile-card__stats">
        <div class="profile-stat"><strong>${favs}</strong><span>في المفضلة</span></div>
        <div class="profile-stat"><strong>${done}</strong><span>تمرين مكتمل</span></div>
        <div class="profile-stat"><strong>${read}</strong><span>مقال مقروء</span></div>
      </div>
    </div>

    <div class="menu-group">
      <div class="menu-group__title">المظهر</div>
      <div class="theme-row">
        <span class="theme-row__text"><strong>مظهر التطبيق</strong><span>اختر الوضع الداكن أو الفاتح</span></span>
        ${themeSegHtml()}
      </div>
    </div>

    <div class="menu-group">
      <div class="menu-group__title">المحتوى</div>
      ${menuRow("favorites", "heart", "المفضلة", "المقالات والتمارين والأندية المحفوظة")}
      ${menuRow("teams", "shield", "دليل الأندية", `${state.data.teams.length} نادياً`)}
      ${menuRow("competitions", "trophy", "البطولات", `${state.data.competitions.length} بطولات`)}
      ${menuRow("news", "news", "مجلة وصل", "مقالات وتحليلات")}
      ${menuRow("notifications", "bell", "الإشعارات", `${state.notifications.filter((item) => !item.read).length} غير مقروء`)}
    </div>

    <div class="menu-group">
      <div class="menu-group__title">التطبيق والبيانات</div>
      ${menuRow("settings", "settings", "إعدادات المصادر", hasApi || hasNews ? "بعض المصادر متصلة" : "لم يتم ربط مصادر بعد", hasApi ? `<span style="color:var(--success)">●</span>` : "")}
      ${menuRow("admin", "lock", "لوحة التحكم", "إدارة المحتوى والمصادر")}
      <button class="menu-row" data-action="installApp">
        <span class="menu-row__icon">${icon("download")}</span>
        <span class="menu-row__body"><span class="menu-row__title">تثبيت التطبيق</span><span class="menu-row__sub">${isStandalone() ? "التطبيق مثبت بالفعل" : "أضف التطبيق إلى شاشتك الرئيسية"}</span></span>
        <span class="menu-row__end">${icon("arrowLeft")}</span>
      </button>
      <button class="menu-row" data-action="shareApp">
        <span class="menu-row__icon">${icon("share")}</span>
        <span class="menu-row__body"><span class="menu-row__title">مشاركة التطبيق</span><span class="menu-row__sub">ادعُ أصدقاءك إلى وصل الحسيني</span></span>
        <span class="menu-row__end">${icon("arrowLeft")}</span>
      </button>
    </div>

    <div class="menu-group">
      <div class="menu-group__title">المساعدة</div>
      ${menuRow("about", "info", "حول التطبيق", "المبرمج وبيانات التواصل")}
      <button class="menu-row" data-action="openInstallHelp">
        <span class="menu-row__icon">${icon("phone")}</span>
        <span class="menu-row__body"><span class="menu-row__title">تشغيل التطبيق على الهاتف</span><span class="menu-row__sub">تعليمات التثبيت على Android وiPhone</span></span>
        <span class="menu-row__end">${icon("arrowLeft")}</span>
      </button>
    </div>

    <p class="version-note">وصل الحسيني — سكون الرياضي<br>الإصدار ${APP_VERSION} · يعمل دون اتصال بعد التحميل<br>جميع البيانات المحلية محفوظة على جهازك.</p>`;
}

function renderFavorites() {
  const tabs = [
    ["all", "الكل"],
    ["articles", "المقالات"],
    ["drills", "التمارين"],
    ["teams", "الأندية"],
    ["competitions", "البطولات"]
  ];
  const tab = state.ui.favTab;
  const articles = state.data.articles.filter((item) => state.favorites.articles.includes(item.id));
  const drills = state.data.drills.filter((item) => state.favorites.drills.includes(item.id));
  const teams = state.data.teams.filter((item) => state.favorites.teams.includes(item.id));
  const comps = state.data.competitions.filter((item) => state.favorites.competitions.includes(item.id));

  const blocks = [];
  if ((tab === "all" || tab === "articles") && articles.length) {
    blocks.push(`<div class="section" style="margin-top:14px">${sectionHead("المقالات", `${articles.length} محفوظ`)}<div class="article-list">${articles.map(articleRow).join("")}</div></div>`);
  }
  if ((tab === "all" || tab === "drills") && drills.length) {
    blocks.push(`<div class="section" style="margin-top:14px">${sectionHead("التمارين", `${drills.length} محفوظ`)}<div class="article-list">${drills.map(drillRow).join("")}</div></div>`);
  }
  if ((tab === "all" || tab === "teams") && teams.length) {
    blocks.push(`<div class="section" style="margin-top:14px">${sectionHead("الأندية", `${teams.length} محفوظ`)}<div class="article-list">${teams.map(teamCard).join("")}</div></div>`);
  }
  if ((tab === "all" || tab === "competitions") && comps.length) {
    blocks.push(`<div class="section" style="margin-top:14px">${sectionHead("البطولات", `${comps.length} محفوظ`)}<div class="article-list">${comps.map(competitionRow).join("")}</div></div>`);
  }

  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">مكتبتك</div>
      <h1>المفضلة</h1>
      <p>كل ما حفظته في مكان واحد. تُحفظ العناصر على جهازك وتبقى متاحة دون اتصال.</p>
    </div>
    <div class="chip-row">${tabs.map(([key, label]) => `<button class="chip ${tab === key ? "is-active" : ""}" data-action="setFavTab" data-value="${key}">${label}</button>`).join("")}</div>
    ${blocks.length ? blocks.join("") : emptyState("heart", "المفضلة فارغة", "اضغط رمز القلب على أي مقال أو تمرين أو نادٍ أو بطولة لإضافته هنا.", `<button class="btn btn--primary" data-go="news">تصفح المحتوى</button>`)}`;
}

function notificationIcon(type) {
  const map = {
    welcome: "sparkles",
    data: "database",
    training: "academy",
    match: "ball",
    news: "news",
    admin: "bell"
  };
  return icon(map[type] || "bell");
}

function renderNotifications() {
  const unread = state.notifications.filter((item) => !item.read).length;
  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">مركز التنبيهات</div>
      <h1>الإشعارات</h1>
      <p>تحديثات التطبيق، تذكيرات التدريب، وتنبيهات المصادر. الإشعارات الخارجية تحتاج إذن النظام.</p>
    </div>
    <div class="switch-row mb-12">
      <div class="switch-row__body">
        <div class="switch-row__title">إشعارات النظام</div>
        <div class="switch-row__sub">${state.settings.notifications ? "مفعلة — قد تظهر تنبيهات خارج التطبيق" : "غير مفعلة — تعمل التنبيهات داخل التطبيق فقط"}</div>
      </div>
      <button class="switch ${state.settings.notifications ? "is-on" : ""}" data-action="requestNotifications" aria-label="تفعيل إشعارات النظام" aria-pressed="${state.settings.notifications}"></button>
    </div>
    <div class="section__head">
      <div><h2 class="section__title" style="font-size:15px">آخر التنبيهات</h2><p class="section__sub">${unread ? `${unread} غير مقروء` : "تم قراءة الكل"}</p></div>
      ${unread ? `<button class="section__link" data-action="markAllRead">${icon("check")} تعليم الكل كمقروء</button>` : ""}
    </div>
    <div class="notif-list">
      ${state.notifications.length ? state.notifications.map((item) => `
        <button class="notif ${item.read ? "" : "is-unread"}" data-action="markNotifRead" data-id="${esc(item.id)}">
          <span class="notif__icon">${notificationIcon(item.type)}</span>
          <span class="notif__body">
            <span class="notif__title">${esc(item.title)}</span>
            <span class="notif__text">${esc(item.text)}</span>
            <span class="notif__time">${timeAgo(item.at)}</span>
          </span>
          ${item.read ? "" : `<span class="notif__unread"></span>`}
        </button>`).join("") : emptyState("bell", "لا توجد إشعارات", "ستظهر هنا تحديثات التطبيق وتذكيرات التدريب.", "")}
    </div>`;
}

function renderAbout() {
  return `
    <div class="about-brand">
      <img class="about-brand__logo" src="assets/icon-192.png" alt="شعار وصل الحسيني" width="92" height="92" />
      <h1>وصل الحسيني</h1>
      <p>سكون الرياضي</p>
      <small>منصة عربية لكرة القدم: مباريات وبطولات وأخبار وأندية وأكاديمية تدريبية.<br>صُمم ليكون خفيفاً وسريعاً، ويعمل على Android وiPhone.</small>
    </div>

    <div class="section">
      ${sectionHead("قصة وصل الحسيني", "فريق شعبي من حضرموت")}
      <div class="academy-story">
        <img class="academy-story__img" src="assets/images/academy/team.svg" alt="" decoding="async" />
        <div class="academy-story__body">
          <p>وصل الحسيني فريق شعبي في اليمن، محافظة حضرموت — الغويزي. فريق كرة قدم يضم لاعبين وشباباً من المنطقة، يجمعهم حب اللعبة وروح الفريق الواحد.</p>
          <p>الفريق طموح جداً: يريد أن يتطور لاعبوه، وأن يمثّل منطقته بأفضل صورة داخل الملعب وخارجه.</p>
          <div class="academy-story__tags">
            <span>${icon("ball")} فريق شعبي</span>
            <span>${icon("users")} شباب المنطقة</span>
            <span>${icon("flame")} طموح كبير</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="about-card">
        <div class="about-card__label">برمجة وصنع التطبيقات</div>
        <div class="about-card__name">المبرمج: خالد الحماني</div>
        <div class="about-card__role">تطوير التطبيقات وتجربة المستخدم</div>
        <div class="contact-number">737202159</div>
        <div class="contact-row">
          <a class="contact-btn contact-btn--phone" href="tel:737202159" aria-label="اتصال هاتفي بالمبرمج خالد الحماني">${icon("phone")} اتصال هاتفي</a>
          <a class="contact-btn contact-btn--whatsapp" href="https://wa.me/967737202159" target="_blank" rel="noopener noreferrer" aria-label="واتساب المبرمج خالد الحماني">${icon("whatsapp")} واتساب</a>
        </div>
        <p class="field__hint text-center mt-12">للتواصل: 737202159 — الرقم كما هو دون تغيير.</p>
      </div>
    </div>

    <div class="section">
      ${sectionHead("عن التطبيق", "هوية ووظائف حقيقية")}
      <div class="about-links">
        <div class="about-link">${icon("ball")}<span>نتائج المباريات تُعرض فقط عند ربط مصدر بيانات موثوق.</span></div>
        <div class="about-link">${icon("academy")}<span>أكاديمية تدريبية بمحتوى أصلي، مؤقت، وتتبع تقدم محفوظ على الجهاز.</span></div>
        <div class="about-link">${icon("lock")}<span>المفضلة والإعدادات محفوظة محلياً على هاتفك.</span></div>
        <div class="about-link">${icon("shield")}<span>الشعارات الرسمية تُستخدم للتعريف فقط، والعلامات التجارية ملك لأصحابها.</span></div>
      </div>
    </div>

    <div class="section">
      ${sectionHead("المصادر وحقوق الشعارات", "شفافية البيانات")}
      <div class="about-links">
        <div class="about-link">${icon("database")}<span>النتائج والترتيب: OpenFootball (مفتوح المصدر).</span></div>
        <div class="about-link">${icon("play")}<span>البث: Yumi Sports — يُشاهد داخل التطبيق عبر مزوّده.</span></div>
        <div class="about-link">${icon("ball")}<span>شعارات الأندية والمنتخبات: football-logos.cc.</span></div>
        <div class="about-link">${icon("alert")}<span>استخدام الشعارات تعريفي/جماهيري فقط، دون استخدام تجاري أو إيحاء برعاية رسمية.</span></div>
      </div>
    </div>

    <div class="section">
      ${sectionHead("حقوق التنفيذ", "بيانات المبرمج")}
      <div class="team-bio text-center">
        برمجة وصنع التطبيقات<br>
        <strong style="color:var(--text)">المبرمج: خالد الحماني</strong><br>
        <span style="color:var(--gold);font-weight:800">للتواصل: 737202159</span>
      </div>
    </div>

    <p class="version-note">الإصدار ${APP_VERSION} · جميع الحقوق محفوظة للمبرمج خالد الحماني<br>وصل الحسيني — سكون الرياضي</p>`;
}

function renderSettings() {
  const s = state.settings;
  const hasApi = Boolean(s.apiKey.trim());
  const hasNews = Boolean(s.newsKey.trim());
  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">مركز البيانات</div>
      <h1>إعدادات المصادر</h1>
      <p>اربط مزودي البيانات لعرض المباريات والترتيب والأخبار الحقيقية. المفاتيح تُحفظ على جهازك فقط.</p>
    </div>

    ${notice("info", "لا يحتوي التطبيق على أي نتائج أو أخبار وهمية. إذا لم يكن المصدر متصلاً، ستظهر حالة واضحة بدلاً من بيانات مختلقة.")}

    <form class="form mt-16" data-form="settings">
      <div class="field">
        <span class="field__label">المصادر المجانية والمفتوحة</span>
        <label class="switch-row">
          <span class="switch-row__body">
            <span class="switch-row__title">OpenFootball — نتائج وترتيب الدوريات الخمسة</span>
            <span class="switch-row__sub">مصدر مفتوح المصدر يعمل دون مفتاح. النتائج والترتيب يُحسبان من المباريات المنشورة.</span>
          </span>
          <input class="switch-input" type="checkbox" name="openFootball" ${s.openFootball ? "checked" : ""} />
          <span class="switch ${s.openFootball ? "is-on" : ""}"></span>
        </label>
        <label class="switch-row" style="margin-top:8px">
          <span class="switch-row__body">
            <span class="switch-row__title">Yumi Sports — البث المباشر</span>
            <span class="switch-row__sub">يفتح المشاهدة داخل التطبيق، مع خيار الفتح الخارجي عند الحاجة.</span>
          </span>
          <input class="switch-input" type="checkbox" name="yumi" ${s.yumi ? "checked" : ""} />
          <span class="switch ${s.yumi ? "is-on" : ""}"></span>
        </label>
      </div>
      <div class="divider"></div>
      <div class="field">
        <span class="field__label">مزود المباريات (API-Football)</span>
        <input class="input" name="apiBase" type="url" dir="ltr" value="${esc(s.apiBase)}" placeholder="https://v3.football.api-sports.io" />
        <span class="field__hint">رابط الخدمة. يمكنك استخدام مزود متوافق مع نفس بنية API-Football.</span>
      </div>
      <div class="field">
        <span class="field__label">مفتاح API-Football</span>
        <input class="input" name="apiKey" type="password" dir="ltr" value="${esc(s.apiKey)}" placeholder="أدخل مفتاحك هنا" autocomplete="off" />
        <span class="field__hint">احصل على مفتاح من api-football.com. لا نرسل مفتاحك إلى أي خادم آخر.</span>
      </div>
      <div class="field-row">
        <div class="field">
          <span class="field__label">موسم البطولات</span>
          <input class="input" name="season" type="number" min="2000" max="2100" value="${esc(s.season)}" dir="ltr" />
        </div>
        <div class="field">
          <span class="field__label">تحديث تلقائي</span>
          <button type="button" class="switch-row" style="min-height:47px;justify-content:space-between" data-action="toggleAutoRefresh">
            <span class="switch-row__body"><span class="switch-row__title" style="font-size:10.5px">${s.autoRefresh ? "مفعل" : "متوقف"}</span></span>
            <span class="switch ${s.autoRefresh ? "is-on" : ""}"></span>
          </button>
        </div>
      </div>
      <div class="divider"></div>
      <div class="field">
        <span class="field__label">مزود الأخبار (GNews)</span>
        <input class="input" name="newsKey" type="password" dir="ltr" value="${esc(s.newsKey)}" placeholder="مفتاح GNews اختياري" autocomplete="off" />
        <span class="field__hint">عند إضافته، تظهر الأخبار العربية من المصادر مع رابط المصدر الأصلي.</span>
      </div>
      <div class="field">
        <span class="field__label">كلمة البحث الإخبارية</span>
        <input class="input" name="newsQuery" type="text" value="${esc(s.newsQuery)}" placeholder="كرة القدم" />
      </div>
      <div class="divider"></div>
      <div class="field">
        <span class="field__label">رمز لوحة التحكم</span>
        <input class="input" name="adminPin" type="password" dir="ltr" value="${esc(s.adminPin)}" inputmode="numeric" maxlength="20" />
        <span class="field__hint">الرمز الافتراضي هو رقم التواصل. يمكنك تغييره هنا.</span>
      </div>
      <div class="form-actions">
        <button class="btn btn--primary" type="submit">${icon("check")} حفظ الإعدادات</button>
        <button class="btn btn--dark" type="button" data-action="testSources">${icon("refresh")} اختبار الاتصال</button>
      </div>
    </form>

    <div class="section">
      ${sectionHead("حالة الاتصال", "آخر نتيجة اختبار")}
      <div class="source-card">
        <div class="source-card__top">
          <div class="source-card__icon">${icon(hasApi ? "database" : "wifiOff")}</div>
          <div><div class="source-card__title">المباريات والترتيب</div><div class="source-card__meta">${hasApi ? "مفتاح محفوظ — جرّب الاختبار" : "غير متصل"}</div></div>
        </div>
        <div class="source-card__top mt-12">
          <div class="source-card__icon">${icon(s.openFootball ? "database" : "wifiOff")}</div>
          <div><div class="source-card__title">OpenFootball (مفتوح المصدر)</div><div class="source-card__meta">${s.openFootball ? (state.openFootball.status === "ready" ? `مفعل — ${Object.keys(state.openFootball.leagues).length} دوريات محملة` : "مفعل — بانتظار التحميل") : "متوقف"}</div></div>
        </div>
        <div class="source-card__top mt-12">
          <div class="source-card__icon">${icon(s.yumi ? "play" : "wifiOff")}</div>
          <div><div class="source-card__title">Yumi Sports (البث)</div><div class="source-card__meta">${s.yumi ? (state.yumi.status === "ready" ? `مفعل — ${state.yumi.matches.length} مباراة` : "مفعل — بانتظار التحميل") : "متوقف"}</div></div>
        </div>
        <div class="source-card__top mt-12">
          <div class="source-card__icon">${icon(hasNews ? "news" : "wifiOff")}</div>
          <div><div class="source-card__title">الأخبار الخارجية</div><div class="source-card__meta">${hasNews ? "مفتاح GNews محفوظ" : "غير متصل — يظهر محتوى مجلة وصل"}</div></div>
        </div>
        <div id="sourceTestResult" class="mt-12">${state.ui.sourceTest ? `<div class="notice ${state.ui.sourceTest.ok ? "notice--success" : "notice--danger"}">${icon(state.ui.sourceTest.ok ? "check" : "alert")}<div>${esc(state.ui.sourceTest.message)}</div></div>` : ""}</div>
      </div>
    </div>

    <div class="section">
      ${sectionHead("الصيانة", "البيانات المحلية")}
      <div class="about-links">
        <button class="about-link" data-action="installApp">${icon("download")}<span>تثبيت التطبيق على الهاتف</span></button>
        <button class="about-link" data-action="clearCache">${icon("refresh")}<span>مسح ذاكرة المباريات والأخبار المؤقتة</span></button>
        <button class="about-link" data-action="resetContent">${icon("reset")}<span>إعادة ضبط المحتوى إلى النسخة الأصلية</span></button>
        <button class="about-link" data-go="about">${icon("info")}<span>حول التطبيق وبيانات المبرمج</span></button>
      </div>
    </div>

    <p class="version-note">المفاتيح والإعدادات محفوظة في مساحة التطبيق على جهازك.<br>لا تشارك مفتاح API مع أي شخص.</p>`;
}

function nationalTeamCard(team) {
  return `
    <button class="team-card nt-card" data-go="team/${esc(team.id)}">
      <span class="nt-card__crest">${teamCrest(team)}</span>
      <span class="team-card__body">
        <span class="team-card__name">${esc(team.name)}</span>
        <span class="team-card__meta">${icon("globe")} ${esc(team.confederation)}${team.nameEn ? ` <span>•</span> ${esc(team.nameEn)}` : ""}</span>
      </span>
      <span class="search-result__arrow">${icon("arrowLeft")}</span>
    </button>`;
}

function renderTeams() {
  const tab = state.ui.teamTab || "clubs";
  const countries = ["الكل", ...new Set(state.data.teams.map((team) => team.country))];
  const filtered = state.data.teams.filter((team) => state.ui.teamCountry === "الكل" || team.country === state.ui.teamCountry);
  /* شعب إب أولاً دائماً في دليل الأندية */
  const teams = [...filtered].sort((a, b) => {
    if (a.id === "shaab-ibb") return -1;
    if (b.id === "shaab-ibb") return 1;
    return 0;
  });
  const nationalList = tab === "clubs" ? [] : getNationalTeams(tab === "arab");

  const tabsHtml = `
    <div class="segmented mb-12">
      <button class="segmented__btn ${tab === "clubs" ? "is-active" : ""}" data-action="setTeamTab" data-value="clubs">${icon("shield")} الأندية</button>
      <button class="segmented__btn ${tab === "national" ? "is-active" : ""}" data-action="setTeamTab" data-value="national">${icon("globe")} المنتخبات</button>
      <button class="segmented__btn ${tab === "arab" ? "is-active" : ""}" data-action="setTeamTab" data-value="arab">${icon("star")} المنتخبات العربية</button>
    </div>`;

  const body = tab === "clubs"
    ? `<div class="chip-row">${countries.map((country) => `<button class="chip ${state.ui.teamCountry === country ? "is-active" : ""}" data-action="setTeamCountry" data-value="${esc(country)}">${esc(country)}</button>`).join("")}</div>
       <div class="article-list mt-12">${teams.map(teamCard).join("")}</div>
       ${!teams.length ? emptyState("shield", "لا توجد أندية", "جرّب دولة أخرى.", "") : ""}`
    : `<div class="nt-grid mt-12">${nationalList.map(nationalTeamCard).join("")}</div>
       ${!nationalList.length ? emptyState("globe", "لا توجد منتخبات", "تعذر العثور على منتخبات في هذه القائمة.", "") : ""}
       <p class="version-note">شعارات المنتخبات محفوظة داخل التطبيق وتعمل دون اتصال · المصدر: football-logos.cc</p>`;

  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">دليل الفرق</div>
      <h1>الفرق والمنتخبات</h1>
      <p>أندية كرة القدم والمنتخبات الوطنية، مع الشعارات الأصلية والمواعيد بتوقيت مكة المكرمة.</p>
    </div>
    ${tabsHtml}
    ${body}`;
}

function fmPlayerAvatar(player, extraClass = "") {
  const photo = player?.photo ? safeUrl(player.photo) : "";
  const initial = String(player?.name || "?").trim().slice(0, 1);
  return `<span class="fm-player__photo ${extraClass}"><span class="fm-player__initial">${esc(initial)}</span>${photo
    ? `<img src="${esc(photo)}" alt="" loading="lazy" decoding="async" onerror="this.remove()" />`
    : ""}</span>`;
}

function fmShortPlayerName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function fmPlayerRow(player, options = {}) {
  const meta = [
    player.position,
    player.cname || player.countryName || player.ccode || "",
    player.age ? `${player.age} سنة` : ""
  ].filter(Boolean).join(" · ");
  return `
    <div class="fm-player">
      ${fmPlayerAvatar(player)}
      <span class="fm-player__num">${esc(player.shirtNumber || "")}</span>
      <span class="fm-player__body">
        <span class="fm-player__name">${esc(player.name)}${player.isCaptain ? ` <em class="fm-player__captain">C</em>` : ""}</span>
        <span class="fm-player__meta">${esc(meta)}</span>
      </span>
      ${options.rating && player.rating ? `<span class="fm-player__rating">${esc(String(player.rating))}</span>` : ""}
      ${player.injured ? `<span class="fm-player__injury">${icon("alert")}</span>` : ""}
    </div>`;
}

function fmPitchHtml(lineup) {
  const starters = Array.isArray(lineup?.starters) ? lineup.starters : [];
  if (!starters.length) return "";
  const hasCoords = starters.every((player) => player.x !== null && player.x !== undefined && player.y !== null && player.y !== undefined);
  if (!hasCoords) {
    return `<div class="fm-starters">${starters.map((player) => fmPlayerRow(player)).join("")}</div>`;
  }
  return `
    <div class="fm-pitch" dir="ltr" aria-label="التشكيل ${esc(lineup.formation || "")}">
      <span class="fm-pitch__line fm-pitch__line--mid"></span>
      <span class="fm-pitch__circle"></span>
      ${starters.map((player) => `
        <div class="fm-pitch__player" style="left:${Math.max(4, Math.min(96, player.x * 100))}%;top:${Math.max(6, Math.min(94, player.y * 100))}%">
          ${fmPlayerAvatar(player, "fm-player__photo--pitch")}
          <span class="fm-pitch__num">${esc(player.shirtNumber || "")}</span>
          <span class="fm-pitch__name">${esc(fmShortPlayerName(player.name))}</span>
        </div>`).join("")}
    </div>`;
}

function fmLineupSection(lineup) {
  if (!lineup || !Array.isArray(lineup.starters) || !lineup.starters.length) return "";
  const lastMatch = lineup.lastMatch;
  const sub = [lineup.formation ? `خطة ${lineup.formation}` : "", lastMatch ? `${lastMatch.home} × ${lastMatch.away}` : ""]
    .filter(Boolean).join(" · ");
  return `
    <div class="section">
      ${sectionHead("التشكيل الأخير", sub || "من FotMob")}
      <div class="chip-row mb-12">
        ${lineup.formation ? `<span class="chip">${icon("shield")} ${esc(lineup.formation)}</span>` : ""}
        ${lineup.averageAge ? `<span class="chip">متوسط العمر ${esc(String(lineup.averageAge))}</span>` : ""}
        ${lineup.starters.length ? `<span class="chip">${lineup.starters.length} لاعباً أساسياً</span>` : ""}
      </div>
      ${fmPitchHtml(lineup)}
      ${Array.isArray(lineup.subs) && lineup.subs.length ? `
        <details class="fm-subs">
          <summary>البدلاء (${lineup.subs.length})</summary>
          <div class="fm-starters">${lineup.subs.map((player) => fmPlayerRow(player, { rating: true })).join("")}</div>
        </details>` : ""}
      ${Array.isArray(lineup.unavailable) && lineup.unavailable.length ? `
        <div class="fm-unavailable"><strong>غير متاحين:</strong> ${lineup.unavailable.map((player) => `${esc(player.name)} (${esc(player.reason)})`).join("، ")}</div>` : ""}
      <p class="version-note">التشكيل من آخر مباراة · المصدر: FotMob</p>
    </div>`;
}

function fmResultCrest(team) {
  if (!team) return `<span class="team-result__crest team-result__crest--txt">?</span>`;
  const logo = typeof fmLogo === "function" ? fmLogo(team) : (team.logo || "");
  if (logo) {
    return `<span class="team-result__crest"><img src="${esc(safeUrl(logo))}" alt="" loading="lazy" decoding="async" onerror="this.remove()" /></span>`;
  }
  return `<span class="team-result__crest team-result__crest--txt">${esc(String(team.name || "?").slice(0, 2))}</span>`;
}

function fmTeamResultRow(item, teamId) {
  const home = item.home || {};
  const away = item.away || {};
  const hs = home.score;
  const as = away.score;
  const hasScore = hs !== null && hs !== undefined && as !== null && as !== undefined;
  const isHome = Number(home.id) === Number(teamId);
  const own = isHome ? hs : as;
  const opp = isHome ? as : hs;
  const result = hasScore ? (own > opp ? "win" : own < opp ? "loss" : "draw") : "";
  return `
    <div class="team-result ${result ? `is-${result}` : ""}">
      <span class="team-result__side team-result__side--home">
        <span class="team-result__name">${esc(home.name || "الفريق الأول")}</span>
        ${fmResultCrest(home)}
      </span>
      <span class="team-result__score ${result ? `is-${result}` : ""}">
        <b class="${isHome ? "is-own" : ""}">${hasScore ? hs : "–"}</b><i>:</i><b class="${!isHome ? "is-own" : ""}">${hasScore ? as : "–"}</b>
      </span>
      <span class="team-result__side team-result__side--away">
        ${fmResultCrest(away)}
        <span class="team-result__name">${esc(away.name || "الفريق الثاني")}</span>
      </span>
    </div>`;
}

function renderTeam(route) {
  const localTeam = getTeamById(route.id);
  const numericId = /^\d+$/.test(String(route.id)) ? Number(route.id) : null;
  const fmId = numericId || (localTeam && localTeam.fotmobId ? Number(localTeam.fotmobId) : null);
  if (!localTeam && !fmId) return renderNotFound();

  const profile = fmId && typeof getFmTeam === "function" ? getFmTeam(fmId) : null;
  const ready = profile && profile.status === "ready";
  const comp = localTeam ? getCompetitionById(localTeam.leagueId) : null;
  const displayName = localTeam?.name || profile?.name || "";
  const displayCountry = localTeam?.country || profile?.country || "";
  const logo = localTeam ? clubLogoFor(localTeam) : (profile?.logo || "");
  const fixtures = state.matches.fixtures.filter((fixture) => [fixture.home?.name, fixture.away?.name].includes(displayName));

  const fmSection = (() => {
    if (!fmId) return "";
    if (!profile) {
      return `<div class="section">${sectionHead("بيانات الفريق", "من FotMob")}<div class="table-wrap"><div style="padding:14px">${[1, 2, 3].map(() => `<div class="skeleton" style="height:30px;margin-bottom:6px"></div>`).join("")}</div></div></div>`;
    }
    if (profile.status === "error") {
      return `<div class="section">${sectionHead("بيانات الفريق", "من FotMob")}${notice("info", esc(profile.error || "المصدر لا يوفّر بيانات هذا الفريق."), "")}</div>`;
    }
    if (!ready) return "";

    const coach = profile.coach;
    const groups = (profile.squad || []).filter((group) => group.title !== "coach" && group.members.length);
    const allFixtures = profile.fixtures || [];
    const now = Date.now();
    const past = allFixtures.filter((item) => new Date(item.date).getTime() < now).slice(-10).reverse();
    const next = allFixtures.filter((item) => new Date(item.date).getTime() >= now).slice(0, 5);
    const positionLabel = {
      keepers: "حراسة المرمى", defenders: "خط الدفاع", midfielders: "خط الوسط", attackers: "خط الهجوم",
      keeper: "حراسة المرمى", defender: "دفاع", midfielder: "وسط", attacker: "هجوم", coach: "المدرب"
    };
    const squadSize = profile.squadSize || groups.reduce((total, group) => total + group.members.length, 0);
    const form = Array.isArray(profile.teamForm) ? profile.teamForm.slice(-5) : [];

    const fixtureRow = (item) => `
      <div class="fm-fixture">
        <div class="fm-fixture__teams">${esc(item.home.name)} <span>×</span> ${esc(item.away.name)}</div>
        <div class="fm-fixture__meta">${esc(item.tournament)} · ${esc(formatDateShort(item.date))} · <strong class="fm-fixture__time">${esc(formatClock(item.date))}</strong></div>
        <div class="fm-fixture__score">${item.statusShort === "NS" ? "—" : `${item.home.score ?? 0} - ${item.away.score ?? 0}`}</div>
      </div>`;

    return `
      ${coach ? `<div class="section">${sectionHead("المدرب", "الجهاز الفني")}
        <div class="fm-coach">${fmPlayerAvatar({ name: coach.name, photo: coach.photo })}
          <div><strong>${esc(coach.name)}</strong><span>${esc(coach.cname || coach.ccode || "مدرب")}</span></div>
        </div></div>` : ""}
      ${form.length ? `<div class="section">${sectionHead("الحالة الفنية", "آخر 5 مباريات")}
        <div class="fm-form">${typeof formDots === "function" ? formDots(form.map((item) => item.result)) : ""}
          <span class="fm-form__note">${form.map((item) => `${esc(item.result === "W" ? "ف" : item.result === "L" ? "خ" : item.result === "D" ? "ت" : item.result)} ${esc(item.score)}`).join(" · ")}</span>
        </div></div>` : ""}
      ${fmLineupSection(profile.lastLineup)}
      ${groups.length ? `<div class="section">${sectionHead("قائمة اللاعبين", `${squadSize} لاعباً · من FotMob`)}
        ${groups.map((group) => `
          <div class="fm-squad">
            <div class="fm-squad__title">${esc(group.titleAr || positionLabel[group.title] || group.title || "لاعبون")}</div>
            ${group.members.map((member) => fmPlayerRow(member, { rating: true })).join("")}
          </div>`).join("")}
      </div>` : ""}
      ${past.length ? `<div class="section">${sectionHead("مستوى الفريق", "آخر مباريات الفريق · النتائج السابقة")}<div class="team-results">${past.map((item) => fmTeamResultRow(item, fmId)).join("")}</div></div>` : ""}
      ${next.length ? `<div class="section">${sectionHead("أقرب 5 مباريات", `المواعيد ${MECCA_LABEL}`)}<div class="fm-fixtures">${next.map(fixtureRow).join("")}</div></div>` : ""}
      <p class="version-note">بيانات الفريق واللاعبين والصور: FotMob · المواعيد بتوقيت مكة المكرمة</p>`;
  })();

  const s365Id = localTeam && typeof s365TeamId === "function" ? s365TeamId(localTeam) : null;
  const s365Profile = s365Id && typeof getS365Team === "function" ? getS365Team(s365Id) : null;

  const s365Section = (() => {
    if (!s365Id || ready) return "";
    const head = (title, sub) => sectionHead(title, sub);
    if (!s365Profile || (s365Profile.status === "loading"
      && !(s365Profile.last5 || []).length && !(s365Profile.next5 || []).length)) {
      return `<div class="section">${head("بيانات الفريق", "من 365Scores")}<div class="table-wrap"><div style="padding:14px">${[1, 2, 3].map(() => `<div class="skeleton" style="height:30px;margin-bottom:6px"></div>`).join("")}</div></div></div>`;
    }
    if (s365Profile.status === "error") {
      return `<div class="section">${head("بيانات الفريق", "من 365Scores")}${notice("info", esc(s365Profile.error || "المصدر لا يوفّر بيانات هذا الفريق."), "")}</div>`;
    }
    const row = (item) => {
      const hasScore = item.home.score !== null && item.home.score >= 0 && item.away.score !== null && item.away.score >= 0;
      return `
      <div class="fm-fixture">
        <div class="fm-fixture__teams">${esc(item.home.name)} <span>×</span> ${esc(item.away.name)}</div>
        <div class="fm-fixture__meta">${esc(item.competition || "مباراة")} · ${esc(formatDateShort(item.date))} · <strong class="fm-fixture__time">${esc(formatClock(item.date))}</strong> · ${MECCA_LABEL}</div>
        <div class="fm-fixture__score">${hasScore ? `${item.home.score} - ${item.away.score}` : "—"}</div>
      </div>`;
    };
    const last5 = s365Profile.last5 || [];
    const next5 = s365Profile.next5 || [];
    const h2h = s365Profile.h2h || [];
    return `
      ${s365Profile.stale ? notice("warn", `بيانات محفوظة · ${esc(formatTime(s365Profile.updatedAt) || "")} — تعذر التحديث الآن.`, "mb-12") : ""}
      ${last5.length ? `<div class="section">${head("آخر 5 مباريات", "النتائج السابقة")}<div class="fm-fixtures">${last5.map(row).join("")}</div></div>` : ""}
      ${next5.length ? `<div class="section">${head("أقرب 5 مباريات", `المواعيد ${MECCA_LABEL}`)}<div class="fm-fixtures">${next5.map(row).join("")}</div></div>` : ""}
      ${h2h.length ? `<div class="section">${head("المواجهات المباشرة", s365Profile.h2hOpponent ? `ضد ${s365Profile.h2hOpponent.name}` : "آخر المواجهات")}<div class="fm-fixtures">${h2h.map(row).join("")}</div></div>` : (s365Profile.h2hOpponent ? `<div class="section">${head("المواجهات المباشرة", `ضد ${s365Profile.h2hOpponent.name}`)}${notice("info", "لا توجد مواجهات سابقة بين الفريقين ضمن بيانات المصدر الحالية.", "")}</div>` : "")}
      ${!last5.length && !next5.length ? emptyState("calendar", "لا توجد مباريات موثّقة", "لا يُرجع المصدر مباريات لهذا الفريق في الفترة الحالية.", "") : ""}
      <p class="version-note">بيانات الفريق: 365Scores · المواعيد بتوقيت مكة المكرمة</p>`;
  })();

  const honorsList = [...new Set([...(localTeam?.honors || []), ...((s365Profile && s365Profile.honors) || [])])];
  const honorsSection = localTeam ? `<div class="section">
    ${sectionHead("سجل البطولات", "ألقاب موثّقة")}
    ${honorsList.length
      ? `<div class="chip-row">${honorsList.map((item) => `<span class="chip">${esc(item)}</span>`).join("")}</div>`
      : `<p class="text-muted" style="font-size:11px">لا توجد بيانات ألقاب موثّقة لهذا الفريق في المصدر الحالي — لا نعرض أرقاماً غير مؤكدة.</p>`}
  </div>` : "";

  const isNational = localTeam && localTeam.type === "national";
  const noSquadSection = localTeam && !fmId && !isNational
    ? `<div class="section">${sectionHead("قائمة اللاعبين", "المصدر")}${notice("info", "FotMob لا يغطي هذا الدوري، و365Scores لا يوفّر قائمة لاعبين أو صوراً لهذا النادي. لا نعرض أسماء أو صوراً غير مؤكدة.", "")}</div>`
    : "";

  return `
    <div class="team-hero" style="${compStyle(comp || {})}">
      ${localTeam ? teamCrest(localTeam, "", true) : `<span class="team-crest team-crest--img">${logo ? `<img src="${esc(safeUrl(logo))}" alt="" />` : ""}</span>`}
      <h1>${esc(displayName)}</h1>
      <p>${isNational ? `منتخب وطني · ${esc(localTeam?.confederation || "")}` : `${esc(localTeam?.city || "")}${localTeam?.city ? " · " : ""}${esc(displayCountry)}`}</p>
      <div class="info-grid">
        ${isNational
          ? `<div class="info-cell"><span>الكونفدرالية</span><strong>${esc(localTeam?.confederation || "—")}</strong></div>
             <div class="info-cell"><span>الاسم الدولي</span><strong>${esc(localTeam?.nameEn || "—")}</strong></div>`
          : `<div class="info-cell"><span>تأسس</span><strong>${esc(localTeam?.founded || "—")}</strong></div>
             <div class="info-cell"><span>الملعب</span><strong>${esc(localTeam?.stadium || profile?.venue || "—")}</strong></div>`}
        <div class="info-cell"><span>${isNational ? "الدولة" : "البطولة"}</span><strong>${esc(isNational ? (localTeam?.name || "—") : (comp?.name || profile?.leagueName || "—"))}</strong></div>
        <div class="info-cell"><span>المدرب</span><strong>${esc(ready && profile.coach ? profile.coach.name : "—")}</strong></div>
      </div>
      ${ready ? `<div class="team-hero__tags">
        ${profile.lastLineup?.formation ? `<span class="chip">${icon("shield")} ${esc(profile.lastLineup.formation)}</span>` : ""}
        ${profile.squadSize ? `<span class="chip">${profile.squadSize} لاعباً</span>` : ""}
        ${profile.leagueName ? `<span class="chip">${esc(profile.leagueName)}</span>` : ""}
      </div>` : ""}
    </div>
    ${localTeam && localTeam.bio ? `<div class="team-bio">${esc(localTeam.bio)}</div>` : ""}
    ${localTeam ? `<div class="section">
      <button class="btn ${isFavorite("team", localTeam.id) ? "btn--soft" : "btn--primary"} btn--block" data-action="toggleFavorite" data-type="team" data-id="${esc(localTeam.id)}">${heartIcon(isFavorite("team", localTeam.id))} ${isFavorite("team", localTeam.id) ? "محفوظ في المفضلة" : "حفظ الفريق"}</button>
    </div>` : ""}
    ${fmSection}
    ${s365Section}
    ${noSquadSection}
    ${honorsSection}
    ${comp ? `<div class="section">${sectionHead("البطولة", "معلومات الدوري")}<div class="article-list">${competitionRow(comp)}</div></div>` : ""}
    ${fixtures.length ? `<div class="section">${sectionHead("مباريات اليوم", "من مصدر البيانات")}<div class="match-list">${fixtures.map(fullMatchCard).join("")}</div></div>` : ""}
    <div class="section">
      ${sectionHead(isNational ? "منتخبات أخرى" : "أندية أخرى", isNational ? "من نفس الكونفدرالية" : "من نفس الدولة")}
      <div class="team-strip">${(isNational
        ? getNationalTeams().filter((item) => item.id !== localTeam?.id && item.confederation === localTeam?.confederation)
        : state.data.teams.filter((item) => item.id !== localTeam?.id && item.country === displayCountry))
        .map(teamChip).join("") || `<p class="text-muted" style="font-size:11px">لا توجد فرق أخرى مضافة بعد.</p>`}</div>
    </div>`;
}

/* --------------------------------------------------------------------------
   البحث
   -------------------------------------------------------------------------- */
function searchMatches(query) {
  const q = normalizeArabic(query);
  if (!q) return [];
  const results = [];
  state.data.articles.forEach((article) => {
    if (normalizeArabic(`${article.title} ${article.excerpt} ${article.category}`).includes(q)) {
      results.push({ type: "مقال", title: article.title, meta: article.category, route: `article/${article.id}`, icon: "news" });
    }
  });
  state.data.drills.forEach((drill) => {
    if (normalizeArabic(`${drill.title} ${drill.desc} ${drill.category} ${drill.level}`).includes(q)) {
      results.push({ type: "تمرين", title: drill.title, meta: `${drill.level} · ${drill.duration} دقيقة`, route: `drill/${drill.id}`, icon: "academy" });
    }
  });
  state.data.teams.forEach((team) => {
    if (normalizeArabic(`${team.name} ${team.city} ${team.country} ${team.stadium}`).includes(q)) {
      results.push({ type: "نادي", title: team.name, meta: `${team.city} · ${team.country}`, route: `team/${team.id}`, icon: "shield" });
    }
  });
  getNationalTeams().forEach((team) => {
    if (normalizeArabic(`${team.name} ${team.nameEn} ${team.confederation} منتخب`).includes(q)) {
      results.push({ type: "منتخب", title: team.name, meta: `${team.confederation} · ${team.nameEn}`, route: `team/${team.id}`, icon: "globe" });
    }
  });
  state.data.competitions.forEach((comp) => {
    if (normalizeArabic(`${comp.name} ${comp.country} ${comp.type}`).includes(q)) {
      results.push({ type: "بطولة", title: comp.name, meta: `${comp.country} · ${comp.type}`, route: `competition/${comp.id}`, icon: "trophy" });
    }
  });
  state.matches.fixtures.forEach((fixture) => {
    const haystack = normalizeArabic(`${fixture.home?.name} ${fixture.away?.name} ${fixture.league?.name}`);
    if (haystack.includes(q)) {
      results.push({ type: "مباراة", title: `${fixture.home?.name || ""} × ${fixture.away?.name || ""}`, meta: fixture.league?.name || "مباراة", route: "matches", icon: "ball" });
    }
  });
  return results;
}

function renderSearchResultsHtml(query) {
  const results = searchMatches(query);
  if (!query.trim()) {
    const recent = state.ui.recentSearches;
    const suggestions = [
      { type: "مقال", title: state.data.articles[0]?.title || "", meta: state.data.articles[0]?.category || "مقترح", route: `article/${state.data.articles[0]?.id || ""}`, icon: "news" },
      { type: "تمرين", title: state.data.drills[0]?.title || "", meta: `${state.data.drills[0]?.level || "مقترح"} · ${state.data.drills[0]?.duration || 0} دقيقة`, route: `drill/${state.data.drills[0]?.id || ""}`, icon: "academy" },
      { type: "بطولة", title: state.data.competitions[0]?.name || "", meta: `${state.data.competitions[0]?.country || ""} · ${state.data.competitions[0]?.type || "مقترح"}`, route: `competition/${state.data.competitions[0]?.id || ""}`, icon: "trophy" }
    ].filter((item) => item.title);
    return `
      ${recent.length ? `<div class="search-block"><div class="search-block__title">بحثت سابقاً</div><div class="chip-row">${recent.map((item) => `<button class="chip" data-action="useSearch" data-value="${esc(item)}">${icon("clock")} ${esc(item)}</button>`).join("")}</div></div>` : ""}
      <div class="search-block"><div class="search-block__title">اقتراحات لك</div><div class="search-results">${suggestions.map(searchResultRow).join("")}</div></div>
      <div class="search-block"><div class="search-block__title">جرّب البحث عن</div><div class="chip-row">${["الضغط العالي", "المراوغة", "الهلال", "دوري روشن", "التغذية"].map((term) => `<button class="chip" data-action="useSearch" data-value="${term}">${term}</button>`).join("")}</div></div>`;
  }
  if (!results.length) {
    return `<div class="search-empty">${icon("search")}<br>لا توجد نتائج عن «${esc(query)}»<br><span style="font-size:10px;color:var(--muted-2)">جرّب كلمة أقصر أو مختلفة.</span></div>`;
  }
  return `<div class="search-block"><div class="search-block__title">${results.length} نتيجة</div><div class="search-results">${results.map(searchResultRow).join("")}</div></div>`;
}

function searchResultRow(result) {
  return `
    <button class="search-result" data-go="${esc(result.route)}">
      <span class="search-result__icon">${icon(result.icon)}</span>
      <span class="search-result__body"><span class="search-result__title">${esc(result.title)}</span><span class="search-result__meta">${esc(result.type)} · ${esc(result.meta)}</span></span>
      <span class="search-result__arrow">${icon("arrowLeft")}</span>
    </button>`;
}

function renderSearch() {
  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">بحث شامل</div>
      <h1>ابحث في وصل</h1>
      <p>ابحث في المقالات والتمارين والأندية والبطولات والمباريات المحمّلة.</p>
    </div>
    <div class="search-box">
      ${icon("search")}
      <input id="searchInput" type="search" value="${esc(state.ui.searchQuery)}" placeholder="ابحث عن فريق، بطولة، مهارة..." autocomplete="off" enterkeyhint="search" />
      <button class="search-clear ${state.ui.searchQuery ? "" : "hidden"}" data-action="clearSearch" aria-label="مسح البحث">×</button>
    </div>
    <div id="searchResults">${renderSearchResultsHtml(state.ui.searchQuery)}</div>`;
}

function renderSearchResults() {
  const container = $("#searchResults");
  if (container) container.innerHTML = renderSearchResultsHtml(state.ui.searchQuery);
  const clear = $(".search-clear");
  if (clear) clear.classList.toggle("hidden", !state.ui.searchQuery);
}
