import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { apiPath } from './utils';

import type { Question, QAStatus, ApiQuestion } from '@/entities/qa/types';

type QAStore = Map<string, Question[]>;

const qaStore: QAStore = new Map();

function ensureQuestions(productId: string): Question[] {
  if (!qaStore.has(productId)) {
    const count = faker.number.int({ min: 3, max: 8 });
    const questions: Question[] = Array.from({ length: count }).map((_, i) => {
      const status: QAStatus = faker.helpers.arrayElement(['pending', 'answered', 'answered']);
      const hasAnswer = status === 'answered';
      return {
        id: faker.string.uuid(),
        productId,
        author: faker.person.firstName(),
        authorId: faker.string.uuid(),
        question: faker.lorem.sentence(),
        answer: hasAnswer ? faker.lorem.sentences({ min: 1, max: 3 }) : undefined,
        answeredBy: hasAnswer ? 'Admin' : undefined,
        answeredAt: hasAnswer ? faker.date.recent({ days: 10 }).toISOString() : undefined,
        createdAt: faker.date.recent({ days: 30 }).toISOString(),
        status,
        helpfulCount: faker.number.int({ min: 0, max: 50 }),
        myVote: null,
      };
    });
    qaStore.set(productId, questions);
  }
  return qaStore.get(productId)!;
}

function findQuestionById(questionId: string): Question | null {
  for (const [, questions] of qaStore) {
    const found = questions.find((q) => q.id === questionId);
    if (found) return found;
  }
  return null;
}

function mapQuestionToApiQuestion(question: Question): ApiQuestion {
  return {
    id: question.id,
    product_id: question.productId,
    user_id: question.authorId ?? 'anonymous',
    question: question.question,
    answer: question.answer ?? null,
    answered_by: question.answeredBy ?? null,
    answered_at: question.answeredAt ?? null,
    created_at: question.createdAt,
    updated_at: question.createdAt,
    tenant_id: 'tenant-mock',
  };
}

function clampPage(value: string | null, fallback: number, min = 1) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= min) {
    return Math.floor(parsed);
  }
  return fallback;
}

function clampPageSize(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 50) {
    return Math.floor(parsed);
  }
  return fallback;
}

function sortQuestions(questions: Question[], sort: string) {
  if (sort === 'popular') {
    return questions.sort((a, b) => b.helpfulCount - a.helpfulCount);
  }
  if (sort === 'unanswered') {
    return questions.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }
  return questions.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export const qaHandlers = [
  // GET /products/:productId/questions - list questions
  http.get(apiPath('/products/:productId/questions'), ({ request, params }) => {
    const productId = (params.productId as string) ?? 'unknown';
    const url = new URL(request.url);
    const page = clampPage(url.searchParams.get('page'), 1);
    const limit = clampPageSize(url.searchParams.get('limit'), 10);
    const sort = (url.searchParams.get('sort') as 'recent' | 'popular' | 'unanswered') ?? 'recent';

    const allQuestions = ensureQuestions(productId);
    const sorted = sortQuestions([...allQuestions], sort);
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit);

    return HttpResponse.json({
      data: paginated.map(mapQuestionToApiQuestion),
      meta: {
        page,
        limit,
        total: allQuestions.length,
        total_pages: Math.ceil(allQuestions.length / limit) || 1,
      },
    });
  }),

  // GET /questions/:questionId - get single question
  http.get(apiPath('/questions/:questionId'), ({ params }) => {
    const questionId = params.questionId as string;
    const question = findQuestionById(questionId);

    if (!question) {
      return HttpResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    return HttpResponse.json(mapQuestionToApiQuestion(question));
  }),

  // POST /products/:productId/questions - create question
  http.post(apiPath('/products/:productId/questions'), async ({ request, params }) => {
    const productId = (params.productId as string) ?? 'unknown';
    const payload = await request.json();

    if (!payload || typeof payload !== 'object' || typeof payload.question !== 'string') {
      return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const questionText = payload.question.trim();
    if (questionText.length < 10 || questionText.length > 500) {
      return HttpResponse.json({ message: 'Question must be between 10 and 500 characters' }, { status: 400 });
    }

    const questions = ensureQuestions(productId);
    const newQuestion: Question = {
      id: faker.string.uuid(),
      productId,
      author: 'Anda',
      authorId: 'current-user',
      question: questionText,
      createdAt: new Date().toISOString(),
      status: 'pending',
      helpfulCount: 0,
      myVote: null,
    };

    questions.unshift(newQuestion);

    return HttpResponse.json(mapQuestionToApiQuestion(newQuestion), { status: 201 });
  }),

  // POST /questions/:questionId/answer - answer question
  http.post(apiPath('/questions/:questionId/answer'), async ({ request, params }) => {
    const questionId = params.questionId as string;
    const payload = await request.json();

    if (!payload || typeof payload !== 'object' || typeof payload.answer !== 'string') {
      return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const answerText = payload.answer.trim();
    if (answerText.length < 10 || answerText.length > 1000) {
      return HttpResponse.json({ message: 'Answer must be between 10 and 1000 characters' }, { status: 400 });
    }

    const question = findQuestionById(questionId);
    if (!question) {
      return HttpResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    question.answer = answerText;
    question.answeredBy = 'Admin';
    question.answeredAt = new Date().toISOString();
    question.status = 'answered';

    return HttpResponse.json(mapQuestionToApiQuestion(question));
  }),

  // POST /questions/:questionId/vote - vote helpful
  http.post(apiPath('/questions/:questionId/vote'), async ({ request, params }) => {
    const questionId = params.questionId as string;
    const payload = await request.json();

    if (!payload || typeof payload !== 'object' || !('dir' in payload)) {
      return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const dir = payload.dir;
    if (dir !== 'up' && dir !== 'clear') {
      return HttpResponse.json({ message: 'Invalid direction' }, { status: 400 });
    }

    const question = findQuestionById(questionId);
    if (!question) {
      return HttpResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    if (dir === 'up') {
      if (question.myVote !== 'up') {
        question.helpfulCount += 1;
        question.myVote = 'up';
      }
    } else if (question.myVote === 'up') {
      question.helpfulCount = Math.max(0, question.helpfulCount - 1);
      question.myVote = null;
    }

    return HttpResponse.json({
      helpfulCount: question.helpfulCount,
      myVote: question.myVote,
    });
  }),
];