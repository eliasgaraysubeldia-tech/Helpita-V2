import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null) // Clear previous errors

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error('Login error:', error.message)
                setError('Credenciales inválidas. Por favor, verifique su email y contraseña.')
            } else {
                navigate('/admin/pacientes')
            }
        } catch (err) {
            console.error('Unexpected error:', err)
            setError('Ocurrió un error inesperado. Intente nuevamente más tarde.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-background font-sans p-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-40">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
                <div className="absolute top-0 -right-20 w-80 h-80 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
                <div className="absolute -bottom-40 left-20 w-80 h-80 bg-primary-dark rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
            </div>

            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-white/50 backdrop-blur-sm">

                {/* Header Section */}
                <div className="bg-gradient-to-b from-[#CFE5F7] to-white pt-10 pb-6 px-8 text-center relative">
                    <div className="w-32 h-32 mx-auto mb-4 relative drop-shadow-xl rounded-full overflow-hidden bg-white/50 border-4 border-white/80 p-1">
                        <img
                            src="/Helpita.png"
                            alt="Helpita Búho"
                            className="w-full h-full object-cover rounded-full hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Helpita&background=CFE5F7&color=0B3C5D&size=128&rounded=true';
                            }}
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-primary-dark mb-1 tracking-tight">BlueBrain</h1>
                    <p className="text-primary font-medium text-sm">Claridad en el proceso.</p>
                </div>

                {/* Form Section */}
                <div className="p-8 pt-4">
                    <form onSubmit={handleLogin} className="space-y-5">

                        {error && (
                            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl flex gap-3 items-center border border-red-100 shadow-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="group">
                            <label className="block text-sm font-semibold text-primary-dark mb-1.5 ml-1" htmlFor="email">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-accent group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none shadow-inner"
                                    placeholder="admin@helpita.cl"
                                    required
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-sm font-semibold text-primary-dark mb-1.5 ml-1" htmlFor="password">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-accent group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none shadow-inner"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-primary/30 text-base font-semibold text-white bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Conectando...
                                </>
                            ) : (
                                'Ingresar a Control Tower'
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs font-medium text-accent flex items-center justify-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        Acceso seguro a HelpitaFono
                    </p>
                </div>
            </div>
        </div>
    )
}
