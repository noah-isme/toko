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

export const questionCreateInputSchema = z.object({
  question: z
    .string({
      message: 'Tulis pertanyaan Anda',
    })
    .trim()
    .min(10, 'Minimal 10 karakter')
    .max(500, 'Maksimum 500 karakter'),
});

export type QuestionCreateInput = z.infer<typeof questionCreateInputSchema>;

export const answerCreateInputSchema = z.object({
  answer: z
    .string({
      message: 'Tulis jawaban Anda',
    })
    .trim()
    .min(10, 'Minimal 10 karakter')
    .max(1000, 'Maksimum 1000 karakter'),
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