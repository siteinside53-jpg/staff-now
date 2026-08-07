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
    changePassword: (body: { currentPassword: string; password: string; confirmPassword: string }) =>
      this.client.post<any>('/auth/change-password', body),
    deleteAccount: () => this.client.delete<any>('/auth/me'),
    sendEmailCode: () => this.client.post<any>('/auth/email/send-code'),
    confirmEmail: (body: { code: string }) => this.client.post<any>('/auth/email/confirm', body),
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
    deleteCvFile: () => this.client.delete<any>('/workers/me/cv/file'),
    saveCvAsPdf: () => this.client.post<{ url: string; key: string }>('/workers/me/cv/save-as-pdf'),
    getVerification: () => this.client.get<any>('/workers/me/verification'),
    submitVerification: (body: unknown) => this.client.post<any>('/workers/me/verify', body),
    getBoostStatus: () => this.client.get<any>('/workers/boost/status'),
    boostDiscover: () => this.client.post<any>('/workers/boost/discover'),
  };

  businesses = {
    getProfile: () => this.client.get<any>('/businesses/me'),
    updateProfile: (body: unknown) => this.client.patch<any>('/businesses/me', body),
    discover: (params?: Params) => this.client.get<any>('/businesses/discover', params),
    getById: (id: string) => this.client.get<any>(`/businesses/${id}`),
    like: (id: string) => this.client.post<any>(`/businesses/${id}/like`),
    skip: (id: string) => this.client.post<any>(`/businesses/${id}/skip`),
    getVerification: () => this.client.get<any>('/businesses/me/verification'),
    submitVerification: (body: unknown) => this.client.post<any>('/businesses/me/verify', body),
  };

  branches = {
    list: () => this.client.get<any>('/branches'),
    create: (body: unknown) => this.client.post<any>('/branches', body),
    update: (id: string, body: unknown) => this.client.patch<any>(`/branches/${id}`, body),
    delete: (id: string) => this.client.delete<any>(`/branches/${id}`),
  };

  interests = {
    received: () => this.client.get<any>('/interests/received'),
    likeBack: (swiperId: string) => this.client.post<any>(`/interests/like-back/${swiperId}`),
    sent: () => this.client.get<any>('/interests/sent'),
  };

  jobs = {
    list: (params?: Params) => this.client.get<any>('/jobs', params),
    getById: (id: string) => this.client.get<any>(`/jobs/${id}`),
    create: (body: unknown) => this.client.post<any>('/jobs', body),
    update: (id: string, body: unknown) => this.client.patch<any>(`/jobs/${id}`, body),
    publish: (id: string) => this.client.post<any>(`/jobs/${id}/publish`),
    pause: (id: string) => this.client.post<any>(`/jobs/${id}/pause`),
    resume: (id: string) => this.client.post<any>(`/jobs/${id}/resume`),
    archive: (id: string) => this.client.post<any>(`/jobs/${id}/archive`),
    /** «Καλύφθηκε» — η θέση γέμισε και βγαίνει από την Εύρεση. */
    fill: (id: string) => this.client.post<any>(`/jobs/${id}/fill`),
    /** Ξανανοίγει καλυμμένη αγγελία. */
    reopen: (id: string) => this.client.post<any>(`/jobs/${id}/reopen`),
    boost: (id: string) => this.client.post<any>(`/jobs/${id}/boost`),
    delete: (id: string) => this.client.delete<any>(`/jobs/${id}`),
    like: (id: string) => this.client.post<any>(`/jobs/${id}/like`),
    skip: (id: string) => this.client.post<any>(`/jobs/${id}/skip`),
    favorite: (id: string) => this.client.post<any>(`/jobs/${id}/favorite`),
    unfavorite: (id: string) => this.client.delete<any>(`/jobs/${id}/favorite`),
    favorites: () => this.client.get<any>('/jobs/favorites/list'),
  };

  /**
   * Πρόσληψη σε 4 βήματα:
   * 1) η επιχείρηση δηλώνει (`create`), 2) ο εργαζόμενος επιβεβαιώνει
   * (`confirm`), 3) κλείνει η αγγελία, 4) μετά από 15 μέρες αξιολογούν και οι
   * δύο (`rate`) — ο καθένας βλέπει την αξιολόγηση του άλλου μόνο αφού γράψει
   * τη δική του (το ελέγχει ο server, όχι η οθόνη).
   */
  hires = {
    list: (params?: Params) => this.client.get<any>('/hires', params),
    create: (body: { conversationId: string; jobId?: string }) =>
      this.client.post<any>('/hires', body),
    confirm: (id: string) => this.client.post<any>(`/hires/${id}/confirm`),
    decline: (id: string) => this.client.post<any>(`/hires/${id}/decline`),
    cancel: (id: string) => this.client.delete<any>(`/hires/${id}`),
    getRating: (id: string) => this.client.get<any>(`/hires/${id}/rating`),
    rate: (
      id: string,
      body: {
        overall: number;
        score_a?: number;
        score_b?: number;
        score_c?: number;
        comment?: string;
      },
    ) => this.client.post<any>(`/hires/${id}/rating`, body),
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
    createCheckout: (body: {
      planId: string;
      period?: 'monthly' | 'yearly';
      successUrl: string;
      cancelUrl: string;
      documentType?: 'invoice' | 'receipt';
    }) => this.client.post<any>('/billing/checkout', body),
    getPortalUrl: (returnUrl?: string) =>
      this.client.post<any>('/billing/portal', { returnUrl: returnUrl || '' }),
    getSubscription: () => this.client.get<any>('/billing/subscription'),
    /** Full billing snapshot: subscription + plan + payments + invoices + profile. */
    getMe: () => this.client.get<any>('/billing/me'),
    getProfile: () => this.client.get<any>('/billing/profile'),
    updateProfile: (body: {
      documentType: 'invoice' | 'receipt';
      legalName?: string;
      vatNumber?: string;
      doy?: string;
      address?: string;
      postalCode?: string;
      city?: string;
      country?: string;
      phone?: string;
      email?: string;
      notes?: string;
    }) => this.client.put<any>('/billing/profile', body),
    cancel: () => this.client.post<any>('/billing/cancel'),
    createManualTransfer: (body: {
      planId: string;
      period?: 'monthly' | 'yearly';
      documentType?: 'invoice' | 'receipt';
    }) => this.client.post<any>('/billing/manual-transfer', body),
    getManualTransfer: (id: string) =>
      this.client.get<any>(`/billing/manual-transfer/${id}`),
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
    // Ο server περιμένει { decision }, όχι { status } (admin.ts POST /verifications/:id/review).
    reviewVerification: (id: string, body: { decision: 'approved' | 'rejected'; reason?: string }) =>
      this.client.post<any>(`/admin/verifications/${id}/review`, body),
    getReports: (params?: Params) => this.client.get<any>('/admin/reports', params),
    reviewReport: (id: string, body: { status: 'reviewed' | 'dismissed' }) =>
      this.client.post<any>(`/admin/reports/${id}/review`, body),
  };
}
