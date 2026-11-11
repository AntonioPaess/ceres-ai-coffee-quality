import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import logoImg from '@/assets/chatgpt-image-11-de-jul.de-2026-135832-ab74e.png'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function Index() {
  const { signIn, signUp, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/producer/dashboard')
  }, [isAuthenticated, navigate])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res =
      mode === 'login' ? await signIn(email, password) : await signUp(email, password, name)

    if (res.error) {
      toast({
        title: 'Erro',
        description: res.message || 'Falha na autenticação',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[390px] animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-[2.2rem] bg-gradient-to-br from-accent/30 to-primary/20 blur-xl scale-110" />
            <div className="relative w-28 h-28 rounded-[1.5rem] overflow-hidden shadow-hig-4 border border-black/[0.08]">
              <img src={logoImg} alt="Ceres AI" className="w-full h-full object-cover" />
            </div>
          </div>
          <h1 className="font-display font-bold text-hig-title1 text-primary mb-1 tracking-tight">
            Ceres AI
          </h1>
          <p className="text-hig-subhead text-muted-foreground text-center">
            Café classificado com ciência e justiça
          </p>
        </div>

        {mode === 'register' && (
          <button
            onClick={() => setMode('login')}
            className="flex items-center gap-0.5 text-accent font-semibold text-hig-body mb-4 -ml-1"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            Voltar
          </button>
        )}

        <h2 className="font-display font-bold text-hig-headline text-primary mb-1">
          {mode === 'login' ? 'Entrar' : 'Criar Conta'}
        </h2>
        <p className="text-hig-subhead text-muted-foreground mb-6">
          {mode === 'login' ? 'Acesse sua conta Ceres AI' : 'Cadastro de produtor'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <Label className="text-hig-subhead font-semibold text-foreground pl-1">
                Nome completo
              </Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Silva"
                className="h-13 bg-white rounded-2xl border-transparent shadow-hig-1 text-hig-body px-4"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground pl-1">E-mail</Label>
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-13 bg-white rounded-2xl border-transparent shadow-hig-1 text-hig-body px-4"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground pl-1">Senha</Label>
            <Input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-13 bg-white rounded-2xl border-transparent shadow-hig-1 text-hig-body px-4"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-13 bg-accent hover:bg-accent/90 active:scale-[0.98] text-white rounded-2xl text-hig-headline font-semibold shadow-hig-2 transition-all"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === 'login' ? (
              'Entrar'
            ) : (
              'Criar conta'
            )}
          </Button>
        </form>

        {mode === 'login' ? (
          <>
            <p className="text-center mt-6 text-hig-subhead text-muted-foreground">
              Ainda não tem conta?{' '}
              <button onClick={() => setMode('register')} className="text-accent font-semibold">
                Cadastre-se
              </button>
            </p>
          </>
        ) : (
          <p className="text-center mt-6 text-hig-subhead text-muted-foreground">
            Já tem conta?{' '}
            <button onClick={() => setMode('login')} className="text-accent font-semibold">
              Entrar
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
