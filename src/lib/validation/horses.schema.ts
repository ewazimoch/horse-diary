import { z } from "zod";

const currentYear = new Date().getFullYear();

export const createHorseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  birth_year: z.number().int().min(1000).max(currentYear, `Birth year must be ≤ ${currentYear}`).nullable().optional(),
  breed: z.string().max(100).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
});

export const updateHorseSchema = createHorseSchema.partial();
