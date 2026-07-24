import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { getTemplates } from '../../templates/definitions'

const typeLabels = {
  book: "Libro",
  teaching: "Enseñanza",
  devotional: "Devocional",
  estudio: "Estudio Bíblico",
  sermon: "Sermón",
  video: "Video",
};

const typeIcons = {
  book: "📚",
  teaching: "📖",
  devotional: "🙏",
  estudio: "🔍",
  sermon: "🎙️",
  video: "🎬",
};

const typeColors = {
  book: {
    border: "border-blue-400",
    bg: "bg-blue-50",
    ring: "ring-blue-400",
    selectedBg: "bg-blue-50 border-blue-500",
  },
  teaching: {
    border: "border-yellow-400",
    bg: "bg-yellow-50",
    ring: "ring-yellow-400",
    selectedBg: "bg-yellow-50 border-yellow-500",
  },
  devotional: {
    border: "border-green-400",
    bg: "bg-green-50",
    ring: "ring-green-400",
    selectedBg: "bg-green-50 border-green-500",
  },
  estudio: {
    border: "border-amber-400",
    bg: "bg-amber-50",
    ring: "ring-amber-400",
    selectedBg: "bg-amber-50 border-amber-500",
  },
  sermon: {
    border: "border-red-400",
    bg: "bg-red-50",
    ring: "ring-red-400",
    selectedBg: "bg-red-50 border-red-500",
  },
  video: {
    border: "border-purple-400",
    bg: "bg-purple-50",
    ring: "ring-purple-400",
    selectedBg: "bg-purple-50 border-purple-500",
  },
};

const NewProjectModal = ({ type, onConfirm, onCancel }) => {
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const inputRef = useRef(null);

  const templates = getTemplates(type);
  const templateKeys = Object.keys(templates);
  const colors = typeColors[type];

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    if (templateKeys.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templateKeys[0]);
    }
  }, [type, templateKeys]);

  const handleConfirm = () => {
    const trimmedName = name.trim();
    if (trimmedName && selectedTemplate) {
      onConfirm(trimmedName, selectedTemplate);
    } else {
      console.warn("Validación fallida: nombre o plantilla faltante", {
        trimmedName,
        selectedTemplate,
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && name.trim() && selectedTemplate) handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{typeIcons[type]}</span>
            <h3 className="text-lg font-bold text-brand-ink font-serif">
              Nuevo {typeLabels[type]}
            </h3>
          </div>
          <p className="text-xs text-brand-ink-3 font-sans">
            Elige una plantilla y escribe el nombre
          </p>
        </div>

        <div className="px-5 pb-3">
          <label className="block text-xs font-semibold text-brand-ink mb-1.5 font-sans">
            Plantilla
          </label>
          <div className="grid gap-1.5">
            {templateKeys.map((key) => {
              const template = templates[key];
              const isSelected = selectedTemplate === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedTemplate(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-all ${isSelected ? `${colors.selectedBg} ring-1 ${colors.ring}` : "border-brand-gold/20 hover:border-brand-gold/40"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{template.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-ink font-serif">
                        {template.name}
                      </p>
                      <p className="text-[10px] text-brand-ink-3 truncate font-sans">
                        {template.description}
                      </p>
                    </div>
                    <span className="text-[9px] text-brand-ink-3 shrink-0 font-sans">
                      {template.structure.length} secciones
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 pb-3">
          <label className="block text-xs font-semibold text-brand-ink mb-1 font-sans">
            Nombre del proyecto
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Voces en la carretera..."
            className={`w-full text-sm border-2 rounded-lg px-3 py-1.5 outline-none ${colors.border} focus:border-brand-gold`}
          />
        </div>

        <div className="px-5 pb-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-brand-ink-3 hover:bg-brand-gold-pale rounded-lg transition-colors font-sans"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim() || !selectedTemplate}
            className="px-4 py-1.5 text-sm font-medium text-white bg-brand-gold hover:bg-brand-gold-deep rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-sans"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;
