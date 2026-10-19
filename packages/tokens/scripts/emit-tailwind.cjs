// Writes dist/tailwind.css, published as @appshell/tokens/tailwind.css, from the built bundle:
// the adapter comes from the same contract as everything else the package exports.
const { writeFileSync } = require('fs');
const { join } = require('path');
const { tailwindCss } = require('../dist/main.js');

writeFileSync(join(__dirname, '..', 'dist', 'tailwind.css'), tailwindCss());
