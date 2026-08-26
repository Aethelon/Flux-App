export interface JobRole {
  id: string
  name: string
  description: string
  status: "active" | "inactive"
  systemKey: "administrator" | "operator" | null
  permissions: string[]
  employeeCount: number
  version: number
}

export interface PermissionDefinition {
  key: string
  group: string
  label: string
}

