"use client"

import { create } from "zustand"
import { api, idempotencyHeaders } from "@/lib/api"
import type { JobRole, PermissionDefinition } from "@/types/job-role"

interface JobRolesStore {
  roles: JobRole[]
  permissions: PermissionDefinition[]
  load: () => Promise<void>
  createRole: (input: { name: string; description: string; permissions: string[] }) => Promise<void>
  updateRole: (role: JobRole, input: { name: string; description: string; status: "active" | "inactive"; permissions: string[] }) => Promise<void>
  removeRole: (role: JobRole) => Promise<void>
}

export const useJobRolesStore = create<JobRolesStore>()((set) => ({
  roles: [],
  permissions: [],
  load: async () => {
    const [roles, permissions] = await Promise.all([
      api.get("job-roles").json<JobRole[]>(),
      api.get("job-role-permissions").json<PermissionDefinition[]>(),
    ])
    set({ roles, permissions })
  },
  createRole: async (input) => {
    const role = await api.post("job-roles", { headers: idempotencyHeaders(), json: input }).json<JobRole>()
    set((state) => ({ roles: [...state.roles, role] }))
  },
  updateRole: async (current, input) => {
    const role = await api.patch(`job-roles/${current.id}`, { headers: idempotencyHeaders(), json: { version: current.version, ...input } }).json<JobRole>()
    set((state) => ({ roles: state.roles.map((item) => item.id === role.id ? role : item) }))
  },
  removeRole: async (role) => {
    await api.delete(`job-roles/${role.id}`, { headers: idempotencyHeaders(), searchParams: { version: role.version } })
    set((state) => ({ roles: state.roles.filter((item) => item.id !== role.id) }))
  },
}))
