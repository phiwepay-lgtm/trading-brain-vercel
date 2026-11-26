import Link from 'next/link';
import type { IndicatorCardItem } from './data';

export default function IndicatorCard({ item }: { item: IndicatorCardItem }) {
  return <Link className="feature-card" href={item.href}>
    <span className="feature-tag">{item.tag}</span>
    <span className="feature-name">{item.name}</span>
    <span className="feature-note">{item.note}</span>
    <span className="feature-link">Open →</span>
  </Link>;
}
