import { z } from "zod";

/**
 * Address validation (generic - customize per chain)
 */
export const addressSchema = z
  .string()
  .min(1, "Address is required")
  .regex(/^[a-zA-Z0-9]+$/, "Invalid address format");

/**
 * Amount validation
 */
export const amountSchema = z
  .string()
  .min(1, "Amount is required")
  .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
  .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0");

/**
 * Send transaction schema
 */
export const sendTransactionSchema = z.object({
  recipient: addressSchema,
  amount: amountSchema,
  memo: z.string().max(256, "Memo too long").optional(),
});

export type SendTransactionFormData = z.infer<typeof sendTransactionSchema>;

/**
 * Stake transaction schema
 */
export const stakeTransactionSchema = z.object({
  validatorId: z.string().min(1, "Please select a validator"),
  amount: amountSchema,
});

export type StakeTransactionFormData = z.infer<typeof stakeTransactionSchema>;

/**
 * Import wallet schema
 */
export const importWalletSchema = z.object({
  mnemonic: z
    .string()
    .min(1, "Seed phrase is required")
    .refine((val) => {
      const words = val.trim().split(/\s+/);
      return words.length === 12 || words.length === 24;
    }, "Seed phrase must be 12 or 24 words"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ImportWalletFormData = z.infer<typeof importWalletSchema>;
