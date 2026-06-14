import { z } from '@/lib/zod';

export const UuidParamSchema = z.object({ id: z.uuid() });
