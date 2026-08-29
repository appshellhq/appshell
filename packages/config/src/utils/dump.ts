import yaml from 'yaml';

/**
 * Serialises a value to YAML.
 *
 * The counterpart to `load`, and here rather than at each call site so the YAML library
 * stays in one package. `appshell theme init` writes a file an author then edits, so the
 * output is line-wrapped generously — a colour value broken across lines is technically
 * valid and horrible to read.
 */
const dump = (value: unknown): string => yaml.stringify(value, { lineWidth: 0 });

export default dump;
