import type { MockResolver } from './types';

const QUESTION_COUNT = 5;

function question(id: string, productId: string, extra: Record<string, unknown>) {
  return { id, product_id: productId, user_id: 'user-1', ...extra, tenant_id: 'tenant-mock' };
}

/** Product Q&A: `products/:id/questions`, `questions/:id[/answer|/vote]`. */
export const resolveQa: MockResolver = ({ path, method, body, searchParams }) => {
  if (/^products\/[^/]+\/questions$/.test(path) && method === 'GET') {
    const productId = path.split('/')[1];
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const questions = Array.from({ length: QUESTION_COUNT }).map((_, i) => {
      const at = new Date(Date.now() - i * 86400000).toISOString();
      return {
        id: `question-${productId}-${i}`,
        product_id: productId,
        user_id: `user-${i}`,
        question: `Pertanyaan ${i + 1} untuk produk ${productId}`,
        answer: i < 3 ? `Jawaban untuk pertanyaan ${i + 1}` : null,
        answered_by: i < 3 ? 'Admin' : null,
        answered_at: i < 3 ? at : null,
        created_at: at,
        updated_at: at,
        tenant_id: 'tenant-mock',
      };
    });
    const start = (page - 1) * limit;
    return {
      data: questions.slice(start, start + limit),
      meta: {
        page,
        limit,
        total: questions.length,
        total_pages: Math.ceil(questions.length / limit),
      },
    };
  }

  if (/^questions\/[^/]+$/.test(path) && method === 'GET') {
    const now = new Date().toISOString();
    return question(path.split('/')[1], 'mock-product', {
      question: 'Pertanyaan contoh',
      answer: 'Jawaban contoh',
      answered_by: 'Admin',
      answered_at: now,
      created_at: now,
      updated_at: now,
    });
  }

  if (/^products\/[^/]+\/questions$/.test(path) && method === 'POST') {
    const now = new Date().toISOString();
    return {
      ...question(`question-new-${Date.now()}`, path.split('/')[1], {
        question: body?.question || '',
        answer: null,
        answered_by: null,
        answered_at: null,
        created_at: now,
        updated_at: now,
      }),
      user_id: 'current-user',
    };
  }

  if (/^questions\/[^/]+\/answer$/.test(path) && method === 'POST') {
    const now = new Date().toISOString();
    return question(path.split('/')[1], 'mock-product', {
      question: 'Pertanyaan contoh',
      answer: body?.answer || '',
      answered_by: 'Admin',
      answered_at: now,
      created_at: now,
      updated_at: now,
    });
  }

  if (/^questions\/[^/]+\/vote$/.test(path) && method === 'POST') {
    const up = body?.dir === 'up';
    return { helpfulCount: up ? 1 : 0, myVote: up ? 'up' : null };
  }

  return undefined;
};
