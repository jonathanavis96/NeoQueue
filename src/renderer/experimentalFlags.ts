/**
 * Experimental feature flags for the renderer.
 *
 * Conventions:
 * - Flags are read-only at runtime and driven by Vite env vars.
 * - Use explicit VITE_* names so they can be configured at build time.
 */

export type ExperimentalFlags = Readonly<{
  autocomplete: boolean;
}>;

const parseBooleanEnv = (value: string | boolean | undefined): boolean => {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return value === 'true' || value === '1' || value.toLowerCase() === 'yes';
};

export const getEnvExperimentalFlags = (): ExperimentalFlags =>
  Object.freeze({
    autocomplete: parseBooleanEnv(import.meta.env.VITE_EXPERIMENTAL_AUTOCOMPLETE),
  });

export const mergeExperimentalFlags = (
  base: ExperimentalFlags,
  overrides?: Partial<ExperimentalFlags>
): ExperimentalFlags => {
  return {
    autocomplete: typeof overrides?.autocomplete === 'boolean' ? overrides.autocomplete : base.autocomplete,
  };
};
