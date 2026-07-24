/**
 * electron/services/aiService.js
 *
 * Servicio de IA local para LemWriter. Habla con Ollama vía su API
 * compatible con OpenAI (http://localhost:11434/v1/chat/completions).
 *
 * Requiere que Ollama esté corriendo y que los siguientes modelos
 * estén disponibles (ollama list):
 *   - ibm/granite4:3b   (modelo por defecto — mejor precisión)
 *   - lfm2.5-1.2b       (fallback rápido, menor precisión)
 *
 * No requiere ninguna dependencia npm adicional — usa fetch nativo
 * de Node.js (disponible desde Node 18+, que Electron ya incluye).
 */

const OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "ibm/granite4:3b";
const FAST_MODEL = "lfm2.5-1.2b";

// Tiempo máximo de espera por respuesta antes de abortar (evita que la UI
// se quede "colgada" indefinidamente si el modelo tarda demasiado).
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Verifica si Ollama está corriendo y accesible.
 * Úsalo al iniciar la app para habilitar/deshabilitar las funciones de IA.
 */
async function checkOllamaStatus() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { available: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const modelNames = (data.models || []).map((m) => m.name);

    return {
      available: true,
      models: modelNames,
      hasDefaultModel: modelNames.includes(DEFAULT_MODEL),
      hasFastModel: modelNames.includes(FAST_MODEL),
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

/**
 * Llamada genérica de chat a Ollama. Uso interno — las funciones
 * específicas (extractReferences, classifyResource) construyen el
 * prompt correcto y llaman a esta función.
 */
async function queryModel(prompt, { model = DEFAULT_MODEL, temperature = 0.1 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama respondió ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Ollama no devolvió contenido en la respuesta");
    }

    return content;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error(
        `El modelo tardó más de ${REQUEST_TIMEOUT_MS / 1000}s en responder (timeout)`
      );
    }
    throw error;
  }
}

/**
 * Extrae un bloque JSON de la respuesta del modelo, incluso si viene
 * envuelto en ```json ... ``` o con texto adicional alrededor.
 */
function extractJsonFromResponse(text) {
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = jsonBlockMatch ? jsonBlockMatch[1] : text;

  try {
    return JSON.parse(candidate.trim());
  } catch (error) {
    throw new Error(
      `No se pudo parsear la respuesta del modelo como JSON: ${error.message}\n` +
        `Respuesta cruda: ${text.slice(0, 300)}`
    );
  }
}

/**
 * Extrae referencias bíblicas de un texto.
 * Devuelve un array de { libro, capitulo, versiculo, versiculo_final? }.
 */
async function extractReferences(texto, { model = DEFAULT_MODEL } = {}) {
  const prompt =
    'Extrae todas las referencias bíblicas mencionadas en este texto. ' +
    'Devuélvelas ÚNICAMENTE como una lista JSON (sin texto adicional), ' +
    'con formato {"libro": "", "capitulo": 0, "versiculo": 0, "versiculo_final": null}. ' +
    "Si una referencia es un solo versículo, deja versiculo_final en null. " +
    `Texto: "${texto}"`;

  const rawResponse = await queryModel(prompt, { model, temperature: 0.1 });
  const references = extractJsonFromResponse(rawResponse);

  if (!Array.isArray(references)) {
    throw new Error("Se esperaba un array de referencias, se recibió otro formato");
  }

  return references;
}

/**
 * Clasifica un recurso en una de las categorías definidas.
 * Devuelve la categoría como string (ej: "mapa", "diccionario").
 */
const RESOURCE_CATEGORIES = [
  "comentario",
  "mapa",
  "cronologia",
  "diccionario",
  "imagen",
  "video",
  "articulo",
];

async function classifyResource(descripcion, { model = DEFAULT_MODEL } = {}) {
  const prompt =
    `Clasifica este recurso en una de estas categorías: [${RESOURCE_CATEGORIES.join(", ")}]. ` +
    'Responde ÚNICAMENTE con la palabra de la categoría, sin explicación ni formato adicional. ' +
    `Recurso: "${descripcion}"`;

  const rawResponse = await queryModel(prompt, { model, temperature: 0.0 });

  // Limpia la respuesta por si el modelo agrega puntuación, mayúsculas, etc.
  const categoria = rawResponse.trim().toLowerCase().replace(/[.,:;"'`]/g, "");

  if (!RESOURCE_CATEGORIES.includes(categoria)) {
    throw new Error(
      `El modelo devolvió una categoría no reconocida: "${rawResponse}". ` +
        `Categorías válidas: ${RESOURCE_CATEGORIES.join(", ")}`
    );
  }

  return categoria;
}

module.exports = {
  checkOllamaStatus,
  extractReferences,
  classifyResource,
  queryModel,
  DEFAULT_MODEL,
  FAST_MODEL,
  RESOURCE_CATEGORIES,
};
