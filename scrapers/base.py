from abc import ABC, abstractmethod
from .models import ScrapeResponse
import logging

class BaseScraper(ABC):
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    @abstractmethod
    async def fetch_reviews(self, url: str) -> ScrapeResponse:
        pass
