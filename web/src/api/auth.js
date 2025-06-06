import axios from "axios";
import OauthClient from "@resonant/oauth-client";
import { useAppStore, useMapStore, useProjectStore } from "@/store";

export const baseURL = `${process.env.VUE_APP_API_ROOT}api/v1/`;

export const apiClient = axios.create({
  baseURL,
});
export const oauthClient = new OauthClient(
  new URL(process.env.VUE_APP_OAUTH_API_ROOT),
  process.env.VUE_APP_OAUTH_CLIENT_ID,
  { redirectUrl: window.location.origin }
);

export async function restoreLogin() {
  if (!oauthClient) {
    return;
  }
  await oauthClient.maybeRestoreLogin();
  if (oauthClient.isLoggedIn) {
    apiClient.get("/users/me").then((response) => {
      if (response.data) {
        useAppStore().currentUser = response.data;
      }
    });
  }
}

apiClient.interceptors.request.use((config) => ({
  ...config,
  headers: {
    ...oauthClient?.authHeaders,
    ...config.headers,
  },
}));

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const appStore = useAppStore();
    if (error.response?.status === 500) {
      appStore.currentError = "Server error; see server logs for details.";
    } else if (error.response?.status === 404) {
      appStore.currentError = "Not found.";
    } else if (error.response?.status === 401) {
      appStore.currentError = "Not authenticated.";
    } else if (error.response) {
      appStore.currentError = error.response?.data;
    } else {
      appStore.currentError = "An error occurred.";
    }
    return { data: undefined };
  }
);

export const logout = async () => {
  await oauthClient.logout();

  useAppStore().currentUser = undefined;

  useProjectStore().currentProject = undefined;
  useProjectStore().clearState();
  
  useMapStore().setMapCenter();
};
