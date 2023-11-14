import { apiClient } from "./auth";
import {
  Context,
  Dataset,
  NetworkNode,
  RasterData,
  Chart,
  SimulationType,
  DerivedRegion,
  VectorMapLayer,
  RasterMapLayer,
  AbstractMapLayer,
} from "@/types";

export async function getContexts(): Promise<Context[]> {
  return (await apiClient.get("contexts")).data.results;
}

export async function getContextDatasets(
  contextId: number
): Promise<Dataset[]> {
  return (await apiClient.get(`datasets?context=${contextId}`)).data.results;
}

export async function getContextCharts(contextId: number): Promise<Chart[]> {
  return (await apiClient.get(`charts?context=${contextId}`)).data.results;
}

export async function getContextDerivedRegions(
  contextId: number
): Promise<DerivedRegion[]> {
  return (await apiClient.get(`derived-regions?context=${contextId}`)).data
    .results;
}

export async function getContextSimulationTypes(
  contextId: number
): Promise<SimulationType[]> {
  return (await apiClient.get(`simulations/available/context/${contextId}`))
    .data;
}

export async function getDataset(datasetId: number): Promise<Dataset> {
  return (await apiClient.get(`datasets/${datasetId}`)).data;
}

export async function getDatasetMapLayers(
  datasetId: number
): Promise<AbstractMapLayer[]> {
  return (await apiClient.get(`datasets/${datasetId}/map_layers`)).data;
}

export async function convertDataset(datasetId: number): Promise<Dataset> {
  return (await apiClient.get(`datasets/${datasetId}/convert`)).data;
}

export async function getDatasetNetwork(
  datasetId: number
): Promise<NetworkNode[]> {
  return (await apiClient.get(`datasets/${datasetId}/network`)).data;
}

export async function getNetworkGCC(
  datasetId: number,
  contextId: number,
  exclude_nodes: number[]
): Promise<NetworkNode[]> {
  return (
    await apiClient.get(
      `datasets/${datasetId}/gcc?context=${contextId}&exclude_nodes=${exclude_nodes.toString()}`
    )
  ).data;
}

export async function getMapLayer(
  mapLayerId: number,
  mapLayerType: string
): Promise<VectorMapLayer | RasterMapLayer> {
  return (await apiClient.get(`${mapLayerType}s/${mapLayerId}`)).data;
}

export async function getRasterData(layerId: number): Promise<RasterData> {
  const resolution = 0.1;
  const data = (
    await apiClient.get(`rasters/${layerId}/raster-data/${resolution}`)
  ).data;
  const { sourceBounds } = (
    await apiClient.get(`rasters/${layerId}/info/metadata`)
  ).data;
  return {
    data,
    sourceBounds,
  };
}

export async function clearChart(chartId: number) {
  await apiClient.post(`charts/${chartId}/clear/`);
}

export async function runSimulation(
  simulationId: number,
  contextId: number,
  args: object
) {
  return (
    await apiClient.post(
      `simulations/run/${simulationId}/context/${contextId}/`,
      args
    )
  ).data;
}

export async function getSimulationResults(
  simulationId: number,
  contextId: number
) {
  return (
    await apiClient.get(
      `simulations/${simulationId}/context/${contextId}/results/`
    )
  ).data;
}

export async function getDerivedRegion(regionId: number) {
  const res = await apiClient.get(`derived-regions/${regionId}/`);
  return res.data;
}

export async function postDerivedRegion(
  name: string,
  context: number,
  regions: number[],
  op: "union" | "intersection" | undefined
) {
  if (!op) return;
  const operation = op.toUpperCase();
  const res = await apiClient.post("derived-regions/", {
    name,
    context,
    operation,
    regions,
  });

  return res.data;
}
