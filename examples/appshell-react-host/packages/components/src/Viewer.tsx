import { getIdentity } from '@appshell/runtime';
import { FC } from 'react';

/**
 * Who is looking at this page, as the gateway told the registry.
 *
 * The point of the component is the shape of the code rather than the pixels.
 * `Identity` is a discriminated union, so `identity.username` does not compile
 * until the anonymous branch has been handled — a package cannot accidentally
 * render an empty name for a signed-out visitor, because it cannot reach the
 * name without saying what happens when there isn't one.
 *
 * Both branches render something deliberately. An application composed of these
 * may be public, and "browsing anonymously" is a real state rather than a
 * degraded one.
 *
 * This is not proof of anything. It carries no token and grants nothing — it is
 * what the server said about the visitor, for display. Anything that matters is
 * re-checked server-side, per request.
 */
const Viewer: FC = () => {
  const identity = getIdentity();

  if (!identity.authenticated) {
    return (
      <div className="flex items-baseline gap-sm text-small">
        <span className="rounded-sm bg-surface-sunken px-sm text-on-surface-sunken">anonymous</span>
        <span className="opacity-80">not signed in</span>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-sm text-small">
      <span className="rounded-sm bg-primary px-sm text-on-primary">{identity.username}</span>
      <span className="opacity-80">
        {identity.roles.length ? identity.roles.join(', ') : 'no roles'}
      </span>
    </div>
  );
};

export default Viewer;
