export function getQuestionListKey(productId: string, params?: { page?: number; pageSize?: number; sort?: string }) {
  return ['questions', 'list', productId, params ?? {}] as const;
}

export function getQuestionKey(questionId: string) {
  return ['questions', 'detail', questionId] as const;
}

export function getQuestionStatsKey(productId: string) {
  return ['questions', 'stats', productId] as const;
}