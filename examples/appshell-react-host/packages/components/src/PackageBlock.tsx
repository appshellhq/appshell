import { FC } from 'react';

type PackageBlockProps = {
  name: string;
  version: string;
};

/**
 * The version sits on the accent rather than beside the name.
 *
 * `primary` with `on-primary` is the pair the token contract guarantees is legible
 * together — the one contrast validation checks at publish. Using it here means the demo
 * shows what that guarantee buys: swap to any published theme and this stays readable,
 * because a theme that broke it could not have been published.
 */
const PackageBlock: FC<PackageBlockProps> = ({ name, version }) => (
  <div className="flex items-baseline gap-sm">
    <pre className="min-w-0 truncate">{name}</pre>
    <span className="rounded-sm bg-primary px-sm text-small text-on-primary">v{version}</span>
  </div>
);

export default PackageBlock;
