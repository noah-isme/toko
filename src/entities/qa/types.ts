import { z } from 'zod';

export type QAStatus = 'pending' | 'answered' | 'rejected';

export interface Question {
  id: string;
  productId: string;
  author?: string;
  authorId?: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  createdAt: string;
  status: QAStatus;
  helpfulCount: number;
  myVote?: 'up' | null;
}

export type QuestionSort = 'recent' | 'popular' | 'unanswered';

export interface QuestionListParams {
  page?: number;
  pageSize?: number;
  sort?: QuestionSort;
}

export interface QuestionListMeta {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
}

export interface QuestionListResponse {
  data: Question[];
  meta: QuestionListMeta;
}

/**
 * Keys under `product.qa.validation` in the message catalogs. The schemas carry these keys as
 * their error messages; the Q&A forms translate them for display.
 */
export const QA_VALIDATION_KEYS = [
  'questionRequired',
  'questionMin',
  'questionMax',
  'answerRequired',
  'answerMin',
  'answerMax',
] as const;

export type QAValidationKey = (typeof QA_VALIDATION_KEYS)[number];

export function isQAValidationKey(value: unknown): value is QAValidationKey {
  return (QA_VALIDATION_KEYS as readonly unknown[]).includes(value);
}

const qaMessage = (key: QAValidationKey) => key;

export const questionCreateInputSchema = z.object({
  question: z
    .string({
      message: qaMessage('questionRequired'),
    })
    .trim()
    .min(10, qaMessage('questionMin'))
    .max(500, qaMessage('questionMax')),
});

export type QuestionCreateInput = z.infer<typeof questionCreateInputSchema>;

export const answerCreateInputSchema = z.object({
  answer: z
    .string({
      message: qaMessage('answerRequired'),
    })
    .trim()
    .min(10, qaMessage('answerMin'))
    .max(1000, qaMessage('answerMax')),
});

export type AnswerCreateInput = z.infer<typeof answerCreateInputSchema>;

export const voteDirectionSchema = z.union([z.literal('up'), z.literal('clear')]);

export type VoteDirection = z.infer<typeof voteDirectionSchema>;

// Raw API types (snake_case from backend)
export interface ApiQuestion {
  id: string;
  product_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface ApiQuestionListResponse {
  data: ApiQuestion[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
