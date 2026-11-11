import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { updateSample } from '@/services/samples'
import { toast } from 'sonner'

interface EditSampleDialogProps {
  sample: { id: string; name: string; variety: string; price: number; weight?: number } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function normalizeVariety(v: string): string {
  const lower = (v || '').toLowerCase()
  if (lower.includes('robust') || lower.includes('conilon')) return 'robusta'
  if (lower.includes('misto')) return 'misto'
  return 'arabica'
}

export function EditSampleDialog({ sample, open, onOpenChange }: EditSampleDialogProps) {
  const [name, setName] = useState('')
  const [variety, setVariety] = useState('arabica')
  const [price, setPrice] = useState('')
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (sample) {
      setName(sample.name || '')
      setVariety(normalizeVariety(sample.variety || ''))
      setPrice(String(sample.price ?? 0))
      setWeight(sample.weight ? String(sample.weight) : '')
    }
  }, [sample])

  const handleSave = async () => {
    if (!sample) return
    setSaving(true)
    try {
      await updateSample(sample.id, {
        name,
        variety,
        price: parseFloat(price) || 0,
        weight: weight ? parseFloat(weight) : undefined,
      })
      toast.success('Amostra atualizada com sucesso!')
      onOpenChange(false)
    } catch {
      toast.error('Erro ao atualizar amostra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-hig-headline font-display font-bold text-primary">
            Editar Amostra
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground">
              Nome da Amostra
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lote Secador 3"
              className="h-12 bg-background rounded-2xl text-hig-body px-4"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground">Variedade</Label>
            <Select value={variety} onValueChange={setVariety}>
              <SelectTrigger className="h-12 bg-background rounded-2xl text-hig-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arabica">Arábica</SelectItem>
                <SelectItem value="robusta">Robusta (Conilon)</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground">Preço (R$/kg)</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-12 bg-background rounded-2xl text-hig-body px-4"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground">Peso (gramas)</Label>
            <Input
              type="number"
              step="1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 100"
              className="h-12 bg-background rounded-2xl text-hig-body px-4"
            />
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
            onClick={handleSave}
            disabled={saving}
            className="bg-accent hover:bg-accent/90 active:scale-[0.98] text-white rounded-2xl h-13 px-5 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
