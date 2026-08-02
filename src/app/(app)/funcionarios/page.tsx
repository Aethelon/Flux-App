"use client"

import { useEffect, useState } from "react"
import { Plus, UserPen, UserMinus, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
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

interface ApiEmployee {
  id: string
  name: string
  email: string
  phone: string | null
  role: "admin" | "funcionario"
  status: "active" | "inactive"
  version: number
  createdAt: string
}

function employee(value: ApiEmployee): Employee {
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    phone: value.phone ?? "",
    role: value.role === "admin" ? "Administrador" : "Funcionário",
    status: value.status === "active" ? "Ativo" : "Inativo",
    version: value.version,
    createdAt: value.createdAt,
  }
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

const STATUS_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "Ativo", label: "Ativos" },
  { value: "Inativo", label: "Inativos" },
]

const PER_PAGE = 10

interface EmployeeForm {
  name: string
  email: string
  phone: string
  role: "Funcionário" | "Administrador"
  status: "Ativo" | "Inativo"
  password: string
}

const EMPTY_FORM: EmployeeForm = { name: "", email: "", phone: "", role: "Funcionário", status: "Ativo", password: "" }

export default function FuncionariosPage() {
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
    void fetchAllPages<ApiEmployee>("employees")
      .then((response) => setEmployees(response.map(employee)))
      .catch(() => toast.error("Não foi possível carregar os funcionários."))
  }, [])

  const filtered = employees.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== "todos" && e.status !== statusFilter) return false
    return true
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function openAdd() {
    setForm(EMPTY_FORM)
    setAddOpen(true)
  }

  function openEdit(employee: Employee) {
    setSelectedEmployee(employee)
    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role as EmployeeForm["role"],
      status: employee.status,
      password: "",
    })
    setEditOpen(true)
  }

  function openDelete(employee: Employee) {
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
          phone: form.phone || null,
          role: form.role === "Administrador" ? "admin" : "funcionario",
          status: form.status === "Ativo" ? "active" : "inactive",
          password: form.password,
        },
      }).json<ApiEmployee>())
      setEmployees((previous) => [created, ...previous])
      setAddOpen(false)
      toast.success("Funcionário adicionado com sucesso.")
    } catch {
      toast.error("Não foi possível adicionar o funcionário.")
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
          phone: form.phone || null,
          role: form.role === "Administrador" ? "admin" : "funcionario",
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
      toast.success("Funcionário atualizado.")
    } catch {
      toast.error("Não foi possível atualizar o funcionário.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedEmployee || submitting) return
    setSubmitting(true)
    try {
      await api.delete(`employees/${selectedEmployee.id}`, {
        headers: idempotencyHeaders(),
        searchParams: { version: selectedEmployee.version },
      })
      setEmployees((prev) => prev.filter((e) => e.id !== selectedEmployee.id))
      setDeleteOpen(false)
      toast.success(`${selectedEmployee.name} foi removido.`)
      setSelectedEmployee(null)
    } catch {
      toast.error("Não foi possível remover o funcionário.")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<Employee>[] = [
    {
      key: "name",
      label: "Nome",
      render: (row) => (
        <div className="flex items-center gap-3">
          <EmployeeAvatar name={row.name} colorIndex={avatarColorIndex(row.id)} />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefone" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "role", label: "Cargo" },
    {
      key: "actions",
      label: "Ações",
      className: "w-[80px]",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded hover:bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            title="Editar funcionário"
          >
            <UserPen size={15} />
          </button>
          <button
            onClick={() => openDelete(row)}
            className="p-1.5 rounded hover:bg-(--color-danger)/10 text-(--color-danger)/60 hover:text-(--color-danger) transition-colors"
            title="Remover funcionário"
          >
            <UserMinus size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Funcionários"
        subtitle="Gerencie sua equipe e cargos"
      />

      <DataTable
        columns={columns}
        data={paginated}
        keyField="id"
        filters={
          <>
            <TableSearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Buscar por nome..."
            />
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={STATUS_FILTERS}
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
            Novo Funcionário
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
            <DialogTitle>Novo Funcionário</DialogTitle>
          </DialogHeader>
          <EmployeeFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!form.name || !form.email || form.password.length < 8 || submitting}
              className="bg-(--color-accent) text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Funcionário */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          <EmployeeFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!form.name || !form.email || submitting}
              className="bg-(--color-accent) text-white"
            >
              Salvar Alterações
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
            <AlertDialogTitle>Remover funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedEmployee?.name} será arquivado e perderá o acesso às operações ativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
              Cancelar
            </AlertDialogCancel>
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
    </div>
  )
}

function EmployeeFormFields({
  form,
  onChange,
}: {
  form: EmployeeForm
  onChange: (f: EmployeeForm) => void
}) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-name">Nome</Label>
        <Input
          id="employee-name"
          placeholder="Nome completo"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-email">E-mail</Label>
        <Input
          id="employee-email"
          type="email"
          placeholder="email@exemplo.com"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-phone">Telefone</Label>
        <Input
          id="employee-phone"
          placeholder="(00) 00000-0000"
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-password">Senha</Label>
        <Input
          id="employee-password"
          type="password"
          maxLength={128}
          placeholder="Mínimo de 8 caracteres"
          value={form.password}
          onChange={(e) => onChange({ ...form, password: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-role">Cargo</Label>
        <Select
          value={form.role}
          onValueChange={(v) => onChange({ ...form, role: v as EmployeeForm["role"] })}
        >
          <SelectTrigger id="employee-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Funcionário">Funcionário</SelectItem>
            <SelectItem value="Administrador">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-status">Status</Label>
        <Select
          value={form.status}
          onValueChange={(v) => onChange({ ...form, status: v as "Ativo" | "Inativo" })}
        >
          <SelectTrigger id="employee-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
