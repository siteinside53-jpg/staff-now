import { z } from "zod";
import { workerJobRoleSchema } from "./worker";

// -- Base Job fields (used for both create and update) -----------------------

const jobBaseSchema = z.object({
  // Section 1: Βασικά Στοιχεία
  title: z
    .string()
    .min(3, "Ο τίτλος πρέπει να έχει τουλάχιστον 3 χαρακτήρες")
    .max(200, "Ο τίτλος δεν μπορεί να υπερβαίνει τους 200 χαρακτήρες"),
  description: z
    .string()
    .max(300, "Η περιγραφή δεν μπορεί να υπερβαίνει τους 300 χαρακτήρες")
    .optional()
    .default(''),

  // Section 2: Τοποθεσία
  city: z.string().optional(),
  region: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  requires_relocation: z.boolean().optional().default(false),

  // Section 3: Τύπος Εργασίας
  employment_type: z.enum(["full_time", "part_time", "seasonal"]).optional(),
  employmentType: z.enum(["full_time", "part_time", "seasonal"]).optional(),

  // Section 4: Μισθός
  salary_type: z.enum(["hourly", "monthly", "daily"]).optional(),
  salaryType: z.enum(["hourly", "monthly", "daily"]).optional(),
  salary_min: z.number().positive().optional().nullable(),
  salary_max: z.number().positive().optional().nullable(),
  salaryMin: z.number().positive().optional().nullable(),
  salaryMax: z.number().positive().optional().nullable(),
  salary_gross: z.boolean().optional().default(true),

  // Section 5: Παροχές
  housing_provided: z.boolean().optional().default(false),
  housingProvided: z.boolean().optional(),
  meals_provided: z.boolean().optional().default(false),
  mealsProvided: z.boolean().optional(),
  transport_provided: z.boolean().optional().default(false),
  bonus_provided: z.boolean().optional().default(false),
  insurance_provided: z.boolean().optional().default(false),
  no_benefits: z.boolean().optional().default(false),

  // Section 6: Ωράριο Εργασίας
  hours_per_day: z.number().min(1).max(24).optional().nullable(),
  days_per_week: z.number().min(1).max(7).optional().nullable(),
  has_day_off: z.boolean().optional().default(false),
  day_off_description: z.string().max(200).optional(),
  shift_type: z.enum(["morning", "evening", "split", "flexible"]).optional().nullable(),

  // Section 7: Διάρκεια
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  // Section 8: Απαιτήσεις
  experience_required: z.enum(["none", "1_2_years", "3_plus_years"]).optional().nullable(),
  requires_drivers_license: z.boolean().optional().default(false),
  requires_physical_fitness: z.boolean().optional().default(false),
  requires_communication_skills: z.boolean().optional().default(false),

  // Section 9: Γλώσσες
  languages: z.array(z.string()).optional(),

  // Section 10: Ειδικότητες
  roles: z.array(workerJobRoleSchema).optional(),

  // Section 11: Έκτακτη βάρδια
  // Το shift_start_utc είναι παράγωγο (υπολογίζεται server-side) και ποτέ δεν
  // δέχεται τιμή από τον client — γι' αυτό δεν υπάρχει εδώ.
  listing_kind: z.enum(["job", "shift"]).optional().default("job"),
  shift_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Μη έγκυρη ημερομηνία βάρδιας")
    .optional(),
  shift_days: z.number().int().min(1).max(14).optional(),
  shift_start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Μη έγκυρη ώρα έναρξης")
    .optional(),
  shift_end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Μη έγκυρη ώρα λήξης")
    .optional(),
  shift_positions: z.number().int().min(1).max(20).optional(),

  // Meta
  branch_id: z.string().optional(),
});

// -- Create Job ---------------------------------------------------------------

// Ο μισθός είναι υποχρεωτικός για πλήρη διαφάνεια — δεν επιτρέπεται "συζητήσιμος".
export const createJobSchema = jobBaseSchema.superRefine((data, ctx) => {
  const salaryType = data.salary_type ?? data.salaryType;
  const salaryMin = data.salary_min ?? data.salaryMin;
  const isShift = data.listing_kind === "shift";

  if (isShift) {
    // Η βάρδια πληρώνεται πάντα ημερησίως.
    if (salaryType && salaryType !== "daily") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salary_type"],
        message: "Η έκτακτη βάρδια πληρώνεται ανά βάρδια (ημερήσια αμοιβή)",
      });
    }
  } else if (!salaryType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salary_type"],
      message: "Ο τύπος μισθού είναι υποχρεωτικός",
    });
  }

  if (salaryMin == null || salaryMin <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salary_min"],
      message: isShift
        ? "Η αμοιβή της βάρδιας είναι υποχρεωτική"
        : "Ο μισθός είναι υποχρεωτικός — δεν επιτρέπεται συζητήσιμος μισθός",
    });
  }

  if (!isShift) return;

  const required = [
    ["shift_date", data.shift_date, "Η ημερομηνία της βάρδιας είναι υποχρεωτική"],
    ["shift_start_time", data.shift_start_time, "Η ώρα έναρξης είναι υποχρεωτική"],
    ["shift_end_time", data.shift_end_time, "Η ώρα λήξης είναι υποχρεωτική"],
  ] as const;
  for (const [path, value, message] of required) {
    if (!value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    }
  }

  if (data.hours_per_day == null || data.hours_per_day <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["hours_per_day"],
      message: "Η διάρκεια της βάρδιας είναι υποχρεωτική",
    });
  }

  if (!data.roles || data.roles.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roles"],
      message: "Επίλεξε τουλάχιστον μία ειδικότητα",
    });
  }
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

// -- Update Job ---------------------------------------------------------------

export const updateJobSchema = jobBaseSchema.partial();

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
