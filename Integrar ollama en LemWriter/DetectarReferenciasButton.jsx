/**
 * EJEMPLO: componente para la toolbar del editor Tiptap
 *
 * Botón "Detectar referencias" — llama a la IA local con el texto
 * seleccionado (o todo el contenido del editor) y muestra las
 * referencias encontradas como sugerencias.
 *
 * Ajusta las importaciones y el acceso al editor de Tiptap según
 * tu estructura real en Editor.jsx.
 */

import { useState } from "react";

function DetectarReferenciasButton({ editor }) {
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

    setReferencias(resultado.references);
  };

  return (
    <div className="ai-toolbar-section">
      <button
        onClick={handleDetectar}
        disabled={loading}
        title="Detectar referencias bíblicas con IA local"
      >
        {loading ? "Analizando..." : "📖 Detectar referencias"}
      </button>

      {error && <div className="ai-error">⚠️ {error}</div>}

      {referencias.length > 0 && (
        <ul className="ai-referencias-detectadas">
          {referencias.map((ref, i) => (
            <li key={i}>
              {ref.libro} {ref.capitulo}:{ref.versiculo}
              {ref.versiculo_final ? `-${ref.versiculo_final}` : ""}
              {/* Aquí conectarías con tu lógica para insertar como
                  nota, enlace, o guardar en la tabla detected_references */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DetectarReferenciasButton;
