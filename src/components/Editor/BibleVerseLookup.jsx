import { useState, useEffect, useRef } from "react";
import { BookOpen, X, Search, Loader } from "lucide-react";

// Lista completa de libros (66) con su testimonio (AT/NT)
const BOOKS = [
  // Antiguo Testamento
  { name: "Génesis", testament: "AT" },
  { name: "Éxodo", testament: "AT" },
  { name: "Levítico", testament: "AT" },
  { name: "Números", testament: "AT" },
  { name: "Deuteronomio", testament: "AT" },
  { name: "Josué", testament: "AT" },
  { name: "Jueces", testament: "AT" },
  { name: "Rut", testament: "AT" },
  { name: "1 Samuel", testament: "AT" },
  { name: "2 Samuel", testament: "AT" },
  { name: "1 Reyes", testament: "AT" },
  { name: "2 Reyes", testament: "AT" },
  { name: "1 Crónicas", testament: "AT" },
  { name: "2 Crónicas", testament: "AT" },
  { name: "Esdras", testament: "AT" },
  { name: "Nehemías", testament: "AT" },
  { name: "Ester", testament: "AT" },
  { name: "Job", testament: "AT" },
  { name: "Salmos", testament: "AT" },
  { name: "Proverbios", testament: "AT" },
  { name: "Eclesiastés", testament: "AT" },
  { name: "Cantar de los Cantares", testament: "AT" },
  { name: "Isaías", testament: "AT" },
  { name: "Jeremías", testament: "AT" },
  { name: "Lamentaciones", testament: "AT" },
  { name: "Ezequiel", testament: "AT" },
  { name: "Daniel", testament: "AT" },
  { name: "Oseas", testament: "AT" },
  { name: "Joel", testament: "AT" },
  { name: "Amós", testament: "AT" },
  { name: "Abdías", testament: "AT" },
  { name: "Jonás", testament: "AT" },
  { name: "Miqueas", testament: "AT" },
  { name: "Nahúm", testament: "AT" },
  { name: "Habacuc", testament: "AT" },
  { name: "Sofonías", testament: "AT" },
  { name: "Hageo", testament: "AT" },
  { name: "Zacarías", testament: "AT" },
  { name: "Malaquías", testament: "AT" },
  // Nuevo Testamento
  { name: "Mateo", testament: "NT" },
  { name: "Marcos", testament: "NT" },
  { name: "Lucas", testament: "NT" },
  { name: "Juan", testament: "NT" },
  { name: "Hechos", testament: "NT" },
  { name: "Romanos", testament: "NT" },
  { name: "1 Corintios", testament: "NT" },
  { name: "2 Corintios", testament: "NT" },
  { name: "Gálatas", testament: "NT" },
  { name: "Efesios", testament: "NT" },
  { name: "Filipenses", testament: "NT" },
  { name: "Colosenses", testament: "NT" },
  { name: "1 Tesalonicenses", testament: "NT" },
  { name: "2 Tesalonicenses", testament: "NT" },
  { name: "1 Timoteo", testament: "NT" },
  { name: "2 Timoteo", testament: "NT" },
  { name: "Tito", testament: "NT" },
  { name: "Filemón", testament: "NT" },
  { name: "Hebreos", testament: "NT" },
  { name: "Santiago", testament: "NT" },
  { name: "1 Pedro", testament: "NT" },
  { name: "2 Pedro", testament: "NT" },
  { name: "1 Juan", testament: "NT" },
  { name: "2 Juan", testament: "NT" },
  { name: "3 Juan", testament: "NT" },
  { name: "Judas", testament: "NT" },
  { name: "Apocalipsis", testament: "NT" },
];

