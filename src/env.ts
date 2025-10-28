import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8080/api/v1"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Toko"),
  NEXT_PUBLIC_CDN_URL: z.string().url().optional(),
});

const runtimeEnv = {
  NEXT_PUBLIC_API_URL: process.env["NEXT_PUBLIC_API_URL"],
  NEXT_PUBLIC_APP_NAME: process.env["NEXT_PUBLIC_APP_NAME"],
  NEXT_PUBLIC_CDN_URL: process.env["NEXT_PUBLIC_CDN_URL"],
};

export const env = envSchema.parse(runtimeEnv);
