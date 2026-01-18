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
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/upload', label: 'Upload', icon: Upload },
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
      <aside className="w-56 fixed left-0 top-0 h-screen bg-[#f7f5f2] border-r border-[#e8e4df] flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-[#e8e4df]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
              <span className="text-white font-semibold text-sm">P</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#1a1a1a] tracking-tight">PharmaCast</h1>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[#404040]">
            Menu
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#e8e4df]">
          <div className="flex items-center gap-2 text-xs text-[#404040]">
            <div className="w-2 h-2 rounded-full bg-[#7c9a82]"></div>
            <span>Public access</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-56 bg-white min-h-screen">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
