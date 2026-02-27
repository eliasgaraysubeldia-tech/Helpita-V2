import { Outlet, NavLink } from 'react-router-dom'
import { CalendarDays, Users, LayoutDashboard, BriefcaseMedical, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function AdminLayout() {
    const { session } = useAuth()

    // No session, should be caught by ProtectedRoute, but safe-guard
    if (!session) return null

    return (
        <div className="flex h-screen bg-background overflow-hidden font-sans">

            {/* Sidebar Fija Izquierda */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm hidden md:flex z-10">

                {/* Branding */}
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-dark rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        HB
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-primary-dark leading-tight">HelpitaFono</h1>
                        <p className="text-xs text-primary font-medium">Control Tower</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    <NavLink
                        to="/admin/workspace"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-primary-dark'
                            }`
                        }
                    >
                        <BriefcaseMedical className="w-5 h-5" />
                        Carlo's Workspace
                    </NavLink>

                    <NavLink
                        to="/admin/agenda"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-primary-dark'
                            }`
                        }
                    >
                        <CalendarDays className="w-5 h-5" />
                        Agenda
                    </NavLink>

                    <NavLink
                        to="/admin/pacientes"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-primary-dark'
                            }`
                        }
                    >
                        <Users className="w-5 h-5" />
                        Pacientes
                    </NavLink>

                    <NavLink
                        to="/admin/dashboard"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-primary-dark'
                            }`
                        }
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </NavLink>
                </nav>

                {/* Footer Info & Logout */}
                <div className="p-4 border-t border-gray-100 space-y-3">
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut()
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                    <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Sistema En Línea
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative">
                {/* El contenido específico de cada ruta (Agenda, Pacientes, etc) se inyecta aquí */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>

        </div>
    )
}
