import type { InngestFunction } from "inngest";
import { postSessionPipeline, aiRetryHandler } from "./post-session";
import {
  preSessionNudgeRefresh,
  nudgeRefreshHandler,
} from "./pre-session-nudges";
import {
  computeAnalyticsSnapshot,
  analyticsSnapshotSweep,
} from "./analytics-snapshot";

export const functions: InngestFunction.Any[] = [
  postSessionPipeline,
  aiRetryHandler,
  preSessionNudgeRefresh,
  nudgeRefreshHandler,
  computeAnalyticsSnapshot,
  analyticsSnapshotSweep,
];
