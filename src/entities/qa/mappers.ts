import type { ApiQuestion, Question, QuestionListResponse, QuestionListMeta } from './types';

export function mapApiQuestionToQuestion(apiQuestion: ApiQuestion): Question {
  return {
    id: apiQuestion.id,
    productId: apiQuestion.product_id,
    author: apiQuestion.user_id,
    authorId: apiQuestion.user_id,
    question: apiQuestion.question,
    answer: apiQuestion.answer ?? undefined,
    answeredBy: apiQuestion.answered_by ?? undefined,
    answeredAt: apiQuestion.answered_at ?? undefined,
    createdAt: apiQuestion.created_at,
    status: apiQuestion.answer ? 'answered' : 'pending',
    helpfulCount: 0,
    myVote: null,
  };
}

export function mapApiQuestionListResponse(apiResponse: {
  data: ApiQuestion[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}): QuestionListResponse {
  return {
    data: apiResponse.data.map(mapApiQuestionToQuestion),
    meta: {
      page: apiResponse.meta.page,
      pageSize: apiResponse.meta.limit,
      total: apiResponse.meta.total,
      totalPages: apiResponse.meta.total_pages,
    },
  };
}