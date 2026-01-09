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
      admin_permissions: {
        Row: {
          can_manage_courses: boolean
          can_manage_users: boolean
          can_view_courses: boolean
          can_view_users: boolean
          created_at: string
          id: string
          is_super_admin: boolean
          organization_scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_courses?: boolean
          can_manage_users?: boolean
          can_view_courses?: boolean
          can_view_users?: boolean
          created_at?: string
          id?: string
          is_super_admin?: boolean
          organization_scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_courses?: boolean
          can_manage_users?: boolean
          can_view_courses?: boolean
          can_view_users?: boolean
          created_at?: string
          id?: string
          is_super_admin?: boolean
          organization_scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attempts: {
        Row: {
          answers: Json
          id: string
          module_id: string
          passed: boolean
          score: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          answers: Json
          id?: string
          module_id: string
          passed: boolean
          score: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          id?: string
          module_id?: string
          passed?: boolean
          score?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_id: string
          course_id: string
          course_version: string
          id: string
          issued_at: string
          pdf_url: string | null
          user_id: string
        }
        Insert: {
          certificate_id: string
          course_id: string
          course_version: string
          id?: string
          issued_at: string
          pdf_url?: string | null
          user_id: string
        }
        Update: {
          certificate_id?: string
          course_id?: string
          course_version?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
        ]
      }
      course: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          created_by: string | null
          creator_organization_id: string | null
          description: string | null
          duration_minutes: number
          id: string
          organization: string | null
          title: string
          version: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          creator_organization_id?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          organization?: string | null
          title: string
          version: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          creator_organization_id?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          organization?: string | null
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_creator_organization_id_fkey"
            columns: ["creator_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          body_html: string
          course_id: string
          created_at: string
          estimated_minutes: number
          id: string
          sequence: number
          title: string
          type: Database["public"]["Enums"]["module_type"]
        }
        Insert: {
          body_html: string
          course_id: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          sequence: number
          title: string
          type: Database["public"]["Enums"]["module_type"]
        }
        Update: {
          body_html?: string
          course_id?: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          sequence?: number
          title?: string
          type?: Database["public"]["Enums"]["module_type"]
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          domain: string | null
          id: string
          logo_url: string | null
          max_users: number | null
          name: string
          primary_color: string | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          name: string
          primary_color?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          name?: string
          primary_color?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          job_role: string | null
          last_name: string
          organization: string | null
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          first_name: string
          id: string
          job_role?: string | null
          last_name: string
          organization?: string | null
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          job_role?: string | null
          last_name?: string
          organization?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          last_viewed_at: string | null
          module_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          module_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          choices: Json
          correct_choice: string
          created_at: string
          id: string
          module_id: string
          prompt: string
          rationale: string | null
          sequence: number
        }
        Insert: {
          choices: Json
          correct_choice: string
          created_at?: string
          id?: string
          module_id: string
          prompt: string
          rationale?: string | null
          sequence?: number
        }
        Update: {
          choices?: Json
          correct_choice?: string
          created_at?: string
          id?: string
          module_id?: string
          prompt?: string
          rationale?: string | null
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      recertification_schedules: {
        Row: {
          course_id: string
          created_at: string
          custom_days: number | null
          enabled: boolean
          id: string
          organization_id: string
          schedule_type: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          custom_days?: number | null
          enabled?: boolean
          id?: string
          organization_id: string
          schedule_type: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          custom_days?: number | null
          enabled?: boolean
          id?: string
          organization_id?: string
          schedule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recertification_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recertification_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          admin_permissions: Json | null
          course_ids: string[] | null
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invited_by: string | null
          invited_role: string
          job_role: string | null
          last_name: string | null
          organization_id: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          admin_permissions?: Json | null
          course_ids?: string[] | null
          created_at?: string
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by?: string | null
          invited_role?: string
          job_role?: string | null
          last_name?: string | null
          organization_id?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          admin_permissions?: Json | null
          course_ids?: string[] | null
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by?: string | null
          invited_role?: string
          job_role?: string | null
          last_name?: string | null
          organization_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      can_manage_org_courses: {
        Args: { check_org: string; check_user_id: string }
        Returns: boolean
      }
      can_view_course: {
        Args: { course_uuid: string; user_uuid: string }
        Returns: boolean
      }
      can_view_org_users: {
        Args: { check_org: string; check_user_id: string }
        Returns: boolean
      }
      has_admin_access: { Args: { check_user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { check_user_id: string }; Returns: boolean }
      user_can_access_course: {
        Args: { course_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "learner" | "admin"
      module_type: "module" | "exam"
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
      app_role: ["learner", "admin"],
      module_type: ["module", "exam"],
    },
  },
} as const
