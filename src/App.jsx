import React, { useCallback, useEffect, useRef } from 'react';
import Home from './components/Home/Home';
import Layout from './components/Layout/Layout';
import AppSidebar from './components/Layout/AppSidebar';
import AppHeader from './components/Layout/AppHeader';
import ProyectosView from './components/Proyectos/ProyectosView';
import Editor from './components/Editor/Editor';
import Sidebar from './components/Sidebar/Sidebar';
import RightPanel from './components/RightPanel/RightPanel';
import Toolbar from './components/Toolbar/Toolbar';
import WritingAssistant from './components/Assistant/WritingAssistant';
import OllamaChat from './components/Assistant/OllamaChat';
import NewProjectModal from './components/Home/NewProjectModal';
import ExportModal from './components/Export/ExportModal';
import DocumentEditor from './components/Home/DocumentEditor';
import GlobalResourcesView from './components/Recursos/GlobalResourcesView';
import DocumentosView from './components/Documentos/DocumentosView';
import SettingsPanel from './components/Settings/SettingsPanel';
import { useWordCount } from './hooks/useWordCount';
import { projectService } from './services/projectService';
import { backupService } from './services/backupService';
import { migrationService } from './services/migrationService';
import { resourceToHTML } from './config/resourceFormats';
import useAppStore from './stores/appStore';

