#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * @appshell/cli package API
 */
import { hideBin } from 'yargs/helpers';
import { buildCli } from './cli';

buildCli(hideBin(process.argv))
  .fail((msg, err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.error(msg);
    }
    console.error('You can use --help to see available options');
    process.exit(1);
  })
  .parse();
