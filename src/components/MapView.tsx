import { useEffect, useRef, useCallback } from "react";
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

const MapView = ({ markers, route, zones, tempZone, isDrawingZone, onMapClick }: Props) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([38.3452, -0.481], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    layersRef.current.addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle click
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onMapClick]);

  // Render layers
  useEffect(() => {
    const group = layersRef.current;
    group.clearLayers();

    // Markers
    markers.forEach((m, i) => {
      L.marker([m.lat, m.lng]).bindPopup(`Punto ${i + 1}`).addTo(group);
    });

    // Route polyline
    if (route && markers[route.origin] && markers[route.destination]) {
      const o = markers[route.origin];
      const d = markers[route.destination];
      L.polyline([[o.lat, o.lng], [d.lat, d.lng]], { color: "#06B6D4", weight: 4 }).addTo(group);
    }

    // Saved zones
    zones.forEach((z) => {
      L.polygon(
        z.points.map((p) => [p.lat, p.lng] as [number, number]),
        { color: "#0B1B3A", fillColor: "#06B6D4", fillOpacity: 0.2, weight: 2 }
      ).addTo(group);
    });

    // Temp zone
    if (isDrawingZone && tempZone.length > 0) {
      L.polygon(
        tempZone.map((p) => [p.lat, p.lng] as [number, number]),
        { color: "#06B6D4", fillColor: "#06B6D4", fillOpacity: 0.1, weight: 2, dashArray: "6 4" }
      ).addTo(group);
    }
  }, [markers, route, zones, tempZone, isDrawingZone]);

  return <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-lg" />;
};

export default MapView;
