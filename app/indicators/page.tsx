import Link from 'next/link';
import IndicatorCard from './indicator-card';
import { indicators } from './data';

export default function IndicatorsPage() {
  return <main className="page">
    <header><Link className="brand" href="/">TRADING BRAIN <span>/</span> DARK ORDERS</Link><span className="tag">INDICATORS</span></header>
    <section className="intro">
      <p className="eyebrow">ALL MY INDICATORS</p>
      <h1>Indicators<span>.</span></h1>
      <p>Every indicator in this project — the standalone Dark Orders overlay, the combined scripts, and the MT5 research tools — with a link to each one.</p>
    </section>
    <section className="grid">
      {indicators.map((item) => <IndicatorCard key={item.href} item={item} />)}
    </section>
    <footer>TRADING BRAIN / INDICATORS <span>NOT FINANCIAL ADVICE</span></footer>
  </main>;
}
