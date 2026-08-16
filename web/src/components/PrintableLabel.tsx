import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';

export default function PrintableLabel({
  title,
  subtitle,
  url,
  viaIngress,
  backTo,
}: {
  title: string;
  subtitle?: string | null;
  url: string | null;
  viaIngress: boolean;
  backTo: string;
}) {
  return (
    <div>
      <p className="breadcrumb no-print">
        <Link to={backTo}>← Back</Link>
      </p>

      {viaIngress && (
        <p className="error no-print">
          You're viewing StorBox through Home Assistant's sidebar, which uses a temporary link that
          changes between sessions. Open the add-on's direct "Open Web UI" link instead (see the add-on's
          Info tab), then come back to this label page from there so the printed QR code keeps working.
        </p>
      )}

      {url && (
        <div className="label-sheet">
          <QRCodeSVG value={url} size={220} />
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
      )}

      {url && (
        <button className="button no-print" onClick={() => window.print()}>
          Print
        </button>
      )}
    </div>
  );
}
