#!/bin/bash
# ============================================================================
# Supabase Storage Configuration for Quality Reports
# ============================================================================
#
# This script creates and configures the Storage bucket for quality reports.
# Run this once to set up the Storage infrastructure.
#
# Prerequisites:
# - Supabase CLI installed and authenticated (supabase login)
# - You must run this from the project root
#

echo "🔧 Configurando Storage do Supabase para Relatórios de Qualidade..."

# ============================================================================
# 1. Create Storage Bucket (via SQL)
# ============================================================================
# Execute this SQL manually in Supabase Console (SQL Editor):
#
# -- Create the quality-reports bucket
# insert into storage.buckets (id, name, public)
# values ('quality-reports', 'quality-reports', true);
#
# Then set up Row Level Security (RLS) policies:

# ============================================================================
# 2. Storage RLS Policies
# ============================================================================
# Run these SQL commands in Supabase Console (SQL Editor):
#
# -- Allow authenticated users to upload reports to their org bucket
# create policy "Users can upload to their org bucket"
# on storage.objects for insert
# with check (
#   bucket_id = 'quality-reports'
#   and auth.role() = 'authenticated'
#   and (storage.foldername(name))[1] = (select organization_id from profiles where id = auth.uid())
# );
#
# -- Allow authenticated users to read reports from their org bucket
# create policy "Users can read their org reports"
# on storage.objects for select
# with check (
#   bucket_id = 'quality-reports'
#   and auth.role() = 'authenticated'
#   and (storage.foldername(name))[1] = (select organization_id from profiles where id = auth.uid())
# );
#
# -- Allow authenticated users to delete their org reports
# create policy "Users can delete their org reports"
# on storage.objects for delete
# with check (
#   bucket_id = 'quality-reports'
#   and auth.role() = 'authenticated'
#   and (storage.foldername(name))[1] = (select organization_id from profiles where id = auth.uid())
# );
#
# -- Allow public access to read PDFs (for sharing)
# create policy "Public can read reports via signed URLs"
# on storage.objects for select
# using (
#   bucket_id = 'quality-reports'
#   and status = 'public'
# );

echo "✅ Storage configuration guide created."
echo ""
echo "⚠️  Manual Steps Required:"
echo "1. Open Supabase Console: https://app.supabase.com"
echo "2. Navigate to: Project > Storage > Buckets"
echo "3. Create bucket named 'quality-reports' (public)"
echo "4. Go to SQL Editor and run the RLS policies above"
echo ""
echo "📚 After setup, use these hooks in your components:"
echo "  - useQualityReportStorage() - for PDF upload/delete"
echo "  - useQualityReports() - for CRUD operations"
echo ""
