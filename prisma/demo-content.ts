/**
 * What the demo account's library contains.
 *
 * The point of the demo is to show the product working, so these are whole
 * meetings — transcript, speakers, summary, citations, triaged actions — not
 * empty rows. Two are left mid-pipeline and failed so those states are
 * reachable too.
 *
 * Citations are written as a snippet of the line they come from, not as an
 * index. `resolveLine` below fails loudly if a snippet matches no line or
 * more than one, so a citation can never silently drift onto the wrong line
 * when the dialogue is edited — which would undermine the one claim the
 * product makes.
 */

import type { ActionItemStatus, MeetingStatus } from "@/generated/prisma/enums";

export type DemoLine = { speaker: string; text: string };

export type DemoPoint = {
  text: string;
  /** Unique snippet of the line this came from. Null means a dropped citation. */
  cite: string | null;
};

export type DemoAction = {
  text: string;
  assignee: string | null;
  cite: string | null;
  status: ActionItemStatus;
};

export type DemoMeeting = {
  title: string;
  status: MeetingStatus;
  /** Days before the seed run, so the library always looks recent. */
  daysAgo: number;
  lines: DemoLine[];
  headline: string | null;
  overview: string | null;
  points: DemoPoint[];
  actionItems: DemoAction[];
  failureStage?: string;
  failureReason?: string;
};

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

/** Roughly conversational pace, so timecodes look like a real recording. */
const WORDS_PER_SECOND = 2.8;
const GAP_MS = 400;
const LEAD_IN_MS = 4_080;

export type TimedLine = DemoLine & { index: number; startMs: number; endMs: number };

/** Lay the dialogue out in time, giving longer lines proportionally longer. */
export function timeLines(lines: readonly DemoLine[]): TimedLine[] {
  let cursor = LEAD_IN_MS;

  return lines.map((line, index) => {
    const words = line.text.trim().split(/\s+/).length;
    const durationMs = Math.max(1_200, Math.round((words / WORDS_PER_SECOND) * 1000));
    const startMs = cursor;
    cursor = startMs + durationMs + GAP_MS;
    return { ...line, index, startMs, endMs: startMs + durationMs };
  });
}

export function durationSecFor(timed: readonly TimedLine[]): number {
  if (timed.length === 0) return 0;
  // A little room after the last word, as a real recording would have.
  return Math.round((timed[timed.length - 1].endMs + 6_000) / 1000);
}

/**
 * Find the single line containing `snippet`. Throws rather than guessing:
 * a citation that points at the wrong moment is worse than a failed seed.
 */
export function resolveLine(timed: readonly TimedLine[], snippet: string): TimedLine {
  const matches = timed.filter((line) => line.text.includes(snippet));
  if (matches.length === 0) {
    throw new Error(`Demo citation matches no line: "${snippet}"`);
  }
  if (matches.length > 1) {
    throw new Error(`Demo citation is ambiguous (${matches.length} lines): "${snippet}"`);
  }
  return matches[0];
}

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

