import React, { useState, useCallback, useEffect, useRef } from "react";
import Home from "./components/Home/Home";
import Layout from "./components/Layout/Layout";
import AppSidebar from "./components/Layout/AppSidebar";
import AppHeader from "./components/Layout/AppHeader";
import ProyectosView from "./components/Proyectos/ProyectosView";
import Editor from "./components/Editor/Editor";
import Sidebar from "./components/Sidebar/Sidebar";
import RightPanel from "./components/RightPanel/RightPanel";
import Toolbar from "./components/Toolbar/Toolbar";
import WritingAssistant from "./components/Assistant/WritingAssistant";
import OllamaChat from "./components/Assistant/OllamaChat";
import NewProjectModal from "./components/Home/NewProjectModal";
import ExportModal from "./components/Export/ExportModal";
import DocumentEditor from "./components/Home/DocumentEditor";
import GlobalResourcesView from "./components/Recursos/GlobalResourcesView";
import DocumentosView from "./components/Documentos/DocumentosView";
import { useWordCount } from "./hooks/useWordCount";
import { projectService } from "./services/projectService";
import { backupService } from "./services/backupService";
import { migrationService } from "./services/migrationService";
import { resourceToHTML } from "./config/resourceFormats";
import SettingsPanel from "./components/Settings/SettingsPanel";
import { BookOpen } from "lucide-react";

