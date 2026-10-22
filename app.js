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

// حالة الموقع العام والإعدادات الافتراضية المرنة
let siteSettings = {
  siteName: "بوصلة السياسة اليمنية",
  networkName: "شبكة البوصلة",
  siteDesc: "منصة إخبارية وتحليلية ترصد كواليس السياسة والتقنية والثقافة",
  logoUrl: DEFAULT_LOGO,
  faviconUrl: DEFAULT_FAVICON,
  hideTextLogo: true,
  accentColor: "#3b82f6",
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

// 2. تشغيل الموقع العام وجلب البيانات بالتوازي
async function bootPublicSite() {
  initTheme();
  await Promise.all([
    fetchSettings(),
    fetchCategories(),
    fetchPublishedPosts(),
    fetchSponsoredAds()
  ]);

  renderBreakingTicker();
  renderTopBannerAd();
  renderTrendingSidebar();
  handleUrlRouting();
}

// 3. جلب وتطبيق الهوية البصرية والشعار الأفقي وأيقونة محركات البحث
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
    applyWhiteLabelIdentity();
  } catch (err) {
    console.warn("Settings fetch notice:", err);
    applyWhiteLabelIdentity();
  }
}

function applyWhiteLabelIdentity() {
  const activeLogo = siteSettings.logoUrl || DEFAULT_LOGO;
  const activeFavicon = siteSettings.faviconUrl || DEFAULT_FAVICON;

  // تحديث عنوان المتصفح والوصف وأيقونة محركات البحث (Favicon)
  document.title = `${siteSettings.siteName} | ${siteSettings.networkName}`;
  document.getElementById("meta-desc")?.setAttribute("content", siteSettings.siteDesc || "");
  document.getElementById("og-title")?.setAttribute("content", `${siteSettings.siteName} | ${siteSettings.networkName}`);
  document.getElementById("og-desc")?.setAttribute("content", siteSettings.siteDesc || "");
  document.getElementById("og-image")?.setAttribute("content", activeLogo);

  const favEl = document.getElementById("dynamic-favicon");
  const appleFavEl = document.getElementById("apple-favicon");
  if (favEl) favEl.href = activeFavicon;
  if (appleFavEl) appleFavEl.href = activeFavicon;

  // تحديث الشعار الأفقي في الترويسة العلوية والتذييل السفلي
  const headerLogo = document.getElementById("custom-logo-img");
  const footerLogo = document.getElementById("footer-logo-img");
  if (headerLogo) {
    headerLogo.src = activeLogo;
    headerLogo.alt = siteSettings.siteName;
  }
  if (footerLogo) {
    footerLogo.src = activeLogo;
    footerLogo.alt = siteSettings.siteName;
  }

  // إخفاء أو إظهار النص بجانب الشعار حسب إعدادات غرفة العمليات
  const brandTextWrap = document.getElementById("brand-text-wrap");
  if (brandTextWrap) {
    if (siteSettings.hideTextLogo !== false) {
      brandTextWrap.classList.add("hidden");
    } else {
      brandTextWrap.classList.remove("hidden");
    }
  }

  // تحديث النصوص واللون الأساسي
  document.getElementById("ui-site-name").textContent = siteSettings.siteName;
  document.getElementById("ui-network-name").textContent = siteSettings.networkName;
  document.getElementById("footer-site-name").textContent = siteSettings.siteName;
  document.getElementById("footer-site-desc").textContent = siteSettings.siteDesc;
  document.getElementById("footer-network-copy").textContent = siteSettings.networkName;

  if (siteSettings.accentColor) {
    document.documentElement.style.setProperty("--accent", siteSettings.accentColor);
  }

  // روابط منصات التواصل في الفوتر
  const socialContainer = document.getElementById("footer-social-links");
  const links = [];
  if (siteSettings.socialWhatsapp) links.push(`<a href="${siteSettings.socialWhatsapp}" target="_blank" rel="noopener" class="social-pill">واتساب</a>`);
  if (siteSettings.socialTelegram) links.push(`<a href="${siteSettings.socialTelegram}" target="_blank" rel="noopener" class="social-pill">تيليجرام</a>`);
  if (siteSettings.socialX) links.push(`<a href="${siteSettings.socialX}" target="_blank" rel="noopener" class="social-pill">منصة X</a>`);
  if (siteSettings.socialFacebook) links.push(`<a href="${siteSettings.socialFacebook}" target="_blank" rel="noopener" class="social-pill">فيسبوك</a>`);
  socialContainer.innerHTML = links.join("");
}

