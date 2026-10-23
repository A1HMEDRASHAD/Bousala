import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  orderBy, 
  increment 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1. إعدادات Firebase الخاصة بشبكة البوصلة
const firebaseConfig = {
  apiKey: "AIzaSyAd4Df_Fpp2GlGkRPyvmKuFW68LbL_a4yU",
  authDomain: "rawi-01.firebaseapp.com",
  projectId: "rawi-01",
  storageBucket: "rawi-01.firebasestorage.app",
  messagingSenderId: "91203142966",
  appId: "1:91203142966:web:a44f7c06c98529a57a9f97",
  measurementId: "G-2VNWNSZLBJ"
};

const DEFAULT_LOGO = "https://i.ibb.co/BHHHLttP/image.png";
const DEFAULT_FAVICON = "https://i.ibb.co/WWSTnMgd/image.jpg";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. قاموس اللغتين الشامل (عربي / English)
const I18N = {
  ar: {
    home: "الرئيسية",
    breaking: "عاجل",
    latestFeed: "أحدث التحليلات والتقارير",
    trendingHeading: "الأكثر قراءة في البوصلة",
    searchPlaceholder: "ابحث بذكاء في العناوين، الملخصات، الكتّاب، أو الوسوم...",
    searchResultsFor: "نتائج البحث الذكي عن:",
    noPosts: "لا توجد مواد صحفية منشورة في هذا القسم حالياً.",
    backToNews: "العودة للأخبار",
    backToHome: "العودة للرئيسية",
    summaryLabel: "خلاصة البوصلة",
    shareLabel: "مشاركة المادة:",
    copyLink: "نسخ الرابط",
    linkCopied: "تم نسخ رابط المادة بنجاح",
    relatedHeading: "موضوعات ذات صلة",
    authorBadge: "قلم في شبكة البوصلة",
    authorTotalPosts: "إجمالي المواد المنشورة:",
    aboutUs: "من نحن",
    privacyPolicy: "سياسة الخصوصية",
    allInCat: "الكل في",
    sponsoredTag: "✨ رعاية وإعلان",
    sponsoredBy: "الراعي الرسمي:",
    listenOn: "استمع للحلقة كاملة عبر",
    podcastEpisode: "حلقة بودكاست صوتية",
    viewsUnit: "قراءة",
    mobHome: "الرئيسية",
    mobTrending: "الأكثر قراءة",
    mobSearch: "البحث",
    mobTheme: "المظهر",
    editorialTeam: "هيئة التحرير",
    rightsReserved: "© جميع الحقوق محفوظة —",
    contactUsHeader: "للتواصل والإعلانات الرسمية"
  },
  en: {
    home: "Home",
    breaking: "BREAKING",
    latestFeed: "Latest Reports & Analysis",
    trendingHeading: "Most Read on Compass",
    searchPlaceholder: "Smart search in titles, summaries, authors, or tags...",
    searchResultsFor: "Smart Search Results for:",
    noPosts: "No published articles available in this section yet.",
    backToNews: "Back to News",
    backToHome: "Back to Home",
    summaryLabel: "Executive Summary",
    shareLabel: "Share Article:",
    copyLink: "Copy Link",
    linkCopied: "Article link copied to clipboard",
    relatedHeading: "Related Coverage",
    authorBadge: "Contributor at Al-Bosla Network",
    authorTotalPosts: "Total Published Articles:",
    aboutUs: "About Us",
    privacyPolicy: "Privacy Policy",
    allInCat: "All in",
    sponsoredTag: "✨ Sponsored",
    sponsoredBy: "Sponsored by:",
    listenOn: "Listen to full episode on",
    podcastEpisode: "Podcast Episode",
    viewsUnit: "views",
    mobHome: "Home",
    mobTrending: "Trending",
    mobSearch: "Search",
    mobTheme: "Theme",
    editorialTeam: "Editorial Desk",
    rightsReserved: "© All Rights Reserved —",
    contactUsHeader: "Official Contact & Advertising"
  }
};

// متغيرات حالة الموقع العام
let currentLang = "ar";
let siteSettings = {
  siteName: "بوصلة السياسة اليمنية",
  siteNameEn: "Yemeni Politics Compass",
  networkName: "شبكة البوصلة",
  networkNameEn: "Al-Bosla Network",
  siteDesc: "منصة إخبارية وتحليلية ترصد كواليس السياسة والتقنية والثقافة",
  logoUrl: DEFAULT_LOGO,
  faviconUrl: DEFAULT_FAVICON,
  hideTextLogo: true,
  accentColor: "#3b82f6",
  showAboutMenu: true,
  aboutContent: "",
  aboutContentEn: "",
  privacyContent: "",
  contactEmail: "A1HMEDRASHAD@GMAIL.COM",
  contactPhone: "",
  adsEnabled: false,
  customAdText: "",
  customAdLink: ""
};

let publishedPosts = [];
let categories = [];
let activeAds = [];
let selectedCategory = "all";
let selectedSubcategory = "all";
let searchQuery = "";
const trackedAdImpressions = new Set();

function t(key) {
  return I18N[currentLang]?.[key] || I18N.ar[key] || key;
}

// 3. تهيئة الموقع عند التحميل
async function bootPublicSite() {
  initTheme();
  initLanguage();

  await Promise.all([
    fetchSettings(),
    fetchCategories(),
    fetchPublishedPosts(),
    fetchSponsoredAds()
  ]);

  applyLanguageAndIdentity();
  renderBreakingTicker();
  renderTopBannerAd();
  renderTrendingSidebar();
  handleUrlRouting();
  setTimeout(updateMobileNavPill, 150);
}