const productWeekly: DemoMeeting = {
  title: "Product Weekly Sync",
  status: "READY",
  daysAgo: 1,
  headline: "Onboarding drop-off blocks the Q3 launch.",
  overview:
    "Activation fell to 54% after the workspace step shipped, and the team traced most of the loss to a required field that was never meant to be mandatory. Engineering estimated two sprints to rebuild the step, and the group agreed to hold the launch date until drop-off is measured again.",
  lines: [
    { speaker: "Speaker 1", text: "Let's start with onboarding. The activation numbers came in yesterday and they're not great." },
    { speaker: "Speaker 2", text: "Right. We're at fifty-four percent activation for the week, down from sixty-eight before the workspace step shipped." },
    { speaker: "Speaker 1", text: "Fourteen points is a lot. Do we know where exactly people are falling out?" },
    { speaker: "Speaker 3", text: "I pulled the funnel this morning. Almost all of it is the workspace creation screen. About a third of people who reach it never finish it." },
    { speaker: "Speaker 2", text: "That matches what support is seeing. We've had maybe twenty tickets this month that all say some version of I can't get past the setup page." },
    { speaker: "Speaker 1", text: "Is it a bug or is it the design?" },
    { speaker: "Speaker 3", text: "Both, I think. There's a validation error on the team size field that fires even when the field is empty, and the field isn't actually required." },
    { speaker: "Speaker 2", text: "So people fill in something arbitrary just to get past it, or they give up." },
    { speaker: "Speaker 3", text: "That's the pattern, yes. The ones who do push through take about four minutes on that screen alone." },
    { speaker: "Speaker 1", text: "Four minutes is an eternity for what should be a single text input." },
    { speaker: "Speaker 2", text: "Agreed. I'd rather we take the whole step apart than patch the validation and move on." },
    { speaker: "Speaker 1", text: "What's the effort to rebuild it properly?" },
    { speaker: "Speaker 3", text: "We estimate two sprints to rebuild the workspace step end to end, including the migration for existing accounts." },
    { speaker: "Speaker 1", text: "Two sprints puts us right against the Q3 launch date." },
    { speaker: "Speaker 2", text: "I think that's the right trade. Launching on time with a funnel that leaks a third of signups isn't really launching." },
    { speaker: "Speaker 1", text: "Fair. Let's hold the date until we've re-measured drop-off after the rebuild." },
    { speaker: "Speaker 3", text: "I'll put the scope together and have it ready for review by Thursday." },
    { speaker: "Speaker 1", text: "Thanks. And can someone own re-running the analytics once it ships?" },
    { speaker: "Speaker 2", text: "I'll take that. I'll set up the before and after comparison so we're not arguing about it later." },
    { speaker: "Speaker 1", text: "Good. Anything else on onboarding before we move to billing?" },
    { speaker: "Speaker 3", text: "One thing. Marketing asked about a launch announcement, but I'd hold until we know the numbers moved." },
    { speaker: "Speaker 1", text: "Let's park that for now. Moving on." },
  ],
  points: [
    { text: "Activation fell to 54%, down 14 points since the workspace step shipped", cite: "fifty-four percent activation" },
    { text: "About a third of people who reach workspace creation never finish it", cite: "never finish it" },
    { text: "A validation error fires on a field that is not actually required", cite: "isn't actually required" },
    { text: "Rebuilding the step end to end is estimated at two sprints", cite: "two sprints to rebuild" },
    { text: "The Q3 launch date is on hold until drop-off is re-measured", cite: "hold the date until" },
    // Deliberately uncited: shows how a dropped citation renders.
    { text: "A launch announcement was raised but not decided", cite: null },
  ],
  actionItems: [
    { text: "Put the workspace-step rebuild scope together for review by Thursday", assignee: "Speaker 3", cite: "ready for review by Thursday", status: "ACCEPTED" },
    { text: "Set up a before/after activation comparison once the rebuild ships", assignee: "Speaker 2", cite: "before and after comparison", status: "ACCEPTED" },
    { text: "Fix the team size field validation firing on an empty value", assignee: "Speaker 3", cite: "validation error on the team size field", status: "PROPOSED" },
    { text: "Draft the launch announcement with marketing", assignee: null, cite: "Marketing asked about a launch announcement", status: "DISMISSED" },
  ],
};

