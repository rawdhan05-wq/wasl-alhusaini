/* وصل الحسيني — Service Worker
   تخزين هيكل التطبيق والصور والخطوط للعمل دون اتصال. */
const CACHE = "wasl-alhusaini-v1.21.0";
const CLUB_LOGO_FILES = [
  "abha", "aek-athens", "al-ahli", "al-ettifaq", "al-faisaly-fc", "al-fateh",
  "al-fayha", "algeria-national-team", "al-hazem", "al-hilal", "al-ittihad",
  "al-khaleej", "al-kholood", "al-nassr", "al-qadsiah", "al-riyadh", "al-shabab",
  "al-taawoun", "angers", "argentina-national-team", "arsenal", "as-monaco",
  "aston-villa", "atalanta", "athletic-club", "atletico-madrid", "augsburg",
  "australia-national-team", "austria-national-team", "auxerre", "barcelona",
  "bayer-leverkusen", "bayern-munchen", "belgium-national-team", "bodo-glimt",
  "bologna", "borussia-dortmund", "borussia-monchengladbach",
  "bosnia-and-herzegovina-national-team", "bournemouth", "brazil-national-team",
  "brentford", "brest", "brighton", "cabo-verde-national-team", "cagliari",
  "canada-national-team", "celta", "chelsea", "club-brugge",
  "colombia-national-team", "como-1907", "congo-dr-national-team",
  "cote-d-ivoire-national-team", "coventry-city", "croatia-national-team",
  "crystal-palace", "curacao-national-team", "czech-republic-national-team",
  "deportivo", "deportivo-la-coruna", "diriyah-club", "dutch-national-team",
  "ecuador-national-team", "egypt-national-team", "eintracht-frankfurt", "elche",
  "england-national-team", "espanyol", "everton", "fc-porto", "fenerbahce",
  "feyenoord", "fiorentina", "france-national-team", "freiburg", "frosinone",
  "fulham", "galatasaray", "genoa", "germany-national-team", "getafe",
  "ghana-national-team", "haiti-national-team", "hamburger-sv", "hoffenheim",
  "hull-city", "inter", "ipswich", "iran-national-team", "iraq-national-team",
  "japan-national-team", "jordan-national-team", "juventus", "koln", "lask",
  "lazio", "lecce", "leeds-united", "le-havre-ac", "le-mans", "levante", "lille",
  "liverpool", "lorient", "lyon", "mainz-05", "malaga", "manchester-city",
  "manchester-united", "marseille", "mexico-national-team", "milan", "monza",
  "morocco-national-team", "napoli", "neom", "newcastle",
  "new-zealand-national-team", "nice", "norway-national-team",
  "nottingham-forest", "osasuna", "paderborn", "panama-national-team",
  "paraguay-national-team", "paris-fc", "paris-saint-germain", "parma",
  "portuguese-football-federation", "psv", "qatar-national-team", "racing",
  "rayo-vallecano", "rb-leipzig", "rc-lens", "rc-strasbourg-alsace",
  "real-betis", "real-madrid", "real-sociedad", "rennes", "roma", "sabah",
  "sassuolo", "saudi-arabia-national-team", "s-bratislava", "schalke-04",
  "scotland-national-team", "senegal-national-team", "sevilla", "shakhtar",
  "slavia-praha", "south-africa-national-team", "south-korea-national-team",
  "spain-national-team", "sporting-cp", "sunderland", "sv-elversberg",
  "sweden-national-team", "switzerland-national-team", "torino", "tottenham",
  "toulouse", "troyes", "tunisia-national-team", "turkey-national-team",
  "udinese", "union-berlin", "uruguay-national-team", "usa-national-team",
  "uzbekistan-national-team", "valencia", "venezia", "vfb-stuttgart", "viking",
  "villarreal", "werder-bremen", "bahrain-national-team", "comoros-national-team",
  "djibouti-national-team", "kuwait-national-team", "lebanon-national-team",
  "libya-national-team", "mauritania-national-team", "oman-national-team",
  "palestine-national-team", "somalia-national-team", "sudan-national-team",
  "syria-national-team", "uae-national-team", "yemen-national-team"
].map((slug) => `./assets/logos/clubs/${slug}.png`);
const YEMEN_LOGO_FILES = [
  "shaab-hadramout", "tadamun", "alsadd", "ahli-sanaa", "wahda-sanaa",
  "fahman", "yarmouk", "mukalla", "oruba", "ittihad-ibb",
  "ittihad-hadramout", "hilal-hodeidah", "salam-gharfa", "shabab-bayda"
].map((slug) => `./assets/logos/clubs/yemen/${slug}.png`);
const LEAGUE_LOGO_FILES = [
  "saudi", "yemen", "ucl", "epl", "laliga", "seriea", "bundesliga", "ligue1",
  "worldcup", "egypt", "algeria", "uae", "morocco", "syria", "iraq", "afcon",
  "asian-cup", "gulf-cup", "arab-cup", "arab-club", "asia-elite", "egypt-cup"
].map((slug) => `./assets/logos/leagues/${slug}.png`);
const APP_SHELL = [
  "./",
  "./index.html",
  "./install.html",
  "./styles.css",
  "./styles-light.css",
  "./data.js",
  "./icons.js",
  "./core.js",
  "./screens-main.js",
  "./screens-extra.js",
  "./admin.js",
  "./api.js",
  "./provider-365.js",
  "./provider-fotmob.js",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/favicon-32.png",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/logo-mark.svg",
  "./assets/ball-3d.svg",
  "./assets/logos/hilal.svg",
  "./assets/logos/nassr.svg",
  "./assets/logos/ittihad.svg",
  "./assets/logos/ahli.svg",
  "./assets/logos/real.svg",
  "./assets/logos/barca.svg",
  "./assets/logos/mancity.svg",
  "./assets/logos/liverpool.svg",
  "./assets/logos/shaab-ibb.svg",
  "./assets/logos/ahli-sanaa.svg",
  "./assets/logos/hilal-hodeidah.svg",
  "./assets/logos/ittihad-ibb.svg",
  "./assets/logos/mukalla.svg",
  "./assets/logos/oruba.svg",
  "./assets/logos/shaab-hadramout.svg",
  "./assets/logos/wahda-sanaa.svg",
  "./assets/logos/yarmouk.svg",
  "./assets/logos/fahman.svg",
  "./assets/logos/ittihad-hadramout.svg",
  "./assets/logos/salam-gharfa.svg",
  "./assets/logos/shabab-bayda.svg",
  "./assets/logos/tadamun.svg",
  "./assets/fonts/Cairo-Regular.ttf",
  "./assets/fonts/Cairo-Bold.ttf",
  "./assets/fonts/Cairo-Black.ttf",
  "./assets/images/hero.jpg",
  "./assets/images/training.jpg",
  "./assets/images/players.jpg",
  "./assets/images/ball.jpg",
  "./assets/images/fans.jpg",
  "./assets/images/action.jpg",
  "./assets/images/academy/dribbling.svg",
  "./assets/images/academy/agility.svg",
  "./assets/images/academy/shooting.svg",
  "./assets/images/academy/passing.svg",
  "./assets/images/academy/control.svg",
  "./assets/images/academy/team.svg",
  "./assets/images/academy/warmup.svg",
  ...CLUB_LOGO_FILES,
  ...YEMEN_LOGO_FILES,
  ...LEAGUE_LOGO_FILES
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const url = new URL(request.url);
          const isIndex = url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
          if (response && response.ok && isIndex) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          }
          if (!response || !response.ok) {
            return caches.match("./index.html").then((cached) => cached || response);
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        fetch(request)
          .then((response) => {
            if (response && response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          })
          .catch(() => {});
        return cached;
      }
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
