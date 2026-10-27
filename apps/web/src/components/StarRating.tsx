interface StarRatingProps {
  rating: number;
  max?: number;
}

export default function StarRating({ rating, max = 5 }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = max - fullStars - (hasHalf ? 1 : 0);

  return (
    <span className="star-rating" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`full-${i}`} className="star star--full" aria-hidden="true">★</span>
      ))}
      {hasHalf && (
        <span className="star star--half" aria-hidden="true">⯨</span>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`empty-${i}`} className="star star--empty" aria-hidden="true">☆</span>
      ))}
    </span>
  );
}
