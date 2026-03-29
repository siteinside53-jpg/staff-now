import { z } from "zod";

// -- Enums --------------------------------------------------------------------

export const workerJobRoleSchema = z.enum([
  "waiter",
  "barista",
  "chef",
  "maid",
  "receptionist",
  "bartender",
  "cleaner",
  "kitchen_assistant",
  "lifeguard",
  "tour_guide",
  "driver",
  "host",
  "sommelier",
  "dj",
  "animator",
  "technician",
  "other",
]);

export type WorkerJobRole = z.infer<typeof workerJobRoleSchema>;

export const availabilitySchema = z.enum([
  "immediate",
  "within_7_days",
  "seasonal",
  "part_time",
  "full_time",
]);

export const employmentTypeSchema = z.enum([
  "seasonal",
  "full_time",
  "part_time",
  "freelancer",
]);

export type Availability = z.infer<typeof availabilitySchema>;

// -- Create Worker Profile ----------------------------------------------------

export const createWorkerProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),
  city: z
    .string()
    .min(2, "City must be at least 2 characters")
    .max(100, "City must be at most 100 characters"),
  region: z
    .string()
    .min(2, "Region must be at least 2 characters")
    .max(100, "Region must be at most 100 characters"),
  willingToRelocate: z.boolean(),
  jobRoles: z
    .array(workerJobRoleSchema)
    .min(1, "At least one job role is required")
    .max(5, "At most 5 job roles allowed"),
  yearsOfExperience: z
    .number()
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience must be at most 50"),
  languages: z.array(z.string()).min(1, "At least one language is required"),
  expectedHourlyRate: z
    .number()
    .positive("Hourly rate must be a positive number")
    .optional(),
  expectedMonthlySalary: z
    .number()
    .positive("Monthly salary must be a positive number")
    .optional(),
  availability: availabilitySchema,
  bio: z.string().max(1000, "Bio must be at most 1000 characters").optional(),
});

export type CreateWorkerProfileInput = z.infer<typeof createWorkerProfileSchema>;

// -- Update Worker Profile ----------------------------------------------------

export const updateWorkerProfileSchema = createWorkerProfileSchema.partial().extend({
  roles: z.array(workerJobRoleSchema).max(5).optional(),
  languages: z.array(z.string()).optional(),
  employmentType: employmentTypeSchema.optional(),
  isVisible: z.boolean().optional(),
  compensationType: z.enum(['hourly', 'monthly']).optional(),
  photoUrl: z.string().optional(),
  cvUrl: z.string().optional(),
});

export type UpdateWorkerProfileInput = z.infer<typeof updateWorkerProfileSchema>;

// -- Worker Filters -----------------------------------------------------------

export const workerFilterSchema = z.object({
  roles: z.array(workerJobRoleSchema).optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  availability: availabilitySchema.optional(),
  minSalary: z.number().positive().optional(),
  maxSalary: z.number().positive().optional(),
  willingToRelocate: z.boolean().optional(),
  verifiedOnly: z.boolean().optional(),
});

export type WorkerFilter = z.infer<typeof workerFilterSchema>;
