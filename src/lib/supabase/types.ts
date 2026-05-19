// src/lib/supabase/types.ts
// Tipos TypeScript gerados do schema do banco IODO RESET
// Para regenerar automaticamente: npx supabase gen types typescript --project-id SEU_PROJECT_ID
// Docs: https://supabase.com/docs/guides/api/rest/generating-types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PlanType = 'free' | 'pro' | 'clinic'
export type ProtocolPhase = '0' | '1' | '2' | '3' | '4'
export type SemaphoreColor = 'green' | 'yellow' | 'red'
export type AlertLevel = 'ok' | 'attention' | 'urgent'
export type ProtocolRiskLevel = 'standard' | 'caution' | 'professional_only'
export type ProgressionStrategy = 'cofactors_first' | 'slow' | 'standard' | 'supervised'
export type SexType = 'female' | 'male' | 'other'
export type SymptomType =
  | 'headache'
  | 'acne'
  | 'extra_fatigue'
  | 'hair_loss'
  | 'weight_gain'
  | 'brain_fog'
  | 'constipation'
  | 'dry_skin'
  | 'cold_intolerance'
  | 'breast_pain'
  | 'rhinitis'
  | 'urinary_infection'
  | 'bad_breath'
  | 'menstrual_worsening'
  | 'anxiety'
  | 'palpitations'
  | 'none'
  | 'other'
