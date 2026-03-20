import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Iconos para origen y destino de la ruta calculada
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

const dayOrder = [0, 1, 2, 3, 4, 5, 6];
const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatHour(hour) {
  if (!hour) return "--";

  const [h, m] = hour.split(":");
  return `${parseInt(h, 10)}:${m}`;
}

function timeToMinutes(hour) {
  if (!hour) return 0;
  const [h, m] = hour.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function minutesToHour(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function mergeRanges(ranges) {
  if (!ranges.length) return [];

  const sorted = [...ranges].sort(
    (a, b) => timeToMinutes(a.open_time) - timeToMinutes(b.open_time)
  );

  const merged = [];
  let current = {
    start: timeToMinutes(sorted[0].open_time),
    end: timeToMinutes(sorted[0].close_time),
  };

  for (let i = 1; i < sorted.length; i++) {
    const nextStart = timeToMinutes(sorted[i].open_time);
    const nextEnd = timeToMinutes(sorted[i].close_time);

    if (nextStart <= current.end) {
      current.end = Math.max(current.end, nextEnd);
    } else {
      merged.push({
        start: minutesToHour(current.start),
        end: minutesToHour(current.end),
      });

      current = {
        start: nextStart,
        end: nextEnd,
      };
    }
  }

  merged.push({
    start: minutesToHour(current.start),
    end: minutesToHour(current.end),
  });

  return merged;
}

function formatPlaceHours(hours) {
  if (!hours || hours.length === 0) {
    return "<div>Sin horarios disponibles</div>";
  }

  const grouped = {};

  hours.forEach((h) => {
    const day = h.dow;

    if (h.closed) {
      if (!grouped[day]) grouped[day] = { closed: true, ranges: [] };
      return;
    }

    if (!grouped[day]) {
      grouped[day] = { closed: false, ranges: [] };
    }

    grouped[day].ranges.push({
      open_time: h.open_time,
      close_time: h.close_time,
    });
  });

  const orderedDays = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

  return orderedDays
    .map((day) => {
      const dayLabel = dayNames[day] ?? `Día ${day}`;
      const info = grouped[day];

      if (info.closed || info.ranges.length === 0) {
        return `<div><strong>${dayLabel}:</strong> Cerrado</div>`;
      }

      const mergedRanges = mergeRanges(info.ranges);

      const text = mergedRanges
        .map((r) => `${formatHour(r.start)} - ${formatHour(r.end)}`)
        .join(", ");

      return `<div><strong>${dayLabel}:</strong> ${text}</div>`;
    })
    .join("");
}

// Componente principal del mapa
const MapView = ({
  markers,
  places,
  routeResult,
  zones,
  tempZone,
  isDrawingZone,
  onMapClick,
  onLoadPlaceHours,
}) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layersRef = useRef(L.layerGroup());

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (e) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);

    return () => {
      map.off("click", handler);
    };
  }, [onMapClick]);

  useEffect(() => {
    const group = layersRef.current;
    group.clearLayers();

    // Marcadores creados manualmente por el usuario
    markers.forEach((marker, index) => {
      L.marker([marker.lat, marker.lng])
        .bindPopup(`Punto ${index + 1}`)
        .addTo(group);
    });

    // Lugares cargados desde backend
    places?.forEach((place) => {
  const marker = L.marker([place.lat, place.lon]).addTo(group);

  marker.bindPopup(`
    <div>
      <strong>${place.name || "Lugar"}</strong><br/>
      ${place.category || ""}<br/>
      <span style="color:#666;">Cargando horarios...</span>
    </div>
  `);

  // Abrir popup y cargar horarios al mismo tiempo
   marker.on("popupopen", async () => {
    const hours = await onLoadPlaceHours?.(place.place_id);
    const hoursHtml = formatPlaceHours(hours);

    marker.setPopupContent(`
      <div>
        <strong>${place.name || "Lugar"}</strong><br/>
        ${place.category || ""}<br/><br/>
        <strong>Horarios:</strong>
        ${hoursHtml}
      </div>
    `);
  });
});

    // Ruta calculada
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

    // Zonas guardadas
    zones.forEach((zone) => {
      L.polygon(
        zone.points.map((point) => [point.lat, point.lng]),
        {
          color: "#0B1B3A",
          fillColor: "#06B6D4",
          fillOpacity: 0.2,
          weight: 2,
        }
      ).addTo(group);
    });

    // Zona temporal mientras se está dibujando
    if (isDrawingZone && tempZone.length > 0) {
      L.polygon(
        tempZone.map((point) => [point.lat, point.lng]),
        {
          color: "#06B6D4",
          fillColor: "#06B6D4",
          fillOpacity: 0.1,
          weight: 2,
          dashArray: "6 4",
        }
      ).addTo(group);
    }
}, [markers, places, routeResult, zones, tempZone, isDrawingZone, onLoadPlaceHours]);

  return <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-lg" />;
};

export default MapView;