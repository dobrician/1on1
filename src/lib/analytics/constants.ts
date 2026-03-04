/**
 * Metric name constants for analytics_snapshot rows.
 *
 * Each metric maps to a row in the analytics_snapshot table. Category scores
 * correspond to template question section categories (wellbeing, engagement,
 * performance, career, feedback, mood). Operational metrics track meeting
 * adherence and action item follow-through.
 */
export const METRIC_NAMES = {
  SESSION_SCORE: "session_score",
  WELLBEING: "wellbeing_score",
  ENGAGEMENT: "engagement_score",
  PERFORMANCE: "performance_score",
  CAREER: "career_score",
  FEEDBACK: "feedback_score",
  MOOD: "mood_score",
  ACTION_COMPLETION_RATE: "action_completion_rate",
  MEETING_ADHERENCE: "meeting_adherence",
} as const;

export type MetricName = (typeof METRIC_NAMES)[keyof typeof METRIC_NAMES];

/**
 * Categories that map to template question sections.
 * Used to compute per-category averages from session answers.
 */
export const CATEGORY_METRICS: Record<string, MetricName> = {
  wellbeing: METRIC_NAMES.WELLBEING,
  engagement: METRIC_NAMES.ENGAGEMENT,
  performance: METRIC_NAMES.PERFORMANCE,
  career: METRIC_NAMES.CAREER,
  feedback: METRIC_NAMES.FEEDBACK,
  mood: METRIC_NAMES.MOOD,
};

/**
 * Answer types that produce numeric values suitable for averaging.
 */
export const SCORABLE_ANSWER_TYPES = new Set([
  "rating_1_5",
  "rating_1_10",
  "mood",
  "scale_custom",
]);
