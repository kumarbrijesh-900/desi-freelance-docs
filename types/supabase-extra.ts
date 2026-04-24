export type FeedbackType = "bug" | "feature" | "general";
export type FeedbackStatus = "new" | "reviewed";

export interface UserFeedback {
  id: string;
  user_id: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  created_at: string;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  is_published: boolean;
  created_at: string;
}
