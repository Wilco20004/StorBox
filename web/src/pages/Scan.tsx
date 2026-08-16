import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import QrScanner from '../components/QrScanner';

export default function Scan() {
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState<string | null>(null);
  const [scannerKey, setScannerKey] = useState(0);

  const handleScan = useCallback(
    (code: string) => {
      setNotFound(null);
      api
        .lookupCode(code)
        .then((result) => navigate(result.type === 'item' ? `/items/${result.id}` : `/containers/${result.id}`))
        .catch(() => {
          setNotFound(code);
          setScannerKey((k) => k + 1);
        });
    },
    [navigate]
  );

  return (
    <div className="card form-card">
      <h2>Scan a label</h2>
      <p className="muted">Point the camera at a StorBox QR label to jump straight to that container or item.</p>
      {notFound && <p className="error">That code doesn't match anything. Try again.</p>}
      <QrScanner key={scannerKey} onScan={handleScan} />
    </div>
  );
}
