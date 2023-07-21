import { apiClient } from "./auth";
import { City, Dataset, NetworkNode } from "@/types";

export async function getCities(): Promise<City[]> {
  return (await apiClient.get("cities")).data.results;
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
