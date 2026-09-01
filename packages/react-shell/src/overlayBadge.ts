import type { AppshellComposition } from '@appshell/config';

/**
 * Marks a page a per-developer overlay has changed — redirected remotes, a development
 * shell, or a substituted theme.
 *
 * Deliberately plain DOM in its own element rather than a component inside the React
 * tree, for two reasons. It has to survive a crash in the composed app — the moment
 * the page misbehaves is exactly when knowing your remotes are not the published ones
 * matters most — and nothing about it is React-specific, so it lifts into a shared
 * package unchanged the day a second shell implementation exists.
 *
 * Styles are inline: the badge renders alongside whatever CSS the remotes ship, and a
 * stylesheet of its own would be one more thing for them to override.
 */

const CONTAINER_ID = 'appshell-overlay-badge';

const styles = {
  container: [
    'position:fixed',
    'bottom:12px',
    'left:12px',
    'z-index:2147483647',
    'max-width:min(420px, calc(100vw - 24px))',
    'padding:8px 12px',
    'border-radius:6px',
    'border:1px solid #f0b429',
    'background:#3d3016',
    'color:#f7e3a1',
    'font:12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
    'box-shadow:0 2px 8px rgba(0,0,0,.35)',
  ].join(';'),
  summary: 'cursor:pointer;font-weight:600;list-style:none',
  list: 'margin:6px 0 0;padding-left:16px',
};

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const overlayBadgeMarkup = (
  remotes: string[],
  shellFlavor: 'prod' | 'dev' = 'prod',
  theme?: string,
): string => {
  const changes = [
    shellFlavor === 'dev' && 'development shell',
    remotes.length && `${remotes.length} remote${remotes.length === 1 ? '' : 's'} redirected`,
    // Named, not just counted. A theme changes what the whole page looks like, so the
    // useful question is which one — otherwise the badge says something is different
    // while the difference is the very thing you are looking at.
    theme && `theme ${escape(theme)}`,
  ].filter(Boolean);

  const items = remotes
    // The keys come from the registry's own composition, but this string is written
    // straight into innerHTML, so it is escaped rather than trusted by provenance.
    .map((key) => `<li>${escape(key)}</li>`)
    .join('');

  return [
    `<details style="${styles.container}" open>`,
    `<summary style="${styles.summary}">⚠ Development overlay — ${changes.join(', ')}</summary>`,
    items ? `<ul style="${styles.list}">${items}</ul>` : '',
    '</details>',
  ].join('');
};

export default (composition?: AppshellComposition): void => {
  const overlay = composition?.overlay;

  // The registry only emits the block when an overlay changed something, so its mere
  // presence is the signal. A shell-only overlay has no remotes and still has to show.
  if (!overlay || document.getElementById(CONTAINER_ID)) return;

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.innerHTML = overlayBadgeMarkup(
    overlay.remotes ?? [],
    overlay.shellFlavor,
    overlay.theme,
  );

  document.body.appendChild(container);
};
