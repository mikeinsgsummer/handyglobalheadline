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
let bookmarkedArticles = JSON.parse(localStorage.getItem('bookmarkedArticles')) || [];
let preferredSource = localStorage.getItem('preferredSource') || 'bing';
// Initialize
async function init() {
    await fetchCountries();

    countrySelect.addEventListener('change', () => {
        languageSelect.value = 'original';
        updateLanguageLabel();
        refreshNews();
    });
    languageSelect.addEventListener('change', refreshNews);

    setupReaderHandlers();
    setupSettingsHandlers();
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

    const bookmarkListBtn = document.getElementById('bookmark-list-btn');
    if (bookmarkListBtn) {
        bookmarkListBtn.onclick = showBookmarks;
    }

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

    // Requirement 2: Hide translation select and Save icon in Original mode
    const readerLangSelect = document.getElementById('reader-language-select');
    const saveOfflineBtn = document.getElementById('save-offline');

    if (readerLangSelect) {
        if (isReaderMode) {
            readerLangSelect.classList.remove('hidden');
        } else {
            readerLangSelect.classList.add('hidden');
        }
    }

    if (saveOfflineBtn) {
        if (isReaderMode) {
            saveOfflineBtn.classList.remove('hidden');
        } else {
            saveOfflineBtn.classList.add('hidden');
        }
    }

    openArticle(currentArticle);
}

