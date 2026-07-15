"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import { useThemeTransition } from "@/lib/useThemeTransition"
import { Plus, Pencil, Trash2, Upload, TriangleAlert, Check } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useUserStore } from "@/store/userStore"
import { useFontSizeStore, FONT_SIZE_SCALE, type FontSize } from "@/store/fontSizeStore"
import { useCategoriesStore } from "@/store/categoriesStore"
import { useUnitsStore } from "@/store/unitsStore"
import type { Unit, Category } from "@/types/settings"

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState("unidades")

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Unidades, categorias, atributos do sistema"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-(--color-surface) mb-6">
          <TabsTrigger value="unidades">Unidades de Medida</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="unidades">
          <UnitsPanel />
        </TabsContent>
        <TabsContent value="categorias">
          <CategoriesPanel />
        </TabsContent>
        <TabsContent value="preferencias">
          <PreferencesPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SettingsListCard({
  title,
  emptyMessage,
  onAdd,
  children,
}: {
  title: string
  emptyMessage: string
  onAdd: () => void
  children: React.ReactNode
}) {
  const isEmpty = !Array.isArray(children) || children.length === 0

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-(--color-surface-raised) border-b border-(--color-border)">
        <h2 className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
          {title}
        </h2>
        <Button size="icon" className="bg-(--color-accent) text-white" onClick={onAdd}>
          <Plus size={16} />
        </Button>
      </div>
      {isEmpty ? (
        <div className="text-center py-12 text-[14px] text-(--color-text-secondary) font-(family-name:--font-data)">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

function SettingsListRow({
  primary,
  secondary,
  onEdit,
  onDelete,
}: {
  primary: string
  secondary?: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-(--color-border) last:border-b-0 hover:bg-(--color-surface-raised)/50 transition-colors">
      <div className="flex flex-col font-(family-name:--font-data)">
        <span className="text-[13px] font-medium text-(--color-text-primary) tracking-[-0.143px]">
          {primary}
        </span>
        {secondary && (
          <span className="text-[13px] text-(--color-text-secondary)">{secondary}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded hover:bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          title="Editar"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-(--color-danger)/90 hover:bg-(--color-danger) text-white text-[13px] font-medium transition-colors"
        >
          <Trash2 size={13} />
          Excluir
        </button>
      </div>
    </div>
  )
}

// As unidades vivem num store compartilhado (persistido) — o Inventário
// consome a mesma lista, então cadastrar aqui reflete lá.
function UnitsPanel() {
  const units = useUnitsStore((s) => s.units)
  const addUnit = useUnitsStore((s) => s.addUnit)
  const updateUnit = useUnitsStore((s) => s.updateUnit)
  const removeUnit = useUnitsStore((s) => s.removeUnit)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Unit | null>(null)
  const [form, setForm] = useState({ name: "", abbreviation: "" })

  function openAdd() {
    setForm({ name: "", abbreviation: "" })
    setAddOpen(true)
  }

  function openEdit(unit: Unit) {
    setSelected(unit)
    setForm({ name: unit.name, abbreviation: unit.abbreviation })
    setEditOpen(true)
  }

  function openDelete(unit: Unit) {
    setSelected(unit)
    setDeleteOpen(true)
  }

  function handleAdd() {
    addUnit(form)
    setAddOpen(false)
    toast.success("Unidade adicionada com sucesso.")
  }

  function handleEdit() {
    if (!selected) return
    updateUnit(selected.id, form)
    setEditOpen(false)
    toast.success("Unidade atualizada.")
  }

  function handleDelete() {
    if (!selected) return
    removeUnit(selected.id)
    setDeleteOpen(false)
    toast.success(`${selected.name} foi removida.`)
    setSelected(null)
  }

  return (
    <>
      <SettingsListCard title="Unidades" emptyMessage="Nenhuma unidade cadastrada." onAdd={openAdd}>
        {units.map((unit) => (
          <SettingsListRow
            key={unit.id}
            primary={unit.name}
            secondary={unit.abbreviation}
            onEdit={() => openEdit(unit)}
            onDelete={() => openDelete(unit)}
          />
        ))}
      </SettingsListCard>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Unidade</DialogTitle>
          </DialogHeader>
          <UnitFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!form.name || !form.abbreviation}
              className="bg-(--color-accent) text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
          </DialogHeader>
          <UnitFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!form.name || !form.abbreviation}
              className="bg-(--color-accent) text-white"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)">
              <TriangleAlert size={20} />
            </AlertDialogMedia>
            <AlertDialogTitle>Remover unidade?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected?.name} será removida permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function UnitFormFields({
  form,
  onChange,
}: {
  form: { name: string; abbreviation: string }
  onChange: (f: { name: string; abbreviation: string }) => void
}) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit-name">Nome</Label>
        <Input
          id="unit-name"
          placeholder="Ex: Quilograma"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit-abbreviation">Abreviação</Label>
        <Input
          id="unit-abbreviation"
          placeholder="Ex: kg"
          value={form.abbreviation}
          onChange={(e) => onChange({ ...form, abbreviation: e.target.value })}
        />
      </div>
    </div>
  )
}

// As categorias vivem num store compartilhado (persistido) — o Inventário
// consome a mesma lista, então cadastrar aqui reflete lá.
function CategoriesPanel() {
  const categories = useCategoriesStore((s) => s.categories)
  const addCategory = useCategoriesStore((s) => s.addCategory)
  const updateCategory = useCategoriesStore((s) => s.updateCategory)
  const removeCategory = useCategoriesStore((s) => s.removeCategory)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Category | null>(null)
  const [name, setName] = useState("")

  function openAdd() {
    setName("")
    setAddOpen(true)
  }

  function openEdit(category: Category) {
    setSelected(category)
    setName(category.name)
    setEditOpen(true)
  }

  function openDelete(category: Category) {
    setSelected(category)
    setDeleteOpen(true)
  }

  function handleAdd() {
    addCategory(name)
    setAddOpen(false)
    toast.success("Categoria adicionada com sucesso.")
  }

  function handleEdit() {
    if (!selected) return
    updateCategory(selected.id, name)
    setEditOpen(false)
    toast.success("Categoria atualizada.")
  }

  function handleDelete() {
    if (!selected) return
    removeCategory(selected.id)
    setDeleteOpen(false)
    toast.success(`${selected.name} foi removida.`)
    setSelected(null)
  }

  return (
    <>
      <SettingsListCard title="Categorias" emptyMessage="Nenhuma categoria cadastrada." onAdd={openAdd}>
        {categories.map((category) => (
          <SettingsListRow
            key={category.id}
            primary={category.name}
            onEdit={() => openEdit(category)}
            onDelete={() => openDelete(category)}
          />
        ))}
      </SettingsListCard>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              placeholder="Ex: Embalagem"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={!name} className="bg-(--color-accent) text-white">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="category-edit-name">Nome</Label>
            <Input
              id="category-edit-name"
              placeholder="Ex: Embalagem"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={!name} className="bg-(--color-accent) text-white">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)">
              <TriangleAlert size={20} />
            </AlertDialogMedia>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected?.name} será removida permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function PreferencesPanel() {
  const user = useUserStore((s) => s.user)
  const setUser = useUserStore((s) => s.setUser)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar)
  const [firstName, setFirstName] = useState(user?.name?.split(" ")[0] ?? "")
  const [lastName, setLastName] = useState(user?.name?.split(" ").slice(1).join(" ") ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleSaveProfile() {
    if (!user) return
    // Persiste no userStore — o header (menu do usuário) reflete na hora.
    setUser({
      ...user,
      name: `${firstName} ${lastName}`.trim(),
      email,
      avatar: avatarPreview,
    })
    toast.success("Perfil atualizado com sucesso.")
  }

  function handleCancelPassword() {
    setNewPassword("")
    setConfirmPassword("")
  }

  function handleSavePassword() {
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha os dois campos de senha.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.")
      return
    }
    toast.success("Senha atualizada com sucesso.")
    handleCancelPassword()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
        <div className="px-5 py-4 bg-(--color-surface-raised) border-b border-(--color-border)">
          <h2 className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
            Meu Perfil
          </h2>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <div className="flex flex-col gap-2">
            <Label>Foto de perfil</Label>
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarImage src={avatarPreview} alt={user?.name} />
                <AvatarFallback className="bg-(--color-surface-raised) text-(--color-text-primary)">
                  {user?.name?.slice(0, 2).toUpperCase() ?? "US"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 justify-between"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  Atualizar Imagem
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-(--color-danger)/90 hover:bg-(--color-danger) text-white"
                  onClick={() => setAvatarPreview(undefined)}
                >
                  <Trash2 size={14} />
                  Deletar Imagem
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2 border-t border-(--color-border)">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label>Nome Completo</Label>
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
                      Nome
                    </span>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
                      Sobrenome
                    </span>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <Label>Email de contato</Label>
                  <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
                    Gerencie sua conta de acesso &amp; notificações
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
                    Email
                  </span>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <Button onClick={handleSaveProfile} className="bg-(--color-accent) text-white self-start">
                Salvar Perfil
              </Button>
            </div>

            <div className="flex flex-col gap-3 lg:pl-8 lg:border-l border-(--color-border)">
              <div className="flex flex-col">
                <Label>Alterar Senha</Label>
                <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
                  Altere sua senha de acesso
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
                  Nova senha
                </span>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
                  Repita sua nova senha
                </span>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2 mt-10">
                <Button onClick={handleSavePassword} className="bg-(--color-accent) text-white flex-1">
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleCancelPassword} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GeneralPreferencesCard />
    </div>
  )
}

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "pequena", label: "Pequena" },
  { value: "padrao", label: "Padrão" },
  { value: "grande", label: "Grande" },
]

