import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { UploadCloud, ScanLine, Loader2, Info } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'

export default function NewAnalysis() {
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [sampleName, setSampleName] = useState('')
  const [variety, setVariety] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const navigate = useNavigate()
  const { user } = useAuth()

  const isFormValid = file !== null && sampleName.trim() !== '' && variety !== ''

  const handleAnalyze = async () => {
    if (!user) {
      toast.error('Sessão expirada. Faça login novamente.')
      navigate('/')
      return
    }

    setFieldErrors({})
    setIsAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('user_id', user.id)
      formData.append('name', sampleName.trim())
      formData.append('variety', variety)
      if (file) formData.append('image', file)

      const record = await pb.collection('samples').create(formData)
      toast.success('Amostra criada! Iniciando análise com IA...')
      navigate(`/producer/result/${record.id}`)
    } catch (err) {
      const errors = extractFieldErrors(err)
      setFieldErrors(errors)
      const message = getErrorMessage(err)
      toast.error(message || 'Erro ao criar análise. Verifique os campos e tente novamente.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 md:px-0 md:pt-0 flex flex-col min-h-full animate-fade-in">
      <div className="flex-1 flex flex-col gap-5 md:max-w-2xl md:mx-auto md:w-full">
        <div className="bg-accent/5 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent flex-shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <p className="text-hig-subhead font-semibold text-foreground">
              Como preparar sua amostra
            </p>
            <ul className="text-hig-caption text-muted-foreground mt-1 space-y-1">
              <li>• Separe exatamente 300g de café verde</li>
              <li>• Espalhe os grãos em fundo branco sem sobreposição</li>
              <li>• Fotografe com boa iluminação, sem sombras</li>
              <li>• Evite grãos empilhados — cada grão deve ser visível</li>
            </ul>
          </div>
        </div>
        {!file ? (
          <label className="border-2 border-dashed border-accent/30 rounded-3xl flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-accent/5 transition-colors group bg-white shadow-hig-1 h-52">
            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-4 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>
            <span className="text-hig-subhead font-semibold text-primary">
              Toque para escolher foto
            </span>
            <span className="text-hig-footnote text-muted-foreground mt-1.5 text-center">
              Foto bem iluminada de 300g de café
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        ) : (
          <div className="relative rounded-3xl overflow-hidden h-52 shadow-hig-2">
            <img
              src={URL.createObjectURL(file)}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setFile(null)}
              className="absolute top-3 right-3 bg-black/60 text-white text-hig-footnote px-3 py-1.5 rounded-full backdrop-blur-sm font-semibold hover:bg-black/80 transition-colors"
            >
              Trocar foto
            </button>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-hig-1 p-4 md:p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground pl-1">
              Nome da Amostra
            </Label>
            <Input
              value={sampleName}
              onChange={(e) => setSampleName(e.target.value)}
              placeholder="Ex: Lote Secador 3"
              className="h-13 bg-background rounded-2xl border-transparent shadow-none text-hig-body px-4"
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive pl-1">{fieldErrors.name}</p>
            )}
          </div>
          <div className="w-full h-px bg-border" />
          <div className="space-y-1.5">
            <Label className="text-hig-subhead font-semibold text-foreground pl-1">Variedade</Label>
            <Select value={variety} onValueChange={setVariety}>
              <SelectTrigger className="h-13 bg-background rounded-2xl border-transparent shadow-none text-hig-body">
                <SelectValue placeholder="Selecione a variedade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arabica">Arábica</SelectItem>
                <SelectItem value="robusta">Robusta (Conilon)</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.variety && (
              <p className="text-sm text-destructive pl-1">{fieldErrors.variety}</p>
            )}
          </div>
        </div>
        <div className="bg-accent/5 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent flex-shrink-0">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <p className="text-hig-subhead font-semibold text-foreground">Análise com IA</p>
            <p className="text-hig-caption text-muted-foreground mt-0.5 leading-relaxed">
              A IA detecta defeitos e o sistema calcula nota, classificação e preço estimado (resultado experimental).
              O processo pode levar alguns segundos.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-2 pb-2">
          <Button
            className="w-full h-13 rounded-2xl text-hig-headline font-semibold bg-accent hover:bg-accent/90 active:scale-[0.98] shadow-hig-2 transition-all"
            disabled={!isFormValid || isAnalyzing}
            onClick={handleAnalyze}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Criando análise...
              </>
            ) : (
              <>
                <ScanLine className="w-5 h-5 mr-2" />
                Analisar Amostra
              </>
            )}
          </Button>
          {!isFormValid && !isAnalyzing && (
            <p className="text-hig-caption text-muted-foreground text-center mt-2">
              Preencha todos os campos e adicione uma foto para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
