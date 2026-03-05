import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Marker as MarkerType } from "./MarkersPanel";
import type { Route } from "./RoutesPanel";
import type { Zone } from "./ZonesPanel";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Props {
  markers: MarkerType[];
  route: Route | null;
  zones: Zone[];
  tempZone: { lat: number; lng: number }[];
  isDrawingZone: boolean;
  onMapClick: (lat: number, lng: number) => void;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const MapView = ({ markers, route, zones, tempZone, isDrawingZone, onMapClick }: Props) => {
  const routePositions =
    route && markers[route.origin] && markers[route.destination]
      ? [
          [markers[route.origin].lat, markers[route.origin].lng] as [number, number],
          [markers[route.destination].lat, markers[route.destination].lng] as [number, number],
        ]
      : null;

  return (
    <MapContainer
      center={[38.3452, -0.481]}
      zoom={13}
      className="w-full h-full min-h-[400px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onMapClick} />

      {markers.map((m, i) => (
        <Marker key={i} position={[m.lat, m.lng]}>
          <Popup>Punto {i + 1}</Popup>
        </Marker>
      ))}

      {routePositions && (
        <Polyline positions={routePositions} pathOptions={{ color: "#06B6D4", weight: 4 }} />
      )}

      {zones.map((z, i) => (
        <Polygon
          key={i}
          positions={z.points.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: "#0B1B3A", fillColor: "#06B6D4", fillOpacity: 0.2, weight: 2 }}
        />
      ))}

      {isDrawingZone && tempZone.length > 0 && (
        <Polygon
          positions={tempZone.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: "#06B6D4", fillColor: "#06B6D4", fillOpacity: 0.1, weight: 2, dashArray: "6 4" }}
        />
      )}
    </MapContainer>
  );
};

export default MapView;
