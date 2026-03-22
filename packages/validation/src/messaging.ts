import { z } from "zod";

// -- Send Message -------------------------------------------------------------

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be at most 2000 characters")
    .trim(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// -- Create Conversation ------------------------------------------------------

export const createConversationSchema = z.object({
  matchId: z.string().min(1, "Match ID is required"),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
