import { useState, useEffect, useCallback } from "react";
import { getAuthUser, loadJSON, saveJSON } from "@/utils/storage";
import { toast } from "sonner";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import RoutesPanel from "@/components/RoutesPanel";
import ZonesPanel from "@/components/ZonesPanel";
import { Save } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useUserLocation } from "@/hooks/useUserLocation";
import AccessDenied from "@/pages/AccessDenied";

const HomePage = () => {
  const authUser = getAuthUser();
  const { fetchApi } = useApi();

  const [canAccessMap, setCanAccessMap] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);

  const [places, setPlaces] = useState([]);
  const [apiError, setApiError] = useState("");
  const [routeResult, setRouteResult] = useState(null);
  const [routeOriginLabel, setRouteOriginLabel] = useState("");
  const [routeDestLabel, setRouteDestLabel] = useState("");
  const [routeMode, setRouteMode] = useState("car");
  const [departureTime, setDepartureTime] = useState("");
  const [zones, setZones] = useState([]);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [tempZone, setTempZone] = useState([]);
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [isUserLocation, setIsUserLocation] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  const markersKey = `markers:${authUser}`;
  const [markers, setMarkers] = useState(() => loadJSON(markersKey, []));
  const [previewOriginRequest, setPreviewOriginRequest] = useState(null);
  const {
    position: liveUserPosition,
    start: startLocation,
    stop: stopLocation,
  } = useUserLocation();

  // Comprbar el acceso desde el back
  useEffect(() => {
  async function checkAccess() {
    try {
      const data = await fetchApi("/me/access", {}, true);
      setCanAccessMap(data.mapAccess);
    } catch (error) {
      console.error("Error comprobando acceso:", error);
      setCanAccessMap(false);
    } finally {
      setAccessLoading(false);
    }
  }

  checkAccess();
}, [fetchApi]);

  // Carga de lugares desde el backend
  useEffect(() => {
    async function cargarPlaces() {
      try {
        const data = await fetchApi("/places", {}, true);
        setPlaces(data);
        setApiError("");
      } catch (err) {
        setApiError(err.message || "Error al cargar lugares");
      }
    }

    if (canAccessMap) {
      cargarPlaces();
    }
  }, [fetchApi, canAccessMap]);

  useEffect(() => {
    if (!canAccessMap) return;

    const selRouteKey = `selectedRoute:${authUser}`;
    const selZoneKey = `selectedZone:${authUser}`;
    const selRoute = loadJSON(selRouteKey, null);
    const selZone = loadJSON(selZoneKey, null);

    if (selRoute) {
      setRouteResult({
        originCoord: { lat: selRoute.origen.lat, lng: selRoute.origen.lng },
        destCoord: { lat: selRoute.destino.lat, lng: selRoute.destino.lng },
        geometry: selRoute.geometry,
        distance: selRoute.distanciaKm,
        duration: selRoute.duracionMin,
      });
      setRouteOriginLabel(selRoute.origen.label);
      setRouteDestLabel(selRoute.destino.label);
      localStorage.removeItem(selRouteKey);
    }

    if (selZone) {
      setZones([{ points: selZone.points }]);
      localStorage.removeItem(selZoneKey);
    }
  }, [authUser, canAccessMap]);

  useEffect(() => {
    if (!canAccessMap) return;
    saveJSON(markersKey, markers);
  }, [markers, markersKey, canAccessMap]);

  // Manejo de clicks en el mapa para agregar marcadores o puntos de zona
  const handleMapClick = useCallback(
    async (lat, lng) => {
      if (isDrawingZone) {
        setTempZone((prev) => [...prev, { lat, lng }]);
      } else {
        const point = {lat, lng};
        setMarkers([point]);
        
        
        const pointInfo = await getPointInfo(lat, lng);
        setSelectedPoint(pointInfo);
      }
    },
    [isDrawingZone]
  );

  // Centra el mapa en el origen de la ruta para mostrar la vista previa
  const handlePreviewRoute = () => {
    if (!routeResult?.originCoord) return;

    setPreviewOriginRequest({
      lat: routeResult.originCoord.lat,
      lng: routeResult.originCoord.lng,
      zoom: 15,
      ts: Date.now(),
    });
  };

  // Limpia la ruta actual, el marcador de vista previa y resetea los estados relacionados
  const handleClearRoute = () => {
    setRouteResult(null);
    setRouteOriginLabel("");
    setRouteDestLabel("");
    setRouteMode("car");
    setDepartureTime("");
    setIsUserLocation(false);
    setPreviewOriginRequest(null);
    setIsRouteActive(false); // por seguridad, limpia también el estado de ruta activa
  };

  //muestra los horarios de un lugar
  const getPlaceHours = async (placeId) => {
  try {
    const data = await fetchApi(`/places/${placeId}/hours`, {}, true);
    console.log("placeId:", placeId);
    console.log("hours:", data);
    return data;
  } catch (error) {
    console.error("Error al cargar horarios:", error);
    return [];
  }
};

