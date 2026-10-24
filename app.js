// ============================================================================
// شبكة البوصلة الإخبارية — محرك الموقع العام (النسخة النهائية الكاملة في ملف واحد)
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1. إعدادات الاتصال بقاعدة البيانات (مع حماية ضد أي بيانات تالفة في الذاكرة)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAd4Df_Fpp2GlGkRPyvmKuFW68LbL_a4yU",
  authDomain: "rawi-01.firebaseapp.com",
  projectId: "rawi-01",
  storageBucket: "rawi-01.firebasestorage.app",
  messagingSenderId: "91203142966",
  appId: "1:91203142966:web:a44f7c06c98529a57a9f97",
  measurementId: "G-2VNWNSZLBJ"
};

function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem("bosla_custom_firebase_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.apiKey === "string" &&
        parsed.apiKey.length > 10 &&
        typeof parsed.projectId === "string" &&
        parsed.projectId.length > 2
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Using default Firebase configuration.");
  }
  return DEFAULT_FIREBASE_CONFIG;
}

let app;
let db;
try {
  app = initializeApp(getActiveFirebaseConfig());
  db = getFirestore(app);
} catch (err) {
  app = initializeApp(DEFAULT_FIREBASE_CONFIG, "fallbackApp");
  db = getFirestore(app);
}

// 2. الثوابت والأغلفة الزجاجية المدمجة برمجياً (بدون أي روابط خارجية)
const SETTINGS_CACHE_KEY = "bosla_public_settings_final_v3";
const SESSION_VIEWS_KEY = "bosla_session_viewed_posts";
const SESSION_ADS_KEY = "bosla_session_tracked_ads";

const BLANK_SURFACE_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360' viewBox='0 0 600 360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%230f172a'/><stop offset='100%' stop-color='%231e293b'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)'/><circle cx='300' cy='180' r='42' fill='none' stroke='%233b82f6' stroke-width='2' stroke-opacity='0.35'/><polygon points='300,148 312,188 300,178 288,188' fill='%233b82f6' fill-opacity='0.5'/></svg>";

const BLANK_AVATAR_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='100%' height='100%' rx='60' fill='%231e293b'/><circle cx='60' cy='45' r='22' fill='%23475569'/><path d='M24 106 C24 76 96 76 96 106' fill='%23475569'/></svg>";

// 3. دوال الحماية الأمنية والتعامل الآمن مع عناصر الصفحة
const $ = (id) => document.getElementById(id);

const safeOn = (id, event, handler) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
};

const setText = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? "";
};

const setHtml = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val ?? "";
};

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(url, fallback = "") {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed;
  }
  return fallback;
}

function hasSessionRecord(storageKey, itemId) {
  try {
    const list = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
    return Array.isArray(list) && list.includes(itemId);
  } catch (e) {
    return false;
  }
}

function addSessionRecord(storageKey, itemId) {
  try {
    const list = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
    if (Array.isArray(list) && !list.includes(itemId)) {
      list.push(itemId);
      sessionStorage.setItem(storageKey, JSON.stringify(list));
    }
  } catch (e) {}
}

// 4. الحالة المركزية والأقسام الافتراضية
const FALLBACK_CATEGORIES = [
  { name: "محلية", slug: "local", icon: "location_on", order: 1, visible: true, subcategories: ["السياسة اليمنية", "شؤون المحافظات"] },
  { name: "دولية", slug: "world", icon: "public", order: 2, visible: true, subcategories: ["الشرق الأوسط", "السياسة الدولية"] },
  { name: "تحقيقات وتقارير", slug: "reports", icon: "policy", order: 3, visible: true, subcategories: ["ملفات خاصة", "تقارير معمقة"] },
  { name: "حوارات", slug: "interviews", icon: "forum", order: 4, visible: true, subcategories: [] },
  { name: "المقالات", slug: "articles", icon: "edit_note", order: 5, visible: true, subcategories: [] },
  { name: "نافذة التقنية", slug: "tech", icon: "memory", order: 6, visible: true, subcategories: [] },
  { name: "الثقافة والفن", slug: "culture", icon: "theater_comedy", order: 7, visible: true, subcategories: [] }
];

let siteSettings = {
  siteName: "الصحافة من  ",
  networkName: "شبكة البوصلة",
  siteDesc: "منصة إخبارية وتحليلية ترصد كواليس السياسة والتقنية والثقافة",
  logoUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  hideTextLogo: true,
  accentColor: "#3b82f6",
  showAboutMenu: true,
  aboutContent: "",
  privacyContent: "",
  contactEmail: "",
  contactPhone: "",
  socialWhatsapp: "",
  socialTelegram: "",
  socialX: "",
  socialFacebook: "",
  adsEnabled: false,
  customAdText: "",
  customAdLink: ""
};

try {
  const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed && typeof parsed === "object") {
      siteSettings = { ...siteSettings, ...parsed };
    }
  }
} catch (e) {}

let publishedPosts = [];
let staffDirectory = {};
let categories = [...FALLBACK_CATEGORIES];
let activeAds = [];
let selectedCategory = "all";
let selectedSubcategory = "all";
let searchQuery = "";
let breakingNewsList = [];
let breakingCurrentIndex = 0;
let breakingIntervalId = null;

