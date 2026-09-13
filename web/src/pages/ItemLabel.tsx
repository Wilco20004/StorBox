import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ItemDetail } from '../types';
import PrintableLabel from '../components/PrintableLabel';
import LabelForgePrint from '../components/LabelForgePrint';

export default function ItemLabel() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) api.getItem(id).then(setItem).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!item || !id) return <p>Loading...</p>;

  const containerText = item.container
    ? item.container.cell
      ? `${item.container.cell} · ${item.container.name}`
      : item.container.name
    : '';
  const subtitle = containerText || item.location?.name;

  return (
    <>
      <PrintableLabel title={item.name} subtitle={subtitle} code={id} backTo={`/items/${id}`} />
      <LabelForgePrint
        seed={{
          name: item.name,
          location: item.location?.name || '',
          container: item.container?.name || '',
          position: item.container?.cell || item.container?.position || '',
          code: id,
        }}
      />
    </>
  );
}
