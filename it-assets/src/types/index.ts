export interface Asset {
  id: string
  name: string
  code: string
  tag?: string | null
  supplierId?: string | null
  supplier?: Supplier | null
  purchaseLink?: string | null
  unitValue: number
  quantity: number
  minStock: number
  purchaseDate?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  movements?: Movement[]
}

export interface Supplier {
  id: string
  name: string
  contact?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  createdAt: string
}

export interface Sector {
  id: string
  name: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface Movement {
  id: string
  type: 'IN' | 'OUT'
  assetId: string
  asset?: Asset
  quantity: number
  unitValue: number
  date: string
  supplierId?: string | null
  supplier?: Supplier | null
  sectorId?: string | null
  sector?: Sector | null
  userId?: string | null
  user?: User | null
  responsible?: string | null
  notes?: string | null
  createdAt: string
}

export interface DashboardStats {
  totalAssets: number
  totalItems: number
  totalValue: number
  lowStockCount: number
  recentMovements: Movement[]
  topAssets: { name: string; outCount: number }[]
  supplierDistribution: { name: string; count: number }[]
  movementChart: { date: string; in: number; out: number }[]
}
