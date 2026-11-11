import { useAppStore } from '@/stores/app'
import { Search, Pencil, Trash2, ClipboardList } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { EditSampleDialog } from '@/components/EditSampleDialog'
import { DeleteSampleDialog } from '@/components/DeleteSampleDialog'

const GRADE_BADGE: Record<string, string> = {
  A: 'text-accent bg-accent/10',
  B: 'text-amber-700 bg-amber-100',
  C: 'text-orange-600 bg-orange-50',
  D: 'text-destructive bg-destructive/10',
}

const GRADE_LABEL: Record<string, string> = {
  A: 'Premium',
  B: 'Bom',
  C: 'Padrão',
  D: 'Defeituoso',
}

export default function History() {
  const { samples } = useAppStore()
  const [query, setQuery] = useState('')
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const filtered = samples.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="px-4 pt-6 pb-4 md:px-0 md:pt-0 flex flex-col animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-hig-title1 md:text-hig-largetitle text-primary tracking-tight mb-4">
          Histórico
        </h2>
        <div className="relative">
          <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar lote..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11 h-11 bg-white rounded-2xl border-transparent shadow-hig-1 text-hig-body"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
            <ClipboardList className="w-7 h-7" />
          </div>
          <p className="text-hig-subhead text-muted-foreground font-medium">
            {query ? 'Nenhum resultado encontrado.' : 'Nenhuma amostra ainda.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile list */}
          <div className="md:hidden bg-white rounded-3xl shadow-hig-2 overflow-hidden divide-y divide-border">
            {filtered.map((sample) => (
              <Link
                key={sample.id}
                to={`/producer/result/${sample.id}`}
                className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors"
              >
                <img
                  src={sample.image}
                  alt={sample.name}
                  className="w-14 h-14 rounded-2xl object-cover bg-muted flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-hig-subhead font-semibold text-foreground truncate">
                    {sample.name}
                  </p>
                  <p className="text-hig-caption text-muted-foreground mt-0.5">{sample.created}</p>
                  <span
                    className={cn(
                      'inline-block mt-1.5 text-hig-caption2 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                      GRADE_BADGE[sample.grade],
                    )}
                  >
                    {sample.grade} · {GRADE_LABEL[sample.grade]}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                  <span className="font-display font-bold text-hig-title3 text-foreground">
                    {sample.score}
                  </span>
                  <span className="text-hig-caption text-accent font-semibold">
                    R$ {sample.price.toFixed(2)}/kg
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setEditTarget(sample)
                    }}
                    className="p-2 rounded-xl hover:bg-muted active:scale-[0.98] transition-all text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDeleteTargetId(sample.id)
                    }}
                    className="p-2 rounded-xl hover:bg-destructive/10 active:scale-[0.98] transition-all text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-3xl shadow-hig-2 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-hig-caption text-muted-foreground font-semibold uppercase tracking-widest px-6 py-4">
                    Lote
                  </th>
                  <th className="text-left text-hig-caption text-muted-foreground font-semibold uppercase tracking-widest px-6 py-4">
                    Variedade
                  </th>
                  <th className="text-left text-hig-caption text-muted-foreground font-semibold uppercase tracking-widest px-6 py-4">
                    Data
                  </th>
                  <th className="text-center text-hig-caption text-muted-foreground font-semibold uppercase tracking-widest px-6 py-4">
                    Nota
                  </th>
                  <th className="text-center text-hig-caption text-muted-foreground font-semibold uppercase tracking-widest px-6 py-4">
                    Grade
                  </th>
                  <th className="text-right text-hig-caption text-muted-foreground font-semibold uppercase tracking-widest px-6 py-4">
                    Preço/kg
                  </th>
                  <th className="text-center text-hig-caption text-muted-foreground font-semibold uppercase tracking-widest px-6 py-4">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((sample) => (
                  <tr
                    key={sample.id}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => {
                      window.location.href = `/producer/result/${sample.id}`
                    }}
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/producer/result/${sample.id}`}
                        className="flex items-center gap-3"
                      >
                        <img
                          src={sample.image}
                          alt={sample.name}
                          className="w-10 h-10 rounded-xl object-cover bg-muted flex-shrink-0"
                        />
                        <span className="text-hig-subhead font-semibold text-foreground">
                          {sample.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-hig-subhead text-muted-foreground capitalize">
                      {sample.variety}
                    </td>
                    <td className="px-6 py-4 text-hig-subhead text-muted-foreground">
                      {sample.created}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-display font-bold text-hig-headline text-foreground">
                        {sample.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={cn(
                          'inline-block text-hig-caption2 font-bold px-2.5 py-1 rounded-full uppercase tracking-wide',
                          GRADE_BADGE[sample.grade],
                        )}
                      >
                        {sample.grade} · {GRADE_LABEL[sample.grade]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-hig-subhead font-semibold text-accent">
                        R$ {sample.price.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditTarget(sample)
                          }}
                          className="p-2 rounded-xl hover:bg-muted active:scale-[0.98] transition-all text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTargetId(sample.id)
                          }}
                          className="p-2 rounded-xl hover:bg-destructive/10 active:scale-[0.98] transition-all text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <EditSampleDialog
        sample={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <DeleteSampleDialog
        sampleId={deleteTargetId}
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      />
    </div>
  )
}
