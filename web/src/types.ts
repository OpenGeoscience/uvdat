export interface Dataset {
  id: number;
  name: string;
  description: string;
  category: string;
  raw_data_archive: string;
  raw_data_type: string;
  geodata_file: string;
  vector_tiles_file: string;
  raster_file: string;
  created: string;
  modified: string;
  style: object;
  processing: boolean;
}

export interface City {
  id: number;
  name: string;
  center: number[];
  default_zoom: number;
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
  location: number[];
  name: string;
  properties: object;
  dataset: number;
  adjacent_nodes: number[];
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

export interface Chart {
  name: string;
  city: number;
  description: string;
  category: string;
  raw_data_file: string;
  raw_data_type: string;
  style: object;
  clearable: boolean;
  chart_data: {
    labels: string[];
    datasets: object[];
  };
}

export interface Simulation {
  id: number;
  name: string;
  description: string;
  output_type: string;
  args: {
    name: string;
    options: object[];
  }[];
}
