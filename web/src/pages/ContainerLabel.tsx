import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerDetail } from '../types';
import PrintableLabel from '../components/PrintableLabel';
import LabelForgePrint from '../components/LabelForgePrint';

export default function ContainerLabel() {
  const { id } = useParams<{ id: string }>();
  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) api.getContainer(id).then(setContainer).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!container || !id) return <p>Loading...</p>;

  return (
    <>
      <PrintableLabel title={container.name} subtitle={container.position} code={id} backTo={`/containers/${id}`} />
      <LabelForgePrint
        seed={{
          name: container.name,
          location: container.location?.name || '',
          position: container.position || '',
          code: id,
        }}
      />
    </>
  );
}
