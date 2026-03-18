import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Route as RouteIcon, Search, MapPin, Eye, ArrowLeft, Trash2 } from "lucide-react";
import { saveJSON, loadJSON, getAuthUser } from "@/utils/storage";
import { toast } from "sonner";

const RoutesListPage = () => {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const [search, setSearch] = useState("");
  const [routes, setRoutes] = useState(() => loadJSON(`rutas:${authUser}`, []));

  const filtered = useMemo(() => {
    return routes.filter((route) => {
      if (!search) return true;

      const q = search.toLowerCase();

      return (
        route.origen?.label?.toLowerCase().includes(q) ||
        route.destino?.label?.toLowerCase().includes(q) ||
        route.modo?.toLowerCase().includes(q)
      );
    });
  }, [routes, search]);

  const viewOnMap = (route) => {
    saveJSON(`selectedRoute:${authUser}`, route);
    navigate("/mapa");
  };

  const deleteRoute = (routeId) => {
    const updatedRoutes = routes.filter((route) => route.id !== routeId);
    setRoutes(updatedRoutes);
    saveJSON(`rutas:${authUser}`, updatedRoutes);
    toast.success("Ruta eliminada");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <button
          onClick={() => navigate("/mapa")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al mapa
        </button>

        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
          <RouteIcon className="w-5 h-5 text-accent" />
          Rutas guardadas
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          Consulta las rutas que has guardado y vuelve a visualizarlas en el mapa.
        </p>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por origen, destino o modo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-accent transition-all"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <RouteIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {routes.length === 0
                ? "Todavía no has guardado ninguna ruta."
                : "No se encontraron rutas con esa búsqueda."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((route) => (
              <div
                key={route.id}
                className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow"
              >
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {route.origen?.label?.split(",")[0] || "Origen"} → {route.destino?.label?.split(",")[0] || "Destino"}
                  </h3>

                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {route.modo || "Sin modo"} · {route.fechaISO ? new Date(route.fechaISO).toLocaleDateString() : "Sin fecha"}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p>
                    <strong>Origen:</strong> {route.origen?.label || "No disponible"}
                  </p>
                  <p>
                    <strong>Destino:</strong> {route.destino?.label || "No disponible"}
                  </p>
                  <p>
                    <strong>Distancia:</strong> {route.distanciaKm ?? "-"} km
                  </p>
                  <p>
                    <strong>Duración:</strong> {route.duracionMin ?? "-"} min
                  </p>
                  {route.salidaHora && (
                    <p>
                      <strong>Salida:</strong> {route.salidaHora}
                    </p>
                  )}
                  {route.llegadaHora && (
                    <p>
                      <strong>Llegada:</strong> {route.llegadaHora}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border gap-2">
                  <button
                    onClick={() => viewOnMap(route)}
                    className="h-8 px-3 rounded-md bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver en mapa
                  </button>

                  <button
                    onClick={() => deleteRoute(route.id)}
                    className="h-8 px-3 rounded-md bg-red-500/10 text-red-500 text-xs font-medium hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutesListPage;