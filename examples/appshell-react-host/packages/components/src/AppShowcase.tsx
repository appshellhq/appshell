// `React` is used implicitly: babel and tsc are both on the classic JSX runtime here, so
// the emitted code calls React.createElement and an editor that removes this import as
// unused produces a bundle that throws at runtime.
import React, { FC, ReactNode } from 'react';

type AppShowcaseProps = {
  header: ReactNode | string;
  children: ReactNode;
};

/**
 * The card each micro-frontend renders itself into.
 *
 * The rule along the top is the accent, and it is here rather than decoration: an
 * application pins `colorScheme: dark`, so every base renders a near-black surface and
 * switching one is almost invisible. The accent is what actually distinguishes a theme,
 * and until something on the page used it, `appshell dev --theme` looked like it had done
 * nothing. A demo that does not demonstrate is worse than no demo.
 */
const AppShowcase: FC<AppShowcaseProps> = ({ header, children }) => (
  <div className="flex w-[400px] min-w-0 max-w-full flex-col overflow-hidden rounded-lg border-2 border-primary bg-surface-raised px-lg pb-lg text-on-surface-raised shadow-md">
    <header className="text-h3">{header}</header>
    <div className="flex min-h-0 grow">{children}</div>
  </div>
);

export default AppShowcase;
