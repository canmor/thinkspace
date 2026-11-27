import { z } from "zod";
const coord = z.number().min(0).max(640);
const shape = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("rect"),
      x: coord,
      y: coord,
      width: coord,
      height: coord,
    })
    .strict(),
  z
    .object({ kind: z.literal("circle"), cx: coord, cy: coord, r: coord })
    .strict(),
  z
    .object({
      kind: z.literal("text"),
      x: coord,
      y: coord,
      text: z.string().max(120),
    })
    .strict(),
  z
    .object({
      kind: z.literal("path"),
      d: z
        .string()
        .max(400)
        .regex(/^[MLHVZmlhvz0-9 .,\-]+$/),
    })
    .strict(),
]);
export type Leaf = z.infer<typeof shape>;
const group = z
  .object({ kind: z.literal("group"), items: z.array(shape).max(40) })
  .strict();
export const shapes = z.array(z.union([shape, group])).max(40);
