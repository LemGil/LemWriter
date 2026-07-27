import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, ChevronDown, Bot, User, Loader2, Settings } from 'lucide-react'

const SYSTEM_PROMPTS = {
  libro: 'Eres un asistente experto en escritura de libros cristianos. Ayudas a autores a desarrollar contenido teológico sólido, con buena estructura, claridad expositiva y fidelidad bíblica.',
  book: 'Eres un asistente experto en escritura de libros cristianos. Ayudas a autores a desarrollar contenido teológico sólido, con buena estructura, claridad expositiva y fidelidad bíblica.',
  ensenanza: 'Eres un asistente experto en creación de enseñanzas y clases bíblicas. Ayudas a estructurar lecciones con texto base, objetivos, puntos principales, aplicación práctica y preguntas de reflexión.',
  teaching: 'Eres un asistente experto en creación de enseñanzas y clases bíblicas. Ayudas a estructurar lecciones con texto base, objetivos, puntos principales, aplicación práctica y preguntas de reflexión.',
  devocional: 'Eres un asistente experto en escribir devocionales cristianos. Ayudas a crear reflexiones breves con versículo clave, meditación, aplicación personal y oración.',
  devotional: 'Eres un asistente experto en escribir devocionales cristianos. Ayudas a crear reflexiones breves con versículo clave, meditación, aplicación personal y oración.',
  estudio: 'Eres un asistente experto en estudios bíblicos. Ayudas a analizar pasajes, extraer puntos de enseñanza, preparar preguntas de discusión y aplicar la Palabra a la vida diaria.',
  study: 'Eres un asistente experto en estudios bíblicos. Ayudas a analizar pasajes, extraer puntos de enseñanza, preparar preguntas de discusión y aplicar la Palabra a la vida diaria.',
  sermon: 'Eres un asistente experto en predicación y homilética. Ayudas a estructurar sermones con gancho, texto base, punto principal, ilustraciones, aplicación y llamado.',
  video: 'Eres un asistente experto en creación de contenido ministerial en video. Ayudas a estructurar guiones con gancho inicial, texto base, punto central, ilustraciones visuales y llamado a la acción.',
}

const QUICK_PROMPTS = [
  { label: 'Sugerir esquema', prompt: 'Sugiere un esquema o estructura para esta sección' },
  { label: 'Mejorar redacción', prompt: 'Ayúdame a mejorar la redacción de este texto' },
  { label: 'Citas bíblicas', prompt: 'Analiza los pasajes bíblicos mencionados en el texto y explica su significado, contexto y aplicación práctica' },
  { label: 'Explicar pasaje', prompt: 'Explícame el significado de este pasaje bíblico' },
]

// Libros bíblicos ordenados por longitud descendente para matcheo greedy
const BOOK_NAMES = [
  "Cantar de los Cantares", "1 Tesalonicenses", "2 Tesalonicenses", "Apocalipsis",
  "1 Corintios", "2 Corintios", "Eclesiastés", "Lamentaciones", "Proverbios",
  "1 Crónicas", "2 Crónicas", "Filipenses", "Colosenses", "1 Timoteo", "2 Timoteo",
  "1 Samuel", "2 Samuel", "1 Reyes", "2 Reyes", "1 Pedro", "2 Pedro", "1 Juan", "2 Juan", "3 Juan",
  "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio", "Josué", "Jueces",
  "Salmos", "Isaías", "Jeremías", "Ezequiel", "Daniel", "Oseas", "Joel", "Amós",
  "Abdías", "Jonás", "Miqueas", "Nahúm", "Habacuc", "Sofonías", "Hageo",
  "Zacarías", "Malaquías", "Mateo", "Marcos", "Lucas", "Juan", "Hechos",
  "Romanos", "Gálatas", "Efesios", "Santiago", "Judas", "Rut", "Job",
  "Tito", "Filemón", "Hebreos", "Ester", "Nehemías", "Esdras",
]

// Parsea referencias bíblicas en un texto tipo "Mateo 5:1-12" o "Romanos 8:28"
function parseBibleReferences(text) {
  const refs = []
  // Escapar nombres para regex
  for (const book of BOOK_NAMES) {
    const escaped = book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`${escaped}\\s+(\\d+):(\\d+)(?:-(\\d+))?`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      refs.push({
        libro: book,
        capitulo: parseInt(match[1], 10),
        versiculo: parseInt(match[2], 10),
        versiculoFinal: match[3] ? parseInt(match[3], 10) : null,
      })
    }
  }
  return refs
}

