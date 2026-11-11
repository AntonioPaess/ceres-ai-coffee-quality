import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, MapPin, AlertTriangle, Camera, Trash2, Save, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  getCurrentUserProfile,
  updateUserProfile,
  deleteAccount,
  type UserProfile,
} from '@/services/user'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

interface IBGEState {
  id: number
  sigla: string
  nome: string
}

interface IBGECity {
  id: number
  nome: string
}

export default function Settings() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile Form
  const [name, setName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [savingProfile, setSavingProfile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Security Form
  const [email, setEmail] = useState('')
  const [currentPasswordEmail, setCurrentPasswordEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingSecurityEmail, setSavingSecurityEmail] = useState(false)
  const [savingSecurityPass, setSavingSecurityPass] = useState(false)

  // Location Form
  const [states, setStates] = useState<IBGEState[]>([])
  const [cities, setCities] = useState<IBGECity[]>([])
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)

  // Danger Zone
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    loadProfile()
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then((r) => r.json())
      .then(setStates)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedState) {
      fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`,
      )
        .then((r) => r.json())
        .then(setCities)
        .catch(() => {})
    } else {
      setCities([])
    }
  }, [selectedState])

  const loadProfile = async () => {
    try {
      const p = await getCurrentUserProfile()
      setProfile(p)
      setName(p.name || '')
      setEmail(p.email || '')
      setSelectedState(p.stateName || '')
      setSelectedCity(p.cityName || '')
      if (p.avatar) {
        setAvatarPreview(pb.files.getURL(p, p.avatar))
      }
    } catch {
      toast.error('Erro ao carregar perfil.')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setSavingProfile(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }
      await updateUserProfile(profile.id, formData)
      await pb.collection('users').authRefresh()
      toast.success('Perfil atualizado com sucesso!')
    } catch {
      toast.error('Erro ao atualizar perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveEmail = async () => {
    if (!profile) return
    if (!currentPasswordEmail) {
      toast.error('A senha atual é obrigatória.')
      return
    }
    setSavingSecurityEmail(true)
    try {
      await pb.collection('users').authWithPassword(profile.email, currentPasswordEmail)
      await pb.collection('users').requestEmailChange(email)
      toast.success('Um e-mail de confirmação foi enviado para o novo endereço.')
      setCurrentPasswordEmail('')
    } catch {
      toast.error('Erro ao alterar e-mail. Verifique a senha.')
    } finally {
      setSavingSecurityEmail(false)
    }
  }

  const handleSavePassword = async () => {
    if (!profile) return
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    setSavingSecurityPass(true)
    try {
      await pb.collection('users').update(profile.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })
      toast.success('Senha atualizada com sucesso!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Erro ao alterar senha. Verifique a senha atual.')
    } finally {
      setSavingSecurityPass(false)
    }
  }

  const handleSaveLocation = async () => {
    if (!profile) return
    setSavingLocation(true)
    try {
      const formData = new FormData()
      formData.append('stateName', selectedState)
      formData.append('cityName', selectedCity)
      await updateUserProfile(profile.id, formData)

      let geocodeSuccess = true
      let geocodeMessage = ''
      try {
        const geoResult = await pb.send('/backend/v1/geocode', {
          method: 'POST',
          body: JSON.stringify({ cityName: selectedCity }),
          headers: { 'Content-Type': 'application/json' },
        })
        if (geoResult && !geoResult.geocoded) {
          geocodeSuccess = false
          geocodeMessage =
            geoResult.message || 'Não foi possível encontrar as coordenadas da cidade.'
        }
      } catch (err) {
        geocodeSuccess = false
        geocodeMessage = 'Erro ao geocodificar localização. Tente novamente.'
      }

      await pb.collection('users').authRefresh()

      if (geocodeSuccess) {
        toast.success('Localização salva com sucesso!')
      } else {
        toast.error(geocodeMessage)
      }
    } catch {
      toast.error('Erro ao salvar localização.')
    } finally {
      setSavingLocation(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!profile) return
    setDeletingAccount(true)
    try {
      await deleteAccount(profile.id)
      toast.success('Conta excluída com sucesso.')
      signOut()
    } catch {
      toast.error('Erro ao excluir conta.')
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-6 space-y-8 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Perfil</CardTitle>
            </div>
            <CardDescription>Atualize suas informações pessoais e foto.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border shadow-sm">
                  <AvatarImage src={avatarPreview} className="object-cover" />
                  <AvatarFallback className="text-2xl">
                    {name.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full border shadow-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>Atualize seu e-mail e senha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Alterar E-mail</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Novo E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPasswordEmail">Senha Atual</Label>
                  <Input
                    id="currentPasswordEmail"
                    type="password"
                    value={currentPasswordEmail}
                    onChange={(e) => setCurrentPasswordEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSaveEmail} disabled={savingSecurityEmail} variant="secondary">
                {savingSecurityEmail ? 'Solicitando...' : 'Solicitar Alteração de E-mail'}
              </Button>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="text-sm font-semibold">Alterar Senha</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleSavePassword}
                disabled={savingSecurityPass}
                variant="secondary"
              >
                {savingSecurityPass ? 'Salvando...' : 'Alterar Senha'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Location Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Localização</CardTitle>
            </div>
            <CardDescription>
              Defina a cidade da sua propriedade para dados de mercado e clima.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={selectedState}
                  onValueChange={(val) => {
                    setSelectedState(val)
                    setSelectedCity('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((st) => (
                      <SelectItem key={st.id} value={st.sigla}>
                        {st.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Select
                  value={selectedCity}
                  onValueChange={setSelectedCity}
                  disabled={!selectedState}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.nome}>
                        {city.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveLocation} disabled={savingLocation || !selectedCity}>
              <Save className="mr-2 h-4 w-4" />
              {savingLocation ? 'Salvando...' : 'Salvar Localização'}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone Section */}
        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Zona de Perigo</CardTitle>
            </div>
            <CardDescription>Ações irreversíveis para a sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e
                    removerá seus dados de nossos servidores.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deletingAccount ? 'Excluindo...' : 'Sim, excluir minha conta'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
