/* ==========================================================================
   النواة: الحالة، التخزين، التوجيه، الهيكل العام، النوافذ والتنبيهات
   ========================================================================== */
"use strict";

/* --------------------------------------------------------------------------
   أدوات مساعدة
   -------------------------------------------------------------------------- */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeArabic(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeColor(value, fallback = "#ff6a00") {
  return /^#[0-9a-f]{3,8}$/i.test(String(value || "")) ? value : fallback;
}

function safeUrl(value) {
  try {
    const url = new URL(String(value), location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function uid(prefix = "id") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISO(iso, days) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isoToDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* --------------------------------------------------------------------------
   توقيت مكة المكرمة — مصدر واحد لكل المواعيد في التطبيق
   -------------------------------------------------------------------------- */
const MECCA_TIME_ZONE = "Asia/Riyadh";
const MECCA_LABEL = "بتوقيت مكة المكرمة";

function meccaDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value || "").trim();
  if (!text) return null;
  // تاريخ بلا وقت: نثبّته منتصف النهار UTC حتى لا يتغيّر اليوم عند التحويل لمكة.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMecca(value, options = {}) {
  const date = meccaDate(value);
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("ar-EG", { timeZone: MECCA_TIME_ZONE, ...options }).format(date);
  } catch {
    return "";
  }
}

function formatDateShort(iso) {
  return formatMecca(iso, { day: "numeric", month: "short" });
}

function formatDateLong(iso) {
  return formatMecca(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso) {
  return formatMecca(iso, { hour: "2-digit", minute: "2-digit" });
}

/* توقيت المباراة بشكل واضح: 4.30 م بتوقيت مكة */
function formatClock(iso) {
  const date = meccaDate(iso);
  if (!date) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: MECCA_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).formatToParts(date);
    const pick = (type) => parts.find((part) => part.type === type)?.value || "";
    const hour = pick("hour");
    const minute = pick("minute");
    const suffix = /^pm$/i.test(pick("dayPeriod")) ? "م" : "ص";
    if (!hour || !minute) return "";
    return `${hour}.${minute} ${suffix}`;
  } catch {
    return "";
  }
}

function meccaISODate(value) {
  const date = meccaDate(value);
  if (!date) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: MECCA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const pick = (type) => parts.find((part) => part.type === type)?.value || "";
    return `${pick("year")}-${pick("month")}-${pick("day")}`;
  } catch {
    return "";
  }
}

function meccaTodayISO() {
  return meccaISODate(new Date()) || getTodayISO();
}

