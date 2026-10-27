# Verity

**Verify what you're actually buying.**

Verity is an end-to-end consumer intelligence and product authenticity verification platform. It takes a product URL from Amazon or Flipkart, extracts customer reviews and product discussions, and evaluates them through an 8-signal heuristic and natural language processing (NLP) pipeline. It automates the investigative checks a skeptical shopper performs—detecting review velocity spikes, duplicate phrasing, unverified rating clusters, sentiment mismatches, and counterfeit-related vocabulary—translating raw listing data into an explainable 0–100 Genuineness Score.

---

## Problem Statement

E-commerce marketplaces like Amazon and Flipkart host millions of products, but consumers face significant challenges with product genuineness and deceptive reviews:
1. **Counterfeit & Lookalike Goods**: High-volume, low-ticket categories (such as USB cables, chargers, and wireless earbuds) are flooded with replica items, unbranded OEM repackagings, or outright fakes.
2. **Review Manipulation & Bot Farms**: Sellers often manipulate search rankings and consumer trust through incentivized reviews, coordinated review velocity spikes, bot-generated 5-star ratings, and recycled listing pages.
3. **Information Asymmetry**: Average shoppers lack the time and technical capability to cross-reference review dates, identify repeated verbatim phrasing across distinct reviewers, or analyze rating distributions for artificial anomalies.

---

## Target Users

- **Online Shoppers**: Consumers shopping for electronics, peripherals, and accessories who want instant verification before placing an order.
- **Skeptical Buyers & Deal Hunters**: Buyers seeking evidence-backed verification rather than taking marketplace star ratings at face value.
- **Consumer Protection Researchers**: Analysts tracking counterfeiting patterns, seller reputation, and review manipulation trends on Indian e-commerce platforms.

---

## Solution

Verity acts as an independent inspection layer between the buyer and the marketplace:
1. **Automated Review Extraction**: Ingests product URLs and retrieves real customer discussions and review histories using the **Diffbot Extract API** (Product and Discussion APIs) with a local **Playwright headless browser** fallback.
2. **Standardized Normalization**: Converts disparate data schemas, rating formats, and date conventions into a canonical review schema.
3. **8-Signal Authenticity Pipeline**: Evaluates the normalized reviews using NLP tokenization, lexical diversity metrics, time-window velocity tracking, and n-gram duplicate detection.
4. **Transparent Risk Scoring**: Aggregates signal detections into a single explainable 0–100 Genuineness Score accompanied by verbatim review excerpts as evidence.

---

## Key Features

- **Live URL Analysis**: Paste any product listing URL from Amazon India (`amazon.in`) or Flipkart (`flipkart.com`) for automated inspection.
- **8-Signal Authenticity Engine**:
  - *Counterfeit Mentions*: Flags explicit consumer complaints ("fake", "nakli", "counterfeit", "first copy").
  - *Wrong Item Received*: Detects mismatch between advertised product and physical arrival.
  - *Suspicious Packaging*: Identifies unsealed, generic, or tampered boxes.
  - *Quality Inconsistency*: Surfaces sudden component failure and durability issues.
  - *Review Velocity Spikes*: Detects suspicious bursts of unverified 5-star ratings within tight date windows.
  - *Duplicate Phrases*: Uses n-gram matching to uncover copy-pasted or coordinated bot reviews.
  - *J-Shaped Rating Distribution*: Catches bi-modal or heavily skewed review shapes characteristic of manipulation.
  - *Generic Phrasing*: Measures lexical diversity to flag bot-generated, low-detail praise.
- **Curated Demo Mode**: Instantly test the platform without live API tokens using pre-loaded real-world datasets (`USB-C fast charging cable`, `wireless bluetooth earbuds`, `phone charger adapter`).
- **Interactive Risk Breakdown**: Visual risk gauge, severity badges (High, Medium, Low), and drill-down review evidence cards.
- **High-Performance Caching**: In-memory LRU cache with configurable TTL to minimize redundant upstream network requests.

---

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Lucide Icons, Custom CSS Design Tokens
- **Backend**: Node.js 20, Express, TypeScript
- **Extraction Pipeline**:
  - *Diffbot Extract API* (`Product API` & `Discussion API`): Primary cloud extraction engine with JavaScript rendering and ML parsing.
  - *Playwright* (Python 3): Secondary local headless browser scraper fallback.
- **NLP & Analysis**: `natural`, `sentiment`, `compromise`
- **Database & Persistence**: PostgreSQL (`pg` pool with automatic table schema migration) + in-memory `lru-cache`
- **Monorepo**: npm workspaces (`packages/shared`, `apps/api`, `apps/web`)

---

## Architecture

