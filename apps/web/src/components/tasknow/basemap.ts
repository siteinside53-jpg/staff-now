/**
 * Το υπόβαθρο του χάρτη — η «κλασική» εμφάνιση που έχουν οι περισσότερες
 * πλατφόρμες (καθαροί δρόμοι, απαλά χρώματα, ονόματα οδών), όπως στο Google Maps.
 *
 * ΑΠΟ ΠΟΥ: OpenFreeMap (openfreemap.org), στυλ «Liberty». Δωρεάν για κάθε
 * χρήση, χωρίς κλειδί, χωρίς λογαριασμό, χωρίς όριο — γι' αυτό διαλέχτηκε αντί
 * για CARTO/Mapbox που ζητούν κλειδί (η CARTO τύπωνε «API KEY REQUIRED» πάνω
 * στον χάρτη). Είναι διανυσματικός χάρτης (MapLibre) μέσα στο Leaflet, οπότε οι
 * πινέζες, η ομαδοποίηση και όλα τα υπόλοιπα μένουν ακριβώς όπως ήταν.
 *
 * ΕΦΕΔΡΕΙΑ: αν η συσκευή δεν έχει WebGL ή δεν φορτώσει το στυλ (π.χ. πέσει η
 * υπηρεσία), μπαίνουν αυτόματα τα απλά πλακίδια του OpenStreetMap. Ο χάρτης
 * δεν μένει ποτέ λευκός.
 */
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_ATTRIBUTION, MAP_STYLE_URL, MAP_TILE_ATTRIBUTION, MAP_TILE_MAX_ZOOM, MAP_TILE_URL } from './data';

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export type BasemapKind = 'vector' | 'raster';

/** Βάζει το υπόβαθρο στον χάρτη. Γυρίζει τι μπήκε τελικά (για διάγνωση). */
export async function addBasemap(L: any, map: any): Promise<BasemapKind> {
  const raster = () => {
    // Η ομαδοποίηση πινεζών (markercluster) θέλει ρητό maxZoom στον χάρτη.
    map.setMaxZoom(MAP_TILE_MAX_ZOOM);
    return L.tileLayer(MAP_TILE_URL, { attribution: MAP_TILE_ATTRIBUTION, maxZoom: MAP_TILE_MAX_ZOOM }).addTo(map);
  };

  if (!webglAvailable()) {
    raster();
    return 'raster';
  }

  try {
    // Φορτώνεται μόνο εδώ, την ώρα που χρειάζεται — όχι σε κάθε σελίδα.
    await import('@maplibre/maplibre-gl-leaflet');
    const layer = L.maplibreGL({ style: MAP_STYLE_URL, attribution: MAP_STYLE_ATTRIBUTION });
    // Ο διανυσματικός χάρτης μεγεθύνει καθαρά και πιο κοντά από τα πλακίδια.
    map.setMaxZoom(20);
    layer.addTo(map);

    const gl = layer.getMaplibreMap?.();
    if (gl && typeof gl.on === 'function') {
      let styleLoaded = false;
      let fellBack = false;
      gl.once('style.load', () => {
        styleLoaded = true;
      });
      // Σφάλμα ΠΡΙΝ φορτώσει το στυλ = δεν ήρθε ο χάρτης → εφεδρεία. Σφάλμα σε
      // ένα μεμονωμένο πλακίδιο αργότερα δεν αξίζει αλλαγή υποβάθρου.
      gl.on('error', () => {
        if (styleLoaded || fellBack) return;
        fellBack = true;
        try {
          map.removeLayer(layer);
        } catch {
          /* ήδη εκτός χάρτη */
        }
        raster();
      });
    }
    return 'vector';
  } catch {
    raster();
    return 'raster';
  }
}
