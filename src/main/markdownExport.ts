/**
 * Markdown export rendering (no Electron imports, so it can be unit tested).
 */
import type { AppState } from '../shared/types';

const escapeMarkdown = (value: string): string => {
  // Avoid turning headings/lists/emphasis into markdown syntax unexpectedly.
  // 1) escape backslashes, then 2) escape common markdown control chars.
  return value.replace(/\\/g, '\\\\').replace(/([[[*_`\]])/g, '\\$1');
};

const formatDate = (value: Date | string | number | undefined): string => {
  // Manager-friendly: YYYY-MM-DD in the user's local time zone. toISOString()
  // would give the UTC date (yesterday for late-night items east of UTC) and
  // throws a RangeError on an Invalid Date, aborting the whole export.
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const toMarkdown = (data: AppState): string => {
  const active = data.items.filter((i) => !i.isCompleted);
  const discussed = data.items.filter((i) => i.isCompleted);

  const lines: string[] = [];
  lines.push(`# NeoQueue Export`);
  lines.push('');
  lines.push(`Generated: ${formatDate(new Date())}`);
  lines.push('');

  const renderSection = (title: string, sectionItems: typeof data.items) => {
    lines.push(`## ${title}`);
    lines.push('');

    if (sectionItems.length === 0) {
      lines.push('_No items._');
      lines.push('');
      return;
    }

    sectionItems.forEach((item, idx) => {
      const created = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
      const completed = item.completedAt
        ? item.completedAt instanceof Date
          ? item.completedAt
          : new Date(item.completedAt)
        : undefined;

      const header = `${idx + 1}. ${escapeMarkdown(item.text)}`;
      lines.push(header);
      lines.push(`   - Created: ${formatDate(created)}`);
      if (completed) lines.push(`   - Discussed: ${formatDate(completed)}`);

      if (item.followUps?.length) {
        lines.push('   - Follow-ups:');
        item.followUps.forEach((fu) => {
          const fuCreated = fu.createdAt instanceof Date ? fu.createdAt : new Date(fu.createdAt);
          lines.push(`     - ${escapeMarkdown(fu.text)} _(${formatDate(fuCreated)})_`);
        });
      }

      lines.push('');
    });
  };

  renderSection('Active', active);
  renderSection('Discussed', discussed);

  return lines.join('\n');
};
