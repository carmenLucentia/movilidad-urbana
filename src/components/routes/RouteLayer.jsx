import L from "leaflet";
import { routeStyles } from "../../utils/routeStyles";

/**
 * Dibuja una ruta en el mapa.
 */
export function renderRouteLayer(
  group,
  map,
  routeResult,
  destText,
  liveUserPosition,
  isRouteActive,
  mode
) {
  // Si no hay grupo, mapa o ruta, no hace nada
  if (!group || !map || !routeResult) return;

  /**
   * Estilo visual de la ruta según el modo seleccionado.
   * borrar en futuro
   */
  const style = routeStyles[mode] || routeStyles.drive;

  // Extrae las coordenadas GeoJSON de la ruta
  const coords = routeResult?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) return;

  //borrar en futuro
  // Convierte [lng, lat] a [lat, lng] para que Leaflet pueda pintarlas
  const latLngCoords = coords.map(([lng, lat]) => [lat, lng]);
}