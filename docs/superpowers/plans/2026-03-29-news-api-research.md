# Historical Macro News API Research

## Context
Research for CryptoSignal Terminal: overlay macro news events (politics, economics, Fed decisions, tariffs, geopolitics) on price charts for arbitrary date ranges.

---

## API-by-API Analysis

### 1. Guardian Open Platform API -- BEST FOR HACKATHON

| Attribute | Detail |
|---|---|
| **Free?** | Yes, completely free developer key |
| **Date range queries** | `from-date` / `to-date` params (YYYY-MM-DD) |
| **History depth** | Back to **1999** (all Guardian content) |
| **Rate limits** | 12 req/sec, **5,000 req/day** |
| **Data returned** | Headlines, standfirst, **full body text** (via `show-fields=all`) |
| **Category filtering** | Yes -- filter by section (politics, business, world, economics) and tags |
| **Sources** | The Guardian only (but excellent macro/politics/economics coverage) |
| **Commercial use** | Free for non-commercial; commercial requires license discussion |

**Why this is #1:** Completely free, no paywall on history, goes back 25+ years, generous rate limits, returns full article text, supports precise date ranges. Perfect for a hackathon.

**Example query:**
```
https://content.guardianapis.com/search?q=federal%20reserve&from-date=2022-01-01&to-date=2022-12-31&section=business|politics|world&show-fields=headline,standfirst,bodyText&page-size=200&api-key=YOUR_KEY
```

---

### 2. NYT Article Search API -- EXCELLENT, FREE

| Attribute | Detail |
|---|---|
| **Free?** | Yes, free API key via developer.nytimes.com |
| **Date range queries** | `begin_date` / `end_date` params (YYYYMMDD) |
| **History depth** | Back to **September 1851** |
| **Rate limits** | 500 req/day, 5 req/min (Article Search); 2,000 req/day (Archive API) |
| **Data returned** | Headline, abstract, lead paragraph, URL (not full text) |
| **Category filtering** | Yes -- `fq` param filters by news_desk (Politics, Business, Foreign, etc.), subject, and more |
| **Sources** | NYT only |
| **Pagination** | Max 10 results/page, up to 100 pages (1,000 results/query) |

**Why this is #2:** Free, deepest archive of any API (170+ years), strong macro/economics coverage. Rate limits are tighter than Guardian but sufficient for a demo. Returns abstracts, not full text.

**Example query:**
```
https://api.nytimes.com/svc/search/v2/articlesearch.json?q=tariff&begin_date=20230101&end_date=20231231&fq=news_desk:("Politics" "Business")&api-key=YOUR_KEY
```

---

### 3. GDELT Project -- BEST FOR BULK HISTORICAL EVENTS

| Attribute | Detail |
|---|---|
| **Free?** | Yes, 100% free and open |
| **Date range queries** | `STARTDATETIME` / `ENDDATETIME` (YYYYMMDDHHMMSS) via DOC API |
| **History depth** | DOC API: rolling **3 months** only. Full database: back to **1979** (via BigQuery or CSV download) |
| **Rate limits** | No published limits for DOC API; BigQuery free tier = 1 TB/month |
| **Data returned** | Article URLs, titles, source domains, themes, tones, locations, persons, organizations |
| **Category filtering** | Yes -- GDELT assigns themes (e.g., ECON_*, TAX_*, POLITICAL_*, MILITARY_*) |
| **Sources** | **All major outlets globally** -- NYT, BBC, Reuters, AP, CNBC, FT, WaPo, etc. |
| **Multi-source** | Yes, this is the only truly multi-source option with deep history |

**Why this is strong:** Covers ALL mainstream outlets, free, massive archive. The DOC API (REST, easy to use) is limited to 3 months. For deeper history, use Google BigQuery (free 1 TB/month) to query the full dataset back to 1979. Slightly more complex to set up but incredibly powerful.

**DOC API example:**
```
https://api.gdeltproject.org/api/v2/doc/doc?query=federal%20reserve%20sourcecountry:US&mode=artlist&maxrecords=250&startdatetime=20260101000000&enddatetime=20260329000000&format=json
```

**BigQuery example:**
```sql
SELECT SQLDATE, Actor1Name, Actor2Name, EventCode, SourceURL, GoldsteinScale
FROM `gdelt-bq.gdeltv2.events`
WHERE SQLDATE BETWEEN 20200101 AND 20201231
  AND EventRootCode IN ('04','05','06') -- economic/diplomatic events
```

---

### 4. NewsAPI.org

| Attribute | Detail |
|---|---|
| **Free?** | Free "Developer" tier |
| **Date range queries** | `from` / `to` params |
| **History depth** | Free: **1 month only**. Paid ($449/mo): 5 years |
| **Rate limits** | 100 req/day |
| **Data returned** | Title, description, content snippet (first ~200 chars), URL, image |
| **Category filtering** | Yes -- category param (business, technology, science, health, etc.) and keyword search |
| **Sources** | 150,000+ sources including mainstream (BBC, CNN, Reuters, etc.) |
| **Restrictions** | Free tier: dev/test only, no production use, 24hr delay, CORS localhost only |

**Verdict:** Great source coverage but the free tier is crippled: 1-month history makes it useless for historical chart overlays. The $449/mo price for 5-year history is prohibitive.

---

### 5. GNews API

| Attribute | Detail |
|---|---|
| **Free?** | Free tier available |
| **Date range queries** | `from` / `to` params |
| **History depth** | Free: **30 days only**. Paid (EUR 49.99/mo+): back to 2020 |
| **Rate limits** | 100 req/day |
| **Data returned** | Title, description, content snippet, URL, image, source |
| **Category filtering** | Yes -- general, world, nation, business, technology, entertainment, sports, science, health |
| **Sources** | Aggregates from Google News -- includes NYT, BBC, Reuters, CNN, etc. |
| **Restrictions** | Free: non-commercial only, 12-hour delay, max 10 articles/request |

