import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import ConflictResolutionModal from './components/Sync/ConflictResolutionModal';
import { AlertTriangle } from 'lucide-react';
import DocumentEditor from './components/Home/DocumentEditor';
import GlobalResourcesView from './components/Recursos/GlobalResourcesView';
import DocumentosView from './components/Documentos/DocumentosView';
import SettingsPanel from './components/Settings/SettingsPanel';
import { useWordCount } from './hooks/useWordCount';
import { projectService } from './services/projectService';
import { backupService } from './services/backupService';
import { autoBackupService } from './services/autoBackupService';
import { syncService } from './services/syncService';
import { isSupabaseEnabled } from './services/supabaseClient';
import { migrationService } from './services/migrationService';
import PublicarAcademiaModal from './components/Editor/PublicarAcademiaModal';
import { cargarEstadosPublicacion } from './services/publicarAcademia';
import { resourceToHTML } from './config/resourceFormats';
import useAppStore from './stores/appStore';

function App() {
  const store = useAppStore();

  // ── Publicación en la Academia (solo proyectos tipo academia) ──
  const [showPublicarAcademia, setShowPublicarAcademia] = useState(false);
  const [estadoPublicacion, setEstadoPublicacion] = useState(null);

  useEffect(() => {
    if (store.projectType !== 'academia' || !store.projectId) {
      setEstadoPublicacion(null);
      return;
    }
    let vivo = true;
    cargarEstadosPublicacion([store.projectId])
      .then((mapa) => {
        if (vivo) setEstadoPublicacion(mapa[store.projectId] ?? { publicado: false, fecha: null });
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [store.projectId, store.projectType]);

  // ── Conflictos de sincronización ───────────────────────────
  const [conflictCount, setConflictCount] = useState(0);
  const [showConflictModal, setShowConflictModal] = useState(false);

  const refreshConflictCount = useCallback(async () => {
    try {
      const pending = await syncService.getPendingConflicts();
      setConflictCount(pending.length);
    } catch {
      // ignorar
    }
  }, []);

  useEffect(() => {
    refreshConflictCount();
    const handler = (e) => setConflictCount(e.detail?.count ?? 0);
    window.addEventListener('lw:conflicts-change', handler);
    return () => window.removeEventListener('lw:conflicts-change', handler);
  }, [refreshConflictCount]);

  const handleConflictsResolved = useCallback(async () => {
    await refreshConflictCount();
    // Recargar el proyecto abierto para reflejar la resolución (solo si ya está en el editor),
    // conservando la sección activa del usuario.
    const inEditor = store.vistaActiva === 'editor' || (store.vistaActiva === 'proyectos' && store.projectId);
    if (store.projectId && inEditor) {
      try {
        const fullProject = await projectService.getProject(store.projectId);
        if (fullProject) {
          const prevActive = store.activeSection;
          store.setProjectData(fullProject);
          if (prevActive && (fullProject.sections || []).some((s) => s.id === prevActive)) {
            useAppStore.setState({ activeSection: prevActive });
          }
        }
      } catch {
        // ignorar
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.projectId, store.vistaActiva, store.activeSection, refreshConflictCount]);

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
        // Respaldos al arrancar: van ANTES de la sincronización, para
        // que una red lenta o caída no los deje esperando.
        backupService.createBackup().catch(() => {});
        autoBackupService.checkAndRunAutoBackup().catch(() => {});
        // Pull desde Supabase al arrancar (con su propio try y límite
        // de 15 s: si la red no responde, la app sigue sin él)
        if (isSupabaseEnabled()) {
          try {
            const db = window.api.db;
            const pullPromise = syncService.pullFromCloud(db);
            pullPromise.catch(() => {});
            const { pulled } = await Promise.race([
              pullPromise,
              new Promise((resolve) => setTimeout(() => resolve({ pulled: 0 }), 15000)),
            ]);
            if (pulled > 0) {
              store.setRecentProjects(await projectService.getRecentProjects());
              console.log(`[sync]  proyectos descargados desde la nube`);
            }
          } catch (err) {
            console.warn('[sync] Pull al arrancar falló:', err?.message || err);
          }
        }
        backupService.createBackup().catch(() => {});
        autoBackupService.checkAndRunAutoBackup().catch(() => {});
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

      // Sincronizar con Supabase si está habilitado
      if (isSupabaseEnabled() && store.projectId && store.project) {
        try {
          const secciones = store.sections || []
          const relaciones = await projectService.getRelations(store.project.id)
          const relacionesParaSync = [...relaciones.origins.map(o => ({ parent_id: o.id, child_id: store.project.id })), ...relaciones.derived.map(d => ({ parent_id: store.project.id, child_id: d.id }))]
          await syncService.syncProjectToCloud(store.project, secciones, [], relacionesParaSync)
        } catch (err) {
          console.warn('[sync] Error en sync post-guardado:', err.message)
        }
      }
    }, 2000);
  }, [store.projectId, store.project, store.sections]);

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
    },
    [],
  );

  const handleAddSection = useCallback((newSection) => {
    store.addSection(newSection);
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
            : project.type === 'academia'
              ? 'tema'
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

  const handleDeleteSection = useCallback((sectionId) => {
    store.deleteSection(sectionId);
  }, []);

  const handleReorderSection = useCallback((sectionId, targetIndex) => {
    store.moveSectionTo(sectionId, targetIndex);
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
            onPublicarAcademia={store.projectType === 'academia' ? () => setShowPublicarAcademia(true) : undefined}
            estadoPublicacion={store.projectType === 'academia' ? estadoPublicacion : null}
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
                onDeleteSection={handleDeleteSection}
                onReorderSection={handleReorderSection}
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
        sectionInfo={(() => { const s = (store.sections || []).find((x) => x.id === store.activeSection); return s ? { numero: store.sections.indexOf(s) + 1, total: store.sections.length, titulo: s.title || '' } : null })()}
        sections={store.sections || []}
        activeSectionId={store.activeSection} />
            }
            editor={
              store.activeSection ? (
                <Editor
                  sectionId={store.activeSection}
                  content={getActiveContent()}
                  onUpdate={handleContentUpdate}
                  onEditorReady={handleEditorReady}
                  sectionTitle={getActiveSection()?.title} sectionNumero={(store.sections || []).findIndex((s) => s.id === store.activeSection) + 1} sectionTotal={(store.sections || []).length}
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
                onStyleChange={(style) => store.setProjectStyle(style)}
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
              currentSection={store.sections.find(s => s.id === store.activeSection) || null}
              onClose={() => store.setShowExport(false)}
            />
          )}
          {showPublicarAcademia && store.projectType === 'academia' && (
            <PublicarAcademiaModal
              proyecto={{ id: store.projectId, titulo: store.projectName }}
              secciones={store.sections}
              onClose={() => setShowPublicarAcademia(false)}
              onPublicado={(estado) => setEstadoPublicacion(estado)}
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
      {/* Alerta de conflictos de sincronización */}
      {conflictCount > 0 && (
        <button
          onClick={() => setShowConflictModal(true)}
          title={`${conflictCount} conflicto(s) de sincronización pendientes`}
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 transition-colors"
        >
          <AlertTriangle size={16} />
          <span className="text-xs font-semibold">{conflictCount}</span>
        </button>
      )}
      {showConflictModal && (
        <ConflictResolutionModal
          onClose={() => setShowConflictModal(false)}
          onResolved={handleConflictsResolved}
        />
      )}
    </div>
  );
}

export default App;
