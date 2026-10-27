import re
import time
from typing import Optional
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from .base import BaseScraper
from .models import ScrapeResponse, Review
from .utils import get_random_user_agent, random_delay

class FlipkartScraper(BaseScraper):
    async def fetch_reviews(self, url: str) -> ScrapeResponse:
        start_time = time.time()
        reviews_list = []
        status = "success"
        error_msg = None
        product_title = ""
        total_reviews = None
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=get_random_user_agent(),
                    viewport={"width": 1920, "height": 1080}
                )
                page = await context.new_page()
                
                self.logger.info(f"Navigating to {url}")
                await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                await random_delay(2, 4)
                
                title_elem = await page.query_selector("span.VU-ZEz")
                if title_elem:
                    product_title = await title_elem.inner_text()
                
                review_link = await page.query_selector("div.col.JOpGWq a")
                if not review_link:
                    review_link = await page.query_selector('a[href*="/product-reviews/"]')
                
                if review_link:
                    reviews_url_path = await review_link.get_attribute("href")
                    reviews_url = f"https://www.flipkart.com{reviews_url_path}"
                else:
                    reviews_url = re.sub(r'/p/', '/product-reviews/', url)
                
                current_page = 1
                while len(reviews_list) < 150:
                    page_url = f"{reviews_url}&page={current_page}" if "?" in reviews_url else f"{reviews_url}?page={current_page}"
                    self.logger.info(f"Fetching reviews page {current_page}: {page_url}")
                    
                    try:
                        await page.goto(page_url, wait_until="domcontentloaded", timeout=60000)
                    except PlaywrightTimeoutError:
                        self.logger.warning("Timeout navigating to reviews page")
                        status = "partial" if reviews_list else "error"
                        error_msg = "Timeout loading reviews page"
                        break
                        
                    await random_delay(2, 5)
                    
                    if await page.query_selector("form[action*='/captcha']"):
                        status = "captcha"
                        error_msg = "Blocked by captcha"
                        break
                    
                    review_cards = await page.query_selector_all("div.col._2wzgFH, div.col.EPCm-n")
                    if not review_cards:
                        self.logger.info("No more reviews found on page")
                        break
                        
                    for card in review_cards:
                        try:
                            rating_elem = await card.query_selector("div._3LWZlK, div.XQDdHH")
                            rating = int((await rating_elem.inner_text()).strip()) if rating_elem else 0
                            
                            title_elem = await card.query_selector("p._2-N8zT, p.z9E0IG")
                            title = (await title_elem.inner_text()).strip() if title_elem else ""
                            
                            body_elem = await card.query_selector("div.t-ZTKy div, div.Zmyq-m div")
                            body = (await body_elem.inner_text()).strip() if body_elem else ""
                            
                            author_elem = await card.query_selector("p._2sc7ZR, p._2NsDsF")
                            reviewer_name = (await author_elem.inner_text()).strip() if author_elem else "Anonymous"
                            
                            date_elem = await card.query_selector_all("p._2sc7ZR, p._2NsDsF")
                            date_str = (await date_elem[1].inner_text()).strip() if len(date_elem) > 1 else ""
                            
                            verified_elem = await card.query_selector("p._2mcZGG")
                            is_verified = bool(verified_elem)
                            
                            likes_elem = await card.query_selector("span._3c3Px5")
                            helpful_votes = int((await likes_elem.inner_text()).strip()) if likes_elem else 0
                            
                            review_id = f"flipkart:{hash(title + body + reviewer_name)}"
                            
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
                            
                    current_page += 1
                
                await browser.close()
        except Exception as e:
            self.logger.error(f"Error during scrape: {e}")
            status = "partial" if reviews_list else "error"
            error_msg = str(e)
            
        return ScrapeResponse(
            platform="flipkart",
            product_url=url,
            product_title=product_title,
            reviews=reviews_list,
            total_reviews_on_page=total_reviews,
            reviews_fetched=len(reviews_list),
            scrape_status=status,
            error_message=error_msg,
            scrape_duration_seconds=round(time.time() - start_time, 2)
        )
