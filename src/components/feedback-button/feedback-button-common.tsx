import { z } from 'zod'

export const formSchema = z.object({
  email: z.union([
    z.string().email('Please enter a valid email address.'),
    z.string().max(0),
  ]),
  message: z.string().min(10, 'Please enter at least 10 characters.').max(5000),
})
