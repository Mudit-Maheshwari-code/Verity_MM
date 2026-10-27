import re
import time
from typing import Optional
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from .base import BaseScraper
from .models import ScrapeResponse, Review
from .utils import get_random_user_agent, random_delay

class AmazonScraper(BaseScraper):
    async def fetch_reviews(self, url: str) -> ScrapeResponse:
        start_time = time.time()
        reviews_list = []
        status = "success"
        error_msg = None
        product_title = ""
        
        asin_match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', url)
        if not asin_match:
            return ScrapeResponse(
                platform="amazon", product_url=url, product_title="", reviews=[],
                total_reviews_on_page=None, reviews_fetched=0, scrape_status="error",
                error_message="Could not extract ASIN from URL", scrape_duration_seconds=round(time.time() - start_time, 2)
            )
        asin = asin_match.group(1)
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=get_random_user_agent(),
                    viewport={"width": 1920, "height": 1080},
                    extra_http_headers={
                        "Accept-Language": "en-US,en;q=0.9",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
                    }
                )
                page = await context.new_page()
                
                reviews_url = f"https://www.amazon.in/product-reviews/{asin}"
                current_page = 1
                
                while len(reviews_list) < 150:
                    page_url = f"{reviews_url}?pageNumber={current_page}"
                    self.logger.info(f"Fetching Amazon reviews page {current_page}: {page_url}")
                    
                    try:
                        await page.goto(page_url, wait_until="domcontentloaded", timeout=60000)
                    except PlaywrightTimeoutError:
                        self.logger.warning("Timeout navigating to reviews page")
                        status = "partial" if reviews_list else "error"
                        error_msg = "Timeout loading reviews page"
                        break
                        
                    await random_delay(3, 8)
                    
                    if await page.query_selector("form[action*='/captcha']"):
                        status = "captcha"
                        error_msg = "Blocked by captcha"
                        break
                        
                    if current_page == 1:
                        title_elem = await page.query_selector("a[data-hook='product-link']")
                        if title_elem:
                            product_title = (await title_elem.inner_text()).strip()
                    
                    review_cards = await page.query_selector_all("div[data-hook='review']")
                    if not review_cards:
                        self.logger.info("No more reviews found on page")
                        break
                        
                    for card in review_cards:
                        try:
                            review_id = await card.get_attribute("id") or f"amazon:{hash(time.time())}"
                            
                            rating_elem = await card.query_selector("i[data-hook='review-star-rating'] span")
                            if rating_elem:
                                rating_text = await rating_elem.inner_text()
                                rating = int(float(rating_text.split(' ')[0]))
                            else:
                                rating = 0
                                
                            title_elem = await card.query_selector("a[data-hook='review-title'] span:not([class])")
                            title = (await title_elem.inner_text()).strip() if title_elem else ""
                            
                            body_elem = await card.query_selector("span[data-hook='review-body'] span")
                            body = (await body_elem.inner_text()).strip() if body_elem else ""
                            
                            author_elem = await card.query_selector("span.a-profile-name")
                            reviewer_name = (await author_elem.inner_text()).strip() if author_elem else "Anonymous"
                            
                            date_elem = await card.query_selector("span[data-hook='review-date']")
                            date_str = (await date_elem.inner_text()).strip() if date_elem else ""
                            
                            verified_elem = await card.query_selector("span[data-hook='avp-badge']")
                            is_verified = bool(verified_elem)
                            
                            helpful_elem = await card.query_selector("span[data-hook='helpful-vote-statement']")
                            helpful_votes = 0
                            if helpful_elem:
                                helpful_text = await helpful_elem.inner_text()
                                match = re.search(r'([\d,]+)', helpful_text)
                                if match:
                                    helpful_votes = int(match.group(1).replace(',', ''))
                            
                            reviews_list.append(Review(
                                id=review_id,
                                rating=rating,
                                title=title,
                                body=body,
                                date=date_str,
                                reviewer_name=reviewer_name,
                                is_verified_purchase=is_verified,
                                helpful_votes=helpful_votes,
                                language="en"
                            ))
                            if len(reviews_list) >= 150:
                                break
                        except Exception as e:
                            self.logger.warning(f"Error parsing review card: {e}")
                    
                    next_btn = await page.query_selector("li.a-last a")
                    if not next_btn:
                        break
                        
                    current_page += 1
                
                await browser.close()
        except Exception as e:
            self.logger.error(f"Error during scrape: {e}")
            status = "partial" if reviews_list else "error"
            error_msg = str(e)
            
        return ScrapeResponse(
            platform="amazon",
            product_url=url,
            product_title=product_title,
            reviews=reviews_list,
            total_reviews_on_page=None,
            reviews_fetched=len(reviews_list),
            scrape_status=status,
            error_message=error_msg,
            scrape_duration_seconds=round(time.time() - start_time, 2)
        )
