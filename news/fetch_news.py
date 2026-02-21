import os
import sys
import json
import requests
import feedparser
import time
import datetime
import pytz
import random
import logging
import socket
from eventregistry import EventRegistry, QueryArticlesIter, QueryItems
from concurrent.futures import ThreadPoolExecutor, as_completed

# =========================
# CONFIG & LOGGING
# =========================
# Set global socket timeout to prevent indefinite hangs in libraries like feedparser
socket.setdefaulttimeout(30)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# API Keys from environment
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
NEWSDATA_KEY = os.getenv("NEWSDATA_KEY")
THENEWS_KEY = os.getenv("THENEWS_KEY")
GNEWS_KEY = os.getenv("GNEWS_KEY")
NEWS_API_AI_KEY = os.getenv("NEWS_API_AI_KEY")
GEMINI_KEY = os.getenv("GEMINI_KEY")

# Settings
MAX_ITEMS_PER_SOURCE = 30
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
})

# Output Folder (save to the root of the cron-main folder)
OUTPUT_DIR = os.path.dirname(BASE_DIR)
# Log absolute path for verification
logging.info(f"Base Directory: {BASE_DIR}")
logging.info(f"Target Output Directory: {OUTPUT_DIR}")

# Category Definitions (Strictly unified to /news folder as requested)
CATEGORIES = {
    "global": {"name": "Headline News", "zh": "世界头条", "file": "topnews", "folder": "news"},
    "market": {"name": "Finance", "zh": "财经头条", "file": "money", "folder": "news"},
    "ai": {"name": "AI Analysis", "zh": "AI深度分析", "file": "ainews", "folder": "news"},
    "charlotte": {"name": "Local Life", "zh": "本地生活", "file": "local", "folder": "news"}
}

# =========================
# UTILITIES
# =========================

def safe_get(url, params=None, name="API"):
    try:
        r = SESSION.get(url, params=params, timeout=20)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logging.error(f"{name} request failed: {e}")
        return {}

def dedupe(articles):
    seen_urls = set()
    seen_titles = set()
    unique = []
    for a in articles:
        url = a.get("url", "").strip().lower()
        title = " ".join((a.get("title") or "").split()).lower()
        if url and url not in seen_urls and title and title not in seen_titles:
            seen_urls.add(url)
            seen_titles.add(title)
            unique.append(a)
    return unique

# =========================
# FETCH FUNCTIONS (Parallelized internally)
# =========================

def fetch_rss(url, source_name, retries=2):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/"
    }
    for attempt in range(retries + 1):
        try:
            logging.info(f"Fetching RSS: {source_name} from {url} (Attempt {attempt+1})")
            response = SESSION.get(url, timeout=20, headers=headers, stream=False)
            response.raise_for_status()
            
            feed = feedparser.parse(response.content)
            articles = []
            for entry in feed.entries:
                articles.append({
                    "title": entry.title,
                    "description": (entry.get("summary", "") or entry.get("description", "")),
                    "url": entry.link,
                    "source": source_name,
                    "published_at": entry.get("published", "")
                })
            logging.info(f"Fetched {len(articles)} articles from {source_name}")
            return articles
        except Exception as e:
            if attempt < retries:
                logging.warning(f"RSS {source_name} attempt {attempt+1} failed ({e}), retrying...")
                time.sleep(3)
            else:
                logging.error(f"RSS {source_name} failed after {retries+1} attempts: {e}")
                return []
    return []

def fetch_top_news():
    articles = []
    tasks = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        if NEWS_API_KEY:
            tasks.append(pool.submit(safe_get, "https://newsapi.org/v2/top-headlines", {"apiKey": NEWS_API_KEY, "language": "en", "pageSize": 30}, "NewsAPI_Global"))
        if NEWSDATA_KEY:
            tasks.append(pool.submit(safe_get, "https://newsdata.io/api/1/news", {"apikey": NEWSDATA_KEY, "language": "en", "category": "top"}, "NewsData_Global"))
        
        # Add Google News Top Headlines RSS as a robust fallback
        google_rss = "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"
        tasks.append(pool.submit(fetch_rss, google_rss, "Google News (Global)"))

        for future in as_completed(tasks):
            res = future.result()
            if isinstance(res, list): # RSS
                articles.extend(res)
            elif isinstance(res, dict):
                if "articles" in res: # NewsAPI
                    articles.extend([{"title": a["title"], "url": a["url"], "description": a.get("description", ""), "source": a["source"]["name"]} for a in res.get("articles", [])])
                elif "results" in res: # NewsData
                    articles.extend([{"title": a["title"], "url": a["link"], "description": a.get("description", ""), "source": a.get("source_id", "NewsData")} for a in res.get("results", [])])
    return articles