// 5. تفعيل جميع الأزرار والتفاعلات فوراً
function bindImmediateUIEvents() {
  try {
    $("lang-toggle-btn")?.remove();
    $("translation-status-bar")?.remove();
    initTheme();
    applyIdentitySettings();
    renderCategoriesNav();
    renderSidebarMenu();
    updateMobileNavPill();

    safeOn("open-sidebar-btn", "click", openSidebarDrawer);
    safeOn("close-sidebar-btn", "click", closeSidebarDrawer);
    safeOn("sidebar-backdrop", "click", closeSidebarDrawer);
    safeOn("theme-toggle-btn", "click", toggleTheme);

    safeOn("search-toggle-btn", "click", () => {
      const drawer = $("search-drawer");
      if (!drawer) return;
      drawer.classList.toggle("hidden");
      if (!drawer.classList.contains("hidden")) {
        $("global-search-input")?.focus();
      }
    });

    safeOn("close-search-btn", "click", () => {
      $("search-drawer")?.classList.add("hidden");
      searchQuery = "";
      const inp = $("global-search-input");
      if (inp) inp.value = "";
      renderHomeFeed();
    });

    safeOn("global-search-input", "input", (e) => {
      searchQuery = (e.target.value || "").trim();
      showView("view-home");
      renderHomeFeed();
    });

    safeOn("breaking-next-btn", "click", () => stepBreakingNews(1));
    safeOn("breaking-prev-btn", "click", () => stepBreakingNews(-1));

    safeOn("home-brand-link", "click", (e) => {
      e.preventDefault();
      selectedCategory = "all";
      selectedSubcategory = "all";
      searchQuery = "";
      const inp = $("global-search-input");
      if (inp) inp.value = "";
      $("search-drawer")?.classList.add("hidden");
      window.history.pushState({}, "", "./");
      renderCategoriesNav();
      renderSidebarMenu();
      renderSubcategoriesBar();
      showView("view-home");
      renderHomeFeed();
    });

    ["back-to-home-btn", "author-back-btn", "static-back-btn"].forEach((btnId) => {
      safeOn(btnId, "click", () => {
        window.history.pushState({}, "", "./");
        applyIdentitySettings();
        showView("view-home");
        renderHomeFeed();
      });
    });

    document.querySelectorAll(".mob-nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mob-nav-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        updateMobileNavPill();

        const action = btn.dataset.action;
        if (action === "home") {
          $("home-brand-link")?.click();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (action === "trending") {
          showView("view-home");
          document.querySelector(".trending-widget")?.scrollIntoView({ behavior: "smooth" });
        } else if (action === "search") {
          $("search-drawer")?.classList.remove("hidden");
          $("global-search-input")?.focus();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (action === "theme") {
          toggleTheme();
        }
      });
    });

    window.addEventListener("resize", updateMobileNavPill);
    window.addEventListener("popstate", handleUrlRouting);
  } catch (err) {
    console.error("UI Binding Notice:", err);
  }
}

function initTheme() {
  const saved = localStorage.getItem("bosla_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  setText("theme-icon", saved === "dark" ? "light_mode" : "dark_mode");
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("bosla_theme", next);
  setText("theme-icon", next === "dark" ? "light_mode" : "dark_mode");
}

function updateMobileNavPill() {
  const activeBtn = document.querySelector("#mobile-bottom-nav .mob-nav-btn.active");
  const indicator = $("mob-nav-indicator");
  if (!activeBtn || !indicator) return;
  indicator.style.width = `${activeBtn.offsetWidth}px`;
  indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
}

function openSidebarDrawer() {
  $("sidebar-drawer")?.classList.add("open");
  $("sidebar-backdrop")?.classList.remove("hidden");
}

function closeSidebarDrawer() {
  $("sidebar-drawer")?.classList.remove("open");
  $("sidebar-backdrop")?.classList.add("hidden");
}

// 6. جلب وتطبيق الهوية البصرية والشعار المعتمد من غرفة العمليات
async function fetchSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "global"));
    if (snap.exists()) {
      const data = snap.data();
      siteSettings = {
        ...siteSettings,
        ...data,
        logoUrl: sanitizeUrl(data.logoUrl, ""),
        faviconUrl: sanitizeUrl(data.faviconUrl || data.logoUrl, ""),
        ogImageUrl: sanitizeUrl(data.ogImageUrl || data.faviconUrl || data.logoUrl, "")
      };
      try {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(siteSettings));
      } catch (e) {}
    }
  } catch (err) {
    console.warn("Settings fetch notice:", err);
  }
}

function applyIdentitySettings() {
  const activeLogo = sanitizeUrl(siteSettings.logoUrl, "");
  const activeFavicon = sanitizeUrl(siteSettings.faviconUrl || activeLogo, "");
  const activeOgImage = sanitizeUrl(siteSettings.ogImageUrl || activeFavicon, "");
  const displaySiteName = siteSettings.siteName || "بوصلة السياسة اليمنية";
  const displayNetName = siteSettings.networkName || "شبكة البوصلة";

  document.title = `${displaySiteName} | ${displayNetName}`;
  $("meta-desc")?.setAttribute("content", siteSettings.siteDesc || "");
  $("og-title")?.setAttribute("content", `${displaySiteName} | ${displayNetName}`);
  $("og-desc")?.setAttribute("content", siteSettings.siteDesc || "");

  if (activeOgImage) {
    $("og-image")?.setAttribute("content", activeOgImage);
    $("twitter-image")?.setAttribute("content", activeOgImage);
  }

  if (activeFavicon) {
    if ($("dynamic-favicon")) $("dynamic-favicon").href = activeFavicon;
    if ($("apple-favicon")) $("apple-favicon").href = activeFavicon;
  }

  ["custom-logo-img", "sidebar-logo-img", "footer-logo-img"].forEach((id) => {
    const img = $(id);
    if (!img) return;
    if (activeLogo) {
      if (img.src !== activeLogo) img.src = activeLogo;
      img.alt = displaySiteName;
      img.style.opacity = "1";
      img.style.visibility = "visible";
      img.classList.remove("hidden");
    } else {
      img.style.opacity = "0";
      img.classList.add("hidden");
    }
  });

  const shouldHideText = activeLogo ? siteSettings.hideTextLogo !== false : false;
  $("brand-text-wrap")?.classList.toggle("hidden", shouldHideText);

  setText("ui-site-name", displaySiteName);
  setText("ui-network-name", displayNetName);
  setText("footer-site-name", displaySiteName);
  setText("footer-site-desc", siteSettings.siteDesc || "");
  setHtml(
    "ui-copyright-text",
    `© جميع الحقوق محفوظة — <b id="footer-network-copy">${escapeHTML(displayNetName)}</b>`
  );

  if (siteSettings.accentColor && /^#[0-9A-Fa-f]{3,8}$/.test(siteSettings.accentColor.trim())) {
    document.documentElement.style.setProperty("--accent", siteSettings.accentColor.trim());
  }

  const socialItems = [
    { url: siteSettings.socialWhatsapp, label: "WhatsApp" },
    { url: siteSettings.socialTelegram, label: "Telegram" },
    { url: siteSettings.socialX, label: "X" },
    { url: siteSettings.socialFacebook, label: "Facebook" }
  ];

  const linksHtml = socialItems
    .map((item) => {
      const safe = sanitizeUrl(item.url, "");
      return safe
        ? `<a href="${escapeHTML(safe)}" target="_blank" rel="noopener" class="social-pill">${item.label}</a>`
        : "";
    })
    .filter(Boolean)
    .join("");

  setHtml("footer-social-links", linksHtml);
  setHtml("sidebar-social-links", linksHtml);
}

