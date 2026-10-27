import sqlite3
import json
import time
from typing import Optional
from pathlib import Path
from .models import ScrapeResponse, Review

CACHE_DB_PATH = Path(__file__).parent / "cache.db"
TTL_SECONDS = 24 * 60 * 60

def init_db():
    conn = sqlite3.connect(CACHE_DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS cache (
            url TEXT PRIMARY KEY,
            data TEXT,
            timestamp REAL
        )
    ''')
    conn.commit()
    conn.close()

def get_cached(url: str) -> Optional[ScrapeResponse]:
    try:
        conn = sqlite3.connect(CACHE_DB_PATH)
        c = conn.cursor()
        c.execute('SELECT data, timestamp FROM cache WHERE url = ?', (url,))
        row = c.fetchone()
        conn.close()
        
        if row:
            data, timestamp = row
            if time.time() - timestamp < TTL_SECONDS:
                parsed = json.loads(data)
                reviews = [Review(**r) for r in parsed.pop('reviews')]
                return ScrapeResponse(reviews=reviews, **parsed)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Cache read error: {e}")
    return None

def set_cached(url: str, response: ScrapeResponse):
    try:
        conn = sqlite3.connect(CACHE_DB_PATH)
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO cache (url, data, timestamp)
            VALUES (?, ?, ?)
        ''', (url, json.dumps(response, default=lambda o: o.__dict__), time.time()))
        conn.commit()
        conn.close()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Cache write error: {e}")

init_db()
