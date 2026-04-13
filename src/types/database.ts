export type UserRole = 'SYSTEM_OWNER' | 'ADMIN' | 'FARM_USER'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

// Lightweight profile used throughout the app (fetched from our 'users' table)
export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  organization_id?: string
}

export interface User {
  id: string
  email: string
  password: string
  name: string
  phone?: string
  role: UserRole
  status: UserStatus
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  admin_id: string
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  plan_status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  /** Operational: ACTIVE | INACTIVE (suspended) */
  status?: 'ACTIVE' | 'INACTIVE'
  max_farms: number
  max_users: number
  created_at: string
}

export interface Farm {
  id: string
  organization_id: string
  name: string
  location?: string
  status: UserStatus
  created_at: string
}

/** Worker assignment: which farms a FARM_USER may access */
export interface FarmUserAssignment {
  id: string
  user_id: string
  farm_id: string
  created_at: string
}

export type FlockStatus = 'active' | 'sold' | 'archived'

export interface Flock {
  id: string
  farm_id: string
  batch_number: string
  breed: string
  initial_count: number
  current_count: number
  age_at_arrival: number
  arrival_date: string
  status: FlockStatus
  notes?: string
  created_at: string
  updated_at?: string
  // Joined
  farms?: { id: string; name: string; organization_id: string }
}

export interface FlockStats {
  current_count: number
  total_deaths: number
  mortality_rate: number // %
  avg_daily_production: number // eggs/day over recorded period
  age_weeks: number // current age in weeks
  recorded_days: number
}

export type DeathCause =
  | 'Disease'
  | 'Heat Stress'
  | 'Predator'
  | 'Unknown'
  | 'Other'

export interface DailyEntry {
  id: string
  flock_id: string
  date: string
  /** Total eggs; should match sum of grade columns when those are used */
  eggs_collected: number
  eggs_grade_a?: number
  eggs_grade_b?: number
  eggs_cracked?: number
  deaths: number
  death_cause?: string | null
  feed_consumed?: number | null
  notes?: string | null
  created_at: string
  // Joined
  flocks?: { id: string; batch_number: string; farm_id?: string; farms?: { id: string; name: string } }
}

/** Per-farm presets for egg sale line items (name stored on sale line_items JSON). */
export interface EggCategory {
  id: string
  farm_id: string
  name: string
  description: string | null
  default_price: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export type CustomerCategory =
  | 'Individual'
  | 'Retailer'
  | 'Wholesaler'
  | 'Restaurant'
  | 'Other'

export interface Customer {
  id: string
  farm_id: string
  name: string
  phone?: string | null
  business_name?: string | null
  address?: string | null
  category: CustomerCategory | string
  is_active: boolean
  notes?: string | null
  created_at: string
  updated_at?: string | null
}

export type SalePaymentStatus = 'unpaid' | 'partial' | 'paid'

/** One invoice line (eggs by grade). Stored in `sales.line_items` JSON. */
export interface SaleLineItem {
  type: string
  quantity: number
  unit_price: number
  total: number
}

export interface Sale {
  id: string
  farm_id: string
  customer_id?: string | null
  invoice_number: string
  sale_date: string
  due_date?: string | null
  line_items: SaleLineItem[]
  subtotal: number
  discount_type?: string | null
  discount_value: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  payment_status: SalePaymentStatus | string
  notes?: string | null
  created_at: string
  updated_at?: string | null
  /** Legacy denormalized name when no customer_id */
  customer_name?: string | null
  /** @deprecated Legacy single amount; prefer total_amount */
  amount?: number | null
  farms?: { name: string }
  customers?: { id: string; name: string; phone?: string | null; business_name?: string | null }
}

export interface Payment {
  id: string
  sale_id: string
  amount: number
  payment_date: string
  payment_method: string
  reference?: string | null
  notes?: string | null
  created_at: string
}

export interface Expense {
  id: string
  farm_id: string
  /** Primary date for the expense (falls back to legacy `date` in queries) */
  expense_date: string
  /** @deprecated Legacy column name in some DBs */
  date?: string
  amount: number
  category: string
  description?: string | null
  vendor?: string | null
  payment_method?: string | null
  reference?: string | null
  notes?: string | null
  created_at: string
}

export interface InventoryItem {
  id: string
  farm_id: string
  /** Feed, Medicine, Vaccine, Equipment, Packaging, Other */
  type: string
  name: string
  unit: string
  current_stock: number
  min_stock: number
  unit_price: number
  last_restocked_at?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string | null
}

export interface InventoryTransaction {
  id: string
  inventory_id: string
  /** 'add' | 'reduce' */
  type: string
  quantity: number
  reason?: string | null
  transaction_date: string
  created_by?: string | null
  created_at: string
}

export interface Vaccination {
  id: string
  farm_id: string
  flock_id: string
  vaccine_name: string
  scheduled_date: string
  completed_date?: string | null
  /** scheduled | completed | skipped */
  status: string
  dosage?: string | null
  method?: string | null
  administered_by?: string | null
  batch_number?: string | null
  notes?: string | null
  skipped_reason?: string | null
  inventory_id?: string | null
  quantity_used?: number | null
  created_at: string
  updated_at?: string | null
  flocks?: {
    id: string
    batch_number: string
    breed: string
    status: FlockStatus
    farm_id: string
  }
}

// Farm with computed stats from joined flocks
export interface FarmWithStats extends Farm {
  flocks_count: number
  total_birds: number
}

export interface DashboardStats {
  organization: Organization
  farms_count: number
  total_birds: number
  today_eggs: number
  monthly_revenue: number
}
