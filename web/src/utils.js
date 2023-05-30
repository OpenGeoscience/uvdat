import geojsonvt from "geojson-vt";
import VectorTileSource from "ol/source/VectorTile.js";
import GeoJSON from "ol/format/GeoJSON.js";
import Projection from "ol/proj/Projection.js";

// https://openlayers.org/en/latest/examples/geojson-vt.html

// Converts geojson-vt data to GeoJSON
export const replacer = function (key, value) {
  if (!value || !value.geometry) {
    return value;
  }

  let type;
  const rawType = value.type;
  let geometry = value.geometry;
  if (rawType === 1) {
    type = "MultiPoint";
    if (geometry.length == 1) {
      type = "Point";
      geometry = geometry[0];
    }
  } else if (rawType === 2) {
    type = "MultiLineString";
    if (geometry.length == 1) {
      type = "LineString";
      geometry = geometry[0];
    }
  } else if (rawType === 3) {
    type = "Polygon";
    if (geometry.length > 1) {
      type = "MultiPolygon";
      geometry = [geometry];
    }
  }

  return {
    type: "Feature",
    geometry: {
      type: type,
      coordinates: geometry,
    },
    properties: value.tags,
  };
};

export const createVectorSourceFromGeoJSON = (data, map) => {
  const tileIndex = geojsonvt(data);
  const vectorSource = new VectorTileSource({
    tileUrlFunction: function (tileCoord) {
      // Use the tile coordinate as a pseudo URL for caching purposes
      return JSON.stringify(tileCoord);
    },
    tileLoadFunction: function (tile, url) {
      const tileCoord = JSON.parse(url);
      const tileData = tileIndex.getTile(
        tileCoord[0],
        tileCoord[1],
        tileCoord[2]
      );
      if (tileData) {
        const geojson = JSON.stringify(
          {
            type: "FeatureCollection",
            features: tileData ? tileData.features : [],
          },
          replacer
        );
        const format = new GeoJSON({
          dataProjection: new Projection({
            code: "TILE_PIXELS",
            units: "tile-pixels",
            extent: [0, 0, 4096, 4096],
          }),
        });
        const features = format.readFeatures(geojson, {
          extent: vectorSource.getTileGrid().getTileCoordExtent(tileCoord),
          featureProjection: map.getView().getProjection(),
        });
        tile.setFeatures(features);
      }
    },
  });
  return vectorSource;
};
