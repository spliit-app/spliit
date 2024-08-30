// src/pages/api/create-group.js

import { createGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse and validate the incoming request body using the schema
    const groupFormValues = groupFormSchema.parse(req.body)

    // Create the group using the provided function
    const group = await createGroup(groupFormValues)

    // Respond with the created group
    return res.status(201).json(group)
  } catch (error) {
    // Handle errors (e.g., validation errors, database errors)
    console.error('Error creating group:', error)

    // If the error is a validation error from Zod, return a 400 status
    if (error.name === 'ZodError') {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: error.errors })
    }

    // For other errors, return a 500 status
    return res.status(500).json({ error: 'Internal server error' })
  }
}
