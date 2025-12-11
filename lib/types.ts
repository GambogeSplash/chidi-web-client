export interface Product {
  id: number
  name: string
  price: string
  stock: number
  status: "low" | "good" | "out"
  category: string
  image?: string
  description?: string
  variants?: ProductVariant[]
  createdAt?: Date
  updatedAt?: Date
}

export interface ProductVariant {
  id: string
  name: string // e.g., "Size", "Color"
  options: string[] // e.g., ["S", "M", "L"]
  stock: { [key: string]: number }
}


export interface BusinessConfig {
  id: string
  name: string
  phone: string
  email?: string
  website?: string
  logo?: string
  hours?: {
    monday: { open: string; close: string; closed: boolean }
    tuesday: { open: string; close: string; closed: boolean }
    wednesday: { open: string; close: string; closed: boolean }
    thursday: { open: string; close: string; closed: boolean }
    friday: { open: string; close: string; closed: boolean }
    saturday: { open: string; close: string; closed: boolean }
    sunday: { open: string; close: string; closed: boolean }
  }
  deliveryPolicy?: string
  returnPolicy?: string
  tone?: "professional" | "casual" | "nigerian-gen-z"
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: "owner" | "manager" | "agent"
  permissions?: string[]
  status: "active" | "inactive"
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
  encryptionEnabled: boolean
  dataBackupEnabled: boolean
  lastBackupDate?: Date
}
