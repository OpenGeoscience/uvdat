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

export async function getCityCharts(cityId: number): Promise<Chart[]> {
  return (await apiClient.get(`charts?city=${cityId}`)).data.results;
}

export async function getCitySimulations(
  cityId: number
): Promise<Simulation[]> {
  return (await apiClient.get(`simulations/available/?city=${cityId}`)).data;
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
  await apiClient.get(`charts/${chartId}/clear/`);
}