function App() {
  const store = useAppStore();

  // ── One-shot initialisation ──────────────────────────────
  const migrationRan = useRef(false);

  useEffect(() => {
    const init = async () => {
      // Restore last project if any
      const lastId = await window.api.app.getLastProject();
      if (lastId) {
        const project = await projectService.getProject(lastId);
        if (project) {
          store.handleOpenProject(project);
        }
      }
      // Load persisted theme from DB
      store.loadThemeFromDb();
    };
    init();
  }, []);

  useEffect(() => {
    if (migrationRan.current) return;
    migrationRan.current = true;
    const runMigrations = async () => {
      store.setIsMigrating?.(true);
      try {
        await migrationService.migrateTemplates();
        if (typeof projectService.migrateFromLocalStorage === 'function') {
          await projectService.migrateFromLocalStorage();
        }
        store.setRecentProjects(await projectService.getRecentProjects());
        backupService.createBackup().catch(() => {});
      } catch (err) {
        console.error('Migration failed:', err);
      } finally {
        store.setIsMigrating?.(false);
      }
    };
    runMigrations();
  }, []);

  // Refresh recent projects when on certain views
  useEffect(() => {
    if (['inicio', 'proyectos', 'documentos'].includes(store.vistaActiva)) {
      projectService.getRecentProjects().then(store.setRecentProjects);
    }
  }, [store.vistaActiva]);

  // Register before-close IPC listener
  useEffect(() => {
    const unsubscribe = window.api?.onBeforeClose(async () => {
      if (store.isProjectOpen()) {
        try {
          await store.saveCurrentProject();
        } catch (err) {
          console.error('Error en autoguardado al cerrar:', err);
        }
      }
      window.api.confirmSaveComplete();
    });
    return () => unsubscribe?.();
  }, [store.projectId, store.vistaActiva]);

  // ── Derived helpers ──────────────────────────────────────
  const editorRef = useRef(null);

  const getSectionContent = useCallback(() => {
    if (editorRef.current && !editorRef.current.isDestroyed && editorRef.current.schema) {
      return editorRef.current.getText()?.slice(0, 3000) || '';
    }
    const activeSec = store.sections.find((s) => s.id === store.activeSection);
    return activeSec?.content?.replace(/<[^>]*>/g, '')?.slice(0, 3000) || '';
  }, [store.sections, store.activeSection]);

  const { wordCount, charCount } = useWordCount(store.editorInstance);

  // ── Auto-save ────────────────────────────────────────────
  const autoSaveTimer = useRef(null);

  const autoSave = useCallback(() => {
    if (!store.projectId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await store.saveCurrentProject();
    }, 2000);
  }, [store.projectId]);

  useEffect(() => {
    if (store.isProjectOpen()) {
      autoSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.sections, store.projectId, store.vistaActiva]);

  // ── Event handlers (wiring only — logic delegates to store) ──

  const handleSelectType = (type) => store.setModalType(type);

  const handleConfirmCreate = (name, template) => {
    store.handleConfirmCreate(store.modalType, name, template);
  };

  const handleOpenProject = (project) => store.handleOpenProject(project);

  const handleOpenSection = (projectId, sectionId) =>
    store.handleOpenSection(projectId, sectionId);

  const handleDeleteProject = (id) => store.deleteProject(id);

  const handleNavigate = (vista) => {
    store.setVistaActiva(vista);
    if (vista === 'proyectos') {
      store.clearProjectData();
    }
    // Restore global theme when leaving editor
    if (store.vistaActiva === 'editor' && vista !== 'editor') {
      store.loadThemeFromDb();
    }
  };

  const handleSelectSection = useCallback(
    (sectionId) => {
      store.selectSection(sectionId);
      store.setEditorInstance(null);
    },
    [],
  );

  const handleAddSection = useCallback((newSection) => {
    store.addSection(newSection);
    store.setEditorInstance(null);
  }, []);

  const handleAddSectionFromTemplate = useCallback(() => {
    const project = store.buildProjectData();
    const defaultType =
      project.type === 'libro'
        ? 'capitulo'
        : project.type === 'ensenanza'
          ? 'clase'
          : project.type === 'estudio'
            ? 'texto_base'
            : 'dia';
    const newSection = {
      id: `sec-${Date.now()}`,
      title: 'Nueva Sección',
      content: '',
      order_index: project.sections.length,
      type: defaultType,
    };
    handleAddSection(newSection);
  }, [store.projectType]);

  const handleRenameSection = useCallback((sectionId, newTitle) => {
    store.renameSection(sectionId, newTitle);
  }, []);

  const handleContentUpdate = useCallback(
    (editor) => {
      const html = editor.getHTML();
      store.updateSectionContent(store.activeSection, html);
    },
    [store.activeSection],
  );

  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor;
    store.setEditorInstance(editor);
  }, []);

  const handleManualSave = async () => {
    await store.saveCurrentProject();
  };

  const handleRename = async (newTitle) => {
    await store.renameProject(newTitle);
  };

  const handleInsertResource = useCallback(
    (resource) => {
      if (!editorRef.current) return;
      const html = resourceToHTML(resource);
      editorRef.current.chain().focus().insertContent(html).run();
      if (store.project?.id && resource?.id) {
        projectService.markResourceUsed(store.project.id, resource.id, store.activeSection);
      }
    },
    [store.project, store.activeSection],
  );

  const handleOpenDocument = (doc) => {
    store.setCurrentDocument(doc);
    store.setVistaActiva('documentos');
  };

  const handleDocumentBack = () => {
    store.setCurrentDocument(null);
    store.setVistaActiva('inicio');
  };

  // ── Derived style values ─────────────────────────────────

  const designStyles = store.project?.designTokens
    ? {
        '--editor-font-size': store.project.designTokens.fontSize || '18px',
        '--editor-line-height': store.project.designTokens.lineHeight || '1.8',
        '--editor-font-family':
          store.project.designTokens.fontFamily || "'EB Garamond', serif",
        '--editor-heading-font':
          store.project.designTokens.headingFont ||
          store.project.designTokens.fontFamily ||
          "'EB Garamond', serif",
        '--editor-heading-weight': store.project.designTokens.headingWeight || '700',
        '--editor-margin-top': store.project.designTokens.margins?.top || '2cm',
        '--editor-margin-bottom': store.project.designTokens.margins?.bottom || '2cm',
        '--editor-margin-left': store.project.designTokens.margins?.left || '2.5cm',
        '--editor-margin-right': store.project.designTokens.margins?.right || '2.5cm',
      }
    : {};

  // ── Render ───────────────────────────────────────────────

  const getActiveContent = () => {
    const section = store.sections.find((s) => s.id === store.activeSection);
    return section?.content || '';
  };

  const getActiveSection = () => {
    return store.sections.find((s) => s.id === store.activeSection);
  };

  const renderContent = () => {
    // 1. Editor
    if (store.vistaActiva === 'editor' || (store.vistaActiva === 'proyectos' && store.projectId)) {
      return (
        <>
          <Layout
            title={store.projectName}
            onBack={() => handleNavigate('inicio')}
            wordCount={wordCount}
            charCount={charCount}
            projectType={store.projectType}
            onSave={handleManualSave}
            onRename={handleRename}
            onExport={() => store.setShowExport(true)}
            theme={store.theme}
            onThemeChange={store.setTheme}
            sidebar={
              <Sidebar
                projectType={store.projectType}
                projectId={store.projectId}
                sections={store.sections}
                activeSection={store.activeSection}
                onSelectSection={handleSelectSection}
                onAddSection={handleAddSection}
                onAddSectionFromTemplate={handleAddSectionFromTemplate}
                onRenameSection={handleRenameSection}
                projectTitle={store.projectName}
                templateKey={store.templateKey}
                onInsertResource={handleInsertResource}
                resourceRefreshKey={store.resourceRefreshKey}
              />
            }
            toolbar={
              <Toolbar
                editor={store.editorInstance}
                projectType={store.projectType}
                projectId={store.projectId}
              />
            }
            editor={
              store.activeSection ? (
                <Editor
                  key={store.activeSection}
                  content={getActiveContent()}
                  onUpdate={handleContentUpdate}
                  onEditorReady={handleEditorReady}
                  sectionTitle={getActiveSection()?.title}
                  designStyles={designStyles}
                  projectStyle={store.projectStyle}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>Selecciona una sección del sidebar</p>
                </div>
              )
            }
            rightPanel={
              <RightPanel
                projectType={store.projectType}
                section={getActiveSection()}
                wordCount={wordCount}
                project={store.project}
                projectStyle={store.projectStyle}
                onSectionUpdate={store.refreshSection}
                onStyleChange={(style) => store.set({ projectStyle: style })}
                onResourceChange={store.bumpResourceRefresh}
              />
            }
          />
          <WritingAssistant
            projectType={store.projectType}
            wordCount={wordCount}
            section={getActiveSection()}
            sections={store.sections}
            project={store.project}
            onOpenChat={() => store.setIsChatOpen(true)}
          />
          <OllamaChat
            projectType={store.projectType}
            sectionContent={getSectionContent()}
            isOpen={store.isChatOpen}
            onClose={() => store.setIsChatOpen(false)}
          />
          {store.showExport && (
            <ExportModal
              project={store.project}
              sections={store.sections}
              projectStyle={store.projectStyle}
              onClose={() => store.setShowExport(false)}
            />
          )}
        </>
      );
    }

    // 2. Proyectos
    if (store.vistaActiva === 'proyectos' && !store.projectId) {
      return (
        <>
          <ProyectosView
            recentProjects={store.recentProjects}
            onSelectType={handleSelectType}
            onOpenProject={handleOpenProject}
            onDeleteProject={handleDeleteProject}
          />
          {store.modalType && (
            <NewProjectModal
              type={store.modalType}
              onConfirm={handleConfirmCreate}
              onCancel={() => store.setModalType(null)}
            />
          )}
        </>
      );
    }

    // 3. Documento abierto
    if (store.vistaActiva === 'documentos' && store.currentDocument) {
      return (
        <DocumentEditor
          document={store.currentDocument}
          onBack={() => {
            store.setCurrentDocument(null);
            store.setVistaActiva('documentos');
            store.bumpDocRefresh();
          }}
          onNameChange={(newName) => {
            store.setCurrentDocument((prev) =>
              prev ? { ...prev, file_name: newName } : null,
            );
          }}
          theme={store.theme}
          onThemeChange={store.setTheme}
        />
      );
    }

    // 4. Inicio
    if (store.vistaActiva === 'inicio') {
      return (
        <>
          <Home
            key={store.vistaActiva}
            onSelectType={handleSelectType}
            onOpenProject={handleOpenProject}
            onOpenSection={handleOpenSection}
            onNavigate={handleNavigate}
          />
          {store.modalType && (
            <NewProjectModal
              type={store.modalType}
              onConfirm={handleConfirmCreate}
              onCancel={() => store.setModalType(null)}
            />
          )}
        </>
      );
    }

    // 5. Documentos
    if (store.vistaActiva === 'documentos') {
      return (
        <DocumentosView
          onOpenDocument={handleOpenDocument}
          refreshKey={store.docRefreshKey}
        />
      );
    }

    // 6. Recursos globales
    if (store.vistaActiva === 'recursos') {
      return <GlobalResourcesView />;
    }

    // 7. Configuración
    if (store.vistaActiva === 'configuracion') {
      return (
        <SettingsPanel
          theme={store.theme}
          onThemeChange={store.setTheme}
          projectId={store.projectId}
          isProjectOpen={store.isProjectOpen()}
        />
      );
    }

    return null;
  };

  // ── Outer shell ──────────────────────────────────────────

  const showAppHeader =
    store.vistaActiva !== 'editor' &&
    !(store.vistaActiva === 'documentos' && store.currentDocument);

  return (
    <div className="h-screen flex overflow-hidden theme-bg">
      <AppSidebar
        vistaActiva={store.vistaActiva}
        onNavigate={handleNavigate}
        collapsed={store.sidebarCollapsed}
        onToggle={store.toggleSidebar}
        recentProjects={store.recentProjects}
        onOpenProject={handleOpenProject}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {showAppHeader && (
          <AppHeader theme={store.theme} onThemeChange={store.setTheme} />
        )}
        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </div>
    </div>
  );
}

export default App;
