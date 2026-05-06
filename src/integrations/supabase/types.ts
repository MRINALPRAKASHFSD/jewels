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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          details: Json
          id: string
          resource: string
          resource_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          resource: string
          resource_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          resource?: string
          resource_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      collections: {
        Row: {
          banner_image_url: string | null
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          is_featured: boolean
          name: string
          slug: string
          sort_order: number
          status: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean
          name: string
          slug: string
          sort_order?: number
          status?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean
          name?: string
          slug?: string
          sort_order?: number
          status?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          product_id: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          product_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          product_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_notes: {
        Row: {
          author_email: string | null
          author_id: string
          body: string
          created_at: string
          enquiry_id: string
          id: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string
          body: string
          created_at?: string
          enquiry_id: string
          id?: string
        }
        Update: {
          author_email?: string | null
          author_id?: string
          body?: string
          created_at?: string
          enquiry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_notes_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_drafts: {
        Row: {
          content: Json
          is_active: boolean
          section_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          is_active?: boolean
          section_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          is_active?: boolean
          section_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_drafts_section_key_fkey"
            columns: ["section_key"]
            isOneToOne: true
            referencedRelation: "homepage_sections"
            referencedColumns: ["section_key"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          body: string | null
          content: Json
          cta_text: string | null
          cta_url: string | null
          heading: string | null
          id: string
          image_url: string | null
          is_active: boolean
          secondary_image_url: string | null
          section_key: string
          sort_order: number
          subheading: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          content?: Json
          cta_text?: string | null
          cta_url?: string | null
          heading?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          secondary_image_url?: string | null
          section_key: string
          sort_order?: number
          subheading?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          content?: Json
          cta_text?: string | null
          cta_url?: string | null
          heading?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          secondary_image_url?: string | null
          section_key?: string
          sort_order?: number
          subheading?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lookbook_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_featured: boolean
          sort_order: number
          status: string
          storage_path: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_featured?: boolean
          sort_order?: number
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean
          sort_order?: number
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          availability: string
          care: string | null
          category_id: string | null
          certification: string | null
          collection_id: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          is_bestseller: boolean
          is_featured: boolean
          is_limited: boolean
          is_new: boolean
          metal: string | null
          name: string
          occasions: string[]
          price: number | null
          price_on_request: boolean
          shipping: string | null
          slug: string
          status: string
          stone: string | null
          tags: string[]
          updated_at: string
          weight: string | null
        }
        Insert: {
          availability?: string
          care?: string | null
          category_id?: string | null
          certification?: string | null
          collection_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_bestseller?: boolean
          is_featured?: boolean
          is_limited?: boolean
          is_new?: boolean
          metal?: string | null
          name: string
          occasions?: string[]
          price?: number | null
          price_on_request?: boolean
          shipping?: string | null
          slug: string
          status?: string
          stone?: string | null
          tags?: string[]
          updated_at?: string
          weight?: string | null
        }
        Update: {
          availability?: string
          care?: string | null
          category_id?: string | null
          certification?: string | null
          collection_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_bestseller?: boolean
          is_featured?: boolean
          is_limited?: boolean
          is_new?: boolean
          metal?: string | null
          name?: string
          occasions?: string[]
          price?: number | null
          price_on_request?: boolean
          shipping?: string | null
          slug?: string
          status?: string
          stone?: string | null
          tags?: string[]
          updated_at?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "editor"
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
      app_role: ["admin", "editor"],
    },
  },
} as const
