import { z } from "zod";

// -- Enums --------------------------------------------------------------------

export const businessTypeSchema = z.enum([
  "hotel",
  "restaurant",
  "beach_bar",
  "cafe",
  "villa",
  "tourism_company",
  "bar",
  "resort",
  "cruise",
  "other",
]);

export type BusinessType = z.infer<typeof businessTypeSchema>;

// -- Phone regex: Greek (+30) or international format -------------------------

const phoneRegex =
  /^(\+?\d{1,4}[-.\s]?)?\(?\d{1,5}\)?[-.\s]?\d{1,5}[-.\s]?\d{1,9}$/;

// -- Create Business Profile --------------------------------------------------

export const createBusinessProfileSchema = z
  .object({
    companyName: z
      .string()
      .min(2, "Company name must be at least 2 characters")
      .max(200, "Company name must be at most 200 characters"),
    businessType: businessTypeSchema,
    region: z.string().min(1, "Region is required"),
    address: z.string().optional(),
    phone: z.string().regex(phoneRegex, "Invalid phone number format"),
    website: z.string().url("Invalid URL format").optional(),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description must be at most 2000 characters"),
    staffHousing: z.boolean(),
    mealsProvided: z.boolean(),
    transportationAssistance: z.boolean(),
    salaryRangeMin: z.number().positive("Minimum salary must be a positive number"),
    salaryRangeMax: z.number().positive("Maximum salary must be a positive number"),
  })
  .refine((data) => data.salaryRangeMax >= data.salaryRangeMin, {
    message: "Maximum salary must be greater than or equal to minimum salary",
    path: ["salaryRangeMax"],
  });

export type CreateBusinessProfileInput = z.infer<typeof createBusinessProfileSchema>;

// -- Update Business Profile --------------------------------------------------

export const updateBusinessProfileSchema = createBusinessProfileSchema
  .innerType()
  .partial();

export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
