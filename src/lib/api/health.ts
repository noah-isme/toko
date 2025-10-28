import { apiClient } from "./apiClient";
import { healthSchema } from "./schemas";

export const getHealthStatus = () => apiClient.get("health", healthSchema);