function App() {
  const [vistaActiva, setVistaActiva] = useState(() => {
    return localStorage.getItem("lemwriter-vista-activa") || "inicio";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("lemwriter-sidebar-collapsed") === "true";
  });
  const [showDocuments, setShowDocuments] = useState(false);
  const [projectType, setProjectType] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [project, setProject] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [templateKey, setTemplateKey] = useState(null);
  const [templateName, setTemplateName] = useState(null);
  const [designTokens, setDesignTokens] = useState({});
  const [smartRules, setSmartRules] = useState({});
  const [panelConfig, setPanelConfig] = useState({});
  const [sections, setSections] = useState([]);
  const [words, setWords] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const editorRef = useRef(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [projectStyle, setProjectStyle] = useState("manuscrito_clasico");
  const [showExport, setShowExport] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('lemwriter-theme') || 'light');
  const [currentDocument, setCurrentDocument] = useState(null);
  const [resourceRefreshKey, setResourceRefreshKey] = useState(0);
  const [docRefreshKey, setDocRefreshKey] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const autoSaveTimer = useRef(null);

  // Reset editor reference when project or section changes
  useEffect(() => {
    editorRef.current = null;
    setEditorInstance(null);
  }, [projectId, activeSection]);

  const getSectionContent = useCallback(() => {
    if (editorRef.current && !editorRef.current.isDestroyed && editorRef.current.schema) {
      return editorRef.current.getText()?.slice(0, 3000) || ''
    }
    const activeSec = sections.find(s => s.id === activeSection)
    return activeSec?.content?.replace(/<[^>]*>/g, '')?.slice(0, 3000) || ''
  }, [sections, activeSection])

  useEffect(() => {
    projectService.getSetting('theme').then(dbTheme => {
      if (dbTheme && dbTheme !== theme) {
        setTheme(dbTheme)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('lemwriter-theme', theme)
    projectService.setSetting('theme', theme).catch(() => {})
  }, [theme])

  // Cargar y aplicar colores personalizados cuando el tema es 'custom'
  useEffect(() => {
    const CUSTOM_KEYS = [
      'bg-primary', 'bg-secondary', 'card-bg', 'hover-bg',
      'text-primary', 'text-secondary', 'text-muted',
      'border-primary', 'border-secondary',
      'color-brand-gold', 'color-brand-gold-light', 'color-brand-gold-deep',
      'color-brand-gold-pale', 'color-brand-gold-shine',
      'color-brand-teal', 'color-brand-teal-mid', 'color-brand-teal-pale',
      'color-brand-cream', 'color-brand-ink', 'color-brand-ink-2',
      'color-brand-ink-3', 'color-brand-devocional',
    ]

    if (theme === 'custom') {
      projectService.getCustomTheme().then(colors => {
        if (colors) {
          CUSTOM_KEYS.forEach(key => {
            if (colors[key]) {
              document.documentElement.style.setProperty(`--custom-${key}`, colors[key])
            } else {
              document.documentElement.style.removeProperty(`--custom-${key}`)
            }
          })
        }
      }).catch(() => {})
    } else {
      // Limpiar variables custom al cambiar a otro tema
      CUSTOM_KEYS.forEach(key => {
        document.documentElement.style.removeProperty(`--custom-${key}`)
      })
    }
  }, [theme])

  const { wordCount, charCount } = useWordCount(editorInstance);

  const migrationRan = useRef(false);

  useEffect(() => {
    if (migrationRan.current) return;
    migrationRan.current = true;
    const runMigrations = async () => {
      setIsMigrating(true);
      try {
        // 1. Migrate templates to custom_models table
        await migrationService.migrateTemplates();
        // 2. Migrate existing projects from localStorage to SQLite
        if (typeof projectService.migrateFromLocalStorage === "function") {
          await projectService.migrateFromLocalStorage();
        } else {
          console.error(
            "migrateFromLocalStorage is not a function on projectService",
          );
        }
        // 3. Refresh recent projects
        setRecentProjects(await projectService.getRecentProjects());

        // 4. Auto-backup on startup
        backupService.createBackup().catch(() => {});
      } catch (err) {
        console.error("Migration failed:", err);
      } finally {
        setIsMigrating(false);
      }
    };
    runMigrations();
  }, []);

  useEffect(() => {
    if (vistaActiva === "inicio" || vistaActiva === "proyectos" || vistaActiva === "documentos") {
      projectService.getRecentProjects().then(setRecentProjects);
    }
  }, [vistaActiva]);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem("lemwriter-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Persist active view
  useEffect(() => {
    localStorage.setItem("lemwriter-vista-activa", vistaActiva);
  }, [vistaActiva]);

  const handleNavigate = useCallback((vista) => {
    console.log("handleNavigate: Cambiando a vista", vista);
    setVistaActiva(vista);
    if (vista === "proyectos") {
      console.log("handleNavigate: Limpiando estados de proyecto.");
      setProjectId(null);
      setProjectType(null);
      setProject(null);
      setSections([]);
      setActiveSection(null);
    }
    // Al salir del editor, restaurar el tema global guardado en settings
    if (vistaActiva === "editor" && vista !== "editor") {
      projectService.getSetting('theme').then(globalTheme => {
        if (globalTheme) setTheme(globalTheme)
      }).catch(() => {})
    }
  }, [vistaActiva]);

  useEffect(() => {
    const unsubscribe = window.api?.onBeforeClose(async () => {
      if (isProjectOpen) {
        try {
          await projectService.saveProject(buildProjectData());
        } catch (err) {
          console.error("Error en autoguardado al cerrar:", err);
        }
      }
      window.api.confirmSaveComplete();
    });
    return () => unsubscribe?.();
  }, [projectId, vistaActiva]);

  const handleSelectType = (type) => {
    setModalType(type);
  };

  const isProjectOpen = vistaActiva === "editor" && projectId;

  const handleConfirmCreate = async (name, selectedTemplate) => {
    const type = modalType;
    setModalType(null);
    const formato =
      type === "video"
        ? selectedTemplate === "video-corto"
          ? "corto"
          : "largo"
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
        setProject(fullProject);
        setProjectType(fullProject.type);
        setProjectId(fullProject.id);
        setProjectName(name);
        setTemplateKey(selectedTemplate || null);
        setTemplateName(null);
        setDesignTokens({});
        setSmartRules({});
        setPanelConfig({});
        setSections(fullProject.sections || []);
        setActiveSection(fullProject.sections?.[0]?.id || null);
        setProjectStyle(fullProject.style || "manuscrito_clasico");
        setVistaActiva("editor");
        if (fullProject.theme) {
          setTheme(fullProject.theme)
        }
      }
    } catch (err) {
      console.error("Error al crear proyecto:", err);
      alert("Hubo un error al crear el proyecto. Por favor, intenta de nuevo.");
    }
  };

  const handleOpenProject = async (project) => {
    setVistaActiva("editor");
    setProjectType(project.type);
    setProjectId(project.id);
    setProjectName(project.title || "");
    setTemplateKey(project.template || null);
    setTemplateName(null);
    setDesignTokens({});
    setSmartRules({});
    setPanelConfig({});

    const fullProject = await projectService.getProject(project.id);
    if (fullProject) {
      setProject(fullProject);
      setProjectType(fullProject.type);
      setProjectId(fullProject.id);
      setProjectName(fullProject.title || "");
      setTemplateKey(fullProject.template || null);
      setTemplateName(null);
      setDesignTokens({});
      setSmartRules({});
      setPanelConfig({});
      setSections(fullProject.sections || []);
      setActiveSection(fullProject.sections?.[0]?.id || null);
      setProjectStyle(fullProject.style || "manuscrito_clasico");
      if (fullProject.theme) {
        setTheme(fullProject.theme)
      }
    }
  };

  const handleDeleteProject = async (id) => {
    await projectService.deleteProject(id);
    setRecentProjects(await projectService.getRecentProjects());
  };

  const handleOpenSection = async (projectId, sectionId) => {
    setVistaActiva("editor");
    const fullProject = await projectService.getProject(projectId);
    if (fullProject) {
      setProject(fullProject);
      setProjectType(fullProject.type);
      setProjectId(fullProject.id);
      setProjectName(fullProject.title || "");
      setTemplateKey(fullProject.template || null);
      setTemplateName(null);
      setDesignTokens({});
      setSmartRules({});
      setPanelConfig({});
      setSections(fullProject.sections || []);
      setActiveSection(sectionId || fullProject.sections?.[0]?.id || null);
      setProjectStyle(fullProject.style || "manuscrito_clasico");
      if (fullProject.theme) {
        setTheme(fullProject.theme)
      }
    }
  };

  const handleOpenDocument = (doc) => {
    setCurrentDocument(doc);
    setVistaActiva("documentos");
  };

  const handleDocumentBack = () => {
    setCurrentDocument(null);
    setVistaActiva("inicio");
  };

  const getTitle = () => projectName;

  const buildProjectData = useCallback(
    () => ({
      id: projectId,
      type: projectType,
      title: projectName,
      template: templateKey,
      templateName,
      sections,
      designTokens,
      smartRules,
      panelConfig,
      style: projectStyle,
    }),
    [
      projectId,
      projectType,
      projectName,
      templateKey,
      templateName,
      sections,
      designTokens,
      smartRules,
      panelConfig,
      projectStyle,
    ],
  );

  const autoSave = useCallback(() => {
    if (!projectId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await projectService.saveProject(buildProjectData());
    }, 2000);
  }, [projectId, buildProjectData]);

  useEffect(() => {
    if (isProjectOpen) {
      autoSave();
    }
  }, [sections, projectId, vistaActiva, autoSave]);

  const handleSelectSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    setEditorInstance(null);
  }, []);

  const handleAddSection = useCallback((newSection) => {
    setSections((prev) => [...prev, newSection]);
    setActiveSection(newSection.id);
    setEditorInstance(null);
  }, []);

  const handleAddSectionFromTemplate = useCallback(() => {
    const project = buildProjectData();
    const newSection = {
      id: `sec-${Date.now()}`,
      title: "Nueva Sección",
      content: "",
      order_index: project.sections.length,
      type:
        project.type === "libro"
          ? "capitulo"
          : project.type === "ensenanza"
            ? "clase"
            : project.type === "estudio"
              ? "texto_base"
              : "dia",
    };
    handleAddSection(newSection);
  }, [buildProjectData, handleAddSection]);

  const getActiveContent = () => {
    const section = sections.find((s) => s.id === activeSection);
    return section?.content || "";
  };

  const getActiveSection = () => {
    return sections.find((s) => s.id === activeSection);
  };

  const refreshSection = async (sectionId) => {
    const updated = await projectService.getSection(sectionId);
    if (updated) {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? updated : s)),
      );
    }
  };

  const handleContentUpdate = useCallback(
    (editor) => {
      const html = editor.getHTML();
      setSections((prev) =>
        prev.map((s) => (s.id === activeSection ? { ...s, content: html } : s)),
      );
    },
    [activeSection],
  );

  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor;
    setEditorInstance(editor);
  }, []);

  const handleManualSave = async () => {
    if (!projectId) return;
    await projectService.saveProject(buildProjectData());
  };

  const handleRename = async (newTitle) => {
    setProjectName(newTitle);
    if (projectId) {
      await projectService.saveProject({
        ...buildProjectData(),
        title: newTitle,
      });
    }
  };

  const handleRenameSection = useCallback((sectionId, newTitle) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s)),
    );
  }, []);

  const handleInsertResource = useCallback(
    (resource) => {
      if (!editorRef.current) return;
      const html = resourceToHTML(resource);
      editorRef.current.chain().focus().insertContent(html).run();
      if (project?.id && resource?.id) {
        projectService.markResourceUsed(project.id, resource.id, activeSection);
      }
    },
    [project, activeSection],
  );

  const designStyles = project?.designTokens
    ? {
        "--editor-font-size": project.designTokens.fontSize || "18px",
        "--editor-line-height": project.designTokens.lineHeight || "1.8",
        "--editor-font-family":
          project.designTokens.fontFamily || "'EB Garamond', serif",
        "--editor-heading-font":
          project.designTokens.headingFont ||
          project.designTokens.fontFamily ||
          "'EB Garamond', serif",
        "--editor-heading-weight": project.designTokens.headingWeight || "700",
        "--editor-margin-top": project.designTokens.margins?.top || "2cm",
        "--editor-margin-bottom": project.designTokens.margins?.bottom || "2cm",
        "--editor-margin-left": project.designTokens.margins?.left || "2.5cm",
        "--editor-margin-right": project.designTokens.margins?.right || "2.5cm",
      }
    : {};

  const renderContent = () => {
    console.log("renderContent: vistaActiva =", vistaActiva, ", projectId =", projectId);
    // 1. Editor de proyecto (si vistaActiva es 'editor' O si es 'proyectos' y hay un proyecto abierto)
    if (vistaActiva === "editor" || (vistaActiva === "proyectos" && projectId)) {
      return (
        <>
          <Layout
            title={getTitle()}
            onBack={() => handleNavigate("inicio")}
            wordCount={wordCount}
            charCount={charCount}
            projectType={projectType}
            onSave={handleManualSave}
            onRename={handleRename}
            onExport={() => setShowExport(true)}
            theme={theme}
            onThemeChange={setTheme}
            sidebar={
              <Sidebar
                projectType={projectType}
                projectId={projectId}
                sections={sections}
                activeSection={activeSection}
                onSelectSection={handleSelectSection}
                onAddSection={handleAddSection}
                onAddSectionFromTemplate={handleAddSectionFromTemplate}
                onRenameSection={handleRenameSection}
                projectTitle={getTitle()}
                templateKey={templateKey}
                onInsertResource={handleInsertResource}
                resourceRefreshKey={resourceRefreshKey}
              />
            }
            toolbar={
              <Toolbar editor={editorInstance} projectType={projectType} projectId={projectId} />
            }
            editor={
              activeSection ? (
                <Editor
                  key={activeSection}
                  content={getActiveContent()}
                  onUpdate={handleContentUpdate}
                  onEditorReady={handleEditorReady}
                  sectionTitle={getActiveSection()?.title}
                  designStyles={designStyles}
                  projectStyle={projectStyle}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>Selecciona una sección del sidebar</p>
                </div>
              )
            }
            rightPanel={
              <RightPanel
                projectType={projectType}
                section={getActiveSection()}
                wordCount={wordCount}
                project={project}
                projectStyle={projectStyle}
                onSectionUpdate={refreshSection}
                onStyleChange={setProjectStyle}
                onResourceChange={() => setResourceRefreshKey(k => k + 1)}
              />
            }
          />
          <WritingAssistant
            projectType={projectType}
            wordCount={wordCount}
            section={getActiveSection()}
            sections={sections}
            project={project}
            onOpenChat={() => setIsChatOpen(true)}
          />
          <OllamaChat
            projectType={projectType}
            sectionContent={getSectionContent()}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
          {showExport && (
            <ExportModal
              project={project}
              sections={sections}
              projectStyle={projectStyle}
              onClose={() => setShowExport(false)}
            />
          )}
        </>
      );
    }

    // 2. Vista Proyectos (lista de proyectos, solo si NO hay proyecto abierto)
    if (vistaActiva === "proyectos" && !projectId) {
      return (
        <>
          <ProyectosView
            recentProjects={recentProjects}
            onSelectType={handleSelectType}
            onOpenProject={handleOpenProject}
            onDeleteProject={handleDeleteProject}
          />
          {modalType && (
            <NewProjectModal
              type={modalType}
              onConfirm={handleConfirmCreate}
              onCancel={() => setModalType(null)}
            />
          )}
        </>
      );
    }

    // Documento abierto (vista de edición de documento importado)
    if (vistaActiva === "documentos" && currentDocument) {
      return (
        <DocumentEditor
          document={currentDocument}
          onBack={() => {
            setCurrentDocument(null);
            setVistaActiva("documentos");
            setDocRefreshKey(k => k + 1);
          }}
          onNameChange={(newName) => {
            setCurrentDocument(prev => prev ? { ...prev, file_name: newName } : null);
          }}
          theme={theme}
          onThemeChange={setTheme}
        />
      );
    }

    // 3. Inicio
    if (vistaActiva === "inicio") {
      return (
        <>
          <Home
            key={showDocuments ? "docs" : "main"}
            onSelectType={handleSelectType}
            onOpenProject={handleOpenProject}
            onOpenSection={handleOpenSection}
            onNavigate={handleNavigate}
          />
          {modalType && (
            <NewProjectModal
              type={modalType}
              onConfirm={handleConfirmCreate}
              onCancel={() => setModalType(null)}
            />
          )}
        </>
      );
    }

    // 4. Documentos (componente propio)
    if (vistaActiva === "documentos") {
      return (
        <DocumentosView
          onOpenDocument={handleOpenDocument}
          refreshKey={docRefreshKey}
        />
      );
    }

    // 5. Recursos globales
    if (vistaActiva === "recursos") {
      return <GlobalResourcesView />;
    }

    // Configuración
    if (vistaActiva === "configuracion") {
      return (
        <SettingsPanel
          theme={theme}
          onThemeChange={setTheme}
          projectId={projectId}
          isProjectOpen={isProjectOpen}
        />
      );
    }

    return null;
  };

  if (isMigrating) {
    return (
      <div className="flex items-center justify-center h-screen theme-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto"></div>
          <p className="mt-4 theme-text-secondary font-serif">Preparando tu biblioteca...</p>
        </div>
      </div>
    );
  }

  const showAppHeader = vistaActiva !== "editor" && !(vistaActiva === "documentos" && currentDocument);

  return (
    <div className="h-screen flex overflow-hidden theme-bg">
      <AppSidebar
        vistaActiva={vistaActiva}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        recentProjects={recentProjects}
        onOpenProject={handleOpenProject}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {showAppHeader && <AppHeader theme={theme} onThemeChange={setTheme} />}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
