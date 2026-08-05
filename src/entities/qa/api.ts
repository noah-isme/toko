import { z, type ZodType } from 'zod';

import { mapApiQuestionToQuestion, mapApiQuestionListResponse } from './mappers';
import {
  questionCreateInputSchema,
  answerCreateInputSchema,
  voteDirectionSchema,
  type Question,
  type QuestionCreateInput,
  type QuestionListParams,
  type QuestionListResponse,
  type AnswerCreateInput,
  type VoteDirection,
  type ApiQuestion,
} from './types';

import { apiClient } from '@/lib/api/apiClient';

const productIdSchema = z.string().min(1, 'productId is required');
const questionIdSchema = z.string().min(1, 'questionId is required');

const apiQuestionSchema: ZodType<ApiQuestion> = z.object({
  id: z.string(),
  product_id: z.string(),
  user_id: z.string(),
  question: z.string(),
  answer: z.string().nullable(),
  answered_by: z.string().nullable(),
  answered_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  tenant_id: z.string(),
});

const apiQuestionListResponseSchema = z.object({
  data: z.array(apiQuestionSchema),
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
  }),
});

const questionVoteResponseSchema = z.object({
  helpfulCount: z.number().int().nonnegative(),
  myVote: z.union([z.literal('up'), z.null()]).default(null),
});

const questionCreateResponseSchema: ZodType<ApiQuestion> = apiQuestionSchema;

function buildQuestionListPath(productId: string, params?: QuestionListParams) {
  const searchParams = new URLSearchParams();

  if (params?.page) {
    searchParams.set('page', String(params.page));
  }

  if (params?.pageSize) {
    searchParams.set('limit', String(params.pageSize));
  }

  if (params?.sort) {
    searchParams.set('sort', params.sort);
  }

  const queryString = searchParams.toString();
  const encodedProductId = encodeURIComponent(productId);
  const basePath = `/products/${encodedProductId}/questions`;
  return (queryString ? `${basePath}?${queryString}` : basePath) as string;
}

export async function listQuestions(
  productId: string,
  params?: QuestionListParams,
): Promise<QuestionListResponse> {
  const parsedProductId = productIdSchema.parse(productId);
  const path = buildQuestionListPath(parsedProductId, params);

  const apiResponse = await apiClient(path, {
    schema: apiQuestionListResponseSchema,
  });

  return mapApiQuestionListResponse(apiResponse);
}

export async function getQuestion(questionId: string): Promise<Question> {
  const parsedQuestionId = questionIdSchema.parse(questionId);
  const path = `/questions/${encodeURIComponent(parsedQuestionId)}`;

  const apiQuestion = await apiClient(path, {
    schema: apiQuestionSchema,
  });

  return mapApiQuestionToQuestion(apiQuestion);
}

export async function createQuestion(
  productId: string,
  payload: QuestionCreateInput,
): Promise<Pick<Question, 'id' | 'status'>> {
  const parsedProductId = productIdSchema.parse(productId);
  const parsedPayload = questionCreateInputSchema.parse(payload);

  const response = await apiClient(`/products/${encodeURIComponent(parsedProductId)}/questions`, {
    method: 'POST',
    body: JSON.stringify({
      question: parsedPayload.question,
    }),
    schema: questionCreateResponseSchema,
    requiresAuth: true,
  });

  return {
    id: response.id,
    status: 'pending',
  };
}

export async function answerQuestion(
  questionId: string,
  payload: AnswerCreateInput,
): Promise<Question> {
  const parsedQuestionId = questionIdSchema.parse(questionId);
  const parsedPayload = answerCreateInputSchema.parse(payload);

  const response = await apiClient(`/questions/${encodeURIComponent(parsedQuestionId)}/answer`, {
    method: 'POST',
    body: JSON.stringify({
      answer: parsedPayload.answer,
    }),
    schema: apiQuestionSchema,
    requiresAuth: true,
  });

  return mapApiQuestionToQuestion(response);
}

export async function voteQuestionHelpful(
  questionId: string,
  dir: VoteDirection,
): Promise<{ helpfulCount: number; myVote: Question['myVote'] }> {
  const parsedQuestionId = questionIdSchema.parse(questionId);
  const parsedDir = voteDirectionSchema.parse(dir);

  return apiClient(`/questions/${encodeURIComponent(parsedQuestionId)}/vote`, {
    method: 'POST',
    body: JSON.stringify({ dir: parsedDir }),
    schema: questionVoteResponseSchema,
    requiresAuth: true,
  });
}