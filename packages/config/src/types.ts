import type { AppshellIndex, AppshellRemote, Metadata } from '@appshell/runtime';
import { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema';

/*
 * The wire types moved to @appshell/runtime: a package that only wants to type a remote
 * should not install build tooling to get it. Re-exported so nothing importing them from
 * here had to change.
 */
export type { AppshellIndex, AppshellRemote, Metadata } from '@appshell/runtime';

export type Schema = JSONSchema4 | JSONSchema6 | JSONSchema7;

export type ConfigValidator = {
  validate: <T>(...config: T[]) => void;
};

export type ConfigMap = Record<string, string>;

export type PackageSpec = {
  name: string;
  version: string;
  description?: string;
  main: string;
  scripts?: { [key: string]: string };
  keywords?: string[];
  author?: string;
  license?: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
};

export type SharedModuleSpec = {
  name: string;
  shared: SharedObject;
};

export type ComparisonResult = {
  status: 'conflict' | 'missing' | 'satisfied';
  packageName: string;
  sampleModule: string;
  sampleVersion: string;
  baselineModule: string;
  baselineVersion: string;
};

export type ComparisonResults = {
  conflicts: Record<string, ComparisonResult>;
  missing: Record<string, ComparisonResult>;
  satisfied: Record<string, ComparisonResult>;
};

export type ComparisonTarget = {
  name: string;
  dependencies: Record<string, string | undefined>;
};

export type CliConfig = Record<string, string> & {
  apiKey: string;
  registry: string;
  application: string;
  scopeId: string;
  authIssuer: string;
  clientId: string;
};

/* appshell.config.yaml types */
export type AppshellConfigRemote<TMetadata = Metadata> = {
  id: string;
  url: string;
  filename: string;
  metadata: TMetadata;
};

export type AppshellConfig<TMetadata = Metadata> = {
  name?: string;
  remotes?: Record<string, AppshellConfigRemote<TMetadata>>;
  vars?: Record<string, unknown>;
  overrides?: AppshellOverrides;
};

/* appshell.template.json */
export type AppshellTemplate<TMetadata = Metadata> = {
  name?: string;
  remotes?: Record<string, AppshellConfigRemote<TMetadata>>;
  module: ModuleFederationPluginOptions;
  vars?: Record<string, unknown>;
  tokens?: Record<string, AppshellTokenUsage>;
  overrides?: AppshellOverrides;
};

/** Appshell manifest types */
export type AppshellOverrides = {
  vars: Record<string, Record<string, string | number | undefined>>;
};

/**
 * Which design tokens a package's own output reaches for. Observed from the emitted
 * assets rather than declared: the CSS already says it, and a hand-kept list is a copy
 * that drifts the first time someone adds a token and forgets the yaml.
 *
 * `required` is a reference with no fallback — the package has no plan B. `optional` is
 * `var(--appshell-x, something)`, which degrades on its own. That split is read off what
 * the author wrote rather than asked of them.
 */
export type AppshellTokenUsage = {
  required: string[];
  optional: string[];
};

export type AppshellManifest<TMetadata = Metadata> = {
  remotes: Record<string, AppshellRemote<TMetadata>>;
  modules: Record<string, ModuleFederationPluginOptions>;
  vars: Record<string, Record<string, string | number | undefined>>;
  /** Keyed by federation scope, so a merged manifest still says which package needs what. */
  tokens?: Record<string, AppshellTokenUsage>;
  overrides?: AppshellOverrides;
};

/** An `AppshellRemote` the registry already resolved, so the browser needs no manifest fetch. */
export type ResolvedRemote<TMetadata = Metadata> = AppshellRemote<TMetadata>;

/**
 * The wire contract for `window.__appshell_config__`. Deliberately not an
 * `AppshellManifest`: that is a build artifact, and reusing it left it unclear
 * which fields the browser actually needs. `modules` is build-time webpack
 * config and never crosses the wire; `vars` arrives already merged with the
 * application's overrides, leaving the browser only local overrides to apply.
 */
export type AppshellComposition<TMetadata = Metadata> = {
  /** `scope/name` — makes the payload self-describing for fetch-on-miss and for `env diff`. */
  applicationId: string;
  revision: number;
  /** The remote key the host mounts at the root, and the props it is given. */
  root: string;
  rootProps: Record<string, unknown>;
  index: AppshellIndex;
  remotes: Record<string, ResolvedRemote<TMetadata>>;
  vars: Record<string, Record<string, string | number | undefined>>;
  /**
   * Present whenever a per-developer overlay changed anything about this render — a
   * redirected remote, a different shell bundle, or both. The shell is expected to
   * surface it: a page that quietly runs code from somewhere else is the one thing
   * this feature must never be, and swapping the shell out counts.
   *
   * `shellFlavor` is what was actually served, not what was asked for.
   */
  overlay?: { id: string; remotes: string[]; shellFlavor: 'prod' | 'dev' };
};

/**
 * Advanced configuration for modules that should be exposed by this container.
 */
export interface ExposesConfig {
  /**
   * Request to a module that should be exposed by this container.
   */
  import: string | string[];

  /**
   * Custom chunk name for the exposed module.
   */
  name?: string;
}

export interface ExposesObject {
  [index: string]: string | ExposesConfig | string[];
}

/**
 * Set explicit comments for `commonjs`, `commonjs2`, `amd`, and `root`.
 */
export interface LibraryCustomUmdCommentObject {
  /**
   * Set comment for `amd` section in UMD.
   */
  amd?: string;

  /**
   * Set comment for `commonjs` (exports) section in UMD.
   */
  commonjs?: string;

  /**
   * Set comment for `commonjs2` (module.exports) section in UMD.
   */
  commonjs2?: string;

  /**
   * Set comment for `root` (global variable) section in UMD.
   */
  root?: string;
}

/**
 * Description object for all UMD variants of the library name.
 */
export interface LibraryCustomUmdObject {
  /**
   * Name of the exposed AMD library in the UMD.
   */
  amd?: string;

  /**
   * Name of the exposed commonjs export in the UMD.
   */
  commonjs?: string;

  /**
   * Name of the property exposed globally by a UMD library.
   */
  root?: string | string[];
}

/**
 * Options for library.
 */
export interface LibraryOptions {
  /**
   * Add a comment in the UMD wrapper.
   */
  auxiliaryComment?: string | LibraryCustomUmdCommentObject;

  /**
   * Specify which export should be exposed as library.
   */
  export?: string | string[];

  /**
   * The name of the library (some types allow unnamed libraries too).
   */
  name?: string | string[] | LibraryCustomUmdObject;

  /**
   * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'commonjs-static', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
   */
  type: string;

  /**
   * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
   */
  umdNamedDefine?: boolean;
}

export interface SharedConfig {
  /**
   * Include the provided and fallback module directly instead behind an async request. This allows to use this shared module in initial load too. All possible shared modules need to be eager too.
   */
  eager?: boolean;

  /**
   * Provided module that should be provided to share scope. Also acts as fallback module if no shared module is found in share scope or version isn't valid. Defaults to the property name.
   */
  import?: string | false;

  /**
   * Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
   */
  packageName?: string;

  /**
   * Version requirement from module in share scope.
   */
  requiredVersion?: string | false;

  /**
   * Module is looked up under this key from the share scope.
   */
  shareKey?: string;

  /**
   * Share scope name.
   */
  shareScope?: string;

  /**
   * Allow only a single version of the shared module in share scope (disabled by default).
   */
  singleton?: boolean;

  /**
   * Do not accept shared module if version is not valid (defaults to yes, if local fallback module is available and shared module is not a singleton, otherwise no, has no effect if there is no required version specified).
   */
  strictVersion?: boolean;

  /**
   * Version of the provided module. Will replace lower matching versions, but not higher.
   */
  version?: string | false;
}

export interface SharedObject {
  [index: string]: string | SharedConfig;
}

/**
 * Advanced configuration for container locations from which modules should be resolved and loaded at runtime.
 */
export interface RemotesConfig {
  /**
   * Container locations from which modules should be resolved and loaded at runtime.
   */
  external: string | string[];

  /**
   * The name of the share scope shared with this remote.
   */
  shareScope?: string;
}

/**
 * Container locations from which modules should be resolved and loaded at runtime. Property names are used as request scopes.
 */
export interface RemotesObject {
  [index: string]: string | RemotesConfig | string[];
}

export interface ModuleFederationPluginOptions {
  /**
   * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
   */
  exposes?: (string | ExposesObject)[] | ExposesObject;

  /**
   * The filename of the container as relative path inside the `output.path` directory.
   */
  filename?: string;

  /**
   * Options for library.
   */
  library?: LibraryOptions;

  /**
   * The name of the container.
   */
  name?: string;

  /**
   * The external type of the remote containers.
   */
  remoteType?:
    | 'import'
    | 'var'
    | 'module'
    | 'assign'
    | 'this'
    | 'window'
    | 'self'
    | 'global'
    | 'commonjs'
    | 'commonjs2'
    | 'commonjs-module'
    | 'commonjs-static'
    | 'amd'
    | 'amd-require'
    | 'umd'
    | 'umd2'
    | 'jsonp'
    | 'system'
    | 'promise'
    | 'script'
    | 'node-commonjs';

  /**
   * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
   */
  remotes?: (string | RemotesObject)[] | RemotesObject;

  /**
   * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
   */
  runtime?: string | false;

  /**
   * Share scope name used for all shared modules (defaults to 'default').
   */
  shareScope?: string;

  /**
   * Modules that should be shared in the share scope. When provided, property names are used to match requested modules in this compilation.
   */
  shared?: (string | SharedObject)[] | SharedObject;
}
