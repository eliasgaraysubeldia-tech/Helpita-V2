import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
    onClose: () => void
    onSuccess: () => void
    slotTime: string
    slotDate: Date
}

export default function BookingModal({ onClose, onSuccess, slotTime, slotDate }: Props) {
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const navigate = useNavigate()

    // 1. Buscador de pacientes
    useEffect(() => {
        const searchPatients = async () => {
            if (searchTerm.length < 2) {
                setSearchResults([])
                return
            }

            setSearching(true)

            // Search in patients or responsible (simplification: search patients first, then inner join responsible)
            const { data, error } = await supabase
                .from('patients')
                .select(`
                    id, 
                    child_full_name, 
                    is_active,
                    responsible!inner(full_name, phone)
                `)
                .eq('is_active', true)
                .ilike('child_full_name', `%${searchTerm}%`)
                .limit(5)

            if (!error && data) {
                setSearchResults(data)
            }
            setSearching(false)
        }

        const debounce = setTimeout(searchPatients, 400)
        return () => clearTimeout(debounce)
    }, [searchTerm])

    // 2. Guardar Turno
    const handleSave = async () => {
        if (!selectedPatient) {
            setErrorMsg('Selecciona un paciente primero.')
            return
        }

        setLoading(true)
        setErrorMsg('')

        try {
            // Check if slot is somehow taken (double check)
            const dateStr = slotDate.toISOString().split('T')[0]

            // Calculate end time (45 mins later)
            const [hours, minutes] = slotTime.split(':').map(Number)
            const endDate = new Date(slotDate)
            endDate.setHours(hours, minutes + 45, 0, 0)
            const endStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`

            const { error: insertError } = await supabase
                .from('appointments')
                .insert({
                    patient_id: selectedPatient.id,
                    slot_date: dateStr,
                    start_time: slotTime,
                    end_time: endStr,
                    status: 'Agendado',
                    notes: notes.trim()
                })

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('Este horario ya fue reservado de forma simultánea. Por favor escoge otro.')
                }
                throw insertError
            }

            onSuccess()
        } catch (err: any) {
            console.error(err)
            setErrorMsg(err.message || 'Error al guardar el turno.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-primary-dark">Agendar Turno</h2>
                        <p className="text-sm text-gray-500">Miércoles, {slotTime}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-5">
                    {/* Error */}
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {errorMsg}
                        </div>
                    )}

                    {/* Patient Selection */}
                    {!selectedPatient ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">Buscar paciente existente *</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Nombre del niño..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                />
                            </div>

                            {/* Results */}
                            {searchTerm.length >= 2 && (
                                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto shadow-inner bg-gray-50">
                                    {searching ? (
                                        <div className="p-3 text-sm text-gray-500 text-center">Buscando...</div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedPatient(p)}
                                                className="w-full text-left p-3 border-b border-gray-100 last:border-0 hover:bg-blue-50 focus:bg-blue-50 transition-colors"
                                            >
                                                <div className="font-semibold text-gray-900 text-sm">{p.child_full_name}</div>
                                                <div className="text-xs text-gray-500">{p.responsible?.[0]?.full_name} - {p.responsible?.[0]?.phone}</div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center">
                                            <p className="text-sm text-gray-500 mb-2">No se encontró al paciente.</p>
                                            <p className="text-xs text-red-500 font-medium mb-3">Los pacientes no se pueden crear desde la Agenda por reglas de negocio.</p>
                                            <button
                                                onClick={() => navigate('/admin/pacientes')}
                                                className="text-sm text-primary hover:text-primary-dark font-medium underline"
                                            >
                                                Ir a Pacientes para dar de alta
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-lg flex justify-between items-center">
                                <div>
                                    <span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1">Paciente Seleccionado</span>
                                    <div className="font-bold text-gray-900">{selectedPatient.child_full_name}</div>
                                    <div className="text-sm text-gray-600">Resp: {selectedPatient.responsible?.[0]?.full_name}</div>
                                </div>
                                <button
                                    onClick={() => setSelectedPatient(null)}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline p-1 text-right"
                                >
                                    Cambiar
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas del turno (Opcional)</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ej: Solo irá la madre..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedPatient || loading}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Guardando...' : 'Confirmar Turno'}
                    </button>
                </div>
            </div>
        </div>
    )
}