const q3Planning: DemoMeeting = {
  title: "Q3 Planning — Engineering",
  status: "READY",
  daysAgo: 3,
  headline: "Q3 commits to the migration; search slips to Q4.",
  overview:
    "The team has roughly eleven engineer-weeks of capacity after on-call and holiday, which is not enough for both the Postgres migration and cross-meeting search. The migration won on the grounds that it unblocks everything else, and search moved to Q4.",
  lines: [
    { speaker: "Speaker 1", text: "The goal today is to leave with a Q3 list we actually believe in, not a wish list." },
    { speaker: "Speaker 2", text: "Then we should start with capacity, because I don't think we've been honest about it." },
    { speaker: "Speaker 1", text: "Go ahead." },
    { speaker: "Speaker 2", text: "We have four engineers, but one is on call for half the quarter and two have holiday booked in August. Realistically it's about eleven engineer-weeks." },
    { speaker: "Speaker 3", text: "Eleven. And the draft roadmap has the Postgres migration and cross-meeting search both landing in Q3." },
    { speaker: "Speaker 2", text: "Which is maybe eighteen weeks of work between them, so one of them isn't happening." },
    { speaker: "Speaker 1", text: "Then let's pick now rather than discover it in September." },
    { speaker: "Speaker 4", text: "I'd argue for the migration. Search is built on top of the same tables, so doing search first means doing parts of it twice." },
    { speaker: "Speaker 3", text: "That's true. The migration unblocks search, action item history, and the retention work we keep deferring." },
    { speaker: "Speaker 2", text: "It's also the less exciting one, which is usually a sign it's the one we should do." },
    { speaker: "Speaker 1", text: "Any argument for search going first?" },
    { speaker: "Speaker 4", text: "Only that it's the thing customers ask for. But asking for it in Q4 instead of Q3 isn't going to lose anyone." },
    { speaker: "Speaker 1", text: "Then the migration is the Q3 commitment and search moves to Q4. Let's write that down somewhere people will see it." },
    { speaker: "Speaker 3", text: "I'll update the roadmap doc and flag the change in the Monday note so nobody is surprised." },
    { speaker: "Speaker 2", text: "One risk worth naming. The migration needs a maintenance window and we've never done one with customers on the platform." },
    { speaker: "Speaker 1", text: "How long a window?" },
    { speaker: "Speaker 2", text: "Best guess is forty minutes, but I'd want to rehearse it against a copy of production before we commit to a number publicly." },
    { speaker: "Speaker 4", text: "I can set up the rehearsal environment next week. It's mostly a restore and a script." },
    { speaker: "Speaker 1", text: "Do that, and let's not announce a window until the rehearsal gives us a real number." },
    { speaker: "Speaker 3", text: "Agreed. I'd rather say nothing than say forty minutes and take two hours." },
  ],
  points: [
    { text: "Real Q3 capacity is about eleven engineer-weeks after on-call and holiday", cite: "eleven engineer-weeks" },
    { text: "The migration and search together are roughly eighteen weeks of work", cite: "eighteen weeks of work" },
    { text: "The migration unblocks search, action item history and retention work", cite: "unblocks search" },
    { text: "Cross-meeting search moves to Q4", cite: "search moves to Q4" },
    { text: "The maintenance window must be rehearsed before any number is announced", cite: "rehearse it against a copy of production" },
  ],
  actionItems: [
    { text: "Update the roadmap doc and flag the change in the Monday note", assignee: "Speaker 3", cite: "update the roadmap doc", status: "ACCEPTED" },
    { text: "Set up a migration rehearsal environment next week", assignee: "Speaker 4", cite: "set up the rehearsal environment", status: "ACCEPTED" },
    { text: "Hold the maintenance window announcement until the rehearsal has a real number", assignee: "Speaker 1", cite: "not announce a window", status: "PROPOSED" },
  ],
};

