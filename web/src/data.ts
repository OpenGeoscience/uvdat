import { Dataset, DerivedRegion } from "./types";

interface MapDataSourceArgs {
  dataset?: Dataset;
  derivedRegion?: DerivedRegion;
}

const UnexpectedMapDataSourceError = new Error(
  "Unexpected map data source type"
);

// A unified representation of any data source (datasets, derived regions, etc.)
export class MapDataSource {
  dataset?: Dataset;
  derivedRegion?: DerivedRegion;

  constructor(args: MapDataSourceArgs) {
    this.dataset = args.dataset;
    this.derivedRegion = args.derivedRegion;
  }

  getUid() {
    if (this.dataset) {
      return `dataset-${this.dataset.id}`;
    }
    if (this.derivedRegion) {
      return `dr-${this.derivedRegion.id}`;
    }

    throw UnexpectedMapDataSourceError;
  }

  getName() {
    const name = this.dataset?.name || this.derivedRegion?.name;
    if (name === undefined) {
      throw UnexpectedMapDataSourceError;
    }

    return name;
  }
}
