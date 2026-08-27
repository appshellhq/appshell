import React, { FC, ReactNode } from 'react';

type AppShowcaseProps = {
  header: ReactNode | string;
  children: ReactNode;
};

const AppShowcase: FC<AppShowcaseProps> = ({ header, children }) => (
  <div className="flex w-[400px] min-w-0 max-w-full flex-col overflow-hidden rounded-lg bg-surface-raised px-lg pb-lg text-on-surface-raised shadow-md">
    <header className="text-h3">{header}</header>
    <div className="flex min-h-0 grow">{children}</div>
  </div>
);

export default AppShowcase;
