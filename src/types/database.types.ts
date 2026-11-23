export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      business_profile: {
        Row: {
          business_name: string
          city_state: string | null
          created_at: string
          default_notes: string | null
          default_payment_terms: string | null
          default_quote_validity_days: number
          document: string | null
          email: string | null
          id: number
          owner_name: string
          phone: string | null
          pix_key: string | null
          specialties: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string
          city_state?: string | null
          created_at?: string
          default_notes?: string | null
          default_payment_terms?: string | null
          default_quote_validity_days?: number
          document?: string | null
          email?: string | null
          id?: number
          owner_name?: string
          phone?: string | null
          pix_key?: string | null
          specialties?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string
          city_state?: string | null
          created_at?: string
          default_notes?: string | null
          default_payment_terms?: string | null
          default_quote_validity_days?: number
          document?: string | null
          email?: string | null
          id?: number
          owner_name?: string
          phone?: string | null
          pix_key?: string | null
          specialties?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_name: string
          client_phone: string | null
          created_at: string
          due_day: number
          ended_at: string | null
          id: string
          is_active: boolean
          monthly_amount_cents: number
          pdf_path: string | null
          scope_description: string | null
          started_at: string
          updated_at: string
        }
        Insert: {
          client_name: string
          client_phone?: string | null
          created_at?: string
          due_day: number
          ended_at?: string | null
          id?: string
          is_active?: boolean
          monthly_amount_cents: number
          pdf_path?: string | null
          scope_description?: string | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          client_phone?: string | null
          created_at?: string
          due_day?: number
          ended_at?: string | null
          id?: string
          is_active?: boolean
          monthly_amount_cents?: number
          pdf_path?: string | null
          scope_description?: string | null
          started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount_cents: number
          billing_month: string
          category: string | null
          contract_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          quote_id: string | null
          recurring_expense_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          billing_month: string
          category?: string | null
          contract_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          quote_id?: string | null
          recurring_expense_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          billing_month?: string
          category?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          quote_id?: string | null
          recurring_expense_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          price_updated_at: string
          supplier_id: string | null
          unit: Database["public"]["Enums"]["unit_type"]
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          price_updated_at?: string
          supplier_id?: string | null
          unit?: Database["public"]["Enums"]["unit_type"]
          unit_price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          price_updated_at?: string
          supplier_id?: string | null
          unit?: Database["public"]["Enums"]["unit_type"]
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          contract_advance_days: number
          contract_due_enabled: boolean
          created_at: string
          finance_advance_days: number
          finance_due_enabled: boolean
          id: number
          push_evening_enabled: boolean
          push_morning_enabled: boolean
          quote_approved_stale_days: number
          quote_completed_unpaid_days: number
          quote_draft_stale_days: number
          quote_sent_stale_days: number
          quote_stale_enabled: boolean
          quote_unpaid_enabled: boolean
          updated_at: string
        }
        Insert: {
          contract_advance_days?: number
          contract_due_enabled?: boolean
          created_at?: string
          finance_advance_days?: number
          finance_due_enabled?: boolean
          id?: number
          push_evening_enabled?: boolean
          push_morning_enabled?: boolean
          quote_approved_stale_days?: number
          quote_completed_unpaid_days?: number
          quote_draft_stale_days?: number
          quote_sent_stale_days?: number
          quote_stale_enabled?: boolean
          quote_unpaid_enabled?: boolean
          updated_at?: string
        }
        Update: {
          contract_advance_days?: number
          contract_due_enabled?: boolean
          created_at?: string
          finance_advance_days?: number
          finance_due_enabled?: boolean
          id?: number
          push_evening_enabled?: boolean
          push_morning_enabled?: boolean
          quote_approved_stale_days?: number
          quote_completed_unpaid_days?: number
          quote_draft_stale_days?: number
          quote_sent_stale_days?: number
          quote_stale_enabled?: boolean
          quote_unpaid_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string
          amount_cents: number | null
          body: string
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          dedupe_key: string
          entity_id: string
          entity_type: string
          id: string
          last_pushed_at: string | null
          last_pushed_slot: string | null
          last_pushed_slot_date: string | null
          last_pushed_stage: string | null
          read_at: string | null
          reference_date: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["notification_severity"]
          snoozed_until: string | null
          stage: string
          stage_rank: number
          title: string
          updated_at: string
        }
        Insert: {
          action_url: string
          amount_cents?: number | null
          body: string
          category: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          dedupe_key: string
          entity_id: string
          entity_type: string
          id?: string
          last_pushed_at?: string | null
          last_pushed_slot?: string | null
          last_pushed_slot_date?: string | null
          last_pushed_stage?: string | null
          read_at?: string | null
          reference_date?: string | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["notification_severity"]
          snoozed_until?: string | null
          stage: string
          stage_rank?: number
          title: string
          updated_at?: string
        }
        Update: {
          action_url?: string
          amount_cents?: number | null
          body?: string
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          dedupe_key?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_pushed_at?: string | null
          last_pushed_slot?: string | null
          last_pushed_slot_date?: string | null
          last_pushed_stage?: string | null
          read_at?: string | null
          reference_date?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          snoozed_until?: string | null
          stage?: string
          stage_rank?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_error: string | null
          last_success_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_success_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_success_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          description_snapshot: string
          id: string
          item_type: Database["public"]["Enums"]["quote_item_type"]
          material_id: string | null
          quantity: number
          quote_id: string
          service_id: string | null
          sort_order: number
          subtotal_cents: number
          unit_price_snapshot_cents: number
          unit_snapshot: Database["public"]["Enums"]["unit_type"]
        }
        Insert: {
          created_at?: string
          description_snapshot: string
          id?: string
          item_type: Database["public"]["Enums"]["quote_item_type"]
          material_id?: string | null
          quantity: number
          quote_id: string
          service_id?: string | null
          sort_order?: number
          subtotal_cents?: number
          unit_price_snapshot_cents: number
          unit_snapshot?: Database["public"]["Enums"]["unit_type"]
        }
        Update: {
          created_at?: string
          description_snapshot?: string
          id?: string
          item_type?: Database["public"]["Enums"]["quote_item_type"]
          material_id?: string | null
          quantity?: number
          quote_id?: string
          service_id?: string | null
          sort_order?: number
          subtotal_cents?: number
          unit_price_snapshot_cents?: number
          unit_snapshot?: Database["public"]["Enums"]["unit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          adversity_fee_cents: number
          adversity_reason: string | null
          client_address: string | null
          client_name: string
          client_phone: string | null
          completed_at: string | null
          created_at: string
          discount_cents: number
          id: string
          notes: string | null
          paid_at: string | null
          payment_terms: string | null
          quote_number: number
          show_item_prices: boolean
          status: Database["public"]["Enums"]["quote_status"]
          subtotal_cents: number
          title: string | null
          total_cents: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          adversity_fee_cents?: number
          adversity_reason?: string | null
          client_address?: string | null
          client_name: string
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string
          discount_cents?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          quote_number?: number
          show_item_prices?: boolean
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal_cents?: number
          title?: string | null
          total_cents?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          adversity_fee_cents?: number
          adversity_reason?: string | null
          client_address?: string | null
          client_name?: string
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string
          discount_cents?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          quote_number?: number
          show_item_prices?: boolean
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal_cents?: number
          title?: string | null
          total_cents?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount_cents: number
          category: string
          created_at: string
          description: string
          due_day: number
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          amount_cents: number
          category?: string
          created_at?: string
          description: string
          due_day: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category?: string
          created_at?: string
          description?: string
          due_day?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price_cents: number
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          base_price_cents: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          base_price_cents?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      format_brl_cents: { Args: { p_amount_cents: number }; Returns: string }
      generate_monthly_recurring_transactions: {
        Args: { target_month?: string }
        Returns: number
      }
      sync_notifications: { Args: never; Returns: number }
    }
    Enums: {
      notification_category:
        | "finance_due"
        | "contract_due"
        | "quote_unpaid"
        | "quote_stale"
      notification_severity: "info" | "warning" | "critical"
      quote_item_type: "service" | "material"
      quote_status:
        | "draft"
        | "sent"
        | "approved"
        | "completed"
        | "paid"
        | "canceled"
      transaction_status: "pending" | "paid"
      transaction_type: "income" | "expense"
      unit_type: "unit" | "m2" | "m3" | "linear_m" | "hour" | "day"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      notification_category: [
        "finance_due",
        "contract_due",
        "quote_unpaid",
        "quote_stale",
      ],
      notification_severity: ["info", "warning", "critical"],
      quote_item_type: ["service", "material"],
      quote_status: [
        "draft",
        "sent",
        "approved",
        "completed",
        "paid",
        "canceled",
      ],
      transaction_status: ["pending", "paid"],
      transaction_type: ["income", "expense"],
      unit_type: ["unit", "m2", "m3", "linear_m", "hour", "day"],
    },
  },
} as const
