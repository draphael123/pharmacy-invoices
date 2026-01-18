'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Upload, 
  TrendingUp, 
  Building2, 
  Package, 
  Settings,
  BarChart3,
  GitCompare,
  Bell,
  Boxes,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/upload', label: 'Upload', icon: Upload },
  { href: '/dashboard/projections', label: 'Projections', icon: TrendingUp },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/comparison', label: 'Compare', icon: GitCompare },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Boxes },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
];

const dataNavItems = [
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-[#e8e4df]">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={closeMobileMenu}>
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
          Dashboard
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        
        <p className="px-3 py-2 pt-4 text-[0.65rem] font-semibold uppercase tracking-wider text-[#404040]">
          Data
        </p>
        {dataNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
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
    </>
  );

  return (
    <div className="flex min-h-screen relative z-10">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 left-4 z-[100] w-11 h-11 rounded-lg bg-white border border-[#e8e4df] shadow-md flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <X className="w-5 h-5 text-[#1a1a1a]" />
        ) : (
          <Menu className="w-5 h-5 text-[#1a1a1a]" />
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-screen w-64 bg-[#f7f5f2] border-r border-[#e8e4df] flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 fixed left-0 top-0 h-screen bg-[#f7f5f2] border-r border-[#e8e4df] flex-col">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-56 bg-white min-h-screen">
        <div className="max-w-6xl mx-auto p-4 pt-16 md:p-8 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
