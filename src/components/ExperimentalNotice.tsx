import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const WARNING_TEXT: Record<string, string> = {
  no_detections:
    'Nenhum defeito foi detectado. Isso não comprova qualidade: a foto pode estar inadequada ou fora do domínio do modelo.',
  missing_image_dimensions:
    'O serviço de visão não informou as dimensões da imagem; as marcações podem ficar desalinhadas.',
  unknown_classes: 'Algumas detecções têm classes não reconhecidas e não entraram na pontuação.',
  low_confidence_detections: 'Há detecções com baixa confiança; confira visualmente as marcações.',
}

/** Experimental-result disclaimer plus analysis warnings produced by the backend. */
export function ExperimentalNotice({
  warnings = [],
  className,
}: {
  warnings?: string[]
  className?: string
}) {
  const known = warnings.filter((w) => WARNING_TEXT[w])
  return (
    <aside
      role="note"
      aria-label="Aviso sobre o resultado"
      className={cn('rounded-2xl bg-muted/60 p-4 text-hig-footnote text-muted-foreground', className)}
    >
      <div className="flex gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p>
            Resultado <strong>experimental</strong> gerado por visão computacional e regras
            heurísticas inspiradas na tabela de defeitos equivalentes (COB). Não é laudo oficial,
            certificação nem cotação de mercado.
          </p>
          {known.length > 0 && (
            <ul className="list-disc pl-4 space-y-0.5">
              {known.map((w) => (
                <li key={w}>{WARNING_TEXT[w]}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  )
}
