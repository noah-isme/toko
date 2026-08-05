'use client';

import { MessageSquare, MessageSquareMore, ThumbsUp, Check, Loader2 } from 'lucide-react';
import { memo, useState } from 'react';

import { useVoteQuestionHelpfulMutation, useAnswerQuestionMutation } from '../hooks';
import type { Question } from '../types';

import { formatRelativeTime } from './utils';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { useToast } from '@/shared/ui/toast';

interface QuestionItemProps {
  question: Question;
  onAnswer?: (questionId: string) => void;
  canAnswer?: boolean;
}

function formatQADate(value: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function renderStatus(status: Question['status']) {
  if (status === 'answered') {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <Check className="mr-1 h-3 w-3" />
        Terjawab
      </span>
    );
  }

  const label = status === 'pending' ? 'Menunggu jawaban' : 'Ditolak';
  const styles =
    status === 'pending'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-destructive/40 bg-destructive/10 text-destructive';

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', styles)}>
      {label}
    </span>
  );
}

export const QuestionItem = memo(function QuestionItem({ question, onAnswer, canAnswer = false }: QuestionItemProps) {
  const { mutate, isPending, isInFlight } = useVoteQuestionHelpfulMutation(question.id);
  const { mutate: answerMutate, isPending: answerPending } = useAnswerQuestionMutation(question.id);
  const helpfulActive = question.myVote === 'up';
  const voteInFlight = isPending || isInFlight();
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const { toast } = useToast();

  const handleHelpfulToggle = () => {
    const nextDir = helpfulActive ? 'clear' : 'up';
    mutate(nextDir);
  };

  const handleAnswer = async () => {
    if (!answerText.trim()) return;
    
    answerMutate({ answer: answerText }, {
      onSuccess: () => {
        setShowAnswerForm(false);
        setAnswerText('');
        toast({ title: 'Jawaban dikirim', variant: 'success' });
      },
      onError: (error) => {
        toast({ title: 'Gagal mengirim jawaban', description: error.message, variant: 'destructive' });
      }
    });
  };

  return (
    <article className="space-y-4 rounded-lg border border-border/60 bg-background/30 p-4 shadow-sm" data-testid="question-item">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{question.author ?? 'Anonim'}</p>
          <p className="text-xs text-muted-foreground">{formatQADate(question.createdAt)}</p>
        </div>
        {renderStatus(question.status)}
      </header>
      
      <div className="flex items-start gap-3">
        <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="flex-1 text-sm leading-relaxed text-foreground">{question.question}</p>
      </div>

      {question.answer && (
        <div className="space-y-2 rounded-lg border border-primary/10 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-xs text-primary">
            <Check className="h-3 w-3" />
            <span>Jawaban dari {question.answeredBy ?? 'Admin'}</span>
            {question.answeredAt && (
              <>
                <span>•</span>
                <span>{formatRelativeTime(question.answeredAt)}</span>
              </>
            )}
          </div>
          <p className="text-sm leading-relaxed text-foreground">{question.answer}</p>
        </div>
      )}

      {(canAnswer && question.status !== 'answered') && (
        <div className="space-y-2 border-t border-border/60 pt-4">
          {!showAnswerForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnswerForm(true)}
              className="w-full justify-start gap-2"
            >
              <MessageSquareMore className="h-4 w-4" />
              Jawab pertanyaan ini
            </Button>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Tulis jawaban Anda..."
                rows={3}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <GuardedButton
                  size="sm"
                  onClick={handleAnswer}
                  isLoading={isPending || isInFlight()}
                  loadingLabel="Mengirim..."
                >
                  Kirim Jawaban
                </GuardedButton>
                <Button variant="ghost" size="sm" onClick={() => { setShowAnswerForm(false); setAnswerText(''); }}>
                  Batal
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 border-t border-border/60 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5',
            helpfulActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}
          onClick={handleHelpfulToggle}
          disabled={voteInFlight}
          aria-pressed={helpfulActive}
        >
          <ThumbsUp className={cn('h-4 w-4', helpfulActive && 'fill-current')} />
          Bermanfaat
          <span className="text-xs text-muted-foreground">({question.helpfulCount})</span>
        </Button>
        
        {onAnswer && question.status !== 'answered' && (
          <Button variant="ghost" size="sm" onClick={() => onAnswer(question.id)} className="gap-1.5">
            <MessageSquareMore className="h-4 w-4" />
            Jawab
          </Button>
        )}
      </div>
    </article>
  );
});