const customerInterview: DemoMeeting = {
  title: "Customer Interview — Northwind Logistics",
  status: "READY",
  daysAgo: 6,
  headline: "Weekly reporting is manual and nobody trusts the numbers.",
  overview:
    "Northwind rebuilds the same operations report by hand every Monday, taking most of a morning across two people. The deeper problem is trust: because the numbers are assembled manually, meetings routinely stall arguing about whether the figures are right.",
  lines: [
    { speaker: "Speaker 1", text: "Thanks for making the time. I mostly want to understand how reporting works for your team today, before we talk about anything we might build." },
    { speaker: "Speaker 2", text: "Happy to. Honestly the answer is that it works because two people spend every Monday morning making it work." },
    { speaker: "Speaker 1", text: "Tell me about that Monday morning." },
    { speaker: "Speaker 2", text: "We pull three exports, one from the warehouse system, one from the carrier portal, and one from our own database. Then we paste them into a spreadsheet that somebody built four years ago." },
    { speaker: "Speaker 1", text: "And how long does that take end to end?" },
    { speaker: "Speaker 2", text: "About three hours between the two of us, most weeks. Longer if a carrier changes their export format, which happens more than you'd think." },
    { speaker: "Speaker 1", text: "What happens with the report once it's done?" },
    { speaker: "Speaker 2", text: "It goes to the operations meeting at eleven. And this is the part that actually bothers me more than the three hours." },
    { speaker: "Speaker 1", text: "Go on." },
    { speaker: "Speaker 2", text: "We spend the first twenty minutes of that meeting arguing about whether the numbers are right, instead of deciding anything." },
    { speaker: "Speaker 1", text: "Because people don't trust a manually assembled number." },
    { speaker: "Speaker 2", text: "Exactly. And they're not wrong to be suspicious, because we have made mistakes. Someone pasted a column one row off in March and we under-reported delays for two weeks." },
    { speaker: "Speaker 1", text: "Did anything change after that?" },
    { speaker: "Speaker 2", text: "We added a second person to check it, which is why it's two people now instead of one. So the fix made it slower rather than safer." },
    { speaker: "Speaker 1", text: "If the report produced itself on Monday morning, what would actually change for you?" },
    { speaker: "Speaker 2", text: "The meeting would be about decisions. Right now it's about arithmetic." },
    { speaker: "Speaker 1", text: "That's a useful way to put it. Last question. Have you looked at tools for this before?" },
    { speaker: "Speaker 2", text: "We trialled something two years ago but it needed a data warehouse we don't have, so it never got past the trial." },
  ],
  points: [
    { text: "Three source exports are pasted into a four-year-old spreadsheet each week", cite: "pull three exports" },
    { text: "Reporting takes about three hours across two people every Monday", cite: "three hours between the two of us" },
    { text: "The first twenty minutes of the operations meeting goes to arguing about the numbers", cite: "arguing about whether the numbers are right" },
    { text: "A paste error under-reported delays for two weeks in March", cite: "one row off in March" },
    { text: "A previous tool failed because it required a data warehouse they do not have", cite: "needed a data warehouse" },
  ],
  actionItems: [
    { text: "Share the current Monday spreadsheet template for review", assignee: "Speaker 2", cite: "spreadsheet that somebody built four years ago", status: "PROPOSED" },
    { text: "Follow up on which carrier export formats change most often", assignee: "Speaker 1", cite: "carrier changes their export format", status: "PROPOSED" },
  ],
};

/** Mid-pipeline, so the processing view and its status chip are reachable. */
const inProgress: DemoMeeting = {
  title: "All-Hands — Q3 Kickoff",
  status: "TRANSCRIBING",
  daysAgo: 0,
  headline: null,
  overview: null,
  lines: [],
  points: [],
  actionItems: [],
};

/** Failed, so the failure panel and its retry are reachable. */
const failed: DemoMeeting = {
  title: "Vendor Call — Acme Security Review",
  status: "FAILED",
  daysAgo: 4,
  headline: null,
  overview: null,
  lines: [],
  points: [],
  actionItems: [],
  failureStage: "TRANSCRIBING",
  failureReason: "Deepgram could not transcribe that file: the audio track is silent.",
};

/** Newest first is how the library sorts, but seeding order does not matter. */
export const demoLibrary: readonly DemoMeeting[] = [
  inProgress,
  productWeekly,
  q3Planning,
  failed,
  customerInterview,
];
