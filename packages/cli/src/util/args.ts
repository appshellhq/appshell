/**
 * The options the root parser declares with `global: true`, so every command receives
 * them whether or not it declares anything of its own.
 *
 * Here rather than in a handler because it is a property of the parser, and typing a
 * command against it is what lets yargs infer a shape matching its handler — the
 * alternative being to assert one, which is how a typecheck stops catching things.
 */
export type GlobalArgs = {
  registry: string;
  scopeId: string;
  application?: string;
};
