"""
Verity Scraper CLI Runner
Usage: python -m scrapers.run <url>

Outputs JSON to stdout. All logs go to stderr.
"""
import sys
import os
import asyncio
import json
import logging
import time

# Ensure project root is on path when run as: python scrapers/run.py <url>
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.cache import get_cached, set_cached
from scrapers.flipkart import FlipkartScraper
from scrapers.amazon import AmazonScraper
from scrapers.models import ScrapeResponse

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger("scrapers.run")


def detect_platform(url: str) -> str | None:
    """Detect e-commerce platform from URL."""
    url_lower = url.lower()
    if "flipkart.com" in url_lower:
        return "flipkart"
    if "amazon.in" in url_lower or "amazon.com" in url_lower:
        return "amazon"
    return None


async def main(url: str):
    platform = detect_platform(url)

    if not platform:
        # Output a valid JSON error response instead of crashing
        error_response = ScrapeResponse(
            platform="unknown",
            product_url=url,
            product_title="",
            reviews=[],
            total_reviews_on_page=None,
            reviews_fetched=0,
            scrape_status="error",
            error_message=f"Unsupported URL. Only Flipkart and Amazon URLs are supported.",
            scrape_duration_seconds=0.0,
        )
        print(error_response.to_json())
        return

    # Check cache first
    cached = get_cached(url)
    if cached:
        logger.info("Cache hit — returning cached result")
        print(cached.to_json())
        return

    logger.info(f"Starting {platform} scraper for: {url}")

    if platform == "flipkart":
        scraper = FlipkartScraper()
    else:
        scraper = AmazonScraper()

    try:
        result = await scraper.fetch_reviews(url)
    except Exception as e:
        logger.error(f"Scraper crashed: {e}")
        result = ScrapeResponse(
            platform=platform,
            product_url=url,
            product_title="",
            reviews=[],
            total_reviews_on_page=None,
            reviews_fetched=0,
            scrape_status="error",
            error_message=str(e),
            scrape_duration_seconds=0.0,
        )

    # Cache successful results
    if result.scrape_status in ("success", "partial"):
        set_cached(url, result)

    print(result.to_json())


if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.error("Usage: python scrapers/run.py <url>")
        # Still output valid JSON for the Node bridge to parse
        error = ScrapeResponse(
            platform="unknown", product_url="", product_title="",
            reviews=[], total_reviews_on_page=None, reviews_fetched=0,
            scrape_status="error", error_message="No URL provided",
            scrape_duration_seconds=0.0,
        )
        print(error.to_json())
        sys.exit(1)

    asyncio.run(main(sys.argv[1]))
