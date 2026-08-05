import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useReducer, useRef } from 'react';

import {
  listQuestions,
  getQuestion,
  createQuestion,
  answerQuestion,
  voteQuestionHelpful,
} from './api';
import { getQuestionListKey, getQuestionKey } from './keys';
import type {
  Question,
  QuestionCreateInput,
  QuestionListParams,
  QuestionListResponse,
  AnswerCreateInput,
  VoteDirection,
} from './types';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

type QuestionListEntry = [readonly unknown[], QuestionListResponse | undefined];

interface CreateQuestionContext {
  previousLists: QuestionListEntry[];
}

interface VoteQuestionContext {
  previousLists: QuestionListEntry[];
}

interface AnswerQuestionContext {
  previousLists: QuestionListEntry[];
  previousQuestion?: Question;
}

function useInFlightRegistry() {
  const registryRef = useRef(new Set<string>());
  const [, forceRender] = useReducer((count) => count + 1, 0);

  const add = useCallback((key: string) => {
    if (registryRef.current.has(key)) {
      return false;
    }

    registryRef.current.add(key);
    forceRender();
    return true;
  }, []);

  const remove = useCallback((key: string) => {
    if (registryRef.current.delete(key)) {
      forceRender();
    }
  }, []);

  const has = useCallback((key: string) => registryRef.current.has(key), []);

  return { add, remove, has };
}

