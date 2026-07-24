/**
 * electron/components (o donde vivan tus componentes de la toolbar
 * del editor Tiptap) — DetectarReferenciasButton.jsx
 *
 * Botón "Detectar referencias" con:
 *  - Indicador de carga con aviso de tiempo esperado (la IA local
 *    puede tardar 30-90s en CPU sin GPU).
 *  - Lista de sugerencias, con resaltado visual cuando el modelo
 *    no detectó un rango de versículos (versiculo_final null) —
 *    para que el usuario revise esos casos con más cuidado antes
 *    de confirmarlos.
 *  - Edición manual del rango antes de confirmar, por si el modelo
 *    se equivocó (ej. Hechos 2:1-4 detectado solo como 2:1).
 *  - Confirmación individual por referencia, que actualiza
 *    confirmado_por_usuario = 1 en la base de datos.
 *
 * NOTA IMPORTANTE: este componente asume que existe un handler IPC
 * "ai:confirmReference" que aún no forma parte de aiService.js — es
 * necesario agregarlo (recibe projectId + el objeto de referencia
 * con su id de la BD, y hace el UPDATE correspondiente). Ajusta el
 * nombre exacto según cómo termine implementándose en tu proyecto.
 *
 * Ajusta las importaciones y el acceso al editor de Tiptap según tu
 * estructura real en Editor.jsx.
 */

import { useState } from "react";

function DetectarReferenciasButton({ editor, projectId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [referencias, setReferencias] = useState([]);

  const handleDetectar = async () => {
    if (!editor) return;

    // Usa la selección actual si existe, si no, todo el documento
    const { from, to } = editor.state.selection;
    const texto =
      from !== to
        ? editor.state.doc.textBetween(from, to, " ")
        : editor.getText();

    if (!texto.trim()) {
      setError("No hay texto para analizar");
      return;
    }

    setLoading(true);
    setError(null);
    setReferencias([]);

    const resultado = await window.electronAPI.ai.extractReferences(texto);

    setLoading(false);

    if (!resultado.success) {
      setError(resultado.error);
      return;
    }

    // Copia editable local: cada referencia lleva su propio estado de
    // edición y confirmación antes de guardarse como definitiva.
    const referenciasConEstado = resultado.references.map((ref, i) => ({
      ...ref,
      _localId: i,
      _confirmado: false,
      _rangoIncierto: ref.versiculo_final === null || ref.versiculo_final === undefined,
    }));

    setReferencias(referenciasConEstado);
  };

  const actualizarRango = (localId, nuevoValor) => {
    setReferencias((prev) =>
      prev.map((ref) =>
        ref._localId === localId
          ? { ...ref, versiculo_final: nuevoValor === "" ? null : Number(nuevoValor) }
          : ref
      )
    );
  };

  const confirmarReferencia = async (ref) => {
    // TODO: ajustar al nombre real del handler IPC una vez definido.
    // Debe hacer: UPDATE detected_references SET confirmado_por_usuario = 1
    // WHERE id = ? (o insertar si aún no existe el registro).
    const resultado = await window.electronAPI.ai.confirmReference({
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
    } else {
      setError(resultado?.error || "No se pudo confirmar la referencia");
    }
  };

  return (
    <div className="ai-toolbar-section">
      <button
        onClick={handleDetectar}
        disabled={loading}
        title="Detectar referencias bíblicas con IA local"
      >
        {loading ? "Analizando... (puede tardar hasta 1 min)" : "📖 Detectar referencias"}
      </button>

      {error && <div className="ai-error">⚠️ {error}</div>}

      {referencias.length > 0 && (
        <ul className="ai-referencias-detectadas">
          {referencias.map((ref) => (
            <li
              key={ref._localId}
              className={ref._rangoIncierto ? "ai-ref-incierta" : ""}
            >
              <span>
                {ref.libro} {ref.capitulo}:{ref.versiculo}
                {ref._rangoIncierto ? (
                  <>
                    {" – "}
                    <input
                      type="number"
                      placeholder="fin (opcional)"
                      className="ai-ref-rango-input"
                      value={ref.versiculo_final ?? ""}
                      onChange={(e) => actualizarRango(ref._localId, e.target.value)}
                      disabled={ref._confirmado}
                      title="El modelo no detectó un rango aquí — corrígelo si el texto original tenía uno"
                    />
                  </>
                ) : (
                  ref.versiculo_final && `-${ref.versiculo_final}`
                )}
              </span>

              {ref._rangoIncierto && !ref._confirmado && (
                <span className="ai-ref-warning" title="Revisa si el texto original tenía un rango de versículos">
                  ⚠️ revisar rango
                </span>
              )}

              <button
                onClick={() => confirmarReferencia(ref)}
                disabled={ref._confirmado}
                className="ai-ref-confirmar-btn"
              >
                {ref._confirmado ? "✅ Confirmada" : "Confirmar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DetectarReferenciasButton;