// 7. جلب الأقسام وبناء القوائم
async function fetchCategories() {
  try {
    const snap = await getDocs(collection(db, "categories"));
    if (!snap.empty) {
      const all = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
      const visibleList = all.filter((c) => c.visible !== false);
      if (visibleList.length > 0) categories = visibleList;
    }
  } catch (err) {
    console.warn("Categories fetch notice:", err);
  }
}

function renderCategoriesNav() {
  const nav = $("categories-nav-list");
  if (!nav) return;

  const itemsHtml = categories
    .map(
      (c) => `
      <button type="button" class="cat-pill ${selectedCategory === c.slug ? "active" : ""}" data-cat="${escapeHTML(c.slug)}">
        <span class="material-symbols-rounded" translate="no">${escapeHTML(c.icon || "newspaper")}</span>
        <span>${escapeHTML(c.name)}</span>
      </button>
    `
    )
    .join("");

  nav.innerHTML = `
    <button type="button" class="cat-pill ${selectedCategory === "all" ? "active" : ""}" data-cat="all">
      <span class="material-symbols-rounded" translate="no">home</span>
      <span>الرئيسية</span>
    </button>
    ${itemsHtml}
  `;

  nav.querySelectorAll(".cat-pill").forEach((btn) => {
    btn.addEventListener("click", () => selectCategoryAndRender(btn.dataset.cat));
  });
}

function renderSidebarMenu() {
  const list = $("sidebar-menu-list");
  if (!list) return;
  const items = [];

  if (siteSettings.showAboutMenu !== false) {
    items.push(`
      <li class="sidebar-menu-item">
        <button type="button" class="sidebar-menu-btn" data-static-page="about">
          <span>من نحن</span>
          <span class="material-symbols-rounded" translate="no">info</span>
        </button>
      </li>
    `);
  }

  categories.forEach((c) => {
    items.push(`
      <li class="sidebar-menu-item">
        <button type="button" class="sidebar-menu-btn ${selectedCategory === c.slug ? "active" : ""}" data-side-cat="${escapeHTML(c.slug)}">
          <span>${escapeHTML(c.name)}</span>
          <span class="material-symbols-rounded" translate="no">${escapeHTML(c.icon || "chevron_left")}</span>
        </button>
      </li>
    `);
  });

  if (siteSettings.showAboutMenu !== false) {
    items.push(`
      <li class="sidebar-menu-item">
        <button type="button" class="sidebar-menu-btn" data-static-page="privacy">
          <span>سياسة الخصوصية</span>
          <span class="material-symbols-rounded" translate="no">verified_user</span>
        </button>
      </li>
    `);
  }

  list.innerHTML = items.join("");

  list.querySelectorAll("[data-side-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeSidebarDrawer();
      selectCategoryAndRender(btn.dataset.sideCat);
    });
  });

  list.querySelectorAll("[data-static-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeSidebarDrawer();
      window.openStaticPage(btn.dataset.staticPage);
    });
  });
}

function selectCategoryAndRender(catSlug) {
  selectedCategory = catSlug || "all";
  selectedSubcategory = "all";
  renderCategoriesNav();
  renderSidebarMenu();
  showView("view-home");
  window.history.pushState({}, "", "./");
  renderSubcategoriesBar();
  renderHomeFeed();
}

function renderSubcategoriesBar() {
  const bar = $("subcategories-bar");
  if (!bar) return;

  if (selectedCategory === "all") {
    bar.classList.add("hidden");
    return;
  }

  const catObj = categories.find((c) => c.slug === selectedCategory);
  const subs = Array.isArray(catObj?.subcategories) ? catObj.subcategories : [];
  if (subs.length === 0) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");
  bar.innerHTML = `
    <button type="button" class="sub-pill ${selectedSubcategory === "all" ? "active" : ""}" data-sub="all">الكل في ${escapeHTML(catObj.name)}</button>
    ${subs.map((s) => `<button type="button" class="sub-pill ${selectedSubcategory === s ? "active" : ""}" data-sub="${escapeHTML(s)}">${escapeHTML(s)}</button>`).join("")}
  `;

  bar.querySelectorAll(".sub-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      selectedSubcategory = pill.dataset.sub;
      renderSubcategoriesBar();
      renderHomeFeed();
    });
  });
}