// 4. نظام اللغتين الذكي (رصد تلقائي للغة متصفح الزائر + زر تبديل فوري)
function initLanguage() {
  const savedLang = localStorage.getItem("bosla_lang");
  if (savedLang === "ar" || savedLang === "en") {
    currentLang = savedLang;
  } else {
    const browserLang = (navigator.language || navigator.userLanguage || "ar").toLowerCase();
    currentLang = browserLang.startsWith("ar") ? "ar" : "en";
  }
  applyDocumentDirection();
}

function applyDocumentDirection() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
  const label = document.getElementById("lang-toggle-label");
  if (label) label.textContent = currentLang === "ar" ? "EN" : "عربي";

  const arrowIcon = currentLang === "ar" ? "arrow_forward" : "arrow_back";
  document.querySelectorAll("#back-arrow-icon, #author-back-btn .material-symbols-rounded, #static-back-btn .material-symbols-rounded").forEach(el => {
    el.textContent = arrowIcon;
  });
}

document.getElementById("lang-toggle-btn").addEventListener("click", () => {
  currentLang = currentLang === "ar" ? "en" : "ar";
  localStorage.setItem("bosla_lang", currentLang);
  applyDocumentDirection();
  applyLanguageAndIdentity();
  renderCategoriesNav();
  renderSidebarMenu();
  renderSubcategoriesBar();
  renderBreakingTicker();
  renderTopBannerAd();
  renderTrendingSidebar();

  // إعادة تحديث الواجهة المفتوحة حالياً
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post");
  const pageId = params.get("page");
  if (postId && publishedPosts.some(p => p.id === postId)) {
    window.openArticle(postId, false);
  } else if (pageId) {
    window.openStaticPage(pageId, false);
  } else {
    renderHomeFeed();
  }
  setTimeout(updateMobileNavPill, 100);
});

// 5. جلب الإعدادات وتطبيق الهوية البصرية والشعار الأفقي
async function fetchSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "global"));
    if (snap.exists()) {
      const data = snap.data();
      siteSettings = {
        ...siteSettings,
        ...data,
        logoUrl: data.logoUrl || DEFAULT_LOGO,
        faviconUrl: data.faviconUrl || DEFAULT_FAVICON
      };
    }
  } catch (err) {
    console.warn("Settings notice:", err);
  }
}

function applyLanguageAndIdentity() {
  const activeLogo = siteSettings.logoUrl || DEFAULT_LOGO;
  const activeFavicon = siteSettings.faviconUrl || DEFAULT_FAVICON;
  const displaySiteName = currentLang === "en" ? (siteSettings.siteNameEn || siteSettings.siteName) : siteSettings.siteName;
  const displayNetName = currentLang === "en" ? (siteSettings.networkNameEn || siteSettings.networkName) : siteSettings.networkName;

  document.title = `${displaySiteName} | ${displayNetName}`;
  document.getElementById("meta-desc")?.setAttribute("content", siteSettings.siteDesc || "");
  document.getElementById("og-title")?.setAttribute("content", `${displaySiteName} | ${displayNetName}`);
  document.getElementById("og-desc")?.setAttribute("content", siteSettings.siteDesc || "");
  document.getElementById("og-image")?.setAttribute("content", activeLogo);

  const favEl = document.getElementById("dynamic-favicon");
  const appleFavEl = document.getElementById("apple-favicon");
  if (favEl) favEl.href = activeFavicon;
  if (appleFavEl) appleFavEl.href = activeFavicon;

  // تحديث الشعار في الترويسة، القائمة الجانبية، والتذييل
  ["custom-logo-img", "sidebar-logo-img", "footer-logo-img"].forEach(id => {
    const img = document.getElementById(id);
    if (img) {
      img.src = activeLogo;
      img.alt = displaySiteName;
    }
  });

  // إخفاء أو إظهار النص بجانب الشعار
  const brandTextWrap = document.getElementById("brand-text-wrap");
  if (brandTextWrap) {
    brandTextWrap.classList.toggle("hidden", siteSettings.hideTextLogo !== false);
  }

  document.getElementById("ui-site-name").textContent = displaySiteName;
  document.getElementById("ui-network-name").textContent = displayNetName;
  document.getElementById("footer-site-name").textContent = displaySiteName;
  document.getElementById("footer-site-desc").textContent = siteSettings.siteDesc;

  // ترجمة نصوص الواجهة الثابتة
  document.getElementById("ui-breaking-label").textContent = t("breaking");
  document.getElementById("global-search-input").placeholder = t("searchPlaceholder");
  document.getElementById("ui-trending-heading").textContent = t("trendingHeading");
  document.getElementById("ui-back-btn-text").textContent = t("backToNews");
  document.getElementById("ui-author-back-text").textContent = t("backToHome");
  document.getElementById("ui-static-back-text").textContent = t("backToHome");
  document.getElementById("ui-summary-label").textContent = t("summaryLabel");
  document.getElementById("ui-share-label").textContent = t("shareLabel");
  document.getElementById("ui-copy-link-label").textContent = t("copyLink");
  document.getElementById("ui-related-heading").textContent = t("relatedHeading");
  document.getElementById("ui-author-badge").textContent = t("authorBadge");
  document.getElementById("ui-footer-about").textContent = t("aboutUs");
  document.getElementById("ui-footer-privacy").textContent = t("privacyPolicy");
  document.getElementById("ui-copyright-text").innerHTML = `${t("rightsReserved")} <b id="footer-network-copy">${displayNetName}</b>`;

  document.getElementById("ui-mob-home").textContent = t("mobHome");
  document.getElementById("ui-mob-trending").textContent = t("mobTrending");
  document.getElementById("ui-mob-search").textContent = t("mobSearch");
  document.getElementById("ui-mob-theme").textContent = t("mobTheme");

  if (siteSettings.accentColor) {
    document.documentElement.style.setProperty("--accent", siteSettings.accentColor);
  }

  // روابط منصات التواصل في الفوتر والقائمة الجانبية
  const links = [];
  if (siteSettings.socialWhatsapp) links.push(`<a href="${siteSettings.socialWhatsapp}" target="_blank" rel="noopener" class="social-pill">WhatsApp</a>`);
  if (siteSettings.socialTelegram) links.push(`<a href="${siteSettings.socialTelegram}" target="_blank" rel="noopener" class="social-pill">Telegram</a>`);
  if (siteSettings.socialX) links.push(`<a href="${siteSettings.socialX}" target="_blank" rel="noopener" class="social-pill">X</a>`);
  if (siteSettings.socialFacebook) links.push(`<a href="${siteSettings.socialFacebook}" target="_blank" rel="noopener" class="social-pill">Facebook</a>`);

  document.getElementById("footer-social-links").innerHTML = links.join("");
  document.getElementById("sidebar-social-links").innerHTML = links.join("");
}

