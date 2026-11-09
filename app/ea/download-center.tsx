import Link from 'next/link';
import { ArrowRight, FolderOpen } from 'lucide-react';

export default function DownloadCenter() {
  return <section className="feature-card ea-download-card">
    <div className="feature-section-label">01 / DOWNLOAD CENTER</div>
    <div className="feature-card-heading"><div><h2>Download Center<span>.</span></h2><p>Strategy downloads have been cleared.</p></div></div>
    <div className="result-empty"><span><FolderOpen size={22}/></span><h3>No downloads available</h3><p>There are currently no strategy files in the Download Center.</p></div>
    <div className="ea-current-chart"><div><strong>Browser tester</strong><p>The browser tester remains available and uses its existing research logic.</p></div><div><Link href="/tester">Open tester <ArrowRight size={15}/></Link></div></div>
  </section>;
}
