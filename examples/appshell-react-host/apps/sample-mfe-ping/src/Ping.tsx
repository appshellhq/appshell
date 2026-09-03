import { useRemote } from '@appshell/react';
import { AppShowcase, PackageBlock, Remote } from 'react-appshell-host-components';
import pkg from '../package.json';
import './index.css';

const App = () => {
  const remote = useRemote();
  return (
    <AppShowcase header={<PackageBlock name={pkg.name} version={pkg.version} />}>
      {remote ? <Remote remote={remote} /> : null}
    </AppShowcase>
  );
};

export default App;
