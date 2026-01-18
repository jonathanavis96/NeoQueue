/**
 * ProjectTabs - Horizontal scrollable tabs for project selection
 * 
 * Features:
 * - Default project always visible on left (can't be deleted)
 * - COMPLETED section always visible on right
 * - Active projects in between, scrollable with arrows
 * - Left/right arrow keys to navigate when focused
 * - Add new project with "+" button that expands to text input
 * - Right-click context menu + hover icons for rename/delete
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Project, DEFAULT_PROJECT_ID } from '../../shared/types';
import './ProjectTabs.css';

// Matrix characters for rain effect
const MATRIX_CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';
const randomChar = () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  trailLength: number;
}

// Matrix rain indicator for drop position (horizontal version)
const MatrixRainIndicator = memo(({ id }: { id: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<RainDrop[]>([]);
  const animationRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CHAR_SIZE = 12;
    const STREAM_LENGTH = 6;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();

    if (!isInitializedRef.current) {
      const charHeight = CHAR_SIZE;
      const numRows = Math.floor(canvas.getBoundingClientRect().height / charHeight);
      const activeDrops = Math.max(2, Math.floor(numRows * 0.3));
      
      dropsRef.current = [];
      for (let i = 0; i < activeDrops; i++) {
        const startX = Math.random() * 20;
        dropsRef.current.push({
          x: startX,
          y: Math.random(),
          speed: 1.5 + Math.random() * 1.5,
          chars: Array.from({ length: STREAM_LENGTH }, randomChar),
          trailLength: STREAM_LENGTH,
        });
      }
      isInitializedRef.current = true;
    }

    const animate = () => {
      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, width, height);

      const charHeight = CHAR_SIZE;

      for (const drop of dropsRef.current) {
        const x = drop.x;
        const headY = drop.y * height;

        for (let i = 0; i < drop.trailLength; i++) {
          const charY = headY - i * charHeight;
          if (charY < 0 || charY > height) continue;

          const opacity = i === 0 ? 1 : Math.max(0.1, 1 - i / drop.trailLength);
          const green = i === 0 ? 255 : Math.floor(200 - (i / drop.trailLength) * 150);
          
          ctx.fillStyle = `rgba(0, ${green}, 0, ${opacity})`;
          ctx.font = `${CHAR_SIZE}px monospace`;
          ctx.fillText(drop.chars[i], x, charY);
        }

        drop.y += drop.speed / height;

        if (drop.y * height > height + drop.trailLength * charHeight) {
          drop.y = -drop.trailLength * charHeight / height;
          drop.x = Math.random() * 20;
          drop.chars = Array.from({ length: STREAM_LENGTH }, randomChar);
        }

        if (Math.random() < 0.05) {
          const idx = Math.floor(Math.random() * drop.chars.length);
          drop.chars[idx] = randomChar();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      isInitializedRef.current = false;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      key={id}
      className="project-drop-indicator-canvas"
    />
  );
});

type DropPosition = 'before' | 'after';

interface ProjectTabsProps {
  projects: Project[];
  activeProjectId: string;
  /** Whether viewing the COMPLETED section */
  showingCompleted: boolean;
  onSelectProject: (projectId: string) => void;
  onShowCompleted: () => void;
  onAddProject: (name: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteProject: (projectId: string) => void;
  /** Called when an item is dropped on a project tab */
  onMoveItemToProject?: (itemId: string, targetProjectId: string) => void;
  /** Called when projects are reordered via drag */
  onReorderProjects?: (projects: Project[]) => void;
}

