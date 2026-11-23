"use client"

import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react"
import { useThemeTransition } from "@/lib/useThemeTransition"
import { Plus, Pencil, Trash2, TriangleAlert, Check, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useLocale } from "@/components/layout/LocaleProvider"
import { PageHeader } from "@/components/shared/PageHeader"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { api, idempotencyHeaders } from "@/lib/api"
import { isLocale, LOCALE_OPTIONS } from "@/lib/locale"
import { settingsMessages } from "@/lib/settings-messages"
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

function useSettingsMessages() {
  const { locale } = useLocale()
  return settingsMessages[locale]
}

export default function ConfiguracoesPage() {
  const messages = useSettingsMessages()
  const [tab, setTab] = useState("unidades")
  const loadCategories = useCategoriesStore((state) => state.loadCategories)
  const loadUnits = useUnitsStore((state) => state.loadUnits)
  const isAdmin = useUserStore((state) => state.user?.role === "admin")
  const loadJobRoles = useJobRolesStore((state) => state.load)
  const showLoadError = useEffectEvent(() => toast.error(messages.loadError))

  useEffect(() => {
    void Promise.all([loadCategories(), loadUnits(), ...(isAdmin ? [loadJobRoles()] : [])])
      .catch(() => showLoadError())
  }, [isAdmin, loadCategories, loadJobRoles, loadUnits])

  return (
    <div>
      <PageHeader
        title={messages.title}
        subtitle={messages.subtitle}
        className="max-sm:mb-5 max-sm:flex-col max-sm:items-start max-sm:[&>h1]:text-[32px] max-sm:[&>div]:ml-0 max-sm:[&_p]:text-left max-sm:[&_p]:text-sm"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label={messages.title} className="mb-4 bg-(--color-surface) sm:mb-6 max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:group-data-horizontal/tabs:h-auto max-sm:[&>button]:min-h-10 max-sm:[&>button]:whitespace-normal">
          <TabsTrigger value="unidades">{messages.tabs.units}</TabsTrigger>
          <TabsTrigger value="categorias">{messages.tabs.categories}</TabsTrigger>
          {isAdmin && <TabsTrigger value="cargos">{messages.tabs.roles}</TabsTrigger>}
          <TabsTrigger value="preferencias">{messages.tabs.preferences}</TabsTrigger>
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
  addLabel,
  onAdd,
  children,
}: {
  title: string
  emptyMessage: string
  addLabel: string
  onAdd: () => void
  children: React.ReactNode
}) {
  const isEmpty = !Array.isArray(children) || children.length === 0

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-4 bg-(--color-surface-raised) border-b border-(--color-border) sm:px-5">
        <h2 className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
          {title}
        </h2>
        <Button size="icon" className="shrink-0 bg-(--color-accent) text-white" aria-label={addLabel} onClick={onAdd}>
          <Plus size={16} />
        </Button>
      </div>
      {isEmpty ? (
        <div className="px-4 py-12 text-center text-[14px] text-(--color-text-secondary) font-(family-name:--font-data)">
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
  const { actions } = useSettingsMessages()
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-(--color-border) last:border-b-0 hover:bg-(--color-surface-raised)/50 transition-colors sm:px-5">
      <div className="flex min-w-0 flex-col wrap-anywhere font-(family-name:--font-data)">
        <span className="text-[13px] font-medium text-(--color-text-primary) tracking-[-0.143px]">
          {primary}
        </span>
        {secondary && (
          <span className="text-[13px] text-(--color-text-secondary)">{secondary}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="rounded p-2 hover:bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors sm:p-1.5"
          aria-label={actions.edit}
          title={actions.edit}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-(--color-danger)/90 hover:bg-(--color-danger) text-white text-[13px] font-medium transition-colors sm:py-1"
          aria-label={actions.delete}
        >
          <Trash2 size={13} />
          <span className="hidden sm:inline">{actions.delete}</span>
        </button>
      </div>
    </div>
  )
}

// As unidades vêm da API por um store compartilhado — o Inventário
// consome a mesma lista, então cadastrar aqui reflete lá.
function UnitsPanel() {
  const { actions, units: messages } = useSettingsMessages()
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
      toast.success(messages.added)
    } catch {
      toast.error(messages.addError)
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
      toast.success(messages.updated)
    } catch {
      toast.error(messages.updateError)
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
      toast.success(messages.removed(selected.name))
      setSelected(null)
    } catch {
      toast.error(messages.removeError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SettingsListCard title={messages.title} emptyMessage={messages.empty} addLabel={messages.add} onAdd={openAdd}>
        {units.map((unit) => (
          <SettingsListRow
            key={unit.id}
            primary={unit.name}
            secondary={`${unit.abbreviation} · ${
              unit.allowsFractional
                ? messages.upToDecimals(messages.decimals(unit.quantityScale))
                : messages.integer
            }`}
            onEdit={() => openEdit(unit)}
            onDelete={() => openDelete(unit)}
          />
        ))}
      </SettingsListCard>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{messages.add}</DialogTitle>
          </DialogHeader>
          <UnitFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {actions.cancel}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!form.name || !form.abbreviation || submitting}
              className="bg-(--color-accent) text-white"
            >
              {actions.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{messages.edit}</DialogTitle>
          </DialogHeader>
          <UnitFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {actions.cancel}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!form.name || !form.abbreviation || submitting}
              className="bg-(--color-accent) text-white"
            >
              {actions.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm" className="w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)">
              <TriangleAlert size={20} />
            </AlertDialogMedia>
            <AlertDialogTitle>{messages.removeTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {selected && messages.removeDescription(selected.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>{actions.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              {actions.archive}
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
  const { preferences, units: messages } = useSettingsMessages()
  const decimalOptions = [1, 2, 3].map((count) => ({ value: String(count), label: messages.decimals(count) }))
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit-name">{preferences.name}</Label>
        <Input
          id="unit-name"
          placeholder={messages.nameExample}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit-abbreviation">{messages.abbreviation}</Label>
        <Input
          id="unit-abbreviation"
          placeholder={messages.abbreviationExample}
          value={form.abbreviation}
          onChange={(e) => onChange({ ...form, abbreviation: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="unit-fractional">{messages.fractional}</Label>
          <span className="text-[12px] text-(--color-text-secondary)">
            {messages.fractionalDescription}
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
          <Label htmlFor="unit-scale">{messages.decimalPlaces}</Label>
          <Select
            value={String(form.quantityScale)}
            items={decimalOptions}
            onValueChange={(value) => onChange({ ...form, quantityScale: Number(value) })}
          >
            <SelectTrigger id="unit-scale" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {decimalOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
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
  const { actions, categories: messages, preferences } = useSettingsMessages()
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
      toast.success(messages.added)
    } catch {
      toast.error(messages.addError)
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
      toast.success(messages.updated)
    } catch {
      toast.error(messages.updateError)
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
      toast.success(messages.removed(selected.name))
      setSelected(null)
    } catch {
      toast.error(messages.removeError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SettingsListCard title={messages.title} emptyMessage={messages.empty} addLabel={messages.add} onAdd={openAdd}>
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
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{messages.add}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="category-name">{preferences.name}</Label>
            <Input
              id="category-name"
              placeholder={messages.nameExample}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {actions.cancel}
            </Button>
            <Button onClick={handleAdd} disabled={!name || submitting} className="bg-(--color-accent) text-white">
              {actions.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{messages.edit}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="category-edit-name">{preferences.name}</Label>
            <Input
              id="category-edit-name"
              placeholder={messages.nameExample}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {actions.cancel}
            </Button>
            <Button onClick={handleEdit} disabled={!name || submitting} className="bg-(--color-accent) text-white">
              {actions.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm" className="w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)">
              <TriangleAlert size={20} />
            </AlertDialogMedia>
            <AlertDialogTitle>{messages.removeTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {selected && messages.removeDescription(selected.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>{actions.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              {actions.archive}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function JobRolesPanel() {
  const { actions, roles: messages, preferences } = useSettingsMessages()
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
      toast.success(selected ? messages.updated : messages.created)
    } catch {
      toast.error(messages.saveError)
    } finally {
      setSubmitting(false)
    }
  }
  async function remove() {
    if (!selected || submitting) return
    setSubmitting(true)
    try {
      await removeRole(selected)
      setDeleteOpen(false)
      toast.success(messages.removed)
    } catch {
      toast.error(messages.removeError)
    } finally {
      setSubmitting(false)
    }
  }
  const groups = [...new Set(permissions.map((permission) => permission.group))]
  const protectedAdministrator = selected?.systemKey === "administrator"
  const screenLabels: Partial<Record<string, string>> = messages.permissions
  const builtinRoles = { administrator: preferences.administrator, operator: preferences.operator }

  return <>
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 bg-(--color-surface-raised) border-b border-(--color-border) sm:px-5">
        <div>
          <h2 className="text-[18px] font-medium text-(--color-text-primary)">{messages.title}</h2>
          <p className="text-[12px] text-(--color-text-secondary)">{messages.subtitle}</p>
        </div>
        <Button size="sm" className="gap-2 bg-(--color-accent) text-white" onClick={openAdd}>
          <Plus size={14} />{messages.add}
        </Button>
      </div>
      {roles.map((role) => (
        <div key={role.id} className="flex items-center justify-between gap-3 px-4 py-4 border-b border-(--color-border) last:border-0 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="wrap-anywhere text-[14px] font-medium">{role.systemKey ? builtinRoles[role.systemKey] : role.name}</span>
              {role.systemKey && <span className="rounded-full bg-(--color-accent)/10 px-2 py-0.5 text-[10px] text-(--color-accent)">{messages.system}</span>}
              {role.status === "inactive" && <span className="text-[11px] text-(--color-danger)">{messages.inactive}</span>}
            </div>
            <p className="text-[12px] text-(--color-text-secondary)">{messages.counts(role.employeeCount, role.permissions.length)}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            {role.systemKey !== "administrator" && (
              <button type="button" onClick={() => openEdit(role)} className="p-2 text-(--color-text-secondary) hover:text-(--color-text-primary)" aria-label={actions.edit} title={actions.edit}>
                <Pencil size={15} />
              </button>
            )}
            {!role.systemKey && (
              <button type="button" onClick={() => { setSelected(role); setDeleteOpen(true) }} className="p-2 text-(--color-danger)" aria-label={actions.remove} title={actions.remove}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{selected ? messages.edit : messages.add}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job-role-name">{preferences.name}</Label>
            <Input
              id="job-role-name"
              value={selected?.systemKey ? builtinRoles[selected.systemKey] : form.name}
              disabled={Boolean(selected?.systemKey)}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder={messages.nameExample}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job-role-description">{messages.description}</Label>
            <Input id="job-role-description" value={form.description} disabled={protectedAdministrator} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          {selected && !selected.systemKey && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="job-role-status">{messages.status}</Label>
                <p className="text-[12px] text-(--color-text-secondary)">{messages.inactiveDescription}</p>
              </div>
              <Switch id="job-role-status" checked={form.status === "active"} onCheckedChange={(checked) => setForm({ ...form, status: checked ? "active" : "inactive" })} />
            </div>
          )}
          <div className="border-t border-(--color-border) pt-4">
            <h3 className="text-[14px] font-medium">{messages.availableScreens}</h3>
            {groups.map((group) => (
              <div key={group} className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-(--color-text-secondary)">{group === "Telas" ? messages.screensGroup : group}</p>
                <div className="flex flex-col gap-3">
                  {permissions.filter((permission) => permission.group === group).map((permission) => (
                    <label key={permission.key} className="flex items-center justify-between gap-4">
                      <span className="text-[13px]">{screenLabels[permission.key] ?? permission.label}</span>
                      <Switch
                        disabled={protectedAdministrator}
                        checked={protectedAdministrator || form.permissions.includes(permission.key)}
                        onCheckedChange={(checked) => setForm({
                          ...form,
                          permissions: checked ? [...form.permissions, permission.key] : form.permissions.filter((key) => key !== permission.key),
                        })}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{actions.cancel}</Button>
          {!protectedAdministrator && <Button disabled={submitting || !form.name.trim()} onClick={save} className="bg-(--color-accent) text-white">{actions.save}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent size="sm" className="w-[calc(100%-2rem)]">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)"><TriangleAlert size={20} /></AlertDialogMedia>
          <AlertDialogTitle>{messages.removeTitle}</AlertDialogTitle>
          <AlertDialogDescription>{selected && messages.removeDescription(selected.name)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{actions.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={remove} disabled={submitting} className="bg-(--color-danger) text-white">{actions.remove}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
}

function PreferencesPanel() {
  const { preferences: messages } = useSettingsMessages()
  const user = useUserStore((s) => s.user)
  const isAdmin = user?.role === "admin"
  const jobRole = user?.jobRole
  const builtinRoles = { administrator: messages.administrator, operator: messages.operator }
  const roleName = jobRole?.systemKey ? builtinRoles[jobRole.systemKey] : jobRole?.name ?? (isAdmin ? messages.administrator : messages.operator)

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
        <div className="px-4 py-4 bg-(--color-surface-raised) border-b border-(--color-border) sm:px-5">
          <h2 className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
            {messages.profile}
          </h2>
        </div>

        <div className="flex items-start gap-4 p-4 sm:items-center sm:p-5">
          <Avatar className="size-11 shrink-0 sm:size-14">
            <AvatarFallback className="bg-(--color-surface-raised) text-(--color-text-primary)">
              {user?.name?.slice(0, 2).toUpperCase() ?? "US"}
            </AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 wrap-anywhere md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-(--color-text-secondary)">{messages.name}</span>
              <span className="text-[14px] text-(--color-text-primary)">{user?.name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-(--color-text-secondary)">{messages.email}</span>
              <span className="text-[14px] text-(--color-text-primary)">{user?.email ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-(--color-text-secondary)">{messages.role}</span>
              <span className="text-[14px] text-(--color-text-primary)">
                {roleName}
              </span>
            </div>
          </div>
        </div>
        <p className="border-t border-(--color-border) px-4 py-3 text-[12px] text-(--color-text-secondary) sm:px-5">
          {messages.profileDescription}
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
  const { preferences: messages } = useSettingsMessages()
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const showLoadError = useEffectEvent(() => toast.error(messages.aiLoadError))

  useEffect(() => {
    let active = true
    void api.get("intelligence/settings").json<AiSettings>()
      .then((value) => {
        if (active) setSettings(value)
      })
      .catch(() => {
        if (active) showLoadError()
      })
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
      toast.success(enabled ? messages.aiEnabled : messages.aiDisabled)
    } catch {
      toast.error(messages.aiSaveError)
    } finally {
      setSaving(false)
    }
  }

  const providerLabel = settings?.provider === "gemini"
    ? "Gemini"
    : settings?.provider === "anthropic"
      ? "Anthropic"
      : messages.aiProviderMissing

  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)">
      <div className="flex items-center gap-2 px-4 py-4 bg-(--color-surface-raised) border-b border-(--color-border) sm:px-5">
        <Sparkles size={17} className="text-(--color-accent)" />
        <h2 className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
          {messages.ai}
        </h2>
      </div>
      <div className="flex items-start justify-between gap-3 px-4 py-4 sm:items-center sm:gap-6 sm:px-5">
        <div className="flex flex-col">
          <span className="text-[14px] text-(--color-text-primary) font-(family-name:--font-data)">
            {messages.aiReports}
          </span>
          <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
            {messages.aiReportsDescription(providerLabel)}
          </span>
          {settings && !settings.providerConfigured && (
            <span className="mt-1 text-[12px] text-(--color-warning)">
              {messages.aiProviderSetup}
            </span>
          )}
        </div>
        <Switch
          aria-label={messages.enableAiReports}
          checked={settings?.enabled ?? false}
          disabled={!settings || saving || (!settings.providerConfigured && !settings.enabled)}
          onCheckedChange={(enabled) => void changeEnabled(enabled)}
        />
      </div>
    </div>
  )
}

const FONT_SIZE_OPTIONS: FontSize[] = ["pequena", "padrao", "grande"]

function GeneralPreferencesCard() {
  const { locale, setLocale } = useLocale()
  const messages = settingsMessages[locale].preferences
  const { resolvedTheme, setThemeWithTransition } = useThemeTransition()
  const fontSize = useFontSizeStore((s) => s.fontSize)
  const setFontSize = useFontSizeStore((s) => s.setFontSize)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
      <div className="px-4 py-4 bg-(--color-surface-raised) border-b border-(--color-border) sm:px-5">
        <h2 className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
          {messages.general}
        </h2>
      </div>

      <div className="flex flex-col gap-3 border-b border-(--color-border) px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-col">
          <span className="text-[14px] text-(--color-text-primary) font-(family-name:--font-data)">
            {messages.appearance}
          </span>
          <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
            {messages.appearanceDescription}
          </span>
        </div>
        {mounted && (
          <div className="grid grid-cols-2 gap-3 sm:shrink-0">
            <ThemeOptionCard
              label={messages.light}
              theme="light"
              active={resolvedTheme === "light"}
              onSelect={() => setThemeWithTransition("light")}
            />
            <ThemeOptionCard
              label={messages.dark}
              theme="dark"
              active={resolvedTheme === "dark"}
              onSelect={() => setThemeWithTransition("dark")}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-b border-(--color-border) px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-col">
          <span className="text-[14px] text-(--color-text-primary) font-(family-name:--font-data)">
            {messages.fontSize}
          </span>
          <span className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
            {messages.fontSizeDescription}
          </span>
        </div>
        {mounted && (
          <div className="grid grid-cols-3 gap-2 sm:shrink-0 sm:gap-4">
            {FONT_SIZE_OPTIONS.map((option) => (
              <FontSizeOption
                key={option}
                label={messages.fontSizes[option]}
                scale={FONT_SIZE_SCALE[option]}
                active={fontSize === option}
                onSelect={() => setFontSize(option)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-col">
          <Label htmlFor="settings-language" className="text-[14px] font-normal text-(--color-text-primary) font-(family-name:--font-data)">
            {messages.language}
          </Label>
          <span id="settings-language-description" className="text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
            {messages.languageDescription}
          </span>
        </div>
        <Select value={locale} items={LOCALE_OPTIONS} onValueChange={(value) => { if (isLocale(value)) setLocale(value) }}>
          <SelectTrigger id="settings-language" aria-describedby="settings-language-description" className="w-full sm:w-45 sm:shrink-0 max-sm:data-[size=default]:h-10">
            <SelectValue lang={locale} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LOCALE_OPTIONS).map(([value, label]) => (
              <SelectItem key={value} value={value} lang={value}>{label}</SelectItem>
            ))}
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
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl border-2 p-2 transition-colors sm:w-28",
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
      <span className="w-full text-center text-[13px] font-medium text-(--color-text-primary) font-(family-name:--font-data)">
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
    <button type="button" aria-pressed={active} onClick={onSelect} className="flex min-w-0 flex-col items-center gap-2">
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full font-semibold transition-colors font-(family-name:--font-data)",
          active
            ? "bg-(--color-accent) text-white"
            : "bg-(--color-surface-raised) text-(--color-text-secondary)"
        )}
        style={{ fontSize: `${14 * scale}px` }}
      >
        <span aria-hidden="true">Aa</span>
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
