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
    'za': { lang: 'en', name: 'English' }
};

const SUPPORTED_CODES = new Set(Object.keys(COUNTRY_LANGUAGES));
const COUNTRY_NAMES = {}; // Map code -> name for Bing search

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
    const country = countrySelect.value;
    const lang = languageSelect.value;
    if (country) fetchNews(country, lang);
}

async function detectUserCountry() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return data.country_code ? data.country_code.toLowerCase() : null;
    } catch (error) {
        return null;
    }
}

async function fetchCountries() {
    try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
        const data = await response.json();

        const countries = data
            .filter(country => SUPPORTED_CODES.has(country.cca2.toLowerCase()))
            .sort((a, b) => a.name.common.localeCompare(b.name.common));

        countrySelect.innerHTML = '<option value="">Select a country...</option>';
        countries.forEach(country => {
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
        if (detected && SUPPORTED_CODES.has(detected)) {
            defaultCountry = detected;
        }

        countrySelect.value = defaultCountry;
        updateLanguageLabel();
        fetchNews(defaultCountry, 'original');

    } catch (error) {
        countrySelect.innerHTML = '<option value="">Error loading countries</option>';
    }
}

// Client-side translation helper
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

// Proxy helper to handle environment-specific logic
function getProxyUrl(targetUrl) {
    const isNetlify = window.location.hostname.includes('netlify.app');

    // If on Netlify, use the local proxy function
    if (isNetlify) {
        return `/.netlify/functions/proxy?url=${encodeURIComponent(targetUrl)}`;
    }

    // For GitHub Pages and local development, use AllOrigins RAW endpoint
    // This is faster as it doesn't wrap the response in a JSON object
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
}

// Timeout helper
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 2000 } = options;
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

async function fetchBingNews(countryCode) {
    try {
        const countryName = COUNTRY_NAMES[countryCode] || countryCode;
        const rssUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(countryName)}+news&format=rss`;
        const proxyUrl = getProxyUrl(rssUrl);

        console.log(`Fetching Bing News for ${countryCode} via ${proxyUrl}`);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Bing proxy failed");

        const xmlText = await response.text();
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
        // Use Bing RSS search restricted to BBC domain for the specific country
        const rssUrl = `https://www.bing.com/news/search?q=site:bbc.com+${encodeURIComponent(countryName)}+news&format=rss`;
        const proxyUrl = getProxyUrl(rssUrl);

        console.log(`Fetching BBC News for ${countryCode} via ${proxyUrl}`);
        const response = await fetchWithTimeout(proxyUrl, { timeout: 2000 });
        if (!response.ok) throw new Error("BBC News source failed");

        const xmlText = await response.text();
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

    // 1. Try Google News with 2s timeout
    try {
        const info = COUNTRY_LANGUAGES[countryCode];
        const cc = countryCode.toUpperCase();
        let hl = info.lang;
        let gl = cc;
        let ceid = `${cc}:${info.lang}`;

        const rssUrl = `https://news.google.com/rss?gl=${gl}&hl=${hl}&ceid=${ceid}`;
        const proxyUrl = getProxyUrl(rssUrl);
        console.log(`Fetching Google News via ${proxyUrl}`);

        const response = await fetchWithTimeout(proxyUrl, { timeout: 2000 });
        if (!response.ok) throw new Error("Google News Request Failed");

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const parseError = xmlDoc.getElementsByTagName("parsererror");
        if (parseError.length > 0) throw new Error("Google News Parse Error");

        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 10);
        articles = items.map(item => ({
            title: item.querySelector("title").textContent,
            link: item.querySelector("link").textContent,
            pubDate: item.querySelector("pubDate").textContent,
            source: item.querySelector("source") ? item.querySelector("source").textContent : 'Google News'
        }));

        updateSourceDropdown('google');

    } catch (error) {
        // If user explicitly chose Google, don't automatically fallback silently if it fails
        if (forcedSource === 'google') {
            console.error("Manual Google News fetch failed:", error);
            fetchError = `Google News failed: ${error.message}`;
        } else if (!forcedSource) {
            console.warn(`Google News failed or timed out: ${error.message}. Switching to Bing...`);
            try {
                articles = await fetchBingNews(countryCode);
                updateSourceDropdown('bing');
            } catch (bingError) {
                console.warn(`Bing News also failed. Switching to BBC...`);
                try {
                    articles = await fetchBBCNews(countryCode);
                    updateSourceDropdown('bbc');
                } catch (bbcError) {
                    fetchError = "Failed to fetch news from all sources (Google, Bing, BBC).";
                }
            }
        }
    }

    // 2. If user specifically requested Bing
    if (forcedSource === 'bing') {
        try {
            articles = await fetchBingNews(countryCode);
            updateSourceDropdown('bing');
        } catch (error) {
            console.warn(`Manual Bing News failed. Switching to BBC...`);
            try {
                articles = await fetchBBCNews(countryCode);
                updateSourceDropdown('bbc');
            } catch (bbcError) {
                fetchError = `Bing News failed and BBC News fallback also failed.`;
            }
        }
    }

    // 3. If user specifically requested BBC
    if (forcedSource === 'bbc') {
        try {
            articles = await fetchBBCNews(countryCode);
            updateSourceDropdown('bbc');
        } catch (error) {
            fetchError = `BBC News failed: ${error.message}`;
        }
    }

    if (fetchError) {
        showError(fetchError);
        return;
    }

    const countryLang = COUNTRY_LANGUAGES[countryCode].lang;

    if (targetLang !== 'original') {
        // User explicitly chose a language, translate everything
        const translatedArticles = await Promise.all(articles.map(async (art) => {
            const tTitle = await translateText(art.title, targetLang);
            return { ...art, title: tTitle };
        }));
        renderNews(translatedArticles);
    } else if (countryLang !== 'en') {
        // User chose "Original", but Bing/BBC are in English.
        // Translate Bing/BBC to the country's native language if it's not English.
        const translatedArticles = await Promise.all(articles.map(async (art) => {
            if (art.source === 'Bing News' || art.source === 'BBC News') {
                const tTitle = await translateText(art.title, countryLang);
                return { ...art, title: tTitle };
            }
            return art;
        }));
        renderNews(translatedArticles);
    } else {
        renderNews(articles);
    }
}

function renderNews(articles) {
    newsContainer.innerHTML = '';
    if (articles.length === 0) {
        showEmpty("No news found.");
        return;
    }

    articles.forEach((article, index) => {
        const card = document.createElement('article');
        card.className = 'news-card';
        card.style.animationDelay = `${index * 0.1}s`;

        const date = new Date(article.pubDate).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        card.innerHTML = `
            <div class="news-content">
                <div class="news-source">${article.source}</div>
                <a href="${article.link}" target="_blank" class="news-title">${article.title}</a>
                <div class="news-meta">
                    <span>${date}</span>
                </div>
            </div>
        `;
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

function updateSourceDropdown(source) {
    const sourceDropdown = document.getElementById('source-dropdown');
    if (sourceDropdown && (source === 'google' || source === 'bing' || source === 'bbc')) {
        sourceDropdown.value = source;
    }
}

init();