const getPointInfo = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
    );

    const data = await res.json();
    const address = data.address || {};

    const name =
      data.name ||
      address.road ||
      address.neighbourhood ||
      address.suburb ||
      address.city ||
      "Ubicación seleccionada";

    const postalCode = address.postcode || "";
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      "";

    const province = address.state_district || address.state || "";

    const addressText = [postalCode, city, province].filter(Boolean).join(" ");

    return {
      lat,
      lng,
      name,
      address: addressText || data.display_name || "Dirección no disponible",
    };
  } catch (error) {
    console.error("Error al obtener información del punto:", error);

    return {
      lat,
      lng,
      name: "Ubicación seleccionada",
      address: "Dirección no disponible",
    };
  }
};

  const closeZone = () => {
    if (tempZone.length >= 3) {
      const defaultName = `Zona ${zones.length + 1}`;
      const name = prompt("Nombre de la zona:", defaultName) || defaultName;

      const savedZone = {
        id: crypto.randomUUID(),
        nombre: name,
        points: tempZone,
        fechaISO: new Date().toISOString(),
      };

      const zonesKey = `zonas:${authUser}`;
      const existing = loadJSON(zonesKey, []);
      saveJSON(zonesKey, [...existing, savedZone]);

      setZones((prev) => [...prev, { points: tempZone }]);
      toast.success("Zona guardada");
    }

    setTempZone([]);
    setIsDrawingZone(false);
  };
 
  // Maneja resultado de cálculo de ruta desde el panel
  const handleRouteCalculated = (result, originLabel, destLabel, mode, depTime, userLocation) => {
    setRouteResult(result);
    setRouteOriginLabel(originLabel);
    setRouteDestLabel(destLabel);
    setRouteMode(mode);
    setDepartureTime(depTime);
    setIsUserLocation(userLocation);
  };

  const saveRoute = () => {
    if (!routeResult) return;

    let llegadaHora;

    if (departureTime && routeResult.duration > 0) {
      const [h, m] = departureTime.split(":").map(Number);
      const total = h * 60 + m + routeResult.duration;
      const ah = Math.floor(total / 60) % 24;
      const am = total % 60;
      llegadaHora = `${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`;
    }
    // Crea objeto de ruta guardada y la almacena en localStorage
    const saved = {
      id: crypto.randomUUID(),
      origen: {
        label: routeOriginLabel,
        lat: routeResult.originCoord.lat,
        lng: routeResult.originCoord.lng,
      },
      destino: {
        label: routeDestLabel,
        lat: routeResult.destCoord.lat,
        lng: routeResult.destCoord.lng,
      },
      modo: routeMode,
      distanciaKm: routeResult.distance,
      duracionMin: routeResult.duration,
      salidaHora: departureTime || undefined,
      llegadaHora,
      geometry: routeResult.geometry,
      fechaISO: new Date().toISOString(),
    };

    const key = `rutas:${authUser}`;
    const existing = loadJSON(key, []);
    saveJSON(key, [...existing, saved]);
    toast.success("Ruta guardada");
  };
  
  const startLiveRoute = () => {
  startLocation();
  setIsRouteActive(true);
};

const stopLiveRoute = () => {
  stopLocation();
  
  setIsRouteActive(false);
  setRouteResult(null);
  setRouteOriginLabel("");
  setRouteDestLabel("");
  setRouteMode("car");
  setDepartureTime("");
  setIsUserLocation(false);
  toast.info("Ruta finalizada");
};

  if (accessLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Comprobando acceso...</p>
    </div>
  );
}

  if (!canAccessMap) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div
        className="px-6 py-6"
        style={{
          background:
            "linear-gradient(180deg, hsl(218 70% 14% / 0.06) 0%, transparent 100%)",
        }}
      >
        <h2 className="text-xl font-bold text-foreground">Visualiza rutas y zonas urbanas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecciona una ubicación, calcula rutas y define zonas directamente sobre el mapa.
        </p>
      </div>

      <div className="px-6 pb-2">
        {apiError && <p className="text-sm text-red-500">Error backend: {apiError}</p>}
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden relative">
        <aside className="w-[360px] shrink-0 bg-card border border-border rounded-lg p-5 flex flex-col gap-6 overflow-y-auto shadow-[var(--shadow-card)]">
        
          <RoutesPanel
            routeResult={routeResult}
            onCalculate={handleRouteCalculated}
            isRouteActive={isRouteActive}
            onStartRoute={startLiveRoute}
            onStopRoute={stopLiveRoute}
            onPreviewRoute={handlePreviewRoute}
            onClearRoute={handleClearRoute}
          />

          {routeResult && !isRouteActive && (
            <button
              onClick={saveRoute}
              className="h-[44px] rounded-md bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar ruta
            </button>
          )}

          <div className="h-px bg-border" />

          <ZonesPanel
            zones={zones}
            isDrawing={isDrawingZone}
            tempZone={tempZone}
            onStartDrawing={() => {
              setIsDrawingZone(true);
              setTempZone([]);
            }}
            onCloseZone={closeZone}
            onCancel={() => {
              setIsDrawingZone(false);
              setTempZone([]);
            }}
            onRemoveZone={(i) => setZones((prev) => prev.filter((_, idx) => idx !== i))}
          />
        </aside>

        <div className="flex-1 bg-card border border-border rounded-lg shadow-[var(--shadow-card)] overflow-hidden relative">
          <MapView
            markers={markers}
            places={places}   
            routeResult={routeResult}
            originText={routeOriginLabel}
            destText={routeDestLabel}
            isUserLocation={isUserLocation}
            liveUserPosition={liveUserPosition}
            isRouteActive={isRouteActive}
            routeMode={routeMode}       
            zones={zones}
            tempZone={tempZone}
            isDrawingZone={isDrawingZone}
            onMapClick={handleMapClick}
            onLoadPlaceHours={getPlaceHours}
            previewOriginRequest={previewOriginRequest}
          />
        
       {selectedPoint && !routeResult &&(
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[60%] max-w-md bg-card border border-border rounded-xl shadow-lg p-4 flex items-center justify-between z-[100]">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {selectedPoint.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedPoint.address}
              </span>
              <span className="text-xs text-azul mt-1">
                {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedPoint(null);
                setMarkers([]);
              }}
              className="ml-a text-base text-muted-foreground hover:text-destructive transition-colors"
            >
              ✕
            </button>
          </div>
        )} 
      </div>
    </div>
  </div>
  );
};

export default HomePage;