export type ExamType =
  | 'tsh'
  | 't3_free'
  | 't4_free'
  | 'anti_tpo'
  | 'anti_tg'
  | 'ferritin'
  | 'selenium'
  | 'magnesium'
  | 'vitamin_d'
  | 'zinc'
  | 'vitamin_b12'
  | 'crp'
  | 'homocysteine'
  | 'fasting_glucose'
  | 'insulin'
  | 'lipid_panel'
  | 'cbc'
  | 'other'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          plan: PlanType
          plan_started_at: string | null
          plan_expires_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          is_professional: boolean
          onboarding_done: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          plan?: PlanType
          plan_started_at?: string | null
          plan_expires_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          is_professional?: boolean
          onboarding_done?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          birth_year: number | null
          sex: SexType | null
          weight_kg: number | null
          conditions: string[]
          medications: string[]
          current_symptoms: SymptomType[]
          main_goal: string | null
          prior_iodine_exp: boolean
          cofactors_in_use: string[]
          safety_flags: string[]
          halogen_exposure: string[]
          has_professional_followup: boolean
          protocol_risk_level: ProtocolRiskLevel
          progression_strategy: ProgressionStrategy
          protocol_alerts: string[]
          exam_schedule: Json
          phase: ProtocolPhase
          protocol_start_date: string | null
          recommended_dose_drops: number
          pro_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          birth_year?: number | null
          sex?: SexType | null
          weight_kg?: number | null
          conditions?: string[]
          medications?: string[]
          current_symptoms?: SymptomType[]
          main_goal?: string | null
          prior_iodine_exp?: boolean
          cofactors_in_use?: string[]
          safety_flags?: string[]
          halogen_exposure?: string[]
          has_professional_followup?: boolean
          protocol_risk_level?: ProtocolRiskLevel
          progression_strategy?: ProgressionStrategy
          protocol_alerts?: string[]
          exam_schedule?: Json
          phase?: ProtocolPhase
          protocol_start_date?: string | null
          recommended_dose_drops?: number
          pro_notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      daily_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          dose_drops: number
          dose_mg: number
          energy: number | null
          mood: number | null
          sleep_quality: number | null
          symptoms: SymptomType[]
          took_iodine: boolean
          took_selenium: boolean
          took_magnesium: boolean
          took_vitamins: boolean
          took_vitamin_c: boolean
          drank_water: boolean
          used_salt: boolean
          semaphore: SemaphoreColor
          notes: string | null
          is_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date?: string
          dose_drops: number
          dose_mg?: number
          energy?: number | null
          mood?: number | null
          sleep_quality?: number | null
          symptoms?: SymptomType[]
          took_iodine?: boolean
          took_selenium?: boolean
          took_magnesium?: boolean
          took_vitamins?: boolean
          took_vitamin_c?: boolean
          drank_water?: boolean
          used_salt?: boolean
          semaphore?: SemaphoreColor
          notes?: string | null
          is_edited?: boolean
        }
        Update: Partial<Database['public']['Tables']['daily_logs']['Insert']>
        Relationships: []
      }
      ai_analyses: {
        Row: {
          id: string
          log_id: string
          user_id: string
          input_hash: string
          context_days: number
          analysis_text: string
          semaphore_suggested: SemaphoreColor | null
          dose_suggestion: number | null
          model_used: string
          input_tokens: number | null
          output_tokens: number | null
          cost_usd: number | null
          from_cache: boolean
          created_at: string
        }
        Insert: {
          id?: string
          log_id: string
          user_id: string
          input_hash: string
          context_days?: number
          analysis_text: string
          semaphore_suggested?: SemaphoreColor | null
          dose_suggestion?: number | null
          model_used?: string
          input_tokens?: number | null
          output_tokens?: number | null
          cost_usd?: number | null
          from_cache?: boolean
        }
        Update: Partial<Database['public']['Tables']['ai_analyses']['Insert']>
        Relationships: []
      }
      exams: {
        Row: {
          id: string
          user_id: string
          exam_type: ExamType
          exam_label: string | null
          result_value: number | null
          result_unit: string | null
          reference_min: number | null
          reference_max: number | null
          is_within_range: boolean | null
          exam_date: string
          lab_name: string | null
          file_url: string | null
          file_path: string | null
          ai_interpretation: string | null
          ai_interpreted_at: string | null
          ai_model_used: string | null
          pro_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_type: ExamType
          exam_label?: string | null
          result_value?: number | null
          result_unit?: string | null
          reference_min?: number | null
          reference_max?: number | null
          is_within_range?: boolean | null
          exam_date: string
          lab_name?: string | null
          file_url?: string | null
          file_path?: string | null
          ai_interpretation?: string | null
          pro_notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['exams']['Insert']>
        Relationships: []
      }
      professionals: {
        Row: {
          id: string
          user_id: string
          display_name: string
          credential: string | null
          specialty: string | null
          bio: string | null
          patient_limit: number
          alert_on_red: boolean
          alert_on_yellow: boolean
          alert_email: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name: string
          credential?: string | null
          specialty?: string | null
          bio?: string | null
          patient_limit?: number
          alert_on_red?: boolean
          alert_on_yellow?: boolean
          alert_email?: string | null
          is_verified?: boolean
        }
        Update: Partial<Database['public']['Tables']['professionals']['Insert']>
        Relationships: []
      }
      pro_patients: {
        Row: {
          id: string
          professional_id: string
          patient_id: string
          status: 'pending' | 'active' | 'paused' | 'ended'
          pro_notes: string | null
          custom_dose_suggestion: number | null
          alert_level: AlertLevel
          invite_sent_at: string | null
          invite_accepted_at: string | null
          linked_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          patient_id: string
          status?: 'pending' | 'active' | 'paused' | 'ended'
          pro_notes?: string | null
          custom_dose_suggestion?: number | null
          alert_level?: AlertLevel
          invite_sent_at?: string | null
          invite_accepted_at?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['pro_patients']['Insert']>
        Relationships: []
      }
      pro_invites: {
        Row: {
          id: string
          professional_id: string
          patient_email: string
          patient_id: string | null
          status: 'pending' | 'active' | 'cancelled' | 'expired'
          pro_notes: string | null
          invite_sent_at: string | null
          invite_accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          patient_email: string
          patient_id?: string | null
          status?: 'pending' | 'active' | 'cancelled' | 'expired'
          pro_notes?: string | null
          invite_sent_at?: string | null
          invite_accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['pro_invites']['Insert']>
        Relationships: []
      }
      pro_guidance_history: {
        Row: {
          id: string
          professional_id: string
          patient_id: string
          pro_patient_id: string | null
          message: string
          custom_dose_suggestion: number | null
          status: 'sent' | 'read' | 'question' | 'responded'
          patient_feedback: string | null
          sent_at: string
          acknowledged_at: string | null
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          patient_id: string
          pro_patient_id?: string | null
          message: string
          custom_dose_suggestion?: number | null
          status?: 'sent' | 'read' | 'question' | 'responded'
          patient_feedback?: string | null
          sent_at?: string
          acknowledged_at?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['pro_guidance_history']['Insert']>
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          id: string
          actor_user_id: string | null
          actor_email: string
          action: string
          target_user_id: string | null
          target_email: string | null
          summary: string | null
          before_state: Json | null
          after_state: Json | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          actor_email: string
          action: string
          target_user_id?: string | null
          target_email?: string | null
          summary?: string | null
          before_state?: Json | null
          after_state?: Json | null
          metadata?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_audit_logs']['Insert']>
        Relationships: []
      }
      operational_events: {
        Row: {
          id: string
          severity: 'info' | 'warning' | 'critical'
          area: string
          event_type: string
          message: string
          user_id: string | null
          user_email: string | null
          metadata: Json
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          severity: 'info' | 'warning' | 'critical'
          area: string
          event_type: string
          message: string
          user_id?: string | null
          user_email?: string | null
          metadata?: Json
          resolved_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['operational_events']['Insert']>
        Relationships: []
      }
    }
    Views: {
      v_pro_dashboard: {
        Row: {
          professional_id: string
          patient_id: string
          status: string
          alert_level: AlertLevel
          pro_notes: string | null
          patient_name: string | null
          patient_email: string
          protocol_phase: ProtocolPhase | null
          protocol_start_date: string | null
          recommended_dose_drops: number | null
          protocol_day: number | null
          last_log_date: string | null
          last_semaphore: SemaphoreColor | null
          last_energy: number | null
          last_mood: number | null
          last_dose_drops: number | null
        }
        Relationships: []
      }
      v_user_weekly: {
        Row: {
          user_id: string
          week_start: string
          avg_energy: number | null
          avg_mood: number | null
          avg_sleep: number | null
          avg_dose: number | null
          days_logged: number
          green_days: number
          yellow_days: number
          red_days: number
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_semaphore: {
        Args: {
          p_dose_drops: number
          p_energy: number
          p_mood: number
          p_symptoms: SymptomType[]
          p_checklist_pct: number
        }
        Returns: SemaphoreColor
      }
      get_ai_context: {
        Args: {
          p_user_id: string
          p_log_id: string
          p_days_back?: number
        }
        Returns: Json
      }
    }
  }
}
