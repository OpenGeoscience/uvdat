import { MapGeoJSONFeature } from "maplibre-gl";

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
  name?: string;
  description?: string;
  category?: string;
  processing?: boolean;
  layers?: Layer[];
  metadata?: Record<string, any>;
}

export interface Layer {
  id: number;
  copy_id: number;
  name: string;
  dataset: Dataset;
  frames: LayerFrame[];
  metadata: Record<string, any>;
  visible: boolean;
  current_frame: number;
}

export interface LayerFrame {
  id: number;
  name: string;
  index: number;
  layer: Layer;
  vector: VectorData | null;
  raster: RasterData | null;
}

export interface Style {
  visible?: boolean;
  opacity?: number;
  color?: string;
  colormap?: string;
  colormap_range?: number[];
}

export interface VectorData {
  id: number;
  name: string;
  dataset: number;
  geojson_data: string | null;
  source_file: null | number;
  file_size: number;
  metadata: Record<string, any>;
}

export interface RasterData {
  id: number;
  name: string;
  cloud_optimized_geotiff: string | null;
  dataset: number;
  source_file: null | number;
  file_size: number;
  metadata: RasterMetadata;
}

export interface RasterMetadata {
  bandCount: number;
  bands: Record<number, {
    interpretation: string;
    max: number;
    min: number;
    mean: number;
    stdev: number;
  }>;
  bounds: {
    srs: string;
    ll: {x: number; y: number};
    lr: {x: number; y: number};
    ul: {x: number; y: number};
    ur: {x: number; y: number};
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
  };
  sourceBounds: {
    srs: string;
    ll: {x: number; y: number};
    lr: {x: number; y: number};
    ul: {x: number; y: number};
    ur: {x: number; y: number};
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
  };
  dtype: string;
  geospatial: boolean;
  levels: number;
  sourceLevels: number;
  magnification: number | null;
  mm_x: number;
  mm_y: number;
  projection: string | null;
  sizeX: number;
  sizeY: number;
  sourceSizeX: number;
  sourceSizeY: number;
  tileWidth: number;
  tileHeight: number;
  source_filenames: string[];
  uploaded: string;
}

export interface RasterDataValues {
  sourceBounds: {
    xmax: number;
    xmin: number;
    ymax: number;
    ymin: number;
  };
  data: number[][];
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
    analyses: number;
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
  pos: { lng: number; lat: number; };
  feature: MapGeoJSONFeature;
}

export interface MapLibreLayerMetadata {
  layer_id: string;
  layer_copy_id: string;
  frame_id: string;
  multiFrame: boolean;
}

export type MapLibreLayerWithMetadata = MapGeoJSONFeature["layer"] & {
  metadata: MapLibreLayerMetadata;
}

export interface Network {
  id: number;
  name: string;
  dataset: Dataset;
  category: string;
  nodes: number[];
  edges: number[];
  metadata: Record<string, any>;
  vector_data: number;
  selected?: {
    nodes: number[];
    edges: number[];
  },
  deactivated?: {
    nodes: number[];
    edges: number[];
  };
  changes?: {
    deactivate_nodes: number[];
    activate_nodes: number[];
  }
  gcc: number[];
}

export interface NetworkNode {
  id: number;
  name: string;
  network: number;
  metadata: object;
  capacity: number | null;
  location: number[];
  active?: boolean;
}

export interface NetworkEdge {
  id: number;
  name: string;
  network: number;
  metadata: object;
  capacity: number | null;
  line_geometry: object;
  directed: boolean;
  from_node: number;
  to_node: number;
  active: boolean;
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

export interface AnalysisType {
  id: number;
  name: string;
  db_value: string;
  description: string;
  attribution: string;
  input_options: Record<string, any>;
  input_types: Record<string, any>;
  output_types: Record<string, any>;
}

export interface AnalysisResult {
  id: number;
  name: string;
  analysis_type: string;
  project: number;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  status: string;
  error: string;
  created: string;
  completed: string;
}

export interface FloatingPanelConfig {
  id: string;
  label: string;
  visible: boolean;
  closeable: boolean;
  collapsed?: boolean;
  dock: 'left' | 'right';
  order: number;
  position?: { x: number; y: number } | undefined;
  width?: number | undefined;
  height?: number | undefined;
  element?: HTMLElement;
}

export interface FileItem {
  id: number;
  name: string;
  chart?: Chart;
  dataset?: Dataset;
  created: string;
  modified: string;
  file: string;
  file_size: number;
  file_type: string;
  index: number;
  metadata: Record<string, any>;
}
