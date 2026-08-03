import { z } from "zod";

// -- Primitives ---------------------------------------------------------------

export const emailSchema = z
  .string()
  .email("Μη έγκυρη διεύθυνση email")
  .max(255, "Το email δεν μπορεί να υπερβαίνει τους 255 χαρακτήρες")
  .trim()
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες")
  .max(128, "Ο κωδικός δεν μπορεί να υπερβαίνει τους 128 χαρακτήρες")
  .refine((val) => /[A-Z]/.test(val), {
    message: "Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα κεφαλαίο γράμμα",
  })
  .refine((val) => /[a-z]/.test(val), {
    message: "Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα πεζό γράμμα",
  })
  .refine((val) => /[0-9]/.test(val), {
    message: "Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα ψηφίο",
  });

// Simple password schema for login (no complexity check)
const loginPasswordSchema = z
  .string()
  .min(1, "Εισάγετε τον κωδικό σας");

// -- Register -----------------------------------------------------------------

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["worker", "business"]),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Πρέπει να αποδεχτείτε τους Όρους Χρήσης" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Οι κωδικοί δεν ταιριάζουν",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// -- Login --------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

// -- Forgot Password ----------------------------------------------------------

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// -- Reset Password -----------------------------------------------------------

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Το token είναι απαραίτητο"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Οι κωδικοί δεν ταιριάζουν",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// -- Change Password ----------------------------------------------------------
// Αλλαγή κωδικού από συνδεδεμένο χρήστη (Ρυθμίσεις). Διαφέρει από το reset:
// εδώ δεν υπάρχει token από email, αλλά ζητάμε τον τρέχοντα κωδικό ως απόδειξη
// ότι όντως ο κάτοχος του λογαριασμού κάθεται μπροστά στην οθόνη.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Εισάγετε τον τρέχοντα κωδικό σας"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Οι κωδικοί δεν ταιριάζουν",
    path: ["confirmPassword"],
  })
  .refine((data) => data.password !== data.currentPassword, {
    message: "Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τρέχοντα",
    path: ["password"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
