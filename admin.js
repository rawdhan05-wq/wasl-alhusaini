/* ==========================================================================
   لوحة التحكم المحلية: إدارة المحتوى، الإشعارات والنسخ الاحتياطي
   ========================================================================== */
"use strict";

const ADMIN_TABS = [
  ["overview", "نظرة عامة"],
  ["articles", "الأخبار"],
  ["drills", "التمارين"],
  ["teams", "الأندية"],
  ["competitions", "البطولات"],
  ["sources", "المصادر"],
  ["notifications", "الإشعارات"],
  ["backup", "النسخ الاحتياطي"]
];

function renderAdmin() {
  if (!state.ui.adminUnlocked) return renderAdminGate();
  const tabs = ADMIN_TABS.map(([key, label]) => `<button class="admin-tab ${state.ui.adminTab === key ? "is-active" : ""}" data-action="setAdminTab" data-value="${key}">${label}</button>`).join("");
  const content = {
    overview: renderAdminOverview,
    articles: renderAdminArticles,
    drills: renderAdminDrills,
    teams: renderAdminTeams,
    competitions: renderAdminCompetitions,
    sources: renderAdminSources,
    notifications: renderAdminNotifications,
    backup: renderAdminBackup
  }[state.ui.adminTab] || renderAdminOverview;

  return `
    <div class="page-intro">
      <div class="page-intro__eyebrow">إدارة محلية</div>
      <h1>لوحة التحكم</h1>
      <p>أضف وعدّل المحتوى على هذا الجهاز. التغييرات تُحفظ محلياً، ويمكن تصديرها كنسخة احتياطية.</p>
    </div>
    <div class="admin-tabs">${tabs}</div>
    ${content()}`;
}

function renderAdminGate() {
  return `
    <div class="admin-gate">
      <div class="admin-gate__icon">${icon("lock")}</div>
      <h1>دخول لوحة التحكم</h1>
      <p>هذه اللوحة محلية على جهازك لإدارة المحتوى والإعدادات. أدخل رمز الدخول للمتابعة.</p>
      <form class="form" data-form="adminPin">
        <input class="input pin-input" name="pin" type="password" inputmode="numeric" maxlength="20" placeholder="••••••" autocomplete="off" required />
        <button class="btn btn--primary btn--block" type="submit">${icon("lock")} دخول</button>
      </form>
      <p class="field__hint mt-12">الرمز الافتراضي هو رقم التواصل الموجود في «حول التطبيق».<br>يمكن تغييره من إعدادات المصادر.</p>
    </div>`;
}

