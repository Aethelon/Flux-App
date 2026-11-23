"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, UserPen, UserMinus, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { useLocale } from "@/components/layout/LocaleProvider"
import { PEOPLE_MESSAGES } from "@/lib/people-messages"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { FilterDropdown } from "@/components/shared/FilterDropdown"
import { TableSearchInput } from "@/components/shared/TableSearchInput"
import { Button } from "@/components/ui/button"
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
  ClientFormFields,
  EMPTY_CLIENT_FORM,
  type ClientFormValues,
} from "@/components/shared/ClientFormFields"
import { useClientsStore } from "@/store/clientsStore"
import type { Client } from "@/types/client"

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

const PER_PAGE = 10

export default function ClientesPage() {
  const { locale } = useLocale()
  const messages = PEOPLE_MESSAGES[locale]
  const copy = messages.customers
  const clients = useClientsStore((s) => s.clients)
  const addClient = useClientsStore((s) => s.addClient)
  const updateClient = useClientsStore((s) => s.updateClient)
  const removeClient = useClientsStore((s) => s.removeClient)
  const loadClients = useClientsStore((s) => s.loadClients)

  useEffect(() => {
    void loadClients().catch(() => toast.error(copy.loadError))
  }, [copy.loadError, loadClients])

  // A busca global manda o cliente escolhido em `?q=` para a tela abrir filtrada.
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [page, setPage] = useState(1)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientFormValues>(EMPTY_CLIENT_FORM)
  const [submitting, setSubmitting] = useState(false)

  const filtered = clients.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== "todos" && c.status !== statusFilter) return false
    return true
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function openAdd() {
    setForm(EMPTY_CLIENT_FORM)
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

  async function handleAdd() {
    if (submitting) return
    setSubmitting(true)
    try {
      await addClient(form)
      setAddOpen(false)
      toast.success(copy.added)
    } catch {
      toast.error(copy.addError)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!selectedClient || submitting) return
    setSubmitting(true)
    try {
      await updateClient(selectedClient.id, form)
      setEditOpen(false)
      toast.success(copy.updated)
    } catch {
      toast.error(copy.updateError)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedClient || submitting) return
    setSubmitting(true)
    try {
      await removeClient(selectedClient.id)
      setDeleteOpen(false)
      toast.success(copy.archived(selectedClient.name))
      setSelectedClient(null)
    } catch {
      toast.error(copy.archiveError)
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<Client>[] = [
    {
      key: "name",
      label: messages.name,
      className: "max-sm:min-w-44",
      render: (row) => (
        <div className="flex items-center gap-3">
          <ClientAvatar name={row.name} colorIndex={avatarColorIndex(row.id)} />
          <span className="font-medium max-sm:min-w-0 max-sm:max-w-36 max-sm:whitespace-normal max-sm:wrap-anywhere">{row.name}</span>
        </div>
      ),
    },
    { key: "email",         label: messages.email },
    { key: "phone",         label: messages.phone },
    {
      key: "status",
      label: messages.status,
      render: (row) => <StatusBadge status={row.status} />,
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
          <button
            onClick={() => openDelete(row)}
            className="rounded p-1.5 text-(--color-danger)/60 transition-colors hover:bg-(--color-danger)/10 hover:text-(--color-danger) max-sm:p-2"
            aria-label={copy.archive}
            title={copy.archive}
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

      {/* Modal: Novo Cliente */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.add}</DialogTitle>
          </DialogHeader>
          <ClientFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {messages.cancel}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!form.name.trim() || !form.phone.trim() || submitting}
              className="bg-(--color-accent) text-white"
            >
              {messages.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Cliente */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.edit}</DialogTitle>
          </DialogHeader>
          <ClientFormFields form={form} onChange={setForm} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {messages.cancel}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!form.name.trim() || !form.phone.trim() || submitting}
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
              {selectedClient && copy.archiveDescription(selectedClient.name)}
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
