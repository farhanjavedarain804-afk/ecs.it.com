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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          branch_id: string
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          branch_id: string
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          assigned_helper: string | null
          assigned_to: string | null
          branch_id: string
          complaint_number: string
          complaint_type: Database["public"]["Enums"]["complaint_type"]
          created_at: string
          customer_id: string
          description: string
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          photo_urls: string[] | null
          priority: Database["public"]["Enums"]["complaint_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          updated_at: string
          warranty_type: string | null
        }
        Insert: {
          assigned_helper?: string | null
          assigned_to?: string | null
          branch_id: string
          complaint_number?: string
          complaint_type?: Database["public"]["Enums"]["complaint_type"]
          created_at?: string
          customer_id: string
          description: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_urls?: string[] | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
          warranty_type?: string | null
        }
        Update: {
          assigned_helper?: string | null
          assigned_to?: string | null
          branch_id?: string
          complaint_number?: string
          complaint_type?: Database["public"]["Enums"]["complaint_type"]
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_urls?: string[] | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
          warranty_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          branch_id: string | null
          city: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          branch_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          payment_method: string | null
          reference_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id: string
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type: string
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          branch_id: string | null
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          min_stock_level: number
          name: string
          quantity: number
          sku: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock_level?: number
          name: string
          quantity?: number
          sku?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock_level?: number
          name?: string
          quantity?: number
          sku?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          advance_paid: number | null
          branch_id: string
          complaint_id: string | null
          created_at: string
          customer_id: string
          discount_amount: number
          id: string
          invoice_number: string
          issued_at: string
          notes: string | null
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          sales_tax_rate: number | null
          shipping_handling: number | null
          subtotal: number
          tax_amount: number
          technician_id: string | null
          total_amount: number
          updated_at: string
          verification_id: string
        }
        Insert: {
          advance_paid?: number | null
          branch_id: string
          complaint_id?: string | null
          created_at?: string
          customer_id: string
          discount_amount?: number
          id?: string
          invoice_number?: string
          issued_at?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          sales_tax_rate?: number | null
          shipping_handling?: number | null
          subtotal?: number
          tax_amount?: number
          technician_id?: string | null
          total_amount?: number
          updated_at?: string
          verification_id?: string
        }
        Update: {
          advance_paid?: number | null
          branch_id?: string
          complaint_id?: string | null
          created_at?: string
          customer_id?: string
          discount_amount?: number
          id?: string
          invoice_number?: string
          issued_at?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          sales_tax_rate?: number | null
          shipping_handling?: number | null
          subtotal?: number
          tax_amount?: number
          technician_id?: string | null
          total_amount?: number
          updated_at?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          product_id: string
          rate: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          product_id?: string
          rate?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string
          rate?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rate: number
          service_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rate?: number
          service_id?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          address: string | null
          branch_id: string | null
          cnic: string | null
          contact_1: string | null
          contact_2: string | null
          created_at: string
          designation: string | null
          employee_id: string
          father_name: string | null
          full_name: string
          id: string
          joining_date: string
          salary: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          cnic?: string | null
          contact_1?: string | null
          contact_2?: string | null
          created_at?: string
          designation?: string | null
          employee_id?: string
          father_name?: string | null
          full_name: string
          id?: string
          joining_date?: string
          salary?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          cnic?: string | null
          contact_1?: string | null
          contact_2?: string | null
          created_at?: string
          designation?: string | null
          employee_id?: string
          father_name?: string | null
          full_name?: string
          id?: string
          joining_date?: string
          salary?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_branch: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
      | "super_admin"
      | "branch_admin"
      | "manager"
      | "accountant"
      | "technician"
      | "store_manager"
      complaint_priority: "low" | "medium" | "high" | "emergency"
      complaint_status:
      | "registered"
      | "assigned"
      | "in_progress"
      | "completed"
      | "invoice_generated"
      | "closed"
      complaint_type: "installation" | "repair" | "maintenance"
      payment_status: "paid" | "unpaid" | "partial"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
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
      app_role: [
        "super_admin",
        "branch_admin",
        "manager",
        "accountant",
        "technician",
        "store_manager",
      ],
      complaint_priority: ["low", "medium", "high", "emergency"],
      complaint_status: [
        "registered",
        "assigned",
        "in_progress",
        "completed",
        "invoice_generated",
        "closed",
      ],
      complaint_type: ["installation", "repair", "maintenance"],
      payment_status: ["paid", "unpaid", "partial"],
    },
  },
} as const