// 8. جلب دليل الصحفيين والتوثيق (Staff Profiles & Verified Badges)
async function fetchStaffDirectory() {
  try {
    const snap = await getDocs(collection(db, "staff"));
    const map = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      const emailKey = d.id.toLowerCase().trim();
      map[emailKey] = { email: emailKey, ...data };
      if (data.name) map[data.name.trim()] = { email: emailKey, ...data };
      if (data.displayName) map[data.displayName.trim()] = { email: emailKey, ...data };
    });
    staffDirectory = map;
  } catch (err) {
    console.warn("Staff directory fetch notice:", err);
  }
}

function getAuthorMeta(post) {
  const emailKey = (post.authorEmail || "").toLowerCase().trim();
  const nameKey = (post.author || "").trim();
  const staff = staffDirectory[emailKey] || staffDirectory[nameKey] || {};

  const isSovereign =
    emailKey === "a1hmedrashad@gmail.com" ||
    emailKey === "rawialshamal@gmail.com";

  const verified = isSovereign || Boolean(staff.verified) || Boolean(post.authorVerified);
  const avatarUrl = sanitizeUrl(
    staff.avatarUrl || post.authorAvatar || siteSettings.faviconUrl || siteSettings.logoUrl,
    BLANK_AVATAR_SVG
  );
  const bio = staff.bio || post.authorBio || "";
  const jobTitle = staff.jobTitle || post.authorJobTitle || "";
  const socialX = sanitizeUrl(staff.socialX, "");
  const socialFb = sanitizeUrl(staff.socialFb, "");

  return { verified, avatarUrl, bio, jobTitle, socialX, socialFb };
}

// 9. جلب وعرض الرعايات والإعلانات الذكية
async function fetchAds() {
  try {
    const snap = await getDocs(collection(db, "ads"));
    activeAds = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => a.active !== false);
  } catch (err) {
    console.warn("Ads fetch notice:", err);
  }
}

function getAdForPlacement(placementKey) {
  const matching = activeAds.filter(
    (a) => a.placement === placementKey || a.placement === "all"
  );
  if (matching.length === 0) return null;
  return matching[Math.floor(Math.random() * matching.length)];
}

async function trackAdImpression(adId) {
  if (!adId || hasSessionRecord(SESSION_ADS_KEY, `view_${adId}`)) return;
  addSessionRecord(SESSION_ADS_KEY, `view_${adId}`);
  try {
    await updateDoc(doc(db, "ads", adId), { views: increment(1) });
  } catch (e) {}
}

window.handleAdClick = async (adId) => {
  if (!adId || hasSessionRecord(SESSION_ADS_KEY, `click_${adId}`)) return;
  addSessionRecord(SESSION_ADS_KEY, `click_${adId}`);
  try {
    await updateDoc(doc(db, "ads", adId), { clicks: increment(1) });
  } catch (e) {}
};

function buildSmartAdHTML(ad, domWrapperId) {
  if (!ad) return "";
  trackAdImpression(ad.id);

  const thumb = sanitizeUrl(
    ad.imageUrl || siteSettings.logoUrl || siteSettings.faviconUrl,
    BLANK_SURFACE_SVG
  );
  const safeTarget = sanitizeUrl(ad.targetUrl, "#");
  const safeTitle = escapeHTML(ad.title || "إعلان ممول");
  const safeSponsor = escapeHTML(ad.sponsorName || "شريك البوصلة");
  const safeAdId = escapeHTML(ad.id);
  const safeDomId = escapeHTML(domWrapperId);

  if (ad.adStyle === "banner") {
    return `
      <div class="leaderboard-ad-banner" id="${safeDomId}">
        <button type="button" class="glass-ad-close leaderboard-close-float" onclick="document.getElementById('${safeDomId}')?.remove()">
          <span class="material-symbols-rounded" translate="no" style="font-size:16px;">close</span>
        </button>
        <a href="${escapeHTML(safeTarget)}" target="_blank" rel="noopener sponsored" class="leaderboard-ad-link" onclick="window.handleAdClick('${safeAdId}')">
          <img src="${escapeHTML(thumb)}" alt="${safeTitle}" class="leaderboard-ad-img" loading="lazy">
          <div class="leaderboard-ad-bar">
            <span><strong style="color:var(--sponsor-gold)">✨ رعاية وإعلان</strong> • ${safeTitle}</span>
            <span>الراعي الرسمي: ${safeSponsor} ↗</span>
          </div>
        </a>
      </div>
    `;
  }

  return `
    <div class="glass-ad-banner" id="${safeDomId}">
      <a href="${escapeHTML(safeTarget)}" target="_blank" rel="noopener sponsored" class="glass-ad-clickable" onclick="window.handleAdClick('${safeAdId}')">
        <img src="${escapeHTML(thumb)}" alt="${safeSponsor}" class="glass-ad-thumb" loading="lazy">
        <div>
          <span class="glass-ad-tag">✨ رعاية وإعلان</span>
          <div class="glass-ad-title">${safeTitle}</div>
          <div class="glass-ad-sponsor">الراعي الرسمي: ${safeSponsor}</div>
        </div>
      </a>
      <button type="button" class="glass-ad-close" onclick="document.getElementById('${safeDomId}')?.remove()">
        <span class="material-symbols-rounded" translate="no" style="font-size:16px;">close</span>
      </button>
    </div>
  `;
}

