import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { itemPath } from '../utils/itemPath';
import { ContainerDetail, ItemDetail } from '../types';

export default function TagPage() {
  const { name } = useParams<{ name: string }>();
  const [items, setItems] = useState<ItemDetail[] | null>(null);
  const [containers, setContainers] = useState<ContainerDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) return;
    setItems(null);
    setContainers(null);
    api.listItems({ tag: name }).then(setItems).catch((e) => setError(e.message));
    api.listContainersByTag(name).then(setContainers).catch((e) => setError(e.message));
  }, [name]);

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/">Locations</Link>
      </p>
      <h1>Tag: {name}</h1>

      <section className="card">
        <h2>Items</h2>
        {items === null ? (
          <p className="muted">Loading...</p>
        ) : items.length === 0 ? (
          <p className="muted">No items tagged "{name}".</p>
        ) : (
          <ul className="entity-list">
            {items.map((item) => (
              <li key={item.id} className="entity-row">
                <div className="entity-row-body">
                  <Link to={`/items/${item.id}`}>
                    <strong>{item.name}</strong>
                  </Link>
                  {(item.container || item.location) && (
                    <p className="muted small">
                      📍 {itemPath(item) || item.location?.name}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Containers</h2>
        {containers === null ? (
          <p className="muted">Loading...</p>
        ) : containers.length === 0 ? (
          <p className="muted">No containers tagged "{name}".</p>
        ) : (
          <ul className="entity-list">
            {containers.map((c) => (
              <li key={c.id} className="entity-row">
                <div className="entity-row-body">
                  <Link to={`/containers/${c.id}`}>
                    <strong>{c.name}</strong>
                  </Link>
                  {c.location && <p className="muted small">📍 {c.location.name}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
