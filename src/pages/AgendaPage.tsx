import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addDays, subDays, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, Copy, Plus, User, Phone, CheckCircle2, XCircle, RefreshCw, MessageCircle } from 'lucide-react'
import BookingModal from '../components/BookingModal'
import RescheduleModal from '../components/RescheduleModal'
import CancelModal from '../components/CancelModal'

// Defined 45m Slots
const FIXED_SLOTS = [
    { start: '08:00', end: '08:45' },
    { start: '08:45', end: '09:30' },
    { start: '09:30', end: '10:15' },
    { start: '10:15', end: '11:00' },
    { start: '11:00', end: '11:45' },
    { start: '11:45', end: '12:30' },
]

export default function AgendaPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const today = new Date()
        const dayOfWeek = getDay(today)
        // If today is Mon (1) or Tue (2) move to this Wednesday (3). Else next Wednesday.
        const daysToAdd = dayOfWeek <= 3 ? 3 - dayOfWeek : 3 + (7 - dayOfWeek)
        return addDays(today, daysToAdd)
    })

    const [appointments, setAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [bookingSlot, setBookingSlot] = useState<string | null>(null) // start time to book
    const [rescheduleData, setRescheduleData] = useState<any | null>(null)
    const [cancelData, setCancelData] = useState<any | null>(null)

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error
            fetchAppointments(selectedDate) // refresh
        } catch (err: any) {
            console.error(err)
            alert('Error al actualizar estado: ' + err.message)
        }
    }

    // Fetch turnos
    const fetchAppointments = async (date: Date) => {
        setLoading(true)
        const dateStr = date.toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patients ( child_full_name ),
                patient_id
            `)
            .eq('slot_date', dateStr)

        if (error) {
            console.error('Error fetching appointments:', error)
        } else {
            // Also fetch responsible for each patient since we can't deeply nest easily in standard select here
            // We'll map them
            if (data && data.length > 0) {
                const patientIds = data.map(a => a.patient_id)
                const { data: respData } = await supabase
                    .from('responsible')
                    .select('patient_id, full_name, phone')
                    .in('patient_id', patientIds)

                const combined = data.map(app => ({
                    ...app,
                    responsible: respData?.find(r => r.patient_id === app.patient_id)
                }))
                setAppointments(combined)
            } else {
                setAppointments([])
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchAppointments(selectedDate)
    }, [selectedDate])

    const handlePrevWednesday = () => setSelectedDate(prev => subDays(prev, 7))
    const handleNextWednesday = () => setSelectedDate(prev => addDays(prev, 7))

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            {/* Header Área */}
            <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-primary-dark mb-1 flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-primary" />
                            Agenda — Medvital Shopping Pinedo
                        </h2>
                        <p className="text-gray-500 text-sm">Control estricto de citas para Fonoaudiología.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePrevWednesday}
                            className="p-1.5 rounded bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="text-center min-w-[200px]">
                            <span className="block text-primary-dark font-bold text-lg capitalize">
                                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                            </span>
                        </div>

                        <button
                            onClick={handleNextWednesday}
                            className="p-1.5 rounded bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mt-3 sm:mt-0">
                        <div className="flex flex-col items-center px-4 py-1 bg-white rounded border border-gray-200">
                            <span className="text-xs text-gray-500 font-medium uppercase">Ocupación</span>
                            <span className="text-lg font-bold text-primary-dark">
                                {appointments.filter(a => a.status !== 'Cancelado').length} <span className="text-sm font-normal text-gray-400">/ 6</span>
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                const free = FIXED_SLOTS.filter(s => {
                                    const app = appointments.find(a => a.start_time.startsWith(s.start) && a.status !== 'Cancelado')
                                    return !app
                                }).map(s => `${s.start} a ${s.end}`)

                                const text = free.length > 0
                                    ? `Hola, tengo turnos libres este miércoles en Medvital Pinedo: ${free.join(', ')}. Respondé cuál te queda mejor así te anoto.`
                                    : `No tengo turnos libres este miércoles en Medvital Pinedo.`

                                navigator.clipboard.writeText(text)
                                alert('Texto copiado al portapapeles listos para enviar por WhatsApp.')
                            }}
                            className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                            Copiar libres
                        </button>
                    </div>
                </div>
            </div>

            {/* Agenda Slots List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
                <div className="max-w-4xl mx-auto space-y-3">
                    {loading ? (
                        <div className="text-center p-10 text-gray-500">Cargando agenda...</div>
                    ) : (
                        FIXED_SLOTS.map((slot, idx) => {
                            // Find appointment for this slot (ignoring seconds in start_time match)
                            const appointment = appointments.find(a => a.start_time.startsWith(slot.start) && a.status !== 'Cancelado')

                            return (
                                <div key={idx} className={`flex border rounded-xl overflow-hidden shadow-sm transition-shadow ${appointment ? 'bg-blue-50/30 border-blue-200' : 'bg-white border-gray-200 hover:shadow-md'}`}>

                                    {/* Time Block */}
                                    <div className={`w-28 border-r flex flex-col items-center justify-center py-4 shrink-0 ${appointment ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                                        <span className={`text-xl font-bold ${appointment ? 'text-primary-dark' : 'text-gray-700'}`}>{slot.start}</span>
                                        <span className="text-xs text-gray-400 font-medium">hasta {slot.end}</span>
                                    </div>

                                    {/* Content Block */}
                                    <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        {!appointment ? (
                                            <>
                                                <div className="text-gray-400 text-sm italic flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                                    Slot disponible
                                                </div>
                                                <button
                                                    onClick={() => setBookingSlot(slot.start)}
                                                    className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:text-white bg-primary/10 hover:bg-primary px-4 py-2 rounded-lg transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" /> Agendar Turno
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {/* Occupied State */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                                            {appointment.patients?.child_full_name}
                                                            {appointment.responsible?.phone && (
                                                                <a
                                                                    href={`https://wa.me/${appointment.responsible.phone.replace(/\D/g, '')}?text=Hola, te escribimos de HelpitaFono para confirmar tu turno de las ${appointment.start_time.substring(0, 5)}...`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-green-500 hover:text-green-600 transition-colors"
                                                                    title="Enviar WhatsApp"
                                                                >
                                                                    <MessageCircle className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                        </h4>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${appointment.status === 'Confirmado' ? 'bg-green-100 text-green-800 border-green-200' :
                                                            appointment.status === 'Completado' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                                                appointment.status === 'NoShow' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                    appointment.status === 'Reprogramado' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                                        'bg-blue-100 text-blue-800 border-blue-200'
                                                            }`}>
                                                            {appointment.status === 'NoShow' ? 'No Show' : appointment.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                                                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {appointment.responsible?.full_name || 'Sin responsable'}</span>
                                                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {appointment.responsible?.phone || '-'}</span>
                                                    </div>
                                                    {appointment.notes && (
                                                        <p className="text-xs text-gray-500 mt-2 bg-white px-2 py-1 rounded border border-gray-100 italic">
                                                            {appointment.notes}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1 self-end sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 mt-3 sm:mt-0 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">

                                                    {appointment.status === 'Agendado' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(appointment.id, 'Confirmado')}
                                                            className="flex-1 sm:flex-none p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors tooltip flex items-center justify-center gap-1 text-xs font-medium"
                                                            title="Confirmar"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" /> <span className="sm:hidden">Confirmar</span>
                                                        </button>
                                                    )}

                                                    {(appointment.status === 'Agendado' || appointment.status === 'Confirmado' || appointment.status === 'Reprogramado') && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusUpdate(appointment.id, 'Completado')}
                                                                className="flex-1 sm:flex-none p-2 text-green-600 hover:bg-green-50 rounded transition-colors tooltip flex items-center justify-center gap-1 text-xs font-medium"
                                                                title="Completado"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" /> <span className="sm:hidden">Fin</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(appointment.id, 'NoShow')}
                                                                className="flex-1 sm:flex-none p-2 text-orange-600 hover:bg-orange-50 rounded transition-colors tooltip flex items-center justify-center gap-1 text-xs font-medium"
                                                                title="No Asistió (No Show)"
                                                            >
                                                                <XCircle className="w-4 h-4" /> <span className="sm:hidden">Falta</span>
                                                            </button>
                                                            <button
                                                                onClick={() => setRescheduleData(appointment)}
                                                                className="flex-1 sm:flex-none p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors tooltip flex items-center justify-center gap-1 text-xs font-medium"
                                                                title="Reprogramar a hoy"
                                                            >
                                                                <RefreshCw className="w-4 h-4" /> <span className="sm:hidden">Mover</span>
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={() => setCancelData(appointment)}
                                                        className="flex-1 sm:flex-none p-2 text-red-500 hover:bg-red-50 rounded transition-colors tooltip flex items-center justify-center gap-1 text-xs font-medium"
                                                        title="Cancelar Turno"
                                                    >
                                                        <XCircle className="w-4 h-4" /> <span className="sm:hidden">Cancelar</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Modals */}
            {bookingSlot && (
                <BookingModal
                    slotTime={bookingSlot}
                    slotDate={selectedDate}
                    onClose={() => setBookingSlot(null)}
                    onSuccess={() => {
                        setBookingSlot(null)
                        fetchAppointments(selectedDate)
                    }}
                />
            )}

            {rescheduleData && (
                <RescheduleModal
                    appointment={rescheduleData}
                    currentDateAppointments={appointments}
                    onClose={() => setRescheduleData(null)}
                    onSuccess={() => {
                        setRescheduleData(null)
                        fetchAppointments(selectedDate)
                    }}
                />
            )}

            {cancelData && (
                <CancelModal
                    appointment={cancelData}
                    onClose={() => setCancelData(null)}
                    onSuccess={() => {
                        setCancelData(null)
                        fetchAppointments(selectedDate)
                    }}
                />
            )}
        </div>
    )
}