function meccaClock(value) {
  return formatMecca(value, { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "";
  const diff = Math.max(0, Date.now() - time);
  const minute = 60000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "الآن";
  if (diff < hour) return `منذ ${Math.floor(diff / minute)} دقيقة`;
  if (diff < day) return `منذ ${Math.floor(diff / hour)} ساعة`;
  if (diff < 7 * day) return `منذ ${Math.floor(diff / day)} يوم`;
  return formatDateShort(new Date(iso).toISOString().slice(0, 10));
}

function dayLabel(iso, index) {
  if (index === 0) return "اليوم";
  if (index === 1) return "غداً";
  try {
    return new Intl.DateTimeFormat("ar-EG", { weekday: "short" }).format(isoToDate(iso));
  } catch {
    return formatDateShort(iso);
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "مساء النور";
  return "مساء الخير";
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* --------------------------------------------------------------------------
   المظهر — داكن / فاتح
   -------------------------------------------------------------------------- */
const THEME_KEY = "wasl.theme.v1";

function normalizeTheme(value) {
  return value === "light" ? "light" : "dark";
}

function currentTheme() {
  try {
    return normalizeTheme(document.documentElement.dataset.theme || localStorage.getItem(THEME_KEY));
  } catch {
    return "dark";
  }
}

function applyTheme(theme, options = {}) {
  const next = normalizeTheme(theme);
  const root = document.documentElement;
  root.dataset.theme = next;
  root.style.colorScheme = next;

  const link = document.getElementById("themeStyles");
  const href = next === "light" ? "styles-light.css" : "styles.css";
  if (link && !String(link.getAttribute("href") || "").includes(href)) {
    link.setAttribute("href", href);
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "light" ? "#F7F1EA" : "#120A06");
  const scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.setAttribute("content", next === "light" ? "light" : "dark");

  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* ignore */
  }

  document.querySelectorAll("[data-action='setTheme']").forEach((button) => {
    const active = button.dataset.theme === next;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  document.querySelectorAll("[data-theme-icon]").forEach((slot) => {
    slot.innerHTML = icon(next === "light" ? "moon" : "sun");
  });

  if (options.silent !== true && typeof showToast === "function") {
    showToast(next === "light" ? "تم تفعيل الوضع الفاتح" : "تم تفعيل الوضع الداكن");
  }
  return next;
}

function toggleTheme() {
  return applyTheme(currentTheme() === "light" ? "dark" : "light");
}

function themeToggleButton() {
  const theme = currentTheme();
  const label = theme === "light" ? "الوضع الداكن" : "الوضع الفاتح";
  return `<button class="icon-btn theme-btn" data-action="toggleTheme" aria-label="${label}" title="${label}"><span data-theme-icon>${icon(theme === "light" ? "moon" : "sun")}</span></button>`;
}

function themeSegHtml() {
  const theme = currentTheme();
  return `<div class="theme-seg" role="group" aria-label="مظهر التطبيق">
    <button class="theme-seg__btn ${theme === "dark" ? "is-active" : ""}" data-action="setTheme" data-theme="dark" aria-pressed="${theme === "dark" ? "true" : "false"}">${icon("moon")}<span>داكن</span></button>
    <button class="theme-seg__btn ${theme === "light" ? "is-active" : ""}" data-action="setTheme" data-theme="light" aria-pressed="${theme === "light" ? "true" : "false"}">${icon("sun")}<span>فاتح</span></button>
  </div>`;
}

function icon(name, className = "") {
  const path = ICONS[name] || ICONS.info;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function heartIcon(filled) {
  return `<svg viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS.heart}</svg>`;
}

function artStyle(key) {
  const art = ART[key] || ART.tactics;
  return `--art-1:${art.color}`;
}

/* صور توضيحية للأكاديمية — SVG محلية تعمل دون اتصال */
const ACADEMY_ART_IMAGES = {
  dribble: "assets/images/academy/dribbling.svg",
  speed: "assets/images/academy/agility.svg",
  fitness: "assets/images/academy/agility.svg",
  shooting: "assets/images/academy/shooting.svg",
  passing: "assets/images/academy/passing.svg",
  control: "assets/images/academy/control.svg",
  skills: "assets/images/academy/control.svg",
  goalkeeping: "assets/images/academy/control.svg",
  tactics: "assets/images/academy/team.svg",
  training: "assets/images/academy/warmup.svg",
  team: "assets/images/academy/team.svg",
  warmup: "assets/images/academy/warmup.svg"
};

function academyImage(key) {
  return ACADEMY_ART_IMAGES[key] || ACADEMY_ART_IMAGES.control;
}

function teamStyle(team) {
  const colors = Array.isArray(team?.colors) ? team.colors : ["#ff6a00", "#d92700"];
  return `--t1:${safeColor(colors[0])};--t2:${safeColor(colors[1], "#d92700")}`;
}

function compStyle(comp) {
  const colors = Array.isArray(comp?.colors) ? comp.colors : ["rgba(255,140,0,.3)", "linear-gradient(145deg,#ff8c00,#d92700)"];
  return `--c1:${colors[0] || "rgba(255,140,0,.3)"};--c2:${colors[1] || "linear-gradient(145deg,#ff8c00,#d92700)"}`;
}

function getTeamById(id) {
  const team = state.data.teams.find((item) => item.id === id);
  if (team) return team;
  const national = nationalTeams.find((item) => item.id === id);
  if (!national) return null;
  return {
    ...national,
    type: "national",
    short: national.name.slice(0, 2),
    city: "",
    country: "منتخب وطني",
    stadium: "",
    colors: ["#0d9488", "#0f766e"],
    bio: `منتخب ${national.name} الوطني — ${national.confederation}.`
  };
}
function getNationalTeams(arabOnly = false) {
  return nationalTeams.filter((team) => !arabOnly || team.arab);
}
function getCompetitionById(id) {
  return state.data.competitions.find((comp) => comp.id === id);
}
function getArticleById(id) {
  return state.data.articles.find((article) => article.id === id);
}
function getDrillById(id) {
  return state.data.drills.find((drill) => drill.id === id);
}
function getLeagueName(id) {
  return getCompetitionById(id)?.name || "بطولة";
}

function teamNameAr(name) {
  const raw = String(name || "").trim();
  if (!raw) return "فريق";
  if (TEAM_NAME_AR[raw]) return TEAM_NAME_AR[raw];
  return raw
    .replace(/\b(FC|AFC|CF|SC|AC|AS|SS|SSC|BC|CFC|UD|RCD|RC|SV|VfB|TSG|OSC|SCO|AJ|ES|OGC|US|ACF|Calcio|Club)\b/g, "")
    .replace(/\s+/g, " ")
    .trim() || raw;
}

/* ==========================================================================
   تعريب الأسماء — أندية وبطولات ولاعبون
   الهدف: كل ما يعرضه التطبيق بالعربية، مع الاعتماد على النقل الصوتي القياسي
   للأسماء الأجنبية غير المدرجة في القواميس.
   ========================================================================== */

const AR_COUNTRY_NAMES = {
  "afghanistan": "أفغانستان", "albania": "ألبانيا", "algeria": "الجزائر", "andorra": "أندورا",
  "angola": "أنغولا", "argentina": "الأرجنتين", "armenia": "أرمينيا", "australia": "أستراليا",
  "austria": "النمسا", "azerbaijan": "أذربيجان", "bahrain": "البحرين", "bangladesh": "بنغلاديش",
  "belarus": "بيلاروسيا", "belgium": "بلجيكا", "belize": "بليز", "benin": "بنين",
  "bermuda": "برمودا", "bhutan": "بوتان", "bolivia": "بوليفيا", "bosnia and herzegovina": "البوسنة والهرسك",
  "botswana": "بوتسوانا", "brazil": "البرازيل", "brunei": "بروناي", "bulgaria": "بلغاريا",
  "burkina faso": "بوركينا فاسو", "burundi": "بوروندي", "cambodia": "كمبوديا", "cameroon": "الكاميرون",
  "canada": "كندا", "cape verde": "الرأس الأخضر", "central african republic": "أفريقيا الوسطى",
  "chad": "تشاد", "chile": "تشيلي", "china": "الصين", "colombia": "كولومبيا", "comoros": "جزر القمر",
  "congo": "الكونغو", "costa rica": "كوستاريكا", "croatia": "كرواتيا", "cuba": "كوبا",
  "curacao": "كوراساو", "cyprus": "قبرص", "czech republic": "التشيك", "czechia": "التشيك",
  "denmark": "الدنمارك", "djibouti": "جيبوتي", "dominican republic": "الدومينيكان",
  "dr congo": "الكونغو الديمقراطية", "ecuador": "الإكوادور", "egypt": "مصر", "el salvador": "السلفادور",
  "england": "إنجلترا", "equatorial guinea": "غينيا الاستوائية", "eritrea": "إريتريا",
  "estonia": "إستونيا", "eswatini": "إسواتيني", "ethiopia": "إثيوبيا", "faroe islands": "جزر فارو",
  "fiji": "فيجي", "finland": "فنلندا", "france": "فرنسا", "gabon": "الغابون", "gambia": "غامبيا",
  "georgia": "جورجيا", "germany": "ألمانيا", "ghana": "غانا", "gibraltar": "جبل طارق",
  "greece": "اليونان", "grenada": "غرينادا", "guam": "غوام", "guatemala": "غواتيمالا",
  "guinea": "غينيا", "guinea-bissau": "غينيا بيساو", "guyana": "غيانا", "haiti": "هايتي",
  "honduras": "هندوراس", "hong kong": "هونغ كونغ", "hungary": "هنغاريا", "iceland": "آيسلندا",
  "india": "الهند", "indonesia": "إندونيسيا", "iran": "إيران", "iraq": "العراق", "ireland": "أيرلندا",
  "israel": "إسرائيل", "italy": "إيطاليا", "ivory coast": "ساحل العاج", "cote d ivoire": "ساحل العاج",
  "jamaica": "جامايكا", "japan": "اليابان", "jordan": "الأردن", "kazakhstan": "كازاخستان",
  "kenya": "كينيا", "kosovo": "كوسوفو", "kuwait": "الكويت", "kyrgyzstan": "قيرغيزستان",
  "laos": "لاوس", "latvia": "لاتفيا", "lebanon": "لبنان", "lesotho": "ليسوتو", "liberia": "ليبيريا",
  "libya": "ليبيا", "lithuania": "ليتوانيا", "luxembourg": "لوكسمبورغ", "macau": "ماكاو",
  "madagascar": "مدغشقر", "malawi": "مالاوي", "malaysia": "ماليزيا", "maldives": "المالديف",
  "mali": "مالي", "malta": "مالطا", "mauritania": "موريتانيا", "mauritius": "موريشيوس",
  "mexico": "المكسيك", "moldova": "مولدوفا", "mongolia": "منغوليا", "montenegro": "الجبل الأسود",
  "montserrat": "مونتسرات", "morocco": "المغرب", "mozambique": "موزمبيق", "myanmar": "ميانمار",
  "namibia": "ناميبيا", "nepal": "نيبال", "netherlands": "هولندا", "new caledonia": "كاليدونيا الجديدة",
  "new zealand": "نيوزيلندا", "nicaragua": "نيكاراغوا", "niger": "النيجر", "nigeria": "نيجيريا",
  "north korea": "كوريا الشمالية", "north macedonia": "مقدونيا الشمالية", "northern ireland": "أيرلندا الشمالية",
  "norway": "النرويج", "oman": "عُمان", "pakistan": "باكستان", "palestine": "فلسطين",
  "panama": "بنما", "papua new guinea": "بابوا غينيا الجديدة", "paraguay": "باراغواي",
  "peru": "بيرو", "philippines": "الفلبين", "poland": "بولندا", "portugal": "البرتغال",
  "puerto rico": "بورتوريكو", "qatar": "قطر", "republic of ireland": "أيرلندا", "romania": "رومانيا",
  "russia": "روسيا", "rwanda": "رواندا", "samoa": "ساموا", "san marino": "سان مارينو",
  "saudi arabia": "السعودية", "scotland": "اسكتلندا", "senegal": "السنغال", "serbia": "صربيا",
  "seychelles": "سيشل", "sierra leone": "سيراليون", "singapore": "سنغافورة", "slovakia": "سلوفاكيا",
  "slovenia": "سلوفينيا", "solomon islands": "جزر سليمان", "somalia": "الصومال", "south africa": "جنوب أفريقيا",
  "south korea": "كوريا الجنوبية", "south sudan": "جنوب السودان", "spain": "إسبانيا",
  "sri lanka": "سريلانكا", "sudan": "السودان", "suriname": "سورينام", "sweden": "السويد",
  "switzerland": "سويسرا", "syria": "سوريا", "tahiti": "تاهيتي", "taiwan": "تايبيه الصينية",
  "tajikistan": "طاجيكستان", "tanzania": "تنزانيا", "thailand": "تايلاند", "timor-leste": "تيمور الشرقية",
  "togo": "توغو", "tonga": "تونغا", "trinidad and tobago": "ترينيداد وتوباغو", "tunisia": "تونس",
  "turkey": "تركيا", "turkmenistan": "تركمانستان", "uganda": "أوغندا", "ukraine": "أوكرانيا",
  "united arab emirates": "الإمارات", "united states": "الولايات المتحدة", "uruguay": "أوروغواي",
  "usa": "الولايات المتحدة", "uzbekistan": "أوزبكستان", "vanuatu": "فانواتو", "venezuela": "فنزويلا",
  "vietnam": "فيتنام", "wales": "ويلز", "yemen": "اليمن", "zambia": "زامبيا", "zimbabwe": "زيمبابوي",
  "korea republic": "كوريا الجنوبية", "ir iran": "إيران", "chinese taipei": "تايبيه الصينية",
  "cabo verde": "الرأس الأخضر", "congo dr": "الكونغو الديمقراطية"
};

const AR_COUNTRY_CODES = {
  INT: "دولي", ENG: "إنجلترا", ESP: "إسبانيا", ITA: "إيطاليا", GER: "ألمانيا", FRA: "فرنسا",
  KSA: "السعودية", YEM: "اليمن", EGY: "مصر", MAR: "المغرب", ALG: "الجزائر", TUN: "تونس",
  UAE: "الإمارات", QAT: "قطر", KUW: "الكويت", IRQ: "العراق", JOR: "الأردن", SYR: "سوريا",
  LBN: "لبنان", PLE: "فلسطين", OMA: "عُمان", BHR: "البحرين", SUD: "السودان", LBY: "ليبيا",
  MTN: "موريتانيا", SOM: "الصومال", DJI: "جيبوتي", COM: "جزر القمر", ARG: "الأرجنتين",
  BRA: "البرازيل", URU: "أوروغواي", COL: "كولومبيا", CHI: "تشيلي", PER: "بيرو",
  ECU: "الإكوادور", PAR: "باراغواي", BOL: "بوليفيا", VEN: "فنزويلا", MEX: "المكسيك",
  USA: "الولايات المتحدة", CAN: "كندا", CRC: "كوستاريكا", HON: "هندوراس", GUA: "غواتيمالا",
  SLV: "السلفادور", PAN: "بنما", JAM: "جامايكا", TRI: "ترينيداد وتوباغو", JPN: "اليابان",
  KOR: "كوريا الجنوبية", CHN: "الصين", AUS: "أستراليا", IRN: "إيران", UZB: "أوزبكستان",
  THA: "تايلاند", VIE: "فيتنام", IDN: "إندونيسيا", MAS: "ماليزيا", SIN: "سنغافورة",
  IND: "الهند", PAK: "باكستان", BAN: "بنغلاديش", SRI: "سريلانكا", NEP: "نيبال",
  TUR: "تركيا", GRE: "اليونان", POR: "البرتغال", NED: "هولندا", BEL: "بلجيكا",
  SUI: "سويسرا", AUT: "النمسا", DEN: "الدنمارك", SWE: "السويد", NOR: "النرويج",
  FIN: "فنلندا", ISL: "آيسلندا", IRL: "أيرلندا", SCO: "اسكتلندا", WAL: "ويلز",
  NIR: "أيرلندا الشمالية", POL: "بولندا", CZE: "التشيك", SVK: "سلوفاكيا", HUN: "هنغاريا",
  ROU: "رومانيا", BUL: "بلغاريا", SRB: "صربيا", CRO: "كرواتيا", SVN: "سلوفينيا",
  BIH: "البوسنة والهرسك", MNE: "الجبل الأسود", MKD: "مقدونيا الشمالية", ALB: "ألبانيا",
  KOS: "كوسوفو", RUS: "روسيا", UKR: "أوكرانيا", BLR: "بيلاروسيا", GEO: "جورجيا",
  ARM: "أرمينيا", AZE: "أذربيجان", KAZ: "كازاخستان", ISR: "إسرائيل", CYP: "قبرص",
  MLT: "مالطا", LUX: "لوكسمبورغ", EST: "إستونيا", LVA: "لاتفيا", LTU: "ليتوانيا",
  AND: "أندورا", SMR: "سان مارينو", GIB: "جبل طارق", FRO: "جزر فارو", MDA: "مولدوفا",
  NZL: "نيوزيلندا", RSA: "جنوب أفريقيا", NGA: "نيجيريا", GHA: "غانا", SEN: "السنغال",
  CMR: "الكاميرون", CIV: "ساحل العاج", MLI: "مالي", GUI: "غينيا", COD: "الكونغو الديمقراطية",
  ANG: "أنغولا", ZAM: "زامبيا", ZIM: "زيمبابوي", KEN: "كينيا", UGA: "أوغندا",
  TAN: "تنزانيا", ETH: "إثيوبيا", CPV: "الرأس الأخضر", GAB: "الغابون", BEN: "بنين",
  TOG: "توغو", NIG: "النيجر", BFA: "بوركينا فاسو", GNB: "غينيا بيساو", SLE: "سيراليون",
  LBR: "ليبيريا", GAM: "غامبيا", CUW: "كوراساو", HAI: "هايتي", SUR: "سورينام",
  GUY: "غيانا", BLZ: "بليز", BER: "برمودا", NCL: "كاليدونيا الجديدة", VAN: "فانواتو",
  FIJ: "فيجي", SOL: "جزر سليمان", PNG: "بابوا غينيا الجديدة", TAH: "تاهيتي",
  MSR: "مونتسرات", SKN: "سانت كيتس ونيفيس", ATG: "أنتيغوا وبربودا", LCA: "سانت لوسيا",
  VIN: "سانت فينسنت والغرينادين", GRN: "غرينادا", BRB: "بربادوس", DMA: "دومينيكا",
  SEY: "سيشل", MRI: "موريشيوس", SWZ: "إسواتيني", LES: "ليسوتو", BOT: "بوتسوانا",
  NAM: "ناميبيا", MWI: "مالاوي", MOZ: "موزمبيق", MAD: "مدغشقر", SSD: "جنوب السودان",
  ERI: "إريتريا", GNB2: "غينيا بيساو", STP: "ساو تومي وبرينسيبي", TGA: "تونغا",
  SAM: "ساموا", ASA: "ساموا الأمريكية", COK: "جزر كوك", VIR: "جزر العذراء الأمريكية",
  BRU: "بروناي", TLS: "تيمور الشرقية", MAC: "ماكاو", HKG: "هونغ كونغ", MYA: "ميانمار",
  CAM: "كمبوديا", LAO: "لاوس", MNG: "منغوليا", BHU: "بوتان", MDV: "المالديف",
  KGZ: "قيرغيزستان", TJK: "طاجيكستان", TKM: "تركمانستان", AFG: "أفغانستان",
  YEM2: "اليمن", SDN: "السودان"
};

const AR_CLUB_EXTRA = {
  "burnley": "بيرنلي", "wolverhampton wanderers": "وولفرهامبتون", "wolves": "وولفرهامبتون",
  "west ham united": "وست هام يونايتد", "west ham": "وست هام يونايتد", "brighton": "برايتون",
  "brighton and hove albion": "برايتون", "brighton hove albion": "برايتون",
  "newcastle": "نيوكاسل يونايتد", "tottenham": "توتنهام", "man city": "مانشستر سيتي",
  "man utd": "مانشستر يونايتد", "man united": "مانشستر يونايتد", "nottingham forest": "نوتنغهام فورست",
  "alaves": "ألافيس", "deportivo alaves": "ألافيس", "athletic bilbao": "أتلتيك بيلباو",
  "espanyol": "إسبانيول", "girona": "جيرونا", "mallorca": "مايوركا", "real oviedo": "ريال أوفييدو",
  "rayo vallecano": "رايو فايكانو", "real betis": "ريال بيتيس", "real sociedad": "ريال سوسيداد",
  "atletico madrid": "أتلتيكو مدريد", "celta vigo": "سيلتا فيغو", "real madrid": "ريال مدريد",
  "barcelona": "برشلونة", "sevilla": "إشبيلية", "valencia": "فالنسيا", "villarreal": "فياريال",
  "elche": "إلتشي", "getafe": "خيتافي", "levante": "ليفانتي", "osasuna": "أوساسونا",
  "hellas verona": "هيلاس فيرونا", "verona": "هيلاس فيرونا", "pisa": "بيزا",
  "cremonese": "كريمونيزي", "como": "كومو", "milan": "ميلان", "inter": "إنتر ميلان",
  "inter milan": "إنتر ميلان", "internazionale": "إنتر ميلان", "juventus": "يوفنتوس",
  "napoli": "نابولي", "roma": "روما", "lazio": "لاتسيو", "atalanta": "أتالانتا",
  "fiorentina": "فيورنتينا", "bologna": "بولونيا", "cagliari": "كالياري", "genoa": "جنوى",
  "lecce": "ليتشي", "parma": "بارما", "sassuolo": "ساسولو", "torino": "تورينو",
  "udinese": "أودينيزي", "wolfsburg": "فولفسبورغ", "heidenheim": "هايدنهايم",
  "st pauli": "سانت باولي", "saint pauli": "سانت باولي", "bayern munich": "بايرن ميونخ",
  "bayern munchen": "بايرن ميونخ", "dortmund": "بوروسيا دورتموند",
  "borussia dortmund": "بوروسيا دورتموند", "gladbach": "بوروسيا مونشنغلادباخ",
  "borussia monchengladbach": "بوروسيا مونشنغلادباخ", "leverkusen": "باير ليفركوزن",
  "bayer leverkusen": "باير ليفركوزن", "frankfurt": "آينتراخت فرانكفورت",
  "eintracht frankfurt": "آينتراخت فرانكفورت", "freiburg": "فرايبورغ", "hamburg": "هامبورغ",
  "hamburger sv": "هامبورغ", "hoffenheim": "هوفنهايم", "koln": "كولن", "cologne": "كولن",
  "leipzig": "لايبزيغ", "rb leipzig": "لايبزيغ", "stuttgart": "شتوتغارت",
  "union berlin": "يونيون برلين", "werder bremen": "فيردر بريمن", "augsburg": "أوغسبورغ",
  "mainz": "ماينز", "mainz 05": "ماينز", "nantes": "نانت", "metz": "ميتز",
  "paris fc": "باريس إف سي", "paris saint germain": "باريس سان جيرمان", "psg": "باريس سان جيرمان",
  "marseille": "مارسيليا", "lyon": "ليون", "monaco": "موناكو", "lille": "ليل",
  "lens": "لانس", "nice": "نيس", "rennes": "رين", "strasbourg": "ستراسبورغ",
  "toulouse": "تولوز", "brest": "بريست", "le havre": "لوهافر", "lorient": "لوريان",
  "angers": "أنجيه", "auxerre": "أوكسير",
  "al hilal": "الهلال", "al nassr": "النصر", "al ittihad": "الاتحاد", "al ahli": "الأهلي",
  "al shabab": "الشباب", "al ettifaq": "الاتفاق", "al taawoun": "التعاون", "al fateh": "الفتح",
  "al riyadh": "الرياض", "al khaleej": "الخليج", "al qadsiah": "القادسية", "al fayha": "الفيحاء",
  "al okhdood": "الأخدود", "al kholood": "الخلود", "al hazem": "الحزم", "damac": "ضمك",
  "al najma": "النجمة", "neom": "نيوم", "neom sc": "نيوم", "al orobah": "العروبة",
  "benfica": "بنفيكا", "porto": "بورتو", "sporting cp": "سبورتينغ لشبونة",
  "sporting lisbon": "سبورتينغ لشبونة", "ajax": "أياكس", "psv": "بي إس في",
  "feyenoord": "فينورد", "celtic": "سلتيك", "rangers": "رينجرز", "galatasaray": "غلطة سراي",
  "fenerbahce": "فنربخشة", "besiktas": "بشكتاش", "olympiacos": "أولمبياكوس",
  "panathinaikos": "باناثينايكوس", "aek athens": "أيك أثينا", "shakhtar donetsk": "شاختار دونيتسك",
  "dynamo kyiv": "دينامو كييف", "red star belgrade": "النجم الأحمر", "salzburg": "سالزبورغ",
  "club brugge": "كلوب بروج", "anderlecht": "أندرلخت", "copenhagen": "كوبنهاغن",
  "young boys": "يانغ بويز", "basel": "بازل", "zenit": "زينيت", "spartak moscow": "سبارتاك موسكو",
  "slavia prague": "سلافيا براغ", "viktoria plzen": "فيكتوريا بلزن", "ferencvaros": "فيرينتسفاروش",
  "legia warsaw": "ليجيا وارسو", "lech poznan": "لخ بوزنان", "rapid vienna": "رابيد فيينا",
  "sturm graz": "شتورم غراتس", "midtjylland": "ميتيولاند", "bodo glimt": "بودو غليمت",
  "malmo": "مالمو", "maccabi tel aviv": "مكابي تل أبيب", "al ain": "العين",
  "al wasl": "الوصل", "al sadd": "السد", "al duhail": "الدحيل", "zamalek": "الزمالك",
  "al ahly": "الأهلي", "esperance": "الترجي", "wydad": "الوداد", "raja": "الرجاء",
  "pyramids": "بيراميدز", "mamelodi sundowns": "صن داونز", "al merrikh": "المريخ",
  "boca juniors": "بوكا جونيورز", "river plate": "ريفر بليت", "flamengo": "فلامنغو",
  "palmeiras": "بالميراس", "corinthians": "كورينثيانز", "sao paulo": "ساو باولو",
  "santos": "سانتوس", "vasco da gama": "فاسكو دا غاما", "botafogo": "بوتافوغو",
  "fluminense": "فلومينينسي", "gremio": "غريميو", "internacional": "إنترناسيونال",
  "cruzeiro": "كروزيرو", "atletico mineiro": "أتلتيكو مينيرو", "club america": "أمريكا",
  "tigres": "تايغرز", "monterrey": "مونتيري", "cruz azul": "كروز أزول",
  "guadalajara": "غوادالاخارا", "pumas": "بوماس", "la galaxy": "لوس أنجلوس غالاكسي",
  "inter miami": "إنتر ميامي", "al arabi": "العربي", "al wakrah": "الوكرة",
  "al gharafa": "الغرافة", "al rayyan": "الريان",
  "as far": "الجيش الملكي", "far rabat": "الجيش الملكي", "raja casablanca": "الرجاء",
  "wydad casablanca": "الوداد", "esperance tunis": "الترجي", "tp mazembe": "مازيمبي",
  "simba sc": "سيمبا", "simba queens": "سيمبا", "al ahly sc": "الأهلي",
  "zamalek sc": "الزمالك", "cr belouizdad": "شباب بلوزداد", "js kabylie": "شبيبة القبائل",
  "cs sfaxien": "النادي الصفاقسي", "etoile du sahel": "النجم الساحلي",
  "club africain": "النادي الأفريقي", "al masry": "المصري", "ismaily": "الإسماعيلي"
};

const AR_LEAGUE_NAMES = {
  "premier league": "الدوري الممتاز", "english premier league": "الدوري الإنجليزي الممتاز",
  "epl": "الدوري الإنجليزي الممتاز", "laliga": "الدوري الإسباني", "la liga": "الدوري الإسباني",
  "serie a": "الدوري الإيطالي", "bundesliga": "الدوري الألماني", "ligue 1": "الدوري الفرنسي",
  "eredivisie": "الدوري الهولندي", "primeira liga": "الدوري البرتغالي", "super lig": "الدوري التركي",
  "saudi pro league": "دوري روشن السعودي", "roshn saudi league": "دوري روشن السعودي",
  "champions league": "دوري أبطال أوروبا", "uefa champions league": "دوري أبطال أوروبا",
  "europa league": "الدوري الأوروبي", "uefa europa league": "الدوري الأوروبي",
  "conference league": "دوري المؤتمر الأوروبي", "uefa conference league": "دوري المؤتمر الأوروبي",
  "fa cup": "كأس الاتحاد الإنجليزي", "efl cup": "كأس الرابطة الإنجليزية",
  "carabao cup": "كأس الرابطة الإنجليزية", "copa del rey": "كأس ملك إسبانيا",
  "coppa italia": "كأس إيطاليا", "dfb pokal": "كأس ألمانيا", "coupe de france": "كأس فرنسا",
  "coupe de la ligue": "كأس الرابطة الفرنسية", "king cup": "كأس الملك",
  "copa libertadores": "كأس ليبرتادوريس", "copa sudamericana": "كأس سود أمريكانا",
  "club world cup": "كأس العالم للأندية", "world cup": "كأس العالم",
  "european championship": "كأس أمم أوروبا", "africa cup of nations": "كأس الأمم الأفريقية",
  "afcon": "كأس الأمم الأفريقية", "asian cup": "كأس آسيا", "gulf cup": "كأس الخليج",
  "arab cup": "كأس العرب", "arab club champions cup": "كأس العرب للأندية",
  "friendlies": "مباريات ودية", "club friendlies": "وديات الأندية",
  "womens champions league": "دوري أبطال أوروبا للسيدات",
  "liga mx": "الدوري المكسيكي", "liga mx femenil": "الدوري المكسيكي للسيدات",
  "brasileirao": "الدوري البرازيلي", "brasileirao serie a": "الدوري البرازيلي",
  "brasileirao serie b": "الدوري البرازيلي الدرجة الثانية",
  "primera division": "الدوري الأول", "segunda division": "الدوري الثاني",
  "ligue 2": "الدوري الفرنسي الدرجة الثانية", "2 bundesliga": "الدوري الألماني الدرجة الثانية",
  "championship": "دوري البطولة الإنجليزية", "league one": "الدوري الإنجليزي الدرجة الأولى",
  "league two": "الدوري الإنجليزي الدرجة الثانية", "serie b": "الدوري الإيطالي الدرجة الثانية",
  "liga portugal": "الدوري البرتغالي", "j1 league": "الدوري الياباني",
  "k league 1": "الدوري الكوري", "a-league": "الدوري الأسترالي", "mls": "الدوري الأمريكي",
  "liga profesional": "الدوري الأرجنتيني", "primera a": "الدوري الأول أ",
  "copa america": "كوبا أمريكا", "euro": "كأس أمم أوروبا",
  "nations league": "دوري الأمم", "uefa nations league": "دوري الأمم الأوروبية",
  "super cup": "كأس السوبر", "community shield": "درع المجتمع",
  "dfb supercup": "كأس السوبر الألماني", "trophee des champions": "كأس السوبر الفرنسي",
  "supercopa": "كأس السوبر", "supercopa de espana": "كأس السوبر الإسباني",
  "supercoppa italiana": "كأس السوبر الإيطالي", "egyptian premier league": "الدوري المصري",
  "egypt cup": "كأس مصر", "botola": "الدوري المغربي", "botola pro": "الدوري المغربي",
  "ligue 1 algerie": "الدوري الجزائري", "ligue 1 tunisie": "الدوري التونسي",
  "uae pro league": "دوري أدنوك الإماراتي", "qatar stars league": "دوري نجوم قطر",
  "kuwait premier league": "الدوري الكويتي", "iraq stars league": "دوري نجوم العراق",
  "afc champions league elite": "دوري أبطال آسيا للنخبة",
  "afc champions league": "دوري أبطال آسيا", "caf champions league": "دوري أبطال أفريقيا",
  "caf confederation cup": "كأس الكونفدرالية الأفريقية",
  "caf womens champions league": "دوري أبطال أفريقيا للسيدات",
  "caf womens confederation cup": "كأس الكونفدرالية الأفريقية للسيدات",
  "uefa womens champions league": "دوري أبطال أوروبا للسيدات",
  "uefa womens euro": "كأس أمم أوروبا للسيدات",
  "fifa womens world cup": "كأس العالم للسيدات",
  "fifa club world cup": "كأس العالم للأندية",
  "efl trophy": "كأس دوري كرة القدم الإنجليزية",
  "english football league trophy": "كأس دوري كرة القدم الإنجليزية",
  "liga mx femenil apertura playoff": "ملحق افتتاح الدوري المكسيكي للسيدات",
  "liga mx femenil clausura playoff": "ملحق إغلاق الدوري المكسيكي للسيدات",
  "liga mx apertura playoff": "ملحق افتتاح الدوري المكسيكي",
  "liga mx clausura playoff": "ملحق إغلاق الدوري المكسيكي",
  "concacaf champions cup": "كأس أبطال الكونكاكاف",
  "concacaf gold cup": "الكأس الذهبية للكونكاكاف",
  "concacaf nations league": "دوري أمم الكونكاكاف",
  "ofc champions league": "دوري أبطال أوقيانوسيا",
  "afc asian cup": "كأس آسيا",
  "afc womens asian cup": "كأس آسيا للسيدات",
  "copa libertadores femenina": "كأس ليبرتادوريس للسيدات",
  "league cup": "كأس الرابطة", "womens league cup": "كأس الرابطة الإنجليزية للسيدات",
  "northern premier division": "الدوري الممتاز الشمالي",
  "southern premier division south": "الدوري الممتاز الجنوبي",
  "premiere ligue": "الدوري الفرنسي للسيدات",
  "primera division apertura": "الدوري الأول — الافتتاح",
  "primera division clausura": "الدوري الأول — الإغلاق",
  "segunda federacion": "الدرجة الثانية الاتحادية",
  "swpl 1": "الدوري الاسكتلندي للسيدات",
  "uefa womens europa cup": "كأس أوروبا للسيدات",
  "saff championship": "بطولة اتحاد جنوب آسيا",
  "primera b": "الدوري الأول ب"
};

const AR_LEAGUE_WORDS = {
  league: "دوري", leagues: "دوري", cup: "كأس", cups: "كأس", super: "السوبر",
  champions: "أبطال", championship: "بطولة", championships: "بطولات", trophy: "كأس",
  shield: "درع", womens: "السيدات", women: "السيدات", femenil: "السيدات",
  feminine: "السيدات", youth: "الشباب", juniors: "الناشئين", junior: "الناشئين",
  reserves: "الاحتياط", reserve: "الاحتياط", qualification: "التصفيات",
  qualifying: "التصفيات", qualifiers: "التصفيات", playoff: "الملحق", playoffs: "الملحق",
  final: "النهائي", finals: "النهائيات", semifinal: "نصف النهائي", semifinals: "نصف النهائي",
  quarterfinal: "ربع النهائي", quarterfinals: "ربع النهائي", group: "مجموعة",
  groups: "مجموعات", grp: "مجموعة", friendly: "ودية", friendlies: "ودية",
  international: "الدولي", world: "العالم", club: "الأندية", clubs: "الأندية",
  association: "الاتحاد", federation: "الاتحاد", confederation: "الكونفدرالية",
  national: "الوطني", regional: "الإقليمي", state: "الولاية", premier: "الممتاز",
  elite: "النخبة", professional: "المحترفين", pro: "المحترفين", first: "الأول",
  second: "الثاني", third: "الثالث", division: "الدرجة", div: "الدرجة",
  liga: "دوري", ligue: "دوري", serie: "دوري", seria: "دوري",
  primera: "الدرجة الأولى", segunda: "الدرجة الثانية", tercera: "الدرجة الثالثة",
  apertura: "الافتتاح", clausura: "الإغلاق", north: "الشمال", south: "الجنوب",
  east: "الشرق", west: "الغرب", northern: "الشمالية", southern: "الجنوبية",
  eastern: "الشرقية", western: "الغربية", central: "الوسطى", region: "المنطقة",
  zone: "منطقة", conference: "المؤتمر", europa: "الأوروبي", uefa: "الأوروبي",
  caf: "الأفريقي", afc: "الآسيوي", concacaf: "الكونكاكاف", conmebol: "الكونميبول",
  fifa: "الدولي", intercontinental: "القارية", copa: "كأس", coupe: "كأس",
  efl: "إي إف إل", fa: "الاتحاد الإنجليزي",
  pokal: "كأس", taça: "كأس", taca: "كأس", supercopa: "السوبر", supercup: "السوبر",
  "super-cup": "السوبر", "play-off": "الملحق", "play-offs": "الملحق",
  "semi-final": "نصف النهائي", "quarter-final": "ربع النهائي", "u19": "تحت 19",
  "u20": "تحت 20", "u21": "تحت 21", "u23": "تحت 23", "u17": "تحت 17"
};

const AR_NAME_PARTICLES = {
  al: "ال", el: "إل", de: "دي", van: "فان", von: "فون", der: "در", den: "دن",
  da: "دا", di: "دي", dos: "دوس", das: "داس", del: "ديل", della: "ديلا",
  la: "لا", le: "لو", du: "دو", bin: "بن", ben: "بن", ibn: "ابن", abu: "أبو",
  abd: "عبد", abdul: "عبد", abdel: "عبد", abdo: "عبده", mc: "ماك", mac: "ماك", st: "سانت", saint: "سانت", of: "", the: "",
  and: "و", y: "و", e: "و"
};

const AR_LATIN_FOLD = {
  "ø": "o", "ö": "o", "ü": "u", "ä": "a", "å": "a", "æ": "ae", "œ": "oe", "ß": "ss",
  "é": "e", "è": "e", "ê": "e", "ë": "e", "á": "a", "à": "a", "â": "a", "ã": "a",
  "í": "i", "ì": "i", "î": "i", "ï": "i", "ó": "o", "ò": "o", "ô": "o", "õ": "o",
  "ú": "u", "ù": "u", "û": "u", "ç": "c", "ñ": "n", "ý": "y", "ÿ": "y", "ğ": "g",
  "ş": "s", "ı": "i", "ł": "l", "đ": "d", "ž": "z", "š": "s", "č": "c", "ć": "c",
  "ń": "n", "ř": "r", "ě": "e", "ů": "u", "ą": "a", "ę": "e", "ź": "z", "ż": "z",
  "þ": "th", "ð": "d", "ĳ": "ij", "ĺ": "l", "ľ": "l", "ŕ": "r", "ť": "t", "ď": "d"
};

const AR_PLAYER_NAMES = {
  "david raya": "دافيد رايا", "kepa arrizabalaga": "كيبا أريزابالاغا", "william saliba": "ويليام ساليبا",
  "gabriel magalhaes": "غابرييل ماغاليايس", "jurrien timber": "يورين تيمبر", "ben white": "بن وايت",
  "riccardo calafiori": "ريكاردو كالافيوري", "cristhian mosquera": "كريستيان موسكيرا",
  "piero hincapie": "بييرو هينكابي", "declan rice": "ديكلان رايس", "martin odegaard": "مارتن أوديغارد",
  "mikel merino": "ميكل ميرينو", "martin zubimendi": "مارتن زوبيميندي", "eberechi eze": "إيبيريتشي إيزي",
  "ethan nwaneri": "إيثان نوانيري", "bukayo saka": "بوكايو ساكا", "gabriel martinelli": "غابرييل مارتينيلي",
  "leandro trossard": "لياندرو تروسار", "viktor gyokeres": "فيكتور غوكيريس", "kai havertz": "كاي هافيرتز",
  "noni madueke": "نوني مادويكي", "mikel arteta": "ميكل أرتيتا",
  "alisson becker": "أليسون بيكر", "giorgi mamardashvili": "غيورغي مامارداشفيلي",
  "virgil van dijk": "فيرجيل فان دايك", "ibrahima konate": "إبراهيما كوناتي",
  "andrew robertson": "أندرو روبرتسون", "conor bradley": "كونور برادلي", "milos kerkez": "ميلوش كيركيز",
  "jeremie frimpong": "جيريمي فريمبونغ", "joe gomez": "جو غوميز",
  "alexis mac allister": "أليكسيس ماك أليستر", "ryan gravenberch": "ريان غرافينبيرخ",
  "dominik szoboszlai": "دومينيك سوبوسلاي", "curtis jones": "كورتيس جونز",
  "florian wirtz": "فلوريان فيرتز", "mohamed salah": "محمد صلاح", "cody gakpo": "كودي خاكبو",
  "hugo ekitike": "هوغو إيكيتيكي", "alexander isak": "ألكسندر إيزاك",
  "federico chiesa": "فيديريكو كييزا", "harvey elliott": "هارفي إليوت",
  "ederson": "إيدرسون", "gianluigi donnarumma": "جانلويجي دوناروما", "james trafford": "جيمس ترافورد",
  "ruben dias": "روبن دياس", "josko gvardiol": "يوشكو غفارديول", "john stones": "جون ستونز",
  "nathan ake": "ناثان أكي", "manuel akanji": "مانويل أكانجي", "abdukodir khusanov": "عبد القادر خوسانوف",
  "rodri": "رودري", "bernardo silva": "برناردو سيلفا", "phil foden": "فيل فودين",
  "mateo kovacic": "ماتيو كوفاتشيتش", "ilkay gundogan": "إلكاي غوندوغان",
  "tijjani reijnders": "تيجاني ريندرز", "rayan cherki": "رايان شيركي", "savinho": "سافينيو",
  "jeremy doku": "جيريمي دوكو", "erling haaland": "إيرلينغ هالاند", "omar marmoush": "عمر مرموش",
  "andre onana": "أندريه أونانا", "altay bayindir": "ألتاي بايندير", "matthijs de ligt": "ماتياس دي ليخت",
  "harry maguire": "هاري ماغواير", "leny yoro": "ليني يورو", "lisandro martinez": "ليساندرو مارتينيز",
  "diogo dalot": "ديوغو دالو", "noussair mazraoui": "نصير مزراوي", "patrick dorgu": "باتريك دورغو",
  "luke shaw": "لوك شو", "casemiro": "كاسيميرو", "manuel ugarte": "مانويل أوغارتي",
  "kobbie mainoo": "كوبي مينو", "bruno fernandes": "برونو فيرنانديز", "mason mount": "ماسون ماونت",
  "amad diallo": "أماد ديالو", "bryan mbeumo": "بريان مبومو", "matheus cunha": "ماتيوس كونيا",
  "benjamin sesko": "بنيامين سيشكو", "joshua zirkzee": "جوشوا زيركزي",
  "robert sanchez": "روبرت سانشيز", "filip jorgensen": "فيليب يورغنسن", "marc cucurella": "مارك كوكوريلا",
  "malo gusto": "مالو غوستو", "reece james": "ريس جيمس", "wesley fofana": "ويسلي فوفانا",
  "levi colwill": "ليفي كولويل", "benoit badiashile": "بنوا بادياشيل", "moises caicedo": "مويسيس كايسيدو",
  "enzo fernandez": "إنزو فيرنانديز", "romeo lavia": "روميو لافيا", "cole palmer": "كول بالمر",
  "pedro neto": "بيدرو نيتو", "joao pedro": "جواو بيدرو", "liam delap": "ليام ديلاب",
  "estevao willian": "إستيفاو ويليان", "jamie gittens": "جيمي غيتنز",
  "guglielmo vicario": "غولييلمو فيكاريو", "antonin kinsky": "أنتونين كينسكي",
  "cristian romero": "كريستيان روميرو", "micky van de ven": "ميكي فان دي فين",
  "kevin danso": "كيفن دانسو", "djed spence": "جيد سبنس", "pedro porro": "بيدرو بورو",
  "destiny udogie": "ديستني أودوجي", "rodrigo bentancur": "رودريغو بينتانكور",
  "yves bissouma": "إيف بيسوما", "pape sarr": "بابي سار", "lucas bergvall": "لوكاس بيرغفال",
  "james maddison": "جيمس ماديسون", "dejan kulusevski": "ديان كولوسيفسكي",
  "brennan johnson": "برينان جونسون", "wilson odobert": "ويلسون أودوبيرت",
  "dominic solanke": "دومينيك سولانكي", "richarlison": "ريتشارليسون",
  "mohammed kudus": "محمد كودوس", "xavi simons": "شافي سيمونز",
  "thibaut courtois": "تيبو كورتوا", "andriy lunin": "أندري لونين", "dani carvajal": "داني كارفاخال",
  "eder militao": "إيدر ميليتاو", "david alaba": "دافيد ألابا", "antonio rudiger": "أنطونيو روديغر",
  "dean huijsen": "دين هويسن", "raul asencio": "راؤول أسينسيو", "ferland mendy": "فيرلان ميندي",
  "fran garcia": "فران غارسيا", "trent alexander-arnold": "ترينت ألكسندر أرنولد",
  "federico valverde": "فيديريكو فالفيردي", "aurelien tchouameni": "أوريليان تشواميني",
  "eduardo camavinga": "إدواردو كامافينغا", "jude bellingham": "جود بيلينغهام",
  "arda guler": "أردا غولر", "dani ceballos": "داني سيبايوس", "luka modric": "لوكا مودريتش",
  "vinicius junior": "فينيسيوس جونيور", "kylian mbappe": "كيليان مبابي", "rodrygo": "رودريغو",
  "brahim diaz": "براهيم دياز", "endrick": "إندريك",
  "marc-andre ter stegen": "مارك أندريه تير شتيغن", "wojciech szczesny": "فويتشخ تشيزني",
  "joan garcia": "خوان غارسيا", "jules kounde": "جول كوندي", "ronald araujo": "رونالد أراوخو",
  "pau cubarsi": "باو كوبارسي", "inigo martinez": "إينيغو مارتينيز",
  "andreas christensen": "أندرياس كريستنسن", "alejandro balde": "أليخاندرو بالدي",
  "eric garcia": "إريك غارسيا", "pedri": "بيدري", "frenkie de jong": "فرينكي دي يونغ",
  "gavi": "غافي", "marc casado": "مارك كاسادو", "dani olmo": "داني أولمو",
  "fermin lopez": "فيرمين لوبيز", "lamine yamal": "لامين يامال", "raphinha": "رافينيا",
  "ferran torres": "فيران توريس", "robert lewandowski": "روبرت ليفاندوفسكي",
  "ansu fati": "أنسو فاتي", "marcus rashford": "ماركوس راشفورد",
  "jan oblak": "يان أوبلاك", "jose gimenez": "خوسيه خيمينيز", "robin le normand": "روبن لو نورمان",
  "clement lenglet": "كليمان لينغليه", "david hancko": "دافيد هانكو",
  "marcos llorente": "ماركوس يورينتي", "nacho molina": "ناتشو مولينا", "javi galan": "خافي غالان",
  "koke": "كوكي", "pablo barrios": "بابلو باريوس", "rodrigo de paul": "رودريغو دي باول",
  "conor gallagher": "كونور غالاغر", "giuliano simeone": "جوليانو سيميوني",
  "alex baena": "أليكس باينا", "johnny cardoso": "جوني كاردوسو", "antoine griezmann": "أنطوان غريزمان",
  "julian alvarez": "خوليان ألفاريز", "alexander sorloth": "ألكسندر سورلوث",
  "giacomo raspadori": "جياكومو راسبادوري", "thiago almada": "تياغو ألمادا",
  "manuel neuer": "مانويل نوير", "jonas urbig": "يوناس أوربيغ", "dayot upamecano": "دايوت أوباميكانو",
  "kim min-jae": "كيم مين جاي", "jonathan tah": "جوناثان تاه", "alphonso davies": "ألفونسو ديفيز",
  "joshua kimmich": "جوشوا كيميش", "leon goretzka": "ليون غوريتسكا",
  "aleksandar pavlovic": "ألكسندر بافلوفيتش", "konrad laimer": "كونراد لايمر",
  "jamal musiala": "جمال موسيالا", "michael olise": "مايكل أوليس", "kingsley coman": "كينغسلي كومان",
  "serge gnabry": "سيرج غنابري", "leroy sane": "ليروي ساني", "harry kane": "هاري كين",
  "luis diaz": "لويس دياز", "lucas chevalier": "لوكاس شوفالييه", "matvey safonov": "ماتفي سافونوف",
  "marquinhos": "ماركينيوس", "willian pacho": "ويليان باتشو", "lucas beraldo": "لوكاس بيرالدو",
  "lucas hernandez": "لوكاس هيرنانديز", "achraf hakimi": "أشرف حكيمي", "nuno mendes": "نونو مينديز",
  "vitor vitinha": "فيتور فيتينيا", "joao neves": "جواو نيفيز", "fabian ruiz": "فابيان رويس",
  "warren zaire-emery": "وارن زائير إيمري", "lee kang-in": "لي كانغ إن", "desire doue": "ديزيريه دويه",
  "khvicha kvaratskhelia": "خفيتشا كفاراتسخيليا", "ousmane dembele": "عثمان ديمبيلي",
  "bradley barcola": "برادلي باركولا", "goncalo ramos": "غونسالو راموس",
  "kevin de bruyne": "كيفن دي بروين", "mohamed elneny": "محمد النني",
  "cristiano ronaldo": "كريستيانو رونالدو", "lionel messi": "ليونيل ميسي", "neymar": "نيمار",
  "karim benzema": "كريم بنزيما", "riyad mahrez": "رياض محرز", "sadio mane": "ساديو ماني",
  "pierre-emerick aubameyang": "بيير إيميريك أوباميانغ", "hakim ziyech": "حكيم زياش",
  "yassine bounou": "ياسين بونو", "sofyan amrabat": "سفيان أمرابط",
  "youssef en-nesyri": "يوسف النصري", "houssem aouar": "حسام عوار",
  "ismael bennacer": "إسماعيل بن ناصر", "salem al-dawsari": "سالم الدوسري",
  "firas al-buraikan": "فراس البريكان", "mohammed al-owais": "محمد العويس",
  "yasser al-shahrani": "ياسر الشهراني", "ali al-bulaihi": "علي البليهي",
  "sultan al-ghannam": "سلطان الغنام", "saleh al-shehri": "صالح الشهري",
  "abdullah al-hamdan": "عبد الله الحمدان", "mohamed kanno": "محمد كنو",
  "salem al dawsari": "سالم الدوسري", "abu bakr": "أبو بكر",
  "mohammed al yami": "محمد اليامي", "mohammed al owais": "محمد العويس",
  "mohammed mahzari": "محمد محزري", "kalidou koulibaly": "كاليدو كوليبالي",
  "yusuf akcicek": "يوسف أكتشيتشيك", "theo hernandez": "تيو هيرنانديز",
  "moteb al harbi": "متعب الحربي", "meshal al dawood": "مشعل الداود",
  "ali lajami": "علي لاجامي", "hassan al tambakti": "حسن تمبكتي",
  "hamad al yami": "حمد اليامي", "nasser al dawsari": "ناصر الدوسري",
  "ruben neves": "روبن نيفيز", "murad al hawsawi": "مراد الهوساوي",
  "milinkovic-savic": "ميلينكوفيتش سافيتش", "saimon bouabre": "سايمون بوابري",
  "abdullah al anazi": "عبد الله العنزي", "suhayb al zaid": "صهيب الزيد",
  "ollie watkins": "أولي واتكينز", "sultan mandash": "سلطان مندش",
  "crysencio summerville": "كريسينسيو سومرفيل", "mohamed meite": "محمد ميتي",
  "nawaf al habashi": "نواف الحبشي", "simone inzaghi": "سيموني إنزاغي",
  "nawaf al aqidi": "نواف العقيدي", "bento": "بينتو",
  "abdulrahman al otaibi": "عبد الرحمن العتيبي", "mubarak al buainain": "مبارك البوعينين",
  "sultan al ghannam": "سلطان الغنام", "mohamed simakan": "محمد سيماكان",
  "nader al sharari": "نادر الشراري", "abdulelah al amri": "عبد الإله العمري",
  "saad al nasser": "سعد الناصر", "nawaf bu washl": "نواف بوشل",
  "aiman yahya": "أيمن يحيى", "yassine sallem": "ياسين سالم",
  "majed qasheesh": "ماجد قشيش", "awad aman": "عوض أمان",
  "salem al najdi": "سالم النجدي", "sami al naji": "سامي النجعي",
  "mohammed marran": "محمد مران", "abdullah al khaibari": "عبد الله الخيبري",
  "angelo": "أنجيلو", "rakan al ghamdi": "راكان الغامدي",
  "abdullah al hamddan": "عبد الله الحمدان", "abdulrahman ghareeb": "عبد الرحمن غريب",
  "saad haqawi": "سعد حقوي", "joao felix": "جواو فيليكس",
  "abdulrahman sufyani": "عبد الرحمن سفياني", "ange postecoglou": "أنجي بوستيكوغلو",
  "edouard mendy": "إدوارد ميندي", "abdullah abdo": "عبد الله عبده",
  "zakaria hawsawi": "زكريا هوساوي", "roger ibanez": "روجر إيبانيز",
  "mohammed sulaiman": "محمد سليمان", "abubacarr kinteh": "أبوبكر كينتي",
  "ali majrashi": "علي مجرشي", "merih demiral": "ميريح ديميرال",
  "mohammed abdulrahman": "محمد عبد الرحمن", "saad yaslam": "سعد يسلم",
  "rayan hamed": "ريان حامد", "ibrahima diaby": "إبراهيما ديابي",
  "valentin atangana": "فالنتين أتانغانا", "trincao": "ترينكاو",
  "eduard spertsyan": "إدوارد سبيرتسيان", "artem bondarenko": "أرتيم بوندارينكو",
  "ibrahim azzam": "إبراهيم عزام", "faisal ibrahim fallatah": "فيصل فلاته",
  "ziyad al johani": "زياد الجهني", "ziyad mallah": "زياد ملاح",
  "naif masoud": "نايف مسعود", "ramez al attar": "رامز العطار",
  "feras al brikan": "فراس البريكان", "meshal al mutairi": "مشعل المطيري",
  "galeno": "غالينو", "ivan toney": "إيفان توني",
  "matheus goncalves": "ماتيوس غونسالفيس", "abdullah radif": "عبد الله راديف",
  "saleh abu al shamat": "صالح أبو الشامات", "salem abdullah": "سالم عبد الله",
  "predrag rajkovic": "بريدراغ رايكوفيتش", "mohammed al absi": "محمد العبسي",
  "osama al mermesh": "أسامة المرمش", "danilo pereira": "دانيلو بيريرا",
  "jan-carlo simic": "يان كارلو سيميتش", "saad al mosa": "سعد الموسى",
  "muhannad al shanqiti": "مهند الشنقيطي", "hassan kadish": "حسن كادش",
  "ahmed sharahili": "أحمد شراحيلي", "ahmed al julaydan": "أحمد الجليدان",
  "muath fagihy": "معاذ فقيهي", "mohammed barnawi": "محمد برناوي",
  "richard rios": "ريتشارد ريوس", "mukhtar ali": "مختار علي",
  "mahamadou doumbia": "مامادو دومبيا", "georginio wijnaldum": "جورجينيو فينالدوم",
  "farhah al shamrani": "فرحة الشمراني", "dion lopy": "ديون لوبي",
  "mohammed fallatah": "محمد فلاته", "rakan kaabi": "راكان كعبي",
  "hamed al ghamdi": "حامد الغامدي", "roger fernandes": "روجر فيرنانديز",
  "george ilenikhena": "جورج إيلينخينا", "marwan al sahafi": "مروان الصحفي",
  "ahmed al ghamdi": "أحمد الغامدي", "steven bergwijn": "ستيفن بيرغفين",
  "suhaib al hawsawi": "صهيب الهوساوي", "jens wissing": "ينس فيسينغ",
  "abdulhadi al oulwan": "عبد الهادي العولوان", "haider abdulkarim": "حيدر عبد الكريم",
  "abdulrahman al sanbi": "عبد الرحمن السنبي", "saeed baattia": "سعيد باعطية",
  "mohammed al harbi": "محمد الحربي", "saad al muthary": "سعد الموثاري",
  "abdullah al anazi": "عبد الله العنزي", "mohammed barnawi": "محمد برناوي",
  "sultan al ghanam": "سلطان الغنام", "nawaf al habashi": "نواف الحبشي",
  "abdullah al harbi": "عبد الله الحربي", "abdulaziz al bishi": "عبد العزيز البيشي",
  "mohammed al harbi": "محمد الحربي", "abdulhadi al alwan": "عبد الهادي العولوان",
  "aser hawsawi": "أسير هوساوي", "abdulrahman al dosari": "عبد الرحمن الدوسري",
  "hamed al shanqiti": "حامد الشنقيطي", "sultan al shehri": "سلطان الشهري"
};

const AR_NAME_TOKENS = {
  haider: "حيدر", haidar: "حيدر", hayder: "حيدر", aser: "أسير", hamed: "حامد", ayman: "أيمن", aiman: "أيمن",
  awad: "عوض", rakan: "راكان", sultan: "سلطان", nader: "نادر", majed: "ماجد", saad: "سعد",
  salem: "سالم", sami: "سامي", nawaf: "نواف", mubarak: "مبارك", faisal: "فيصل", ziyad: "زياد",
  naif: "نايف", meshal: "مشعل", moteb: "متعب", hassan: "حسن", hasan: "حسن", hamad: "حمد",
  nasser: "ناصر", khalid: "خالد", khaled: "خالد", fahad: "فهد", omar: "عمر", ali: "علي",
  ahmed: "أحمد", ahmad: "أحمد", mohammed: "محمد", mohamed: "محمد", yousef: "يوسف",
  youssef: "يوسف", ibrahim: "إبراهيم", ismail: "إسماعيل", hussein: "حسين", husain: "حسين",
  mustafa: "مصطفى", waleed: "وليد", walid: "وليد", yasser: "ياسر", yaser: "ياسر",
  saleh: "صالح", talal: "طلال", bandar: "بندر", turki: "تركي", saud: "سعود", rashid: "راشد",
  hamza: "حمزة", bilal: "بلال", anas: "أنس", adam: "آدم", ayoub: "أيوب", idris: "إدريس",
  yahya: "يحيى", zakaria: "زكريا", tarek: "طارق", kamal: "كمال", jamal: "جمال",
  hisham: "هشام", rami: "رامي", samir: "سمير", nabil: "نبيل", hadi: "هادي", mahdi: "مهدي",
  karim: "كريم", kareem: "كريم", fouad: "فؤاد", fuad: "فؤاد", adel: "عادل", emad: "عماد",
  imad: "عماد", ammar: "عمار", osama: "أسامة", usama: "أسامة", basem: "باسم", bassem: "باسم",
  walid2: "وليد", shadi: "شادي", rashed: "راشد", mansour: "منصور", mansur: "منصور",
  sattam: "سطام", mashal: "مشعل", mohannad: "مهند", muhannad: "مهند", sulaiman: "سليمان",
  sulayman: "سليمان", solaiman: "سليمان", hassan2: "حسن", yazan: "يزن", raed: "رائد",
  raad: "رعد", thamer: "ثامر", hatem: "حاتم", haitham: "هيثم", husam: "حسام", hossam: "حسام"
};

const AR_NAME_CACHE = new Map();
const AR_LEAGUE_CACHE = new Map();
let AR_CLUB_INDEX = null;
let AR_PLAYER_INDEX = null;
let AR_LEAGUE_INDEX = null;

/* فهارس موحّدة: الشرطة والمسافات لا تمنع المطابقة */
function arPlayerIndex() {
  if (AR_PLAYER_INDEX) return AR_PLAYER_INDEX;
  const map = new Map();
  Object.entries(AR_PLAYER_NAMES).forEach(([name, arabic]) => {
    const key = arKey(name);
    if (key && arabic && !map.has(key)) map.set(key, arabic);
  });
  AR_PLAYER_INDEX = map;
  return map;
}

function arLeagueIndex() {
  if (AR_LEAGUE_INDEX) return AR_LEAGUE_INDEX;
  const map = new Map();
  Object.entries(AR_LEAGUE_NAMES).forEach(([name, arabic]) => {
    const key = arKey(name);
    if (key && arabic && !map.has(key)) map.set(key, arabic);
  });
  AR_LEAGUE_INDEX = map;
  return map;
}

function arIsArabic(value) {
  return /[\u0600-\u06FF]/.test(String(value || ""));
}

function arFold(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\x00-\x7f]/g, (ch) => (AR_LATIN_FOLD[ch] !== undefined ? AR_LATIN_FOLD[ch] : ch));
}

function arKey(value) {
  return arFold(value)
    .replace(/[’'`´.]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function arStripClubWords(value) {
  return String(value || "")
    .replace(/\b(fc|afc|cf|sc|ac|as|ss|ssc|bc|cfc|ud|rcd|rc|sv|vfb|tsg|osc|ogc|us|acf|calcio|club|football|fk|sk|bk|if|ff|cd|sd|de|of|the)\b/gi, " ")
    .replace(/\b(18|19|20)\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function arClubIndex() {
  if (AR_CLUB_INDEX) return AR_CLUB_INDEX;
  const map = new Map();
  const add = (name, arabic) => {
    const key = arKey(name);
    if (key && arabic && !map.has(key)) map.set(key, arabic);
    const strippedKey = arKey(arStripClubWords(name));
    if (strippedKey && arabic && !map.has(strippedKey)) map.set(strippedKey, arabic);
  };
  try {
    Object.entries(TEAM_NAME_AR || {}).forEach(([name, arabic]) => add(name, arabic));
    Object.entries(AR_CLUB_EXTRA).forEach(([name, arabic]) => add(name, arabic));
    Object.entries(CLUB_LOGO_AR || {}).forEach(([slug, arabic]) => add(slug.replace(/-/g, " "), arabic));
  } catch (error) {
    /* تجاهل */
  }
  AR_CLUB_INDEX = map;
  return map;
}

function arTeamName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (arIsArabic(raw)) return raw;

  /* فرق السيدات: (W) / Women / W في نهاية الاسم */
  let name = raw.replace(/\s*\((w|women)\)\s*$/i, "").trim();
  let women = /\((w|women)\)/i.test(raw) || /\b(women|ladies)\b/i.test(name);
  name = name.replace(/\b(women|ladies)\b/gi, " ").replace(/\s+/g, " ").trim();
  if (/\s+(w|women)$/i.test(name)) {
    women = true;
    name = name.replace(/\s+(w|women)$/i, "").trim();
  }
  if (!name) name = raw;

  const index = arClubIndex();
  const key = arKey(name);
  const found = index.get(key);
  if (found) return women ? `${found} للسيدات` : found;
  const stripped = arKey(arStripClubWords(name));
  if (stripped && index.has(stripped)) {
    const arabic = index.get(stripped);
    return women ? `${arabic} للسيدات` : arabic;
  }
  const country = AR_COUNTRY_NAMES[key];
  if (country) return country;

  const translit = arTransliterate(arStripClubWords(name) || name);
  return women && translit ? `${translit} للسيدات` : translit;
}

function arCountryName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (arIsArabic(raw)) return raw;
  const code = raw.toUpperCase();
  if (AR_COUNTRY_CODES[code]) return AR_COUNTRY_CODES[code];
  const key = arKey(raw);
  if (AR_COUNTRY_NAMES[key]) return AR_COUNTRY_NAMES[key];
  return arTransliterate(raw);
}

function arTranslitWord(value) {
  let word = arFold(value).replace(/[^a-z]/g, "");
  if (!word) return "";
  const map = {
    a: "ا", b: "ب", c: "ك", d: "د", e: "ي", f: "ف", g: "غ", h: "ه", i: "ي",
    j: "ج", k: "ك", l: "ل", m: "م", n: "ن", o: "و", p: "ب", q: "ق", r: "ر",
    s: "س", t: "ت", u: "و", v: "ف", w: "و", x: "كس", y: "ي", z: "ز"
  };
  const digraphs = [
    ["tsch", "تش"], ["sch", "ش"], ["sh", "ش"], ["ch", "تش"], ["kh", "خ"],
    ["gh", "غ"], ["ph", "ف"], ["th", "ث"], ["ck", "ك"],
    ["qu", "كو"], ["gy", "غ"], ["oo", "و"], ["ee", "ي"], ["aa", "ا"],
    ["ou", "و"], ["au", "او"], ["ai", "اي"], ["ay", "اي"], ["ei", "ي"],
    ["ey", "ي"], ["oi", "وي"], ["oy", "وي"], ["ew", "يو"], ["ll", "ل"],
    ["rr", "ر"], ["ss", "س"], ["tt", "ت"], ["pp", "ب"], ["bb", "ب"],
    ["dd", "د"], ["ff", "ف"], ["mm", "م"], ["nn", "ن"], ["kk", "ك"], ["zz", "ز"]
  ];
  let out = "";
  let i = 0;
  while (i < word.length) {
    let matched = false;
    for (const pair of digraphs) {
      if (word.startsWith(pair[0], i)) {
        out += pair[1];
        i += pair[0].length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = word[i];
    const next = word[i + 1] || "";
    if (ch === "c") out += /[eiy]/.test(next) ? "س" : "ك";
    else if (ch === "g") out += /[eiy]/.test(next) ? "ج" : "غ";
    else out += map[ch] || "";
    i += 1;
  }
  if (word[0] === "a") out = `أ${out.slice(1)}`;
  else if (word[0] === "e" || word[0] === "i") out = `إ${out.slice(1)}`;
  else if (word[0] === "o" || word[0] === "u") out = `أو${out.slice(1)}`;
  let deduped = "";
  for (const ch of out) {
    if (ch !== deduped[deduped.length - 1]) deduped += ch;
  }
  return deduped;
}

function arTransliterate(value, nameMode) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const tokens = raw.split(/[\s\-–—/]+/).filter(Boolean);
  const out = [];
  let pending = false;
  let prevAbd = false;
  const abdNames = {
    aziz: "العزيز", karim: "الكريم", hadi: "الهادي", rahim: "الرحيم", malik: "المالك",
    salam: "السلام", wahab: "الوهاب", ilah: "الإله", ghani: "الغني", latif: "اللطيف",
    hakim: "الحكيم", hamid: "الحميد", majid: "المجيد", nasser: "الناصر", qadir: "القادر",
    samad: "الصمد", wadood: "الودود", rahman: "الرحمن", sattar: "الستار",
    fattah: "الفتاح", razzaq: "الرزاق", muhsin: "المحسن", wali: "الولي"
  };
  tokens.forEach((token) => {
    let piece = "";
    let mergeNext = false;
    let tokenKey = "";
    if (arIsArabic(token)) {
      piece = token;
    } else if (/^\d+$/.test(token)) {
      piece = token;
    } else if (/^u\d{2}$/i.test(token)) {
      piece = `تحت ${token.slice(1)}`;
    } else {
      const key = arKey(token);
      tokenKey = key;
      /* عبد ال… : abdulrahman / abdullah / abdelrahman */
      const abd = key.match(/^abd(?:ul?|el?)(.+)$/);
      if (nameMode && AR_NAME_TOKENS[key]) {
        piece = AR_NAME_TOKENS[key];
      } else if (abd && abd[1].length >= 2) {
        const rest = abd[1];
        if (/^l?a?h$/.test(rest)) piece = "عبد الله";
        else if (abdNames[rest]) piece = `عبد ${abdNames[rest]}`;
        else piece = `عبد ال${arTranslitWord(rest)}`;
      } else if (AR_NAME_PARTICLES[key] !== undefined) {
        const particle = AR_NAME_PARTICLES[key];
        if (particle === "ال") {
          if (!prevAbd) {
            piece = "ال";
            mergeNext = true;
          }
        } else {
          piece = particle;
        }
      } else {
        piece = arTranslitWord(token);
      }
    }
    if (!piece) return;
    if (prevAbd && !pending) {
      const bare = abdNames[tokenKey] ? abdNames[tokenKey].replace(/^ال/, "") : piece;
      piece = "ال" + bare;
    }
    if (pending) {
      out[out.length - 1] += piece;
      pending = false;
    } else {
      out.push(piece);
    }
    if (mergeNext) pending = true;
    prevAbd = piece === "عبد";
  });
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function arPlayerName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (arIsArabic(raw)) return raw;
  if (AR_NAME_CACHE.has(raw)) return AR_NAME_CACHE.get(raw);
  const key = arKey(raw);
  const arabic = arPlayerIndex().get(key) || AR_COUNTRY_NAMES[key] || arTransliterate(raw, true);
  AR_NAME_CACHE.set(raw, arabic);
  return arabic;
}

function arLeagueName(value, countryCode) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (arIsArabic(raw)) return raw;
  const cacheKey = `${raw}|${countryCode || ""}`;
  if (AR_LEAGUE_CACHE.has(cacheKey)) return AR_LEAGUE_CACHE.get(cacheKey);
  const key = arKey(raw);
  const code = String(countryCode || "").toUpperCase();
  let arabic = "";

  /* استثناءات تعتمد على البلد لتفادي الترجمة الخاطئة (كأس الاتحاد في سلوفاكيا مثلاً) */
  if (key === "fa cup" && code && code !== "ENG") arabic = "كأس";
  else if (key === "serie b" && code === "BRA") arabic = "الدوري البرازيلي الدرجة الثانية";
  else if (key === "serie b" && code && code !== "ITA") arabic = "الدرجة الثانية";
  else if (key === "premier league" && code && code !== "ENG") arabic = "الدوري الممتاز";

  /* المجموعات والأدوار */
  if (!arabic) {
    const eflMatch = key.match(/^efl trophy (northern|southern) grp ([a-z])$/);
    if (eflMatch) {
      arabic = `كأس دوري كرة القدم الإنجليزية — المجموعة ${eflMatch[1] === "northern" ? "الشمالية" : "الجنوبية"} ${eflMatch[2].toUpperCase()}`;
    }
  }
  if (!arabic) {
    const groupMatch = key.match(/^(.*?) (?:group|grp) ([a-z0-9]+)$/);
    if (groupMatch) {
      const base = arLeagueName(groupMatch[1], countryCode);
      const group = /^[a-z]$/.test(groupMatch[2]) ? groupMatch[2].toUpperCase() : groupMatch[2];
      arabic = `${base} — المجموعة ${group}`;
    }
  }
  if (!arabic) {
    const roundMatch = key.match(/^(.*?) (?:- )?(\d+)(?:st|nd|rd|th) finals$/);
    if (roundMatch) {
      arabic = `${arLeagueName(roundMatch[1], countryCode)} — دور الـ${Number(roundMatch[2]) * 2}`;
    }
  }

  if (!arabic) arabic = arLeagueIndex().get(key);
  if (!arabic) {
    const tokens = key.split(" ").filter(Boolean);
    const translated = tokens.map((token) => {
      if (AR_LEAGUE_WORDS[token] !== undefined) return AR_LEAGUE_WORDS[token];
      if (AR_COUNTRY_NAMES[token]) return AR_COUNTRY_NAMES[token];
      if (AR_NAME_PARTICLES[token] !== undefined) return AR_NAME_PARTICLES[token];
      if (/^[a-z]$/.test(token)) return token === "a" ? "أ" : token === "b" ? "ب" : token;
      return arTranslitWord(token);
    }).filter(Boolean);
    arabic = translated.join(" ").replace(/\s+/g, " ").trim();
  }
  if (!arabic) arabic = arTransliterate(raw);
  AR_LEAGUE_CACHE.set(cacheKey, arabic);
  return arabic;
}

function normalizeTeamName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(fc|afc|cf|sc|ac|as|ss|ssc|bc|cfc|ud|rcd|rc|sv|vfb|tsg|osc|sco|aj|es|ogc|us|acf|calcio|club|de|of)\b/g, " ")
    .replace(/\b(18|19|20)\d{2}\b/g, " ")
    .replace(/\b0\d\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLogoName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  if (/[\u0600-\u06FF]/.test(raw)) {
    return normalizeArabic(raw).replace(/[^\u0600-\u06FFa-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }
  return normalizeTeamName(raw);
}

function clubLogoFor(team) {
  if (!team) return "";
  if (team.logo) return team.logo;
  const names = [team.rawName, team.name, team.short].filter(Boolean);
  for (const name of names) {
    const key = normalizeLogoName(name);
    if (key && CLUB_LOGO_MAP[key]) return CLUB_LOGO_MAP[key];
  }
  return "";
}

/* شعار البطولة: من بيانات البطولة، أو عبر معرف FotMob، أو شعار بعيد كحل أخير */
function leagueLogoFor(league) {
  if (!league) return "";
  if (league.logo) return league.logo;
  const appComp = league.appId ? getCompetitionById(String(league.appId)) : null;
  if (appComp?.logo) return appComp.logo;
  const idComp = league.id ? getCompetitionById(String(league.id)) : null;
  if (idComp?.logo) return idComp.logo;
  const fmId = league.fmId || appComp?.fotmob || idComp?.fotmob;
  if (fmId) return `https://images.fotmob.com/image_resources/logo/leaguelogo/${fmId}.png`;
  return "";
}

/* أيقونة/شعار بطولة جاهزة للعرض مع بديل عند فشل تحميل الصورة */
function leagueMark(league, extraClass = "") {
  const logo = safeUrl(leagueLogoFor(league));
  const fallback = `<span class="league-mark__fallback">${icon("trophy")}</span>`;
  if (!logo) return `<span class="league-mark ${extraClass}">${fallback}</span>`;
  return `<span class="league-mark league-mark--img ${extraClass}">${fallback}<img src="${esc(logo)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove('league-mark--img');this.remove()" /></span>`;
}

function crestImageHtml(team, alt = "", eager = false) {
  const logo = safeUrl(clubLogoFor(team));
  if (!logo) return "";
  const fallback = team?.logo && team?.logoFallback ? safeUrl(team.logoFallback) : "";
  const onerror = fallback ? ` onerror="this.onerror=null;this.src='${esc(fallback)}'"` : "";
  return `<img src="${esc(logo)}" alt="${esc(alt)}" loading="${eager ? "eager" : "lazy"}" decoding="async"${onerror} />`;
}


function getOpenMatches(compId) {
  const inState = state.openFootball?.leagues?.[compId]?.matches;
  if (Array.isArray(inState) && inState.length) return inState;
  const cache = readJSON(KEYS.openFootball, {});
  return Array.isArray(cache?.[compId]?.matches) ? cache[compId].matches : [];
}

function getFixtureById(id) {
  const wanted = String(id);
  const pools = [
    state.matches.fixtures || [],
    state.matches.nextFixtures || [],
    ...Object.values(state.openFootball?.leagues || {}).map((entry) => entry.matches || []),
    state.yumi.matches || []
  ];
  for (const pool of pools) {
    const found = pool.find((fixture) => String(fixture.id) === wanted);
    if (found) return found;
  }
  return null;
}

function getCompetitionForFixture(fixture) {
  const leagueId = fixture?.league?.appId || fixture?.league?.id;
  if (leagueId) {
    const direct = getCompetitionById(String(leagueId));
    if (direct) return direct;
  }
  return state.data.competitions.find((comp) => comp.openKey && comp.name === fixture?.league?.name) || null;
}
function teamCrest(team, extraClass = "", eager = false) {
  if (!team) return `<span class="team-crest ${extraClass}"><span>?</span></span>`;
  const logo = clubLogoFor(team);
  if (logo) {
    return `<span class="team-crest team-crest--img ${extraClass}" style="${teamStyle(team)}">${crestImageHtml(team, "", eager)}</span>`;
  }
  return `<span class="team-crest ${extraClass}" style="${teamStyle(team)}" aria-hidden="true"><span>${esc(team.short || team.name.slice(0, 2))}</span></span>`;
}

function emptyState(iconName, title, text, action = "") {
  return `
    <div class="empty">
      <div class="empty__icon">${icon(iconName)}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${action}
    </div>`;
}

function notice(iconName, text, variant = "") {
  return `<div class="notice ${variant}">${icon(iconName)}<div>${text}</div></div>`;
}

/* --------------------------------------------------------------------------
   الإعدادات الافتراضية والحالة
   -------------------------------------------------------------------------- */
const DEFAULT_SETTINGS = {
  apiBase: API_FOOTBALL_DEFAULT,
  apiKey: "",
  season: new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1,
  newsKey: "",
  newsQuery: "كرة القدم",
  notifications: false,
  adminPin: DEFAULT_ADMIN_PIN,
  autoRefresh: true,
  openFootball: true,
  yumi: true
};

function seedNotifications() {
  const now = Date.now();
  return [
    {
      id: "n-welcome",
      title: "أهلاً بك في وصل الحسيني",
      text: "منصتك العربية لمتابعة كرة القدم، وتطوير مهاراتك داخل أكاديمية وصل.",
      at: new Date(now - 1000 * 60 * 12).toISOString(),
      read: false,
      type: "welcome"
    },
    {
      id: "n-source",
      title: "مركز البيانات بانتظار الربط",
      text: "لعرض النتائج الحقيقية، أضف مفتاح مزود بيانات موثوق من إعدادات المصادر. لن نعرض أي نتائج غير مؤكدة.",
      at: new Date(now - 1000 * 60 * 55).toISOString(),
      read: false,
      type: "data"
    },
    {
      id: "n-training",
      title: "تحدي اليوم: 12 دقيقة",
      text: "ابدأ بتمرين التحكم بالكرة تحت الضغط، وطوّر أول لمسة لديك.",
      at: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      read: true,
      type: "training"
    }
  ];
}

const state = {
  route: { name: "home", id: null },
  data: deepClone(SEED),
  favorites: { articles: [], drills: [], teams: [], competitions: [] },
  followedLeagues: [],
  settings: { ...DEFAULT_SETTINGS },
  notifications: seedNotifications(),
  progress: { completed: [], readArticles: [], lastVisit: null },
  matches: { status: "idle", source: "openfootball", fixtures: [], nextFixtures: [], error: null, updatedAt: null, date: getTodayISO() },
  openFootball: { status: "idle", leagues: {}, error: null, updatedAt: null },
  yumi: { status: "idle", day: "today", matches: [], error: null, updatedAt: null, savedAt: null },
  standings: {},
  lineups: {},
  predictions: {},
  s365: { status: "idle", matches: [], error: null, updatedAt: null, lastAttempt: 0 },
  s365Day: null,
  s365Teams: {},
  s365Scorers: {},
  newsFeed: { status: "idle", articles: [], error: null, updatedAt: null },
  fmNews: { status: "idle", trending: [], latest: [], error: null, updatedAt: null },
  ui: {
    matchDay: meccaTodayISO(),
    matchComp: "all",
    matchTeam: "all",
    newsCat: "الكل",
    compQuery: "",
    academyLevel: "الكل",
    academyCat: "الكل",
    teamCountry: "الكل",
    teamTab: "clubs",
    favTab: "all",
    searchQuery: "",
    recentSearches: [],
    adminUnlocked: false,
    adminTab: "overview",
    sourceTest: null,
    installDismissed: false,
    watch: { open: false, url: "", title: "", subtitle: "" },
    yumiDay: "today"
  },
  timer: { drillId: null, seconds: 0, running: false, interval: null },
  deferredPrompt: null,
  splashDone: false
};

function loadState() {
  const storedDataVersion = readJSON(KEYS.dataVersion, null);
  if (storedDataVersion !== DATA_VERSION) {
    removeKey(KEYS.openFootball);
    removeKey(KEYS.matchCache);
    removeKey(KEYS.standingsCache);
    removeKey(KEYS.lineups);
    removeKey(KEYS.predictions);
    removeKey(KEYS.s365);
    writeJSON(KEYS.dataVersion, DATA_VERSION);
  }

  const storedData = readJSON(KEYS.data, null);
  if (storedData && storedData.version === DATA_VERSION) {
    state.data = storedData;
  } else {
    state.data = deepClone(SEED);
    writeJSON(KEYS.data, state.data);
  }

  const favorites = readJSON(KEYS.favorites, null);
  if (favorites && typeof favorites === "object") {
    state.favorites = {
      articles: Array.isArray(favorites.articles) ? favorites.articles : [],
      drills: Array.isArray(favorites.drills) ? favorites.drills : [],
      teams: Array.isArray(favorites.teams) ? favorites.teams : [],
      competitions: Array.isArray(favorites.competitions) ? favorites.competitions : []
    };
  }

  const followedLeagues = readJSON(KEYS.followedLeagues, null);
  if (Array.isArray(followedLeagues)) {
    state.followedLeagues = followedLeagues
      .map((item) => (typeof item === "string" ? { id: item, name: "", country: "" } : item))
      .filter((item) => item && item.id !== undefined && item.id !== null)
      .map((item) => ({ id: String(item.id), name: String(item.name || ""), country: String(item.country || "") }));
  }

  const settings = readJSON(KEYS.settings, null);
  if (settings && typeof settings === "object") {
    state.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  const notifications = readJSON(KEYS.notifications, null);
  if (Array.isArray(notifications)) {
    state.notifications = notifications;
  } else {
    state.notifications = seedNotifications();
    writeJSON(KEYS.notifications, state.notifications);
  }

  const progress = readJSON(KEYS.progress, null);
  if (progress && typeof progress === "object") {
    state.progress = {
      completed: Array.isArray(progress.completed) ? progress.completed : [],
      readArticles: Array.isArray(progress.readArticles) ? progress.readArticles : [],
      lastVisit: progress.lastVisit || null
    };
  }

  const recent = readJSON(KEYS.recentSearches, null);
  if (Array.isArray(recent)) state.ui.recentSearches = recent.slice(0, 6);

  const matchCache = readJSON(KEYS.matchCache, null);
  if (matchCache && matchCache.date === getTodayISO() && Date.now() - matchCache.savedAt < CACHE_TTL) {
    state.matches = { ...matchCache, status: "ready" };
  }

  const openCache = readJSON(KEYS.openFootball, {});
  Object.keys(openCache || {}).forEach((id) => {
    const entry = openCache[id];
    if (entry && Array.isArray(entry.matches)) {
      state.openFootball.leagues[id] = {
        status: "ready",
        matches: entry.matches,
        updatedAt: entry.updatedAt || null,
        savedAt: entry.savedAt || 0,
        error: null
      };
    }
  });
  if (Object.keys(state.openFootball.leagues).length) {
    state.openFootball.status = "ready";
    const stamps = Object.values(state.openFootball.leagues).map((item) => item.savedAt || 0);
    state.openFootball.updatedAt = stamps.length ? new Date(Math.max(...stamps)).toISOString() : null;
  }

  const yumiCache = readJSON(KEYS.yumi, null);
  if (yumiCache && yumiCache.matches) {
    state.yumi = {
      status: "ready",
      day: yumiCache.day || "today",
      matches: yumiCache.matches,
      error: null,
      updatedAt: yumiCache.updatedAt || null,
      savedAt: yumiCache.savedAt || 0
    };
  }

  const newsCache = readJSON(KEYS.newsCache, null);
  if (newsCache && Date.now() - newsCache.savedAt < CACHE_TTL) {
    state.newsFeed = { ...newsCache, status: "ready" };
  }

  const s365Cache = readJSON(KEYS.s365, null);
  if (s365Cache && typeof s365Cache === "object") {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const today = typeof meccaTodayISO === "function" ? meccaTodayISO() : getTodayISO();
    const cachedDay = s365Cache.days && s365Cache.days[today];
    if (cachedDay && Array.isArray(cachedDay.games)) {
      state.s365Day = {
        status: "ready",
        date: today,
        games: cachedDay.games,
        updatedAt: cachedDay.updatedAt || null,
        stale: offline,
        error: null
      };
    }
    Object.entries(s365Cache.teams || {}).forEach(([id, profile]) => {
      if (!profile) return;
      state.s365Teams[id] = {
        status: "ready",
        id: Number(id),
        name: profile.name || "",
        logo: profile.logo || "",
        competitions: profile.competitions || [],
        last5: profile.last5 || [],
        next5: profile.next5 || [],
        h2h: profile.h2h || [],
        h2hOpponent: profile.h2hOpponent || null,
        honors: profile.honors || [],
        updatedAt: profile.updatedAt || null,
        stale: offline,
        error: null
      };
    });
    Object.entries(s365Cache.scorers || {}).forEach(([id, entry]) => {
      if (!entry || !Array.isArray(entry.list)) return;
      state.s365Scorers[id] = {
        status: "ready",
        list: entry.list,
        seasonNum: entry.seasonNum || null,
        updatedAt: entry.updatedAt || null,
        stale: offline,
        error: null
      };
    });
  }

  state.ui.installDismissed = readJSON(KEYS.installDismissed, false) === true;
  state.ui.recentSearches = state.ui.recentSearches.slice(0, 6);
  state.progress.lastVisit = new Date().toISOString();
  saveProgress();
}

function saveData() {
  state.data.version = DATA_VERSION;
  writeJSON(KEYS.data, state.data);
}
function saveFavorites() {
  writeJSON(KEYS.favorites, state.favorites);
}
function saveFollowedLeagues() {
  writeJSON(KEYS.followedLeagues, state.followedLeagues);
}
function isFollowedLeague(id) {
  return state.followedLeagues.some((item) => String(item.id) === String(id));
}
function toggleFollowedLeague(id, name, country) {
  const key = String(id || "");
  if (!key) return false;
  const index = state.followedLeagues.findIndex((item) => String(item.id) === key);
  if (index >= 0) {
    state.followedLeagues.splice(index, 1);
  } else {
    state.followedLeagues.unshift({ id: key, name: String(name || ""), country: String(country || "") });
  }
  saveFollowedLeagues();
  return index < 0;
}
function followedLeagueCount() {
  return state.followedLeagues.length;
}
function saveSettings() {
  writeJSON(KEYS.settings, state.settings);
}
function saveNotifications() {
  writeJSON(KEYS.notifications, state.notifications);
}
function saveProgress() {
  writeJSON(KEYS.progress, state.progress);
}
function saveRecentSearches() {
  writeJSON(KEYS.recentSearches, state.ui.recentSearches.slice(0, 6));
}

/* --------------------------------------------------------------------------
   المفضلة والتقدم
   -------------------------------------------------------------------------- */
const FAVORITE_KEYS = {
  article: "articles",
  drill: "drills",
  team: "teams",
  competition: "competitions"
};

function isFavorite(type, id) {
  const key = FAVORITE_KEYS[type];
  return Boolean(key && state.favorites[key].includes(id));
}

function toggleFavorite(type, id) {
  const key = FAVORITE_KEYS[type];
  if (!key) return false;
  const list = state.favorites[key];
  const index = list.indexOf(id);
  if (index >= 0) list.splice(index, 1);
  else list.unshift(id);
  saveFavorites();
  return index < 0;
}

function favoriteCount() {
  return Object.values(state.favorites).reduce((sum, list) => sum + list.length, 0);
}

function isDrillDone(id) {
  return state.progress.completed.some((item) => item.drillId === id);
}

function completedDrillIds() {
  return [...new Set(state.progress.completed.map((item) => item.drillId))];
}

function completedMinutes() {
  return state.progress.completed.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
}

function computeStreak() {
  const dates = [...new Set(state.progress.completed.map((item) => item.date))].sort();
  if (!dates.length) return 0;
  const today = getTodayISO();
  const yesterday = addDaysISO(today, -1);
  let cursor = dates.includes(today) ? today : dates.includes(yesterday) ? yesterday : null;
  if (!cursor) return 0;
  let streak = 0;
  while (dates.includes(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

function completeDrill(drill) {
  if (!drill) return false;
  if (isDrillDone(drill.id)) {
    showToast("أنجزت هذا التمرين من قبل — استمر في التكرار");
    return false;
  }
  state.progress.completed.push({
    drillId: drill.id,
    date: getTodayISO(),
    at: new Date().toISOString(),
    minutes: Number(drill.duration) || 0
  });
  saveProgress();
  return true;
}

function markArticleRead(id) {
  if (!state.progress.readArticles.includes(id)) {
    state.progress.readArticles.push(id);
    saveProgress();
  }
}

function articleReadCount() {
  return new Set(state.progress.readArticles).size;
}

/* --------------------------------------------------------------------------
   التوجيه
   -------------------------------------------------------------------------- */
function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "") || "home";
  const [pathPart] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  let id = parts[1] || null;
  if (id) {
    try { id = decodeURIComponent(id); } catch { /* keep raw id */ }
  }
  return { name: parts[0] || "home", id };
}

function go(path) {
  const next = String(path || "home").replace(/^#\/?/, "");
  if (location.hash === `#/${next}`) {
    render();
    return;
  }
  location.hash = `#/${next}`;
}

function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    go("home");
  }
}

function tabForRoute(name) {
  if (["home", "matches", "match", "live"].includes(name)) return "home";
  if (["competitions", "competition"].includes(name)) return "competitions";
  if (["news", "article"].includes(name)) return "news";
  if (["academy", "drill"].includes(name)) return "academy";
  return "more";
}

function pageTitle(route) {
  const titles = {
    home: "وصل الحسيني",
    matches: "المباريات",
    live: "البث المباشر",
    match: "تفاصيل المباراة",
    competitions: "البطولات",
    news: "الأخبار",
    academy: "الأكاديمية",
    more: "المزيد",
    favorites: "المفضلة",
    notifications: "الإشعارات",
    about: "حول التطبيق",
    settings: "إعدادات المصادر",
    admin: "لوحة التحكم",
    teams: "الأندية",
    search: "البحث",
    article: "مقال",
    team: "نادي",
    competition: "بطولة",
    drill: "تمرين"
  };
  if (route.name === "article") return getArticleById(route.id)?.title || "مقال";
  if (route.name === "team") return getTeamById(route.id)?.name || "نادي";
  if (route.name === "competition") return getCompetitionById(route.id)?.name || "بطولة";
  if (route.name === "match") {
    const fixture = getFixtureById(route.id);
    if (fixture) return `${fixture.home?.name || "مباراة"} ضد ${fixture.away?.name || ""}`.trim();
    return "تفاصيل المباراة";
  }
  if (route.name === "drill") return getDrillById(route.id)?.title || "تمرين";
  return titles[route.name] || "وصل الحسيني";
}

const DETAIL_ROUTES = new Set(["article", "team", "competition", "match", "drill", "favorites", "notifications", "about", "settings", "admin", "teams", "search"]);

/* --------------------------------------------------------------------------
   رسم الهيكل العام
   -------------------------------------------------------------------------- */
function render() {
  const route = parseRoute();
  const previous = state.route;
  state.route = route;

  if (previous.name === "drill" && route.name !== "drill") {
    stopTimer();
  }

  $$(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.route === tabForRoute(route.name));
  });

  renderTopbar(route);
  renderMain(route);
  updateNotificationBadge();
  document.title = route.name === "home" ? "وصل الحسيني — سكون الرياضي" : `${pageTitle(route)} — وصل الحسيني`;

  if (route.name !== "search") {
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (typeof afterRender === "function") {
    afterRender(route);
  }
}

function renderTopbar(route) {
  const topbar = $("#topbar");
  if (!topbar) return;

  const searchButton = `<button class="icon-btn" data-go="search" aria-label="البحث">${icon("search")}</button>`;
  const bellButton = (() => {
    const unread = state.notifications.filter((n) => !n.read).length;
    return `<button class="icon-btn" data-go="notifications" aria-label="الإشعارات">${icon("bell")}${unread ? `<span class="icon-btn__count">${unread > 9 ? "9+" : unread}</span>` : ""}</button>`;
  })();

  if (route.name === "home") {
    topbar.innerHTML = `
      <div class="topbar__brand">
        <img class="topbar__logo" src="assets/icon-192.png" alt="" width="45" height="45" />
        <div class="topbar__copy">
          <div class="topbar__title">وصل الحسيني</div>
          <div class="topbar__subtitle">سكون الرياضي</div>
        </div>
      </div>
      <div class="topbar__actions">${searchButton}${themeToggleButton()}${bellButton}</div>`;
    return;
  }

  if (DETAIL_ROUTES.has(route.name)) {
    let action = "";
    if (route.name === "article" && route.id) {
      const saved = isFavorite("article", route.id);
      action = `<button class="icon-btn" data-action="toggleFavorite" data-type="article" data-id="${esc(route.id)}" aria-label="${saved ? "إزالة من المفضلة" : "حفظ المقال"}">${heartIcon(saved)}</button>
        <button class="icon-btn" data-action="shareArticle" data-id="${esc(route.id)}" aria-label="مشاركة">${icon("share")}</button>`;
    } else if (route.name === "drill" && route.id) {
      const saved = isFavorite("drill", route.id);
      action = `<button class="icon-btn" data-action="toggleFavorite" data-type="drill" data-id="${esc(route.id)}" aria-label="${saved ? "إزالة من المفضلة" : "حفظ التمرين"}">${heartIcon(saved)}</button>`;
    } else if (route.name === "team" && route.id) {
      const saved = isFavorite("team", route.id);
      action = `<button class="icon-btn" data-action="toggleFavorite" data-type="team" data-id="${esc(route.id)}" aria-label="${saved ? "إزالة من المفضلة" : "حفظ النادي"}">${heartIcon(saved)}</button>`;
    } else if (route.name === "competition" && route.id) {
      const saved = isFavorite("competition", route.id);
      action = `<button class="icon-btn" data-action="toggleFavorite" data-type="competition" data-id="${esc(route.id)}" aria-label="${saved ? "إزالة من المفضلة" : "حفظ البطولة"}">${heartIcon(saved)}</button>`;
    } else if (route.name === "match" && route.id) {
      action = `<button class="icon-btn" data-action="watchMatch" data-id="${esc(route.id)}" aria-label="مشاهدة البث">${icon("play")}</button>`;
    }
    topbar.innerHTML = `
      <button class="icon-btn" data-action="back" aria-label="رجوع">${icon("arrowRight")}</button>
      <div class="topbar__page">
        <div>
          <div class="topbar__page-title">${esc(pageTitle(route))}</div>
          <div class="topbar__page-subtitle">${routeSubtitle(route)}</div>
        </div>
      </div>
      <div class="topbar__actions">${action}</div>`;
    return;
  }

  const subtitles = {
    matches: "المركز الرياضي",
    live: "بث مباشر من Yumi Sports",
    competitions: "الدوريات والبطولات",
    news: "مجلة وصل والأخبار",
    academy: "طوّر مهاراتك",
    more: "حسابك ومحتواك"
  };
  topbar.innerHTML = `
    <div class="topbar__page">
      <div>
        <div class="topbar__page-title">${esc(pageTitle(route))}</div>
        <div class="topbar__page-subtitle">${esc(subtitles[route.name] || "وصل الحسيني")}</div>
      </div>
    </div>
    <div class="topbar__actions">${searchButton}${themeToggleButton()}${bellButton}</div>`;
}

function routeSubtitle(route) {
  if (route.name === "article") return getArticleById(route.id)?.category || "مجلة وصل";
  if (route.name === "team") return getTeamById(route.id)?.city || "دليل الأندية";
  if (route.name === "competition") return getCompetitionById(route.id)?.country || "بطولة";
  if (route.name === "drill") return getDrillById(route.id)?.level || "أكاديمية وصل";
  if (route.name === "match") return getFixtureById(route.id)?.league?.name || "المركز الرياضي";
  if (route.name === "live") return "بث مباشر من Yumi Sports";
  if (route.name === "search") return "ابحث في كل المحتوى";
  if (route.name === "admin") return "إدارة محتوى التطبيق";
  return "وصل الحسيني";
}

function renderMain(route) {
  const main = $("#main");
  if (!main) return;
  try {
    const screens = {
      home: renderHome,
      matches: renderMatches,
      live: renderLive,
      match: renderMatchDetail,
      competitions: renderCompetitions,
      competition: renderCompetitionDetail,
      news: renderNews,
      article: renderArticle,
      academy: renderAcademy,
      drill: renderDrill,
      more: renderMore,
      favorites: renderFavorites,
      notifications: renderNotifications,
      about: renderAbout,
      settings: renderSettings,
      admin: renderAdmin,
      teams: renderTeams,
      team: renderTeam,
      search: renderSearch
    };
    const screen = screens[route.name] || renderNotFound;
    main.innerHTML = screen(route);
  } catch (error) {
    console.error(error);
    main.innerHTML = emptyState("alert", "حدث خطأ غير متوقع", "أعد تحميل التطبيق أو حاول مرة أخرى.", `<button class="btn btn--primary" data-action="reload">إعادة المحاولة</button>`);
  }
}

function renderNotFound() {
  return emptyState("alert", "الصفحة غير موجودة", "قد يكون الرابط قديماً أو غير صحيح.", `<button class="btn btn--primary" data-go="home">العودة للرئيسية</button>`);
}

function updateNotificationBadge() {
  const unread = state.notifications.filter((n) => !n.read).length;
  const bell = $('.topbar [data-go="notifications"]');
  if (!bell) return;
  const existing = $(".icon-btn__count", bell);
  if (existing) existing.remove();
  if (unread) {
    bell.insertAdjacentHTML("beforeend", `<span class="icon-btn__count">${unread > 9 ? "9+" : unread}</span>`);
  }
}

/* --------------------------------------------------------------------------
   الإشعارات والتنبيهات داخل التطبيق
   -------------------------------------------------------------------------- */
let toastTimer = null;
function showToast(message, variant = "") {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast is-visible ${variant === "error" ? "is-error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function addNotification(title, text, type = "info", options = {}) {
  const item = {
    id: uid("n"),
    title,
    text,
    at: new Date().toISOString(),
    read: false,
    type
  };
  state.notifications.unshift(item);
  state.notifications = state.notifications.slice(0, 60);
  saveNotifications();
  if (options.push !== false) sendLocalNotification(title, text);
  return item;
}

function sendLocalNotification(title, body) {
  if (!state.settings.notifications) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "assets/icon-192.png",
      badge: "assets/icon-192.png",
      dir: "rtl",
      lang: "ar"
    });
  } catch {
    /* ignore */
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("هذا الجهاز لا يدعم إشعارات النظام", "error");
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    state.settings.notifications = granted;
    saveSettings();
    if (granted) {
      showToast("تم تفعيل الإشعارات");
      sendLocalNotification("وصل الحسيني", "تم تفعيل الإشعارات بنجاح. سنخبرك بالتحديثات المهمة.");
    } else {
      showToast("لم يتم منح صلاحية الإشعارات", "error");
    }
    return granted;
  } catch {
    showToast("تعذر طلب صلاحية الإشعارات", "error");
    return false;
  }
}

/* --------------------------------------------------------------------------
   النوافذ السفلية والمنبثقة
   -------------------------------------------------------------------------- */
function syncBodyLock() {
  const open = $(".sheet-layer.is-open") || $(".modal-layer.is-open");
  document.body.classList.toggle("no-scroll", Boolean(open));
}

function openSheet(title, html) {
  const layer = $("#sheetLayer");
  const sheetTitle = $("#sheetTitle");
  const body = $("#sheetBody");
  if (!layer || !body) return;
  if (sheetTitle) sheetTitle.textContent = title;
  body.innerHTML = html;
  layer.classList.add("is-open");
  layer.setAttribute("aria-hidden", "false");
  syncBodyLock();
  const focusable = body.querySelector("input, select, textarea, button, a");
  if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 80);
}

function closeSheet() {
  const layer = $("#sheetLayer");
  if (!layer) return;
  layer.classList.remove("is-open");
  layer.setAttribute("aria-hidden", "true");
  syncBodyLock();
}

function openModal(title, html) {
  const layer = $("#modalLayer");
  const modalTitle = $("#modalTitle");
  const body = $("#modalBody");
  if (!layer || !body) return;
  if (modalTitle) modalTitle.textContent = title;
  body.innerHTML = html;
  layer.classList.add("is-open");
  layer.setAttribute("aria-hidden", "false");
  syncBodyLock();
  const focusable = body.querySelector("input, select, textarea, button, a");
  if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 80);
}

function closeModal() {
  const layer = $("#modalLayer");
  if (!layer) return;
  layer.classList.remove("is-open");
  layer.setAttribute("aria-hidden", "true");
  syncBodyLock();
}

/* --------------------------------------------------------------------------
   المشاركة، الحافظة، التثبيت
   -------------------------------------------------------------------------- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      textarea.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function shareContent(title, text, url) {
  const shareData = { title, text, url: url || location.href };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch {
      return false;
    }
  }
  const ok = await copyText(`${title}\n${text}\n${url || location.href}`);
  if (ok) showToast("تم نسخ رابط المشاركة");
  else showToast("تعذر مشاركة المحتوى", "error");
  return ok;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function showInstallBar() {
  if (isStandalone() || state.ui.installDismissed) return;
  const bar = $("#installBar");
  if (bar) {
    bar.hidden = false;
    document.body.classList.add("has-install-bar");
  }
}

function hideInstallBar() {
  const bar = $("#installBar");
  if (bar) bar.hidden = true;
  document.body.classList.remove("has-install-bar");
}

async function installApp() {
  if (state.deferredPrompt) {
    state.deferredPrompt.prompt();
    const choice = await state.deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      showToast("شكراً! تم بدء تثبيت التطبيق");
      hideInstallBar();
    }
    state.deferredPrompt = null;
    return;
  }
  if (isStandalone()) {
    showToast("التطبيق مثبت بالفعل");
    return;
  }
  if (isIOS()) {
    openModal(
      "تثبيت على iPhone",
      `<div class="article-body">
        <p>لتثبيت وصل الحسيني على جهاز iPhone أو iPad:</p>
        <p>1. افتح التطبيق في متصفح Safari.<br>2. اضغط زر المشاركة في شريط المتصفح.<br>3. اختر «إضافة إلى الشاشة الرئيسية».<br>4. اضغط «إضافة».</p>
        <p>سيظهر التطبيق كأيقونة مستقلة على شاشتك.</p>
      </div>
      <button class="btn btn--primary btn--block" data-close-modal>حسناً</button>`
    );
    return;
  }
  openModal(
    "تثبيت التطبيق",
    `<div class="article-body">
      <p>افتح قائمة المتصفح (⋮) واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>
      <p>إذا لم يظهر الخيار، استخدم Chrome أو Edge على Android، أو Safari على iPhone.</p>
    </div>
    <button class="btn btn--primary btn--block" data-close-modal>فهمت</button>`
  );
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline support is optional */
    });
  });
}

