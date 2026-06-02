import { type ChartType } from './chart';
import styles from './ChartView.module.css';

export interface ChartViewProps {
  type: ChartType;
  values: number[];
  title: string;
}

// Data-viz series colours are CSS named colours (chart content, not UI chrome).
const SERIES_COLORS = ['cornflowerblue', 'seagreen', 'goldenrod', 'indianred', 'mediumpurple', 'teal'];
const W = 320;
const H = 180;
const PAD = 24;

function color(i: number): string {
  return SERIES_COLORS[i % SERIES_COLORS.length] ?? 'gray';
}

function renderBars(values: number[]) {
  const max = Math.max(...values.map((v) => Math.max(v, 0)), 1);
  const barWidth = (W - 2 * PAD) / values.length;
  return values.map((v, i) => {
    const height = (Math.max(v, 0) / max) * (H - 2 * PAD);
    return (
      <rect
        key={i}
        x={PAD + i * barWidth + barWidth * 0.1}
        y={H - PAD - height}
        width={barWidth * 0.8}
        height={height}
        fill={color(i)}
      />
    );
  });
}

function renderLine(values: number[]) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (W - 2 * PAD) / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${PAD + i * stepX},${H - PAD - ((v - min) / span) * (H - 2 * PAD)}`)
    .join(' ');
  return <polyline points={points} fill="none" stroke={color(0)} strokeWidth={2} />;
}

function renderPie(values: number[]) {
  const positives = values.map((v) => Math.max(v, 0));
  const total = positives.reduce((a, b) => a + b, 0) || 1;
  const cx = W / 2;
  const cy = H / 2;
  const r = H / 2 - PAD;
  let angle = -Math.PI / 2;
  return positives.map((v, i) => {
    const slice = (v / total) * Math.PI * 2;
    const x0 = cx + r * Math.cos(angle);
    const y0 = cy + r * Math.sin(angle);
    angle += slice;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const largeArc = slice > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
    return <path key={i} d={d} fill={color(i)} />;
  });
}

export function ChartView({ type, values, title }: ChartViewProps) {
  const hasData = values.length > 0 && values.some((v) => v !== 0);
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>{title}</figcaption>
      {hasData ? (
        <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
          <title>{title}</title>
          {type === 'bar' ? renderBars(values) : null}
          {type === 'line' ? renderLine(values) : null}
          {type === 'pie' ? renderPie(values) : null}
        </svg>
      ) : (
        <p className={styles.empty}>No data to chart.</p>
      )}
    </figure>
  );
}
