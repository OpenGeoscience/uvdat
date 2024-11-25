import { LngLatLike, Map, MapGeoJSONFeature } from "maplibre-gl";

export interface Network {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
}

export interface Dataset {
  id: number;
  name: string;
  description: string;
  category: string;
  processing: boolean;
  metadata: Record<string, unknown>;
  dataset_type: "VECTOR" | "RASTER";
  map_layers?: (VectorDatasetLayer | RasterDatasetLayer)[];
  current_layer_index?: number;
  network?: Network;
}

export interface SourceRegion {
  id: number;
  name?: string;
  dataset_id?: number;
  metadata?: object;
  boundary?: object;
}

export interface Project {
  id: number;
  name: string;
  default_map_center: [number, number];
  default_map_zoom: number;
  datasets: Dataset[];
  created: string;
  modified: string;
  owner: User;
  collaborators: User[];
  followers: User[];
  item_counts: {
    datasets: number;
    regions: number;
    charts: number;
    simulations: number;
  };
}

export interface ProjectPatch {
  name?: string;
  datasets?: number[];
  default_map_center?: number[];
  default_map_zoom?: number;
}

export interface ProjectPermissions {
  owner_id: number;
  collaborator_ids: number[];
  follower_ids: number[];
}

export interface Feature {
  type: string;
  geometry: {
    [key: string]: string | object;
  };
  properties: {
    [key: string]: string | object;
  };
}

export interface ClickedFeatureData {
  pos: LngLatLike;
  feature: MapGeoJSONFeature;
}

export interface RasterTooltipData {
  pos: LngLatLike;
  text: string;
}

export interface NetworkNode {
  id: number;
  name: string;
  network: number;
  metadata: object;
  capacity: number | null;
  location: number[];
}

export interface NetworkEdge {
  id: number;
  name: string;
  network: number;
  metadata: object;
  capacity: number | null;
  line_geopmetry: object;
  directed: boolean;
  from_node: number;
  to_node: number;
}

export interface DefaultStyle {
  // Both
  palette?: string;

  // Raster
  data_range?: [number, number];
  transparency_threshold?: number;
  trim_distribution_percentage?: number;

  // Vector
  color_delimiter?: string;
  color_property?: string;
  outline?: string;
}

export interface DatasetLayerMetadata {
  network?: boolean;
  [key: string]: unknown;
}

export interface AbstractDatasetLayer {
  id: number;
  name: string;
  file_item?: {
    id: number;
    name: string;
  };
  metadata: DatasetLayerMetadata;
  // default_style: Record<string, unknown> | DefaultStyle;
  default_style: DefaultStyle;
  index: number;
  dataset_id?: number;
  dataset_category: string;
}

export function isNonNullObject(obj: unknown): obj is object {
  return typeof obj === "object" && obj !== null;
}

export interface RasterDatasetLayer extends AbstractDatasetLayer {
  cloud_optimized_geotiff: string;
  type: "raster";
}

export function isRasterDatasetLayer(obj: unknown): obj is RasterDatasetLayer {
  return isNonNullObject(obj) && "type" in obj && obj.type === "raster";
}

export interface RasterData {
  sourceBounds: {
    xmax: number;
    xmin: number;
    ymax: number;
    ymin: number;
  };
  data: number[][];
}

export interface VectorDatasetLayer extends AbstractDatasetLayer {
  type: "vector";
}

export function isVectorDatasetLayer(obj: unknown): obj is VectorDatasetLayer {
  return isNonNullObject(obj) && "type" in obj && obj.type === "vector";
}

export type StyleLayer = NonNullable<ReturnType<Map["getLayer"]>>;
export interface UserLayer extends StyleLayer {
  metadata: {
    id: number;
    type: "vector" | "raster";
  };
}

export function isUserLayer(layer: StyleLayer): layer is UserLayer {
  return (
    isNonNullObject(layer.metadata) &&
    "id" in layer.metadata &&
    layer.metadata.id !== undefined
  );
}

export interface VectorTile {
  id: number;
  map_layer: number;
  geojson_data: object;
  x: number;
  y: number;
  z: number;
}

export interface Chart {
  id: number;
  name: string;
  description: string;
  project: number;
  metadata: object;
  chart_data: {
    labels: string[];
    datasets: {
      data: number[];
    }[];
  };
  chart_options: {
    chart_title: string;
    x_title: string;
    y_title: string;
    x_range: number[];
    y_range: number[];
  };
  editable: boolean;
}

export interface ChartOptions {
  plugins: {
    title?: object;
  };
  scales: {
    x?: {
      min?: number;
      max?: number;
      title?: {
        display?: boolean;
        text: string;
      };
    };
    y?: {
      min?: number;
      max?: number;
      title?: {
        display?: boolean;
        text: string;
      };
    };
  };
}

export interface SimulationType {
  id: number;
  name: string;
  description: string;
  output_type: string;
  args: {
    name: string;
    options: {
      id: number;
      name: string;
    }[];
  }[];
}

export interface SimulationResult {
  id: number;
  name: string;
  simulation_type: string;
  project: number;
  input_args: object;
  output_data: {
    node_failures: [];
    node_recoveries: [];
    datasets: Dataset[];
    dataset_ids: number[];
  };
  error_message: string;
  created: string;
  modified: string;
}
