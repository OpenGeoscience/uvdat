import { apiClient } from "./auth";
import {
  City,
  Dataset,
  NetworkNode,
  RasterData,
  Chart,
  Simulation,
} from "@/types";

export async function getCities(): Promise<City[]> {
  return (await apiClient.get("cities")).data.results;
}

export async function getCityDatasets(cityId: number): Promise<Dataset[]> {
  return (await apiClient.get(`datasets?city=${cityId}`)).data.results;
}

export async function getCityCharts(cityId: number): Promise<Chart[]> {
  return (await apiClient.get(`charts?city=${cityId}`)).data.results;
}

export async function getCitySimulations(
  cityId: number
): Promise<Simulation[]> {
  return (await apiClient.get(`simulations/available/city/${cityId}`)).data;
}

export async function getDataset(datasetId: number): Promise<Dataset> {
  return (await apiClient.get(`datasets/${datasetId}`)).data;
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
  exclude_nodes: number[]
): Promise<NetworkNode[]> {
  return (
    await apiClient.get(
      `datasets/${datasetId}/gcc?exclude_nodes=${exclude_nodes.toString()}`
    )
  ).data;
}

export async function getRasterData(datasetId: number): Promise<RasterData> {
  const resolution = 0.1;
  const data = (
    await apiClient.get(`datasets/${datasetId}/raster-data/${resolution}`)
  ).data;
  const { sourceBounds } = (
    await apiClient.get(`datasets/${datasetId}/info/metadata`)
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
  cityId: number,
  args: object
) {
  return (
    await apiClient.post(
      `simulations/run/${simulationId}/city/${cityId}/`,
      args
    )
  ).data;
}

export async function getSimulationResults(
  simulationId: number,
  cityId: number
) {
  return (
    await apiClient.get(`simulations/${simulationId}/city/${cityId}/results/`)
  ).data;
}

export async function listDerivedRegions() {
  const res = await apiClient.get("derived_regions/");
  return res.data.results;
}

export async function getDerivedRegion(regionId: number) {
  const res = await apiClient.get(`derived_regions/${regionId}/`);
  return res.data;
}

export async function postDerivedRegion(
  name: string,
  city: number,
  regions: number[],
  op: "union" | "intersection"
) {
  const operation = op.toUpperCase();
  const res = await apiClient.post("derived_regions/", {
    name,
    city,
    operation,
    regions,
  });

  return res.data;
}
