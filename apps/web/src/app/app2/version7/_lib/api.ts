/**
 * v7 just re-uses v6's tested API client.
 */
export {
  API_BASE,
  getToken,
  setToken,
  clearToken,
  ApiError,
  auth,
  workers,
  businesses,
  jobs,
  matches,
  conversations,
  interests,
  notifications,
  stats,
  uploads,
  video,
  type User,
  type Role,
  type AuthResponse,
} from '../../version6/_lib/api';
