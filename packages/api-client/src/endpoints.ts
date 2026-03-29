import type { ApiClient } from './client';

type Params = Record<string, string | number | boolean | undefined>;

export class StaffNowApi {
  constructor(private client: ApiClient) {}

  auth = {
    register: (body: { email: string; password: string; confirmPassword: string; role: string; acceptTerms: boolean }) =>
      this.client.post<any>('/auth/register', body),
    login: (body: { email: string; password: string }) =>
      this.client.post<any>('/auth/login', body),
    logout: () => this.client.post<any>('/auth/logout'),
    me: () => this.client.get<any>('/auth/me'),
    forgotPassword: (body: { email: string }) =>
      this.client.post<any>('/auth/forgot-password', body),
    resetPassword: (body: { token: string; password: string; confirmPassword: string }) =>
      this.client.post<any>('/auth/reset-password', body),
  };

  workers = {
    getProfile: () => this.client.get<any>('/workers/me'),
    updateProfile: (body: unknown) => this.client.patch<any>('/workers/me', body),
    discover: (params?: Params) => this.client.get<any>('/workers/discover', params),
    getById: (id: string) => this.client.get<any>(`/workers/${id}`),
    like: (id: string) => this.client.post<any>(`/workers/${id}/like`),
    skip: (id: string) => this.client.post<any>(`/workers/${id}/skip`),
    favorite: (id: string) => this.client.post<any>(`/workers/${id}/favorite`),
    unfavorite: (id: string) => this.client.delete<any>(`/workers/${id}/favorite`),
  };

  businesses = {
    getProfile: () => this.client.get<any>('/businesses/me'),
    updateProfile: (body: unknown) => this.client.patch<any>('/businesses/me', body),
    discover: (params?: Params) => this.client.get<any>('/businesses/discover', params),
    getById: (id: string) => this.client.get<any>(`/businesses/${id}`),
    like: (id: string) => this.client.post<any>(`/businesses/${id}/like`),
    skip: (id: string) => this.client.post<any>(`/businesses/${id}/skip`),
  };

  branches = {
    list: () => this.client.get<any>('/branches'),
    create: (body: unknown) => this.client.post<any>('/branches', body),
    update: (id: string, body: unknown) => this.client.patch<any>(`/branches/${id}`, body),
    delete: (id: string) => this.client.delete<any>(`/branches/${id}`),
  };

  interests = {
    received: () => this.client.get<any>('/interests/received'),
    sent: () => this.client.get<any>('/interests/sent'),
  };

  jobs = {
    list: (params?: Params) => this.client.get<any>('/jobs', params),
    getById: (id: string) => this.client.get<any>(`/jobs/${id}`),
    create: (body: unknown) => this.client.post<any>('/jobs', body),
    update: (id: string, body: unknown) => this.client.patch<any>(`/jobs/${id}`, body),
    publish: (id: string) => this.client.post<any>(`/jobs/${id}/publish`),
    archive: (id: string) => this.client.post<any>(`/jobs/${id}/archive`),
    like: (id: string) => this.client.post<any>(`/jobs/${id}/like`),
    skip: (id: string) => this.client.post<any>(`/jobs/${id}/skip`),
  };

  matches = {
    list: (params?: Params) => this.client.get<any>('/matches', params),
    getById: (id: string) => this.client.get<any>(`/matches/${id}`),
    archive: (id: string) => this.client.post<any>(`/matches/${id}/archive`),
  };

  conversations = {
    list: (params?: Params) => this.client.get<any>('/conversations', params),
    getMessages: (id: string, params?: Params) => this.client.get<any>(`/conversations/${id}/messages`, params),
    sendMessage: (id: string, body: { content: string }) => this.client.post<any>(`/conversations/${id}/messages`, body),
  };

  notifications = {
    list: (params?: Params) => this.client.get<any>('/notifications', params),
    markRead: (id: string) => this.client.post<any>(`/notifications/${id}/read`),
    markAllRead: () => this.client.post<any>('/notifications/read-all'),
  };

  billing = {
    getPlans: () => this.client.get<any>('/billing/plans'),
    createCheckout: (body: { planId: string; interval: 'month' | 'year' }) =>
      this.client.post<any>('/billing/checkout', body),
    getPortalUrl: () => this.client.post<any>('/billing/portal'),
    getSubscription: () => this.client.get<any>('/billing/subscription'),
  };

  uploads = {
    uploadFile: (file: File | Blob) => this.client.upload<any>('/uploads', file),
    getPresignedUrl: (body: { filename: string; contentType: string }) =>
      this.client.post<any>('/uploads/presign', body),
  };

  admin = {
    getStats: () => this.client.get<any>('/admin/stats'),
    getUsers: (params?: Params) => this.client.get<any>('/admin/users', params),
    suspendUser: (id: string) => this.client.post<any>(`/admin/users/${id}/suspend`),
    unsuspendUser: (id: string) => this.client.post<any>(`/admin/users/${id}/unsuspend`),
    getVerificationRequests: (params?: Params) => this.client.get<any>('/admin/verifications', params),
    reviewVerification: (id: string, body: { status: 'approved' | 'rejected'; reason?: string }) =>
      this.client.post<any>(`/admin/verifications/${id}/review`, body),
    getReports: (params?: Params) => this.client.get<any>('/admin/reports', params),
    reviewReport: (id: string, body: { status: 'reviewed' | 'dismissed' }) =>
      this.client.post<any>(`/admin/reports/${id}/review`, body),
  };
}
