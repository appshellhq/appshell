/* eslint-disable no-console */
import chalk from 'chalk';
import express from 'express';

// Serves the built host bundle and nothing else — the registry renders the shell
// document now. This is the artifact origin an environment's hostBundleUrl points at.
const port = process.env.APPSHELL_PORT || 9000;
const app = express();

app.use(
  express.static(__dirname, {
    // Bundle filenames are content-hashed by webpack, so this is safe.
    immutable: true,
    maxAge: '1y',
    index: false,
  }),
);

app.listen(port, () => {
  console.log(chalk.cyan(`Appshell host bundle served on port ${port}`));
});
