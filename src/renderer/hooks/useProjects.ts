/**
 * Custom hook for managing projects
 * Handles project CRUD, active project selection, and completion status
 */

import { useState, useEffect, useCallback } from 'react';
import { Project, DEFAULT_PROJECT_ID } from '../../shared/types';

interface UseProjectsResult {
  projects: Project[];
  activeProjectId: string;
  /** Currently viewing the COMPLETED section */
  showingCompleted: boolean;
  /** Active projects (not completed) */
  activeProjects: Project[];
  /** Completed projects */
  completedProjects: Project[];
  /** Get the current active project */
  activeProject: Project | undefined;
  /** Select a project to view */
  selectProject: (projectId: string) => void;
  /** Show the COMPLETED section */
  showCompleted: () => void;
  /** Add a new project */
  addProject: (name: string) => void;
  /** Rename an existing project */
  renameProject: (projectId: string, newName: string) => void;
  /** Delete a project (moves items to Default) */
  deleteProject: (projectId: string) => void;
  /** Mark a project as completed */
  markProjectComplete: (projectId: string) => void;
  /** Reactivate a completed project (when items are added) */
  reactivateProject: (projectId: string) => void;
  /** Update projects from external source (e.g., after data load) */
  setProjectsFromData: (projects: Project[], activeId?: string) => void;
}

// Generate a simple UUID (v4-like)
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/** Create the default project */
const createDefaultProject = (): Project => ({
  id: DEFAULT_PROJECT_ID,
  name: 'Default',
  createdAt: new Date(),
  isCompleted: false,
});

export const useProjects = (): UseProjectsResult => {
  const [projects, setProjects] = useState<Project[]>([createDefaultProject()]);
  const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECT_ID);
  const [showingCompleted, setShowingCompleted] = useState(false);

  // Derived state
  const activeProjects = projects.filter(p => !p.isCompleted);
  const completedProjects = projects.filter(p => p.isCompleted);
  const activeProject = projects.find(p => p.id === activeProjectId);

  // Select a project
  const selectProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setShowingCompleted(false);
  }, []);

  // Show completed section
  const showCompleted = useCallback(() => {
    setShowingCompleted(true);
  }, []);

  // Add a new project
  const addProject = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const newProject: Project = {
      id: generateId(),
      name: trimmed,
      createdAt: new Date(),
      isCompleted: false,
    };

    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setShowingCompleted(false);
  }, []);

  // Rename a project
  const renameProject = useCallback((projectId: string, newName: string) => {
    if (projectId === DEFAULT_PROJECT_ID) return; // Can't rename default
    const trimmed = newName.trim();
    if (!trimmed) return;

    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, name: trimmed } : p
    ));
  }, []);

  // Delete a project
  const deleteProject = useCallback((projectId: string) => {
    if (projectId === DEFAULT_PROJECT_ID) return; // Can't delete default

    setProjects(prev => prev.filter(p => p.id !== projectId));
    
    // If we deleted the active project, switch to default
    if (activeProjectId === projectId) {
      setActiveProjectId(DEFAULT_PROJECT_ID);
      setShowingCompleted(false);
    }
  }, [activeProjectId]);

  // Mark a project as completed
  const markProjectComplete = useCallback((projectId: string) => {
    if (projectId === DEFAULT_PROJECT_ID) return; // Can't complete default

    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, isCompleted: true, completedAt: new Date() }
        : p
    ));

    // Switch to default if we completed the active project
    if (activeProjectId === projectId) {
      setActiveProjectId(DEFAULT_PROJECT_ID);
    }
  }, [activeProjectId]);

  // Reactivate a completed project
  const reactivateProject = useCallback((projectId: string) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, isCompleted: false, completedAt: undefined }
        : p
    ));
  }, []);

  // Set projects from loaded data
  const setProjectsFromData = useCallback((loadedProjects: Project[], activeId?: string) => {
    // Ensure default project exists
    let projectsWithDefault = loadedProjects;
    if (!loadedProjects.find(p => p.id === DEFAULT_PROJECT_ID)) {
      projectsWithDefault = [createDefaultProject(), ...loadedProjects];
    }
    
    setProjects(projectsWithDefault);
    
    // Set active project from saved settings or default
    if (activeId && projectsWithDefault.find(p => p.id === activeId)) {
      setActiveProjectId(activeId);
    } else {
      setActiveProjectId(DEFAULT_PROJECT_ID);
    }
  }, []);

  return {
    projects,
    activeProjectId,
    showingCompleted,
    activeProjects,
    completedProjects,
    activeProject,
    selectProject,
    showCompleted,
    addProject,
    renameProject,
    deleteProject,
    markProjectComplete,
    reactivateProject,
    setProjectsFromData,
  };
};