// Busca referencias en la BD offline y devuelve array de { referencia, texto }
async function fetchBibleCitations(references) {
  const citations = []
  for (const ref of references) {
    try {
      const text = await window.api.bible.getVerse(ref)
      if (text) {
        const refStr = `${ref.libro} ${ref.capitulo}:${ref.versiculo}${ref.versiculoFinal ? '-' + ref.versiculoFinal : ''}`
        citations.push({ referencia: refStr, texto: text })
      }
    } catch (e) {
      console.warn('[OllamaChat] Error al buscar', ref, e)
    }
  }
  return citations
}

const OllamaChat = ({ projectType, sectionContent, isOpen, onClose }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('ibm/granite4:3b')
  const [models, setModels] = useState([])
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [includeContext, setIncludeContext] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      loadModels()
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Timer de tiempo transcurrido durante carga
  useEffect(() => {
    if (loading) {
      startTimeRef.current = Date.now()
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [loading])

  const loadModels = async () => {
    try {
      const list = await window.api.ollama.listModels()
      if (list && list.length > 0) {
        setModels(list)
        const hasDefault = list.some(m => m.name === model)
        if (!hasDefault) setModel(list[0].name)
      }
    } catch (err) {
      console.error('Error loading models:', err)
    }
  }

  const getSystemPrompt = () => {
    const base = SYSTEM_PROMPTS[projectType] || 'Eres un asistente experto en escritura y contenido ministerial cristiano.'
    return `${base}\n\nSiempre responde en español, con un tono respetuoso y edificante. Basa tus respuestas en las Escrituras y en principios teológicos sólidos.`
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const systemPrompt = getSystemPrompt()
      let contextBlock = ''

      if (includeContext && sectionContent) {
        contextBlock = `\n\nContexto del contenido actual del usuario:\n"""\n${sectionContent}\n"""`
      }

      // Buscar referencias bíblicas en el mensaje del usuario y el contexto
      const allText = `${text}\n${sectionContent || ''}`
      const refs = parseBibleReferences(allText)
      let bibleContext = ''
      if (refs.length > 0) {
        const citations = await fetchBibleCitations(refs)
        if (citations.length > 0) {
          bibleContext = '\n\n=== TEXTO BÍBLICO VERIFICADO (fuente offline RV1909) ===\n'
          bibleContext += 'A continuación está el texto REAL de las referencias bíblicas mencionadas. '
          bibleContext += 'USA ESTE TEXTO para responder, NO uses tu memoria.\n'
          bibleContext += citations.map(c =>
            `${c.referencia}: "${c.texto}"`
          ).join('\n')
          bibleContext += '\n===================================================='
        }
      }

      const apiMessages = [
        { role: 'system', content: systemPrompt + contextBlock + bibleContext },
        ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
      ]

      // DEBUG: Mostrar el prompt exacto en la consola
      console.log('[OllamaChat] Prompt enviado al modelo:')
      console.log('[OllamaChat] SYSTEM:', apiMessages[0].content)
      console.log('[OllamaChat] USER:', text)

      const result = await window.api.ollama.chat({ model, messages: apiMessages })

      if (result.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.message }])
      } else {
        // Mejorar mensaje de timeout
        const isTimeout = result.error?.includes('Timeout')
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: isTimeout
            ? `⏳ El modelo tardó demasiado en responder (timeout 5 min). El modelo en CPU es lento (~1 token/segundo).\n\nSugerencias:\n• Pregunta cosas más concretas para respuestas cortas\n• Usa "Citas bíblicas" con "Incluir contexto" activado (busca versículos sin IA)\n• Usa BibleVerseLookup (ícono 📖 en la toolbar) para citas directas`
            : `❌ Error: ${result.error || 'No se pudo conectar con Ollama. ¿Está ejecutándose?'}`
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error de conexión: ${err.message}`
      }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickPrompt = async (promptText, label) => {
    // Para "Citas bíblicas", buscar referencias en el contenido actual
    if (label === 'Citas bíblicas' && includeContext && sectionContent) {
      setLoading(true)

      // 1. Parsear referencias bíblicas del texto
      const refs = parseBibleReferences(sectionContent)

      // 2. Buscar cada referencia en la BD offline
      let citationBlock = ''
      if (refs.length > 0) {
        const citations = await fetchBibleCitations(refs)
        if (citations.length > 0) {
          citationBlock = '\n\nCitas bíblicas encontradas en el texto del usuario:\n'
          citationBlock += citations.map(c =>
            `- ${c.referencia}: "${c.texto}"`
          ).join('\n')
        }
      }

      // 3. Mensaje visible de feedback
      if (citationBlock) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `📖 Encontré ${refs.length} referencia(s) bíblica(s) en tu texto\n${citationBlock}`
        }])
      } else if (refs.length > 0) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `📖 Encontré ${refs.length} referencia(s) pero no se pudieron buscar en la BD offline (revisa que el libro esté escrito correctamente, ej. "Romanos 8:28")`
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'No encontré referencias bíblicas en formato "Libro Capítulo:Versículo" en tu texto. Puedes escribir el prompt manualmente.'
        }])
      }

      // 4. Preparar el prompt (handleSend inyectará las citas como contexto de sistema)
      const text = includeContext && sectionContent
        ? `${promptText}:\n"""\n${sectionContent}\n"""`
        : promptText
      setInput(text)
      inputRef.current?.focus()
      setLoading(false)
      return
    }

    const text = includeContext && sectionContent
      ? `${promptText}:\n"""\n${sectionContent}\n"""`
      : promptText
    setInput(text)
    inputRef.current?.focus()
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] max-h-[80vh] theme-bg border theme-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b theme-border theme-bg-secondary shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-brand-gold" />
          <span className="font-semibold text-sm">Asistente IA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="text-[11px] theme-text-muted hover:theme-text px-2 py-0.5 rounded border theme-border"
              title="Cambiar modelo"
            >
              {model.split(':')[0].split('/').pop()}
            </button>
            {showModelPicker && models.length > 0 && (
              <div className="absolute top-full right-0 mt-1 w-48 theme-bg border theme-border rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                {models.map(m => (
                  <button
                    key={m.name}
                    onClick={() => { setModel(m.name); setShowModelPicker(false) }}
                    className={`w-full text-left px-3 py-2 text-xs hover:theme-bg-secondary ${m.name === model ? 'theme-text font-semibold' : 'theme-text-muted'}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleNewChat}
            className="p-1 hover:theme-bg-secondary rounded text-xs theme-text-muted"
            title="Nuevo chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button onClick={onClose} className="p-1 hover:theme-bg-secondary rounded">
            <X size={16} className="theme-text-muted" />
          </button>
        </div>
      </div>

      {/* Context toggle */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b theme-border">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeContext}
            onChange={() => setIncludeContext(!includeContext)}
            className="w-3 h-3 accent-brand-gold"
          />
          <span className="text-[11px] theme-text-muted">Incluir contenido actual como contexto</span>
        </label>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot size={32} className="mx-auto text-brand-gold mb-2 opacity-60" />
            <p className="text-xs theme-text-muted mb-4">
              Pregunta al asistente sobre tu escritura. Puedo ayudarte a:
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QUICK_PROMPTS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickPrompt(q.prompt, q.label)}
                  className="text-[11px] px-2.5 py-1 rounded-full border theme-border theme-text-muted hover:theme-bg-secondary hover:theme-text transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={12} className="text-brand-gold" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-brand-gold text-white'
                : 'theme-bg-secondary theme-text'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full theme-bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <User size={12} className="theme-text-muted" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center shrink-0">
              <Bot size={12} className="text-brand-gold" />
            </div>
            <div className="max-w-[80%] rounded-lg px-3 py-2 theme-bg-secondary">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin theme-text-muted shrink-0" />
                <span className="text-xs theme-text-muted">
                  Pensando...
                  {elapsedSeconds < 60
                    ? ` (${elapsedSeconds} s)`
                    : ` (${Math.floor(elapsedSeconds / 60)} min ${elapsedSeconds % 60} s)`
                  }
                </span>
              </div>
              <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full bg-brand-gold rounded-full animate-pulse"
                  style={{ width: `${Math.min(100, (elapsedSeconds / 120) * 100)}%` }}
                />
              </div>
              {elapsedSeconds > 30 && (
                <p className="text-[10px] theme-text-muted mt-1">
                  {elapsedSeconds > 120
                    ? '⏳ El modelo está tardando mucho — considera preguntas más concretas'
                    : '💡 El modelo en CPU es lento (~1 token/s) — gracias por esperar'
                  }
                </p>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t theme-border shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            disabled={loading}
            className="flex-1 text-sm px-3 py-2 theme-bg-secondary theme-text rounded-lg border theme-border outline-none focus:border-brand-gold transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 bg-brand-gold text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default OllamaChat
