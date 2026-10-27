import { useEffect, useRef, useState } from 'react';
import './AuthenticityGauge.css';

interface AuthenticityGaugeProps {
  score: number;
  confidence: string;
  reviewCount: number;
}

function getScoreColor(score: number): string {
  if (score < 40) return 'var(--score-low)';
  if (score < 70) return 'var(--score-mid)';
  return 'var(--score-high)';
}

function getScoreLabel(score: number): string {
  if (score < 40) return 'High Risk';
  if (score < 55) return 'Elevated Risk';
  if (score < 70) return 'Mixed Signals';
  return 'Likely Genuine';
}

// Arc math: 180° semicircle
// cx=150, cy=150, r=110
// startAngle=-180° (left), endAngle=0° (right)
// Full arc circumference for 180° = π * r
const CX = 150;
const CY = 155;
const RADIUS = 110;
const STROKE_WIDTH = 14;
const TICK_COUNT = 11; // 0,10,20,...,100

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Build SVG arc path for a semicircle (180 degrees)
// score 0-100 maps to 0° to 180° of the arc
function buildArcPath(score: number): { d: string; dasharray: number; dashoffset: number } {
  // Full semicircle arc length
  const fullLength = Math.PI * RADIUS;
  // How much of it to fill
  const filledLength = (score / 100) * fullLength;
  const dasharray = fullLength;
  const dashoffset = fullLength - filledLength;

  // Full semicircle path: from left (180°) to right (0°)
  // In SVG coords: angles measured from positive X axis
  // left point at -180° rel to center = (-RADIUS, 0) relative
  const start = polarToCartesian(CX, CY, RADIUS, 180);  // left
  const end = polarToCartesian(CX, CY, RADIUS, 0);       // right

  const d = `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`;
  return { d, dasharray, dashoffset };
}

export default function AuthenticityGauge({ score, confidence, reviewCount }: AuthenticityGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 1200; // ms
    const startTime = performance.now();
    const startScore = 0;
    const targetScore = score;

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const current = Math.round(startScore + easeOut(t) * (targetScore - startScore));
      setAnimatedScore(current);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [score]);

  const { d, dasharray, dashoffset } = buildArcPath(animatedScore);
  const trackPath = buildArcPath(100);
  const color = getScoreColor(animatedScore);
  const label = getScoreLabel(animatedScore);

  // Tick marks
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const pct = i / (TICK_COUNT - 1);
    const angleDeg = 180 - pct * 180; // 180° to 0°
    const innerR = RADIUS - STROKE_WIDTH / 2 - 6;
    const outerR = RADIUS + STROKE_WIDTH / 2 + 4;
    const inner = polarToCartesian(CX, CY, innerR, angleDeg);
    const outer = polarToCartesian(CX, CY, outerR, angleDeg);
    return { inner, outer, value: i * 10 };
  });

  // Needle/indicator dot
  const scoreAngle = 180 - (animatedScore / 100) * 180;
  const needlePt = polarToCartesian(CX, CY, RADIUS, scoreAngle);

  return (
    <div className="gauge" aria-label={`Authenticity score: ${score} out of 100`}>
      <svg
        className="gauge__svg"
        viewBox="0 0 300 180"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Track arc (background) */}
        <path
          d={trackPath.d}
          fill="none"
          stroke="var(--color-surface-alt)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={dasharray}
          strokeDashoffset={dashoffset - dasharray}
          style={{ transition: 'stroke var(--transition-slow)' }}
        />

        {/* Tick marks */}
        {ticks.map(({ inner, outer, value }) => (
          <line
            key={value}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="var(--color-border)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}

        {/* Needle dot at current score */}
        <circle
          cx={needlePt.x}
          cy={needlePt.y}
          r={5}
          fill={color}
          stroke="var(--color-surface)"
          strokeWidth={2}
          style={{ transition: 'fill var(--transition-slow)' }}
        />

        {/* Scale labels */}
        <text x={CX - RADIUS - STROKE_WIDTH} y={CY + 22} className="gauge__scale-label" textAnchor="middle">0</text>
        <text x={CX + RADIUS + STROKE_WIDTH} y={CY + 22} className="gauge__scale-label" textAnchor="middle">100</text>
      </svg>

      {/* Score number */}
      <div className="gauge__center">
        <div className="gauge__score" style={{ color }}>
          {animatedScore}
        </div>
        <div className="gauge__score-label">Authenticity Score</div>
        <div className="gauge__verdict" style={{ color }}>
          {label}
        </div>
        <div className="gauge__meta">
          <span className="gauge__confidence">{confidence} confidence</span>
          <span className="gauge__sep">·</span>
          <span className="gauge__review-count">{reviewCount.toLocaleString()} reviews</span>
        </div>
      </div>
    </div>
  );
}
