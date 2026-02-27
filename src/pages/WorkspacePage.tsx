import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addDays, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Search, ChevronLeft, ChevronRight, Filter, ChevronRightCircle, Currency, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function WorkspacePage() {
    // Navigation for dates, similar to Agenda
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const today = new Date()
        const dayOfWeek = getDay(today)
        const daysToAdd = dayOfWeek <= 3 ? 3 - dayOfWeek : 3 + (7 - dayOfWeek)
        return addDays(today, daysToAdd)
    })

    const [appointments, setAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('Todos')

    const fetchWorkspaceData = async (date: Date) => {
        setLoading(true)
        try {
            const formattedDate = date.toISOString().split('T')[0]

            // Fetch appointments with patients and payments
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    patients (
                        id,
                        child_full_name
                    )
                `)
                .eq('slot_date', formattedDate)
                .order('start_time', { ascending: true })

            if (error) {
                console.error("Supabase appointments error:", error)
                throw error
            }

            // We need to fetch the responsible profiles manually to avoid TS deep nesting issues
            const patientIds = [...new Set(data?.map(app => app.patient_id).filter(Boolean))]

            let responsibleDict: Record<string, any> = {}
            if (patientIds.length > 0) {
                const { data: respData } = await supabase
                    .from('responsible')
                    .select('patient_id, full_name, phone')
                    .in('patient_id', patientIds)

                respData?.forEach(r => {
                    responsibleDict[r.patient_id] = r
                })
            }

            // Fetch payments explicitly to avoid missing relation cache errors
            const appointmentIds = data?.map(app => app.id) || []
            let paymentsDict: Record<string, any[]> = {}
            if (appointmentIds.length > 0) {
                const { data: payData, error: payErr } = await supabase
                    .from('payments')
                    .select('appointment_id, amount, is_paid')
                    .in('appointment_id', appointmentIds)

                if (payErr) console.error("Error fetching payments:", payErr)

                payData?.forEach(p => {
                    if (!paymentsDict[p.appointment_id]) paymentsDict[p.appointment_id] = []
                    paymentsDict[p.appointment_id].push(p)
                })
            }

            // Flatten related responsible data for easier logic, same as Agenda
            const flattenedData = data?.map(app => {
                // Determine payment status
                const apptsPayments = paymentsDict[app.id] || []
                const hasPayment = apptsPayments.some((p: any) => p.is_paid === true)

                return {
                    ...app,
                    responsible: responsibleDict[app.patient_id] || null,
                    isPaid: hasPayment
                }
            }) || []

            setAppointments(flattenedData)
        } catch (err) {
            console.error('Error fetching workspace data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchWorkspaceData(selectedDate)
    }, [selectedDate])

    // Derive computed lists
    const filteredAppointments = appointments.filter(app => {
        if (app.status === 'Cancelado') return false // Always hide cancelled in this view

        const term = searchTerm.toLowerCase()
        const childName = app.patients?.child_full_name || ''
        const respName = app.responsible?.full_name || ''
        const respPhone = app.responsible?.phone || ''

        const matchesSearch =
            childName.toLowerCase().includes(term) ||
            respName.toLowerCase().includes(term) ||
            respPhone.includes(term)

        const matchesStatus = statusFilter === 'Todos' || app.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const uncollectedTurnos = appointments.filter(app => app.status === 'Completado' && !app.isPaid)

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header & Pending Panel */}
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Carlo's Workspace</h2>
                            <p className="text-gray-500 text-sm">Operaciones y seguimiento clínico</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Date Navigation */}
                            <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 border rounded-lg hover:bg-gray-50 bg-white shadow-sm">
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 min-w-[200px] justify-center">
                                <Calendar className="w-5 h-5 text-primary" />
                                <span className="font-semibold text-gray-800 capitalize">
                                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                                </span>
                            </div>
                            <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 border rounded-lg hover:bg-gray-50 bg-white shadow-sm">
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Optional Pending Panel */}
                {uncollectedTurnos.length > 0 && (
                    <div className="xl:w-80 bg-orange-50 rounded-xl border border-orange-200 p-4 shrink-0 flex flex-col">
                        <h3 className="text-orange-800 font-bold mb-3 flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Pendientes hoy ({uncollectedTurnos.length})
                        </h3>
                        <div className="space-y-2 overflow-y-auto max-h-[120px]">
                            {uncollectedTurnos.map(app => (
                                <div key={app.id} className="bg-white rounded p-2 text-sm shadow-sm flex items-center justify-between">
                                    <div className="truncate pr-2">
                                        <div className="font-medium text-gray-900 truncate">{app.patients?.child_full_name}</div>
                                        <div className="text-xs text-gray-500">{app.start_time.substring(0, 5)} hrs</div>
                                    </div>
                                    <Link to={`/admin/workspace/${app.patient_id}`} className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap">
                                        Cobrar
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* List and Filters */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-lg">Turnos del Día</h3>
                    <div className="flex w-full sm:w-auto gap-2">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar paciente, responsable o tel..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="pl-9 pr-8 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm appearance-none bg-white"
                            >
                                <option value="Todos">Todos</option>
                                <option value="Agendado">Agendado</option>
                                <option value="Confirmado">Confirmado</option>
                                <option value="Completado">Completado</option>
                                <option value="NoShow">No Show</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredAppointments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p>No se encontraron turnos activos que coincidan con los filtros.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAppointments.map(app => (
                                <div key={app.id} className="group border border-gray-100 rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-primary/5 text-primary font-bold px-3 py-2 rounded-lg text-lg min-w-[80px] text-center">
                                            {app.start_time.substring(0, 5)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{app.patients?.child_full_name}</h4>
                                            <p className="text-sm text-gray-500 mt-0.5 max-w-xs truncate" title={`${app.responsible?.full_name} - ${app.responsible?.phone}`}>
                                                Resp: {app.responsible?.full_name || 'Sin asignar'} {app.responsible?.phone && `(${app.responsible.phone})`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                        {/* Status logic */}
                                        <div className="flex flex-col items-start sm:items-end gap-1">
                                            <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${app.status === 'Confirmado' ? 'bg-green-100 text-green-800' :
                                                app.status === 'Completado' ? 'bg-gray-100 text-gray-800' :
                                                    app.status === 'NoShow' ? 'bg-red-50 text-red-700' :
                                                        app.status === 'Reprogramado' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-blue-100 text-blue-800'
                                                }`}>
                                                {app.status}
                                            </span>

                                            {/* Payment Badge Logic */}
                                            {app.status === 'Completado' && !app.isPaid && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 uppercase">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                                    Pendiente de cobro
                                                </span>
                                            )}
                                            {app.isPaid && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 uppercase">
                                                    ✓ Pagado
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {app.status === 'Completado' && !app.isPaid ? (
                                                <Link
                                                    to={`/admin/workspace/${app.patient_id}`}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                                >
                                                    <Currency className="w-4 h-4" />
                                                    Cobrar
                                                </Link>
                                            ) : (
                                                <Link
                                                    to={`/admin/workspace/${app.patient_id}`}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:border-primary hover:text-primary text-gray-700 text-sm font-medium rounded-lg transition-colors group-hover:bg-primary/5"
                                                >
                                                    Abrir ficha
                                                    <ChevronRightCircle className="w-4 h-4 opacity-50 text-primary" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
