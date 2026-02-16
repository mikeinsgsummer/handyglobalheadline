const countrySelect = document.getElementById('country-select');
const languageSelect = document.getElementById('language-select');
const newsContainer = document.getElementById('news-container');

// Mapping for Google News RSS
const COUNTRY_LANGUAGES = {
    'ae': { lang: 'ar', name: 'Arabic' },
    'ar': { lang: 'es', name: 'Spanish' },
    'at': { lang: 'de', name: 'German' },
    'au': { lang: 'en', name: 'English' },
    'be': { lang: 'fr', name: 'French' },
    'bg': { lang: 'bg', name: 'Bulgarian' },
    'br': { lang: 'pt-BR', name: 'Portuguese' },
    'ca': { lang: 'en', name: 'English' },
    'ch': { lang: 'de', name: 'German' },
    'cn': { lang: 'zh-CN', name: 'Chinese' },
    'co': { lang: 'es', name: 'Spanish' },
    'cu': { lang: 'es', name: 'Spanish' },
    'cz': { lang: 'cs', name: 'Czech' },
    'de': { lang: 'de', name: 'German' },
    'eg': { lang: 'ar', name: 'Arabic' },
    'fr': { lang: 'fr', name: 'French' },
    'gb': { lang: 'en', name: 'English' },
    'gr': { lang: 'el', name: 'Greek' },
    'hk': { lang: 'zh-HK', name: 'Chinese' },
    'hu': { lang: 'hu', name: 'Hungarian' },
    'id': { lang: 'id', name: 'Indonesian' },
    'ie': { lang: 'en', name: 'English' },
    'il': { lang: 'he', name: 'Hebrew' },
    'in': { lang: 'en', name: 'English' },
    'it': { lang: 'it', name: 'Italian' },
    'jp': { lang: 'ja', name: 'Japanese' },
    'kr': { lang: 'ko', name: 'Korean' },
    'lt': { lang: 'lt', name: 'Lithuanian' },
    'lv': { lang: 'lv', name: 'Latvian' },
    'ma': { lang: 'ar', name: 'Arabic' },
    'mx': { lang: 'es', name: 'Spanish' },
    'my': { lang: 'en', name: 'English' },
    'ng': { lang: 'en', name: 'English' },
    'nl': { lang: 'nl', name: 'Dutch' },
    'no': { lang: 'no', name: 'Norwegian' },
    'nz': { lang: 'en', name: 'English' },
    'ph': { lang: 'en', name: 'English' },
    'pl': { lang: 'pl', name: 'Polish' },
    'pt': { lang: 'pt-PT', name: 'Portuguese' },
    'ro': { lang: 'ro', name: 'Romanian' },
    'rs': { lang: 'sr', name: 'Serbian' },
    'ru': { lang: 'ru', name: 'Russian' },
    'sa': { lang: 'ar', name: 'Arabic' },
    'se': { lang: 'sv', name: 'Swedish' },
    'sg': { lang: 'en', name: 'English' },
    'si': { lang: 'sl', name: 'Slovenian' },
    'sk': { lang: 'sk', name: 'Slovak' },
    'th': { lang: 'th', name: 'Thai' },
    'tr': { lang: 'tr', name: 'Turkish' },
    'tw': { lang: 'zh-TW', name: 'Chinese' },
    'ua': { lang: 'uk', name: 'Ukrainian' },
    'us': { lang: 'en', name: 'English' },
    've': { lang: 'es', name: 'Spanish' },
    'vn': { lang: 'vi', name: 'Vietnamese' },
    'za': { lang: 'en', name: 'English' }
};

const COUNTRY_NAMES = {}; // Map code -> name for Bing search

// Reader and Offline variables
let currentArticle = null;
let readerFontSize = parseInt(localStorage.getItem('readerFontSize')) || 18;
let readerDarkMode = localStorage.getItem('readerDarkMode') === 'true';
let isReaderMode = true;
let savedArticles = JSON.parse(localStorage.getItem('savedArticles')) || [];

