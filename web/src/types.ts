import { MapGeoJSONFeature } from "maplibre-gl";

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
  layers: Layer[];
  metadata: Record<string, unknown>;
}

export interface Layer {
  id: number;
  copy_id: number;
  name: string;
  dataset: Dataset;
  frames: LayerFrame[];
  metadata: Record<string, unknown>;
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
  metadata: Record<string, unknown>;
}

export interface RasterData {
  id: number;
  name: string;
  cloud_optimized_geotiff: string | null;
  dataset: number;
  source_file: null | number;
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
  pos: { lng: number; lat: number; };
  feature: MapGeoJSONFeature;
}

export interface Network {
  id: number;
  name: string;
  category: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metadata: Record<string, unknown>;
  vector_data: number;
  deactivated?: {
    nodes: number[];
    edges: number[];
  };
  gcc: number[];
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
    type: string;
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
