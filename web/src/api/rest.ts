import { apiClient } from "./auth";
import { City, Dataset } from "@/types";

export async function getCities(): Promise<City[]> {
  return (await apiClient.get("cities")).data.results;
}

export async function getDataset(datasetId: number): Promise<Dataset> {
  return (await apiClient.get(`datasets/${datasetId}`)).data;
}

export async function convertDataset(datasetId: number): Promise<Dataset> {
  return (await apiClient.get(`datasets/${datasetId}/convert`)).data;
}