// 6. جلب الأقسام وبناء شريط الأقسام + القائمة الجانبية المرنة (Sidebar Drawer)
async function fetchCategories() {
  try {
    const snap = await getDocs(collection(db, "categories"));
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order || 99) - (b.order || 99));
    // إظهار الأقسام المفعلة فقط (visible !== false)
    categories = all.filter(c => c.visible !== false);
    renderCategoriesNav();
    renderSidebarMenu();
  } catch (err) {
    console.warn("Categories notice:", err);
  }
}

function getCatDisplayName(catObj) {
  if (!catObj) return "";
  return currentLang === "en" && catObj.nameEn ? catObj.nameEn : catObj.name;
}

function renderCategoriesNav() {
  const nav = document.getElementById("categories-nav-list");
  const itemsHtml = categories.map(c => `
    <button class="cat-pill ${selectedCategory === c.slug ? "active" : ""}" data-cat="${c.slug}">
      <span class="material-symbols-rounded">${c.icon || "newspaper"}</span>
      <span>${getCatDisplayName(c)}</span>
    </button>
  `).join("");

  nav.innerHTML = `
    <button class="cat-pill ${selectedCategory === "all" ? "active" : ""}" data-cat="all">
      <span class="material-symbols-rounded">home</span>
      <span>${t("home")}</span>
    </button>
    ${itemsHtml}
  `;

  nav.querySelectorAll(".cat-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      selectCategoryAndRender(btn.dataset.cat);
    });
  });
}

function renderSidebarMenu() {
  const list = document.getElementById("sidebar-menu-list");
  const items = [];

  // 1. قسم "من نحن" في أعلى القائمة الجانبية (إذا كان مفعلاً في غرفة العمليات)
  if (siteSettings.showAboutMenu !== false) {
    items.push(`
      <li class="sidebar-menu-item">
        <button type="button" class="sidebar-menu-btn" onclick="window.openStaticPage('about')">
          <span>${t("aboutUs")}</span>
          <span class="material-symbols-rounded">info</span>
        </button>
      </li>
    `);
  }

  // 2. كافة الأقسام المفعلة من غرفة العمليات (محلية، دولية، تحقيقات، حوارات، بودكاست، فيديو...)
  categories.forEach(c => {
    items.push(`
      <li class="sidebar-menu-item">
        <button type="button" class="sidebar-menu-btn ${selectedCategory === c.slug ? "active" : ""}" data-side-cat="${c.slug}">
          <span>${getCatDisplayName(c)}</span>
          <span class="material-symbols-rounded">${c.icon || "chevron_left"}</span>
        </button>
      </li>
    `);
  });

  // 3. صفحة سياسة الخصوصية (للتوافق التام مع Google AdSense)
  if (siteSettings.showAboutMenu !== false) {
    items.push(`
      <li class="sidebar-menu-item">
        <button type="button" class="sidebar-menu-btn" onclick="window.openStaticPage('privacy')">
          <span>${t("privacyPolicy")}</span>
          <span class="material-symbols-rounded">verified_user</span>
        </button>
      </li>
    `);
  }

  list.innerHTML = items.join("");

  list.querySelectorAll("[data-side-cat]").forEach(btn => {
    btn.addEventListener("click", () => {
      closeSidebarDrawer();
      selectCategoryAndRender(btn.dataset.sideCat);
    });
  });
}

function selectCategoryAndRender(catSlug) {
  selectedCategory = catSlug;
  selectedSubcategory = "all";
  renderCategoriesNav();
  renderSidebarMenu();
  showView("view-home");
  window.history.pushState({}, "", "./");
  renderSubcategoriesBar();
  renderHomeFeed();
}

// فتح وإغلاق القائمة الجانبية
const sidebarDrawer = document.getElementById("sidebar-drawer");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");

function openSidebarDrawer() {
  sidebarDrawer.classList.add("open");
  sidebarBackdrop.classList.remove("hidden");
}

