import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, Calendar as CalendarIcon } from 'lucide-react'

// Defined 45m Slots (same as AgendaPage)
const FIXED_SLOTS = [
    { start: '08:00', end: '08:45' },
    { start: '08:45', end: '09:30' },
    { start: '09:30', end: '10:15' },
    { start: '10:15', end: '11:00' },
    { start: '11:00', end: '11:45' },
    { start: '11:45', end: '12:30' },
]

interface Props {
    onClose: () => void
    onSuccess: () => void
    appointment: any
    currentDateAppointments: any[] // to check collisions
}

export default function RescheduleModal({ onClose, onSuccess, appointment, currentDateAppointments }: Props) {
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    // Find free slots for the current Wednesday
    const freeSlots = FIXED_SLOTS.filter(slot => {
        // Can't move to same time
        if (slot.start === appointment.start_time.substring(0, 5)) return false

        // Is it occupied by another non-cancelled app?
        const isOccupied = currentDateAppointments.find(a =>
            a.start_time.startsWith(slot.start) &&
            a.status !== 'Cancelado' &&
            a.id !== appointment.id
        )
        return !isOccupied
    })

    const handleSave = async () => {
        if (!selectedSlot) return
        setLoading(true)
        setErrorMsg('')

        try {
            // Calc end time
            const [hours, minutes] = selectedSlot.split(':').map(Number)
            const endHours = hours + (minutes + 45) >= 60 ? hours + 1 : hours
            const endMins = (minutes + 45) % 60
            const endStr = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`
            const startStr = `${selectedSlot}:00`

            const { error } = await supabase
                .from('appointments')
                .update({
                    start_time: startStr,
                    end_time: endStr,
                    status: 'Reprogramado',
                })
                .eq('id', appointment.id)

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Conflicto: Ese horario acaba de ser ocupado. Escoge otro.')
                }
                throw error
            }

            onSuccess()
        } catch (err: any) {
            console.error(err)
            setErrorMsg(err.message || 'Error al reprogramar.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-primary-dark">Reprogramar Turno</h2>
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">{appointment.patients?.child_full_name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-4">
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {errorMsg}
                        </div>
                    )}

                    <div>
                        <p className="text-sm text-gray-600 mb-3">Selecciona un nuevo horario libre para <strong>hoy miércoles</strong>:</p>

                        {freeSlots.length === 0 ? (
                            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-500">No hay más horarios libres disponibles este miércoles.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {freeSlots.map(slot => (
                                    <button
                                        key={slot.start}
                                        onClick={() => setSelectedSlot(slot.start)}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all text-sm font-medium ${selectedSlot === slot.start
                                                ? 'bg-primary border-primary text-white shadow-md'
                                                : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:bg-blue-50'
                                            }`}
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                        {slot.start}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
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
                        disabled={!selectedSlot || loading}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Guardando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
