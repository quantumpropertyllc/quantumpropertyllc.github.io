import requests
import os
import sys
import datetime
import pytz
import random
import logging
from eventregistry import *
from deep_translator import GoogleTranslator

# =========================
# CONFIG & LOGGING
# =========================
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

NEWS_ORG_KEY = os.getenv("NEWS_API_KEY")
NEWSDATA_KEY = os.getenv("NEWSDATA_KEY")
THENEWS_KEY = os.getenv("THENEWS_KEY")
NEWS_API_AI_KEY = os.getenv("NEWS_API_AI_KEY")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "NewsAggregator/1.0"})

def dedupe(articles):
    seen = set()
    unique = []
    for a in articles:
        url = a.get("url")
        if url and url not in seen:
            seen.add(url)
            unique.append(a)
    return unique

def safe_get(url, params=None, name="API"):
    try:
        r = SESSION.get(url, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logging.error(f"{name} request failed: {e}")
        return {}

# =========================
# TRANSLATION
# =========================
def translate_articles(articles, limit=15):
    if not articles: return []
    logging.info(f"Translating {min(len(articles), limit)} articles...")
    translator = GoogleTranslator(source="auto", target="zh-CN")
    translated = []
    # Note: The list is already shuffled before it gets here
    for art in articles[:limit]:
        try:
            title = translator.translate(art["title"])
            desc = art.get("description") or ""
            desc_cn = translator.translate(desc) if len(desc) > 3 else "无描述"
            translated.append({"title": title, "url": art["url"], "description": desc_cn})
        except Exception as e:
            logging.warning(f"Translation failed: {e}")
            translated.append(art)
    return translated

# =========================
# HTML OUTPUT
# =========================
def save_html(filename, title, articles, is_chinese=False):
    utc_now = datetime.datetime.now(pytz.utc)
    eastern = pytz.timezone("US/Eastern")
    timestamp = utc_now.astimezone(eastern).strftime("%Y-%m-%d %I:%M:%S %p %Z")
    update_label = "最后更新" if is_chinese else "Last Updated"

    # Take top 30 (list is already shuffled in fetch function)
    display_articles = articles[:30]

    body = ""
    if not display_articles:
        body = f"<p style='text-align:center;'>{'暂无新闻' if is_chinese else 'No news found.'}</p>"
    else:
        for a in display_articles:
            body += f"""
            <div class='art'>
                <h3><a href='{a['url']}' target='_blank'>{a['title']}</a></h3>
                <p>{a.get('description') or ''}</p>
            </div>"""

    html = f"""<html><head><meta charset="UTF-8"><title>{title}</title>
    <style>
        body {{ font-family: -apple-system, "PingFang SC", sans-serif; max-width: 800px; margin: auto; padding: 20px; background: #f4f7f6; }}
        .timestamp {{ text-align: center; color: #7f8c8d; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }}
        .art {{ background: white; padding: 20px; margin-bottom: 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }}
        a {{ color: #2980b9; text-decoration: none; font-weight: bold; }}
    </style></head>
    <body><h1 style="text-align:center;">{title}</h1>
    <div class="timestamp">{update_label}: {timestamp}</div>{body}</body></html>"""

    with open(os.path.join(BASE_DIR, filename), "w", encoding="utf-8") as f:
        f.write(html)
    logging.info(f"Saved {filename}")

# =========================
# NEWS FETCHING
# =========================
def fetch_hourly_news():
    top_list, money_list = [], []

    # 1. NewsAPI.org
    if NEWS_ORG_KEY:
        r = safe_get("https://newsapi.org/v2/top-headlines", {"country": "us", "apiKey": NEWS_ORG_KEY}, "NewsAPI_Top")
        top_list.extend([{"title": a["title"], "url": a["url"], "description": a.get("description")} for a in r.get("articles", [])])
        r = safe_get("https://newsapi.org/v2/everything", {"q": "stock market OR bitcoin OR real estate", "apiKey": NEWS_ORG_KEY}, "NewsAPI_Money")
        money_list.extend([{"title": a["title"], "url": a["url"], "description": a.get("description")} for a in r.get("articles", [])])

    # 2. NewsData.io
    if NEWSDATA_KEY:
        r = safe_get("https://newsdata.io/api/1/news", {"apikey": NEWSDATA_KEY, "country": "us", "language": "en"}, "NewsData_Top")
        top_list.extend([{"title": a["title"], "url": a["link"], "description": a.get("description")} for a in r.get("results", [])])
        r = safe_get("https://newsdata.io/api/1/news", {"apikey": NEWSDATA_KEY, "q": "finance,crypto", "language": "en", "country": "us"}, "NewsData_Money")
        money_list.extend([{"title": a["title"], "url": a["link"], "description": a.get("description")} for a in r.get("results", [])])

    # 3. TheNewsAPI
    if THENEWS_KEY:
        r = safe_get("https://api.thenewsapi.com/v1/news/all", {"api_token": THENEWS_KEY, "language": "en", "limit": 10}, "TheNewsAPI_Top")
        top_list.extend([{"title": a["title"], "url": a["url"], "description": a.get("description")} for a in r.get("data", [])])
        r = safe_get("https://api.thenewsapi.com/v1/news/all", {"api_token": THENEWS_KEY, "search": "stocks+bitcoin+finance", "language": "en", "limit": 10}, "TheNewsAPI_Money")
        money_list.extend([{"title": a["title"], "url": a["url"], "description": a.get("description")} for a in r.get("data", [])])

    # Deduplicate
    top_list = dedupe(top_list)
    money_list = dedupe(money_list)

    # SHUFFLE BEFORE TRANSLATING/SAVING
    # This ensures a random mix for both English and Chinese versions
    random.shuffle(top_list)
    random.shuffle(money_list)

    # Save English
    save_html("topnews.html", "Top Headlines", top_list)
    save_html("money.html", "Market News", money_list)
    
    # Save Chinese (Translates the first 15 of the now-shuffled list)
    save_html("topnews_cn.html", "全球头条新闻", translate_articles(top_list), is_chinese=True)
    save_html("money_cn.html", "市场金融新闻", translate_articles(money_list), is_chinese=True)

def fetch_daily_ai_news():
    if not NEWS_API_AI_KEY: return
    er = EventRegistry(apiKey=NEWS_API_AI_KEY)
    q = QueryArticlesIter(conceptUri=QueryItems.OR([er.getConceptUri("Artificial intelligence"), er.getConceptUri("Stock market")]), lang="eng")
    articles = [{"title": a["title"], "url": a["url"], "description": a.get("body", "")[:250]} for a in q.execQuery(er, sortBy="rel", maxItems=30)]
    
    # Shuffle AI news as well
    random.shuffle(articles)
    
    save_html("ainews.html", "AI & Investment Intelligence", articles)
    save_html("ainews_cn.html", "AI 科技与投资情报", translate_articles(articles), is_chinese=True)

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "hourly"
    if mode == "daily": fetch_daily_ai_news()
    else: fetch_hourly_news()