function closeSidebarDrawer() {
  sidebarDrawer.classList.remove("open");
  sidebarBackdrop.classList.add("hidden");
}

document.getElementById("open-sidebar-btn").addEventListener("click", openSidebarDrawer);
document.getElementById("close-sidebar-btn").addEventListener("click", closeSidebarDrawer);
sidebarBackdrop.addEventListener("click", closeSidebarDrawer);

function renderSubcategoriesBar() {
  const bar = document.getElementById("subcategories-bar");
  if (selectedCategory === "all") {
    bar.classList.add("hidden");
    return;
  }
  const catObj = categories.find(c => c.slug === selectedCategory);
  const subs = catObj?.subcategories || [];
  if (subs.length === 0) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");
  bar.innerHTML = `
    <button class="sub-pill ${selectedSubcategory === "all" ? "active" : ""}" data-sub="all">${t("allInCat")} ${getCatDisplayName(catObj)}</button>
    ${subs.map(s => `<button class="sub-pill ${selectedSubcategory === s ? "active" : ""}" data-sub="${s}">${s}</button>`).join("")}
  `;

  bar.querySelectorAll(".sub-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      selectedSubcategory = pill.dataset.sub;
      renderSubcategoriesBar();
      renderHomeFeed();
    });
  });
}

// 7. جلب المنشورات المنشورة فقط ودعم اللغتين للمقالات
async function fetchPublishedPosts() {
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    publishedPosts = raw.filter(p => p.status === "published");
  } catch (err) {
    console.error("Error loading posts:", err);
  }
}

function getPostTitle(post) {
  return currentLang === "en" && post.titleEn ? post.titleEn : post.title;
}

function getPostSummary(post) {
  return currentLang === "en" && post.summaryEn ? post.summaryEn : (post.summary || "");
}

function getPostContent(post) {
  return currentLang === "en" && post.contentEn ? post.contentEn : (post.content || "");
}

function getPostCategoryName(post) {
  const catObj = categories.find(c => c.slug === post.category);
  if (catObj) return getCatDisplayName(catObj);
  return currentLang === "en" && post.categoryNameEn ? post.categoryNameEn : (post.categoryName || "");
}

// 8. محرك الإعلانات المطور (يدعم البانر الأفقي الممتد Leaderboard + الشريط الزجاجي)
async function fetchSponsoredAds() {
  try {
    const snap = await getDocs(collection(db, "ads"));
    activeAds = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(ad => ad.active !== false);
  } catch (err) {
    activeAds = [];
  }

  if (activeAds.length === 0 && siteSettings.adsEnabled && siteSettings.customAdText) {
    activeAds.push({
      id: "global_fallback_ad",
      adStyle: "card",
      title: siteSettings.customAdText,
      sponsorName: siteSettings.networkName,
      targetUrl: siteSettings.customAdLink || "#",
      imageUrl: siteSettings.logoUrl || DEFAULT_LOGO,
      placement: "all",
      isFallback: true
    });
  }
}

function getAdForPlacement(placementKey) {
  if (!activeAds.length) return null;
  const matching = activeAds.filter(a => !a.placement || a.placement === "all" || a.placement === placementKey);
  if (!matching.length) return null;
  return matching[Math.floor(Math.random() * matching.length)];
}

function buildAdHtml(ad, uniqueDomId) {
  if (!ad) return "";

  if (!ad.isFallback && !trackedAdImpressions.has(ad.id + "_" + uniqueDomId)) {
    trackedAdImpressions.add(ad.id + "_" + uniqueDomId);
    updateDoc(doc(db, "ads", ad.id), { views: increment(1) }).catch(() => {});
  }

  // 1. تصميم البانر الإعلاني الأفقي الممتد (Leaderboard Banner)
  if (ad.adStyle === "banner" && ad.imageUrl) {
    return `
      <div class="leaderboard-ad-banner" id="ad-box-${uniqueDomId}">
        <button class="glass-ad-close leaderboard-close-float" title="Close" onclick="document.getElementById('ad-box-${uniqueDomId}').remove()">
          <span class="material-symbols-rounded" style="font-size:16px;">close</span>
        </button>
        <a href="${ad.targetUrl || "#"}" target="_blank" rel="sponsored noopener" class="leaderboard-ad-link" onclick="window.recordAdClick('${ad.id}', ${!!ad.isFallback})">
          <img src="${ad.imageUrl}" alt="${ad.title}" class="leaderboard-ad-img">
          <div class="leaderboard-ad-bar">
            <span><strong>${t("sponsoredTag")}</strong> — ${ad.title}</span>
            ${ad.sponsorName ? `<span>${t("sponsoredBy")} ${ad.sponsorName}</span>` : ""}
          </div>
        </a>
      </div>
    `;
  }

  // 2. تصميم بطاقة الرعاية الزجاجية المدمجة
  const thumbHtml = ad.imageUrl 
    ? `<img src="${ad.imageUrl}" alt="${ad.title}" class="glass-ad-thumb">`
    : "";

  return `
    <div class="glass-ad-banner" id="ad-box-${uniqueDomId}">
      <a href="${ad.targetUrl || "#"}" target="_blank" rel="sponsored noopener" class="glass-ad-clickable" onclick="window.recordAdClick('${ad.id}', ${!!ad.isFallback})">
        ${thumbHtml}
        <div class="glass-ad-info">
          <span class="glass-ad-tag">${t("sponsoredTag")}</span>
          <div class="glass-ad-title">${ad.title}</div>
          ${ad.sponsorName ? `<div class="glass-ad-sponsor">${t("sponsoredBy")} ${ad.sponsorName}</div>` : ""}
        </div>
      </a>
      <button class="glass-ad-close" title="Close" onclick="document.getElementById('ad-box-${uniqueDomId}').remove()">
        <span class="material-symbols-rounded" style="font-size:16px;">close</span>
      </button>
    </div>
  `;
}

