import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { DialogDescription } from '@/components/ui/dialog'
import { createCustomAgent } from '@/services/agents'
import { toast } from 'sonner'

interface CreateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const CAPABILITIES = [
  { id: 'market', label: 'Mercado' },
  { id: 'evolution', label: 'Evolução' },
  { id: 'alerts', label: 'Alertas' },
  { id: 'educator', label: 'Educação' },
  { id: 'consultant', label: 'Consultoria' },
]

export function CreateAgentDialog({ open, onOpenChange, onCreated }: CreateAgentDialogProps) {
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [frequency, setFrequency] = useState('daily')
  const [saving, setSaving] = useState(false)

  const toggleCapability = (id: string) => {
    setCapabilities((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Informe um nome para o agente.')
      return
    }
    setSaving(true)
    try {
      await createCustomAgent({
        name,
        description: objective,
        capabilities,
        frequency,
      })
      toast.success('Agente criado com sucesso!')
      setName('')
      setObjective('')
      setCapabilities([])
      setFrequency('daily')
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error('Erro ao criar agente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-hig-headline font-display font-bold text-primary">
            Criar Seu Agente
          </DialogTitle>
          <DialogDescription className="text-hig-caption text-muted-foreground">
            Você descreve o que quer, com suas próprias palavras — e ele nasce sob medida. Você
            escolhe o nome dele.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground">Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Analista de Secagem"
              className="h-12 bg-background rounded-2xl text-hig-body px-4"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground">Objetivo</Label>
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Descreva o que este agente deve fazer..."
              className="bg-background rounded-2xl text-hig-body px-4 min-h-[80px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground">Capacidades</Label>
            <div className="flex flex-wrap gap-3 pt-1">
              {CAPABILITIES.map((cap) => (
                <div key={cap.id} className="flex items-center gap-2">
                  <Checkbox
                    id={cap.id}
                    checked={capabilities.includes(cap.id)}
                    onCheckedChange={() => toggleCapability(cap.id)}
                  />
                  <label
                    htmlFor={cap.id}
                    className="text-hig-caption text-foreground cursor-pointer"
                  >
                    {cap.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground">Periodicidade</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-12 bg-background rounded-2xl text-hig-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="continuous">Contínuo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-2xl h-13 px-5 active:scale-[0.98] transition-all"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="bg-accent hover:bg-accent/90 active:scale-[0.98] text-white rounded-2xl h-13 px-5 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Agente'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
