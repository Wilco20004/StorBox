import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';

export default function PrintableLabel({
  title,
  subtitle,
  code,
  backTo,
}: {
  title: string;
  subtitle?: string | null;
  code: string;
  backTo: string;
}) {
  return (
    <div>
      <p className="breadcrumb no-print">
        <Link to={backTo}>← Back</Link>
      </p>

      <div className="label-sheet">
        <QRCodeSVG value={code} size={220} />
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>

      <p className="muted small no-print">
        This code only means something to StorBox's own scanner (Scan in the top nav) — it's not a link.
      </p>

      <button className="button no-print" onClick={() => window.print()}>
        Print
      </button>
    </div>
  );
}