async function openArticle(article, forceOriginal = false) {
    currentArticle = article;
    const overlay = document.getElementById('reader-overlay');
    const content = document.getElementById('reader-content');
    const readerLangSelect = document.getElementById('reader-language-select');

    // Reset state when opening a NEW article
    if (overlay.classList.contains('hidden')) {
        if (readerLangSelect) readerLangSelect.value = 'original';
        isReaderMode = true; // Default
    }

    if (forceOriginal) {
        isReaderMode = false;
    }

    // Refresh UI toggle state
    const switchOpts = document.querySelectorAll('#reader-mode-switch .switch-opt');
    switchOpts.forEach(opt => {
        const mode = opt.getAttribute('data-mode');
        if ((mode === 'reader' && isReaderMode) || (mode === 'original' && !isReaderMode)) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    const targetLang = readerLangSelect ? readerLangSelect.value : 'original';

    // Update external link
    const externalBtn = document.getElementById('open-external');
    if (externalBtn) externalBtn.href = article.link;

    overlay.classList.remove('hidden');

    const modeSwitch = document.getElementById('reader-mode-switch');

    // For saved articles, we always use Reader Mode and hide the switch
    // Check for .content (standard for saved) or .savedAt (extra safety)
    const saveBtn = document.getElementById('save-offline');
    if (article.content || article.savedAt) {
        if (modeSwitch) modeSwitch.style.display = 'none';
        if (saveBtn) saveBtn.classList.add('hidden');
        if (!isReaderMode) {
            setReaderMode(true);
            return;
        }
    } else {
        if (modeSwitch) modeSwitch.style.display = 'flex';
        // Note: visibility for non-saved articles is handled by setReaderMode(isReaderMode)
    }

    content.innerHTML = '<div class="loading-state"><h3>Optimizing for reading...</h3></div>';

    if (!isReaderMode) {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
            try {
                await window.Capacitor.Plugins.Browser.open({ url: article.link });
                content.innerHTML = `
                    <div class="info-state">
                        <h3>Original View</h3>
                        <p>The original webpage is open in a native browser overlay.</p>
                        <div class="error-actions">
                            <button onclick="setReaderMode(true)" class="text-btn primary">Switch to Reader Mode</button>
                        </div>
                    </div>
                `;
                return;
            } catch (e) {
                console.error("Native Browser Error:", e);
            }
        }

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
                    <p>Contents pending to be loaded.</p>
                    <p><strong>Access it in Web is advised</strong></p>
                    <div class="error-actions">
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
        <div class="info-state">
            <p>Contents loading delayed.</p>
            <p><strong>Jumping to Original view...</strong></p>
        </div>
        `;

        const failureLink = article.link;
        setTimeout(() => {
            // Only switch if we are still on the same article and still in reader mode
            if (currentArticle && currentArticle.link === failureLink && isReaderMode) {
                setReaderMode(false);
            }
        }, 1000);
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
    document.body.classList.remove('bookmarks-view-active');
    document.body.classList.add('saved-view-active');
    if (savedArticles.length === 0) {
        showEmpty("You haven't saved any articles yet.");
        // Add a back button even if empty
        const backBanner = document.createElement('div');
        backBanner.className = 'info-banner saved-header';
        backBanner.innerHTML = `
            <div class="banner-left">
                <button onclick="refreshNews()" class="icon-btn-text">← Back to Home</button>
            </div>
            <div class="banner-title">Saved Articles</div>
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
                <button onclick="refreshNews()" class="icon-btn-text">← Back to Home</button>
            </div>
            <div class="banner-title">Saved Articles</div>
            <div class="banner-right">
                <button onclick="deleteAllSavedArticles()" class="icon-btn-text delete-all" title="Delete All">🗑️ Clear All</button>
            </div>
        `;
    newsContainer.prepend(backBanner);
}

function toggleBookmark(article, event) {
    if (event) event.stopPropagation();

    const index = bookmarkedArticles.findIndex(a => a.link === article.link);
    if (index > -1) {
        bookmarkedArticles.splice(index, 1);
        console.log("Removed from bookmarks");
    } else {
        bookmarkedArticles.push({
            title: article.title,
            link: article.link,
            pubDate: article.pubDate,
            source: article.source
        });
        console.log("Added to bookmarks");
    }

    localStorage.setItem('bookmarkedArticles', JSON.stringify(bookmarkedArticles));

    // Update UI if we are in the bookmarks view
    if (document.body.classList.contains('bookmarks-view-active')) {
        showBookmarks();
    } else {
        // Just refresh the current list to update stars
        const starBtn = event ? event.currentTarget : null;
        if (starBtn && (starBtn.classList.contains('bookmark-btn') || starBtn.closest('.bookmark-btn'))) {
            const btn = starBtn.classList.contains('bookmark-btn') ? starBtn : starBtn.closest('.bookmark-btn');
            const isActive = btn.classList.toggle('active');

            // Swap SVG content
            btn.innerHTML = isActive ?
                `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>` :
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        }
    }
}

function showBookmarks() {
    document.body.classList.remove('saved-view-active');
    document.body.classList.add('bookmarks-view-active');

    if (bookmarkedArticles.length === 0) {
        showEmpty("You haven't bookmarked any headlines yet.");
        const backBanner = document.createElement('div');
        backBanner.className = 'info-banner saved-header';
        backBanner.innerHTML = `
            <div class="banner-left">
                <button onclick="refreshNews()" class="icon-btn-text">← Back to Home</button>
            </div>
            <div class="banner-title">Bookmarks</div>
        `;
        newsContainer.prepend(backBanner);
        return;
    }

    renderNews(bookmarkedArticles, false, true); // isSavedView=false, isBookmarkView=true

    const backBanner = document.createElement('div');
    backBanner.className = 'info-banner saved-header';
    backBanner.innerHTML = `
            <div class="banner-left">
                <button onclick="refreshNews()" class="icon-btn-text">← Back to Home</button>
            </div>
            <div class="banner-title">Bookmarks <svg viewBox="0 0 24 24" fill="currentColor" style="width:1.2rem; height:1.2rem; display:inline-block; vertical-align:middle; margin-left:5px; color:#facc15;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></div>
            <div class="banner-right">
                <button onclick="clearAllBookmarks()" class="icon-btn-text delete-all" title="Clear All">🗑️ Clear All</button>
            </div>
        `;
    newsContainer.prepend(backBanner);
}

function clearAllBookmarks() {
    if (confirm("Are you sure you want to clear all bookmarks?")) {
        bookmarkedArticles = [];
        localStorage.setItem('bookmarkedArticles', JSON.stringify(bookmarkedArticles));
        showBookmarks();
    }
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
    document.body.classList.remove('bookmarks-view-active');
    const country = countrySelect.value;
    const lang = languageSelect.value;
    if (country) fetchNews(country, lang);
}

async function detectUserCountry() {
    try {
        // Primary Attempt: ipapi.co
        const response = await fetchWithTimeout('https://ipapi.co/json/', { timeout: 3000 });
        const data = await response.json();
        if (data.country_code) return data.country_code.toLowerCase();
    } catch (e) {
        console.warn('Primary country detection failed, trying fallback...');
    }

    try {
        // Fallback 1: ip-api.com (HTTP only for free tier, so might fail on HTTPS sites unless proxied)
        // Using AllOrigins as it's already used elsewhere
        const proxyUrl = getProxyUrl('http://ip-api.com/json');
        const response = await fetchWithTimeout(proxyUrl, { timeout: 3000 });
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
    const { timeout = 5000 } = options;
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
 * Universal fetch that uses CapacitorHttp for native environments to bypass CORS/Proxies.
 */
async function nativeFetch(url, options = {}) {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    const useNative = isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;

    if (useNative) {
        const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
        console.log(`[Native] Fetching: ${url}`);
        try {
            const response = await window.Capacitor.Plugins.CapacitorHttp.get({
                url: url,
                headers: {
                    ...options.headers,
                    'User-Agent': mobileUA,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                },
                connectTimeout: options.timeout || 15000,
                readTimeout: options.timeout || 15000
            });

            if (response.status >= 200 && response.status < 300) {
                return response.data;
            }
            throw new Error(`Native fetch status ${response.status}`);
        } catch (e) {
            console.error("Native fetch internal error:", e);
            throw e;
        }
    }

    // Fallback to standard fetch (for browser or if native plugin fails)
    const res = await fetchWithTimeout(url, options);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.text();
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
 * Uses CapacitorHttp if available to bypass CORS in native app.
 */
async function fetchRssRacing(targetUrl, timeout = 7000) {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

    // 1. In native environment, try direct fetch FIRST (bypasses CORS/Proxies)
    if (isNative) {
        try {
            const xmlText = await nativeFetch(targetUrl, { timeout: 6000 });
            if (xmlText && (xmlText.includes('<rss') || xmlText.includes('<feed') || xmlText.includes('<?xml'))) {
                console.log(`[Native RSS Success] Direct fetch for ${targetUrl.slice(0, 30)}`);
                return xmlText;
            }
            console.warn(`[Native RSS Junk] Direct fetch returned non-RSS content for ${targetUrl.slice(0, 30)}`);
        } catch (e) {
            console.warn(`[Native Direct Fail] ${e.message}. Falling back to proxy racing...`);
        }
    }

    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}`
    ];

    // Add local proxy if in dev environment
    if (window.location.port === '8888') {
        proxies.unshift(`/.netlify/functions/proxy?url=${encodeURIComponent(targetUrl)}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const tryProxy = async (proxyUrl) => {
        try {
            const text = await nativeFetch(proxyUrl, { timeout: 8000 });
            if (!text || text.length < 500) throw new Error("Incomplete RSS");
            // Check if proxy returned bot blocker instead of RSS
            if (text.includes('pardon our interruption') || text.includes('checking your browser')) {
                throw new Error("Proxy returned bot-blocked page");
            }
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
    const scriptMatch = html.match(/window\.location\.(?:replace|href)\s*=\s*(["'])([^"']+)\1/);
    if (scriptMatch) return scriptMatch[2];

    // 4. Specialized handling for Bing apiclick
    if ((currentUrl.includes('bing.com') || currentUrl.includes('bing-news')) && html.includes('apiclick.aspx')) {
        const apiclickMatch = html.match(/href=["']([^"']*apiclick\.aspx[^"']+)["']/i);
        if (apiclickMatch) return apiclickMatch[1];
    }

    // 5. Look for any single high-confidence link in a tiny page
    if (html.length < 3000 && anchors.length === 1) {
        return anchors[0].href;
    }

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
    const hasRedirectIndicators = lower.includes('redirect') ||
        lower.includes('click here') ||
        lower.includes('http-equiv="refresh"') ||
        lower.includes('window.location');

    if (html.length < 2500 && hasRedirectIndicators) return true;

    return html.length > 800; // Slightly more permissive length
}

/**
 * Races multiple proxies to fetch article HTML, recursively following redirects.
 */
async function fetchArticleHTML(targetUrl, depth = 0) {
    if (depth > 2) throw new Error("Too many redirects");

    console.log(`Fetching (depth ${depth}): ${targetUrl}`);

    const proxies = [
        targetUrl, // Try direct first (nativeFetch handles this well for native)
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`
    ];

    const uniqueProxies = [...new Set(proxies)];

    const fetchProxy = async (url) => {
        const start = Date.now();
        const html = await nativeFetch(url, { timeout: 12000 });

        console.log(`Proxy ${url} responded in ${Date.now() - start}ms. Length: ${html.length}`);

        if (!isValidArticleHTML(html)) {
            console.warn(`Proxy ${url} returned invalid/blocked HTML`);
            throw new Error("Blocked page");
        }

        // Check for internal redirect notice
        const redirectUrl = extractRedirectUrl(html, targetUrl);
        if (redirectUrl && redirectUrl !== targetUrl) {
            let finalRedirect = redirectUrl;
            // Handle relative URLs
            if (!redirectUrl.startsWith('http')) {
                try {
                    finalRedirect = new URL(redirectUrl, targetUrl).href;
                } catch (e) {
                    console.warn("Failed to construct absolute redirect URL", e);
                }
            }
            console.log(`Detected redirect to: ${finalRedirect}`);
            return await fetchArticleHTML(finalRedirect, depth + 1);
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
        const rssUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(countryName)}+news&format=rss&qs=n&form=NTYA&sp=-1&pq=${encodeURIComponent(countryName)}+news&count=20`;

        const xmlText = await fetchRssRacing(rssUrl, 7000);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 10);
        if (items.length === 0) throw new Error("Bing returned zero results");

        return items.map(item => ({
            title: item.querySelector("title").textContent,
            link: item.querySelector("link").textContent,
            pubDate: item.querySelector("pubDate") ? item.querySelector("pubDate").textContent : new Date().toISOString(),
            source: 'Bing News'
        }));
    } catch (error) {
        console.error("Bing News Error, trying Google fallback:", error);
        // Fallback to Google News search for the same country
        const info = COUNTRY_LANGUAGES[countryCode];
        if (info) {
            const cc = countryCode.toUpperCase();
            const hl = info.lang || 'en';
            const rssUrl = `https://news.google.com/rss?gl=${cc}&hl=${hl}&ceid=${cc}:${hl}`;
            return await fetchFromRss({ name: 'Google (fallback)', url: rssUrl, source: 'Bing News' }, 6000);
        }
        throw error;
    }
}

async function fetchBBCNews(countryCode) {
    try {
        const countryName = COUNTRY_NAMES[countryCode] || countryCode;
        const rssUrl = `https://www.bing.com/news/search?q=site:bbc.com+${encodeURIComponent(countryName)}+news&format=rss&qs=n&form=NTYA&count=20`;

        const xmlText = await fetchRssRacing(rssUrl, 7000);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 10);
        if (items.length === 0) throw new Error("BBC search returned zero results");

        return items.map(item => ({
            title: item.querySelector("title").textContent.trim(),
            link: item.querySelector("link").textContent,
            pubDate: item.querySelector("pubDate") ? item.querySelector("pubDate").textContent : new Date().toISOString(),
            source: 'BBC News'
        }));
    } catch (error) {
        console.error("BBC News Error (via Bing), trying Google/BBC fallback:", error);
        // Fallback: Use Google News but search specifically for BBC results
        const countryName = COUNTRY_NAMES[countryCode] || countryCode;
        const rssUrl = `https://news.google.com/rss/search?q=site:bbc.com+${encodeURIComponent(countryName)}&hl=en-GB&gl=GB&ceid=GB:en`;
        return await fetchFromRss({ name: 'Google/BBC', url: rssUrl, source: 'BBC News' }, 7000);
    }
}

