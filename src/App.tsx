import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import PatientsPage from './pages/PatientsPage'

function App() {
  const [supabaseStatus, setSupabaseStatus] = useState<string>('Comprobando Supabase...')

  useEffect(() => {
    async function checkSupabase() {
      try {
        const { error } = await supabase.from('patients').select('id').limit(1)
        if (error) {
          setSupabaseStatus('Supabase Error: ' + error.message)
        } else {
          setSupabaseStatus('Supabase OK ✅')
        }
      } catch (e) {
        setSupabaseStatus('Supabase Error de Conexión')
      }
    }
    checkSupabase()
  }, [])

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-dark rounded-full flex items-center justify-center text-white font-bold text-lg">
            HB
          </div>
          <h1 className="text-xl font-semibold text-primary-dark">Helpita Pacientes</h1>
        </div>
        <div className="text-sm font-medium px-3 py-1 bg-background text-primary-dark rounded-full border border-accent">
          {supabaseStatus}
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <PatientsPage />
      </main>
    </div>
  )
}

export default App
