export type Mode = "exam" | "review" | "retryWrong";

export type ChoiceKey = "A" | "B" | "C" | "D";

export type AnswerState = {
  selectedKey?: ChoiceKey;
  locked: boolean;
  isCorrect?: boolean;
};

export type AttemptState = {
  attemptId: string;
  examId: string;
  mode: Mode;

  activeIndex: number;
  activeQuestionIds: string[];

  answers: Record<string, AnswerState>;
  correctMap?: Record<string, ChoiceKey>;
  bookmarks: string[];

  stats: {
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
  };
};

export type Action =
  | { type: "INIT_EXAM"; payload: { attemptId: string; examId: string; questionIds: string[]; correctMap?: Record<string, ChoiceKey> } }
  | { type: "INIT_RETRY"; payload: { attemptId: string; examId: string; wrongQuestionIds: string[]; correctMap?: Record<string, ChoiceKey> } }
  | { type: "INIT_REVIEW"; payload: { attemptId: string; examId: string; questionIds: string[]; answers: Record<string, AnswerState>; correctMap?: Record<string, ChoiceKey> } }
  | { type: "RESTORE_ATTEMPT"; payload: AttemptState }
  | { type: "SELECT_ANSWER"; payload: { questionId: string; choice: ChoiceKey } }
  | { type: "TOGGLE_BOOKMARK"; payload: { questionId: string } }
  | { type: "GO_TO"; payload: { index: number } }
  | { type: "NEXT" }
  | { type: "PREV" };

export function attemptReducer(state: AttemptState, action: Action): AttemptState {
  switch (action.type) {
    case "INIT_EXAM":
      return {
        attemptId: action.payload.attemptId,
        examId: action.payload.examId,
        mode: "exam",
        activeIndex: 0,
        activeQuestionIds: action.payload.questionIds,
        answers: {},
        correctMap: action.payload.correctMap,
        bookmarks: [],
        stats: { answeredCount: 0, correctCount: 0, wrongCount: 0 },
      };

    case "INIT_RETRY":
      return {
        attemptId: action.payload.attemptId,
        examId: action.payload.examId,
        mode: "retryWrong",
        activeIndex: 0,
        activeQuestionIds: action.payload.wrongQuestionIds,
        answers: {}, // reset hoàn toàn
        correctMap: action.payload.correctMap,
        bookmarks: [],
        stats: { answeredCount: 0, correctCount: 0, wrongCount: 0 },
      };

    case "INIT_REVIEW":
      return {
        attemptId: action.payload.attemptId,
        examId: action.payload.examId,
        mode: "review",
        activeIndex: 0,
        activeQuestionIds: action.payload.questionIds,
        answers: action.payload.answers,
        correctMap: action.payload.correctMap,
        bookmarks: [],
        stats: { answeredCount: 0, correctCount: 0, wrongCount: 0 },
      };

    case "RESTORE_ATTEMPT":
      return action.payload;

    case "SELECT_ANSWER": {
      const { questionId, choice } = action.payload;
      const existing = state.answers[questionId];

      // đã khóa → không cho chọn lại
      if (existing?.locked || state.mode === "review") return state;

      const correctKey = state.correctMap?.[questionId];
      const isCorrect = correctKey ? correctKey === choice : undefined;

      const newAnswers = {
        ...state.answers,
        [questionId]: { selectedKey: choice, locked: true, isCorrect },
      };

      const answeredCount = Object.values(newAnswers).filter(a => a.selectedKey).length;
      const correctCount = Object.values(newAnswers).filter(a => a.isCorrect === true).length;
      const wrongCount = Object.values(newAnswers).filter(a => a.isCorrect === false).length;

      return {
        ...state,
        answers: newAnswers,
        stats: { answeredCount, correctCount, wrongCount },
      };
    }

    case "TOGGLE_BOOKMARK": {
      const { questionId } = action.payload;
      const isBookmarked = state.bookmarks.includes(questionId);
      return {
        ...state,
        bookmarks: isBookmarked 
          ? state.bookmarks.filter(id => id !== questionId)
          : [...state.bookmarks, questionId]
      };
    }

    case "GO_TO": {
      const index = Math.max(0, Math.min(action.payload.index, state.activeQuestionIds.length - 1));
      return { ...state, activeIndex: index };
    }

    case "NEXT":
      return {
        ...state,
        activeIndex: Math.min(state.activeIndex + 1, state.activeQuestionIds.length - 1),
      };

    case "PREV":
      return {
        ...state,
        activeIndex: Math.max(state.activeIndex - 1, 0),
      };

    default:
      return state;
  }
}
