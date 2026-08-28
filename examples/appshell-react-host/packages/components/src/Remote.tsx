import { AppshellRemote } from '@appshell/react';
import React, { FC } from 'react';

type RemoteProps = {
  remote: AppshellRemote;
};

const Remote: FC<RemoteProps> = ({ remote }) => (
  <textarea
    readOnly
    aria-label="Remote definition"
    className="min-h-[30rem] w-full resize-none rounded-sm border border-border bg-transparent p-sm font-mono text-small leading-tight text-on-surface-raised"
    value={JSON.stringify(remote, null, 2)}
  />
);

export default Remote;