window.recordAdClick = (adId, isFallback) => {
  if (isFallback || !adId) return;
  updateDoc(doc(db, "ads", adId), { clicks: increment(1) }).catch(() => {});
};

function renderTopBannerAd() {
  const slot = document.getElementById("ad-slot-top");
  const ad = getAdForPlacement("top");
  slot.innerHTML = ad ? buildAdHtml(ad, "top_main") : "";
}

// 9. شريط الأخبار العاجلة
function renderBreakingTicker() {
  const breakingPosts = publishedPosts.filter(p => p.isBreaking);
  const wrap = document.getElementById("breaking-ticker-wrap");
  const list = document.getElementById("breaking-list");

  if (breakingPosts.length === 0) {
    wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  list.innerHTML = breakingPosts.map(p => `
    <a class="breaking-item" onclick="window.openArticle('${p.id}')">⚡ ${getPostTitle(p)}</a>
  `).join("");
}

// 10. عرض الصفحة الرئيسية + محرك البحث الذكي الفوري + أيقونات الوسائط
function getMediaOverlayIcon(postType) {
  if (postType === "video") return `<div class="media-overlay-icon"><span class="material-symbols-rounded">play_arrow</span></div>`;
  if (postType === "infographic") return `<div class="media-overlay-icon"><span class="material-symbols-rounded">monitoring</span></div>`;
  if (postType === "podcast") return `<div class="media-overlay-icon"><span class="material-symbols-rounded">headphones</span></div>`;
  if (postType === "photos") return `<div class="media-overlay-icon"><span class="material-symbols-rounded">photo_library</span></div>`;
  return "";
}

function renderHomeFeed() {
  const heroContainer = document.getElementById("hero-section");
  const gridContainer = document.getElementById("posts-grid");
  const heading = document.getElementById("feed-heading");
  const searchBadge = document.getElementById("search-count-badge");

  let filtered = publishedPosts.filter(p => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (selectedSubcategory !== "all" && p.subcategory !== selectedSubcategory) return false;
    if (searchQuery) {
      const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      const searchableBlob = [
        p.title, p.titleEn,
        p.summary, p.summaryEn,
        p.content, p.contentEn,
        p.author, p.categoryName, p.categoryNameEn,
        ...(p.tags || [])
      ].join(" ").toLowerCase();

      return tokens.every(tok => searchableBlob.includes(tok));
    }
    return true;
  });

  if (searchQuery) {
    searchBadge.textContent = filtered.length;
    searchBadge.classList.remove("hidden");
    heading.textContent = `${t("searchResultsFor")} "${searchQuery}" (${filtered.length})`;
  } else {
    searchBadge.classList.add("hidden");
    if (selectedCategory === "all") {
      heading.textContent = t("latestFeed");
    } else {
      const catObj = categories.find(c => c.slug === selectedCategory);
      heading.textContent = catObj ? getCatDisplayName(catObj) : t("latestFeed");
    }
  }

  if (filtered.length === 0) {
    heroContainer.innerHTML = "";
    gridContainer.innerHTML = `<div class="glass-surface skeleton-card">${t("noPosts")}</div>`;
    return;
  }

  const defaultThumb = siteSettings.logoUrl || DEFAULT_LOGO;
  let heroPost = filtered.find(p => p.isFeatured) || filtered[0];
  let restPosts = filtered.filter(p => p.id !== heroPost.id);

  if (selectedCategory === "all" && !searchQuery && heroPost) {
    const heroImg = heroPost.imageUrl || defaultThumb;
    heroContainer.innerHTML = `
      <div class="glass-surface hero-card" onclick="window.openArticle('${heroPost.id}')">
        <div class="hero-img-wrap">
          <img src="${heroImg}" alt="${getPostTitle(heroPost)}">
          ${getMediaOverlayIcon(heroPost.postType)}
        </div>
        <div class="hero-content">
          <div>
            <span class="badge-pill">${getPostCategoryName(heroPost)}</span>
          </div>
          <h2 class="hero-title">${getPostTitle(heroPost)}</h2>
          <p class="hero-summary">${getPostSummary(heroPost)}</p>
          <div class="card-footer" style="border:none;padding:0;">
            <span>✍️ ${heroPost.author || t("editorialTeam")}</span>
            <span>${formatLocalizedDate(heroPost.createdAt)}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    heroContainer.innerHTML = "";
    restPosts = filtered;
  }

  const cardsHtml = [];
  const feedAd = getAdForPlacement("between_posts");

  restPosts.forEach((post, index) => {
    const img = post.imageUrl || defaultThumb;
    cardsHtml.push(`
      <article class="glass-surface news-card" onclick="window.openArticle('${post.id}')">
        <div class="card-thumb-wrap">
          <img src="${img}" alt="${getPostTitle(post)}" loading="lazy">
          <span class="card-cat-float">${getPostCategoryName(post)}</span>
          ${getMediaOverlayIcon(post.postType)}
        </div>
        <div class="card-body">
          <h3 class="card-title">${getPostTitle(post)}</h3>
          <p class="card-excerpt">${getPostSummary(post)}</p>
          <div class="card-footer">
            <span>${post.author || t("editorialTeam")}</span>
            <span>👁️ ${post.views || 0}</span>
          </div>
        </div>
      </article>
    `);

    if (index === 2 && feedAd) {
      cardsHtml.push(`<div style="grid-column: 1 / -1;">${buildAdHtml(feedAd, "feed_mid")}</div>`);
    }
  });

  gridContainer.innerHTML = cardsHtml.join("");
}

// 11. خوارزمية الأكثر قراءة (Trending)
function renderTrendingSidebar() {
  const container = document.getElementById("trending-list");
  const sorted = [...publishedPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = `<p style="color:var(--text-secondary);font-size:0.85rem;">${t("noPosts")}</p>`;
    return;
  }

  container.innerHTML = sorted.map((p, idx) => `
    <div class="trend-item" onclick="window.openArticle('${p.id}')">
      <div class="trend-rank">${idx + 1}</div>
      <div>
        <div class="trend-title">${getPostTitle(p)}</div>
        <div class="trend-views">${getPostCategoryName(p)} • ${p.views || 0} ${t("viewsUnit")}</div>
      </div>
    </div>
  `).join("");
}

// 12. استخراج معرف يوتيوب الذكي وبناء مشغل الوسائط (فيديو / بودكاست / صورة)
function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function buildArticleMediaHtml(post) {
  const ytId = extractYouTubeId(post.videoUrl);

  // 1. إذا كان المقال فيديو أو فيديو جرافيك ويحتوي على رابط يوتيوب
  if ((post.postType === "video" || post.postType === "infographic" || ytId) && ytId) {
    return `
      <div class="video-embed-wrap">
        <iframe src="https://www.youtube.com/embed/${ytId}?rel=0" title="${getPostTitle(post)}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      </div>
    `;
  }

  // 2. إذا كان المقال حلقة بودكاست (بطاقة توجيه خفيفة وأنيقة بدون إثقال الموقع)
  if (post.postType === "podcast" && post.podcastUrl) {
    const cover = post.imageUrl || siteSettings.logoUrl || DEFAULT_LOGO;
    const platform = post.podcastPlatform || "Spotify";
    return `
      <div class="podcast-player-box">
        <div class="podcast-info-side">
          <img src="${cover}" alt="${getPostTitle(post)}" class="podcast-cover">
          <div>
            <span class="badge-pill">🎙️ ${t("podcastEpisode")} ${post.podcastDuration ? `• ${post.podcastDuration}` : ""}</span>
            <h3 style="margin-top:6px;font-size:1.1rem;">${getPostTitle(post)}</h3>
          </div>
        </div>
        <a href="${post.podcastUrl}" target="_blank" rel="noopener" class="podcast-listen-btn">
          <span class="material-symbols-rounded">headphones</span>
          <span>${t("listenOn")} ${platform}</span>
        </a>
      </div>
    `;
  }

  // 3. الصورة البارزة القياسية
  if (post.imageUrl) {
    return `
      <figure class="article-figure">
        <img src="${post.imageUrl}" alt="${getPostTitle(post)}" loading="lazy">
      </figure>
    `;
  }

  return "";
}

// 13. فتح وقراءة المقال الكامل + تنسيقات محرر الوورد + حقن الإعلان الوسطي
window.openArticle = async (postId, incrementCounter = true) => {
  const post = publishedPosts.find(p => p.id === postId);
  if (!post) return;

  closeSidebarDrawer();
  window.history.pushState({ postId }, "", `?post=${postId}`);
  showView("view-article");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (incrementCounter) {
    post.views = (post.views || 0) + 1;
    updateDoc(doc(db, "posts", postId), { views: increment(1) }).catch(() => {});
    renderTrendingSidebar();
  }

  document.getElementById("art-badges").innerHTML = `
    <span class="badge-pill">${getPostCategoryName(post)}</span>
    ${post.subcategory ? `<span class="badge-pill">${post.subcategory}</span>` : ""}
  `;
  document.getElementById("art-title").textContent = getPostTitle(post);
  document.getElementById("art-summary").textContent = getPostSummary(post);
  document.getElementById("art-author").textContent = post.author || t("editorialTeam");
  document.getElementById("art-date").textContent = formatLocalizedDate(post.createdAt);
  document.getElementById("art-views").textContent = post.views || 0;

  document.getElementById("art-author-btn").onclick = () => openAuthorProfile(post.author || t("editorialTeam"));

  // عرض الوسائط (مشغل يوتيوب / بطاقة بودكاست / صورة)
  document.getElementById("art-media-slot").innerHTML = buildArticleMediaHtml(post);

  // تنسيق المتن وحقن الإعلان الوسطي بعد الفقرة الثانية
  const formattedParagraphs = formatArticleContent(getPostContent(post));
  const inArticleAd = getAdForPlacement("in_article");
  if (inArticleAd && formattedParagraphs.length >= 2) {
    formattedParagraphs.splice(2, 0, `<div class="ad-slot-wrapper">${buildAdHtml(inArticleAd, "article_mid_" + post.id)}</div>`);
  } else if (inArticleAd) {
    formattedParagraphs.push(`<div class="ad-slot-wrapper">${buildAdHtml(inArticleAd, "article_end_" + post.id)}</div>`);
  }
  document.getElementById("art-body").innerHTML = formattedParagraphs.join("");

  // الوسوم
  document.getElementById("art-tags").innerHTML = (post.tags || []).map(tag => `<span class="tag-chip">#${tag}</span>`).join("");

  // المشاركة
  const shareUrl = window.location.href;
  const shareTitle = `${getPostTitle(post)} - ${currentLang === "en" ? siteSettings.siteNameEn : siteSettings.siteName}`;
  document.getElementById("share-wa").onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + "\n" + shareUrl)}`, "_blank");
  document.getElementById("share-x").onclick = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  document.getElementById("share-tg").onclick = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, "_blank");
  document.getElementById("share-copy").onclick = () => {
    navigator.clipboard.writeText(shareUrl);
    showPublicToast(t("linkCopied"));
  };

  updateArticleSeoSchema(post, shareUrl);

  const related = publishedPosts.filter(p => p.id !== post.id && p.category === post.category).slice(0, 3);
  document.getElementById("related-grid").innerHTML = related.map(r => `
    <article class="glass-surface news-card" onclick="window.openArticle('${r.id}')">
      <div class="card-body">
        <span class="badge-pill" style="align-self:flex-start;">${getPostCategoryName(r)}</span>
        <h3 class="card-title">${getPostTitle(r)}</h3>
        <div class="card-footer">
          <span>${r.author || t("editorialTeam")}</span>
          <span>👁️ ${r.views || 0}</span>
        </div>
      </div>
    </article>
  `).join("");
};

function formatArticleContent(rawText) {
  return (rawText || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      if (line === "---") return `<hr>`;
      const safe = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent);font-weight:800;">$1</a>');
      if (safe.startsWith("### ")) return `<h3>${safe.replace("### ", "")}</h3>`;
      if (safe.startsWith("## ")) return `<h2>${safe.replace("## ", "")}</h2>`;
      if (safe.startsWith("> ")) return `<blockquote>${safe.replace("> ", "")}</blockquote>`;
      if (safe.startsWith("- ")) return `<p>• ${safe.replace("- ", "")}</p>`;
      return `<p>${safe}</p>`;
    });
}

function updateArticleSeoSchema(post, url) {
  const displaySite = currentLang === "en" ? siteSettings.siteNameEn : siteSettings.siteName;
  document.title = `${getPostTitle(post)} | ${displaySite}`;
  const schemaScript = document.getElementById("schema-jsonld");
  const isoDate = post.createdAt?.toDate ? post.createdAt.toDate().toISOString() : new Date().toISOString();

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": getPostTitle(post),
    "description": getPostSummary(post),
    "image": [post.imageUrl || siteSettings.logoUrl || DEFAULT_LOGO],
    "datePublished": isoDate,
    "author": [{
      "@type": "Person",
      "name": post.author || displaySite
    }],
    "publisher": {
      "@type": "Organization",
      "name": siteSettings.networkName,
      "logo": {
        "@type": "ImageObject",
        "url": siteSettings.logoUrl || DEFAULT_LOGO
      }
    },
    "mainEntityOfPage": url
  };
  schemaScript.textContent = JSON.stringify(schemaData);
}

// 14. فتح صفحات "من نحن" و"سياسة الخصوصية" القابلة للتعديل من غرفة العمليات
window.openStaticPage = (pageType) => {
  closeSidebarDrawer();
  window.history.pushState({ pageType }, "", `?page=${pageType}`);
  showView("view-static");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const titleEl = document.getElementById("static-page-title");
  const bodyEl = document.getElementById("static-page-body");
  const badgeEl = document.getElementById("static-page-badge");

  const displaySite = currentLang === "en" ? siteSettings.siteNameEn : siteSettings.siteName;
  const displayNet = currentLang === "en" ? siteSettings.networkNameEn : siteSettings.networkName;
  badgeEl.textContent = displayNet;

  if (pageType === "about") {
    titleEl.textContent = t("aboutUs");
    const defaultAboutAr = `## ${siteSettings.siteName}\nمنصة إخبارية وتحليلية مستقلة تعمل ضمن "${siteSettings.networkName}"، تأسست لتقديم قراءة معمقة وموثوقة للأحداث السياسية، الاقتصادية، التقنية، والثقافية في اليمن والمنطقة والعالم.\n## رؤيتنا التحريرية\nنلتزم بأعلى معايير الدقة المهنية، التحقق من المصادر، وفصل الخبر عن الرأي، مع توفير مساحة حرة للتحليلات الاستراتيجية والحوارات البناءة.`;
    const defaultAboutEn = `## About ${siteSettings.siteNameEn}\nAn independent news and analytical platform operating under ${siteSettings.networkNameEn}, dedicated to delivering in-depth coverage of Yemeni, regional, and international politics, technology, and culture.`;

    const rawAbout = currentLang === "en"
      ? (siteSettings.aboutContentEn || siteSettings.aboutContent || defaultAboutEn)
      : (siteSettings.aboutContent || defaultAboutAr);

    const contactHtml = (siteSettings.contactEmail || siteSettings.contactPhone) ? `
      <h2>${t("contactUsHeader")}</h2>
      <p>${siteSettings.contactEmail ? `📧 Email: <strong>${siteSettings.contactEmail}</strong>` : ""} ${siteSettings.contactPhone ? `<br>📞 Phone / WhatsApp: <strong>${siteSettings.contactPhone}</strong>` : ""}</p>
    ` : "";

    bodyEl.innerHTML = formatArticleContent(rawAbout).join("") + contactHtml;
  } else {
    titleEl.textContent = t("privacyPolicy");
    const defaultPrivacy = `## سياسة الخصوصية وحماية البيانات\nتحترم منصة "${displaySite}" (${displayNet}) خصوصية جميع زوارها وتلتزم بحماية بياناتهم وفق المعايير الدولية.\n## ملفات تعريف الارتباط (Cookies) وإعلانات Google AdSense\nيستخدم موقعنا ملفات تعريف الارتباط لتحسين تجربة التصفح وحفظ تفضيلات القارئ. كما قد نستخدم خدمات إعلانية لطرف ثالث مثل (Google AdSense) لعرض إعلانات ملائمة لاهتمامات الزائر.`;
    const rawPrivacy = siteSettings.privacyContent || defaultPrivacy;
    bodyEl.innerHTML = formatArticleContent(rawPrivacy).join("");
  }
};

