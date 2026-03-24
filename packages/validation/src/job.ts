import { z } from "zod";
import { workerJobRoleSchema } from "./worker";

// -- Create Job ---------------------------------------------------------------

export const createJobSchema = z.object({
  title: z
    .string()
    .min(3, "Ο τίτλος πρέπει να έχει τουλάχιστον 3 χαρακτήρες")
    .max(200, "Ο τίτλος δεν μπορεί να υπερβαίνει τους 200 χαρακτήρες"),
  description: z
    .string()
    .min(10, "Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες")
    .max(5000, "Η περιγραφή δεν μπορεί να υπερβαίνει τους 5000 χαρακτήρες"),
  roles: z.array(workerJobRoleSchema).optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  employment_type: z.enum(["full_time", "part_time", "seasonal", "freelancer"]).optional(),
  employmentType: z.enum(["full_time", "part_time", "seasonal", "freelancer"]).optional(),
  salary_min: z.number().positive().optional().nullable(),
  salary_max: z.number().positive().optional().nullable(),
  salaryMin: z.number().positive().optional().nullable(),
  salaryMax: z.number().positive().optional().nullable(),
  salaryType: z.enum(["hourly", "monthly"]).optional(),
  housingProvided: z.boolean().optional(),
  housing_provided: z.boolean().optional(),
  mealsProvided: z.boolean().optional(),
  meals_provided: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

// -- Update Job ---------------------------------------------------------------

export const updateJobSchema = createJobSchema.partial();

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
