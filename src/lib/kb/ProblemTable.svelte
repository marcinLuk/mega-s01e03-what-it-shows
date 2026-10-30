<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, mistagged, PROBLEMS, TICKETS, type ProblemGroup } from '#lib/kb/problems';

  let { ticket }: { ticket: number } = $props();

  // Show the ids of a problem this small, so the desk can open each report.
  const LIST_UP_TO = 20;

  const rows = $derived((reports as Report[]).filter((r) => r.mergedInto === ticket));
  const merged = $derived(uniqueById(rows));
  const groups = $derived(groupByProblem(merged, tenantOf, notes.oneDayMove));
  const known = (g: ProblemGroup) => (g.problem === 'unplaced' ? null : PROBLEMS[g.problem]);
  const tags = (g: ProblemGroup) =>
    Object.entries(g.taggedAs)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, n]) => `${tag} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>
<p class="note">
  The export holds {rows.length} rows for #{ticket}; {rows.length - merged.length} are the same report exported twice and count
  once. Intake tagged {mistagged(groups)} reports with the other cause.
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tagged as</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      {@const p = known(g)}
      <tr class:wrong={!p}>
        <td><code>{g.problem}</code>{#if p}<br /><span class="what">{p.what}</span>{/if}</td>
        <td>{g.reports.length}</td>
        <td class="tags">{tags(g)}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if p}<a href="{TICKETS}/{p.ticket}">#{p.ticket}</a>{:else}no ticket yet{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#each groups as g (g.problem)}
  {@const moved = g.problem === 'one-day' ? 0 : g.reports.filter((r) => notes.oneDayMove.includes(r.id)).length}
  {#if moved}
    <p class="note">
      {moved} <code>{g.problem}</code> reports read as a one-day move: counted here, where the desk files them by tenant,
      and under <a href="{TICKETS}/{PROBLEMS['one-day'].ticket}">#{PROBLEMS['one-day'].ticket}</a>.
    </p>
  {/if}
  {#if g.reports.length <= LIST_UP_TO}
    <p class="note"><code>{g.problem}</code>: {g.reports.map((r) => r.id).join(', ')}</p>
  {/if}
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .what { color: var(--muted); font-size: 0.85em; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
  .wrong td { background: var(--warn-bg); }
</style>
