import { RemoteSlot } from '@appshell/react';
import { PackageBlock } from 'react-appshell-host-components';
import pkg from '../package.json';
import AppshellLogo from './assets/appshell-logo.svg';
import ReactLogo from './assets/react-logo.svg';
import WebpackLogo from './assets/webpack-logo.svg';
import env from './env';
import './index.css';

const LINK = 'text-primary hover:text-primary-hover';
// The wordmarks inherit `currentColor`, and these sit inside links — so the text colour
// is set here explicitly rather than picking up the link's accent, which would put a
// 2.66:1 wordmark on a light surface.
const LOGO = 'h-[12vmin] pointer-events-none text-on-surface';

/** Matches the AppShowcase card the remote renders, so nothing shifts when it arrives. */
const CardSkeleton = () => (
  <div
    aria-hidden="true"
    className="h-[520px] w-[400px] animate-pulse rounded-lg bg-surface-raised px-lg pb-lg"
  >
    <div className="mt-lg h-6 w-1/2 rounded-sm bg-border" />
    <div className="mt-lg h-[400px] w-full rounded-sm bg-border" />
  </div>
);

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
          <ReactLogo className={LOGO} role="img" aria-label="React" />
        </a>
        <div className="flex select-none self-center text-h1 after:content-['+']" />
        <a className={LINK} href={env.SUPPORT_URL} target="_blank" rel="noopener noreferrer">
          <AppshellLogo className={LOGO} role="img" aria-label="Appshell" />
        </a>
        <div className="flex select-none self-center text-h1 after:content-['+']" />
        <a
          className={LINK}
          href="https://webpack.js.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <WebpackLogo className={LOGO} role="img" aria-label="Webpack" />
        </a>
      </div>

      <pre className="font-mono">This application is composed from 3 micro-frontends.</pre>

      {/*
        Inner slots supply their own fallback; the shell only ever covered the root.

        A skeleton the size of the card that replaces it, rather than a spinner. The
        package cannot know its own dimensions — they depend on where it is placed — but
        whoever writes the slot does, which is what the `fallback` prop is for. Sizing it
        correctly also stops the page jumping when the remote arrives.
      */}
      <div className="grid grid-flow-col gap-lg">
        <RemoteSlot remote="PingModule/Ping" fallback={<CardSkeleton />} />
        <RemoteSlot remote="PongModule/Pong" fallback={<CardSkeleton />} />
      </div>
    </header>
  </div>
);

export default Container;