def fetch_market_news():
    articles = []
    query = "stock market OR finance OR crypto OR equities OR economy OR inflation"
    tasks = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        if NEWS_API_KEY:
            tasks.append(pool.submit(safe_get, "https://newsapi.org/v2/everything", {"apiKey": NEWS_API_KEY, "q": query, "language": "en", "pageSize": 30}, "NewsAPI_Market"))
        if THENEWS_KEY:
            tasks.append(pool.submit(safe_get, "https://api.thenewsapi.com/v1/news/all", {"api_token": THENEWS_KEY, "language": "en", "search": "finance stocks", "limit": 5}, "TheNewsAPI_Market"))
        
        # Add Google News Market RSS as a robust fallback
        google_rss = "https://news.google.com/rss/search?q=stock+market+finance+economy&hl=en-US&gl=US&ceid=US:en"
        tasks.append(pool.submit(fetch_rss, google_rss, "Google News (Market)"))

        for future in as_completed(tasks):
            res = future.result()
            if isinstance(res, list): # RSS
                articles.extend(res)
            elif isinstance(res, dict):
                if "articles" in res:
                    articles.extend([{"title": a["title"], "url": a["url"], "description": a.get("description", ""), "source": a["source"]["name"]} for a in res.get("articles", [])])
                elif "data" in res:
                    articles.extend([{"title": a["title"], "url": a["url"], "description": a.get("description", ""), "source": a.get("source", "TheNewsAPI")} for a in res.get("data", [])])
    return articles

def fetch_ai_news_rich():
    articles = []
    if NEWS_API_AI_KEY:
        try:
            er = EventRegistry(apiKey=NEWS_API_AI_KEY)
            q = QueryArticlesIter(conceptUri=er.getConceptUri("Artificial intelligence"), lang="eng")
            for a in q.execQuery(er, sortBy="rel", maxItems=25):
                articles.append({"title": a["title"], "url": a["url"], "description": a.get("body", "")[:350], "source": "EventRegistry"})
        except Exception as e: logging.error(f"EventRegistry failed: {e}")

    ai_feeds = {
        "TechCrunch": "https://techcrunch.com/category/artificial-intelligence/feed/",
        "VentureBeat": "https://venturebeat.com/category/ai/feed/",
        "DeepLearning.AI": "https://www.deeplearning.ai/the-batch/rss/",
        "TLDR AI": "https://tldr.tech/ai/rss"
    }
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(fetch_rss, url, name) for name, url in ai_feeds.items()]
        for future in as_completed(futures):
            articles.extend(future.result())
    return articles

def fetch_charlotte_news_rich():
    articles = []
    local_feeds = {
        "WCNC": "https://www.wcnc.com/feeds/syndication/rss/news/local",
        "WCCB": "https://www.wccbcharlotte.com/feed/"
    }
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = [pool.submit(fetch_rss, url, name) for name, url in local_feeds.items()]
        # Add Google News as a robust fallback/supplement (increase count to ensure plenty of inputs)
        google_rss = "https://news.google.com/rss/search?q=Charlotte+NC+news&hl=en-US&gl=US&ceid=US:en"
        futures.append(pool.submit(fetch_rss, google_rss, "Google News (Charlotte)"))
        
        if GNEWS_KEY:
            futures.append(pool.submit(safe_get, "https://gnews.io/api/v4/search", {"token": GNEWS_KEY, "q": "Charlotte NC", "lang": "en", "max": 10}, "GNews_Charlotte"))
        
        for future in as_completed(futures):
            res = future.result()
            if isinstance(res, list): # RSS
                articles.extend(res)
            elif isinstance(res, dict) and "articles" in res: # GNews
                articles.extend([{"title": a["title"], "url": a["url"], "description": a.get("description", ""), "source": a["source"]["name"]} for a in res.get("articles", [])])
    return articles

# =========================
# AI PROCESSING (GEMINI) - BATCHED
# =========================

