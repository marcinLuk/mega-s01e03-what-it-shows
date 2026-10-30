// The problems #4471 holds once its reports are split by what went wrong. Pages explain it; this file is what runs.

// causes.ts says which cause a report's tenant and channel point to. desk-notes.json lists the reports the desk
// read as a one-day move: their date lands a day off, not with day and month swapped, so no cause in causes.ts
// explains them and they get a problem of their own.
import { CAUSES, causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day';

// Each problem has its own ticket in the repo that holds this kb page.
export const TICKETS = 'https://github.com/marcinLuk/mega-s01e03-what-it-shows/issues';

export const PROBLEMS: Record<Problem, { what: string; ticket: number }> = {
  parser: { what: 'shared parser reads every date month first; day-first tenants get day and month swapped', ticket: 1 },
  hint: { what: 'booking-v3 form prints MM/DD/YYYY under its date field and reads the answer day first', ticket: 2 },
  'one-day': { what: 'the date lands one day off: a time zone or DST shift, not a swap', ticket: 3 },
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem | null {
  return oneDayMove.includes(r.id) ? 'one-day' : causeOf(r, t);
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of uniqueById(reports)) {
    const problem = problemOf(r, tenantOf(r), oneDayMove) ?? 'unplaced';
    byProblem.set(problem, [...(byProblem.get(problem) ?? []), r]);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}

// Reports intake tagged with the other cause: `parser` reports tagged `hint` and the reverse. Intake has no tag
// for a one-day move, so those are left out.
export function mistagged(groups: ProblemGroup[]): number {
  return groups
    .filter((g) => (CAUSES as readonly string[]).includes(g.problem))
    .reduce((n, g) => n + g.reports.filter((r) => r.meta.intakeTag !== g.problem).length, 0);
}
