#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * @appshell/cli package API
 */
import { hideBin } from 'yargs/helpers';
import { buildCli } from './cli';

buildCli(hideBin(process.argv))
  /*
   * yargs calls this for two unlike things: a usage error, where it passes `msg`, and an
   * error thrown by a handler, where it passes `err`. Only the first is answered by the
   * help text — pointing at it after a failed publish or an untrusted certificate sends
   * the reader somewhere that says nothing about what went wrong.
   */
  .fail((msg, err) => {
    console.error(err ? err.message : msg);

    if (!err) {
      console.error('You can use --help to see available options');
    }

    process.exit(1);
  })
  .parse();
