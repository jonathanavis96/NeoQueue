/**
 * Experimental feature flags for the renderer.
 *
 * Why: Lets us prototype future-direction UX (e.g. Canvas) without destabilizing v1.
 *
 * Conventions:
 * - Flags are read-only at runtime and driven by Vite env vars.
 * - Use explicit VITE_* names so they can be configured at build time.
 */

export type ExperimentalFlags = Readonly<{
  canvas: boolean;
  autocomplete: boolean;
}>;

const parseBooleanEnv = (value: string | boolean | undefined): boolean => {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return value === 'true' || value === '1' || value.toLowerCase() === 'yes';
};

export const getEnvExperimentalFlags = (): ExperimentalFlags =>
  Object.freeze({
    canvas: parseBooleanEnv(import.meta.env.VITE_EXPERIMENTAL_CANVAS),
    autocomplete: parseBooleanEnv(import.meta.env.VITE_EXPERIMENTAL_AUTOCOMPLETE),
  });

export const mergeExperimentalFlags = (
  base: ExperimentalFlags,
  overrides?: Partial<ExperimentalFlags>
): ExperimentalFlags => {
  return {
    canvas: typeof overrides?.canvas === 'boolean' ? overrides.canvas : base.canvas,
    autocomplete: typeof overrides?.autocomplete === 'boolean' ? overrides.autocomplete : base.autocomplete,
  };
};
