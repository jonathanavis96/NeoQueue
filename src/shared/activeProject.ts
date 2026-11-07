import { DEFAULT_PROJECT_ID } from './types';
import type { Project } from './types';

/**
 * Pick the project the app should be showing. The saved choice wins, then the
 * current one, and Default is the fallback so the view (and any new item) never
 * points at a project that does not exist.
 */
export const resolveActiveProjectId = (
  currentId: string,
  savedId: string | undefined,
  projects: Pick<Project, 'id'>[]
): string => {
  const exists = (id: string | undefined) => projects.some((p) => p.id === id);
  if (savedId && exists(savedId)) return savedId;
  return exists(currentId) ? currentId : DEFAULT_PROJECT_ID;
};