// Initialize
async function init() {
    await fetchCountries();

    countrySelect.addEventListener('change', () => {
        languageSelect.value = 'original';
        updateLanguageLabel();
        refreshNews();
    });
    languageSelect.addEventListener('change', refreshNews);

    // Setup manual source selector
    const sourceDropdown = document.getElementById('source-dropdown');
    if (sourceDropdown) {
        sourceDropdown.addEventListener('change', () => {
            const country = countrySelect.value;
            const lang = languageSelect.value;
            const source = sourceDropdown.value;
            if (country) fetchNews(country, lang, source);
        });
    }

    setupReaderHandlers();
}

function setupReaderHandlers() {
    const overlay = document.getElementById('reader-overlay');
    const closeBtn = document.getElementById('close-reader');
    const fontIncr = document.getElementById('font-increase');
    const fontDecr = document.getElementById('font-decrease');
    const darkToggle = document.getElementById('toggle-dark-mode');
    const modeSwitch = document.getElementById('reader-mode-switch');
    const saveBtn = document.getElementById('save-offline');
    const savedListBtn = document.getElementById('saved-articles-btn');
    const readerLangSelect = document.getElementById('reader-language-select');

    closeBtn.onclick = () => overlay.classList.add('hidden');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.add('hidden'); };

    fontIncr.onclick = () => updateFontSize(2);
    fontDecr.onclick = () => updateFontSize(-2);
    darkToggle.onclick = toggleDarkMode;

    if (modeSwitch) {
        modeSwitch.querySelectorAll('.switch-opt').forEach(opt => {
            opt.onclick = () => {
                const mode = opt.getAttribute('data-mode');
                setReaderMode(mode === 'reader');
            };
        });
    }

    saveBtn.onclick = saveCurrentArticle;

    savedListBtn.onclick = showSavedArticles;

    if (readerLangSelect) {
        readerLangSelect.onchange = () => {
            if (currentArticle) openArticle(currentArticle);
        };
    }

    // Apply saved preferences
    applyFontSize();
    if (readerDarkMode) document.body.classList.add('global-dark'); // Optional global sync
    updateReaderTheme();
}

function updateFontSize(delta) {
    readerFontSize = Math.min(Math.max(12, readerFontSize + delta), 32);
    localStorage.setItem('readerFontSize', readerFontSize);
    applyFontSize();
}

function applyFontSize() {
    const content = document.getElementById('reader-content');
    if (content) content.style.fontSize = `${readerFontSize}px`;
}

function toggleDarkMode() {
    readerDarkMode = !readerDarkMode;
    localStorage.setItem('readerDarkMode', readerDarkMode);
    updateReaderTheme();
}

function updateReaderTheme() {
    const overlay = document.getElementById('reader-overlay');
    if (readerDarkMode) {
        overlay.classList.add('reader-dark');
    } else {
        overlay.classList.remove('reader-dark');
    }
}

function toggleReaderMode() {
    setReaderMode(!isReaderMode);
}