// 4. جلب الأقسام وبناء شريط التنقل
async function fetchCategories() {
  try {
    const snap = await getDocs(collection(db, "categories"));
    categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategoriesNav();
  } catch (err) {
    console.warn("Categories fetch notice:", err);
  }
}

function renderCategoriesNav() {
  const nav = document.getElementById("categories-nav-list");
  const itemsHtml = categories.map(c => `
    <button class="cat-pill ${selectedCategory === c.slug ? "active" : ""}" data-cat="${c.slug}">
      <span class="material-symbols-rounded">${c.icon || "newspaper"}</span>
      <span>${c.name}</span>
    </button>
  `).join("");

  nav.innerHTML = `
    <button class="cat-pill ${selectedCategory === "all" ? "active" : ""}" data-cat="all">
      <span class="material-symbols-rounded">home</span>
      <span>الرئيسية</span>
    </button>
    ${itemsHtml}
  `;

  nav.querySelectorAll(".cat-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedCategory = btn.dataset.cat;
      selectedSubcategory = "all";
      nav.querySelectorAll(".cat-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      showView("view-home");
      window.history.pushState({}, "", "./");
      renderSubcategoriesBar();
      renderHomeFeed();
    });
  });
}

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
    <button class="sub-pill ${selectedSubcategory === "all" ? "active" : ""}" data-sub="all">الكل في ${catObj.name}</button>
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

// 5. جلب المقالات المنشورة فقط
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

// 6. محرك الرعايات والإعلانات الزجاجية (جلب + عرض + تتبع الظهور والنقرات)
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

function buildGlassAdHtml(ad, uniqueDomId) {
  if (!ad) return "";

  if (!ad.isFallback && !trackedAdImpressions.has(ad.id + "_" + uniqueDomId)) {
    trackedAdImpressions.add(ad.id + "_" + uniqueDomId);
    updateDoc(doc(db, "ads", ad.id), { views: increment(1) }).catch(() => {});
  }

  const thumbHtml = ad.imageUrl 
    ? `<img src="${ad.imageUrl}" alt="${ad.title}" class="glass-ad-thumb">`
    : "";

  return `
    <div class="glass-ad-banner" id="ad-box-${uniqueDomId}">
      <a href="${ad.targetUrl || "#"}" target="_blank" rel="sponsored noopener" class="glass-ad-clickable" onclick="window.recordAdClick('${ad.id}', ${!!ad.isFallback})">
        ${thumbHtml}
        <div class="glass-ad-info">
          <span class="glass-ad-tag">✨ رعاية وإعلان</span>
          <div class="glass-ad-title">${ad.title}</div>
          ${ad.sponsorName ? `<div class="glass-ad-sponsor">بالتعاون مع: ${ad.sponsorName}</div>` : ""}
        </div>
      </a>
      <button class="glass-ad-close" title="إخفاء الإعلان" onclick="document.getElementById('ad-box-${uniqueDomId}').remove()">
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
  slot.innerHTML = ad ? buildGlassAdHtml(ad, "top_main") : "";
}

// 7. شريط الأخبار العاجلة
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
    <a class="breaking-item" onclick="window.openArticle('${p.id}')">⚡ ${p.title}</a>
  `).join("");
}

