import { useEffect, useMemo } from 'react';
import { divIcon, latLngBounds } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { MapPin, Navigation, UserRound } from 'lucide-react';
import type { Person } from './App';
import 'leaflet/dist/leaflet.css';

const familyColors: Record<number, string> = {
  1: '#55764e', 2: '#bb7139', 3: '#4577a4', 4: '#8560a0', 5: '#b14e55',
};
const fullName = (person: Person) => `${person.nome} ${person.sobrenome}`.trim();
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));

function FitVisibleMarkers({ people }: { people: Person[] }) {
  const map = useMap();
  const key = people.map((person) => `${person.id}:${person.latitude}:${person.longitude}`).join(',');
  useEffect(() => {
    if (!people.length) return;
    const bounds = latLngBounds(people.map((person) => [person.latitude as number, person.longitude as number] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 8 });
    // key is the stable marker-set signature; the map itself remains mounted between updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function FamilyMap({
  people, selectedBranch, query, onFocusBranch, onSetLocation,
}: {
  people: Person[];
  selectedBranch: number | null;
  query: string;
  onFocusBranch: (branch: number | null) => void;
  onSetLocation?: (person: Person) => void;
}) {
  const visiblePeople = useMemo(() => people.filter((person) => {
    if (selectedBranch !== null && person.ramo !== selectedBranch) return false;
    const matchesQuery = !query.trim() || fullName(person).toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'));
    return matchesQuery;
  }), [people, query, selectedBranch]);
  const located = visiblePeople.filter((person) => Number.isFinite(person.latitude) && Number.isFinite(person.longitude));
  const unlocated = visiblePeople.filter((person) => !Number.isFinite(person.latitude) || !Number.isFinite(person.longitude));
  const center: [number, number] = located.length ? [located[0].latitude as number, located[0].longitude as number] : [-15.78, -47.92];

  return (
    <section className="map-stage" aria-label="Mapa compartilhado da família">
      <header className="map-heading">
        <div>
          <div className="eyebrow">Lugares que nos aproximam</div>
          <h2 className="serif">Nossa família, pelo mapa.</h2>
          <p>{onSetLocation ? 'Veja onde vivem os ramos da família e acrescente os lugares que fazem parte da nossa história.' : 'Veja os lugares compartilhados pelos ramos da família.'}</p>
        </div>
        <div className="map-counts">
          <div className="map-count"><strong>{located.length}</strong><span>no mapa</span></div>
          <div className="map-count waiting"><strong>{unlocated.length}</strong><span>sem localização</span></div>
        </div>
      </header>
      <div className="map-privacy"><MapPin size={15} /><span>As localizações são compartilhadas com todas as pessoas que acessam este arquivo familiar.</span></div>
      <div className="map-layout">
        <div className="leaflet-frame">
          {located.length ? (
            <MapContainer center={center} zoom={5} scrollWheelZoom={true} className="leaflet-map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitVisibleMarkers people={located} />
              {located.map((person) => {
                const color = familyColors[person.ramo] || '#55764e';
                const photo = person.foto_url ? `<img src="${escapeHtml(person.foto_url)}" alt="" />` : `<span>${escapeHtml(person.nome.slice(0, 1).toLocaleUpperCase('pt-BR'))}</span>`;
                const icon = divIcon({
                  className: 'family-leaflet-marker',
                  html: `<div class="family-pin" style="--pin:${color}">${photo}<i></i></div>`,
                  iconSize: [42, 50],
                  iconAnchor: [21, 48],
                  popupAnchor: [0, -44],
                });
                return (
                  <Marker key={person.id} position={[person.latitude as number, person.longitude as number]} icon={icon} title={fullName(person)} alt={`Localização de ${fullName(person)}`}>
                    <Popup>
                      <div className="map-popup">
                        {person.foto_url ? <img src={person.foto_url} alt="" /> : <span className="popup-initial">{person.nome.slice(0, 1)}</span>}
                        <div className="map-popup-name">{fullName(person)}</div>
                        <div className="map-popup-location">{person.cidade || `Ramo ${person.ramo}`}</div>
                        {onSetLocation && <button className="map-popup-action" onClick={() => onSetLocation(person)}><Navigation size={13} /> Ajustar localização</button>}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          ) : (
            <div className="map-empty" role="status">
              <span className="map-empty-icon"><MapPin size={24} /></span>
              <h3>Ainda não há lugares neste ramo</h3>
              <p>{onSetLocation ? 'Defina as coordenadas de uma pessoa para que ela apareça no mapa.' : 'Ainda não há localizações registradas neste ramo.'}</p>
              {unlocated[0] && onSetLocation && <button className="button primary small" onClick={() => onSetLocation(unlocated[0])}><MapPin size={14} /> Definir primeira localização</button>}
            </div>
          )}
          <div className="map-caption"><span><span className="map-live-dot" /> Mapa OpenStreetMap</span><span>As marcações mostram apenas quem tem localização definida.</span></div>
        </div>
        <aside className="map-roster" aria-label="Pessoas sem localização">
          <div className="roster-title">
            <div><span className="modal-kicker">{onSetLocation ? 'Próximo capítulo' : 'Mapa da família'}</span><h3>{onSetLocation ? 'Adicionar um lugar' : 'Pessoas sem localização'}</h3></div>
            <span className="roster-number">{unlocated.length}</span>
          </div>
          {unlocated.length ? (
            <>
              <p className="roster-intro">{onSetLocation ? 'Cada ponto ajuda a contar por onde a família passou. A localização será compartilhada no mapa.' : 'Estas pessoas ainda não têm um ponto compartilhado no mapa.'}</p>
              <div className="roster-list">
                {unlocated.map((person) => (
                  <div className="roster-person" key={person.id}>
                    {person.foto_url ? <img src={person.foto_url} alt="" /> : <span className="roster-avatar"><UserRound size={15} /></span>}
                    <span className="roster-person-copy"><strong>{fullName(person)}</strong><small>{person.cidade || `Ramo ${person.ramo}`}</small></span>
                    {onSetLocation && <button className="roster-add" onClick={() => onSetLocation(person)} aria-label={`Definir localização de ${fullName(person)}`}><MapPin size={15} /></button>}
                  </div>
                ))}
              </div>
              <button className="button roster-branch" onClick={() => onFocusBranch(null)}>Ver todos os ramos</button>
            </>
          ) : (
            <div className="roster-empty"><span><Navigation size={21} /></span><strong>Todos os lugares encontrados.</strong><p>Nenhuma pessoa sem localização neste recorte.</p></div>
          )}
          <div className="roster-foot">As coordenadas são privadas da família e visíveis para quem acessa o mapa compartilhado.</div>
        </aside>
      </div>
    </section>
  );
}