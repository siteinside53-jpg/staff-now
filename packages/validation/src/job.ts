import { z } from "zod";
import { workerJobRoleSchema } from "./worker";

// -- Create Job ---------------------------------------------------------------

export const createJobSchema = z
  .object({
    title: z
      .string()
      .min(5, "Title must be at least 5 characters")
      .max(200, "Title must be at most 200 characters"),
    description: z
      .string()
      .min(20, "Description must be at least 20 characters")
      .max(5000, "Description must be at most 5000 characters"),
    roles: z
      .array(workerJobRoleSchema)
      .min(1, "At least one role is required"),
    region: z.string().min(1, "Region is required"),
    city: z.string().optional(),
    employmentType: z.enum(["full_time", "part_time", "seasonal"]),
    salaryMin: z.number().positive("Minimum salary must be a positive number"),
    salaryMax: z.number().positive("Maximum salary must be a positive number"),
    salaryType: z.enum(["hourly", "monthly"]),
    housingProvided: z.boolean(),
    mealsProvided: z.boolean(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid ISO date format",
    }),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid ISO date format",
      })
      .optional(),
  })
  .refine((data) => data.salaryMax >= data.salaryMin, {
    message: "Maximum salary must be greater than or equal to minimum salary",
    path: ["salaryMax"],
  });

export type CreateJobInput = z.infer<typeof createJobSchema>;

// -- Update Job ---------------------------------------------------------------

export const updateJobSchema = createJobSchema.innerType().partial();

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

// -- Job Filters --------------------------------------------------------------

export const jobFilterSchema = z.object({
  roles: z.array(workerJobRoleSchema).optional(),
  region: z.string().optional(),
  employmentType: z.enum(["full_time", "part_time", "seasonal"]).optional(),
  minSalary: z.number().positive().optional(),
  maxSalary: z.number().positive().optional(),
  housingProvided: z.boolean().optional(),
  mealsProvided: z.boolean().optional(),
});

export type JobFilter = z.infer<typeof jobFilterSchema>;
