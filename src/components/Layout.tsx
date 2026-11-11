import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  PlusCircle,
  History,
  LogOut,
  ChevronLeft,
  Coffee,
  Bot,
  Settings,
  CloudSun,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import logoImg from '@/assets/chatgpt-image-11-de-jul.de-2026-135832-ab74e.png'

const NAV = [
  { to: '/producer/dashboard', label: 'Início', icon: Home },
  { to: '/producer/new', label: 'Nova Análise', icon: PlusCircle },
  { to: '/producer/history', label: 'Histórico', icon: History },
  { to: '/producer/weather', label: 'Clima', icon: CloudSun },
  { to: '/producer/agents', label: 'Agentes IA', icon: Bot },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

const PAGE_TITLES: Record<string, string> = {
  '/producer/dashboard': 'Início',
  '/producer/new': 'Nova Análise',
  '/producer/history': 'Histórico',
  '/producer/weather': 'Clima',
  '/producer/agents': 'Agentes IA',
  '/settings': 'Configurações',
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut()
    navigate('/')
  }

  if (!user) return <Outlet />

  const showBackButton =
    location.pathname.includes('/result/') || location.pathname.includes('/report/')
  const currentTitle = showBackButton
    ? location.pathname.includes('/report/')
      ? 'Relatório'
      : 'Resultado'
    : (PAGE_TITLES[location.pathname] ?? 'Ceres AI')

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-black/[0.06] bg-white fixed inset-y-0 left-0 z-50">
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-black/[0.08] shadow-hig-1">
            <img src={logoImg} alt="Ceres AI" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-display font-bold text-hig-headline text-primary leading-none">
              Ceres AI
            </p>
            <p className="text-hig-caption text-muted-foreground mt-0.5">Café Verde Inteligente</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {NAV.map((item) => {
            const isActive = location.pathname === item.to
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl text-hig-subhead font-medium transition-colors',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.avatar ? (
                <img
                  src={pb.files.getURL(user, user.avatar)}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Coffee className="w-4 h-4 text-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-hig-subhead font-semibold text-foreground truncate">
                {user?.name ?? 'Usuário'}
              </p>
              <p className="text-hig-caption text-muted-foreground">Produtor</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-hig-subhead font-medium text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-64 lg:ml-72 flex flex-col min-h-screen">
        <header className="md:hidden sticky top-0 z-50 glass border-b border-black/[0.06]">
          <div className="flex items-center justify-between px-4 pt-3 pb-3 max-w-[430px] mx-auto w-full">
            <div className="w-10 flex items-center justify-start">
              {showBackButton ? (
                <button
                  onClick={() => navigate(-1)}
                  className="text-accent font-semibold text-hig-body -ml-1"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-black/[0.08] shadow-hig-1">
                  <img src={logoImg} alt="Ceres AI" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <h1 className="font-display font-bold text-hig-headline text-foreground tracking-tight">
              {currentTitle}
            </h1>
            <div className="w-10 flex items-center justify-end">
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-black/[0.06] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <header className="hidden md:block sticky top-0 z-40 glass border-b border-black/[0.06]">
          <div className="px-8 py-4 flex items-center justify-between">
            <h1 className="font-display font-bold text-hig-title2 text-primary tracking-tight">
              {currentTitle}
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-hig-subhead font-semibold text-foreground">{user?.name}</p>
                <p className="text-hig-caption text-muted-foreground">Produtor</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {user?.avatar ? (
                  <img
                    src={pb.files.getURL(user, user.avatar)}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Coffee className="w-4 h-4 text-accent" />
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-28 md:pb-8">
          <div className="max-w-[430px] mx-auto md:max-w-none md:px-8 md:py-6">
            <Outlet />
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 w-full max-w-[430px] left-1/2 -translate-x-1/2 glass border-t border-black/[0.06] z-50">
          <div className="flex justify-around items-center px-2 pt-2 pb-6">
            <MobileNavItem
              to="/producer/dashboard"
              icon={<Home className="w-6 h-6" />}
              iconFilled={<Home className="w-6 h-6" fill="currentColor" strokeWidth={0} />}
              label="Início"
              active={location.pathname === '/producer/dashboard'}
            />
            <MobileNavItemMain to="/producer/new" active={location.pathname === '/producer/new'} />
            <MobileNavItem
              to="/producer/history"
              icon={<History className="w-6 h-6" />}
              iconFilled={<History className="w-6 h-6" strokeWidth={2.5} />}
              label="Histórico"
              active={location.pathname === '/producer/history'}
            />
            <MobileNavItem
              to="/producer/weather"
              icon={<CloudSun className="w-6 h-6" />}
              iconFilled={<CloudSun className="w-6 h-6" fill="currentColor" strokeWidth={0} />}
              label="Clima"
              active={location.pathname === '/producer/weather'}
            />
            <MobileNavItem
              to="/producer/agents"
              icon={<Bot className="w-6 h-6" />}
              iconFilled={<Bot className="w-6 h-6" fill="currentColor" strokeWidth={0} />}
              label="Agentes"
              active={location.pathname === '/producer/agents'}
            />
          </div>
        </nav>
      </div>
    </div>
  )
}

function MobileNavItem({
  to,
  icon,
  iconFilled,
  label,
  active,
}: {
  to: string
  icon: React.ReactNode
  iconFilled: React.ReactNode
  label: string
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1 transition-colors',
        active ? 'text-accent' : 'text-muted-foreground',
      )}
    >
      {active ? iconFilled : icon}
      <span
        className={cn(
          'text-hig-caption2 font-medium',
          active ? 'text-accent' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </Link>
  )
}

function MobileNavItemMain({ to, active }: { to: string; active: boolean }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1">
      <div
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center shadow-hig-3 transition-all active:scale-95',
          active ? 'bg-accent/90' : 'bg-accent',
        )}
      >
        <PlusCircle className="w-7 h-7 text-white" strokeWidth={1.8} />
      </div>
      <span className="text-hig-caption2 font-medium text-muted-foreground">Nova</span>
    </Link>
  )
}