function renderTopBannerAd() {
  const topSlot = $("ad-slot-top");
  if (!topSlot) return;

  const topAd = getAdForPlacement("top");
  if (topAd) {
    topSlot.innerHTML = buildSmartAdHTML(topAd, "ad-dom-top");
    return;
  }

  if (siteSettings.adsEnabled && siteSettings.customAdText) {
    const safeLink = sanitizeUrl(siteSettings.customAdLink, "#");
    topSlot.innerHTML = `
      <div class="glass-ad-banner" id="ad-dom-fallback">
        <a href="${escapeHTML(safeLink)}" target="_blank" rel="noopener" class="glass-ad-clickable">
          <div>
            <span class="glass-ad-tag">✨ رعاية وإعلان</span>
            <div class="glass-ad-title">${escapeHTML(siteSettings.customAdText)}</div>
          </div>
        </a>
        <button type="button" class="glass-ad-close" onclick="document.getElementById('ad-dom-fallback')?.remove()">
          <span class="material-symbols-rounded" translate="no" style="font-size:16px;">close</span>
        </button>
      </div>
    `;
  } else {
    topSlot.innerHTML = "";
  }
}

// 10. جلب المنشورات من قاعدة البيانات + شريط الأخبار العاجلة الدوّار
function getTimestampSeconds(ts) {
  if (!ts) return 0;
  if (typeof ts.seconds === "number") return ts.seconds;
  if (typeof ts === "number") return ts > 1e11 ? Math.floor(ts / 1000) : ts;
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
}

async function fetchPublishedPosts() {
  try {
    const snap = await getDocs(collection(db, "posts"));
    publishedPosts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => !p.status || p.status === "published")
      .sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt));

    renderBreakingTicker();
    renderTrendingSidebar();
  } catch (err) {
    console.error("Posts fetch error:", err);
  } finally {
    $("loading-skeleton")?.remove();
  }
}

function getPostCatName(post) {
  const catObj = categories.find((c) => c.slug === post.category);
  if (catObj) return catObj.name;
  return post.categoryName || post.category || "عام";
}

