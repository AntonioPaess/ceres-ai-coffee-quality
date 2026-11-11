import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { deleteSample } from '@/services/samples'
import { toast } from 'sonner'

interface DeleteSampleDialogProps {
  sampleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteSampleDialog({ sampleId, open, onOpenChange }: DeleteSampleDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!sampleId) return
    setDeleting(true)
    try {
      await deleteSample(sampleId)
      toast.success('Análise excluída com sucesso!')
      onOpenChange(false)
    } catch {
      toast.error('Erro ao excluir análise.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl max-w-md p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-hig-headline font-display font-bold text-primary">
            Excluir Análise
          </AlertDialogTitle>
          <AlertDialogDescription className="text-hig-subhead text-muted-foreground">
            Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 pt-2">
          <AlertDialogCancel
            disabled={deleting}
            className="rounded-2xl h-13 px-5 active:scale-[0.98] transition-all"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] rounded-2xl h-13 px-5 transition-all"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
