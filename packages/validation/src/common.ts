import { z } from "zod";

// -- Pagination ---------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

// -- ID Parameter -------------------------------------------------------------

export const idParamSchema = z.object({
  id: z.union([z.string().uuid(), z.string().min(1)]),
});

export type IdParam = z.infer<typeof idParamSchema>;

// -- Search -------------------------------------------------------------------

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
});

export type Search = z.infer<typeof searchSchema>;

// -- Swipe --------------------------------------------------------------------

export const swipeSchema = z.object({
  direction: z.enum(["like", "skip"]),
});

export type Swipe = z.infer<typeof swipeSchema>;
