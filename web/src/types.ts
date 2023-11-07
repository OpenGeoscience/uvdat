export interface Dataset {
  id: number;
  name: string;
  description: string;
  category: string;
  created: string;
  modified: string;
  processing: boolean;
  metadata: object;
  dataset_type: string;
  map_layers: {
    id: number;
    index: number;
    type: string;
  }[];
  current_layer_index: number;
  classification: "Network" | "Region" | "Other";
  network: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
}

export interface SourceRegion {
  id: number;
  name?: string;
  dataset_id?: number;
  metadata?: object;
  boundary?: object;
}

export interface DerivedRegion {
  id: number;
  name: string;
  context: number;
  metadata: object;
  boundary: object;
  source_regions: number[];
  operation: "UNION" | "INTERSECTION";
  map_layers: {
    id: number;
    index: number;
    type: string;
  }[];
  current_layer_index: null;
}

export interface Context {
  id: number;
  name: string;
  default_map_center: number[];
  default_map_zoom: number;
  datasets: Dataset[];
  created: string;
  modified: string;
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

export interface NetworkNode {
  id: number;
  name: string;
  dataset: number;
  metadata: object;
  capacity: number | null;
  location: number[];
}

export interface NetworkEdge {
  id: number;
  name: string;
  dataset: number;
  metadata: object;
  capacity: number | null;
  line_geopmetry: object;
  directed: boolean;
  from_node: number;
  to_node: number;
}

export interface RasterMapLayer {
  id: number;
  file_item?: {
    id: number;
    name: string;
  };
  metadata?: {
    network?: boolean;
  };
  default_style?: object;
  index: number;
  cloud_optimized_geotiff?: string;
  type: string;
  dataset_id?: number;
  derived_region_id?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openlayer?: any;
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

export interface VectorMapLayer {
  id: number;
  file_item?: {
    id: number;
    name: string;
  };
  metadata?: {
    network?: boolean;
  };
  default_style?: object;
  index: number;
  tile_coords?: {
    x: number;
    y: number;
    z: number;
  }[];
  type: string;
  dataset_id?: number;
  derived_region_id?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openlayer?: any;
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
  context: number;
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
  context: number;
  input_args: object;
  output_data: {
    node_failures: [];
    node_recoveries: [];
  };
  error_message: string;
  created: string;
  modified: string;
}
