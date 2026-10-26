/** A FAQ entry (Admin → FAQ), as returned by /api/faqs. */
export interface FaqDTO {
  id: string
  question: string
  answer: string
  sortOrder: number
  published: boolean
}

export interface FaqRow {
  id: string
  question: string
  answer: string
  sort_order: number
  published: boolean
}

export const FAQ_SELECT = 'id,question,answer,sort_order,published'

export function mapFaq(row: FaqRow): FaqDTO {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
    published: row.published,
  }
}

const MAX_QUESTION = 300
const MAX_ANSWER = 4000

type FaqWrite = Partial<Pick<FaqRow, 'question' | 'answer' | 'sort_order' | 'published'>>

/** Validate { question, answer, sortOrder, published }; partial when `partial`. */
export function parseFaqInput(
  body: Record<string, unknown> | null,
  partial: boolean,
): { data: FaqWrite } | { error: string } {
  if (!body) return { error: 'Invalid request body' }
  const data: FaqWrite = {}

  if (body.question !== undefined || !partial) {
    const q = typeof body.question === 'string' ? body.question.trim() : ''
    if (!q) return { error: 'Question is required' }
    if (q.length > MAX_QUESTION) return { error: `Question must be ${MAX_QUESTION} characters or fewer` }
    data.question = q
  }
  if (body.answer !== undefined || !partial) {
    const a = typeof body.answer === 'string' ? body.answer.trim() : ''
    if (!a) return { error: 'Answer is required' }
    if (a.length > MAX_ANSWER) return { error: `Answer must be ${MAX_ANSWER} characters or fewer` }
    data.answer = a
  }
  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== 'number' || !Number.isInteger(body.sortOrder))
      return { error: 'Sort order must be a whole number' }
    data.sort_order = body.sortOrder
  }
  if (body.published !== undefined) {
    if (typeof body.published !== 'boolean') return { error: 'published must be true or false' }
    data.published = body.published
  }
  return { data }
}