/* --------------------------------------------------------------------------
   أدوات مساعدة للواجهة
   -------------------------------------------------------------------------- */
function sectionHead(title, subtitle = "", link = "") {
  return `
    <div class="section__head">
      <div>
        <h2 class="section__title">${esc(title)}</h2>
        ${subtitle ? `<p class="section__sub">${esc(subtitle)}</p>` : ""}
      </div>
      ${link}
    </div>`;
}

function viewAllLink(route, label = "عرض الكل") {
  return `<button class="section__link" data-go="${esc(route)}">${esc(label)} ${icon("arrowLeft")}</button>`;
}

function saveButton(type, id) {
  const saved = isFavorite(type, id);
  return `<button class="save-btn ${saved ? "is-saved" : ""}" data-action="toggleFavorite" data-type="${esc(type)}" data-id="${esc(id)}" aria-label="${saved ? "إزالة من المفضلة" : "حفظ في المفضلة"}">${heartIcon(saved)}</button>`;
}

function articleRow(article) {
  const art = ART[article.art] || ART.tactics;
  const image = article.image
    ? `<img src="${esc(article.image)}" alt="" loading="lazy" decoding="async" />`
    : `<div class="article-art" style="${artStyle(article.art)}"><span class="article-art__num">وصل</span><span class="article-art__icon">${icon(art.icon)}</span></div>`;
  return `
    <div class="article-row">
      <button class="article-row__art" data-go="article/${esc(article.id)}" aria-label="${esc(article.title)}">${image}</button>
      <button class="article-row__body" data-go="article/${esc(article.id)}">
        <div class="article-row__cat">${esc(article.category)}</div>
        <div class="article-row__title">${esc(article.title)}</div>
        <div class="article-row__meta">${icon("clock")} ${article.readTime || 3} دقائق قراءة</div>
      </button>
      ${saveButton("article", article.id)}
    </div>`;
}

