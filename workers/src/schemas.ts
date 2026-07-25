import { z } from 'zod'

export const loginSchema = z.discriminatedUnion('login_type', [
  z.object({
    login_type: z.literal('staff'),
    email: z.string().trim().min(1, 'Email and password are required.'),
    password: z.string().min(1, 'Email and password are required.'),
  }),
  z.object({
    login_type: z.literal('student'),
    admission_no: z.string().trim().min(1, 'Admission number and password are required.'),
    password: z.string().min(1, 'Admission number and password are required.'),
  }),
])

export const saveMarkSchema = z.object({
  assessment_id: z.string().min(1),
  student_id: z.string().min(1),
  // "" or null clears the mark; otherwise must parse as a number
  marks: z.union([z.string(), z.number(), z.null()]).optional(),
})

export const addAssessmentSchema = z.object({
  unit_id: z.string().trim().min(1),
  class_id: z.string().trim().min(1),
  assessment_type: z.enum(['Oral', 'Practical', 'Theory']),
  assessment_name: z.string().trim().min(1),
  max_marks: z.coerce.number().min(1).max(100).default(100),
  year: z.coerce.number().int().optional(),
  term: z.coerce.number().int().min(1).max(3).default(1),
})

export const reviewAssessmentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  review_note: z.string().trim().max(2000).optional().default(''),
})

export const attendanceSubmitSchema = z.object({
  class_id: z.string().min(1, 'Class, unit, week and lesson are required.'),
  unit_id: z.string().min(1, 'Class, unit, week and lesson are required.'),
  unit_code: z.string().optional().default(''),
  week: z.coerce.number().int().min(1, 'Class, unit, week and lesson are required.'),
  lesson: z.string().min(1, 'Class, unit, week and lesson are required.'),
  year: z.coerce.number().int().optional(),
  term: z.coerce.number().int().min(1).max(3).default(1),
  statuses: z.record(z.string(), z.string()),
})