// 15. صفحة ملف الكاتب
function openAuthorProfile(authorName) {
  showView("view-author");
  window.scrollTo({ top: 0, behavior: "smooth" });
  const authorPosts = publishedPosts.filter(p => (p.author || t("editorialTeam")) === authorName);

  document.getElementById("profile-author-name").textContent = authorName;
  document.getElementById("profile-author-count").textContent = `${t("authorTotalPosts")} ${authorPosts.length}`;

  document.getElementById("author-posts-grid").innerHTML = authorPosts.map(post => `
    <article class="glass-surface news-card" onclick="window.openArticle('${post.id}')">
      <div class="card-body">
        <span class="badge-pill" style="align-self:flex-start;">${getPostCategoryName(post)}</span>
        <h3 class="card-title">${getPostTitle(post)}</h3>
        <p class="card-excerpt">${getPostSummary(post)}</p>
        <div class="card-footer">
          <span>${formatLocalizedDate(post.createdAt)}</span>
          <span>👁️ ${post.views || 0}</span>
        </div>
      </div>
    </article>
  `).join("");
}

// 16. إدارة التنقل، أنيميشن الكبسولة السفلية (Morphing Pill)، والوضع الليلي/النهاري
function showView(viewId) {
  ["view-home", "view-article", "view-author", "view-static"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === viewId) {
      el.classList.remove("hidden");
      el.classList.add("active");
    } else {
      el.classList.add("hidden");
      el.classList.remove("active");
    }
  });
}