**Verdict:** Similar limitation as NewsAPI.org -- 30-day history on free tier kills the use case. Paid tier starts at EUR 50/mo and only goes back to 2020.

---

### 6. Event Registry (NewsAPI.ai)

| Attribute | Detail |
|---|---|
| **Free?** | Free account with 2,000 tokens |
| **Date range queries** | Yes, supports date range filtering |
| **History depth** | Archive since **2014**. Free tier: 30-day archive access |
| **Rate limits** | Token-based (historical queries cost 5-15 tokens depending on date range span) |
| **Data returned** | Title, body, source, sentiment, entities, categories, events |
| **Category filtering** | Yes -- rich categorization, entity extraction, event clustering |
| **Sources** | 150,000+ sources, mainstream included |

**Verdict:** Powerful platform with excellent NLP features, but 2,000 tokens total on free tier is extremely limited. Historical queries burn tokens fast (5-15 per query depending on years spanned). Not practical for a hackathon demo beyond a few test calls.

---

### 7. Mediastack

| Attribute | Detail |
|---|---|
| **Free?** | Free tier |
| **Date range queries** | Yes, `date` param and date ranges |
| **History depth** | Historical data available (unclear depth) |
| **Rate limits** | 500 req/month (very low) |
| **Data returned** | Title, description, URL, source, category, language, country |
| **Category filtering** | Yes -- general, business, entertainment, health, science, sports, technology |
| **Sources** | 7,500+ sources |
| **Restrictions** | Free tier: **no HTTPS**, delayed data, 500 req/month |

**Verdict:** No HTTPS on free tier is a dealbreaker for production. 500 req/month is very restrictive. Not recommended.

---

### 8. NewsData.io

| Attribute | Detail |
|---|---|
| **Free?** | Free tier with 200 credits/day |
| **Date range queries** | Historical News API supports date ranges |
| **History depth** | Free: **no historical access**. Basic ($199/mo): 6 months. Corporate ($599/mo): 2 years |
| **Rate limits** | 200 credits/day (10 articles per credit) |
| **Data returned** | Title, description, content snippet, source, category |
| **Category filtering** | Yes |
| **Sources** | Broad coverage |
| **Restrictions** | Free tier: 12-hour delay, no full content, no archive |

**Verdict:** No historical access on free tier. Basic plan at $199/mo is expensive for a hackathon. Not suitable.

---

### 9. Currents API

| Attribute | Detail |
|---|---|
| **Free?** | Free tier |
| **Date range queries** | Limited date filtering |
| **History depth** | Free: **30 days**. Full archive: 4 years (paid) |
| **Rate limits** | 1,000 req/day |
| **Data returned** | Title, description, URL, image, category |
| **Category filtering** | Yes |
| **Sources** | 14,000+ sources globally |
| **Restrictions** | Free tier: dev only, title+description only, paid starts at $99/mo |

**Verdict:** 30-day limit on free tier. Generous daily rate limit but no deep history without paying $99/mo.

---

### 10. Other Notable Options

#### Finlight.me (Financial/Macro Focus)
- Free: 5,000 req/month, 12-hour delay
- Specifically designed for financial/geopolitical news
- Supports date/time filtering, boolean operators
- Good for macro/economic news specifically
- Free tier does NOT include full article content or sentiment

#### MarketAux
- Free: 100 req/day
- Financial news focus (stocks, crypto, forex, macro)
- 80+ global markets, 5,000+ sources
- Good for market-specific macro news

#### FRED (Federal Reserve Economic Data)
- Not a news API, but provides actual economic data releases (GDP, CPI, unemployment, Fed funds rate)
- Completely free API
- Could complement news overlays with actual data event markers

---

## RECOMMENDATION FOR HACKATHON

### Primary Strategy: Multi-Source Approach

**Tier 1 -- Use These (Free, Historical, Ready to Go):**

1. **Guardian API** -- Primary source for macro/political/economic news overlays
   - Free, back to 1999, full text, 5,000 req/day
   - Filter sections: business, politics, world, us-news
   - Get API key: https://open-platform.theguardian.com/access/

2. **NYT Article Search API** -- Secondary source for US-centric macro news
   - Free, back to 1851, abstracts, 500 req/day
   - Filter by news_desk: Politics, Business, Foreign
   - Get API key: https://developer.nytimes.com/

3. **GDELT DOC API** -- Multi-source coverage for last 3 months
   - Free, no key needed, covers ALL major outlets
   - For deeper history: BigQuery (1 TB free/month)

**Tier 2 -- Nice to Have:**

4. **Finlight.me** -- Financial/macro focus, 5K req/month free
5. **MarketAux** -- Market news sentiment, 100 req/day free

### Implementation Priority for Demo

For the hackathon, start with **Guardian API alone**. It checks every box:
- Arbitrary date ranges (1999-present)
- Category filtering (business, politics, world)
- Full article text + headlines
- Generous rate limits (5,000/day)
- Simple REST API, returns JSON
- Zero cost

If time permits, add NYT for deeper US coverage, then GDELT for multi-source breadth.

### Sample Architecture

```
User selects date range on chart
  --> Query Guardian API (from-date/to-date, section=business|politics|world)
  --> Query NYT API (begin_date/end_date, fq=news_desk:Politics,Business)
  --> Merge & deduplicate by date
  --> Plot as event markers on price chart
```
