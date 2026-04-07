export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Organization type
export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
}

// Profile with role typing
export type UserRole = 'admin' | 'gestor' | 'laboratorio' | 'producao' | 'vendas' | 'visualizador'
export type ProfileStatus = 'ativo' | 'inativo'

export interface Profile {
  id: string
  user_id: string
  organization_id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  status: ProfileStatus
  created_at: string
  updated_at: string
}

// Material types
export type MaterialType = 'areia' | 'brita' | 'pó_de_pedra' | 'outro'

export interface Material {
  id: string
  organization_id: string
  name: string
  type: MaterialType
  description: string | null
  density: number | null
  created_at: string
  updated_at: string
}

export interface MaterialGradation {
  id: string
  material_id: string
  sieve_id: string
  retained_percentage: number
  cumulative_percentage: number
  created_at: string
  updated_at: string
}

// Sieves
export interface Sieve {
  id: string
  size_mm: number
  mesh_size: string
  order: number
  created_at: string
}

// Analysis types
export type AnalysisStatus = 'nao_iniciada' | 'em_progresso' | 'concluida' | 'aprovada' | 'reprovada'

export interface Analysis {
  id: string
  organization_id: string
  created_by: string
  step: 1 | 2 | 3 | 4 | 5
  status: AnalysisStatus
  analysis_name: string | null
  product_type: string | null
  reference_curve_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AnalysisMaterial {
  id: string
  analysis_id: string
  material_id: string
  percentage: number
  order: number
  created_at: string
  updated_at: string
}

export interface AnalysisMaterialGradation {
  id: string
  analysis_material_id: string
  sieve_id: string
  retained_percentage: number
  cumulative_percentage: number
  created_at: string
}

export interface AnalysisDosage {
  id: string
  analysis_id: string
  cement: number
  water: number
  sand: number
  aggregate: number
  air: number | null
  created_at: string
  updated_at: string
}

export interface AnalysisGradationResult {
  id: string
  analysis_id: string
  sieve_id: string
  combined_cumulative_percentage: number
  within_standard: boolean
  created_at: string
}

// Standard curves
export interface StandardCurve {
  id: string
  organization_id: string
  name: string
  description: string | null
  curve_data: Json
  created_at: string
  updated_at: string
}

// Production batches
export type BatchUnit = 'unidades' | 'toneladas' | 'metros_cubicos'
export type BatchStatus = 'nao_iniciada' | 'em_producao' | 'concluida' | 'aprovada' | 'com_ressalva' | 'reprovada'

export interface ProductionBatch {
  id: string
  organization_id: string
  analysis_id: string
  batch_number: string
  production_date: string
  quantity: number
  unit: BatchUnit
  status: BatchStatus
  created_at: string
  updated_at: string
}

// Rupture testing
export type RuptureStatus = 'agendada' | 'realizada' | 'atrasada'

export interface RuptureSchedule {
  id: string
  batch_id: string
  scheduled_date: string
  status: RuptureStatus
  created_at: string
  updated_at: string
}

export interface RuptureTest {
  id: string
  schedule_id: string
  test_date: string
  min_resistance: number
  max_resistance: number
  average_resistance: number
  standard_deviation: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RuptureSample {
  id: string
  test_id: string
  sample_number: number
  resistance: number
  unit: 'MPa' | 'kgf/cm²'
  created_at: string
}

// Quality reports
export type ReportStatus = 'rascunho' | 'finalizado' | 'enviado'

export interface QualityReport {
  id: string
  organization_id: string
  batch_id: string
  generated_by: string
  report_date: string
  pdf_url: string | null
  status: ReportStatus
  created_at: string
  updated_at: string
}

// Notifications
export type NotificationType = 'analysis_approved' | 'rupture_scheduled' | 'rupture_overdue' | 'batch_status'

export interface Notification {
  id: string
  organization_id: string
  recipient_id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  related_entity_id: string | null
  created_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  enable_email: boolean
  enable_in_app: boolean
  created_at: string
  updated_at: string
}

// Webhooks
export interface WebhookConfig {
  id: string
  organization_id: string
  url: string
  events: string[]
  active: boolean
  secret: string | null
  created_at: string
  updated_at: string
}

// Technical settings
export interface TechnicalSettings {
  id: string
  organization_id: string
  min_compressive_strength: number
  max_moisture_content: number
  quality_standard: string
  created_at: string
  updated_at: string
}
