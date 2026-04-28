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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      dose_events: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          medication_id: string | null
          minutes_late: number | null
          note: string | null
          scheduled_dose_id: string | null
          source: string
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          medication_id?: string | null
          minutes_late?: number | null
          note?: string | null
          scheduled_dose_id?: string | null
          source?: string
          taken_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          medication_id?: string | null
          minutes_late?: number | null
          note?: string | null
          scheduled_dose_id?: string | null
          source?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dose_events_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dose_events_scheduled_dose_id_fkey"
            columns: ["scheduled_dose_id"]
            isOneToOne: false
            referencedRelation: "scheduled_doses"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_devices: {
        Row: {
          active: boolean
          created_at: string
          device_token: string
          id: string
          last_seen_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          device_token: string
          id?: string
          last_seen_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          device_token?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          active: boolean
          created_at: string
          dosage: string
          id: string
          instructions: string | null
          name: string
          schedule_times: string[]
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          dosage: string
          id?: string
          instructions?: string | null
          name: string
          schedule_times?: string[]
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          dosage?: string
          id?: string
          instructions?: string | null
          name?: string
          schedule_times?: string[]
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          baseline_cd4: number | null
          baseline_viral_load: number | null
          created_at: string
          date_of_birth: string | null
          diagnosis_date: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          baseline_cd4?: number | null
          baseline_viral_load?: number | null
          created_at?: string
          date_of_birth?: string | null
          diagnosis_date?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          baseline_cd4?: number | null
          baseline_viral_load?: number | null
          created_at?: string
          date_of_birth?: string | null
          diagnosis_date?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization: string | null
          phone: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          adherence_30d: number | null
          adherence_7d: number | null
          ai_guidance: string | null
          ai_summary: string | null
          created_at: string
          factors: Json
          id: string
          late_7d: number | null
          level: string
          missed_7d: number | null
          score: number
          user_id: string
        }
        Insert: {
          adherence_30d?: number | null
          adherence_7d?: number | null
          ai_guidance?: string | null
          ai_summary?: string | null
          created_at?: string
          factors?: Json
          id?: string
          late_7d?: number | null
          level: string
          missed_7d?: number | null
          score: number
          user_id: string
        }
        Update: {
          adherence_30d?: number | null
          adherence_7d?: number | null
          ai_guidance?: string | null
          ai_summary?: string | null
          created_at?: string
          factors?: Json
          id?: string
          late_7d?: number | null
          level?: string
          missed_7d?: number | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      scheduled_doses: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          scheduled_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          scheduled_at: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          scheduled_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_doses_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "provider" | "admin"
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
      app_role: ["patient", "provider", "admin"],
    },
  },
} as const