function GeneralPreferencesCard() {
  const { resolvedTheme, setThemeWithTransition } = useThemeTransition()
  const fontSize = useFontSizeStore((s) => s.fontSize)
  const setFontSize = useFontSizeStore((s) => s.setFontSize)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
      <div className="px-5 py-4 bg-(--color-surface-raised) border-b border-(--color-border)">
        <h2 className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
          Preferências Gerais
        </h2>
      </div>

      <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border)">
        <div className="flex flex-col">
          <span className="text-[14px] text-(--color-text-primary) font-(family-name:--font-data)">
            Aparência
          </span>
          <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
            Escolha entre o tema claro ou escuro da interface
          </span>
        </div>
        {mounted && (
          <div className="flex gap-3">
            <ThemeOptionCard
              label="Claro"
              theme="light"
              active={resolvedTheme === "light"}
              onSelect={() => setThemeWithTransition("light")}
            />
            <ThemeOptionCard
              label="Escuro"
              theme="dark"
              active={resolvedTheme === "dark"}
              onSelect={() => setThemeWithTransition("dark")}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border)">
        <div className="flex flex-col">
          <span className="text-[14px] text-(--color-text-primary) font-(family-name:--font-data)">
            Tamanho da Fonte
          </span>
          <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
            Ajuste o tamanho do texto em toda a interface
          </span>
        </div>
        {mounted && (
          <div className="flex gap-4">
            {FONT_SIZE_OPTIONS.map((option) => (
              <FontSizeOption
                key={option.value}
                label={option.label}
                scale={FONT_SIZE_SCALE[option.value]}
                active={fontSize === option.value}
                onSelect={() => setFontSize(option.value)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex flex-col">
          <span className="text-[14px] text-(--color-text-primary) font-(family-name:--font-data)">
            Idioma
          </span>
          <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
            Idioma da interface do sistema
          </span>
        </div>
        <Select defaultValue="pt-BR">
          <SelectTrigger className="w-45">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
            <SelectItem value="en-US" disabled>
              English (em breve)
            </SelectItem>
            <SelectItem value="es" disabled>
              Español (em breve)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ThemeOptionCard({
  theme,
  label,
  active,
  onSelect,
}: {
  theme: "light" | "dark"
  label: string
  active: boolean
  onSelect: () => void
}) {
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-28 flex-col gap-2 rounded-xl border-2 p-2 transition-colors",
        active
          ? "border-(--color-accent)"
          : "border-(--color-border) hover:border-(--color-text-secondary)/40"
      )}
    >
      <div
        className={cn(
          "relative flex h-16 w-full overflow-hidden rounded-lg border",
          isDark ? "bg-[#1E1E24] border-[#343536]" : "bg-[#F4F5F7] border-[#E2E8F0]"
        )}
      >
        <div className={cn("h-full w-5", isDark ? "bg-[#17181A]" : "bg-white")} />
        <div className="flex flex-1 flex-col justify-center gap-1.5 px-2">
          <div className={cn("h-1.5 w-full rounded-full", isDark ? "bg-[#343536]" : "bg-[#E2E8F0]")} />
          <div className={cn("h-1.5 w-2/3 rounded-full", isDark ? "bg-[#343536]" : "bg-[#E2E8F0]")} />
        </div>
        {active && (
          <span className="absolute bottom-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-(--color-accent) text-white">
            <Check size={10} strokeWidth={3} />
          </span>
        )}
      </div>
      <span className="text-center text-[13px] font-medium text-(--color-text-primary) font-(family-name:--font-data)">
        {label}
      </span>
    </button>
  )
}

function FontSizeOption({
  label,
  scale,
  active,
  onSelect,
}: {
  label: string
  scale: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect} className="flex flex-col items-center gap-2">
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full font-semibold transition-colors font-(family-name:--font-data)",
          active
            ? "bg-(--color-accent) text-white"
            : "bg-(--color-surface-raised) text-(--color-text-secondary)"
        )}
        style={{ fontSize: `${14 * scale}px` }}
      >
        Aa
      </span>
      <span
        className={cn(
          "text-[12px] font-(family-name:--font-data)",
          active ? "font-semibold text-(--color-text-primary)" : "text-(--color-text-secondary)"
        )}
      >
        {label}
      </span>
    </button>
  )
}
