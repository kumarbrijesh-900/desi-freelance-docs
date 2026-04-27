/**

 * SUPABASE DATABASE TYPES

 * Source of Truth: /audits/supabase-audit.sql

 * 

 * This file provides strict TypeScript definitions for the Supabase schema.

 * Generated manually to ensure perfect synchronization with the Neon Atelier design system

 * and the Lance invoice engine.

 */



export type Json =

  | string

  | number

  | boolean

  | null

  | { [key: string]: Json | undefined }

  | Json[]



export interface Database {

  public: {

    Tables: {

      user_profiles: {

        Row: {

          id: string

          user_id: string

          agency_name: string

          address: string

          address_line1: string

          address_line2: string

          city: string

          pin_code: string

          state: string

          gstin: string

          pan: string

          logo_url: string

          signature_url: string

          qr_code_url: string

          gst_registration_status: string

          lut_availability: string

          lut_number: string

          no_lut_tax_handling: string

          bank_name: string

          account_name: string

          account_number: string

          ifsc_code: string

          bank_address: string

          swift_bic_code: string

          iban_routing_code: string

          created_at: string

          updated_at: string

        }

        Insert: Partial<Database['public']['Tables']['user_profiles']['Row']>

        Update: Partial<Database['public']['Tables']['user_profiles']['Row']>

      }

      clients: {

        Row: {

          id: string

          user_id: string

          client_name: string

          client_email: string

          client_address: string

          client_postal_code: string

          city: string

          state: string

          gstin: string

          client_location: 'domestic' | 'international'

          sez_status: 'yes' | 'no' | 'not_sure'

          client_currency: string

          msa_payment_terms_days: number

          msa_late_fee_rate: number

          msa_notes_boilerplate: string

          invoice_count: number

          last_invoiced_at: string | null

          created_at: string

          updated_at: string

        }

        Insert: Partial<Database['public']['Tables']['clients']['Row']>

        Update: Partial<Database['public']['Tables']['clients']['Row']>

      }

      client_msas: {

        Row: {

          id: string

          client_id: string

          user_id: string

          title: string

          content: string

          status: 'draft' | 'active' | 'expired'

          created_at: string

          updated_at: string

        }

        Insert: Partial<Database['public']['Tables']['client_msas']['Row']>

        Update: Partial<Database['public']['Tables']['client_msas']['Row']>

      }

      invoices: {

        Row: {

          id: string

          user_id: string

          invoice_number: string

          form_data: Json

          status: 'DRAFT' | 'SAVED' | 'SENT' | 'PARTIAL' | 'SETTLED'

          share_token: string | null

          shared_at: string | null

          shared_to_email: string | null

          template_id: string

          msa_id: string | null

          msa_response: 'PENDING' | 'ACCEPTED' | 'REVISION ASKED'
          msa_status: 'PENDING' | 'ACCEPTED' | 'REVISION ASKED'
          msa_responded_at: string | null

          client_msa_note: string | null

          is_rcm_enabled: boolean

          applied_payment_terms: number | null

          applied_late_fee_rate: number | null

          applied_license_type: string | null

          created_at: string

          updated_at: string

        }

        Insert: Partial<Database['public']['Tables']['invoices']['Row']>

        Update: Partial<Database['public']['Tables']['invoices']['Row']>

      }

      read_receipts: {

        Row: {

          id: string

          invoice_id: string

          viewed_at: string

          viewer_ua: string | null

          viewer_ip: string | null

        }

        Insert: Partial<Database['public']['Tables']['read_receipts']['Row']>

        Update: Partial<Database['public']['Tables']['read_receipts']['Row']>

      }

      faqs: {

        Row: {

          id: string

          category: string

          question: string

          answer: string

          is_published: boolean

          display_order: number | null

          created_at: string

        }

        Insert: Partial<Database['public']['Tables']['faqs']['Row']>

        Update: Partial<Database['public']['Tables']['faqs']['Row']>

      }

      user_feedback: {

        Row: {

          id: string

          user_id: string | null

          type: 'bug' | 'feature' | 'general'

          message: string

          status: 'new' | 'reviewed'

          created_at: string

        }

        Insert: Partial<Database['public']['Tables']['user_feedback']['Row']>

        Update: Partial<Database['public']['Tables']['user_feedback']['Row']>

      }

    }

  }

}