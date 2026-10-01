import { useEffect, useRef, useState } from 'react';
import { buildAIContextPack } from '../ai/contextPack';
import type { AIInteractionType, AxeonAIGateway, AxeonAIRequest, AxeonAIResponse } from '../ai/contracts';
import type { QuestionSuggestion } from './questionSuggestions';
import type { InvestigationNode } from './useInvestigation';
import type { FindingsLoad } from './useOperationalFindings';
import type { AIExecutionStatus } from '../ai/providerResolver';
import { copyFilters, filtersKey, type InvestigationFilter } from './investigationContext';
import type { AdapterSecurityContext } from '../data/maximoAdapter';

export type AxeonAILoad =
  | { status: 'idle' | 'loading' }
  | { status: 'error' }
  | { status: 'ready'; response: AxeonAIResponse; question: string; contextPath: readonly InvestigationNode['path'][number][]; contextFilters: readonly InvestigationFilter[] };

interface QuestionInput {
  question: string;
  interactionType: AIInteractionType;
  suggestion?: QuestionSuggestion;
}

export function useAxeonAI(
  gateway: AxeonAIGateway, node: InvestigationNode | null, findings: FindingsLoad, revision = 0,
  availability: { status: AIExecutionStatus; message: string; providerId: string },
  filters: readonly InvestigationFilter[],
  securityScope: AdapterSecurityContext,
) {
  const [load, setLoad] = useState<AxeonAILoad>({ status: 'idle' });
  const [validationError, setValidationError] = useState<string | null>(null);
  const lastInput = useRef<QuestionInput | null>(null);
  const requestToken = useRef(0);
  const contextKey = JSON.stringify([node?.path ?? null, filtersKey(filters), revision, availability.status, availability.providerId]);
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;

  useEffect(() => {
    requestToken.current += 1;
    lastInput.current = null;
    setValidationError(null);
    setLoad({ status: 'idle' });
  }, [contextKey]);

  const run = (input: QuestionInput) => {
    if (!node) return;
    if (availability.status !== 'active') {
      setValidationError(availability.message);
      return;
    }
    if (node.path.length > 0 && findings.status !== 'ready') {
      setValidationError('Operational findings must be available before asking Axeon.');
      return;
    }
    try {
      const contextPack = buildAIContextPack({
        path: node.path, contextType: node.dimension, contextLabel: node.label, population: node.count,
        findings: findings.status === 'ready' ? findings.findings : [], question: input.question,
        securityScope,
        filters,
        referenceTime: findings.status === 'ready' ? findings.referenceTime ?? findings.findings[0]?.referenceTime ?? null : null,
      });
      const request: AxeonAIRequest = {
        contextPack, interactionType: input.interactionType,
        ...(input.suggestion ? { selectedSuggestion: { id: input.suggestion.id, lens: input.suggestion.lens } } : {}),
      };
      const token = ++requestToken.current;
      const requestContextKey = contextKey;
      lastInput.current = input;
      setValidationError(null);
      setLoad({ status: 'loading' });
      void Promise.resolve().then(() => gateway.ask(request)).then((response) => {
        if (token === requestToken.current && requestContextKey === contextKeyRef.current) {
          setLoad({ status: 'ready', response, question: contextPack.question, contextPath: contextPack.context.path, contextFilters: copyFilters(contextPack.context.filters) });
        }
      }).catch(() => {
        if (token === requestToken.current && requestContextKey === contextKeyRef.current) setLoad({ status: 'error' });
      });
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Question could not be submitted.');
    }
  };

  return {
    load, validationError, availability,
    askSuggested: (suggestion: QuestionSuggestion) => run({ question: suggestion.text, interactionType: 'suggested-question', suggestion }),
    askFreeForm: (question: string) => run({ question, interactionType: 'free-form-question' }),
    retry: () => { if (lastInput.current) run(lastInput.current); },
  };
}