function BibleVerseLookup({ editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verse, setVerse] = useState("");
  const [verseEnd, setVerseEnd] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const modalRef = useRef(null);

  // Cerrar al hacer clic fuera del modal
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleClose();
      }
    };
    // Cerrar con Escape
    const handleEscape = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    // No resetear resultados para que al reabrir se vea el último
  };

  const handleSearch = async () => {
    if (!selectedBook || !chapter || !verse) {
      setError("Completa libro, capítulo y versículo");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const text = await window.api.bible.getVerse({
        libro: selectedBook,
        capitulo: Number(chapter),
        versiculo: Number(verse),
        versiculoFinal: verseEnd ? Number(verseEnd) : null,
      });

      if (text === null) {
        setError("No se encontró el versículo (revisa libro, capítulo y versículo)");
        setLoading(false);
        return;
      }

      const reference = `${selectedBook} ${chapter}:${verse}${verseEnd ? `-${verseEnd}` : ""}`;
      setResult({ reference, text });

      // Guardar en recientes (máx 5)
      setRecentSearches((prev) => {
        const filtered = prev.filter((r) => r.reference !== reference);
        return [{ reference, text }, ...filtered].slice(0, 5);
      });
    } catch (err) {
      setError("Error al consultar la base de datos bíblica");
      console.error("[BibleVerseLookup]", err);
    }

    setLoading(false);
  };

  const handleInsert = () => {
    if (!result || !editor) return;

    // Formato: "Romanos 8:28" con el texto o solo el texto
    const content = `${result.reference}\n\n“${result.text}”\n\n`;

    editor.chain().focus().insertContent(content).run();
    handleClose();
  };

  const handleQuickSelect = (ref) => {
    // Parsear referencia rápida para rellenar el formulario
    const match = ref.reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
    if (match) {
      setSelectedBook(match[1]);
      setChapter(match[2]);
      setVerse(match[3]);
      setVerseEnd(match[4] || "");
      setResult(ref);
    }
  };

  // Agrupar libros por testimonio para el select
  const atBooks = BOOKS.filter((b) => b.testament === "AT");
  const ntBooks = BOOKS.filter((b) => b.testament === "NT");

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Buscar versículo bíblico (RV1909)"
        className={`p-1.5 rounded transition-colors ${
          isOpen
            ? "bg-brand-teal text-white"
            : "theme-text-muted hover:bg-brand-gold-pale hover:text-brand-teal"
        }`}
      >
        <BookOpen size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border theme-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b theme-border">
              <h3 className="text-lg font-semibold theme-text flex items-center gap-2">
                <BookOpen size={20} className="text-brand-teal" />
                Buscar versículo (RV1909)
              </h3>
              <button
                onClick={handleClose}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 theme-text-muted transition-colors"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <div className="px-5 py-4 space-y-3">
              {/* Libro */}
              <div>
                <label className="block text-sm font-medium theme-text mb-1">Libro</label>
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  className="w-full px-3 py-2 rounded border theme-border theme-bg theme-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                >
                  <option value="">Seleccionar libro...</option>
                  <optgroup label="— Antiguo Testamento —">
                    {atBooks.map((book) => (
                      <option key={book.name} value={book.name}>
                        {book.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="— Nuevo Testamento —">
                    {ntBooks.map((book) => (
                      <option key={book.name} value={book.name}>
                        {book.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Capítulo y versículos */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium theme-text mb-1">Capítulo</label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 rounded border theme-border theme-bg theme-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium theme-text mb-1">Versículo</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={verse}
                    onChange={(e) => setVerse(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 rounded border theme-border theme-bg theme-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium theme-text mb-1">
                    Hasta <span className="text-xs theme-text-muted">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={verseEnd}
                    onChange={(e) => setVerseEnd(e.target.value)}
                    placeholder="—"
                    className="w-full px-3 py-2 rounded border theme-border theme-bg theme-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  />
                </div>
              </div>

              {/* Botón buscar */}
              <button
                onClick={handleSearch}
                disabled={loading || !selectedBook || !chapter || !verse}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  loading || !selectedBook || !chapter || !verse
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-brand-teal text-white hover:bg-brand-teal/90"
                }`}
              >
                {loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Buscar
                  </>
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Resultado */}
              {result && (
                <div className="p-4 rounded border theme-border bg-brand-gold-pale/30 dark:bg-gray-800/50">
                  <p className="text-sm font-semibold text-brand-teal mb-2">
                    {result.reference}
                  </p>
                  <p className="text-sm theme-text leading-relaxed">
                    “{result.text}”
                  </p>
                  <button
                    onClick={handleInsert}
                    className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-brand-teal text-white hover:bg-brand-teal/90 transition-colors"
                  >
                    <BookOpen size={14} />
                    Insertar en el editor
                  </button>
                </div>
              )}
            </div>

            {/* Búsquedas recientes */}
            {recentSearches.length > 0 && (
              <div className="px-5 pb-4 border-t theme-border pt-3">
                <p className="text-xs font-medium theme-text-muted uppercase tracking-wider mb-2">
                  Recientes
                </p>
                <div className="space-y-1">
                  {recentSearches.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickSelect(item)}
                      className="w-full text-left px-3 py-2 rounded text-sm theme-text hover:bg-brand-gold-pale/50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="font-medium text-brand-teal">{item.reference}</span>
                      <span className="theme-text-muted ml-2 truncate">
                        {item.text.slice(0, 80)}…
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default BibleVerseLookup;
