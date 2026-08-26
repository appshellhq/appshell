import { generateEnv } from '@appshell/config';
import fs from 'fs';
import path from 'path';

export type GenerateEnvArgs = {
  outDir: string;
  outFile: string;
  prefix: string;
  globalName: string;
};

export default async (argv: GenerateEnvArgs): Promise<void> => {
  const { globalName, outDir, outFile, prefix } = argv;
  // eslint-disable-next-line no-console
  console.log(
    `generating appshell.env.js --prefix=${prefix} --out-dir=${outDir} --out-file=${outFile} --global-name=${globalName}`,
  );

  const vars = await generateEnv(prefix);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  return new Promise<void>((resolve) => {
    const outputFile = fs.createWriteStream(path.join(outDir, outFile));

    outputFile.write(`window.${globalName} = {\n`);

    vars.forEach((value, key) => {
      if (value) {
        let formattedValue: string | number = parseFloat(value);
        if (Number.isNaN(formattedValue)) {
          formattedValue = `'${value.replaceAll("'", '')}'`;
        }
        outputFile.write(`\t${key}: ${formattedValue},\n`);
      }
    });

    outputFile.end('}', resolve);
  });
};
