import { Suspense } from 'react';
import ChartWorkspace from './workspace';
import './chart.css';
export default function Page() { return <Suspense fallback={<main>Loading chart workspace…</main>}><ChartWorkspace /></Suspense>; }