function setupSettingsHandlers() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const saveSettings = document.getElementById('save-settings');
    const sourceRadios = document.getElementsByName('preferred-source');

    if (settingsBtn) {
        settingsBtn.onclick = () => {
            // Set radio to current preference
            sourceRadios.forEach(radio => {
                if (radio.value === preferredSource) radio.checked = true;
            });
            settingsModal.classList.remove('hidden');
        };
    }

    if (closeSettings) {
        closeSettings.onclick = () => settingsModal.classList.add('hidden');
    }

    if (saveSettings) {
        saveSettings.onclick = () => {
            const selected = Array.from(sourceRadios).find(r => r.checked);
            if (selected) {
                preferredSource = selected.value;
                localStorage.setItem('preferredSource', preferredSource);
            }
            settingsModal.classList.add('hidden');

            // Refresh if country is selected
            if (countrySelect && countrySelect.value) {
                refreshNews();
            }
        };
    }
}

async function fetchNews(countryCode, targetLang = 'original', forcedSource = null) {
    showLoading();
    let articles = [];
    let fetchError = null;

    try {
        if (!countryCode && !forcedSource) {
            articles = await fetchGlobalNews();
        } else {
            // Priority sequence: forced, then preferred, then others
            let sequence = forcedSource ? [forcedSource] : [preferredSource];

            // Add other sources to the sequence if not already present
            if (!forcedSource) {
                const others = ['bing', 'bbc', 'google'].filter(s => s !== preferredSource);
                sequence = sequence.concat(others);
            }

            let success = false;

            for (const source of sequence) {
                try {
                    if (source === 'bing') {
                        articles = await fetchBingNews(countryCode);
                        success = true;
                    } else if (source === 'bbc') {
                        articles = await fetchBBCNews(countryCode);
                        success = true;
                    } else if (source === 'google' || (source === 'google_regional')) {
                        const info = COUNTRY_LANGUAGES[countryCode];
                        if (info) {
                            const cc = countryCode.toUpperCase();
                            let hl = info.lang || 'en';
                            let ceid = `${cc}:${hl}`;
                            const rssUrl = `https://news.google.com/rss?gl=${cc}&hl=${hl}&ceid=${ceid}`;
                            articles = await fetchFromRss({ name: 'Google News', url: rssUrl, source: 'Google News' }, 5000);
                            success = true;
                        }
                    }
                    if (success && articles.length > 0) break;
                } catch (e) {
                    console.warn(`Source ${source} failed, trying next in sequence...`);
                }
            }

            // Final fallback to global if nothing worked
            if (!success || articles.length === 0) {
                console.warn("All regional sources failed, falling back to Global Racing...");
                articles = await fetchGlobalNews();
            }
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

function renderNews(articles, isSavedView = false, isBookmarkView = false) {
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

        const isBookmarked = bookmarkedArticles.some(a => a.link === article.link);

        card.onclick = (e) => {
            e.preventDefault();
            // Requirement 4: From bookmark UI, open as Original view
            openArticle(article, isBookmarkView);
        };

        // Simple pre-fetching on hover to speed up loading
        card.onmouseenter = () => {
            if (!article.content) {
                fetchArticleHTML(article.link).catch(() => { });
            }
        };

        const date = new Date(article.pubDate).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        card.innerHTML = `
            <div class="news-content">
                <div class="news-source">
                    <div class="source-left">
                        <span>${article.source}</span>
                        <span class="news-date">${date}</span>
                    </div>
                    <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" title="Bookmark">
                        ${isBookmarked ?
                `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>` :
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
            }
                    </button>
                </div>
                <div class="news-title">${article.title}</div>
                ${isSavedView ? `<button class="card-delete-btn" title="Delete">🗑️ Delete</button>` : ''}
            </div>
        `;

        const bkmkBtn = card.querySelector('.bookmark-btn');
        bkmkBtn.onclick = (e) => {
            e.stopPropagation();
            toggleBookmark(article, e);
        };

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

function showLoading() {
    newsContainer.innerHTML = '<div class="loading-state"><h3>Loading...</h3></div>';
}

function showError(msg) {
    newsContainer.innerHTML = `<div class="error-state"><h3>${msg}</h3></div>`;
}

function showEmpty(msg) {
    newsContainer.innerHTML = `<div class="empty-state"><h3>${msg}</h3></div>`;
}

init();
