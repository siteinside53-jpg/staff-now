// -- Auth Schemas -------------------------------------------------------------
export {
  emailSchema,
  passwordSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth";

export type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./auth";

// -- Worker Schemas -----------------------------------------------------------
export {
  workerJobRoleSchema,
  availabilitySchema,
  createWorkerProfileSchema,
  updateWorkerProfileSchema,
  workerFilterSchema,
} from "./worker";

export type {
  WorkerJobRole,
  Availability,
  CreateWorkerProfileInput,
  UpdateWorkerProfileInput,
  WorkerFilter,
} from "./worker";

// -- Business Schemas ---------------------------------------------------------
export {
  businessTypeSchema,
  createBusinessProfileSchema,
  updateBusinessProfileSchema,
} from "./business";

export type {
  BusinessType,
  CreateBusinessProfileInput,
  UpdateBusinessProfileInput,
} from "./business";

// -- Job Schemas --------------------------------------------------------------
export {
  createJobSchema,
  updateJobSchema,
  jobFilterSchema,
} from "./job";

export type { CreateJobInput, UpdateJobInput, JobFilter } from "./job";

// -- Messaging Schemas --------------------------------------------------------
export { sendMessageSchema, createConversationSchema } from "./messaging";

export type {
  SendMessageInput,
  CreateConversationInput,
} from "./messaging";

// -- Common Schemas -----------------------------------------------------------
export {
  paginationSchema,
  idParamSchema,
  searchSchema,
  swipeSchema,
} from "./common";

export type { Pagination, IdParam, Search, Swipe } from "./common";
