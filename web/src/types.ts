export interface Dataset {
  id: number;
  name: string;
  description: string;
  category: string;
  raw_data_archive: string;
  raw_data_type: string;
  geodata_file: string;
  tile_file: string;
  created: string;
  modified: string;
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