function setReaderMode(reader) {
    isReaderMode = reader;
    const switchOpts = document.querySelectorAll('#reader-mode-switch .switch-opt');
    switchOpts.forEach(opt => {
        if (opt.getAttribute('data-mode') === (isReaderMode ? 'reader' : 'original')) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    // Requirement 2: Hide translation select in Original mode
    const readerLangSelect = document.getElementById('reader-language-select');
    if (readerLangSelect) {
        if (isReaderMode) {
            readerLangSelect.classList.remove('hidden');
        } else {
            readerLangSelect.classList.add('hidden');
        }
    }

    openArticle(currentArticle);
}

async function openArticle(article) {
    currentArticle = article;
    const overlay = document.getElementById('reader-overlay');
    const content = document.getElementById('reader-content');
    const readerLangSelect = document.getElementById('reader-language-select');

    // Requirement 1 & 4: Reset state when opening a NEW article (overlay is currently hidden)
    if (overlay.classList.contains('hidden')) {
        if (readerLangSelect) readerLangSelect.value = 'original';

        // Requirement 4: Force Reader Mode by default
        isReaderMode = true;
        const switchOpts = document.querySelectorAll('#reader-mode-switch .switch-opt');
        switchOpts.forEach(opt => {
            if (opt.getAttribute('data-mode') === 'reader') {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
        if (readerLangSelect) readerLangSelect.classList.remove('hidden');
    }

    const targetLang = readerLangSelect ? readerLangSelect.value : 'original';

    // Update external link
    const externalBtn = document.getElementById('open-external');
    if (externalBtn) externalBtn.href = article.link;

    overlay.classList.remove('hidden');

    const modeSwitch = document.getElementById('reader-mode-switch');

    // For saved articles, we always use Reader Mode and hide the switch
    // Check for .content (standard for saved) or .savedAt (extra safety)
    if (article.content || article.savedAt) {
        if (modeSwitch) modeSwitch.style.display = 'none';
        if (!isReaderMode) {
            setReaderMode(true);
            return;
        }
    } else {
        if (modeSwitch) modeSwitch.style.display = 'flex';
    }

    content.innerHTML = '<div class="loading-state"><h3>Optimizing for reading...</h3></div>';

    if (!isReaderMode) {
        try {
            const html = await fetchArticleHTML(article.link);
            content.innerHTML = `
                <div class="iframe-container">
                    <iframe class="reader-iframe" id="reader-frame"></iframe>
                </div>
            `;
            const frame = document.getElementById('reader-frame');
            if (frame) {
                frame.srcdoc = `
                    <html>
                        <head>
                            <base href="${article.link}">
                            <meta charset="utf-8">
                            <style>
                                body { margin: 0; font-family: -apple-system, system-ui, sans-serif; }
                                img { max-width: 100%; height: auto; }
                            </style>
                        </head>
                        <body>${html}</body>
                    </html>
                `;
            }
        } catch (error) {
            console.error("Iframe Load Error:", error);
            content.innerHTML = `
                <div class="error-state">
                    <h3>Could not load original website</h3>
                    <p>The website is blocking embedded views. Try Reader Mode or open in browser.</p>
                    <div class="error-actions">
                        <button onclick="setReaderMode(true)" class="text-btn">Try Reader Mode</button>
                        <a href="${article.link}" target="_blank" class="text-btn primary">Open in Browser</a>
                    </div>
                </div>
            `;
        }
        return;
    }

    // Use saved content if available (Offline/Saved Mode)
    if (article.content) {
        let displayContent = article.content;
        let displayTitle = article.title;

        if (targetLang !== 'original') {
            content.innerHTML = '<div class="loading-state"><h3>Translating saved article...</h3></div>';
            displayTitle = await translateText(article.title, targetLang);
            displayContent = await translateHTML(article.content, targetLang);
        }

        content.innerHTML = `<h1>${displayTitle}</h1><div class="article-body">${displayContent}</div>`;
        applyFontSize();
        setupHighlighting();
        return;
    }

    try {
        const html = await fetchArticleHTML(article.link);

        const doc = new DOMParser().parseFromString(html, 'text/html');
        // Fix relative URLs in the extracted doc before Readability
        const base = doc.createElement('base');
        base.href = article.link;
        doc.head.append(base);

        const reader = new Readability(doc);
        const articleData = reader.parse();

        if (articleData && articleData.content) {
            let displayTitle = articleData.title || article.title;
            let displayContent = articleData.content;

            if (targetLang !== 'original') {
                content.innerHTML = '<div class="loading-state"><h3>Translating...</h3></div>';
                displayTitle = await translateText(displayTitle, targetLang);
                displayContent = await translateHTML(displayContent, targetLang);
            }

            content.innerHTML = `
                <h1>${displayTitle}</h1>
                <div class="article-meta">Published: ${new Date(article.pubDate).toLocaleDateString()}</div>
                <div class="article-body">${displayContent}</div>
            `;
            applyFontSize();
            setupHighlighting();

            // Restore highlights if available
            const saved = savedArticles.find(a => a.link === article.link);
            if (saved && saved.highlights) {
                applyHighlights(saved.highlights);
            }
        } else {
            throw new Error("Could not parse article");
        }
    } catch (error) {
        console.error("Reader Error:", error);
        content.innerHTML = `
            <div class="error-state">
                <h3>Could not load article content</h3>
                <p>This article might be protected or the source is unavailable.</p>
                <div class="error-actions">
                    <button onclick="toggleReaderMode()" class="text-btn">Try Original View</button>
                    <a href="${article.link}" target="_blank" class="text-btn primary">Open in Browser</a>
                </div>
            </div>
        `;
    }
}

function setupHighlighting() {
    const content = document.getElementById('reader-content');
    content.onmouseup = () => {
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            const range = selection.getRangeAt(0);
            const mark = document.createElement('mark');
            mark.className = 'news-highlight';
            range.surroundContents(mark);
            saveHighlights();
            selection.removeAllRanges();
        }
    };
}

function saveHighlights() {
    if (!currentArticle) return;
    const content = document.getElementById('reader-content');
    const highlights = content.innerHTML;
    // In a real app, we'd store ranges, but for simplicity we'll store the modified innerHTML if saved for offline
}

async function saveCurrentArticle() {
    if (!currentArticle) return;

    let contentToSave = '';

    // If we have content in the UI (Reader Mode active)
    const body = document.querySelector('.article-body');
    if (body) {
        contentToSave = body.innerHTML;
    } else if (currentArticle.content) {
        // If it was already saved/pre-fetched
        contentToSave = currentArticle.content;
    } else {
        // We are in Original view and haven't parsed yet
        try {
            const saveBtn = document.getElementById('save-offline');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '...'; // Quick feedback

            const html = await fetchArticleHTML(currentArticle.link);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const reader = new Readability(doc);
            const parsed = reader.parse();

            if (parsed && parsed.content) {
                contentToSave = parsed.content;
            } else {
                throw new Error("Could not parse article for saving");
            }
            saveBtn.textContent = originalText;
        } catch (error) {
            console.error("Save Error:", error);
            alert("Could not extract content for offline reading. Please try switch to Reader Mode first.");
            return;
        }
    }

    if (!contentToSave) return;

    // Capture the current title from the UI (which might be translated)
    const readerTitle = document.querySelector('.reader-body h1');
    const titleToSave = readerTitle ? readerTitle.textContent : currentArticle.title;

    const articleToSave = {
        ...currentArticle,
        title: titleToSave,
        content: contentToSave,
        savedAt: new Date().toISOString()
    };

    const existingIndex = savedArticles.findIndex(a => a.link === articleToSave.link);
    if (existingIndex > -1) {
        savedArticles[existingIndex] = articleToSave;
    } else {
        savedArticles.push(articleToSave);
    }

    localStorage.setItem('savedArticles', JSON.stringify(savedArticles));
    alert("Article saved for offline reading!");
}

function deleteArticle(e, link) {
    if (e) e.stopPropagation(); // Prevent opening the article
    if (!confirm("Remove this article from your offline library?")) return;

    savedArticles = savedArticles.filter(a => a.link !== link);
    localStorage.setItem('savedArticles', JSON.stringify(savedArticles));
    showSavedArticles(); // Re-render list
}

function deleteAllSavedArticles() {
    if (savedArticles.length === 0) return;
    if (!confirm("Are you sure you want to delete ALL saved articles? This cannot be undone.")) return;

    savedArticles = [];
    localStorage.setItem('savedArticles', JSON.stringify([]));
    showSavedArticles();
}

function showSavedArticles() {
    document.body.classList.add('saved-view-active');
    if (savedArticles.length === 0) {
        showEmpty("You haven't saved any articles yet.");
        // Add a back button even if empty
        const backBanner = document.createElement('div');
        backBanner.className = 'info-banner saved-header';
        backBanner.innerHTML = `
            <div class="banner-left">
                <button onclick="refreshNews()" class="icon-btn-text">← Back to Feed</button>
            </div>
        `;
        newsContainer.prepend(backBanner);
        return;
    }

    renderNews(savedArticles.map(a => ({ ...a, source: 'Saved: ' + a.source })), true);

    // Add a banner with Delete All option
    const backBanner = document.createElement('div');
    backBanner.className = 'info-banner saved-header';
    backBanner.innerHTML = `
            <div class="banner-left">
                <button onclick="refreshNews()" class="icon-btn-text">← Back to Feed</button>
            </div>
            <button onclick="deleteAllSavedArticles()" class="icon-btn-text delete-all" title="Delete All">🗑️ Clear All</button>
        `;
    newsContainer.prepend(backBanner);
}

function applyHighlights(htmlContent) {
    // If we were just storing content, this is handled by loading the saved content
}


function updateLanguageLabel() {
    const code = countrySelect.value;
    const langName = (COUNTRY_LANGUAGES[code] && COUNTRY_LANGUAGES[code].name) || 'Local';
    const originalOption = languageSelect.querySelector('option[value="original"]');
    if (originalOption) {
        originalOption.textContent = `Original (${langName})`;
    }
}

function refreshNews() {
    document.body.classList.remove('saved-view-active');
    const country = countrySelect.value;
    const lang = languageSelect.value;
    if (country) fetchNews(country, lang);
}

async function detectUserCountry() {
    try {
        // Primary Attempt: ipapi.co
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_code) return data.country_code.toLowerCase();
    } catch (e) {
        console.warn('Primary country detection failed, trying fallback...');
    }

    try {
        // Fallback 1: ip-api.com (HTTP only for free tier, so might fail on HTTPS sites unless proxied)
        // Using AllOrigins as it's already used elsewhere
        const proxyUrl = getProxyUrl('http://ip-api.com/json');
        const response = await fetch(proxyUrl);
        const data = await response.json();
        const body = JSON.parse(data.contents);
        if (body.countryCode) return body.countryCode.toLowerCase();
    } catch (e) {
        console.warn('Secondary country detection failed, using browser hint...');
    }

    // Fallback 2: Browser Language Hint (e.g., 'en-US' -> 'us')
    const userLocale = navigator.language || navigator.userLanguage;
    if (userLocale && userLocale.includes('-')) {
        return userLocale.split('-')[1].toLowerCase();
    }

    return null;
}

async function fetchCountries() {
    try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
        const data = await response.json();

        const countries = data
            .sort((a, b) => a.name.common.localeCompare(b.name.common));

        countrySelect.innerHTML = '<option value="">Select a country...</option>';
        countries.forEach(country => {
            if (!country.cca2) return;
            const code = country.cca2.toLowerCase();
            const name = country.name.common;
            COUNTRY_NAMES[code] = name;

            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            countrySelect.appendChild(option);
        });

        countrySelect.disabled = false;

        let defaultCountry = 'us';
        const detected = await detectUserCountry();
        if (detected) {
            defaultCountry = detected;
        }

        countrySelect.value = defaultCountry;
        updateLanguageLabel();
        fetchNews(defaultCountry, 'original');

    } catch (error) {
        countrySelect.innerHTML = '<option value="">Error loading countries</option>';
    }
}

async function translateText(text, targetLang) {
    if (!text || targetLang === 'original') return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();
        return data[0].map(s => s[0]).join('');
    } catch (e) {
        console.error('Translation error:', e);
        return text;
    }
}

/**
 * Requirement 3: Translate whole article content while preserving tags.
 */
async function translateHTML(html, targetLang) {
    if (!html || targetLang === 'original') return html;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const textNodes = [];
    while (node = walker.nextNode()) {
        if (node.nodeValue.trim()) {
            textNodes.push(node);
        }
    }

    // Translate text nodes
    for (const n of textNodes) {
        n.nodeValue = await translateText(n.nodeValue, targetLang);
    }

    return tempDiv.innerHTML;
}

function getProxyUrl(targetUrl) {
    // Check for native mobile environment (Capacitor/Cordova)
    const isNative = window.location.protocol === 'capacitor:' || window.location.protocol === 'http:' && window.location.hostname === 'localhost' && !window.location.port;

    // For local dev with Netlify CLI
    const isNetlifyDev = window.location.hostname === 'localhost' && window.location.port === '8888';
    if (isNetlifyDev) {
        return `/.netlify/functions/proxy?url=${encodeURIComponent(targetUrl)}`;
    }

    // Default to the most reliable public proxy for web/native fallback
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
}

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 5000 } = options; // Lowered default timeout for faster failure
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

