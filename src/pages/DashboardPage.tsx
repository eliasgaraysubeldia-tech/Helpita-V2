export default function DashboardPage() {
    return (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md">
                <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="9" x2="9" y1="21" y2="9" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-primary-dark mb-2">Dashboard</h2>
                <p className="text-gray-500">
                    Métricas y reportes en construcción. Próximamente en la siguiente fase operativa.
                </p>
            </div>
        </div>
    )
}
