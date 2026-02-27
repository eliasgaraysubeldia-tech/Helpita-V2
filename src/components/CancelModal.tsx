import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'

// Opciones de cancelación predefinidas
const CANCEL_REASONS = [
    "No puede asistir",
    "Enfermedad",
    "Problema económico",
    "Cambio de horario",
    "Falta de transporte",
    "Otro"
]

interface Props {
    onClose: () => void
    onSuccess: () => void
    appointment: any
}

export default function CancelModal({ onClose, onSuccess, appointment }: Props) {
    const [reason, setReason] = useState(CANCEL_REASONS[0])
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')

        try {
            const finalReason = notes.trim() ? `${reason} - ${notes.trim()}` : reason

            const { error } = await supabase
                .from('appointments')
                .update({
                    status: 'Cancelado',
                    cancel_reason: finalReason
                })
                .eq('id', appointment.id)

            if (error) throw error

            onSuccess()
        } catch (err: any) {
            console.error(err)
            setErrorMsg(err.message || 'Error al cancelar el turno.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-red-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-red-700">Cancelar Turno</h2>
                        <p className="text-sm text-red-600/80 truncate max-w-[200px]">{appointment.patients?.child_full_name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {errorMsg}
                        </div>
                    )}

                    <div className="text-sm text-gray-600 mb-2">
                        Estás a punto de cancelar el turno de las <strong>{appointment.start_time.substring(0, 5)}</strong>. Esta acción liberará el espacio en la agenda.
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo principal *</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                        >
                            {CANCEL_REASONS.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Detalle opcional</label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Escribe más detalles si es necesario..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Volver
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Cancelando...' : 'Sí, Cancelar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
