import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Marker as MarkerType } from "./MarkersPanel";
import type { RouteResult } from "./RoutesPanel";
import type { Zone } from "./ZonesPanel";
import { predefinedRoutes, type PredefinedRoute } from "@/data/predefinedRoutes";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const originIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const catalogIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  markers: MarkerType[];
  routeResult: RouteResult | null;
  zones: Zone[];
  tempZone: { lat: number; lng: number }[];
  isDrawingZone: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onSelectPredefined?: (route: PredefinedRoute) => void;
}

const MapView = ({ markers, routeResult, zones, tempZone, isDrawingZone, onMapClick, onSelectPredefined }: Props) => {
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

    // Manual markers
    markers.forEach((m, i) => {
      L.marker([m.lat, m.lng]).bindPopup(`Punto ${i + 1}`).addTo(group);
    });

    // OSRM route
    if (routeResult) {
      L.marker([routeResult.originCoord.lat, routeResult.originCoord.lng], { icon: originIcon })
        .bindPopup("Origen")
        .addTo(group);
      L.marker([routeResult.destCoord.lat, routeResult.destCoord.lng], { icon: destIcon })
        .bindPopup("Destino")
        .addTo(group);

      const polyline = L.polyline(routeResult.geometry, {
        color: "#06B6D4",
        weight: 4,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);

      if (mapRef.current) {
        mapRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      }
    }

    // Predefined route markers (only when no active route)
    if (!routeResult) {
      predefinedRoutes.forEach((pr) => {
        const midLat = (pr.origen.lat + pr.destino.lat) / 2;
        const midLng = (pr.origen.lng + pr.destino.lng) / 2;
        const marker = L.marker([midLat, midLng], { icon: catalogIcon }).addTo(group);
        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
          <div style="min-width:160px">
            <strong style="font-size:13px">${pr.nombre}</strong>
            <p style="font-size:11px;color:#666;margin:4px 0">${pr.descripcion}</p>
            <button id="btn-${pr.id}" style="margin-top:4px;padding:4px 10px;font-size:11px;background:#06B6D4;color:#fff;border:none;border-radius:4px;cursor:pointer">Mostrar ruta</button>
          </div>
        `;
        marker.bindPopup(popupContent);
        marker.on("popupopen", () => {
          const btn = document.getElementById(`btn-${pr.id}`);
          btn?.addEventListener("click", () => {
            onSelectPredefined?.(pr);
            marker.closePopup();
          });
        });
      });
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
  }, [markers, routeResult, zones, tempZone, isDrawingZone, onSelectPredefined]);

  return <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-lg" />;
};

export default MapView;