function adminStat(value, label) {
  return `<div class="admin-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
}

function renderAdminOverview() {
  const hasApi = Boolean(state.settings.apiKey.trim());
  const hasNews = Boolean(state.settings.newsKey.trim());
  return `
    <div class="admin-stats">
      ${adminStat(state.data.articles.length, "مقال")}
      ${adminStat(state.data.drills.length, "تمرين")}
      ${adminStat(state.data.teams.length, "نادٍ")}
      ${adminStat(state.data.competitions.length, "بطولة")}
      ${adminStat(favoriteCount(), "في المفضلة")}
      ${adminStat(state.notifications.filter((item) => !item.read).length, "إشعار غير مقروء")}
    </div>
    <div class="admin-section">
      <div class="admin-section__title">حالة المصادر</div>
      <div class="source-card">
        <div class="source-card__top">
          <div class="source-card__icon">${icon(hasApi ? "database" : "wifiOff")}</div>
          <div><div class="source-card__title">API-Football</div><div class="source-card__meta">${hasApi ? "مفتاح محفوظ" : "غير متصل — لا تُعرض نتائج"}</div></div>
        </div>
        <div class="source-card__top mt-12">
          <div class="source-card__icon">${icon(hasNews ? "news" : "wifiOff")}</div>
          <div><div class="source-card__title">GNews</div><div class="source-card__meta">${hasNews ? "مفتاح محفوظ" : "غير متصل — محتوى مجلة وصل فقط"}</div></div>
        </div>
        <div class="source-card__actions"><button class="btn btn--soft btn--small" data-go="settings">${icon("settings")} إعدادات المصادر</button></div>
      </div>
    </div>
    <div class="admin-section">
      <div class="admin-section__title">إجراءات سريعة</div>
      <div class="about-links">
        <button class="about-link" data-action="addAdmin" data-type="article">${icon("plus")}<span>إضافة مقال جديد</span></button>
        <button class="about-link" data-action="addAdmin" data-type="drill">${icon("plus")}<span>إضافة تمرين جديد</span></button>
        <button class="about-link" data-action="addAdmin" data-type="team">${icon("plus")}<span>إضافة نادٍ جديد</span></button>
        <button class="about-link" data-action="addAdmin" data-type="competition">${icon("plus")}<span>إضافة بطولة جديدة</span></button>
      </div>
    </div>
    ${notice("info", "لوحة التحكم محلية وليست خادماً سحابياً. لن تظهر التغييرات على أجهزة أخرى إلا بعد تصدير النسخة الاحتياطية واستيرادها.")}`;
}

function adminItem(type, id, title, meta) {
  return `
    <div class="admin-item">
      <div class="admin-item__body"><div class="admin-item__title">${esc(title)}</div><div class="admin-item__meta">${esc(meta)}</div></div>
      <div class="admin-item__actions">
        <button class="mini-btn" data-action="editAdmin" data-type="${type}" data-id="${esc(id)}" aria-label="تعديل">${icon("edit")}</button>
        <button class="mini-btn mini-btn--danger" data-action="deleteAdmin" data-type="${type}" data-id="${esc(id)}" aria-label="حذف">${icon("trash")}</button>
      </div>
    </div>`;
}

function adminHead(title, type) {
  return `<div class="admin-head"><h3>${esc(title)}</h3><button class="btn btn--primary btn--small" data-action="addAdmin" data-type="${type}">${icon("plus")} إضافة</button></div>`;
}

function renderAdminArticles() {
  return `${adminHead("إدارة المقالات", "article")}<div class="admin-list">${state.data.articles.map((item) => adminItem("article", item.id, item.title, `${item.category} · ${item.readTime || 3} دقائق`)).join("")}</div>`;
}

function renderAdminDrills() {
  return `${adminHead("إدارة التمارين", "drill")}<div class="admin-list">${state.data.drills.map((item) => adminItem("drill", item.id, item.title, `${item.level} · ${item.duration} دقيقة`)).join("")}</div>`;
}

function renderAdminTeams() {
  return `${adminHead("إدارة الأندية", "team")}<div class="admin-list">${state.data.teams.map((item) => adminItem("team", item.id, item.name, `${item.city} · ${item.country}`)).join("")}</div>`;
}

function renderAdminCompetitions() {
  return `${adminHead("إدارة البطولات", "competition")}<div class="admin-list">${state.data.competitions.map((item) => adminItem("competition", item.id, item.name, `${item.country} · ${item.type}`)).join("")}</div>`;
}

function renderAdminSources() {
  return `
    ${notice("info", "مفاتيح المصادر تُدار من صفحة إعدادات المصادر، وتُحفظ على جهازك فقط. لا توجد مفاتيح مضمّنة داخل التطبيق.")}
    <div class="admin-section">
      <div class="admin-section__title">المزودون</div>
      <div class="source-card">
        <div class="source-card__top">
          <div class="source-card__icon">${icon(state.settings.apiKey ? "database" : "wifiOff")}</div>
          <div><div class="source-card__title">API-Football</div><div class="source-card__meta">${state.settings.apiKey ? "متصل" : "غير متصل"}</div></div>
        </div>
        <div class="source-card__top mt-12">
          <div class="source-card__icon">${icon(state.settings.newsKey ? "news" : "wifiOff")}</div>
          <div><div class="source-card__title">GNews</div><div class="source-card__meta">${state.settings.newsKey ? "متصل" : "غير متصل"}</div></div>
        </div>
        <div class="source-card__actions">
          <button class="btn btn--primary btn--small" data-go="settings">${icon("settings")} فتح الإعدادات</button>
          <button class="btn btn--dark btn--small" data-action="testSources">${icon("refresh")} اختبار الاتصال</button>
        </div>
      </div>
    </div>
    <div class="admin-section">
      <div class="admin-section__title">ملاحظات النشر</div>
      <div class="team-bio">
        • استخدم مفاتيحك الخاصة والتزم بشروط استخدام كل مزود.<br>
        • API-Football يعرض المباريات والترتيب. GNews يعرض الأخبار مع رابط المصدر.<br>
        • عند عدم توفر مفتاح، يعرض التطبيق حالة واضحة ولا يخترع نتائج.<br>
        • قبل النشر على المتاجر، راجع سياسات المصادر وحقوق الصور.
      </div>
    </div>`;
}

function renderAdminNotifications() {
  return `
    <div class="admin-head"><h3>إرسال تنبيه</h3></div>
    <form class="form" data-form="adminNotification">
      <div class="field"><span class="field__label">عنوان التنبيه</span><input class="input" name="title" required maxlength="80" placeholder="تحديث جديد" /></div>
      <div class="field"><span class="field__label">نص التنبيه</span><textarea class="textarea" name="text" required maxlength="300" placeholder="اكتب رسالة قصيرة وواضحة..."></textarea></div>
      <button class="btn btn--primary btn--block" type="submit">${icon("send")} إرسال التنبيه</button>
    </form>
    <div class="admin-section">
      <div class="admin-head"><h3>آخر التنبيهات</h3><button class="mini-btn mini-btn--danger" data-action="clearNotifications" aria-label="حذف الكل">${icon("trash")}</button></div>
      <div class="admin-list">${state.notifications.slice(0, 10).map((item) => `
        <div class="admin-item"><div class="admin-item__body"><div class="admin-item__title">${esc(item.title)}</div><div class="admin-item__meta">${esc(timeAgo(item.at))}</div></div>
        <div class="admin-item__actions"><button class="mini-btn mini-btn--danger" data-action="deleteNotification" data-id="${esc(item.id)}" aria-label="حذف">${icon("trash")}</button></div></div>`).join("")}</div>
    </div>`;
}

function renderAdminBackup() {
  return `
    ${notice("info", "النسخة الاحتياطية تحتوي على المحتوى التحريري فقط، ولا تتضمن مفاتيح API أو بيانات المفضلة.")}
    <div class="admin-section">
      <div class="admin-section__title">تصدير</div>
      <button class="btn btn--primary btn--block" data-action="exportBackup">${icon("download")} تنزيل نسخة JSON</button>
      <button class="btn btn--dark btn--block mt-8" data-action="copyBackup">${icon("copy")} نسخ JSON إلى الحافظة</button>
    </div>
    <div class="admin-section">
      <div class="admin-section__title">استيراد</div>
      <form class="form" data-form="importBackup">
        <div class="field"><span class="field__label">ألصق محتوى النسخة الاحتياطية</span><textarea class="textarea" name="json" dir="ltr" rows="6" placeholder='{"version":1,"articles":[...]}'></textarea></div>
        <button class="btn btn--soft btn--block" type="submit">${icon("upload")} استيراد واستبدال المحتوى</button>
      </form>
    </div>
    <div class="admin-section">
      <div class="admin-section__title">منطقة الخطر</div>
      <button class="btn btn--danger btn--block" data-action="resetContent">${icon("reset")} إعادة ضبط كل المحتوى</button>
      <p class="field__hint mt-8">سيتم استبدال المقالات والتمارين والأندية والبطولات بالنسخة الأصلية. المفضلة والإعدادات تبقى كما هي.</p>
    </div>`;
}

/* --------------------------------------------------------------------------
   نماذج الإضافة والتعديل
   -------------------------------------------------------------------------- */
function artOptions(selected) {
  return Object.entries(ART).map(([key, art]) => `<option value="${key}" ${selected === key ? "selected" : ""}>${art.label}</option>`).join("");
}

function openAdminForm(type, id = "") {
  if (type === "article") openArticleAdminForm(id);
  if (type === "drill") openDrillAdminForm(id);
  if (type === "team") openTeamAdminForm(id);
  if (type === "competition") openCompetitionAdminForm(id);
}

function openArticleAdminForm(id) {
  const article = id ? getArticleById(id) : null;
  const body = article ? (article.body || []).map((block) => block.text).join("\n\n") : "";
  openModal(article ? "تعديل مقال" : "مقال جديد", `
    <form class="form" data-form="adminArticle" data-id="${esc(id || "")}">
      <div class="field"><span class="field__label">العنوان</span><input class="input" name="title" required value="${esc(article?.title || "")}" placeholder="عنوان المقال" /></div>
      <div class="field-row">
        <div class="field"><span class="field__label">التصنيف</span><input class="input" name="category" required value="${esc(article?.category || "تحليل تكتيكي")}" /></div>
        <div class="field"><span class="field__label">فن الغلاف</span><select class="select" name="art">${artOptions(article?.art || "tactics")}</select></div>
      </div>
      <div class="field"><span class="field__label">ملخص قصير</span><textarea class="textarea" name="excerpt" rows="2" placeholder="جملة أو جملتان...">${esc(article?.excerpt || "")}</textarea></div>
      <div class="field"><span class="field__label">نص المقال</span><textarea class="textarea" name="body" rows="7" placeholder="فقرة لكل سطر. ابدأ العنوان الفرعي بـ ## ">${esc(body)}</textarea><span class="field__hint">اكتب فقرة في كل سطر. أضف عنواناً فرعياً بكتابة ## قبل النص، واقتباساً بكتابة &gt; قبل النص.</span></div>
      <div class="field-row">
        <div class="field"><span class="field__label">صورة اختيارية</span><input class="input" name="image" dir="ltr" value="${esc(article?.image || "")}" placeholder="assets/images/..." /></div>
        <div class="field"><span class="field__label">مقال مميز</span><select class="select" name="featured"><option value="no" ${article?.featured ? "" : "selected"}>لا</option><option value="yes" ${article?.featured ? "selected" : ""}>نعم</option></select></div>
      </div>
      <div class="form-actions"><button class="btn btn--primary" type="submit">${icon("check")} حفظ المقال</button><button class="btn btn--dark" type="button" data-close-modal>إلغاء</button></div>
    </form>`);
}

function openDrillAdminForm(id) {
  const drill = id ? getDrillById(id) : null;
  openModal(drill ? "تعديل تمرين" : "تمرين جديد", `
    <form class="form" data-form="adminDrill" data-id="${esc(id || "")}">
      <div class="field"><span class="field__label">عنوان التمرين</span><input class="input" name="title" required value="${esc(drill?.title || "")}" /></div>
      <div class="field-row">
        <div class="field"><span class="field__label">الفئة</span><input class="input" name="category" required value="${esc(drill?.category || "تحكم")}" /></div>
        <div class="field"><span class="field__label">المستوى</span><select class="select" name="level"><option ${drill?.level === "مبتدئ" ? "selected" : ""}>مبتدئ</option><option ${drill?.level === "متوسط" ? "selected" : ""}>متوسط</option><option ${drill?.level === "متقدم" ? "selected" : ""}>متقدم</option></select></div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field__label">المدة (دقائق)</span><input class="input" name="duration" type="number" min="1" max="120" value="${esc(drill?.duration || 12)}" /></div>
        <div class="field"><span class="field__label">فن الغلاف</span><select class="select" name="art">${artOptions(drill?.art || "control")}</select></div>
      </div>
      <div class="field"><span class="field__label">المعدات</span><input class="input" name="equipment" value="${esc(drill?.equipment || "كرة")}" /></div>
      <div class="field"><span class="field__label">الهدف</span><textarea class="textarea" name="goal" rows="2">${esc(drill?.goal || "")}</textarea></div>
      <div class="field"><span class="field__label">الوصف</span><textarea class="textarea" name="desc" rows="2">${esc(drill?.desc || "")}</textarea></div>
      <div class="field"><span class="field__label">الخطوات</span><textarea class="textarea" name="steps" rows="5" placeholder="خطوة في كل سطر">${esc((drill?.steps || []).join("\n"))}</textarea></div>
      <div class="field"><span class="field__label">النصائح</span><textarea class="textarea" name="tips" rows="3" placeholder="نصيحة في كل سطر">${esc((drill?.tips || []).join("\n"))}</textarea></div>
      <div class="form-actions"><button class="btn btn--primary" type="submit">${icon("check")} حفظ التمرين</button><button class="btn btn--dark" type="button" data-close-modal>إلغاء</button></div>
    </form>`);
}

function openTeamAdminForm(id) {
  const team = id ? getTeamById(id) : null;
  const colors = Array.isArray(team?.colors) ? team.colors : ["#ff6a00", "#d92700"];
  return openModal(team ? "تعديل نادٍ" : "نادٍ جديد", `
    <form class="form" data-form="adminTeam" data-id="${esc(id || "")}">
      <div class="field"><span class="field__label">اسم النادي</span><input class="input" name="name" required value="${esc(team?.name || "")}" /></div>
      <div class="field-row">
        <div class="field"><span class="field__label">الاختصار</span><input class="input" name="short" required maxlength="6" value="${esc(team?.short || "")}" /></div>
        <div class="field"><span class="field__label">سنة التأسيس</span><input class="input" name="founded" type="number" min="1800" max="2100" value="${esc(team?.founded || 1950)}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field__label">المدينة</span><input class="input" name="city" required value="${esc(team?.city || "")}" /></div>
        <div class="field"><span class="field__label">الدولة</span><input class="input" name="country" required value="${esc(team?.country || "")}" /></div>
      </div>
      <div class="field"><span class="field__label">الملعب</span><input class="input" name="stadium" value="${esc(team?.stadium || "")}" /></div>
      <div class="field"><span class="field__label">البطولة</span><select class="select" name="leagueId">${state.data.competitions.map((comp) => `<option value="${esc(comp.id)}" ${team?.leagueId === comp.id ? "selected" : ""}>${esc(comp.name)}</option>`).join("")}</select></div>
      <div class="field-row">
        <div class="field"><span class="field__label">اللون الأساسي</span><input class="input" name="color1" type="color" value="${esc(safeColor(colors[0]))}" style="padding:5px" /></div>
        <div class="field"><span class="field__label">اللون الثانوي</span><input class="input" name="color2" type="color" value="${esc(safeColor(colors[1], "#d92700"))}" style="padding:5px" /></div>
      </div>
      <div class="field"><span class="field__label">نبذة</span><textarea class="textarea" name="bio" rows="3">${esc(team?.bio || "")}</textarea></div>
      <div class="form-actions"><button class="btn btn--primary" type="submit">${icon("check")} حفظ النادي</button><button class="btn btn--dark" type="button" data-close-modal>إلغاء</button></div>
    </form>`);
}

function openCompetitionAdminForm(id) {
  const comp = id ? getCompetitionById(id) : null;
  return openModal(comp ? "تعديل بطولة" : "بطولة جديدة", `
    <form class="form" data-form="adminCompetition" data-id="${esc(id || "")}">
      <div class="field"><span class="field__label">اسم البطولة</span><input class="input" name="name" required value="${esc(comp?.name || "")}" /></div>
      <div class="field-row">
        <div class="field"><span class="field__label">الاختصار</span><input class="input" name="short" value="${esc(comp?.short || "")}" /></div>
        <div class="field"><span class="field__label">الدولة / المنطقة</span><input class="input" name="country" required value="${esc(comp?.country || "")}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field__label">النوع</span><input class="input" name="type" required value="${esc(comp?.type || "دوري محلي")}" /></div>
        <div class="field"><span class="field__label">عدد الفرق</span><input class="input" name="teams" type="number" min="2" max="100" value="${esc(comp?.teams || 20)}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field__label">الموسم</span><input class="input" name="season" type="number" min="2000" max="2100" value="${esc(comp?.season || state.settings.season)}" /></div>
        <div class="field"><span class="field__label">معرّف API</span><input class="input" name="apiId" type="number" min="1" value="${esc(comp?.apiId || "")}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field__label">الأيقونة</span><select class="select" name="icon"><option value="trophy" ${comp?.icon === "trophy" ? "selected" : ""}>كأس</option><option value="star" ${comp?.icon === "star" ? "selected" : ""}>نجمة</option><option value="shield" ${comp?.icon === "shield" ? "selected" : ""}>درع</option><option value="medal" ${comp?.icon === "medal" ? "selected" : ""}>ميدالية</option><option value="globe" ${comp?.icon === "globe" ? "selected" : ""}>كرة أرضية</option></select></div>
        <div class="field"><span class="field__label">لونا الهوية</span><div style="display:flex;gap:6px"><input class="input" name="color1" type="color" value="${esc(safeColor(comp?.colors?.[0]?.match?.(/#[0-9a-f]{6}/i)?.[0] || "#ff6a00"))}" style="padding:5px" /><input class="input" name="color2" type="color" value="${esc(safeColor(comp?.colors?.[1]?.match?.(/#[0-9a-f]{6}/i)?.[0] || "#d92700"))}" style="padding:5px" /></div></div>
      </div>
      <div class="field"><span class="field__label">وصف قصير</span><textarea class="textarea" name="desc" rows="3">${esc(comp?.desc || "")}</textarea></div>
      <div class="form-actions"><button class="btn btn--primary" type="submit">${icon("check")} حفظ البطولة</button><button class="btn btn--dark" type="button" data-close-modal>إلغاء</button></div>
    </form>`);
}
