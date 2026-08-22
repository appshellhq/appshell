import type { AppshellComposition } from '@appshell/config';

/**
 * Marks a page whose remotes have been redirected by a per-developer overlay.
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

export const overlayBadgeMarkup = (remotes: string[]): string => {
  const count = `${remotes.length} remote${remotes.length === 1 ? '' : 's'} redirected`;

  const items = remotes
    // The keys come from the registry's own composition, but this string is written
    // straight into innerHTML, so it is escaped rather than trusted by provenance.
    .map((key) => `<li>${key.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</li>`)
    .join('');

  return (
    `<details style="${styles.container}" open>` +
    `<summary style="${styles.summary}">⚠ Development overlay — ${count}</summary>` +
    `<ul style="${styles.list}">${items}</ul>` +
    `</details>`
  );
};

export default (composition?: AppshellComposition): void => {
  const remotes = composition?.overlay?.remotes;

  if (!remotes?.length || document.getElementById(CONTAINER_ID)) return;

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.innerHTML = overlayBadgeMarkup(remotes);

  document.body.appendChild(container);
};
