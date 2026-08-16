import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerDetail } from '../types';
import { getStableUrl } from '../utils/stableUrl';
import PrintableLabel from '../components/PrintableLabel';

export default function ContainerLabel() {
  const { id } = useParams<{ id: string }>();
  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) api.getContainer(id).then(setContainer).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!container || !id) return <p>Loading...</p>;

  const { url, viaIngress } = getStableUrl(`#/containers/${id}`);

  return (
    <PrintableLabel
      title={container.name}
      subtitle={container.position}
      url={url}
      viaIngress={viaIngress}
      backTo={`/containers/${id}`}
    />
  );
}
