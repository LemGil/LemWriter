/**
 * electron/services/aiService.js
 *
 * Servicio de IA local para LemWriter. Habla con el endpoint nativo
 * de Ollama (http://localhost:11434/api/chat) — NO usa la capa de
 * compatibilidad /v1/chat/completions porque esta última ignora
 * silenciosamente parámetros nativos como num_ctx, causando timeouts
 * en CPUs sin GPU al usar el contexto por defecto (más grande).
 *
 * Requiere que Ollama esté corriendo y que los siguientes modelos
 * estén disponibles (ollama list):
 *   - ibm/granite4:3b   (modelo por defecto — mejor precisión)
 *   - lfm2.5-1.2b       (fallback rápido, menor precisión)
 *
 * No requiere ninguna dependencia npm adicional — usa fetch nativo
 * de Node.js (disponible desde Node 18+, que Electron ya incluye).
 */

const http = require("http");
const OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "ibm/granite4:3b";
const FAST_MODEL = "lfm2.5-1.2b";

// Tiempo máximo de espera por respuesta antes de abortar (evita que la UI
// se quede "colgada" indefinidamente si el modelo tarda demasiado).
// 120s porque en CPU sin GPU, extractReferences con varias referencias
// y rangos puede tardar 60-90s legítimamente — no es un colgado real.
const REQUEST_TIMEOUT_MS = 120_000;

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
 * Llamada genérica a Ollama vía http.request con timeout real.
 * A diferencia de fetch + AbortController (que no aborta confiablemente
 * cuando el servidor ya empezó a generar), http.request + req.destroy()
 * SÍ interrumpe la conexión forzosamente al cumplirse el timeout.
 */
function ollamaRequest(path, body, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${OLLAMA_BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port || 11434,
      path: url.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Respuesta inválida de Ollama: ${data.slice(0, 200)}`));
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(
        new Error(
          `El modelo tardó más de ${timeoutMs / 1000}s en responder (timeout)`
        )
      );
    });

    req.on("error", (err) => {
      if (err.code === "ECONNREFUSED") {
        reject(new Error("No se pudo conectar con Ollama. ¿Está ejecutándose?"));
      } else {
        reject(err);
      }
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Llamada genérica de chat a Ollama. Uso interno — las funciones
 * específicas (extractReferences, classifyResource) construyen el
 * prompt correcto y llaman a esta función.
 */
async function queryModel(
  prompt,
  { model = DEFAULT_MODEL, temperature = 0.1, maxTokens = 300 } = {}
) {
  const timerLabel = `[aiService] ${model} query`;
  console.time(timerLabel);

  try {
    const data = await ollamaRequest("/api/chat", {
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      keep_alive: "30m",
      options: {
        temperature,
        num_predict: maxTokens,
        num_ctx: 2048,
      },
    });

    const content = data.message?.content;

    if (!content) {
      throw new Error("Ollama no devolvió contenido en la respuesta");
    }

    console.timeEnd(timerLabel);
    return content;
  } catch (error) {
    console.timeEnd(timerLabel);
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

  const rawResponse = await queryModel(prompt, { model, temperature: 0.1, maxTokens: 300 });
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

  const rawResponse = await queryModel(prompt, { model, temperature: 0.0, maxTokens: 10 });

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

/**
 * Chat con streaming.
 * @param {Array} messages - Array de mensajes {role, content}
 * @param {Function} onChunk - Callback para cada fragmento de texto
 * @param {Object} options - Opciones adicionales
 */
async function chatStream(messages, onChunk, { model = DEFAULT_MODEL, temperature = 0.7 } = {}) {
  const controller = new AbortController();
  const timerLabel = `[aiService] ${model} chatStream`;
  console.time(timerLabel);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        stream: true, // Habilitar streaming
        keep_alive: "30m",
        options: {
          temperature,
          num_ctx: 2048,
          num_predict: 800,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama respondió ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            onChunk(json.message.content);
          }
          if (json.done) {
            console.timeEnd(timerLabel);
            console.log(`[aiService] Stats: eval_count=${json.eval_count}, eval_duration=${json.eval_duration}ms`);
          }
        } catch (e) {
          console.error('Error parseando chunk:', e);
        }
      }
    }
  } catch (error) {
    console.timeEnd(timerLabel);
    throw error;
  }
}

module.exports = {
  checkOllamaStatus,
  extractReferences,
  classifyResource,
  queryModel,
  chatStream, // <-- Exportar nuevo método
  DEFAULT_MODEL,
  FAST_MODEL,
  RESOURCE_CATEGORIES,
};
