import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    ArrowLeft, User, Phone, Mail, Hash, CheckCircle2, XCircle,
    RefreshCw, Plus, FileText, CalendarCheck, Wallet, ChevronDown, ChevronRight, Activity
} from 'lucide-react'

// Subcomponents could be extracted, but keeping single-file for MVP speed
import RescheduleModal from '../components/RescheduleModal'
import CancelModal from '../components/CancelModal'

export default function WorkspacePatientPage() {
    const { patientId } = useParams()

    const [loading, setLoading] = useState(true)
    const [patient, setPatient] = useState<any>(null)
    const [appointments, setAppointments] = useState<any[]>([])
    const [caseNotes, setCaseNotes] = useState<any[]>([])
    const [payments, setPayments] = useState<any[]>([])

    // Modals state
    const [rescheduleAppt, setRescheduleAppt] = useState<any>(null)
    const [cancelAppt, setCancelAppt] = useState<any>(null)

    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
    const [noteForm, setNoteForm] = useState({ type: 'Evolucion', content: '', appointment_id: '' })

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [paymentForm, setPaymentForm] = useState({ appointment_id: '', amount: '', method: 'efectivo', notes: '' })

    const [showPaymentsList, setShowPaymentsList] = useState(false)

    // Fetch Everything
    const fetchData = async () => {
        if (!patientId) return
        setLoading(true)
        try {
            // 1. Patient rules (Master data readonly)
            const { data: pData, error: pErr } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .single()

            if (pErr) throw pErr

            // Fetch responsible data explicitly since it's a separate table linked by patient_id
            const { data: respData, error: respErr } = await supabase
                .from('responsible')
                .select('*')
                .eq('patient_id', patientId)
                .single()

            if (respErr && respErr.code !== 'PGRST116') {
                // Ignore no rows found error, but throw others
                console.error("Error fetching responsible:", respErr)
            }

            setPatient({
                ...pData,
                responsible: respData || null
            })

            // 2. Appointments
            const { data: aData } = await supabase
                .from('appointments')
                .select('*')
                .eq('patient_id', patientId)
                .order('slot_date', { ascending: false })
                .order('start_time', { ascending: false })

            setAppointments(aData || [])

            // 3. Notes
            const { data: nData } = await supabase
                .from('case_notes')
                .select('*, appointments(slot_date, start_time)')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })

            setCaseNotes(nData || [])

            // 4. Payments
            // We fetch all payments related to this patient's appointments
            const currentApptIds = (aData || []).map(a => a.id)
            if (currentApptIds.length > 0) {
                const { data: payData } = await supabase
                    .from('payments')
                    .select('*, appointments(slot_date)')
                    .in('appointment_id', currentApptIds)
                    .order('created_at', { ascending: false })
                setPayments(payData || [])
            }

        } catch (err) {
            console.error("Error fetching patient workspace", err)
            // navigate('/admin/workspace')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [patientId])

    // Specific Status Updates (same code logic as agenda but scoped to single appt)
    const handleApptStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id)
            if (error) throw error
            fetchData()
        } catch (err: any) {
            alert('Error al actualizar: ' + err.message)
        }
    }

    const handleClinicalStageUpdate = async (newStage: string) => {
        try {
            const { error } = await supabase.from('patients').update({ clinical_stage: newStage }).eq('id', patientId)
            if (error) throw error

            if (newStage === 'Alta clínica') {
                // Auto create note
                await supabase.from('case_notes').insert({
                    patient_id: patientId,
                    note_type: 'Alta',
                    content: 'El paciente ha recibido el Alta Clínica desde el panel de Workspace.'
                })
            }
            fetchData()
        } catch (err: any) {
            alert('Error updating clinical stage: ' + err.message)
        }
    }

    const saveNote = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await supabase.from('case_notes').insert({
                patient_id: patientId,
                note_type: noteForm.type,
                content: noteForm.content,
                appointment_id: noteForm.appointment_id || null
            })
            setIsNoteModalOpen(false)
            setNoteForm({ type: 'Evolucion', content: '', appointment_id: '' })
            fetchData()
        } catch (err) {
            console.error(err)
            alert("Error al guardar nota")
        }
    }

    const savePayment = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await supabase.from('payments').insert({
                appointment_id: paymentForm.appointment_id,
                amount: parseFloat(paymentForm.amount),
                method: paymentForm.method,
                notes: paymentForm.notes
            })

            // Show toast visually (in MVP we just alert if not using sonner)
            // toast.success("Pago registrado")
            alert("Pago registrado con éxito")

            setIsPaymentModalOpen(false)
            setPaymentForm({ appointment_id: '', amount: '', method: 'efectivo', notes: '' })
            fetchData()
        } catch (err) {
            console.error(err)
            alert("Error al guardar pago")
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando Workspace...</div>
    if (!patient) return <div className="p-8 text-center text-gray-500">Paciente no encontrado</div>

    // Deduce upcoming vs history
    // A future appointment is one whose slot_date > today OR (slot_date == today and uncompleted)
    // For simplicity: order was desc, find first one that is 'Agendado' or 'Reprogramado'
    const upcomingAppt = appointments.find(a => ['Agendado', 'Reprogramado', 'Confirmado'].includes(a.status))
    const historyAppts = appointments.filter(a => upcomingAppt ? a.id !== upcomingAppt.id : true)

    // Helper: is an appointment paid?
    const isApptPaid = (apptId: string) => {
        return payments.some(p => p.appointment_id === apptId && p.is_paid)
    }

    return (
        <div className="flex flex-col h-full space-y-4 max-w-5xl mx-auto pb-10">
            {/* Nav */}
            <div className="flex items-center gap-4">
                <Link to="/admin/workspace" className="p-2 border rounded-lg hover:bg-gray-50 bg-white shadow-sm text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-2xl font-bold text-gray-900">Ficha de Workspace</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* LEFT COLUMN: Patient Info & Actions */}
                <div className="lg:col-span-1 space-y-4">
                    {/* A) Resumen del Paciente */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-bold text-gray-800 text-lg mb-4">{patient.child_full_name}</h3>

                        <div className="space-y-3 text-sm text-gray-600 mb-6">
                            <p className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> Resp: {patient.responsible?.full_name}</p>
                            <p className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" /> {patient.responsible?.phone}
                                {patient.responsible?.phone && (
                                    <a href={`https://wa.me/${patient.responsible.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-600 ml-1">
                                        (WhatsApp)
                                    </a>
                                )}
                            </p>
                            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {patient.responsible?.email || 'N/A'}</p>
                            <p className="flex items-center gap-2"><Hash className="w-4 h-4 text-gray-400" /> RUC: {patient.responsible?.document_id || 'N/A'}</p>

                            {patient.reason_for_consultation && (
                                <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-100 text-xs italic">
                                    <span className="font-bold block not-italic text-gray-700 mb-1">Motivo:</span>
                                    {patient.reason_for_consultation}
                                </div>
                            )}
                        </div>

                        {/* Badges and Stages */}
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fase Comercial</label>
                                <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">{patient.commercial_stage || 'N/A'}</span>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado Clínico</label>
                                <select
                                    className="w-full text-sm border-gray-200 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary/20 bg-white"
                                    value={patient.clinical_stage || ''}
                                    onChange={(e) => handleClinicalStageUpdate(e.target.value)}
                                >
                                    <option value="Pendiente Evaluación">Pendiente Evaluación</option>
                                    <option value="En Evaluación">En Evaluación</option>
                                    <option value="Tratamiento Activo">Tratamiento Activo</option>
                                    <option value="Seguimiento">Seguimiento</option>
                                    <option value="Derivado">Derivado</option>
                                    <option value="Alta clínica">Alta clínica</option>
                                </select>
                            </div>
                        </div>

                        {/* F) Alta button */}
                        {patient.clinical_stage !== 'Alta clínica' && (
                            <button
                                onClick={() => handleClinicalStageUpdate('Alta clínica')}
                                className="w-full mt-6 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Activity className="w-4 h-4" /> Dar Alta Clínica
                            </button>
                        )}
                    </div>

                    {/* E) Pagos V1 */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                            onClick={() => setShowPaymentsList(!showPaymentsList)}
                            className="w-full p-4 flex items-center justify-between font-bold text-gray-800 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Pagos Registrados</span>
                            {showPaymentsList ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        </button>

                        {showPaymentsList && (
                            <div className="p-4 border-t border-gray-100">
                                {payments.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">No hay pagos registrados.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {payments.map(p => (
                                            <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border border-gray-100">
                                                <div>
                                                    <div className="font-semibold text-gray-800">{format(new Date(p.created_at), 'dd/MM/yyyy')}</div>
                                                    <div className="text-xs text-gray-500 capitalize">{p.method}</div>
                                                </div>
                                                <div className="font-bold text-green-600">
                                                    Gs. {p.amount.toLocaleString('es-PY')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        setPaymentForm({ ...paymentForm, appointment_id: historyAppts[0]?.id || '' })
                                        setIsPaymentModalOpen(true)
                                    }}
                                    className="w-full mt-3 py-2 text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg font-medium text-sm transition-colors"
                                >
                                    + Registrar Pago
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Appts & Notes */}
                <div className="lg:col-span-2 space-y-4">

                    {/* B) Próximo Turno */}
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
                        <div className="bg-blue-50 px-5 py-3 border-b border-blue-100">
                            <h3 className="font-bold text-blue-900 flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-blue-600" /> Próximo Turno</h3>
                        </div>
                        <div className="p-5">
                            {upcomingAppt ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 capitalize">
                                            {format(new Date(`${upcomingAppt.slot_date}T00:00:00`), 'EEEE, d MMM', { locale: es })}
                                        </p>
                                        <p className="text-gray-600 font-medium">Hora: {upcomingAppt.start_time.substring(0, 5)} hrs</p>
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold uppercase rounded">{upcomingAppt.status}</span>
                                    </div>

                                    {/* Action Buttons specific for Workspace */}
                                    <div className="flex flex-wrap gap-2 sm:justify-end">
                                        <button onClick={() => handleApptStatusUpdate(upcomingAppt.id, 'Confirmado')} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                                        </button>
                                        <button onClick={() => handleApptStatusUpdate(upcomingAppt.id, 'Completado')} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded-lg flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Fin
                                        </button>
                                        <button onClick={() => handleApptStatusUpdate(upcomingAppt.id, 'NoShow')} className="px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg flex items-center gap-1">
                                            <XCircle className="w-3.5 h-3.5" /> Falta
                                        </button>
                                        <button onClick={() => setRescheduleAppt(upcomingAppt)} className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1 border border-gray-200">
                                            <RefreshCw className="w-3.5 h-3.5" /> Mover
                                        </button>
                                        <button onClick={() => setCancelAppt(upcomingAppt)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1">
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm flex items-center justify-between">
                                    <span>No hay turnos futuros agendados.</span>
                                    <Link to="/admin/agenda" className="text-primary hover:underline font-medium">Ir a la Agenda</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* C) Observaciones / Notas */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Historial Clínico (Notas)</h3>
                            <button
                                onClick={() => setIsNoteModalOpen(true)}
                                className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Agregar Nota
                            </button>
                        </div>

                        <div className="space-y-4">
                            {caseNotes.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No hay observaciones registradas aún.</p>
                            ) : (
                                caseNotes.map(note => (
                                    <div key={note.id} className="border-l-2 border-primary/30 pl-4 py-1 relative">
                                        <div className="absolute w-2 h-2 bg-primary rounded-full -left-[5px] top-2"></div>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase text-gray-500">{note.note_type}</span>
                                                <span className="text-xs text-gray-400">{format(new Date(note.created_at), 'dd/MM/yyyy HH:mm')}</span>
                                            </div>
                                            {note.appointments && (
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded cursor-default" title={`Asociado al turno: ${note.appointments.slot_date} ${note.appointments.start_time.substring(0, 5)}`}>
                                                    Turno asoc.
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* D) Historial de Turnos y Pagos */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-bold text-gray-900 mb-4">Historial de Turnos</h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="pb-2 font-semibold">Fecha y Hora</th>
                                        <th className="pb-2 font-semibold">Estado</th>
                                        <th className="pb-2 font-semibold">Pago</th>
                                        <th className="pb-2 font-semibold text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyAppts.length === 0 && (
                                        <tr><td colSpan={4} className="py-4 text-center italic text-gray-400">Sin historial anterior.</td></tr>
                                    )}
                                    {historyAppts.map(app => {
                                        const paid = isApptPaid(app.id)
                                        return (
                                            <tr key={app.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                                <td className="py-3">
                                                    {format(new Date(`${app.slot_date}T00:00:00`), 'dd/MM/yyyy')} a las {app.start_time.substring(0, 5)}
                                                </td>
                                                <td className="py-3 capitalize">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${app.status === 'Completado' ? 'bg-gray-200 text-gray-800' : app.status === 'Cancelado' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{app.status}</span>
                                                </td>
                                                <td className="py-3">
                                                    {app.status === 'Completado' ? (
                                                        paid ? (
                                                            <span className="text-green-600 font-bold text-xs">Pagado</span>
                                                        ) : (
                                                            <span className="text-orange-600 font-bold text-xs animate-pulse">Pendiente</span>
                                                        )
                                                    ) : '-'}
                                                </td>
                                                <td className="py-3 text-right">
                                                    {app.status === 'Completado' && !paid && (
                                                        <button
                                                            onClick={() => {
                                                                setPaymentForm({ ...paymentForm, appointment_id: app.id })
                                                                setIsPaymentModalOpen(true)
                                                            }}
                                                            className="text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 px-2 py-1 rounded transition-colors"
                                                        >
                                                            Cobrar
                                                        </button>
                                                    )}
                                                    {app.status === 'Completado' && paid && (
                                                        <span className="text-gray-400 text-xs">✓</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {/* Note Modal */}
            {isNoteModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Agregar Nota / Evolución</h3>
                        <form onSubmit={saveNote} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Nota</label>
                                <select
                                    className="w-full border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                                    value={noteForm.type}
                                    onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}
                                    required
                                >
                                    <option value="Evolucion">Evolución (Visita regular)</option>
                                    <option value="Sesion">Resumen de Sesión</option>
                                    <option value="Plan">Plan de Tratamiento</option>
                                    <option value="Observacion">Observación General</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Turno Asociado (Opcional)</label>
                                <select
                                    className="w-full border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                                    value={noteForm.appointment_id}
                                    onChange={(e) => setNoteForm({ ...noteForm, appointment_id: e.target.value })}
                                >
                                    <option value="">Sin asociar (Nota general)</option>
                                    {appointments.slice(0, 5).map(app => (
                                        <option key={app.id} value={app.id}>
                                            {format(new Date(`${app.slot_date}T00:00:00`), 'dd/MM/yyyy')} - {app.start_time.substring(0, 5)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Detalle</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm resize-none"
                                    placeholder="Escriba aquí los detalles..."
                                    value={noteForm.content}
                                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 justify-end mt-6">
                                <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg">
                                    Guardar Nota
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" /> Registrar Pago
                        </h3>
                        <form onSubmit={savePayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                                <select
                                    className="w-full border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm bg-gray-50"
                                    value={paymentForm.appointment_id}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, appointment_id: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Seleccione un turno</option>
                                    {appointments.filter(a => a.status === 'Completado' || a.status === 'Confirmado' || a.status === 'Agendado').map(app => (
                                        <option key={app.id} value={app.id}>
                                            {format(new Date(`${app.slot_date}T00:00:00`), 'dd/MM/yy')} ({app.start_time.substring(0, 5)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (Gs.)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    placeholder="Ej: 150000"
                                    className="w-full border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                                <select
                                    className="w-full border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                                    value={paymentForm.method}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                    required
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia Bancaria</option>
                                    <option value="tarjeta_debito">Tarjeta de Débito</option>
                                    <option value="tarjeta_credito">Tarjeta de Crédito</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nota del recibo (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Nro Factura / Ref..."
                                    className="w-full border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 justify-end mt-6">
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg">
                                    Confirmar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Existing Agenda Modals Reactivation */}
            {rescheduleAppt && (
                <RescheduleModal
                    appointment={rescheduleAppt}
                    currentDateAppointments={appointments.filter(a => a.slot_date === rescheduleAppt.slot_date)}
                    onClose={() => setRescheduleAppt(null)}
                    onSuccess={() => {
                        setRescheduleAppt(null)
                        fetchData()
                    }}
                />
            )}

            {cancelAppt && (
                <CancelModal
                    appointment={cancelAppt}
                    onClose={() => setCancelAppt(null)}
                    onSuccess={() => {
                        setCancelAppt(null)
                        fetchData()
                    }}
                />
            )}

        </div>
    )
}
