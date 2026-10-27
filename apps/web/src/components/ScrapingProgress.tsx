import { useEffect, useState } from 'react';
import './ScrapingProgress.css';

interface ScrapingProgressProps {
  url: string;
}

export default function ScrapingProgress({ url }: ScrapingProgressProps) {
  const [dots, setDots] = useState('');
  
  const platform = url.toLowerCase().includes('amazon') 
    ? 'Amazon' 
    : url.toLowerCase().includes('flipkart') 
      ? 'Flipkart' 
      : 'the store';

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="scraping-progress">
      <div className="scraping-progress__spinner" aria-hidden="true" />
      <h2 className="scraping-progress__heading">
        Fetching reviews from {platform}{dots}
      </h2>
      <p className="scraping-progress__note">
        We're browsing the product page and extracting reviews — no APIs involved.
      </p>
      <div className="scraping-progress__time">
        This usually takes 30-60 seconds.
      </div>
      <div className="scraping-progress__bar">
        <div className="scraping-progress__bar-fill" />
      </div>
    </div>
  );
}
