// Centralized application state for LemWriter using Zustand.
//
// Holds view routing, project context, section/editor state, theme, and UI
// flags. Side effects (localStorage, IPC, projectService) live inside actions
// so components stay thin.
//
// DOM refs like editorRef remain in the component — they are not serializable.

import { create } from 'zustand';
import { projectService } from '../services/projectService';

function loadPersisted(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

function loadPersistedBool(key, fallback) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return fallback;
  }
}

const useAppStore = create((set, get) => ({
  // ── Migration / loading ─────────────────────────────────────
  isMigrating: false,
  setIsMigrating(v) { set({ isMigrating: v }); },

  // ── View routing ──────────────────────────────────────────────
  vistaActiva: loadPersisted('lemwriter-vista-activa', 'inicio'),

  setVistaActiva(vista) {
    set({ vistaActiva: vista });
    try { localStorage.setItem('lemwriter-vista-activa', vista); } catch { /* noop */ }
  },

  // ── Sidebar ──────────────────────────────────────────────────
  sidebarCollapsed: loadPersistedBool('lemwriter-sidebar-collapsed', false),

  toggleSidebar() {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    try { localStorage.setItem('lemwriter-sidebar-collapsed', String(next)); } catch { /* noop */ }
  },

  setSidebarCollapsed(collapsed) {
    set({ sidebarCollapsed: collapsed });
    try { localStorage.setItem('lemwriter-sidebar-collapsed', String(collapsed)); } catch { /* noop */ }
  },

  // ── Project context ──────────────────────────────────────────
  projectId: null,
  projectType: null,
  project: null,
  projectName: '',
  templateKey: null,
  templateName: null,
  designTokens: {},
  smartRules: {},
  panelConfig: {},
  sections: [],
  activeSection: null,
  projectStyle: 'manuscrito_clasico',
  recentProjects: [],

  /** Fill all project fields from a full project object. */
  setProjectData(fullProject, opts = {}) {
    const { navigateToEditor = false } = opts;
    set({
      projectType: fullProject.type,
      projectId: fullProject.id,
      projectName: fullProject.title || '',
      templateKey: fullProject.template || null,
      templateName: null,
      designTokens: {},
      smartRules: {},
      panelConfig: {},
      project: fullProject,
      sections: fullProject.sections || [],
      activeSection: fullProject.sections?.[0]?.id || null,
      projectStyle: fullProject.style || 'manuscrito_clasico',
      ...(navigateToEditor ? { vistaActiva: 'editor' } : {}),
      recentProjects: get().recentProjects,
    });
    if (fullProject.theme) {
      get().setTheme(fullProject.theme);
    }
  },

  /** Clear all project state (used when navigating away). */
  clearProjectData() {
    set({
      projectId: null,
      projectType: null,
      project: null,
      projectName: '',
      templateKey: null,
      templateName: null,
      designTokens: {},
      smartRules: {},
      panelConfig: {},
      sections: [],
      activeSection: null,
      projectStyle: 'manuscrito_clasico',
    });
  },

  // ── Sections ─────────────────────────────────────────────────
  selectSection(sectionId) {
    set({ activeSection: sectionId });
  },

  addSection(newSection) {
    set((s) => ({
      sections: [...s.sections, newSection],
      activeSection: newSection.id,
    }));
  },

  updateSectionContent(sectionId, content) {
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, content } : sec,
      ),
    }));
  },

  renameSection(sectionId, title) {
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, title } : sec,
      ),
    }));
  },

  deleteSection(sectionId) {
    set((s) => ({
      sections: s.sections.filter((sec) => sec.id !== sectionId),
      activeSection: s.activeSection === sectionId ? null : s.activeSection,
    }));
  },

  refreshSection(sectionId) {
    return projectService.getSection(sectionId).then((updated) => {
      if (updated) {
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === sectionId ? updated : sec,
          ),
        }));
      }
    });
  },

  setSections(sections) {
    set({ sections });
  },

  // ── Theme ────────────────────────────────────────────────────
  theme: loadPersisted('lemwriter-theme', 'light'),

  async setTheme(newTheme) {
    set({ theme: newTheme });
    try { localStorage.setItem('lemwriter-theme', newTheme); } catch { /* noop */ }
    document.documentElement.setAttribute('data-theme', newTheme);
    await projectService.setSetting('theme', newTheme).catch(() => {});
  },

  async loadThemeFromDb() {
    try {
      const dbTheme = await projectService.getSetting('theme');
      if (dbTheme && dbTheme !== get().theme) {
        const prev = get().theme;
        get().setTheme(dbTheme);
        return dbTheme;
      }
    } catch { /* noop */ }
    return get().theme;
  },

  // ── Editor ───────────────────────────────────────────────────
  editorInstance: null,

  setEditorInstance(inst) {
    set({ editorInstance: inst });
  },

  // ── Chat ─────────────────────────────────────────────────────
  isChatOpen: false,

  setIsChatOpen(v) {
    set({ isChatOpen: v });
  },

  // ── UI modals ────────────────────────────────────────────────
  modalType: null,

  setModalType(t) {
    set({ modalType: t });
  },

  showExport: false,

  setShowExport(v) {
    set({ showExport: v });
  },

  // ── Resource / doc refresh keys ──────────────────────────────
  resourceRefreshKey: 0,
  bumpResourceRefresh() {
    set((s) => ({ resourceRefreshKey: s.resourceRefreshKey + 1 }));
  },

  docRefreshKey: 0,
  bumpDocRefresh() {
    set((s) => ({ docRefreshKey: s.docRefreshKey + 1 }));
  },

  // ── Documents ────────────────────────────────────────────────
  currentDocument: null,
  setCurrentDocument(docOrFn) {
    if (typeof docOrFn === 'function') {
      set((s) => ({ currentDocument: docOrFn(s.currentDocument) }));
    } else {
      set({ currentDocument: docOrFn });
    }
  },

  // ── Panel collapse state (layout sidebars) ──────────────────
  isLeftCollapsed: false,
  isRightCollapsed: false,
  toggleLeftPanel() {
    set((s) => ({ isLeftCollapsed: !s.isLeftCollapsed }));
  },
  toggleRightPanel() {
    set((s) => ({ isRightCollapsed: !s.isRightCollapsed }));
  },
  setLeftPanelCollapsed(v) { set({ isLeftCollapsed: v }); },
  setRightPanelCollapsed(v) { set({ isRightCollapsed: v }); },

  // ── Computed helpers (not persisted, derived on read) ───────
  isProjectOpen: () => get().vistaActiva === 'editor' && !!get().projectId,

  buildProjectData: () => {
    const s = get();
    return {
      id: s.projectId,
      type: s.projectType,
      title: s.projectName,
      template: s.templateKey,
      templateName: s.templateName,
      sections: s.sections,
      designTokens: s.designTokens,
      smartRules: s.smartRules,
      panelConfig: s.panelConfig,
      style: s.projectStyle,
    };
  },

  // ── Actions with side effects ────────────────────────────────
  async handleOpenProject(project) {
    await window.api.app.saveLastProject(project.id);
    const fullProject = await projectService.getProject(project.id);
    if (fullProject) {
      get().setProjectData(fullProject, { navigateToEditor: true });
    }
  },

  async handleConfirmCreate(type, name, selectedTemplate) {
    const formato =
      type === 'video'
        ? selectedTemplate === 'video-corto'
          ? 'corto'
          : 'largo'
        : null;
    try {
      const project = await projectService.createNewProject(
        type,
        name,
        selectedTemplate,
        null,
        formato,
      );
      const fullProject = await projectService.getProject(project.id);
      if (fullProject) {
        get().setProjectData(fullProject, { navigateToEditor: true });
      }
    } catch (err) {
      console.error('Error al crear proyecto:', err);
      alert('Hubo un error al crear el proyecto. Por favor, intenta de nuevo.');
    }
  },

  async handleOpenSection(sectionProjectId, sectionId) {
    const fullProject = await projectService.getProject(sectionProjectId);
    if (fullProject) {
      set({ vistaActiva: 'editor' });
      get().setProjectData(fullProject);
      set({ activeSection: sectionId || fullProject.sections?.[0]?.id || null });
    }
  },

  async deleteProject(id) {
    await projectService.deleteProject(id);
    const projects = await projectService.getRecentProjects();
    set({ recentProjects: projects });
  },

  setRecentProjects(projects) {
    set({ recentProjects: projects });
  },

  async saveCurrentProject() {
    const data = get().buildProjectData();
    if (data.id) {
      await projectService.saveProject(data);
    }
  },

  async renameProject(newTitle) {
    set({ projectName: newTitle });
    const data = get().buildProjectData();
    if (data.id) {
      await projectService.saveProject({ ...data, title: newTitle });
    }
  },
}));

export default useAppStore;