function renderBreakingTicker() {
  const wrap = $("breaking-ticker-wrap");
  if (!wrap) return;

  breakingNewsList = publishedPosts.filter((p) => p.isBreaking);
  if (breakingIntervalId) {
    clearInterval(breakingIntervalId);
    breakingIntervalId = null;
  }

  if (breakingNewsList.length === 0) {
    wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  breakingCurrentIndex = 0;
  renderCurrentBreakingItem();

  if (breakingNewsList.length > 1) {
    breakingIntervalId = setInterval(() => {
      stepBreakingNews(1);
    }, 6000);
  }
}

function renderCurrentBreakingItem() {
  const listEl = $("breaking-list");
  const counterEl = $("breaking-counter");
  if (!listEl || breakingNewsList.length === 0) return;

  const currentPost = breakingNewsList[breakingCurrentIndex] || breakingNewsList[0];
  if (counterEl) {
    counterEl.textContent = `${breakingCurrentIndex + 1}/${breakingNewsList.length}`;
  }

  const safeId = escapeHTML(currentPost.id);
  const safeTitle = escapeHTML(currentPost.title || "");

  listEl.innerHTML = `
    <a class="breaking-item" onclick="window.openArticle('${safeId}')">
      ⚡ ${safeTitle}
    </a>
  `;
}

function stepBreakingNews(direction = 1) {
  if (breakingNewsList.length <= 1) return;
  breakingCurrentIndex =
    (breakingCurrentIndex + direction + breakingNewsList.length) %
    breakingNewsList.length;
  renderCurrentBreakingItem();

  if (breakingIntervalId) {
    clearInterval(breakingIntervalId);
    breakingIntervalId = setInterval(() => stepBreakingNews(1), 6000);
  }
}

// 11. عرض الصفحة الرئيسية والبطاقات الذكية والأكثر قراءة
function renderHomeFeed() {
  const heroContainer = $("hero-section");
  const gridContainer = $("posts-grid");
  const feedHeading = $("feed-heading");
  const countBadge = $("search-count-badge");
  if (!gridContainer) return;

  $("loading-skeleton")?.remove();

  const filtered = publishedPosts.filter((post) => {
    if (selectedCategory !== "all" && post.category !== selectedCategory) return false;
    if (selectedSubcategory !== "all" && post.subcategory !== selectedSubcategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const haystack = [
        post.title,
        post.summary,
        post.content,
        post.author,
        post.categoryName,
        ...(Array.isArray(post.tags) ? post.tags : [])
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    }
    return true;
  });

  if (searchQuery) {
    if (countBadge) {
      countBadge.textContent = `${filtered.length}`;
      countBadge.classList.remove("hidden");
    }
  } else {
    countBadge?.classList.add("hidden");
  }

  if (filtered.length === 0) {
    if (heroContainer) heroContainer.innerHTML = "";
    gridContainer.innerHTML = `
      <div class="skeleton-card glass-surface">
        <span>لا توجد مواد صحفية منشورة في هذا القسم حالياً.</span>
      </div>
    `;
    return;
  }

  const catObj = categories.find((c) => c.slug === selectedCategory);
  if (feedHeading) {
    feedHeading.textContent = searchQuery
      ? `نتائج البحث الذكي عن: "${searchQuery}" (${filtered.length})`
      : selectedCategory === "all"
      ? "أحدث التحليلات والتقارير"
      : catObj?.name || "الأخبار";
  }

  const featuredPost = filtered.find((p) => p.isFeatured) || filtered[0];
  const remainingPosts = filtered.filter((p) => p.id !== featuredPost.id);

  if (heroContainer) {
    if (!searchQuery && featuredPost) {
      const heroImg = sanitizeUrl(
        featuredPost.imageUrl || siteSettings.ogImageUrl || siteSettings.logoUrl,
        BLANK_SURFACE_SVG
      );
      const authorMeta = getAuthorMeta(featuredPost);
      const safeId = escapeHTML(featuredPost.id);
      const safeTitle = escapeHTML(featuredPost.title || "");
      const safeSummary = escapeHTML(featuredPost.summary || "");
      const safeAuthor = escapeHTML(featuredPost.author || "هيئة التحرير");
      const safeCat = escapeHTML(getPostCatName(featuredPost));

      heroContainer.innerHTML = `
        <div class="hero-card glass-surface" onclick="window.openArticle('${safeId}')">
          <div class="hero-img-wrap">
            <img src="${escapeHTML(heroImg)}" alt="${safeTitle}" loading="eager">
          </div>
          <div class="hero-content">
            <div class="article-badges">
              <span class="badge-pill">${safeCat}</span>
            </div>
            <h2 class="hero-title">${safeTitle}</h2>
            <p class="hero-summary">${safeSummary}</p>
            <div class="card-footer">
              <span class="card-author-wrap">
                <img src="${escapeHTML(authorMeta.avatarUrl)}" alt="" class="card-author-avatar">
                <span>${safeAuthor}</span>
                ${authorMeta.verified ? `<span class="verified-badge" translate="no" title="صحفي موثق">verified</span>` : ""}
              </span>
              <span>${escapeHTML(formatDate(featuredPost.createdAt))}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      heroContainer.innerHTML = "";
    }
  }

  const listToRender = searchQuery ? filtered : remainingPosts;
  const cardsWithAds = [];
  const feedAd = getAdForPlacement("between_posts");

  listToRender.forEach((post, idx) => {
    cardsWithAds.push(createCardHTML(post));
    if (idx === 2 && feedAd) {
      cardsWithAds.push(`<div style="grid-column: 1 / -1;">${buildSmartAdHTML(feedAd, "ad-dom-feed")}</div>`);
    }
  });

  gridContainer.innerHTML = cardsWithAds.join("");
}

function createCardHTML(post) {
  const img = sanitizeUrl(
    post.imageUrl || siteSettings.ogImageUrl || siteSettings.logoUrl,
    BLANK_SURFACE_SVG
  );
  const type = post.postType || "article";
  const authorMeta = getAuthorMeta(post);

  let overlayIcon = "";
  if (type === "video" || type === "infographic") {
    overlayIcon = `<div class="media-overlay-icon" translate="no"><span class="material-symbols-rounded">play_arrow</span></div>`;
  } else if (type === "podcast") {
    overlayIcon = `<div class="media-overlay-icon" translate="no"><span class="material-symbols-rounded">headphones</span></div>`;
  } else if (type === "photos") {
    overlayIcon = `<div class="media-overlay-icon" translate="no"><span class="material-symbols-rounded">photo_library</span></div>`;
  }

  const safeId = escapeHTML(post.id);
  const safeTitle = escapeHTML(post.title || "");
  const safeSummary = escapeHTML(post.summary || "");
  const safeAuthor = escapeHTML(post.author || "هيئة التحرير");
  const safeCat = escapeHTML(getPostCatName(post));

  return `
    <article class="news-card glass-surface" onclick="window.openArticle('${safeId}')">
      <div class="card-thumb-wrap">
        <img src="${escapeHTML(img)}" alt="${safeTitle}" loading="lazy">
        <span class="card-cat-float">${safeCat}</span>
        ${overlayIcon}
      </div>
      <div class="card-body">
        <h3 class="card-title">${safeTitle}</h3>
        <p class="card-excerpt">${safeSummary}</p>
        <div class="card-footer">
          <span class="card-author-wrap">
            <img src="${escapeHTML(authorMeta.avatarUrl)}" alt="" class="card-author-avatar">
            <span>${safeAuthor}</span>
            ${authorMeta.verified ? `<span class="verified-badge" translate="no" title="صحفي موثق">verified</span>` : ""}
          </span>
          <span>${escapeHTML(formatDate(post.createdAt))}</span>
        </div>
      </div>
    </article>
  `;
}

function renderTrendingSidebar() {
  const listEl = $("trending-list");
  if (!listEl) return;

  const sorted = [...publishedPosts]
    .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
    .slice(0, 5);

  if (sorted.length === 0) {
    listEl.innerHTML = `<div style="color:var(--text-secondary);font-size:0.85rem;">لا توجد بيانات قراءة حالياً.</div>`;
    return;
  }

  listEl.innerHTML = sorted
    .map(
      (p, idx) => `
      <div class="trend-item" onclick="window.openArticle('${escapeHTML(p.id)}')">
        <span class="trend-rank" translate="no">${idx + 1}</span>
        <div>
          <div class="trend-title">${escapeHTML(p.title || "")}</div>
          <div class="trend-views">${Number(p.views) || 0} قراءة</div>
        </div>
      </div>
    `
    )
    .join("");
}

// 12. فتح قراءة المقال الكامل وتنسيق النصوص بأمان
function extractYouTubeEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}?rel=0` : null;
}

function formatSafeParagraph(rawLine) {
  const trimmed = rawLine.trim();
  if (!trimmed) return "";
  if (trimmed === "---") return `<hr>`;

  let safe = escapeHTML(trimmed);

  safe = safe
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[(.*?)\]\((.*?)\)/g, (_, label, rawHref) => {
      const cleanHref = sanitizeUrl(rawHref, "");
      if (!cleanHref) return label;
      return `<a href="${escapeHTML(cleanHref)}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700;">${label}</a>`;
    });

  if (safe.startsWith("### ")) return `<h3>${safe.slice(4)}</h3>`;
  if (safe.startsWith("## ")) return `<h2>${safe.slice(3)}</h2>`;
  if (safe.startsWith("&gt; ")) return `<blockquote>${safe.slice(5)}</blockquote>`;
  if (safe.startsWith("- ")) return `<p>• ${safe.slice(2)}</p>`;
  return `<p>${safe}</p>`;
}

window.openArticle = async (postId, pushHistory = true) => {
  const post = publishedPosts.find((p) => p.id === postId);
  if (!post) return;

  if (pushHistory) {
    window.history.pushState({ postId }, "", `?post=${encodeURIComponent(postId)}`);
  }

  const displayTitle = post.title || "";
  const displaySummary = post.summary || "";
  const displayBodyRaw = post.content || "";
  const displayAuthor = post.author || "هيئة التحرير";
  const displaySiteName = siteSettings.siteName || "بوصلة السياسة اليمنية";

  document.title = `${displayTitle} | ${displaySiteName}`;
  $("og-title")?.setAttribute("content", displayTitle);
  $("og-desc")?.setAttribute("content", displaySummary);

  const shareImage = sanitizeUrl(
    post.imageUrl || siteSettings.ogImageUrl || siteSettings.faviconUrl || siteSettings.logoUrl,
    ""
  );
  if (shareImage) {
    $("og-image")?.setAttribute("content", shareImage);
    $("twitter-image")?.setAttribute("content", shareImage);
  }

  const isFirstSessionView = !hasSessionRecord(SESSION_VIEWS_KEY, post.id);
  const currentViewsCount = (Number(post.views) || 0) + (isFirstSessionView ? 1 : 0);

  setHtml(
    "art-badges",
    `
      <span class="badge-pill">${escapeHTML(getPostCatName(post))}</span>
      ${post.subcategory ? `<span class="badge-pill">${escapeHTML(post.subcategory)}</span>` : ""}
    `
  );
  setText("art-title", displayTitle);
  setText("art-summary", displaySummary);
  setText("art-author", displayAuthor);
  setText("art-date", formatDate(post.createdAt));
  setText("art-views", currentViewsCount);

  const authorMeta = getAuthorMeta(post);
  if ($("art-author-avatar")) $("art-author-avatar").src = authorMeta.avatarUrl;
  $("art-author-verified")?.classList.toggle("hidden", !authorMeta.verified);

  const authorBtn = $("art-author-btn");
  if (authorBtn) {
    authorBtn.onclick = () => window.openAuthorProfile(displayAuthor, post.authorEmail || "");
  }

  const mediaSlot = $("art-media-slot");
  const type = post.postType || "article";
  const coverImg = sanitizeUrl(
    post.imageUrl || siteSettings.ogImageUrl || siteSettings.logoUrl,
    BLANK_SURFACE_SVG
  );

  if (mediaSlot) {
    if ((type === "video" || type === "infographic") && post.videoUrl) {
      const embedUrl = extractYouTubeEmbedUrl(post.videoUrl);
      if (embedUrl) {
        mediaSlot.innerHTML = `
          <div class="video-embed-wrap">
            <iframe src="${escapeHTML(embedUrl)}" title="${escapeHTML(displayTitle)}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
          </div>
        `;
      } else {
        mediaSlot.innerHTML = `<figure class="article-figure"><img src="${escapeHTML(coverImg)}" alt="${escapeHTML(displayTitle)}"></figure>`;
      }
    } else if (type === "podcast" && post.podcastUrl) {
      const safePodUrl = sanitizeUrl(post.podcastUrl, "#");
      const safePlatform = escapeHTML(post.podcastPlatform || "Podcast");
      const safeDuration = post.podcastDuration ? `(${escapeHTML(post.podcastDuration)})` : "";

      mediaSlot.innerHTML = `
        <div class="podcast-player-box">
          <div class="podcast-info-side">
            <img src="${escapeHTML(coverImg)}" alt="${escapeHTML(displayTitle)}" class="podcast-cover">
            <div>
              <span class="badge-pill">🎙️ ${safePlatform}</span>
              <h3 style="margin-top:6px;">حلقة بودكاست صوتية ${safeDuration}</h3>
            </div>
          </div>
          <a href="${escapeHTML(safePodUrl)}" target="_blank" rel="noopener" class="podcast-listen-btn">
            <span class="material-symbols-rounded" translate="no">headphones</span>
            <span>استمع للحلقة كاملة عبر ${safePlatform}</span>
          </a>
        </div>
      `;
    } else if (post.imageUrl) {
      const safePostImg = sanitizeUrl(post.imageUrl, BLANK_SURFACE_SVG);
      mediaSlot.innerHTML = `<figure class="article-figure"><img src="${escapeHTML(safePostImg)}" alt="${escapeHTML(displayTitle)}"></figure>`;
    } else {
      mediaSlot.innerHTML = "";
    }
  }

  const paragraphs = displayBodyRaw
    .split("\n")
    .map(formatSafeParagraph)
    .filter(Boolean);

  const inArticleAd = getAdForPlacement("in_article");
  if (inArticleAd && paragraphs.length >= 2) {
    paragraphs.splice(
      2,
      0,
      `<div class="ad-slot-wrapper">${buildSmartAdHTML(inArticleAd, "ad-dom-in-article")}</div>`
    );
  }

  setHtml("art-body", paragraphs.join(""));
  setHtml(
    "art-tags",
    (Array.isArray(post.tags) ? post.tags : [])
      .map((tag) => `<span class="tag-chip">#${escapeHTML(tag)}</span>`)
      .join("")
  );

  const shareUrl = window.location.href;
  const shareTitle = `${displayTitle} - ${displaySiteName}`;

  if ($("share-wa")) {
    $("share-wa").onclick = () =>
      window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + "\n" + shareUrl)}`, "_blank");
  }
  if ($("share-x")) {
    $("share-x").onclick = () =>
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
  }
  if ($("share-tg")) {
    $("share-tg").onclick = () =>
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
        "_blank"
      );
  }
  if ($("share-copy")) {
    $("share-copy").onclick = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showPublicToast("تم نسخ رابط المادة بنجاح");
      } catch (e) {
        showPublicToast("تعذر نسخ الرابط تلقائياً");
      }
    };
  }

  const related = publishedPosts
    .filter((p) => p.id !== post.id && p.category === post.category)
    .slice(0, 3);
  setHtml("related-grid", related.map(createCardHTML).join(""));

  showView("view-article");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (isFirstSessionView) {
    addSessionRecord(SESSION_VIEWS_KEY, post.id);
    post.views = currentViewsCount;
    try {
      await updateDoc(doc(db, "posts", post.id), { views: increment(1) });
    } catch (e) {}
  }
};

// 13. صفحة الملف الشخصي للكاتب / الصحفي الموثق
window.openAuthorProfile = async (authorName, authorEmail = "") => {
  const samplePost =
    publishedPosts.find(
      (p) =>
        (authorEmail && (p.authorEmail || "").toLowerCase() === authorEmail.toLowerCase()) ||
        p.author === authorName
    ) || { author: authorName, authorEmail };

  const meta = getAuthorMeta(samplePost);
  const authorPosts = publishedPosts.filter(
    (p) =>
      (authorEmail && (p.authorEmail || "").toLowerCase() === authorEmail.toLowerCase()) ||
      (p.author || "هيئة التحرير") === authorName
  );

  if ($("profile-author-avatar")) $("profile-author-avatar").src = meta.avatarUrl;
  setText("profile-author-name", authorName);
  $("profile-author-verified")?.classList.toggle("hidden", !meta.verified);
  setText("profile-author-job", meta.jobTitle || "");
  setText("profile-author-bio", meta.bio || "");
  setText("profile-author-count", `إجمالي المواد المنشورة: ${authorPosts.length}`);

  const socialHtml = [];
  if (meta.socialX) {
    socialHtml.push(`<a href="${escapeHTML(meta.socialX)}" target="_blank" rel="noopener" class="social-pill">X / Twitter</a>`);
  }
  if (meta.socialFb) {
    socialHtml.push(`<a href="${escapeHTML(meta.socialFb)}" target="_blank" rel="noopener" class="social-pill">الرابط الشخصي</a>`);
  }
  setHtml("profile-author-socials", socialHtml.join(""));

  setHtml("author-posts-grid", authorPosts.map(createCardHTML).join(""));
  showView("view-author");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// 14. فتح الصفحات القانونية الثابتة ("من نحن" و"سياسة الخصوصية")
window.openStaticPage = async (pageType) => {
  closeSidebarDrawer();
  window.history.pushState({ pageType }, "", `?page=${encodeURIComponent(pageType)}`);

  const displayNetName = siteSettings.networkName || "شبكة البوصلة";
  setText("static-page-badge", displayNetName);

  const isAbout = pageType === "about";
  const title = isAbout ? "من نحن" : "سياسة الخصوصية";
  const rawContent = isAbout
    ? siteSettings.aboutContent || `## من نحن\n\n${siteSettings.siteDesc || ""}`
    : siteSettings.privacyContent || `## سياسة الخصوصية\n\n${siteSettings.siteDesc || ""}`;

  setText("static-page-title", title);

  const html = rawContent
    .split("\n")
    .map(formatSafeParagraph)
    .filter(Boolean)
    .join("");

  const safeEmail = (siteSettings.contactEmail || "").trim();
  const safePhone = (siteSettings.contactPhone || "").trim();

  const contactBlock =
    safeEmail || safePhone
      ? `
    <hr>
    <h3>للتواصل والإعلانات الرسمية</h3>
    ${
      safeEmail
        ? `<p>📧 البريد الإلكتروني: <a href="mailto:${escapeHTML(safeEmail)}" style="color:var(--accent);font-weight:700;">${escapeHTML(safeEmail)}</a></p>`
        : ""
    }
    ${
      safePhone
        ? `<p>📞 واتساب / هاتف: <strong dir="ltr">${escapeHTML(safePhone)}</strong></p>`
        : ""
    }
  `
      : "";

  setHtml("static-page-body", html + contactBlock);
  showView("view-static");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// 15. التوجيه، الإشعارات، والتشغيل الرئيسي المدرّع ضد التعليق
function showView(viewId) {
  document.querySelectorAll(".view-section").forEach((v) => v.classList.add("hidden"));
  $(viewId)?.classList.remove("hidden");
}

function formatDate(ts) {
  const secs = getTimestampSeconds(ts);
  if (!secs) return "الآن";
  try {
    const d = new Date(secs * 1000);
    return d.toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (e) {
    return "الآن";
  }
}

function showPublicToast(msg) {
  const toast = $("public-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window._boslaToastTimer);
  window._boslaToastTimer = setTimeout(() => toast.classList.add("hidden"), 3500);
}

async function handleUrlRouting() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post");
  const pageId = params.get("page");

  if (postId && publishedPosts.some((p) => p.id === postId)) {
    await window.openArticle(postId, false);
  } else if (pageId === "about" || pageId === "privacy") {
    await window.openStaticPage(pageId);
  } else {
    showView("view-home");
    renderHomeFeed();
  }
}

async function initPublicSite() {
  bindImmediateUIEvents();

  try {
    await Promise.allSettled([
      fetchSettings(),
      fetchCategories(),
      fetchStaffDirectory(),
      fetchAds(),
      fetchPublishedPosts()
    ]);
  } catch (err) {
    console.error("Initialization error:", err);
  } finally {
    $("loading-skeleton")?.remove();
    applyIdentitySettings();
    renderCategoriesNav();
    renderSidebarMenu();
    renderTopBannerAd();
    await handleUrlRouting();
    setTimeout(updateMobileNavPill, 150);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPublicSite);
} else {
  initPublicSite();
}