def call_gemini(prompt, max_retries=3):
    if not GEMINI_KEY: return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    for attempt in range(max_retries):
        try:
            # Use SESSION for better connection pooling
            r = SESSION.post(url, json=body, timeout=120)
            if r.status_code == 429:
                # More aggressive backoff with jitter
                wait_time = (5 * (2 ** attempt)) + (random.random() * 5)
                logging.warning(f"Gemini rate limit (429) on attempt {attempt+1}. Retrying in {wait_time:.2f}s...")
                time.sleep(wait_time)
                continue
                
            r.raise_for_status()
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            # Clean up potential markdown formatting if Gemini returns it
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            return json.loads(text)
        except Exception as e:
            resp_content = r.text if 'r' in locals() else "No response"
            logging.error(f"Gemini call attempt {attempt+1} failed ({len(resp_content)} chars): {e}")
            if attempt < max_retries - 1:
                time.sleep(5) # Base wait between non-429 failures
                continue
            return None
    return None

def ai_process_bundle(category_id, raw_list, category_name):
    """Performs Enrichment and Multi-Language Translation (ZH/ES) in ONE single Gemini call."""
    if not raw_list: return None
    
    # 20 articles as requested
    articles_to_process = raw_list[:20]
    logging.info(f"Bundling Enrichment & Translation for {category_name} (Articles: {len(articles_to_process)})...")
    
    # Payload optimization: truncate descriptions even more for the bundle
    input_data = []
    for i, a in enumerate(articles_to_process):
        desc = (a.get("description") or a.get("desc") or "")[:300]
        input_data.append({"id": i, "title": a["title"], "desc": desc})

    prompt = f"""
    Task: High-Quality Analysis and Multi-Language Translation for {category_name} news.
    Current Date: {datetime.datetime.now().strftime('%Y-%m-%d')}
    
    Articles: {json.dumps(input_data)}
    
    Requirements:
    1. Process EXACTLY {len(articles_to_process)} articles.
    2. For EACH article, generate:
       - score (0-10.0), sentiment (Positive/Neutral/Negative), impact (High/Med/Low).
       - Three versions of (title, description [succinct], why_matters [deep insight, 120 chars]):
         - "en": English
         - "zh": Chinese (Simplified)
         - "es": Spanish
    3. For BOTH the Category Summary (3 sentences) and Landscape Insight (1 sentence), provide "en", "zh", and "es" versions.
    4. Provide a list of 3-4 trending clusters (e.g., "AI Regulation", "Market Rally") in all three languages.
    
    CRITICAL: 
    - Return ONLY valid JSON.
    - Avoid placeholders. 
    - Ensure translations are professional and accurate.
    
    Structure: {{
      "en": {{ "summary": "...", "insight": "...", "clusters": [...], "articles": [{{ "id": idx, "score": float, "sentiment": "...", "impact": "...", "title": "...", "description": "...", "why_matters": "..." }}] }},
      "zh": {{ "summary": "...", "insight": "...", "clusters": [...], "articles": [{{ "id": idx, "score": float, "sentiment": "...", "impact": "...", "title": "...", "description": "...", "why_matters": "..." }}] }},
      "es": {{ "summary": "...", "insight": "...", "clusters": [...], "articles": [{{ "id": idx, "score": float, "sentiment": "...", "impact": "...", "title": "...", "description": "...", "why_matters": "..." }}] }}
    }}
    """
    
    bundle = call_gemini(prompt)
    if not bundle or "en" not in bundle:
        logging.error(f"Bundle processing failed for {category_id}")
        return None
        
    # Inject original URLs and sources back into the bundled articles
    for lang in ["en", "zh", "es"]:
        if lang in bundle:
            bundle[lang]["title"] = category_name # Fallback or specific language title if needed
            for item in bundle[lang].get("articles", []):
                orig_idx = item.get("id")
                if orig_idx is not None and orig_idx < len(articles_to_process):
                    item["url"] = articles_to_process[orig_idx].get("url")
                    item["source"] = articles_to_process[orig_idx].get("source")
                    
    return bundle

# =========================
# HTML GENERATION
# =========================