function handleUrlRouting() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post");
  const pageId = params.get("page");
  if (postId && publishedPosts.some(p => p.id === postId)) {
    window.openArticle(postId);
  } else if (pageId === "about" || pageId === "privacy") {
    window.openStaticPage(pageId);
  } else {
    showView("view-home");
    renderHomeFeed();
  }
}

window.addEventListener("popstate", handleUrlRouting);

["back-to-home-btn", "author-back-btn", "static-back-btn"].forEach(btnId => {
  document.getElementById(btnId)?.addEventListener("click", () => {
    window.history.pushState({}, "", "./");
    applyLanguageAndIdentity();
    showView("view-home");
    renderHomeFeed();
  });
});

document.getElementById("home-brand-link").addEventListener("click", (e) => {
  e.preventDefault();
  selectedCategory = "all";
  selectedSubcategory = "all";
  searchQuery = "";
  window.history.pushState({}, "", "./");
  renderCategoriesNav();
  renderSidebarMenu();
  renderSubcategoriesBar();
  showView("view-home");
  renderHomeFeed();
});

// البحث الذكي الفوري
const searchDrawer = document.getElementById("search-drawer");
const searchInput = document.getElementById("global-search-input");

document.getElementById("search-toggle-btn").addEventListener("click", () => {
  searchDrawer.classList.toggle("hidden");
  if (!searchDrawer.classList.contains("hidden")) searchInput.focus();
});

