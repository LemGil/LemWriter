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
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Timeout de conexión con Ollama (120s)'));
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
        num_predict: 800,
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
        num_predict: 800,
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
