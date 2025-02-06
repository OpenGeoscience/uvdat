import {
  getNetworkGCC,
  getProjectCharts,
  getRasterDataValues,
} from "@/api/rest";
import {
  currentProject,
  deactivatedNodes,
  currentNetworkGCC,
  availableCharts,
  currentChart,
  currentNetworkDataset,
  rasterTooltipDataCache,
} from "@/store";
import { Dataset, RasterData } from "./types";

export async function cacheRasterData(raster: RasterData) {
  if (rasterTooltipDataCache.value[raster.id] !== undefined) {
    return;
  }

  const data = await getRasterDataValues(raster.id);
  rasterTooltipDataCache.value[raster.id] = data;
}

export function deactivatedNodesUpdated() {
  if (!(currentProject.value && currentNetworkDataset.value)) {
    return;
  }

  currentNetworkGCC.value = undefined;
  getNetworkGCC(
    currentNetworkDataset.value.id,
    currentProject.value.id,
    deactivatedNodes.value
  ).then((gcc) => {
    if (!currentProject.value) {
      return;
    }
    currentNetworkGCC.value = gcc;

    // if (currentNetworkDatasetLayer.value) {
    //   styleNetworkVectorTileLayer(currentNetworkDatasetLayer.value);
    // }

    // update chart
    getProjectCharts(currentProject.value.id).then((charts) => {
      availableCharts.value = charts;
      if (currentChart.value) {
        currentChart.value = charts.find(
          (c) => c.id === currentChart.value?.id
        );
      }
    });
  });
}

export function fetchDatasetNetwork(dataset: Dataset) {
  // TODO: rewrite this
  // getDatasetNetwork(dataset.id).then((data) => {
  //   // TODO: Handle datasets with multiple networks
  //   const network = data[0];

  //   // Assign this network data to its dataset
  //   // Do this by mapping to ensure the change is propogated
  //   availableDatasets.value = availableDatasets.value?.map((d) => {
  //     if (d.id === dataset.id) {
  //       d.network = network;
  //     }

  //     return d;
  //   });

  //   // Set the dataset currently performing network operations on
  //   currentNetworkDataset.value = availableDatasets.value?.find(
  //     (d) => d.id === dataset.id
  //   );
  // });
}

export function toggleNodeActive(
  nodeId: number,
  dataset: Dataset,
) {
  console.log('toggle node', nodeId, 'in dataset', dataset)
  // TODO: rewrite this
  // if (!dataset || !datasetLayer || !isDatasetLayerVisible(datasetLayer)) {
  //   return;
  // }

  // if (!dataset.network) {
  //   fetchDatasetNetwork(dataset);
  // }

  // currentNetworkDataset.value = dataset as Dataset;
  // currentNetworkDatasetLayer.value = datasetLayer as VectorDatasetLayer;
  if (deactivatedNodes.value.includes(nodeId)) {
    deactivatedNodes.value = deactivatedNodes.value.filter((v) => v !== nodeId);
  } else {
    deactivatedNodes.value = [...deactivatedNodes.value, nodeId];
  }
  // deactivatedNodesUpdated();
}