function createTempQuestionId() {
  return `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractParamsFromKey(key: readonly unknown[]): QuestionListParams | undefined {
  if (Array.isArray(key) && key.length >= 4 && typeof key[3] === 'object' && key[3] !== null) {
    return key[3] as QuestionListParams;
  }

  return undefined;
}

function getListQueries(productId: string, queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.getQueriesData<QuestionListResponse>({
    queryKey: ['questions', 'list', productId],
  });
}

export function useQuestionListQuery(productId: string, params?: QuestionListParams) {
  return useQuery({
    queryKey: getQuestionListKey(productId, params),
    queryFn: () => listQuestions(productId, params),
    enabled: !!productId,
  });
}

export function useQuestionQuery(questionId: string) {
  return useQuery({
    queryKey: getQuestionKey(questionId),
    queryFn: () => getQuestion(questionId),
    enabled: !!questionId,
  });
}

export function useCreateQuestionMutation(productId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<
    Pick<Question, 'id' | 'status'>,
    Error,
    QuestionCreateInput,
    CreateQuestionContext
  >({
    mutationFn: (input) => createQuestion(productId, input),
    onMutate: async (input) => {
      if (!productId) return { previousLists: [] };

      await queryClient.cancelQueries({ queryKey: ['questions', 'list', productId] });

      const optimisticQuestion: Question = {
        id: createTempQuestionId(),
        productId,
        author: 'Anda',
        authorId: 'current-user',
        question: input.question,
        createdAt: new Date().toISOString(),
        status: 'pending',
        helpfulCount: 0,
        myVote: null,
      };

      const previousLists: QuestionListEntry[] = [];
      const listEntries = getListQueries(productId, queryClient);

      for (const [key, data] of listEntries) {
        const paramsFromKey = extractParamsFromKey(key);
        if (paramsFromKey?.page && paramsFromKey.page > 1) {
          continue;
        }

        previousLists.push([key, data]);
        const baseData: QuestionListResponse =
          data ??
          ({
            data: [],
            meta: {
              page: 1,
              pageSize: paramsFromKey?.pageSize ?? 10,
              total: 0,
              totalPages: 0,
            },
          } satisfies QuestionListResponse);

        const nextMetaTotal = (baseData.meta.total ?? baseData.data.length) + 1;
        const nextItems = [optimisticQuestion, ...baseData.data];
        const safePageSize = baseData.meta.pageSize || nextItems.length || 1;
        const trimmed = safePageSize > 0 ? nextItems.slice(0, safePageSize) : nextItems;

        const nextData: QuestionListResponse = {
          ...baseData,
          data: trimmed,
          meta: {
            ...baseData.meta,
            total: nextMetaTotal,
            totalPages: Math.max(1, Math.ceil(nextMetaTotal / safePageSize)),
          },
        };

        queryClient.setQueryData(key, nextData);
      }

      return { previousLists };
    },
    onSuccess: (_data, variables) => {
      if (productId) {
        capturePosthogEvent('question_submit', {
          productId,
          questionLength: variables?.question.length ?? 0,
        });
      }

      toast({
        id: `question-create-${productId}-success`,
        title: 'Pertanyaan dikirim',
        description: 'Pertanyaan Anda akan ditinjau dan dijawab segera.',
        variant: 'success',
      });
    },
    onError: (error, _input, context) => {
      if (productId) {
        for (const [key, data] of context?.previousLists ?? []) {
          queryClient.setQueryData(key, data);
        }
      }

      captureSentryException(error, {
        tags: { feature: 'qa', action: 'create' },
        extra: { productId },
      });

      toast({
        id: `question-create-${productId}-error`,
        title: 'Gagal mengirim pertanyaan',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      if (!productId) return;

      void queryClient.invalidateQueries({ queryKey: ['questions', 'list', productId] });
    },
  });

  type CreateMutateOptions = Parameters<typeof mutation.mutate>[1];

  const mutate = useCallback(
    (input: QuestionCreateInput, options?: CreateMutateOptions) => {
      if (!productId) return;

      const guardKey = `create:${productId}`;
      if (!add(guardKey)) return;

      mutation.mutate(input, {
        ...options,
        onSettled: (data, error, variables, context, mutationContext) => {
          remove(guardKey);
          options?.onSettled?.(data, error, variables, context, mutationContext);
        },
      });
    },
    [add, mutation, productId, remove],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      isProductInFlight: () => (productId ? has(`create:${productId}`) : false),
    }),
    [has, mutate, mutation, productId],
  );
}

export function useAnswerQuestionMutation(questionId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<Question, Error, AnswerCreateInput, AnswerQuestionContext>({
    mutationFn: (input) => answerQuestion(questionId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['questions', 'list'] });
      await queryClient.cancelQueries({ queryKey: getQuestionKey(questionId) });

      const previousLists: QuestionListEntry[] = [];
      const listEntries = queryClient.getQueriesData<QuestionListResponse>({
        queryKey: ['questions', 'list'],
      });

      for (const [key, data] of listEntries) {
        previousLists.push([key, data]);
        if (data) {
          const nextData: QuestionListResponse = {
            ...data,
            data: data.data.map((q) =>
              q.id === questionId ? { ...q, answer: input.answer, status: 'answered', answeredAt: new Date().toISOString() } : q
            ),
          };
          queryClient.setQueryData(key, nextData);
        }
      }

      const previousQuestion = queryClient.getQueryData<Question>(getQuestionKey(questionId));
      if (previousQuestion) {
        queryClient.setQueryData(getQuestionKey(questionId), {
          ...previousQuestion,
          answer: input.answer,
          status: 'answered',
          answeredAt: new Date().toISOString(),
        });
      }

      return { previousLists, previousQuestion };
    },
    onSuccess: () => {
      toast({
        id: `answer-${questionId}-success`,
        title: 'Jawaban dikirim',
        description: 'Jawaban Anda telah dipublikasikan.',
        variant: 'success',
      });
    },
    onError: (error, _input, context) => {
      for (const [key, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, data);
      }
      if (context?.previousQuestion) {
        queryClient.setQueryData(getQuestionKey(questionId), context.previousQuestion);
      }

      captureSentryException(error, {
        tags: { feature: 'qa', action: 'answer' },
        extra: { questionId },
      });

      toast({
        id: `answer-${questionId}-error`,
        title: 'Gagal mengirim jawaban',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions', 'list'] });
      void queryClient.invalidateQueries({ queryKey: getQuestionKey(questionId) });
    },
  });

  type AnswerMutateOptions = Parameters<typeof mutation.mutate>[1];

  const mutate = useCallback(
    (input: AnswerCreateInput, options?: AnswerMutateOptions) => {
      const guardKey = `answer:${questionId}`;
      if (!add(guardKey)) return;

      mutation.mutate(input, {
        ...options,
        onSettled: (data, error, variables, context, mutationContext) => {
          remove(guardKey);
          options?.onSettled?.(data, error, variables, context, mutationContext);
        },
      });
    },
    [add, mutation, questionId, remove],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      isInFlight: () => has(`answer:${questionId}`),
    }),
    [has, mutate, mutation, questionId],
  );
}

export function useVoteQuestionHelpfulMutation(questionId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<
    { helpfulCount: number; myVote: Question['myVote'] },
    Error,
    VoteDirection,
    VoteQuestionContext
  >({
    mutationFn: (dir) => voteQuestionHelpful(questionId, dir),
    onMutate: async (dir) => {
      await queryClient.cancelQueries({ queryKey: ['questions', 'list'] });
      await queryClient.cancelQueries({ queryKey: getQuestionKey(questionId) });

      const previousLists: QuestionListEntry[] = [];
      const listEntries = queryClient.getQueriesData<QuestionListResponse>({
        queryKey: ['questions', 'list'],
      });

      for (const [key, data] of listEntries) {
        previousLists.push([key, data]);
        if (data) {
          const nextData: QuestionListResponse = {
            ...data,
            data: data.data.map((q) => {
              if (q.id !== questionId) return q;
              const nextVote = dir === 'up' ? 'up' : null;
              const currentVote = q.myVote;
              const delta = currentVote === 'up' ? -1 : dir === 'up' ? 1 : 0;
              return {
                ...q,
                helpfulCount: Math.max(0, q.helpfulCount + delta),
                myVote: nextVote,
              };
            }),
          };
          queryClient.setQueryData(key, nextData);
        }
      }

      const previousQuestion = queryClient.getQueryData<Question>(getQuestionKey(questionId));
      if (previousQuestion) {
        const nextVote = dir === 'up' ? 'up' : null;
        const currentVote = previousQuestion.myVote;
        const delta = currentVote === 'up' ? -1 : dir === 'up' ? 1 : 0;
        queryClient.setQueryData(getQuestionKey(questionId), {
          ...previousQuestion,
          helpfulCount: Math.max(0, previousQuestion.helpfulCount + delta),
          myVote: nextVote,
        });
      }

      return { previousLists };
    },
    onError: (error, _dir, context) => {
      for (const [key, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, data);
      }

      captureSentryException(error, {
        tags: { feature: 'qa', action: 'vote' },
        extra: { questionId },
      });

      toast({
        id: `vote-${questionId}-error`,
        title: 'Gagal voting',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions', 'list'] });
      void queryClient.invalidateQueries({ queryKey: getQuestionKey(questionId) });
    },
  });

  type VoteMutateOptions = Parameters<typeof mutation.mutate>[1];

  const mutate = useCallback(
    (dir: VoteDirection, options?: VoteMutateOptions) => {
      const guardKey = `vote:${questionId}`;
      if (!add(guardKey)) return;

      mutation.mutate(dir, {
        ...options,
        onSettled: (data, error, variables, context, mutationContext) => {
          remove(guardKey);
          options?.onSettled?.(data, error, variables, context, mutationContext);
        },
      });
    },
    [add, mutation, questionId, remove],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      isInFlight: () => has(`vote:${questionId}`),
    }),
    [has, mutate, mutation, questionId],
  );
}