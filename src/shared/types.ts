export type ScheduleKind = 'daily' | 'weekdays' | 'weekly' | 'one_time';
export type ChoreApprovalState = 'unclaimed' | 'pending' | 'approved' | 'rejected';
export type ChoreApprovalSource = 'child_claim' | 'parent_override' | 'parent_direct' | 'legacy_weekly' | null;

export interface ScheduleDefinition {
  kind: ScheduleKind;
  weekdays?: number[];
  date?: string;
}

export interface ChecklistOccurrence {
  id: string;
  date: string;
  title: string;
  rewardCents: number;
  claimed: boolean;
  state: ChoreApprovalState;
  approvalSource: ChoreApprovalSource;
  eligible: boolean;
  future: boolean;
  locked: boolean;
  decisionNote: string | null;
}

export interface ChecklistDay {
  date: string;
  label: string;
  isToday: boolean;
  isFuture: boolean;
  occurrences: ChecklistOccurrence[];
}

export interface ChecklistResponse {
  weekStart: string;
  weekEnd: string;
  today: string;
  timezone: string;
  weekApproved: boolean;
  days: ChecklistDay[];
  lateClaimDay: ChecklistDay | null;
}

export interface ChoreSummary {
  id: string;
  title: string;
  rewardCents: number;
  schedule: ScheduleDefinition;
  effectiveFrom: string;
  pendingEffectiveFrom: string | null;
  archived: boolean;
  isDefault: boolean;
}

export interface ParentStatus {
  configured: boolean;
  authorized: boolean;
  expiresAt: string | null;
  parentLabel?: string | null;
}

export interface AllowanceActivity {
  id: string;
  kind: 'earning' | 'adjustment' | 'payment';
  nominalCents: number;
  balanceEffectCents: number;
  description: string;
  parentLabel: string;
  createdAt: string;
  weekStart: string | null;
}

export interface AllowanceSummary {
  claimedThisWeekCents: number;
  approvedBalanceCents: number;
  totalApprovedCents: number;
  totalPaidCents: number;
  payments: AllowanceActivity[];
  recentActivity: AllowanceActivity[];
}

export interface ReviewOccurrence {
  id: string;
  date: string;
  title: string;
  rewardCents: number;
  claimed: boolean;
  state: ChoreApprovalState;
  approvalSource: ChoreApprovalSource;
}

export interface ReviewWeek {
  weekStart: string;
  weekEnd: string;
  approved: boolean;
  claimedCount: number;
  occurrenceCount: number;
  claimedCents: number;
  approvedTotalCents: number | null;
}

export interface ApprovalLineView {
  id: string;
  occurrenceId: string;
  date: string;
  title: string;
  decision: 'approved' | 'rejected' | 'corrected';
  claimed: boolean;
  originalRewardCents: number;
  approvedRewardCents: number;
  currentHistoricalCents: number;
  note: string | null;
  source: ChoreApprovalSource;
}

export interface ApprovedWeekView {
  id: string;
  weekStart: string;
  totalCents: number;
  approvedAt: string;
  approvedByLabel: string;
  lines: ApprovalLineView[];
}

export interface CalendarDayView {
  date: string;
  inMonth: boolean;
  occurrenceCount: number;
  claimedCount: number;
  approvedCents: number | null;
  locked: boolean;
  titles: string[];
  pendingCount: number;
  missedCount: number;
  occurrences: CalendarOccurrenceView[];
}

export interface CalendarOccurrenceView {
  id: string;
  date: string;
  title: string;
  rewardCents: number;
  claimed: boolean;
  state: ChoreApprovalState;
  approvalSource: ChoreApprovalSource;
  childEligible: boolean;
  overrideEligible: boolean;
  decisionNote: string | null;
}

export interface CalendarResponse {
  month: string;
  days: CalendarDayView[];
}

export interface HouseholdPreferences {
  theme: string;
}

export type OverworldWeatherAppearance = 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'snow' | 'fog';

export interface OverworldWeatherResponse {
  appearance: OverworldWeatherAppearance;
  weatherCode: number | null;
  temperatureC: number | null;
  isDay: boolean | null;
  cloudCover: number | null;
  observedAt: string;
  sunrise: string | null;
  sunset: string | null;
  fetchedAt: string;
  stale: boolean;
  source: 'open-meteo' | 'cache' | 'fallback';
  attribution: 'Open-Meteo';
}
