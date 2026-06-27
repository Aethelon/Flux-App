"use client"

import { useState } from "react"
import { Download, Plus, UserPen, UserMinus, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
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
import type { Client } from "@/types/client"

const INITIAL_CLIENTS: Client[] = [
  { id: "1",  name: "Ana Silva",       email: "ana.silva@email.com",      phone: "(11) 98765-4321", status: "Ativo",   createdAt: "2023-01-10", lastPurchase: "12 Out 2023" },
  { id: "2",  name: "Carlos Oliveira", email: "carlos.o@empresa.com.br",  phone: "(21) 99988-7766", status: "Ativo",   createdAt: "2023-02-05", lastPurchase: "05 Nov 2023" },
  { id: "3",  name: "Mariana Pereira", email: "mari.p@dominio.com",        phone: "(31) 97766-5544", status: "Inativo", createdAt: "2023-03-14", lastPurchase: "14 Mar 2023" },
  { id: "4",  name: "Rafael Ribeiro",  email: "rafael.ribeiro@email.com", phone: "(41) 98855-2211", status: "Ativo",   createdAt: "2023-04-22", lastPurchase: "22 Nov 2023" },
  { id: "5",  name: "Lucas Teixeira",  email: "lucas.tx@empresa.com",     phone: "(51) 99123-4567", status: "Ativo",   createdAt: "2023-05-01", lastPurchase: "Hoje" },
  { id: "6",  name: "Fernanda Costa",  email: "fe.costa@email.com",       phone: "(11) 91234-5678", status: "Ativo",   createdAt: "2023-06-10", lastPurchase: "01 Dez 2023" },
  { id: "7",  name: "Bruno Mendes",    email: "bruno.m@empresa.com.br",   phone: "(31) 92233-4455", status: "Inativo", createdAt: "2023-07-14", lastPurchase: "20 Ago 2023" },
  { id: "8",  name: "Julia Santos",    email: "ju.santos@dominio.com",    phone: "(41) 93344-5566", status: "Ativo",   createdAt: "2023-08-22", lastPurchase: "10 Jan 2024" },
  { id: "9",  name: "Pedro Alves",     email: "pedro.a@empresa.com",      phone: "(51) 94455-6677", status: "Ativo",   createdAt: "2023-09-01", lastPurchase: "Hoje" },
  { id: "10", name: "Camila Rocha",    email: "camila.r@email.com",       phone: "(21) 95566-7788", status: "Inativo", createdAt: "2023-10-14", lastPurchase: "05 Fev 2024" },
]

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

function ClientAvatar({ name, colorIndex }: { name: string; colorIndex: number }) {
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-semibold text-white font-(family-name:--font-data) shrink-0 ${color}`}
    >
      {getInitials(name)}
    </span>
  )
}

const TABS = [
  { value: "todos",    label: "Todos" },
  { value: "ativos",   label: "Ativos" },
  { value: "inativos", label: "Inativos" },
]

const PER_PAGE = 10

interface ClientForm {
  name: string
  email: string
  phone: string
  status: "Ativo" | "Inativo"
}

const EMPTY_FORM: ClientForm = { name: "", email: "", phone: "", status: "Ativo" }

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS)
  const [tab, setTab] = useState("todos")
  const [page, setPage] = useState(1)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM)

  const filtered = clients.filter((c) => {
    if (tab === "ativos")   return c.status === "Ativo"
    if (tab === "inativos") return c.status === "Inativo"
    return true
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function openAdd() {
    setForm(EMPTY_FORM)
    setAddOpen(true)
  }

  function openEdit(client: Client) {
    setSelectedClient(client)
    setForm({ name: client.name, email: client.email, phone: client.phone, status: client.status })
    setEditOpen(true)
  }

  function openDelete(client: Client) {
    setSelectedClient(client)
    setDeleteOpen(true)
  }

  function handleAdd() {
    const newClient: Client = {
      id: String(Date.now()),
      ...form,
      createdAt: new Date().toISOString().slice(0, 10),
      lastPurchase: "—",
    }
    setClients((prev) => [newClient, ...prev])
    setAddOpen(false)
    toast.success("Cliente adicionado com sucesso.")
  }

  function handleEdit() {
    if (!selectedClient) return
    setClients((prev) =>
      prev.map((c) =>
        c.id === selectedClient.id ? { ...c, ...form } : c
      )
    )
    setEditOpen(false)
    toast.success("Cliente atualizado.")
  }

  function handleDelete() {
    if (!selectedClient) return
    setClients((prev) => prev.filter((c) => c.id !== selectedClient.id))
    setDeleteOpen(false)
    toast.success(`${selectedClient.name} foi removido.`)
    setSelectedClient(null)
  }

  const columns: Column<Client>[] = [
    {
      key: "name",
      label: "Nome",
      render: (row) => (
        <div className="flex items-center gap-3">
          <ClientAvatar name={row.name} colorIndex={parseInt(row.id) - 1} />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: "email",         label: "E-mail" },
    { key: "phone",         label: "Telefone" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "lastPurchase",  label: "Última Compra" },
    {
      key: "actions",
      label: "Ações",
      className: "w-[80px]",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded hover:bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            title="Editar cliente"
          >
            <UserPen size={15} />
          </button>
          <button
            onClick={() => openDelete(row)}
            className="p-1.5 rounded hover:bg-(--color-danger)/10 text-(--color-danger)/60 hover:text-(--color-danger) transition-colors"
            title="Remover cliente"
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
        title="Clientes"
        subtitle="Gerencie sua base de clientes e histórico de compras"
      />

      <DataTable
        columns={columns}
        data={paginated}
        keyField="id"
        tabs={TABS}
        activeTab={tab}
        onTabChange={(t) => { setTab(t); setPage(1) }}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-(--color-text-secondary) border-(--color-border)"
            >
              <Download size={14} />
              Exportar
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-(--color-accent) text-white"
              onClick={openAdd}
            >
              <Plus size={14} />
              Novo Cliente
            </Button>
          </>
        }
        pagination={{
          page,
          total: filtered.length,
          perPage: PER_PAGE,
          onChange: setPage,
        }}
      />

      {/* Modal: Novo Cliente */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <ClientFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!form.name || !form.email}
              className="bg-(--color-accent) text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Cliente */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <ClientFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!form.name || !form.email}
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
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedClient?.name} será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ClientFormFields({
  form,
  onChange,
}: {
  form: ClientForm
  onChange: (f: ClientForm) => void
}) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-name">Nome</Label>
        <Input
          id="client-name"
          placeholder="Nome completo"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-email">E-mail</Label>
        <Input
          id="client-email"
          type="email"
          placeholder="email@exemplo.com"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-phone">Telefone</Label>
        <Input
          id="client-phone"
          placeholder="(00) 00000-0000"
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-status">Status</Label>
        <Select
          value={form.status}
          onValueChange={(v) => onChange({ ...form, status: v as "Ativo" | "Inativo" })}
        >
          <SelectTrigger id="client-status">
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
