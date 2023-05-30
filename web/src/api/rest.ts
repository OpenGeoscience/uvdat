import { apiClient } from "./auth";
import { City } from "@/types";

export async function getCities(): Promise<City[]> {
  return (await apiClient.get("cities")).data.results;
}

export async function getDatasetJSON(datasetId: number): Promise<any> {
  return (await apiClient.get(`datasets/${datasetId}/json`)).data;
}
