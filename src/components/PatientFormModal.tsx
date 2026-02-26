import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'
import type { Patient } from '../pages/PatientsPage'

interface Props {
    onClose: () => void
    onSuccess: () => void
    patientToEdit: Patient | null
}

export default function PatientFormModal({ onClose, onSuccess, patientToEdit }: Props) {
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    // Form State
    const [formData, setFormData] = useState({
        child_full_name: '',
        child_age: '',
        city: '',
        address: '',
        neighborhood: '',
        reason: '',
        observations: '',
        first_time: true,
        full_name: '',
        phone: '',
        email: '',
        ruc: '',
    })

    useEffect(() => {
        if (patientToEdit) {
            const resp: any = patientToEdit.responsible?.[0] || {}
            setFormData({
                child_full_name: patientToEdit.child_full_name || '',
                child_age: patientToEdit.child_age?.toString() || '',
                city: patientToEdit.city || '',
                address: patientToEdit.address || '',
                neighborhood: patientToEdit.neighborhood || '',
                reason: patientToEdit.reason || '',
                observations: patientToEdit.observations || '',
                first_time: patientToEdit.first_time ?? true,
                full_name: resp.full_name || '',
                phone: resp.phone || '',
                email: resp.email || '',
                ruc: resp.ruc || '',
            })
        }
    }, [patientToEdit])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as any
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        setFormData(prev => ({ ...prev, [name]: finalValue }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')

        try {
            if (!patientToEdit) {
                // Create - Check duplicates
                const normalizedName = formData.child_full_name.trim().toLowerCase()
                const normalizedPhone = formData.phone.trim().replace(/\s+/g, '')

                // We fetch candidates that are active and match the phone
                const { data: candidates, error: searchError } = await supabase
                    .from('responsible')
                    .select('patient_id, phone, patients!inner(*)')
                    .eq('patients.is_active', true)

                if (searchError) throw searchError

                const isDuplicate = candidates?.find(c => {
                    const cPhone = c.phone.trim().replace(/\s+/g, '')
                    const cName = (c.patients as any)?.child_full_name?.trim().toLowerCase() || ''
                    return cPhone === normalizedPhone && cName === normalizedName
                })

                if (isDuplicate) {
                    setErrorMsg('Ya existe un paciente activo con exactamente el mismo nombre y tel&eacute;fono del responsable.')
                    setLoading(false)
                    return
                }

                // Insert Patient
                const { data: newPatient, error: pError } = await supabase
                    .from('patients')
                    .insert({
                        child_full_name: formData.child_full_name.trim(),
                        child_age: parseInt(formData.child_age, 10),
                        city: formData.city.trim(),
                        address: formData.address.trim(),
                        neighborhood: formData.neighborhood.trim(),
                        reason: formData.reason.trim(),
                        observations: formData.observations.trim(),
                        first_time: formData.first_time,
                        commercial_stage: 'Nuevo',
                        clinical_stage: 'Primera consulta',
                        is_active: true
                    })
                    .select('id')
                    .single()

                if (pError) throw pError

                // Insert Responsible
                const { error: rError } = await supabase
                    .from('responsible')
                    .insert({
                        patient_id: newPatient.id,
                        full_name: formData.full_name.trim(),
                        phone: formData.phone.trim(),
                        email: formData.email.trim(),
                        ruc: formData.ruc.trim()
                    })

                if (rError) throw rError

            } else {
                // Update
                const { error: pError } = await supabase
                    .from('patients')
                    .update({
                        child_full_name: formData.child_full_name.trim(),
                        child_age: parseInt(formData.child_age, 10),
                        city: formData.city.trim(),
                        address: formData.address.trim(),
                        neighborhood: formData.neighborhood.trim(),
                        reason: formData.reason.trim(),
                        observations: formData.observations.trim(),
                        first_time: formData.first_time,
                    })
                    .eq('id', patientToEdit.id)

                if (pError) throw pError

                // Assuming 1 responsible for simplicity in MVP
                const { error: rError } = await supabase
                    .from('responsible')
                    .update({
                        full_name: formData.full_name.trim(),
                        phone: formData.phone.trim(),
                        email: formData.email.trim(),
                        ruc: formData.ruc.trim()
                    })
                    .eq('patient_id', patientToEdit.id)

                if (rError) throw rError
            }

            onSuccess()
        } catch (err: any) {
            console.error(err)
            setErrorMsg(err.message || 'Ocurri&oacute; un error al guardar.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-primary-dark">
                        {patientToEdit ? 'Editar Paciente' : 'Alta R&aacute;pida de Paciente'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                    {errorMsg && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            <span dangerouslySetInnerHTML={{ __html: errorMsg }} />
                        </div>
                    )}

                    {/* Secci&oacute;n Ni&ntilde;o */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Datos del Ni&ntilde;o/a</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre y Apellidos *</label>
                                <input required type="text" name="child_full_name" value={formData.child_full_name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Edad *</label>
                                <input required type="number" min="0" name="child_age" value={formData.child_age} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Barrio</label>
                                <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Direcci&oacute;n</label>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Consulta</label>
                                <textarea name="reason" rows={2} value={formData.reason} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                <textarea name="observations" rows={2} value={formData.observations} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer w-max">
                                <input type="checkbox" name="first_time" checked={formData.first_time} onChange={handleChange} className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
                                <span className="text-sm font-medium text-gray-700">&iquest;Es primera vez?</span>
                            </label>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full my-2"></div>

                    {/* Secci&oacute;n Responsable */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Datos del Responsable</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                                <input required type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tel&eacute;fono *</label>
                                <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">RUC (Factura)</label>
                                <input type="text" name="ruc" value={formData.ruc} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Guardando...' : 'Guardar Paciente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