export const ProjectTabs: React.FC<ProjectTabsProps> = ({
  projects,
  activeProjectId,
  showingCompleted,
  onSelectProject,
  onShowCompleted,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  onMoveItemToProject,
  onReorderProjects,
}) => {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ projectId: string; position: DropPosition } | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Separate active and completed projects
  const activeProjects = projects.filter(p => !p.isCompleted);
  const completedProjects = projects.filter(p => p.isCompleted);

  // Focus input when adding project
  useEffect(() => {
    if (isAddingProject && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAddingProject]);

  // Focus input when editing
  useEffect(() => {
    if (editingProjectId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingProjectId]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const allProjectIds = activeProjects.map(p => p.id);
      const currentIndex = allProjectIds.indexOf(activeProjectId);
      
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onSelectProject(allProjectIds[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && currentIndex < allProjectIds.length - 1) {
        onSelectProject(allProjectIds[currentIndex + 1]);
      }
    }
  }, [activeProjects, activeProjectId, onSelectProject]);

  // Scroll with arrow buttons
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 150;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Handle add project
  const handleAddSubmit = () => {
    const trimmed = newProjectName.trim();
    if (trimmed) {
      onAddProject(trimmed);
      setNewProjectName('');
      setIsAddingProject(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSubmit();
    } else if (e.key === 'Escape') {
      setIsAddingProject(false);
      setNewProjectName('');
    }
  };

  // Handle rename
  const handleRenameSubmit = () => {
    if (editingProjectId && editingName.trim()) {
      onRenameProject(editingProjectId, editingName.trim());
    }
    setEditingProjectId(null);
    setEditingName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditingProjectId(null);
      setEditingName('');
    }
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    if (projectId === DEFAULT_PROJECT_ID) return; // Can't modify default project
    setContextMenu({ projectId, x: e.clientX, y: e.clientY });
  };

  const startRename = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setEditingProjectId(projectId);
      setEditingName(project.name);
    }
    setContextMenu(null);
  };

  const handleDelete = (projectId: string) => {
    onDeleteProject(projectId);
    setContextMenu(null);
  };

  // Drag-and-drop handlers for moving items between projects
  const handleDragOver = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // For project reordering, calculate left/right half
    if (draggingProjectId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const position: DropPosition = e.clientX < midX ? 'before' : 'after';
      
      // Don't show indicator if it would result in no change
      const draggedIndex = activeProjects.findIndex(p => p.id === draggingProjectId);
      const targetIndex = activeProjects.findIndex(p => p.id === projectId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Skip if dropping would result in no change
        if (position === 'before' && targetIndex === draggedIndex + 1) {
          setDropTarget(null);
          return;
        }
        if (position === 'after' && targetIndex === draggedIndex - 1) {
          setDropTarget(null);
          return;
        }
        if (targetIndex === draggedIndex) {
          setDropTarget(null);
          return;
        }
      }
      
      setDropTarget({ projectId, position });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if leaving the tabs area entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest('.project-tabs-inner')) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetProjectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this is a project reorder
    const draggedProjectId = e.dataTransfer.getData('application/x-project-id');
    if (draggedProjectId && onReorderProjects && dropTarget) {
      const draggedIndex = activeProjects.findIndex(p => p.id === draggedProjectId);
      const targetIndex = activeProjects.findIndex(p => p.id === dropTarget.projectId);
      
      if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
        const newProjects = [...activeProjects];
        const [removed] = newProjects.splice(draggedIndex, 1);
        
        // Calculate insert index based on position
        let insertIndex = targetIndex;
        if (dropTarget.position === 'after') {
          insertIndex = targetIndex + 1;
        }
        // Adjust for the removed item
        if (draggedIndex < insertIndex) {
          insertIndex--;
        }
        
        newProjects.splice(insertIndex, 0, removed);
        onReorderProjects([...newProjects, ...completedProjects]);
      }
      setDraggingProjectId(null);
      setDropTarget(null);
      return;
    }
    
    setDropTarget(null);
    
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId && onMoveItemToProject) {
      // Signal that drop was processed externally (to prevent QueueItemList from also processing)
      window.dispatchEvent(new CustomEvent('neoqueue:external-drop'));
      onMoveItemToProject(itemId, targetProjectId);
    }
  };

  // Project drag handlers for reordering
  const handleProjectDragStart = (e: React.DragEvent, projectId: string) => {
    if (projectId === DEFAULT_PROJECT_ID) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/x-project-id', projectId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingProjectId(projectId);
  };

  const handleProjectDragEnd = () => {
    setDraggingProjectId(null);
    setDropTarget(null);
  };

  const renderProjectTab = (project: Project) => {
    const isActive = project.id === activeProjectId && !showingCompleted;
    const isDefault = project.id === DEFAULT_PROJECT_ID;
    const isEditing = editingProjectId === project.id;
    const isDragging = draggingProjectId === project.id;
    const showDropBefore = dropTarget?.projectId === project.id && dropTarget?.position === 'before';
    const showDropAfter = dropTarget?.projectId === project.id && dropTarget?.position === 'after';

    return (
      <div
        key={project.id}
        className="project-tab-wrapper"
      >
        {showDropBefore && (
          <div className="project-drop-indicator project-drop-indicator-before">
            <MatrixRainIndicator id={`rain-${project.id}-before`} />
          </div>
        )}
        <div
          data-project-id={project.id}
          className={`project-tab ${isActive ? 'is-active' : ''} ${isDefault ? 'is-default' : ''} ${isDragging ? 'is-dragging' : ''}`}
          onClick={() => !isEditing && onSelectProject(project.id)}
          onContextMenu={(e) => handleContextMenu(e, project.id)}
          draggable={!isEditing}
          onDragStart={(e) => handleProjectDragStart(e, project.id)}
          onDragEnd={handleProjectDragEnd}
          onDragOver={(e) => handleDragOver(e, project.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, project.id)}
          role="tab"
          aria-selected={isActive}
          tabIndex={isActive ? 0 : -1}
          style={{ userSelect: 'none' }}
        >
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              className="project-tab-edit-input"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameSubmit}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="project-tab-name">{project.name}</span>
          )}
        </div>
        {showDropAfter && (
          <div className="project-drop-indicator project-drop-indicator-after">
            <MatrixRainIndicator id={`rain-${project.id}-after`} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="project-tabs" ref={tabsContainerRef} onKeyDown={handleKeyDown}>
      {/* Scroll left button */}
      <button
        className="project-tabs-scroll-btn project-tabs-scroll-left"
        onClick={() => scroll('left')}
        aria-label="Scroll left"
      >
        ◀
      </button>

      {/* Scrollable tabs container */}
      <div className="project-tabs-scroll-container" ref={scrollContainerRef}>
        <div className="project-tabs-inner" role="tablist">
          {/* Active projects */}
          {activeProjects.map(renderProjectTab)}

          {/* Add project button/input */}
          {isAddingProject ? (
            <div className="project-tab project-tab-add-input">
              <input
                ref={addInputRef}
                type="text"
                className="project-add-input"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={handleAddKeyDown}
                onBlur={() => {
                  if (!newProjectName.trim()) {
                    setIsAddingProject(false);
                  }
                }}
                placeholder="Project name..."
              />
            </div>
          ) : (
            <button
              className="project-tab project-tab-add"
              onClick={() => setIsAddingProject(true)}
              title="Add new project"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Scroll right button */}
      <button
        className="project-tabs-scroll-btn project-tabs-scroll-right"
        onClick={() => scroll('right')}
        aria-label="Scroll right"
      >
        ▶
      </button>

      {/* COMPLETED tab - always visible */}
      <div
        className={`project-tab project-tab-completed ${showingCompleted ? 'is-active' : ''}`}
        onClick={onShowCompleted}
        role="tab"
        aria-selected={showingCompleted}
      >
        <span className="project-tab-name">COMPLETED</span>
        {completedProjects.length > 0 && (
          <span className="project-tab-badge">{completedProjects.length}</span>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="project-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => startRename(contextMenu.projectId)}>
            ✎ Rename
          </button>
          <button
            className="project-context-menu-delete"
            onClick={() => handleDelete(contextMenu.projectId)}
          >
            ✕ Delete
          </button>
        </div>
      )}
    </div>
  );
};

ProjectTabs.displayName = 'ProjectTabs';
