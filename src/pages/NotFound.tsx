import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-display font-bold text-primary">404</h1>
        <p className="text-xl text-neutral-600 font-medium">Ops! Página não encontrada</p>
        <Button asChild className="bg-primary hover:bg-primary/90 rounded-xl mt-4">
          <Link to="/">Voltar para o Início</Link>
        </Button>
      </div>
    </div>
  )
}