document.getElementById("close-search-btn").addEventListener("click", () => {
  searchDrawer.classList.add("hidden");
  searchQuery = "";
  searchInput.value = "";
  renderHomeFeed();
});

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  showView("view-home");
  renderHomeFeed();
});

// الوضع الليلي والنهاري
function initTheme() {
  const saved = localStorage.getItem("bosla_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("bosla_theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("theme-icon");
  if (icon) icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
}

document.getElementById("theme-toggle-btn").addEventListener("click", toggleTheme);

// أنيميشن الكبسولة المنزلقة (Morphing Pill Animation) في الشريط السفلي للهواتف
function updateMobileNavPill() {
  const activeBtn = document.querySelector("#mobile-bottom-nav .mob-nav-btn.active");
  const indicator = document.getElementById("mob-nav-indicator");
  if (!activeBtn || !indicator) return;
  indicator.style.width = `${activeBtn.offsetWidth}px`;
  indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
}

window.addEventListener("resize", updateMobileNavPill);

document.querySelectorAll(".mob-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mob-nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    updateMobileNavPill();

    const action = btn.dataset.action;
    if (action === "home") {
      document.getElementById("home-brand-link").click();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "trending") {
      showView("view-home");
      document.querySelector(".trending-widget")?.scrollIntoView({ behavior: "smooth" });
    } else if (action === "search") {
      searchDrawer.classList.remove("hidden");
      searchInput.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "theme") {
      toggleTheme();
    }
  });
});

function formatLocalizedDate(timestamp) {
  if (!timestamp) return currentLang === "en" ? "Just now" : "الآن";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const locale = currentLang === "en" ? "en-US" : "ar-YE";
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

function showPublicToast(msg) {
  const toast = document.getElementById("public-toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

bootPublicSite();
