/* eslint-disable no-console */
import fs from 'fs';

export type ListConfigArgs = {
  config: string;
};

export default async (argv: ListConfigArgs) => {
  const { config } = argv;

  if (!fs.existsSync(config)) {
    console.log(`Configuration file at ${config} does not exist. Run 'appshell config init'.`);
    return;
  }

  console.log(fs.readFileSync(config, 'utf-8'));
};
