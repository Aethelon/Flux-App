"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { useThemeTransition } from "@/lib/useThemeTransition"
import { Plus, Pencil, Trash2, TriangleAlert, Check, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { api, idempotencyHeaders } from "@/lib/api"
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
import { useJobRolesStore } from "@/store/jobRolesStore"
import type { Unit, Category } from "@/types/settings"
import type { JobRole } from "@/types/job-role"

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState("unidades")
  const loadCategories = useCategoriesStore((state) => state.loadCategories)
  const loadUnits = useUnitsStore((state) => state.loadUnits)
  const isAdmin = useUserStore((state) => state.user?.role === "admin")
  const loadJobRoles = useJobRolesStore((state) => state.load)

  useEffect(() => {
    void Promise.all([loadCategories(), loadUnits(), ...(isAdmin ? [loadJobRoles()] : [])])
      .catch(() => toast.error("Não foi possível carregar as configurações."))
  }, [isAdmin, loadCategories, loadJobRoles, loadUnits])

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
          {isAdmin && <TabsTrigger value="cargos">Cargos</TabsTrigger>}
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="unidades">
          <UnitsPanel />
        </TabsContent>
        <TabsContent value="categorias">
          <CategoriesPanel />
        </TabsContent>
        {isAdmin && <TabsContent value="cargos"><JobRolesPanel /></TabsContent>}
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

// As unidades vêm da API por um store compartilhado — o Inventário
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
  const [form, setForm] = useState({
    name: "",
    abbreviation: "",
    allowsFractional: false,
    quantityScale: 0,
  })
  const [submitting, setSubmitting] = useState(false)

  function openAdd() {
    setForm({
      name: "",
      abbreviation: "",
      allowsFractional: false,
      quantityScale: 0,
    })
    setAddOpen(true)
  }

  function openEdit(unit: Unit) {
    setSelected(unit)
    setForm({
      name: unit.name,
      abbreviation: unit.abbreviation,
      allowsFractional: unit.allowsFractional,
      quantityScale: unit.quantityScale,
    })
    setEditOpen(true)
  }

  function openDelete(unit: Unit) {
    setSelected(unit)
    setDeleteOpen(true)
  }

  async function handleAdd() {
    if (submitting) return
    setSubmitting(true)
    try {
      await addUnit(form)
      setAddOpen(false)
      toast.success("Unidade adicionada com sucesso.")
    } catch {
      toast.error("Não foi possível adicionar a unidade.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!selected || submitting) return
    setSubmitting(true)
    try {
      await updateUnit(selected.id, form)
      setEditOpen(false)
      toast.success("Unidade atualizada.")
    } catch {
      toast.error("Não foi possível atualizar a unidade.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selected || submitting) return
    setSubmitting(true)
    try {
      await removeUnit(selected.id)
      setDeleteOpen(false)
      toast.success(`${selected.name} foi removida.`)
      setSelected(null)
    } catch {
      toast.error("Não foi possível remover a unidade.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SettingsListCard title="Unidades" emptyMessage="Nenhuma unidade cadastrada." onAdd={openAdd}>
        {units.map((unit) => (
          <SettingsListRow
            key={unit.id}
            primary={unit.name}
            secondary={`${unit.abbreviation} · ${
              unit.allowsFractional
                ? `até ${unit.quantityScale} ${unit.quantityScale === 1 ? "casa decimal" : "casas decimais"}`
                : "quantidades inteiras"
            }`}
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
              disabled={!form.name || !form.abbreviation || submitting}
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
              disabled={!form.name || !form.abbreviation || submitting}
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
              {selected?.name} será arquivada e deixará de aparecer nas operações ativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              Arquivar
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
  form: {
    name: string
    abbreviation: string
    allowsFractional: boolean
    quantityScale: number
  }
  onChange: (f: {
    name: string
    abbreviation: string
    allowsFractional: boolean
    quantityScale: number
  }) => void
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="unit-fractional">Aceita quantidades fracionárias</Label>
          <span className="text-[12px] text-(--color-text-secondary)">
            Use para unidades como kg, m ou L.
          </span>
        </div>
        <Switch
          id="unit-fractional"
          checked={form.allowsFractional}
          onCheckedChange={(checked) => onChange({
            ...form,
            allowsFractional: checked,
            quantityScale: checked ? Math.max(form.quantityScale, 3) : 0,
          })}
        />
      </div>
      {form.allowsFractional && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-scale">Casas decimais</Label>
          <Select
            value={String(form.quantityScale)}
            onValueChange={(value) => onChange({ ...form, quantityScale: Number(value) })}
          >
            <SelectTrigger id="unit-scale" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 casa decimal</SelectItem>
              <SelectItem value="2">2 casas decimais</SelectItem>
              <SelectItem value="3">3 casas decimais</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

// As categorias vêm da API por um store compartilhado — o Inventário
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
  const [submitting, setSubmitting] = useState(false)

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

  async function handleAdd() {
    if (submitting) return
    setSubmitting(true)
    try {
      await addCategory(name)
      setAddOpen(false)
      toast.success("Categoria adicionada com sucesso.")
    } catch {
      toast.error("Não foi possível adicionar a categoria.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!selected || submitting) return
    setSubmitting(true)
    try {
      await updateCategory(selected.id, name)
      setEditOpen(false)
      toast.success("Categoria atualizada.")
    } catch {
      toast.error("Não foi possível atualizar a categoria.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selected || submitting) return
    setSubmitting(true)
    try {
      await removeCategory(selected.id)
      setDeleteOpen(false)
      toast.success(`${selected.name} foi removida.`)
      setSelected(null)
    } catch {
      toast.error("Não foi possível remover a categoria.")
    } finally {
      setSubmitting(false)
    }
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
            <Button onClick={handleAdd} disabled={!name || submitting} className="bg-(--color-accent) text-white">
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
            <Button onClick={handleEdit} disabled={!name || submitting} className="bg-(--color-accent) text-white">
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
              {selected?.name} será arquivada e deixará de aparecer nas operações ativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function JobRolesPanel() {
  const roles = useJobRolesStore((state) => state.roles)
  const permissions = useJobRolesStore((state) => state.permissions)
  const createRole = useJobRolesStore((state) => state.createRole)
  const updateRole = useJobRolesStore((state) => state.updateRole)
  const removeRole = useJobRolesStore((state) => state.removeRole)
  const [selected, setSelected] = useState<JobRole | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", status: "active" as "active" | "inactive", permissions: [] as string[] })

  function openAdd() {
    setSelected(null)
    setForm({ name: "", description: "", status: "active", permissions: [] })
    setDialogOpen(true)
  }
  function openEdit(role: JobRole) {
    setSelected(role)
    setForm({ name: role.name, description: role.description, status: role.status, permissions: role.permissions })
    setDialogOpen(true)
  }
  async function save() {
    if (submitting || !form.name.trim()) return
    setSubmitting(true)
    try {
      if (selected) await updateRole(selected, form)
      else await createRole({ name: form.name, description: form.description, permissions: form.permissions })
      setDialogOpen(false)
      toast.success(selected ? "Cargo atualizado." : "Cargo criado.")
    } catch { toast.error("Não foi possível salvar o cargo.") } finally { setSubmitting(false) }
  }
  async function remove() {
    if (!selected || submitting) return
    setSubmitting(true)
    try { await removeRole(selected); setDeleteOpen(false); toast.success("Cargo removido.") }
    catch { toast.error("Não foi possível remover o cargo. Verifique se ele está em uso.") }
    finally { setSubmitting(false) }
  }
  const groups = [...new Set(permissions.map((permission) => permission.group))]
  const protectedAdministrator = selected?.systemKey === "administrator"

  return <>
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-(--color-surface-raised) border-b border-(--color-border)">
        <div><h2 className="text-[18px] font-medium text-(--color-text-primary)">Cargos e telas disponíveis</h2><p className="text-[12px] text-(--color-text-secondary)">Escolha quais telas os funcionários deste cargo podem acessar.</p></div>
        <Button size="sm" className="gap-2 bg-(--color-accent) text-white" onClick={openAdd}><Plus size={14} />Novo Cargo</Button>
      </div>
      {roles.map((role) => <div key={role.id} className="flex items-center justify-between gap-4 px-5 py-4 border-b border-(--color-border) last:border-0">
        <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[14px] font-medium">{role.name}</span>{role.systemKey && <span className="rounded-full bg-(--color-accent)/10 px-2 py-0.5 text-[10px] text-(--color-accent)">Sistema</span>}{role.status === "inactive" && <span className="text-[11px] text-(--color-danger)">Inativo</span>}</div><p className="text-[12px] text-(--color-text-secondary)">{role.employeeCount} funcionário(s) · {role.permissions.length} tela(s)</p></div>
        <div className="flex gap-1">{role.systemKey !== "administrator" && <button onClick={() => openEdit(role)} className="p-2 text-(--color-text-secondary) hover:text-(--color-text-primary)" title="Editar"><Pencil size={15} /></button>}{!role.systemKey && <button onClick={() => { setSelected(role); setDeleteOpen(true) }} className="p-2 text-(--color-danger)" title="Remover"><Trash2 size={15} /></button>}</div>
      </div>)}
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{selected ? "Editar Cargo" : "Novo Cargo"}</DialogTitle></DialogHeader>
      <div className="flex flex-col gap-4 py-2"><div className="flex flex-col gap-1.5"><Label htmlFor="job-role-name">Nome</Label><Input id="job-role-name" value={form.name} disabled={Boolean(selected?.systemKey)} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex: Gerente" /></div><div className="flex flex-col gap-1.5"><Label htmlFor="job-role-description">Descrição</Label><Input id="job-role-description" value={form.description} disabled={protectedAdministrator} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
        {selected && !selected.systemKey && <div className="flex items-center justify-between"><div><Label>Status</Label><p className="text-[12px] text-(--color-text-secondary)">Cargos inativos não podem ser atribuídos.</p></div><Switch checked={form.status === "active"} onCheckedChange={(checked) => setForm({ ...form, status: checked ? "active" : "inactive" })} /></div>}
        <div className="border-t border-(--color-border) pt-4"><h3 className="text-[14px] font-medium">Telas disponíveis</h3>{groups.map((group) => <div key={group} className="mt-4"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-(--color-text-secondary)">{group}</p><div className="flex flex-col gap-3">{permissions.filter((permission) => permission.group === group).map((permission) => <label key={permission.key} className="flex items-center justify-between gap-4"><span className="text-[13px]">{permission.label}</span><Switch disabled={protectedAdministrator} checked={protectedAdministrator || form.permissions.includes(permission.key)} onCheckedChange={(checked) => setForm({ ...form, permissions: checked ? [...form.permissions, permission.key] : form.permissions.filter((key) => key !== permission.key) })} /></label>)}</div></div>)}</div>
      </div><DialogFooter showCloseButton={false}><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>{!protectedAdministrator && <Button disabled={submitting || !form.name.trim()} onClick={save} className="bg-(--color-accent) text-white">Salvar</Button>}</DialogFooter></DialogContent></Dialog>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)"><TriangleAlert size={20} /></AlertDialogMedia><AlertDialogTitle>Remover cargo?</AlertDialogTitle><AlertDialogDescription>O cargo {selected?.name} será removido. Isso só é permitido se nenhum funcionário estiver associado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} disabled={submitting} className="bg-(--color-danger) text-white">Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>
}

function PreferencesPanel() {
  const user = useUserStore((s) => s.user)
  const isAdmin = user?.role === "admin"

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
        <div className="px-5 py-4 bg-(--color-surface-raised) border-b border-(--color-border)">
          <h2 className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
            Meu Perfil
          </h2>
        </div>

        <div className="flex items-center gap-4 p-5">
          <Avatar className="size-14">
            <AvatarFallback className="bg-(--color-surface-raised) text-(--color-text-primary)">
              {user?.name?.slice(0, 2).toUpperCase() ?? "US"}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-(--color-text-secondary)">Nome</span>
              <span className="text-[14px] text-(--color-text-primary)">{user?.name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-(--color-text-secondary)">E-mail</span>
              <span className="text-[14px] text-(--color-text-primary)">{user?.email ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-(--color-text-secondary)">Cargo</span>
              <span className="text-[14px] text-(--color-text-primary)">
                {user?.jobRole?.name ?? (user?.role === "admin" ? "Administrador" : "Operador")}
              </span>
            </div>
          </div>
        </div>
        <p className="border-t border-(--color-border) px-5 py-3 text-[12px] text-(--color-text-secondary)">
          Nome, e-mail e senha são gerenciados pelo administrador em Funcionários.
        </p>
      </div>

      {isAdmin && <AiPreferencesCard />}
      <GeneralPreferencesCard />
    </div>
  )
}

interface AiSettings {
  enabled: boolean
  provider: "disabled" | "gemini" | "anthropic"
  providerConfigured: boolean
}

function AiPreferencesCard() {
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void api.get("intelligence/settings").json<AiSettings>()
      .then((value) => {
        if (active) setSettings(value)
      })
      .catch(() => toast.error("Não foi possível carregar a configuração de IA."))
    return () => {
      active = false
    }
  }, [])

  async function changeEnabled(enabled: boolean) {
    if (!settings || saving) return
    setSaving(true)
    try {
      const updated = await api.patch("intelligence/settings", {
        headers: idempotencyHeaders(),
        json: { enabled },
      }).json<AiSettings>()
      setSettings(updated)
      toast.success(enabled
        ? "Relatórios de IA habilitados."
        : "Relatórios de IA desabilitados.")
    } catch {
      toast.error("Não foi possível alterar a configuração de IA.")
    } finally {
      setSaving(false)
    }
  }

  const providerLabel = settings?.provider === "gemini"
    ? "Gemini"
    : settings?.provider === "anthropic"
      ? "Anthropic"
      : "Não configurado"

  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)">
      <div className="flex items-center gap-2 px-5 py-4 bg-(--color-surface-raised) border-b border-(--color-border)">
        <Sparkles size={17} className="text-(--color-accent)" />
        <h2 className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
          Inteligência Artificial
        </h2>
      </div>
      <div className="flex items-center justify-between gap-6 px-5 py-4">
        <div className="flex flex-col">
          <span className="text-[14px] text-(--color-text-primary) font-(family-name:--font-data)">
            Relatórios de IA
          </span>
          <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
            Permite gerar análises explicativas na tela de Inteligência. Provedor: {providerLabel}.
          </span>
          {settings && !settings.providerConfigured && (
            <span className="mt-1 text-[12px] text-(--color-warning)">
              Configure o provedor e a chave no servidor antes de habilitar este recurso.
            </span>
          )}
        </div>
        <Switch
          aria-label="Habilitar relatórios de inteligência artificial"
          checked={settings?.enabled ?? false}
          disabled={!settings || saving || (!settings.providerConfigured && !settings.enabled)}
          onCheckedChange={(enabled) => void changeEnabled(enabled)}
        />
      </div>
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
