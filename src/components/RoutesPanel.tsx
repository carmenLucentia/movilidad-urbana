import { useState } from "react";
import { haversine } from "@/utils/haversine";
import type { Marker } from "./MarkersPanel";

export interface Route {
  origin: number;
  destination: number;
  distance: number;
  time: number;
}

interface Props {
  markers: Marker[];
  route: Route | null;
  onCalculate: (route: Route) => void;
}

const RoutesPanel = ({ markers, route, onCalculate }: Props) => {
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [error, setError] = useState("");

  const calculate = () => {
    if (!origin || !destination) {
      setError("Selecciona origen y destino");
      return;
    }
    setError("");
    const o = markers[parseInt(origin)];
    const d = markers[parseInt(destination)];
    const dist = haversine(o.lat, o.lng, d.lat, d.lng);
    const time = (dist / 30) * 60;
    onCalculate({
      origin: parseInt(origin),
      destination: parseInt(destination),
      distance: Math.round(dist * 100) / 100,
      time: Math.round(time * 10) / 10,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Rutas</h3>

      <select
        value={origin}
        onChange={(e) => setOrigin(e.target.value)}
        className="h-[40px] rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-accent transition-all duration-150"
      >
        <option value="">Selecciona origen</option>
        {markers.map((_, i) => (
          <option key={i} value={i}>Punto {i + 1}</option>
        ))}
      </select>

      <select
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        className="h-[40px] rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-accent transition-all duration-150"
      >
        <option value="">Selecciona destino</option>
        {markers.map((_, i) => (
          <option key={i} value={i}>Punto {i + 1}</option>
        ))}
      </select>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={calculate}
        className="h-[40px] rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity duration-150"
      >
        Calcular ruta
      </button>

      {route && (
        <div className="bg-secondary rounded-md p-3 flex flex-col gap-1 text-xs">
          <span className="text-foreground font-medium">Distancia: {route.distance} km</span>
          <span className="text-foreground font-medium">Tiempo estimado: {route.time} min</span>
        </div>
      )}
    </div>
  );
};

export default RoutesPanel;
