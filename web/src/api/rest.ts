import { apiClient } from "./auth";
import {
  Project,
  Dataset,
  NetworkNode,
  RasterData,
  Chart,
  SimulationType,
  DerivedRegion,
  VectorDatasetLayer,
  RasterDatasetLayer,
  Network,
} from "@/types";

export async function getProjects(): Promise<Project[]> {
  return (await apiClient.get("projects")).data.results;
}

export async function createProject(
  name: string,
  default_map_center: number[],
  default_map_zoom: number
): Promise<Project> {
  return (
    await apiClient.post("projects/", {
      name,
      default_map_center,
      default_map_zoom,
    })
  ).data;
}

export async function patchProject(
  projectId: number,
  data: object
): Promise<Project> {
  return await apiClient.patch(`projects/${projectId}/`, data);
}

export async function deleteProject(projectId: number): Promise<Project> {
  return await apiClient.delete(`projects/${projectId}/`).data;
}

export async function getProjectDatasets(
  projectId: number
): Promise<Dataset[]> {
  return (await apiClient.get(`datasets?project=${projectId}`)).data.results;
}

export async function getProjectCharts(projectId: number): Promise<Chart[]> {
  return (await apiClient.get(`charts?project=${projectId}`)).data.results;
}

export async function getProjectDerivedRegions(
  projectId: number
): Promise<DerivedRegion[]> {
  return (await apiClient.get(`derived-regions?project=${projectId}`)).data
    .results;
}

export async function getProjectSimulationTypes(
  projectId: number
): Promise<SimulationType[]> {
  return (await apiClient.get(`simulations/available/project/${projectId}`))
    .data;
}

export async function getDataset(datasetId: number): Promise<Dataset> {
  return (await apiClient.get(`datasets/${datasetId}`)).data;
}

export async function getDatasetLayers(
  datasetId: number
): Promise<(VectorDatasetLayer | RasterDatasetLayer)[]> {
  const layers: (VectorDatasetLayer | RasterDatasetLayer)[] = (
    await apiClient.get(`datasets/${datasetId}/map_layers`)
  ).data;

  // Ensure they're returned in the correct order
  return layers.toSorted((a, b) => a.index - b.index);
}

export async function convertDataset(datasetId: number): Promise<Dataset> {
  return (await apiClient.get(`datasets/${datasetId}/convert`)).data;
}

export async function getDatasetNetwork(datasetId: number): Promise<Network[]> {
  return (await apiClient.get(`datasets/${datasetId}/network`)).data;
}

export async function getNetworkGCC(
  datasetId: number,
  projectId: number,
  exclude_nodes: number[]
): Promise<NetworkNode[]> {
  return (
    await apiClient.get(
      `datasets/${datasetId}/gcc?project=${projectId}&exclude_nodes=${exclude_nodes.toString()}`
    )
  ).data;
}

export async function getDatasetLayer(
  datasetLayerId: number,
  datasetLayerType: string
): Promise<VectorDatasetLayer | RasterDatasetLayer> {
  return (await apiClient.get(`${datasetLayerType}s/${datasetLayerId}`)).data;
}

export async function getRasterData(layerId: number): Promise<RasterData> {
  const resolution = 0.1;
  const data = (
    await apiClient.get(`rasters/${layerId}/raster-data/${resolution}`)
  ).data;
  const { bounds } = (await apiClient.get(`rasters/${layerId}/info/metadata`))
    .data;
  return {
    data,
    sourceBounds: bounds,
  };
}

export async function clearChart(chartId: number) {
  await apiClient.post(`charts/${chartId}/clear/`);
}

export async function runSimulation(
  simulationId: number,
  projectId: number,
  args: object
) {
  return (
    await apiClient.post(
      `simulations/run/${simulationId}/project/${projectId}/`,
      args
    )
  ).data;
}

export async function getSimulationResults(
  simulationId: number,
  projectId: number
) {
  return (
    await apiClient.get(
      `simulations/${simulationId}/project/${projectId}/results/`
    )
  ).data;
}

export async function getDerivedRegion(regionId: number) {
  const res = await apiClient.get(`derived-regions/${regionId}/`);
  return res.data;
}

export async function postDerivedRegion(
  name: string,
  project: number,
  regions: number[],
  op: "union" | "intersection" | undefined
) {
  if (!op) return;
  const operation = op.toUpperCase();
  const res = await apiClient.post("derived-regions/", {
    name,
    project,
    operation,
    regions,
  });

  return res.data;
}
