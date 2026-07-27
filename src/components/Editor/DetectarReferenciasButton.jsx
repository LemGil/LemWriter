import { useState, useEffect, useRef } from "react";
import { SearchCheck, Loader2, Check, X, AlertTriangle } from "lucide-react";

const TOOLBAR_BUTTON_CLASS =
  "p-1.5 rounded transition-colors theme-text-muted hover:bg-brand-gold-pale hover:text-brand-teal";
const TOOLBAR_BUTTON_ACTIVE =
  "p-1.5 rounded transition-colors bg-brand-teal text-white";

function DetectarReferenciasButton({ editor, projectId, onResourceChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [referencias, setReferencias] = useState([]);
  const panelRef = useRef(null);

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // No cerrar si se hizo clic en el botón toggle
        if (e.target.closest('[data-detect-toggle]')) return;
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Auto-cerrar cuando todas están confirmadas
  const todasConfirmadas =
    referencias.length > 0 && referencias.every((r) => r._confirmado);
  useEffect(() => {
    if (todasConfirmadas) {
      const timer = setTimeout(() => {
        setReferencias([]);
        setIsOpen(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [todasConfirmadas]);

  const handleToggle = () => {
    if (isOpen) {
      // Cerrar y limpiar
      setReferencias([]);
      setError(null);
      setIsOpen(false);
    } else {
      setIsOpen(true);
      handleDetectar();
    }
  };

  const handleDetectar = async () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const texto =
      from !== to
        ? editor.state.doc.textBetween(from, to, " ")
        : editor.getText();

    if (!texto.trim()) {
      setError("No hay texto en el editor para analizar");
      return;
    }

    setLoading(true);
    setError(null);
    setReferencias([]);

    try {
      const resultado = await window.api.ai.extractReferences({
        text: texto,
        projectId,
      });

      if (!resultado.success) {
        setError(resultado.error || "Error al extraer referencias");
        return;
      }

      if (!resultado.references || resultado.references.length === 0) {
        setError("No se encontraron referencias bíblicas en el texto");
        return;
      }

      const referenciasConEstado = resultado.references.map((ref, i) => ({
        ...ref,
        _localId: i,
        _confirmado: false,
        _rangoIncierto:
          ref.versiculo_final === null || ref.versiculo_final === undefined,
      }));

      setReferencias(referenciasConEstado);
    } catch (err) {
      setError(`Error de conexión: ${err.message}`);
      console.error("[DetectarReferencias]", err);
    } finally {
      setLoading(false);
    }
  };

  const actualizarRango = (localId, nuevoValor) => {
    setReferencias((prev) =>
      prev.map((ref) =>
        ref._localId === localId
          ? {
              ...ref,
              versiculo_final:
                nuevoValor === "" ? null : Number(nuevoValor),
            }
          : ref
      )
    );
  };

  const confirmarReferencia = async (ref) => {
    try {
      const resultado = await window.api.ai.confirmReference({
        projectId,
        libro: ref.libro,
        capitulo: ref.capitulo,
        versiculo: ref.versiculo,
        versiculo_final: ref.versiculo_final,
      });

      if (resultado?.success) {
        setReferencias((prev) =>
          prev.map((r) =>
            r._localId === ref._localId ? { ...r, _confirmado: true } : r
          )
        );
        // Refrescar la lista de Recursos en el Sidebar
        onResourceChange?.();
      } else {
        setError(resultado?.error || "No se pudo confirmar");
      }
    } catch (err) {
      setError(`Error de conexión: ${err.message}`);
    }
  };

  return (
    <div className="relative inline-flex">
      {/* Botón toggle */}
      <button
        data-detect-toggle
        onClick={handleToggle}
        disabled={loading}
        title={isOpen ? "Cerrar panel" : "Detectar referencias bíblicas con IA"}
        className={isOpen ? TOOLBAR_BUTTON_ACTIVE : TOOLBAR_BUTTON_CLASS}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <SearchCheck size={16} />}
      </button>

      {/* Panel flotante */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-1 z-50 w-80 theme-bg border theme-border rounded-lg shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b theme-border">
            <span className="text-xs font-semibold theme-text flex items-center gap-1.5">
              <SearchCheck size={14} className="text-brand-teal" />
              {loading
                ? "Analizando..."
                : referencias.length > 0
                  ? `Referencias encontradas (${referencias.length})`
                  : "Detectar referencias"}
            </span>
            <button
              onClick={() => {
                setReferencias([]);
                setError(null);
                setIsOpen(false);
              }}
              className="p-0.5 rounded hover:theme-bg-secondary theme-text-muted transition-colors"
              title="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-3 max-h-64 overflow-y-auto">
            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-2 text-xs theme-text-muted py-2">
                <Loader2 size={14} className="animate-spin shrink-0" />
                <span>
                  Analizando texto con IA local...
                  <br />
                  <span className="text-[10px] opacity-70">
                    (puede tardar hasta 2 min en CPU)
                  </span>
                </span>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex items-start gap-2 text-xs p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Sin referencias (después de carga) */}
            {!loading && !error && referencias.length === 0 && (
              <p className="text-xs theme-text-muted text-center py-4">
                Presiona el botón para analizar el texto
              </p>
            )}

            {/* Lista de referencias */}
            {!loading && referencias.length > 0 && (
              <div className="space-y-2">
                {todasConfirmadas && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 pb-1">
                    <Check size={14} />
                    <span>Todas confirmadas — cerrando...</span>
                  </div>
                )}

                {referencias.map((ref) => (
                  <div
                    key={ref._localId}
                    className={`flex items-center justify-between gap-2 p-2 rounded text-xs border transition-colors ${
                      ref._rangoIncierto && !ref._confirmado
                        ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10"
                        : ref._confirmado
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10"
                          : "theme-border theme-bg-secondary"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium theme-text">
                        {ref.libro} {ref.capitulo}:{ref.versiculo}
                      </span>
                      {ref._rangoIncierto && !ref._confirmado ? (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] theme-text-muted">–</span>
                          <input
                            type="number"
                            min="1"
                            placeholder="fin"
                            value={ref.versiculo_final ?? ""}
                            onChange={(e) =>
                              actualizarRango(ref._localId, e.target.value)
                            }
                            disabled={ref._confirmado}
                            className="w-14 px-1.5 py-0.5 text-[10px] rounded border theme-border theme-bg theme-text focus:outline-none focus:ring-1 focus:ring-brand-teal/50"
                          />
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                            <AlertTriangle size={10} />
                            revisar rango
                          </span>
                        </div>
                      ) : (
                        ref.versiculo_final && (
                          <span className="text-[10px] theme-text-muted ml-1">
                            –{ref.versiculo_final}
                          </span>
                        )
                      )}
                    </div>

                    <button
                      onClick={() => confirmarReferencia(ref)}
                      disabled={ref._confirmado}
                      className={`shrink-0 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        ref._confirmado
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-default"
                          : "bg-brand-teal text-white hover:bg-brand-teal/90"
                      }`}
                    >
                      {ref._confirmado ? (
                        <span className="flex items-center gap-1">
                          <Check size={10} /> Confirmada
                        </span>
                      ) : (
                        "Confirmar"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Re-intentar si hay error */}
            {error && !loading && (
              <button
                onClick={handleDetectar}
                className="mt-2 w-full text-xs py-1.5 rounded border theme-border theme-text-muted hover:theme-bg-secondary transition-colors"
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DetectarReferenciasButton;
