import { z } from "zod";

/**
 * Mina B62 address validation (Base58Check, starts with B62, 55 chars total)
 */
export const addressSchema = z
  .string()
  .min(1, "Address is required")
  .regex(/^B62[1-9A-HJ-NP-Za-km-z]{52}$/, "Invalid Mina address format");

/**
 * Amount validation
 */
export const amountSchema = z
  .string()
  .min(1, "Amount is required")
  .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
  .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0");

/**
 * Fee validation
 */
export const feeSchema = z
  .string()
  .min(1, "Fee is required")
  .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
  .refine((val) => parseFloat(val) >= 0, "Fee must be non-negative");

/**
 * Send transaction schema
 */
export const sendTransactionSchema = z.object({
  recipient: addressSchema,
  amount: amountSchema,
  memo: z.string().max(32, "Memo too long").optional(),
  fee: feeSchema,
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
      return words.length === 12;
    }, "Seed phrase must be 12 words"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ImportWalletFormData = z.infer<typeof importWalletSchema>;
