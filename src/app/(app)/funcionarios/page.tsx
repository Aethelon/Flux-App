"use client"

import { useEffect, useState } from "react"
import { Plus, UserPen, UserMinus, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"
import type { Locale } from "@/lib/locale"
import { PEOPLE_MESSAGES } from "@/lib/people-messages"
import { api, fetchAllPages, idempotencyHeaders } from "@/lib/api"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { FilterDropdown } from "@/components/shared/FilterDropdown"
import { TableSearchInput } from "@/components/shared/TableSearchInput"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { Employee } from "@/types/employee"
import { formatPhone, formatPhoneInput, phoneDigits } from "@/lib/formatters"
import { canArchiveEmployee } from "@/lib/accessControl"
import { useUserStore } from "@/store/userStore"
import { useJobRolesStore } from "@/store/jobRolesStore"
import type { JobRole } from "@/types/job-role"

interface ApiEmployee {
  id: string
  name: string
  email: string
  phone: string | null
  role: "admin" | "funcionario"
  jobRole: { id: string; name: string; systemKey: "administrator" | "operator" | null }
  status: "active" | "inactive"
  version: number
  createdAt: string
}

function employee(value: ApiEmployee): Employee {
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    phone: formatPhone(value.phone ?? ""),
    role: value.jobRole.name,
    jobRoleId: value.jobRole.id,
    status: value.status === "active" ? "Ativo" : "Inativo",
    version: value.version,
    createdAt: value.createdAt,
  }
}

function displayRoleName(role: JobRole, locale: Locale) {
  const copy = interfaceCopy[locale]
  if (role.systemKey === "administrator") return copy.admin
  if (role.systemKey === "operator") return copy.operator
  return role.name
}

const AVATAR_COLORS = [
  "bg-[#5B6AF0]",
  "bg-[#3DAB7F]",
  "bg-[#E88C30]",
  "bg-[#B05CE8]",
  "bg-[#E85C5C]",
]

function getInitials(name: string) {
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function avatarColorIndex(value: string) {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0)
}