```text
                                  ┌──────────────────────────┐
                                  │      React + Vite UI     │
                                  │   (Search, Gauge, Cards) │
                                  └────────────┬─────────────┘
                                               │ HTTP / REST
                                               ▼
                                  ┌──────────────────────────┐
                                  │    Express API Server    │
                                  │       (TypeScript)       │
                                  └──────┬────────────┬──────┘
                                         │            │
                   ┌─────────────────────┘            └──────────────────────┐
                   ▼                                                         ▼
     ┌───────────────────────────┐                             ┌───────────────────────────┐
     │   Diffbot Extract API     │                             │    Playwright Scraper     │
     │  (Product & Discussion)   │                             │  (Python Headless Engine) │
     └─────────────┬─────────────┘                             └─────────────┬─────────────┘
                   │                                                         │
                   └─────────────────────┬───────────────────────────────────┘
                                         ▼
                               ┌───────────────────┐
                               │ Review Normalizer │
                               └─────────┬─────────┘
                                         ▼
                               ┌───────────────────┐
                               │  8-Signal Engine  │
                               │  (NLP + Heuristic)│
                               └─────────┬─────────┘
                                         ▼
                               ┌───────────────────┐
                               │   Authenticity    │
                               │  Report (0 - 100) │
                               └───────────────────┘
```

### Monorepo Structure

```text
verity/
├── packages/
│   └── shared/              # @verity/shared — Canonical types (Review, Report, Signals)
├── apps/
│   ├── api/                 # Node.js + Express backend
│   │   └── src/
│   │       ├── adapters/    # Diffbot, Playwright, and Mock data fetchers
│   │       ├── normalizer/  # Schema unification
│   │       ├── analysis/    # 8-signal authenticity heuristic & NLP engine
│   │       ├── cache/       # In-memory LRU cache
│   │       └── routes/      # REST API endpoints (/search, /product, /diffbot)
│   └── web/                 # React frontend application
│       └── src/
│           ├── components/  # AuthenticityGauge, ReviewCard, SearchBar, etc.
│           ├── pages/       # SearchPage, ResultsPage, AboutPage
│           └── styles/      # Typography, tokens, and responsive layout
└── scrapers/                # Python Playwright direct scraping engine
```

### The 8 Authenticity Signals

| Signal | Description | Severity Multiplier |
|---|---|---|
| **Counterfeit mentions** | Explicit mentions of "fake", "counterfeit", "nakli", "knockoff" | High (×15) |
| **Wrong item received** | Complaints of mismatched specifications, wrong models, or different goods | High (×15) |
| **Suspicious packaging** | Mentions of generic packaging, unsealed boxes, or tampered seals | Medium (×8) |
| **Quality inconsistency** | Early failure reports ("stopped working in a week", "broke quickly") | Low (×3) |
| **Review spike** | Cluster of unverified 5-star reviews concentrated in a tight date window | Medium (×8) |
| **Duplicate phrases** | 3 or more reviews containing identical sequences of 8+ words | Medium (×8) |
| **J-shaped distribution** | >80% five-star reviews paired with <10% middle-range ratings | Medium (×8) |
| **Generic language** | Reviews characterized by minimal lexical diversity and vague praise | Medium (×8) |

**Scoring Formula:**
$$\text{Score} = \max\left(0, 100 - \sum (\text{signal.weight} \times \text{severity\_multiplier})\right)$$

---

## Local Setup

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Python**: v3.10+ *(required only if running the local Playwright scraper fallback)*

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Mudit-Maheshwari-code/Verity_MM.git
cd Verity_MM

# Install all monorepo dependencies
npm install
```

### 2. Configure Environment

Copy the example configuration file:

```bash
cp .env.example .env
```

Open `.env` and configure your settings:
```ini
DIFFBOT_TOKEN=your_diffbot_token_here
PORT=3001
CACHE_TTL_MINUTES=60
```
*(If no `DIFFBOT_TOKEN` is set, the application operates in Demo Mode using curated review datasets).*

### 3. Optional: Setup Python Scraper Fallback

If you plan to run local Playwright scraping without Diffbot:

```bash
# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install scraper requirements & browsers
pip install playwright
playwright install chromium
```

### 4. Run Development Servers

In terminal 1 (API Server):
```bash
npm run dev:api
```

In terminal 2 (Web Client):
```bash
npm run dev:web
```

Or run both concurrently:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build

To verify and build all workspaces:

```bash
npm run build
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DIFFBOT_TOKEN` | Optional | — | Primary cloud extraction token for rendering & parsing e-commerce listings |
| `DATABASE_URL` | Optional | — | PostgreSQL connection string for permanent report persistence (auto-creates tables) |
| `PORT` | No | `3001` | Port for the Express backend API server |
| `CACHE_TTL_MINUTES` | No | `60` | In-memory LRU cache time-to-live for extracted reports |

---

## Deployment

- **Frontend Deployment**: Deployed on Vercel / Render.
  - Live Web URL: `https://verity-mm.vercel.app` *(or your custom deployed URL)*
- **Backend API Deployment**: Deployed on Render / Railway / Fly.io.
  - Live API URL: `https://verity-api.onrender.com`

---

## Demo Video

- **Video Link**: [Watch the 3-Minute Walkthrough](https://youtu.be/your-demo-video-id)
- Demonstrates:
  1. Product problem statement and motivation
  2. Live URL analysis workflow (Amazon / Flipkart)
  3. Signal breakdown, gauge metrics, and review evidence
  4. Demo mode for offline/instant evaluation
