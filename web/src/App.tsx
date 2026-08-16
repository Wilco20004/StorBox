import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LocationForm from './pages/LocationForm';
import LocationDetail from './pages/LocationDetail';
import ContainerForm from './pages/ContainerForm';
import ContainerDetail from './pages/ContainerDetail';
import ItemForm from './pages/ItemForm';
import ItemDetail from './pages/ItemDetail';
import TagPage from './pages/TagPage';
import ContainerLabel from './pages/ContainerLabel';
import ItemLabel from './pages/ItemLabel';
import Scan from './pages/Scan';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          📦 StorBox
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Locations
          </NavLink>
          <NavLink to="/scan">Scan</NavLink>
          <NavLink to="/locations/new">Add location</NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/locations/new" element={<LocationForm />} />
          <Route path="/locations/:id" element={<LocationDetail />} />
          <Route path="/locations/:id/edit" element={<LocationForm />} />
          <Route path="/locations/:locationId/containers/new" element={<ContainerForm />} />
          <Route path="/containers/:id" element={<ContainerDetail />} />
          <Route path="/containers/:id/edit" element={<ContainerForm />} />
          <Route path="/containers/:id/label" element={<ContainerLabel />} />
          <Route path="/items/new" element={<ItemForm />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/items/:id/edit" element={<ItemForm />} />
          <Route path="/items/:id/label" element={<ItemLabel />} />
          <Route path="/tags/:name" element={<TagPage />} />
        </Routes>
      </main>
    </div>
  );
}