function EmployeeAvatar({ name, colorIndex }: { name: string; colorIndex: number }) {
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-semibold text-white font-(family-name:--font-data) shrink-0 ${color}`}
    >
      {getInitials(name)}
    </span>
  )
}

const PER_PAGE = 10

interface EmployeeForm {
  name: string
  email: string
  phone: string
  jobRoleId: string
  status: "Ativo" | "Inativo"
  password: string
}

const EMPTY_FORM: EmployeeForm = { name: "", email: "", phone: "", jobRoleId: "", status: "Ativo", password: "" }

export default function FuncionariosPage() {
  const { locale } = useLocale()
  const messages = PEOPLE_MESSAGES[locale]
  const copy = messages.employees
  const currentUserId = useUserStore((state) => state.user?.id)
  const roles = useJobRolesStore((state) => state.roles)
  const loadRoles = useJobRolesStore((state) => state.load)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [page, setPage] = useState(1)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void Promise.all([fetchAllPages<ApiEmployee>("employees"), loadRoles()])
      .then(([response]) => setEmployees(response.map(employee)))
      .catch(() => toast.error(copy.loadError))
  }, [copy.loadError, loadRoles])

  const filtered = employees.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== "todos" && e.status !== statusFilter) return false
    return true
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function openAdd() {
    setForm({ ...EMPTY_FORM, jobRoleId: roles.find((role) => role.systemKey === "operator")?.id ?? roles.find((role) => role.status === "active")?.id ?? "" })
    setAddOpen(true)
  }

  function openEdit(employee: Employee) {
    setSelectedEmployee(employee)
    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      jobRoleId: employee.jobRoleId,
      status: employee.status,
      password: "",
    })
    setEditOpen(true)
  }

  function openDelete(employee: Employee) {
    if (!canArchiveEmployee(currentUserId, employee.id)) return
    setSelectedEmployee(employee)
    setDeleteOpen(true)
  }

  async function handleAdd() {
    if (submitting) return
    setSubmitting(true)
    try {
      const created = employee(await api.post("employees", {
        headers: idempotencyHeaders(),
        json: {
          name: form.name,
          email: form.email,
          phone: phoneDigits(form.phone) || null,
          jobRoleId: form.jobRoleId,
          status: form.status === "Ativo" ? "active" : "inactive",
          password: form.password,
        },
      }).json<ApiEmployee>())
      setEmployees((previous) => [created, ...previous])
      setAddOpen(false)
      toast.success(copy.added)
    } catch {
      toast.error(copy.addError)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!selectedEmployee || submitting) return
    setSubmitting(true)
    try {
      const updated = employee(await api.patch(`employees/${selectedEmployee.id}`, {
        headers: idempotencyHeaders(),
        json: {
          version: selectedEmployee.version,
          name: form.name,
          email: form.email,
          phone: phoneDigits(form.phone) || null,
          jobRoleId: form.jobRoleId,
          status: form.status === "Ativo" ? "active" : "inactive",
          ...(form.password ? { password: form.password } : {}),
        },
      }).json<ApiEmployee>())
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === selectedEmployee.id ? updated : e
        )
      )
      setEditOpen(false)
      toast.success(copy.updated)
    } catch {
      toast.error(copy.updateError)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (
      !selectedEmployee
      || submitting
      || !canArchiveEmployee(currentUserId, selectedEmployee.id)
    ) return
    setSubmitting(true)
    try {
      await api.delete(`employees/${selectedEmployee.id}`, {
        headers: idempotencyHeaders(),
        searchParams: { version: selectedEmployee.version },
      })
      setEmployees((prev) => prev.filter((e) => e.id !== selectedEmployee.id))
      setDeleteOpen(false)
      toast.success(copy.archived(selectedEmployee.name))
      setSelectedEmployee(null)
    } catch {
      toast.error(copy.archiveError)
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<Employee>[] = [
    {
      key: "name",
      label: messages.name,
      className: "max-sm:min-w-44",
      render: (row) => (
        <div className="flex items-center gap-3">
          <EmployeeAvatar name={row.name} colorIndex={avatarColorIndex(row.id)} />
          <span className="font-medium max-sm:min-w-0 max-sm:max-w-36 max-sm:whitespace-normal max-sm:wrap-anywhere">{row.name}</span>
        </div>
      ),
    },
    { key: "email", label: messages.email },
    { key: "phone", label: messages.phone },
    {
      key: "status",
      label: messages.status,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "role",
      label: messages.role,
      render: (row) => {
        const role = roles.find((role) => role.id === row.jobRoleId)
        return role ? displayRoleName(role, locale) : row.role
      },
    },
    {
      key: "actions",
      label: messages.actions,
      className: "w-20 max-sm:sticky max-sm:right-0 max-sm:z-10 max-sm:bg-(--color-surface)",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            className="rounded p-1.5 text-(--color-text-secondary) transition-colors hover:bg-(--color-surface-raised) hover:text-(--color-text-primary) max-sm:p-2"
            aria-label={copy.edit}
            title={copy.edit}
          >
            <UserPen size={15} />
          </button>
          {canArchiveEmployee(currentUserId, row.id) && (
            <button
              onClick={() => openDelete(row)}
              className="rounded p-1.5 text-(--color-danger)/60 transition-colors hover:bg-(--color-danger)/10 hover:text-(--color-danger) max-sm:p-2"
              aria-label={copy.archive}
              title={copy.archive}
            >
              <UserMinus size={15} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <DataTable
        columns={columns}
        data={paginated}
        keyField="id"
        emptyMessage={messages.empty}
        filters={
          <>
            <TableSearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder={messages.search}
            />
            <FilterDropdown
              label={messages.status}
              value={statusFilter}
              options={[
                { value: "todos", label: messages.all },
                { value: "Ativo", label: messages.activePlural },
                { value: "Inativo", label: messages.inactivePlural },
              ]}
              onChange={(v) => { setStatusFilter(v); setPage(1) }}
            />
          </>
        }
        actions={
          <Button
            size="sm"
            className="gap-2 bg-(--color-accent) text-white"
            onClick={openAdd}
          >
            <Plus size={14} />
            {copy.add}
          </Button>
        }
        pagination={{
          page,
          total: filtered.length,
          perPage: PER_PAGE,
          onChange: setPage,
        }}
      />

      {/* Modal: Novo Funcionário */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.add}</DialogTitle>
          </DialogHeader>
          <EmployeeFormFields form={form} roles={roles} lockIdentity={false} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {messages.cancel}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!form.name || !form.email || !form.jobRoleId || form.password.length < 8 || submitting}
              className="bg-(--color-accent) text-white"
            >
              {messages.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Funcionário */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.edit}</DialogTitle>
          </DialogHeader>
          <EmployeeFormFields
            form={form}
            roles={roles}
            lockIdentity={selectedEmployee?.id === currentUserId}
            onChange={setForm}
          />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {messages.cancel}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!form.name || !form.email || submitting}
              className="bg-(--color-accent) text-white"
            >
              {messages.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Remoção */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)">
              <TriangleAlert size={20} />
            </AlertDialogMedia>
            <AlertDialogTitle>{copy.archiveTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedEmployee && copy.archiveDescription(selectedEmployee.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
              {messages.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              {messages.archive}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EmployeeFormFields({
  form,
  roles,
  lockIdentity,
  onChange,
}: {
  form: EmployeeForm
  roles: JobRole[]
  lockIdentity: boolean
  onChange: (f: EmployeeForm) => void
}) {
  const { locale } = useLocale()
  const messages = PEOPLE_MESSAGES[locale]
  const selectedRole = roles.find((role) => role.id === form.jobRoleId)

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-name">{messages.name}</Label>
        <Input
          id="employee-name"
          placeholder={messages.fullName}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-email">{messages.email}</Label>
        <Input
          id="employee-email"
          type="email"
          placeholder="email@exemplo.com"
          value={form.email}
          disabled={lockIdentity}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-phone">{messages.phone}</Label>
        <Input
          id="employee-phone"
          placeholder="(00) 00000-0000"
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: formatPhoneInput(e.target.value) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-password">{messages.password}</Label>
        <Input
          id="employee-password"
          type="password"
          maxLength={128}
          placeholder={messages.passwordHint}
          value={form.password}
          onChange={(e) => onChange({ ...form, password: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-role">{messages.role}</Label>
        <Select
          value={form.jobRoleId}
          disabled={lockIdentity}
          onValueChange={(jobRoleId) => jobRoleId && onChange({ ...form, jobRoleId })}
        >
          <SelectTrigger id="employee-role">
            <SelectValue>{selectedRole ? displayRoleName(selectedRole, locale) : messages.selectRole}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {roles.filter((role) => role.status === "active").map((role) => (
              <SelectItem key={role.id} value={role.id}>{displayRoleName(role, locale)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-status">{messages.status}</Label>
        <Select
          value={form.status}
          disabled={lockIdentity}
          onValueChange={(v) => onChange({ ...form, status: v as "Ativo" | "Inativo" })}
        >
          <SelectTrigger id="employee-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ativo">{messages.active}</SelectItem>
            <SelectItem value="Inativo">{messages.inactive}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