/**
 * High-priority global sources for maximum reliability.
 */
const HIGH_PRIORITY_FEEDS = [
    { name: 'Associated Press', url: 'https://apnews.com/feed', source: 'AP News' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', source: 'The Guardian' },
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC News' }
];

async function fetchFromRss(feed, timeout = 5000) {
    try {
        const xmlText = await fetchRssRacing(feed.url, timeout);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 10);

        return items.map(item => ({
            title: item.querySelector("title").textContent.trim(),
            link: item.querySelector("link").textContent,
            pubDate: item.querySelector("pubDate") ? item.querySelector("pubDate").textContent : new Date().toISOString(),
            source: feed.source
        }));
    } catch (e) {
        console.error(`Feed ${feed.name} race failed:`, e);
        throw e;
    }
}

/**
 * Races multiple proxies simultaneously for high-speed RSS fetching.
 */
async function fetchRssRacing(targetUrl, timeout = 5000) {
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}` // Added another proxy
    ];

    // Add local proxy if in dev environment
    if (window.location.port === '8888') {
        proxies.unshift(`/.netlify/functions/proxy?url=${encodeURIComponent(targetUrl)}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const tryProxy = async (proxyUrl) => {
        try {
            const res = await fetch(proxyUrl, { signal: controller.signal });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const text = await res.text();
            if (!text || text.length < 500) throw new Error("Incomplete RSS");
            console.log(`[Proxy Win] ${proxyUrl.split('?')[0]}`);
            return text;
        } catch (e) {
            console.warn(`[Proxy Fail] ${proxyUrl.split('?')[0]}: ${e.message}`);
            throw e;
        }
    };

    try {
        const result = await Promise.any(proxies.map(p => tryProxy(p)));
        clearTimeout(timeoutId);
        return result;
    } catch (e) {
        clearTimeout(timeoutId);
        console.error("All RSS racing proxies failed for", targetUrl);
        throw new Error("All RSS racing proxies failed");
    }
}