def generate_html(title, data, category_id, lang):
    labels = {
        "en": {"last_updated": "Last Updated", "today_brief": "Today's Brief", "why_matters": "Why this matters", "read_more": "Read More", "sentiment": "Sentiment"},
        "zh": {"last_updated": "最后更新", "today_brief": "今日简报", "why_matters": "深度见解", "read_more": "阅读全文", "sentiment": "情感倾向"},
        "es": {"last_updated": "Última actualización", "today_brief": "Resumen de hoy", "why_matters": "Por qué es importante", "read_more": "Leer más", "sentiment": "Sentimiento"}
    }.get(lang, {"last_updated": "Last Updated", "today_brief": "Today's Brief", "why_matters": "Why this matters", "read_more": "Read More", "sentiment": "Sentiment"})
    
    timestamp = datetime.datetime.now(pytz.timezone("US/Eastern")).strftime("%Y-%m-%d %I:%M %p ET")
    clusters_html = "".join([f'<span class="cluster">#{c}</span>' for c in data.get("clusters", [])])
    trending_section = f'<div class="trending-container"><span class="trending-title">Trending Themes:</span><div class="clusters">{clusters_html}</div></div>' if clusters_html else ""
    
    articles_html = ""
    for a in data["articles"]:
        s_color = {"Positive": "#2ecc71", "Neutral": "#95a5a6", "Negative": "#e74c3c"}.get(a["sentiment"], "#95a5a6")
        articles_html += f"""
        <div class="card">
            <div class="card-meta"><span class="impact {a['impact'].lower()}">{a['impact']} Impact</span><span class="score">{a['score']}</span></div>
            <h3>{a['title']}</h3><p class="desc">{a['description']}</p>
            <div class="insight"><strong>{labels['why_matters']}:</strong> {a['why_matters']}</div>
            <div class="card-footer">
                <span class="source">{a['source']}</span>
                <span class="sentiment-box" style="background: {s_color}15; color: {s_color}">{labels['sentiment']}: {a['sentiment']}</span>
                <a href="{a['url']}" class="btn-link" target="_blank">{labels['read_more']} →</a>
            </div>
        </div>"""

    return f"""<!DOCTYPE html><html lang="{lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"><style>:root {{ --ios-bg: #F2F2F7; --ios-card: #FFFFFF; --ios-blue: #007AFF; --ios-text: #1C1C1E; --ios-sub: #8E8E93; }} body {{ font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--ios-bg); color: var(--ios-text); margin: 0; padding: 20px; -webkit-font-smoothing: antialiased; }} .header {{ padding: 10px 0 20px 0; }} .updated {{ font-size: 11px; color: var(--ios-sub); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px; opacity: 0.8; }} h1 {{ font-size: 34px; font-weight: 800; margin: 0; letter-spacing: -1px; }} .trending-container {{ margin-top: 15px; background: rgba(0,0,0,0.03); padding: 12px; border-radius: 14px; }} .trending-title {{ font-size: 11px; font-weight: 800; color: var(--ios-sub); text-transform: uppercase; display: block; margin-bottom: 8px; }} .clusters {{ display: flex; flex-wrap: wrap; gap: 6px; }} .cluster {{ background: white; color: var(--ios-blue); padding: 5px 12px; border-radius: 10px; font-size: 11px; font-weight: 700; border: 1px solid rgba(0,122,255,0.1); }} .brief {{ background: linear-gradient(145deg, #007AFF, #5856D6); color: white; padding: 24px; border-radius: 24px; margin: 24px 0; box-shadow: 0 12px 24px rgba(0,122,255,0.25); position: relative; overflow: hidden; }} .brief::before {{ content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); pointer-events: none; }} .brief h2 {{ font-size: 20px; margin-top: 0; margin-bottom: 10px; font-weight: 800; }} .brief p {{ font-size: 15px; margin: 0; opacity: 0.95; line-height: 1.5; }} .brief .divider {{ height: 1px; background: rgba(255,255,255,0.25); margin: 16px 0; }} .brief .insight-text {{ font-size: 14px; font-weight: 500; opacity: 0.9; }} .card {{ background: var(--ios-card); border-radius: 20px; padding: 20px; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.02); }} .card-meta {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }} .impact {{ font-size: 10px; font-weight: 900; padding: 3px 10px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; }} .impact.high {{ background: #FF3B3015; color: #FF3B30; }} .impact.medium {{ background: #FF950015; color: #FF9500; }} .impact.low {{ background: #34C75915; color: #34C759; }} .score {{ font-weight: 900; color: var(--ios-blue); font-size: 20px; font-variant-numeric: tabular-nums; }} h3 {{ font-size: 19px; margin: 0 0 12px 0; line-height: 1.3; font-weight: 700; color: #000; }} .desc {{ font-size: 15px; color: #3A3A3C; line-height: 1.5; margin-bottom: 16px; opacity: 0.9; }} .insight {{ background: #F2F2F7; padding: 14px; border-radius: 14px; font-size: 14px; border-left: 4px solid var(--ios-blue); line-height: 1.5; font-weight: 500; }} .card-footer {{ display: flex; justify-content: space-between; align-items: center; margin-top: 18px; }} .source {{ font-size: 12px; color: var(--ios-sub); font-weight: 700; }} .sentiment-box {{ font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; }} .btn-link {{ background: var(--ios-blue); color: white; text-decoration: none; font-weight: 700; font-size: 12px; padding: 8px 16px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,122,255,0.2); }} </style></head><body><div class="header"><div class="updated">{labels['last_updated']}: {timestamp}</div><h1>{title}</h1>{trending_section}</div><div class="brief"><h2>{labels['today_brief']}</h2><p>{data['summary']}</p><div class="divider"></div><p class="insight-text">{data['insight']}</p></div>{articles_html}</body></html>"""

