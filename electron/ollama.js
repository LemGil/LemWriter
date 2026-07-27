const http = require('http')

const DEFAULT_MODEL = 'ibm/granite4:3b'

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'

function parseHost(host) {
  const url = new URL(host)
  return { hostname: url.hostname, port: url.port || 11434 }
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const { hostname, port } = parseHost(OLLAMA_HOST)
    const options = { hostname, port, path, method, headers: { 'Content-Type': 'application/json' } }
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error(`Respuesta inválida de Ollama: ${data}`))
        }
      })
    })
    req.setTimeout(300000, () => {
      req.destroy();
      reject(new Error('Timeout de conexión con Ollama (300s)'));
    });
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function listModels() {
  try {
    const data = await request('GET', '/api/tags')
    return (data.models || []).map(m => ({
      name: m.name,
      model: m.model,
      size: m.size,
      details: m.details || {}
    }))
  } catch (err) {
    console.error('Error listing Ollama models:', err.message)
    return []
  }
}

async function chat(model, messages, options = {}) {
  try {
    const data = await request('POST', '/api/chat', {
      model: model || DEFAULT_MODEL,
      messages,
      stream: false,
      keep_alive: "30m",
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        num_ctx: 2048,
        num_predict: 200,
        ...options
      }
    })
    return {
      success: true,
      message: data.message?.content || '',
      done: data.done
    }
  } catch (err) {
    console.error('Error in Ollama chat:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Streaming version of chat().
 * Sends each token to onChunk(token), calls onDone(fullContent) when complete,
 * and onError(err) on failure.
 *
 * Uses Ollama /api/chat with stream:true (SSE / NDJSON).
 */
function chatStream(model, messages, options = {}, { onChunk, onDone, onError }) {
  const { hostname, port } = parseHost(OLLAMA_HOST);
  const body = JSON.stringify({
    model: model || DEFAULT_MODEL,
    messages,
    stream: true,
    keep_alive: "30m",
    options: {
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      num_ctx: 2048,
      num_predict: 200,
      ...options,
    },
  });

  const req = http.request(
    { hostname, port, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    (res) => {
      let buffer = '';
      let fullContent = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            const token = parsed.message?.content || '';
            if (token) {
              fullContent += token;
              onChunk(token, fullContent);
            }
            if (parsed.done) {
              onDone(fullContent);
            }
          } catch {
            // Skip malformed lines
          }
        }
      });

      res.on('end', () => {
        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer);
            const token = parsed.message?.content || '';
            if (token) fullContent += token;
            if (parsed.done || !token) onDone(fullContent);
          } catch {
            if (fullContent) onDone(fullContent);
          }
        }
      });
    }
  );

  req.setTimeout(300000, () => {
    req.destroy();
    onError(new Error('Timeout de conexión con Ollama (300s)'));
  });

  req.on('error', (err) => {
    onError(err);
  });

  req.write(body);
  req.end();

  // Return abort function
  return () => { req.destroy(); };
}

async function generate(model, prompt, options = {}) {
  try {
    const data = await request('POST', '/api/generate', {
      model: model || DEFAULT_MODEL,
      prompt,
      stream: false,
      keep_alive: "30m",
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        num_ctx: 2048,
        num_predict: 200,
        ...options
      }
    })
    return {
      success: true,
      response: data.response || '',
      done: data.done
    }
  } catch (err) {
    console.error('Error in Ollama generate:', err.message)
    return { success: false, error: err.message }
  }
}

module.exports = { listModels, chat, generate }
