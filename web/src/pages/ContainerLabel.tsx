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

  // A bin on a grid has no position text of its own, but its cell is exactly
  // the "where is it" the label wants.
  const cellText = container.cell
    ? `${container.cell}${container.parent ? ` · ${container.parent.name}` : ''}`
    : '';
  const position = container.position || cellText;

  return (
    <>
      <PrintableLabel title={container.name} subtitle={position} code={id} backTo={`/containers/${id}`} />
      <LabelForgePrint
        seed={{
          name: container.name,
          location: container.root_location?.name || '',
          container: container.parent?.name || '',
          position,
          code: id,
        }}
      />
    </>
  );
}
