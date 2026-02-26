import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Plus, Edit2, Archive, MessageCircle, ExternalLink } from 'lucide-react'
import PatientFormModal from '../components/PatientFormModal'

export interface Patient {
    id: string
    child_full_name: string
    child_age: number
    city?: string
    address?: string
    neighborhood?: string
    reason?: string
    observations?: string
    first_time?: boolean
    commercial_stage: string
    clinical_stage: string
    is_active: boolean
    responsible?: {
        full_name: string
        phone: string
        email?: string
        ruc?: string
    }[]
}

export default function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

    const fetchPatients = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('patients')
            .select(`
        *,
        responsible (
          full_name,
          phone
        )
      `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching patients:', error)
        } else {
            setPatients(data as Patient[])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchPatients()
    }, [])

    const handleDeactivate = async (id: string) => {
        if (!confirm('¿Seguro que deseas desactivar este paciente?')) return

        const { error } = await supabase
            .from('patients')
            .update({ is_active: false })
            .eq('id', id)

        if (error) {
            alert('Error: ' + error.message)
        } else {
            fetchPatients()
        }
    }

    const openForm = (patient: Patient | null = null) => {
        setSelectedPatient(patient)
        setIsModalOpen(true)
    }

    const filteredPatients = patients.filter(p => {
        const term = searchTerm.toLowerCase()
        const matchName = p.child_full_name.toLowerCase().includes(term)
        const matchRespName = p.responsible?.[0]?.full_name.toLowerCase().includes(term)
        const matchPhone = p.responsible?.[0]?.phone.includes(term)
        return matchName || matchRespName || matchPhone
    })

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {/* Header & Actions */}
            <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-primary-dark">Pacientes</h2>
                    <p className="text-gray-500 text-sm mt-1">Gesti&oacute;n de pacientes activos</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar paciente, responsable..."
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => openForm()}
                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Alta R&aacute;pida
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-background/40 text-primary-dark font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">Ni&ntilde;o / Edad</th>
                            <th className="px-6 py-3">Responsable</th>
                            <th className="px-6 py-3">Contacto</th>
                            <th className="px-6 py-3">Estado Comercial</th>
                            <th className="px-6 py-3">Estado Cl&iacute;nico</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    Cargando pacientes...
                                </td>
                            </tr>
                        ) : filteredPatients.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No se encontraron pacientes activos.
                                </td>
                            </tr>
                        ) : (
                            filteredPatients.map(patient => (
                                <tr key={patient.id} className="hover:bg-background/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{patient.child_full_name}</div>
                                        <div className="text-xs text-gray-500">{patient.child_age} a&ntilde;os</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-700">
                                        {patient.responsible?.[0]?.full_name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-700">
                                        {patient.responsible?.[0]?.phone || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            {patient.commercial_stage}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            {patient.clinical_stage}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex justify-end gap-2 items-center">
                                        {patient.responsible?.[0]?.phone && (
                                            <a
                                                href={`https://wa.me/${patient.responsible[0].phone.replace(/\D/g, '')}?text=Hola, te escribimos de HelpitaFono...`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors tooltip"
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => alert(`El Portal de Padres para el paciente ${patient.child_full_name} se construirá en la siguiente fase y se integrará aquí.`)}
                                            className="p-1.5 text-primary hover:text-primary-dark hover:bg-primary/10 rounded-full transition-colors tooltip"
                                            title="Portal de Padres (Próximamente)"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                        <button
                                            onClick={() => openForm(patient)}
                                            className="p-1.5 text-gray-500 hover:text-primary transition-colors tooltip"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeactivate(patient.id)}
                                            className="p-1.5 text-gray-500 hover:text-red-500 transition-colors tooltip"
                                            title="Desactivar"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <PatientFormModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false)
                        fetchPatients()
                    }}
                    patientToEdit={selectedPatient}
                />
            )}
        </div>
    )
}