// 8. عرض الصفحة الرئيسية (Hero + الشبكة + إعلان مدمج بين البطاقات)
function renderHomeFeed() {
  const heroContainer = document.getElementById("hero-section");
  const gridContainer = document.getElementById("posts-grid");
  const heading = document.getElementById("feed-heading");

  let filtered = publishedPosts.filter(p => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (selectedSubcategory !== "all" && p.subcategory !== selectedSubcategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (p.title || "").toLowerCase().includes(q);
      const matchSum = (p.summary || "").toLowerCase().includes(q);
      const matchAuthor = (p.author || "").toLowerCase().includes(q);
      const matchTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
      return matchTitle || matchSum || matchAuthor || matchTags;
    }
    return true;
  });

  if (selectedCategory === "all" && !searchQuery) {
    heading.textContent = "أحدث التحليلات والتقارير";
  } else if (searchQuery) {
    heading.textContent = `نتائج البحث عن: "${searchQuery}"`;
  } else {
    const catObj = categories.find(c => c.slug === selectedCategory);
    heading.textContent = catObj ? catObj.name : "الأرشيف";
  }

  if (filtered.length === 0) {
    heroContainer.innerHTML = "";
    gridContainer.innerHTML = `<div class="glass-surface skeleton-card">لا توجد مواد صحفية منشورة في هذا القسم حالياً.</div>`;
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
          <img src="${heroImg}" alt="${heroPost.title}">
        </div>
        <div class="hero-content">
          <div>
            <span class="badge-pill">${heroPost.categoryName || "صدارة البوصلة"}</span>
          </div>
          <h2 class="hero-title">${heroPost.title}</h2>
          <p class="hero-summary">${heroPost.summary || ""}</p>
          <div class="card-footer" style="border:none;padding:0;">
            <span>✍️ ${heroPost.author || "هيئة التحرير"}</span>
            <span>${formatArabicDate(heroPost.createdAt)}</span>
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
          <img src="${img}" alt="${post.title}" loading="lazy">
          <span class="card-cat-float">${post.categoryName || "عام"}</span>
        </div>
        <div class="card-body">
          <h3 class="card-title">${post.title}</h3>
          <p class="card-excerpt">${post.summary || ""}</p>
          <div class="card-footer">
            <span>${post.author || "هيئة التحرير"}</span>
            <span>👁️ ${post.views || 0}</span>
          </div>
        </div>
      </article>
    `);

    if (index === 2 && feedAd) {
      cardsHtml.push(`<div style="grid-column: 1 / -1;">${buildGlassAdHtml(feedAd, "feed_mid")}</div>`);
    }
  });

  gridContainer.innerHTML = cardsHtml.join("");
}

// 9. خوارزمية الأكثر قراءة (Trending)
function renderTrendingSidebar() {
  const container = document.getElementById("trending-list");
  const sorted = [...publishedPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = `<p style="color:var(--text-secondary);font-size:0.85rem;">تظهر هنا المواد الأعلى قراءة فور بدء التفاعل.</p>`;
    return;
  }

  container.innerHTML = sorted.map((p, idx) => `
    <div class="trend-item" onclick="window.openArticle('${p.id}')">
      <div class="trend-rank">${idx + 1}</div>
      <div>
        <div class="trend-title">${p.title}</div>
        <div class="trend-views">${p.categoryName || ""} • ${p.views || 0} قراءة</div>
      </div>
    </div>
  `).join("");
}

// 10. قراءة المقال الكامل + حقن الإعلان الوسطي + تحديث Schema أخبار جوجل
window.openArticle = async (postId) => {
  const post = publishedPosts.find(p => p.id === postId);
  if (!post) return;

  window.history.pushState({ postId }, "", `?post=${postId}`);
  showView("view-article");
  window.scrollTo({ top: 0, behavior: "smooth" });

  post.views = (post.views || 0) + 1;
  updateDoc(doc(db, "posts", postId), { views: increment(1) }).catch(() => {});
  renderTrendingSidebar();

  document.getElementById("art-badges").innerHTML = `
    <span class="badge-pill">${post.categoryName || "تحليلات"}</span>
    ${post.subcategory ? `<span class="badge-pill">${post.subcategory}</span>` : ""}
  `;
  document.getElementById("art-title").textContent = post.title;
  document.getElementById("art-summary").textContent = post.summary || "";
  document.getElementById("art-author").textContent = post.author || "هيئة التحرير";
  document.getElementById("art-date").textContent = formatArabicDate(post.createdAt);
  document.getElementById("art-views").textContent = post.views;

  document.getElementById("art-author-btn").onclick = () => openAuthorProfile(post.author || "هيئة التحرير");

  const fig = document.getElementById("art-figure");
  const img = document.getElementById("art-image");
  if (post.imageUrl) {
    img.src = post.imageUrl;
    img.alt = post.title;
    fig.classList.remove("hidden");
  } else {
    fig.classList.add("hidden");
  }

  const formattedParagraphs = formatArticleContent(post.content || "");
  const inArticleAd = getAdForPlacement("in_article");
  if (inArticleAd && formattedParagraphs.length >= 2) {
    formattedParagraphs.splice(2, 0, `<div class="ad-slot-wrapper">${buildGlassAdHtml(inArticleAd, "article_mid_" + post.id)}</div>`);
  } else if (inArticleAd) {
    formattedParagraphs.push(`<div class="ad-slot-wrapper">${buildGlassAdHtml(inArticleAd, "article_end_" + post.id)}</div>`);
  }
  document.getElementById("art-body").innerHTML = formattedParagraphs.join("");

  const tagsEl = document.getElementById("art-tags");
  tagsEl.innerHTML = (post.tags || []).map(t => `<span class="tag-chip">#${t}</span>`).join("");

  const shareUrl = window.location.href;
  const shareTitle = `${post.title} - ${siteSettings.siteName}`;
  document.getElementById("share-wa").onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + "\n" + shareUrl)}`, "_blank");
  document.getElementById("share-x").onclick = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  document.getElementById("share-tg").onclick = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, "_blank");
  document.getElementById("share-copy").onclick = () => {
    navigator.clipboard.writeText(shareUrl);
    showPublicToast("تم نسخ رابط المقال بنجاح");
  };

  updateArticleSeoSchema(post, shareUrl);

  const related = publishedPosts.filter(p => p.id !== post.id && p.category === post.category).slice(0, 3);
  document.getElementById("related-grid").innerHTML = related.map(r => `
    <article class="glass-surface news-card" onclick="window.openArticle('${r.id}')">
      <div class="card-body">
        <span class="badge-pill" style="align-self:flex-start;">${r.categoryName || ""}</span>
        <h3 class="card-title">${r.title}</h3>
        <div class="card-footer">
          <span>${r.author || "هيئة التحرير"}</span>
          <span>👁️ ${r.views || 0}</span>
        </div>
      </div>
    </article>
  `).join("");
};

function formatArticleContent(rawText) {
  return rawText
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const safe = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      if (safe.startsWith("## ")) return `<h2>${safe.replace("## ", "")}</h2>`;
      if (safe.startsWith("> ")) return `<blockquote>${safe.replace("> ", "")}</blockquote>`;
      if (safe.startsWith("- ")) return `<p>• ${safe.replace("- ", "")}</p>`;
      return `<p>${safe}</p>`;
    });
}

function updateArticleSeoSchema(post, url) {
  document.title = `${post.title} | ${siteSettings.siteName}`;
  const schemaScript = document.getElementById("schema-jsonld");
  const isoDate = post.createdAt?.toDate ? post.createdAt.toDate().toISOString() : new Date().toISOString();

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": post.title,
    "description": post.summary || "",
    "image": [post.imageUrl || siteSettings.logoUrl || DEFAULT_LOGO],
    "datePublished": isoDate,
    "author": [{
      "@type": "Person",
      "name": post.author || siteSettings.siteName
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

// 11. صفحة الكاتب
function openAuthorProfile(authorName) {
  showView("view-author");
  window.scrollTo({ top: 0, behavior: "smooth" });
  const authorPosts = publishedPosts.filter(p => (p.author || "هيئة التحرير") === authorName);

  document.getElementById("profile-author-name").textContent = authorName;
  document.getElementById("profile-author-count").textContent = `إجمالي المواد المنشورة: ${authorPosts.length} مادة صحفية`;

  document.getElementById("author-posts-grid").innerHTML = authorPosts.map(post => `
    <article class="glass-surface news-card" onclick="window.openArticle('${post.id}')">
      <div class="card-body">
        <span class="badge-pill" style="align-self:flex-start;">${post.categoryName || "عام"}</span>
        <h3 class="card-title">${post.title}</h3>
        <p class="card-excerpt">${post.summary || ""}</p>
        <div class="card-footer">
          <span>${formatArabicDate(post.createdAt)}</span>
          <span>👁️ ${post.views || 0}</span>
        </div>
      </div>
    </article>
  `).join("");
}

// 12. إدارة التنقل، البحث، والمظهر الليلي/النهاري
function showView(viewId) {
  ["view-home", "view-article", "view-author"].forEach(id => {
    const el = document.getElementById(id);
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
  if (postId && publishedPosts.some(p => p.id === postId)) {
    window.openArticle(postId);
  } else {
    showView("view-home");
    renderHomeFeed();
  }
}

window.addEventListener("popstate", handleUrlRouting);

document.getElementById("back-to-home-btn").addEventListener("click", () => {
  window.history.pushState({}, "", "./");
  applyWhiteLabelIdentity();
  showView("view-home");
  renderHomeFeed();
});

document.getElementById("author-back-btn").addEventListener("click", () => {
  showView("view-home");
  renderHomeFeed();
});

document.getElementById("home-brand-link").addEventListener("click", (e) => {
  e.preventDefault();
  selectedCategory = "all";
  selectedSubcategory = "all";
  searchQuery = "";
  window.history.pushState({}, "", "./");
  renderCategoriesNav();
  renderSubcategoriesBar();
  showView("view-home");
  renderHomeFeed();
});

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

document.querySelectorAll(".mob-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
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

function formatArabicDate(timestamp) {
  if (!timestamp) return "الآن";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("ar-YE", { year: "numeric", month: "short", day: "numeric" });
}

function showPublicToast(msg) {
  const t = document.getElementById("public-toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2600);
}

bootPublicSite();
