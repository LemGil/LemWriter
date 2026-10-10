import { createClient } from '@supabase/supabase-js'

// En entorno Node.js (tests), usa process.env; en navegador/Vite, import.meta.env
const processEnv = typeof process !== 'undefined' ? process.env : undefined

// Configuración guardada desde la app (Configuración > Respaldo en la Nube).
// Permite que la app empaquetada se conecte sin .env.local.
function leerConfigGuardada() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem('lemwriter_supabase_config')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function guardarConfigSupabase(url, anonKey) {
  try {
    localStorage.setItem('lemwriter_supabase_config', JSON.stringify({ url, anonKey }))
  } catch { /* ignorar */ }
}

export function borrarConfigSupabase() {
  try { localStorage.removeItem('lemwriter_supabase_config') } catch { /* ignorar */ }
}

const configGuardada = leerConfigGuardada()

export const supabaseUrl = configGuardada?.url || import.meta.env?.VITE_SUPABASE_URL || processEnv?.VITE_SUPABASE_URL
export const supabaseAnonKey = configGuardada?.anonKey || import.meta.env?.VITE_SUPABASE_ANON_KEY || processEnv?.VITE_SUPABASE_ANON_KEY

// NOTA: RLS en tablas lw_* usa USING (true) — acceso anon total.
// Cuando se agregue autenticación, cambiar a USING (auth.uid() = user_id)
// y agregar columna user_id a todas las tablas lw_*

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('LemWriter: variables de Supabase no configuradas — modo offline')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseEnabled = () => !!supabase
