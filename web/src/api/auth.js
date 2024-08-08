import axios from "axios";
import OauthClient from "@girder/oauth-client";
import { currentError, currentUser, currentProject } from "@/store";
import { clearState, clearMap } from "@/storeFunctions";

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
        currentUser.value = response.data;
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
    if (error.response?.status === 500) {
      currentError.value = "Server error; see server logs for details.";
    } else if (error.response?.status === 404) {
      currentError.value = "Not found.";
    } else if (error.response?.status === 401) {
      currentError.value = "Not authenticated.";
    } else if (error.response) {
      currentError.value = error.response?.data;
    } else {
      currentError.value = "An error occurred.";
    }
    return { data: undefined };
  }
);

export const logout = async () => {
  await oauthClient.logout();
  currentUser.value = undefined;
  currentProject.value = undefined;
  clearState();
  clearMap();
};