function drillRow(drill) {
  const art = ART[drill.art] || ART.control;
  return `
    <div class="drill-row">
      <button class="drill-row__art" style="${artStyle(drill.art)}" data-go="drill/${esc(drill.id)}" aria-label="${esc(drill.title)}">${icon(art.icon)}</button>
      <button class="drill-row__body" data-go="drill/${esc(drill.id)}">
        <div class="drill-row__title">${esc(drill.title)}</div>
        <div class="drill-row__meta">${icon("clock")} ${drill.duration} دقيقة <span>•</span> ${esc(drill.level)}</div>
      </button>
      ${saveButton("drill", drill.id)}
    </div>`;
}

function competitionCard(comp) {
  return `
    <button class="competition-card" style="${compStyle(comp)}" data-go="competition/${esc(comp.id)}">
      <span class="competition-card__mark">${comp.logo ? `<img src="${esc(safeUrl(comp.logo))}" alt="" loading="lazy" decoding="async" />` : icon(comp.icon || "trophy")}</span>
      <span class="competition-card__name">${esc(comp.name)}</span>
      <span class="competition-card__meta">${icon("globe")} ${esc(comp.country)} <span>•</span> ${esc(comp.type)}</span>
    </button>`;
}

function teamChip(team) {
  return `
    <button class="team-chip" data-go="team/${esc(team.id)}">
      ${teamCrest(team)}
      <span class="team-chip__name">${esc(team.name)}</span>
    </button>`;
}

function teamCard(team) {
  return `
    <div class="team-card">
      <button data-go="team/${esc(team.id)}" aria-label="${esc(team.name)}">${teamCrest(team)}</button>
      <button class="team-card__body" data-go="team/${esc(team.id)}">
        <div class="team-card__name">${esc(team.name)}</div>
        <div class="team-card__meta">${icon("location")} ${esc(team.city)} <span>•</span> ${esc(team.stadium)}</div>
      </button>
      ${saveButton("team", team.id)}
    </div>`;
}
