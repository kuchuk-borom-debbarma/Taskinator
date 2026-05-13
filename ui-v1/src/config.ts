/**
 * Application configuration extracted from environment variables.
 * Values are prefixed with VITE_ as per Vite conventions.
 */

export const CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/graphql',
  
  PAGINATION: {
    DASHBOARD_TEAMS: Number(import.meta.env.VITE_PAGINATION_DASHBOARD_TEAMS) || 5,
    DASHBOARD_TASKS: Number(import.meta.env.VITE_PAGINATION_DASHBOARD_TASKS) || 10,
    TASKS_LIST: Number(import.meta.env.VITE_PAGINATION_TASKS_LIST) || 12,
    PROJECTS_LIST: Number(import.meta.env.VITE_PAGINATION_PROJECTS_LIST) || 9,
    MEMBERS_LIST: Number(import.meta.env.VITE_PAGINATION_MEMBERS_LIST) || 15,
  },

  CACHE: {
    DEFAULT_STALE_TIME: Number(import.meta.env.VITE_DEFAULT_STALE_TIME) || 180000,
    PROJECT_METADATA_STALE_TIME: Number(import.meta.env.VITE_PROJECT_METADATA_STALE_TIME) || 1800000,
  },
} as const;