# =========================
# MAIN CATEGORY WORKFLOW
# =========================

def save_files(cat_id, config, lang, processed_data):
    lang_suffix = {"zh": "_CN", "es": "_ES", "en": ""}.get(lang, "")
    file_base = config["file"]
    folder = config.get("folder", "")
    
    # Filenames
    json_filename = f"summary{lang_suffix}.json" if cat_id == "ai" else f"{file_base}{lang_suffix}.json"
    html_filename = f"{file_base}{lang_suffix}.html"
    
    # Target Directory
    target_dir = os.path.join(OUTPUT_DIR, folder) if folder else OUTPUT_DIR
    os.makedirs(target_dir, exist_ok=True)
    
    # 1. Save HTML
    html_path = os.path.join(target_dir, html_filename)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(generate_html(processed_data.get("title", config["name"]), processed_data, cat_id, lang))
    
    # [REMOVED] LEGACY root-level file saves to maintain strict /news folder structure

    # 3. Save App JSON (Now in categorical folder)
    json_path = os.path.join(target_dir, json_filename)
    app_data = []
    for a in processed_data["articles"]:
        app_data.append({
            "title": a["title"], 
            "url": a["url"], 
            "industry": a.get("source", cat_id.upper()), 
            "summary": a["description"], 
            "charlotte_impact": a["why_matters"], 
            "impact_score": int(a["score"] / 2)
        })
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(app_data, f, ensure_ascii=False, indent=2)
    
    logging.info(f"Saved {cat_id.upper()} [{lang}] artifacts to: {target_dir}")

def process_category(cat_id, config):
    try:
        logging.info(f"--- Processing {cat_id.upper()} ---")
        # 1. Fetching (Internal parallel)
        fetchers = {"global": fetch_top_news, "market": fetch_market_news, "ai": fetch_ai_news_rich, "charlotte": fetch_charlotte_news_rich}
        raw_articles = fetchers[cat_id]()
        unique_articles = dedupe(raw_articles)
        if not unique_articles: return False

        # 2. Bundled AI Processing (Enrichment + Multi-Language in ONE call)
        bundle = ai_process_bundle(cat_id, unique_articles, config["name"])
        if not bundle or "en" not in bundle:
            logging.error(f"Failed to process category bundle for {cat_id}")
            return False

        # 3. Save All
        for lang in ["en", "zh", "es"]:
            lang_data = bundle.get(lang)
            if lang_data:
                save_files(cat_id, config, lang, lang_data)
        
        logging.info(f"Successfully processed {cat_id.upper()} (Articles: {len(bundle['en']['articles'])})")
        return True
    except Exception as e:
        logging.error(f"Error {cat_id.upper()}: {e}")
        return False

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "hourly"
    logging.info(f"--- NEWS AGGREGATOR STARTING (Mode: {mode}, EXTREME OPTIMIZED) ---")

    active_cats = {cid: cfg for cid, cfg in CATEGORIES.items() if not (cid == "ai" and mode != "daily")}
    
    # Sequential processing is MANDATORY for Gemini free tier to avoid 429 rate limit bursts.
    for cid, cfg in active_cats.items():
        try:
            logging.info(f"--- STARTING CATEGORY: {cid.upper()} ---")
            res = process_category(cid, cfg)
            logging.info(f"Finished {cid.upper()} (Success: {res})")
            
            # Stagger between categories to fully clear rate limits
            if cid != list(active_cats.keys())[-1]:
                logging.info("Waiting 20 seconds before next category to clear rate limits...")
                time.sleep(20)
        except Exception as e:
            logging.error(f"Category {cid.upper()} raised an exception: {e}")

    logging.info("--- ALL NEWS TASKS COMPLETED (STABLE MODE) ---")
    sys.stdout.flush()
    os._exit(0) # Force exit immediately

if __name__ == "__main__":
    main()
