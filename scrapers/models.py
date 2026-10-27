from dataclasses import dataclass, field
from typing import List, Optional
import json

@dataclass
class Review:
    id: str
    rating: int
    title: str
    body: str
    date: str
    reviewer_name: str
    is_verified_purchase: Optional[bool]
    helpful_votes: int
    language: str

@dataclass
class ScrapeResponse:
    platform: str
    product_url: str
    product_title: str
    reviews: List[Review]
    total_reviews_on_page: Optional[int]
    reviews_fetched: int
    scrape_status: str
    error_message: Optional[str]
    scrape_duration_seconds: float

    def to_json(self) -> str:
        return json.dumps(self, default=lambda o: o.__dict__, indent=2)