/**
 * Races high-priority global feeds to get the fastest reliable news.
 */
async function fetchGlobalNews() {
    console.log("Racing high-priority global feeds...");
    try {
        // Try to get at least one successful feed within 6 seconds
        return await Promise.any(HIGH_PRIORITY_FEEDS.map(feed => fetchFromRss(feed, 6000)));
    } catch (error) {
        console.error("All high-priority feeds failed:", error);
        throw error;
    }
}

/**
 * Attempts to find a destination URL in common redirect/notice pages.
 */
function extractRedirectUrl(html, currentUrl) {
    if (!html || html.length > 30000) return null; // Increased limit slightly

    // 1. Look for meta refresh
    const refreshMatch = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"'>;]+)["']/i);
    if (refreshMatch) return refreshMatch[1].trim();

    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 2. Specialized handling for Google "Redirect Notice"
    const anchors = doc.querySelectorAll('a');
    for (const a of anchors) {
        let href = a.getAttribute('href');
        if (!href) continue;

        // Extract final URL from Google redirect link if necessary
        if (href.includes('google.com/url') && href.includes('q=')) {
            const urlMatch = href.match(/q=([^&]+)/);
            if (urlMatch) href = decodeURIComponent(urlMatch[1]);
        } else if (href.includes('google.com/url') && href.includes('url=')) {
            const urlMatch = href.match(/url=([^&]+)/);
            if (urlMatch) href = decodeURIComponent(urlMatch[1]);
        }

        if (href && href.startsWith('http') && !href.includes('support.google.com') && !href.includes('accounts.google.com')) {
            // If the page is small and has few links, it's likely a redirect page
            if (anchors.length < 10 || html.length < 5000) {
                return href;
            }
        }
    }

    // 3. Look for window.location in scripts
    const scriptMatch = html.match(/window\.location\.replace\((["'])([^"']+)\1\)/);
    if (scriptMatch) return scriptMatch[2];

    const hrefMatch = html.match(/window\.location\.href\s*=\s*(["'])([^"']+)\1/);
    if (hrefMatch) return hrefMatch[2];

    return null;
}

/**
 * Validates if the returned HTML is actual content or a bot-blocking page.
 */
function isValidArticleHTML(html) {
    if (!html || html.length < 200) return false;
    const lower = html.toLowerCase();

    // Check for explicit bot blocker PHRASES (not just words)
    const blockers = [
        'pardon our interruption',
        'distil networks',
        'access to this page has been denied',
        'checking your browser',
        'bot or a human',
        'automated access'
    ];

    if (blockers.some(phrase => lower.includes(phrase))) return false;

    // If it's a tiny page with a redirect notice, we return true so fetchArticleHTML can try to follow it
    if (html.length < 2000 && (lower.includes('redirect') || lower.includes('click here'))) return true;

    return html.length > 1000;
}

/**
 * Races multiple proxies to fetch article HTML, recursively following redirects.
 */
async function fetchArticleHTML(targetUrl, depth = 0) {
    if (depth > 2) throw new Error("Too many redirects");

    console.log(`Fetching (depth ${depth}): ${targetUrl}`);

    const proxies = [
        getProxyUrl(targetUrl),
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`
    ];

    const uniqueProxies = [...new Set(proxies)];

    const fetchProxy = async (url) => {
        const start = Date.now();
        const res = await fetchWithTimeout(url, { timeout: 12000 });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const html = await res.text();

        console.log(`Proxy ${url} responded in ${Date.now() - start}ms. Length: ${html.length}`);

        if (!isValidArticleHTML(html)) {
            console.warn(`Proxy ${url} returned invalid/blocked HTML`);
            throw new Error("Blocked page");
        }

        // Check for internal redirect notice
        const redirectUrl = extractRedirectUrl(html, targetUrl);
        if (redirectUrl && redirectUrl !== targetUrl) {
            console.log(`Detected redirect to: ${redirectUrl}`);
            return await fetchArticleHTML(redirectUrl, depth + 1);
        }

        return html;
    };

    try {
        const result = await Promise.any(uniqueProxies.map(url => fetchProxy(url)));
        return result;
    } catch (error) {
        console.error("Fetch failed for:", targetUrl);
        throw new Error("All proxy sources failed.");
    }
}

async function fetchBingNews(countryCode) {
    try {
        const countryName = COUNTRY_NAMES[countryCode] || countryCode;
        const rssUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(countryName)}+news&format=rss`;

        const xmlText = await fetchRssRacing(rssUrl, 5000);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 10);
        return items.map(item => ({
            title: item.querySelector("title").textContent,
            link: item.querySelector("link").textContent,
            pubDate: item.querySelector("pubDate") ? item.querySelector("pubDate").textContent : new Date().toISOString(),
            source: 'Bing News'
        }));
    } catch (error) {
        console.error("Bing News Error:", error);
        throw error;
    }
}

async function fetchBBCNews(countryCode) {
    try {
        const countryName = COUNTRY_NAMES[countryCode] || countryCode;
        const rssUrl = `https://www.bing.com/news/search?q=site:bbc.com+${encodeURIComponent(countryName)}+news&format=rss`;

        const xmlText = await fetchRssRacing(rssUrl, 5000);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 10);
        return items.map(item => ({
            title: item.querySelector("title").textContent.trim(),
            link: item.querySelector("link").textContent,
            pubDate: item.querySelector("pubDate") ? item.querySelector("pubDate").textContent : new Date().toISOString(),
            source: 'BBC News'
        }));
    } catch (error) {
        console.error("BBC News Error:", error);
        throw error;
    }
}

async function fetchNews(countryCode, targetLang = 'original', forcedSource = null) {
    showLoading();
    let articles = [];
    let fetchError = null;

    try {
        if (!countryCode && !forcedSource) {
            articles = await fetchGlobalNews();
        } else if (forcedSource === 'google' || (!forcedSource && countryCode)) {
            try {
                const info = COUNTRY_LANGUAGES[countryCode];
                if (!info) throw new Error("No regional config");
                const cc = countryCode.toUpperCase();
                let hl = info.lang || 'en';
                let ceid = `${cc}:${hl}`;
                const rssUrl = `https://news.google.com/rss?gl=${cc}&hl=${hl}&ceid=${ceid}`;
                articles = await fetchFromRss({ name: 'Google News', url: rssUrl, source: 'Google News' }, 5000);
                updateSourceDropdown('google');
            } catch (e) {
                console.warn("Regional Google News failed, falling back to Global feeds...");
                articles = await fetchGlobalNews();
            }
        } else if (forcedSource === 'bing') {
            articles = await fetchBingNews(countryCode);
            updateSourceDropdown('bing');
        } else if (forcedSource === 'bbc') {
            articles = await fetchBBCNews(countryCode);
            updateSourceDropdown('bbc');
        }

        if (articles.length === 0) {
            fetchError = "No news headlines found. Please try a different source or region.";
        } else {
            const countryLang = (COUNTRY_LANGUAGES[countryCode] && COUNTRY_LANGUAGES[countryCode].lang) || 'en';
            if (targetLang !== 'original') {
                articles = await Promise.all(articles.map(async (art) => {
                    const tTitle = await translateText(art.title, targetLang);
                    return { ...art, title: tTitle };
                }));
            } else if (countryLang !== 'en' && countryCode) {
                articles = await Promise.all(articles.map(async (art) => {
                    if (art.source === 'Bing News' || art.source === 'BBC News' || art.source === 'AP News' || art.source === 'The Guardian') {
                        const tTitle = await translateText(art.title, countryLang);
                        return { ...art, title: tTitle };
                    }
                    return art;
                }));
            }
            renderNews(articles);
            return; // Success!
        }
    } catch (error) {
        console.error("Fetch News Critical Failure:", error);
        fetchError = "Unable to load news headlines. This usually happens when proxies are temporarily over capacity. Please try again in a few seconds.";
    }

    if (fetchError) {
        showError(fetchError);
    }
}

function renderNews(articles, isSavedView = false) {
    newsContainer.innerHTML = '';
    if (articles.length === 0) {
        showEmpty("No news found.");
        return;
    }

    articles.forEach((article, index) => {
        const card = document.createElement('article');
        card.className = 'news-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.cursor = 'pointer';

        card.onclick = (e) => {
            e.preventDefault();
            openArticle(article);
        };

        // Simple pre-fetching on hover to speed up loading
        card.onmouseenter = () => {
            if (!article.content) {
                // Low priority fetch in background
                fetchArticleHTML(article.link).catch(() => { });
            }
        };

        const date = new Date(article.pubDate).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        card.innerHTML = `
            <div class="news-content">
                ${isSavedView ? `<button class="card-delete-btn" title="Delete">🗑️</button>` : ''}
                <div class="news-source">${article.source}</div>
                <div class="news-title">${article.title}</div>
                <div class="news-meta">
                    <span>${date}</span>
                </div>
            </div>
        `;

        if (isSavedView) {
            const delBtn = card.querySelector('.card-delete-btn');
            if (delBtn) {
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteArticle(e, article.link);
                };
            }
        }

        newsContainer.appendChild(card);
    });
}

// ... (retain existing helper functions like showLoading, showError, etc.) ...

function showLoading() {
    newsContainer.innerHTML = '<div class="loading-state"><h3>Loading...</h3></div>';
}

function showError(msg) {
    newsContainer.innerHTML = `<div class="error-state"><h3>${msg}</h3></div>`;
}

function showEmpty(msg) {
    newsContainer.innerHTML = `<div class="empty-state"><h3>${msg}</h3></div>`;
}

function updateSourceDropdown(source) {
    const sourceDropdown = document.getElementById('source-dropdown');
    if (sourceDropdown && (source === 'google' || source === 'bing' || source === 'bbc')) {
        sourceDropdown.value = source;
    }
}

init();
