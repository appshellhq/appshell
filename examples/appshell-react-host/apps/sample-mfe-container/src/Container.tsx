import { RemoteSlot } from '@appshell/react';
import React from 'react';
import { PackageBlock } from 'react-appshell-host-components';
import Loading from 'react-spinners/MoonLoader';
import pkg from '../package.json';
import AppshellLogo from './assets/appshell-logo.svg';
import ReactLogo from './assets/react-logo.svg';
import WebpackLogo from './assets/webpack-logo.svg';
import env from './env';
import './index.css';

const LINK = 'text-primary hover:text-primary-hover';
const LOGO = 'h-[12vmin] pointer-events-none';

const Container = () => (
  <div className="text-center">
    {/*
      Surface and text come from the Application's theme, not from this package. It used
      to set `background-color` from a `BACKGROUND_COLOR` var, which is a colour delivered
      as runtime configuration — it works for one package and does not scale: every
      package would need its own, set per application, with nothing keeping them in step.
    */}
    <header className="flex min-h-screen flex-col items-center justify-center bg-surface font-sans text-[calc(10px+2vmin)] text-on-surface">
      <PackageBlock name={pkg.name} version={pkg.version} />

      <div className="grid grid-flow-col gap-lg">
        <a className={LINK} href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
          <img className={LOGO} src={ReactLogo} alt="React" />
        </a>
        <div className="flex select-none self-center text-h1 after:content-['+']" />
        <a className={LINK} href={env.SUPPORT_URL} target="_blank" rel="noopener noreferrer">
          <img className={LOGO} src={AppshellLogo} alt="Appshell" />
        </a>
        <div className="flex select-none self-center text-h1 after:content-['+']" />
        <a className={LINK} href="https://webpack.js.org/" target="_blank" rel="noopener noreferrer">
          <img className={LOGO} src={WebpackLogo} alt="Webpack" />
        </a>
      </div>

      <pre className="font-mono">This application is composed from 3 micro-frontends.</pre>

      {/* Inner slots supply their own fallback; the shell only ever covered the root. */}
      <div className="grid grid-flow-col gap-lg">
        <RemoteSlot remote="PingModule/Ping" fallback={<Loading color="orangered" />} />
        <RemoteSlot remote="PongModule/Pong" fallback={<Loading color="orangered" />} />
      </div>
    </header>
  </div>
);

export default Container;
