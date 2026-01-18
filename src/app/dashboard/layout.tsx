'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Upload, 
  TrendingUp, 
  Building2, 
  Package, 
  Settings,
  Activity
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/upload', label: 'Upload Data', icon: Upload },
  { href: '/dashboard/projections', label: 'Projections', icon: TrendingUp },
  { href: '/dashboard/pharmacies', label: 'Pharmacies', icon: Building2 },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen relative z-10">
      {/* Sidebar */}
      <aside className="w-64 fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700/50">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Activity className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">PharmaCast</h1>
              <p className="text-xs text-slate-400">Invoice Analytics</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="card !p-3 !bg-gradient-to-br !from-cyan-500/10 !to-teal-500/10 !border-cyan-500/20">
            <p className="text-xs text-slate-400 mb-1">Public Dashboard</p>
            <p className="text-xs text-cyan-400">No login required</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

