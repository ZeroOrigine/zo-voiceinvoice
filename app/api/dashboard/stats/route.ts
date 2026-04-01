import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// ============================================================
// DASHBOARD STATS — Aggregated metrics for the user's dashboard
// GET /api/dashboard/stats
// Returns: total invoices, total revenue, outstanding amount, overdue count
// ============================================================

// --- Types ---

interface DashboardStats {
  total_invoices: number
  total_revenue: number
  outstanding_amount: number
  overdue_count: number
}

interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

// --- Supabase Client Helper ---

async function getAuthenticatedClient() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignored in Server Component context
          }
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    return { supabase: null, userId: null }
  }

  return { supabase, userId: session.user.id }
}

// --- GET: Fetch dashboard stats ---

export async function GET(): Promise<NextResponse<ApiResponse<DashboardStats>>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to view your dashboard.', status: 401 },
        { status: 401 }
      )
    }

    // Use the database function for efficient aggregation
    const { data: stats, error } = await supabase
      .rpc('get_dashboard_stats', { p_user_id: userId })
      .single()

    if (error) {
      console.error('[dashboard/stats/GET] RPC failed:', error.message)

      // Fallback: compute stats from individual queries
      const { data: invoices, error: fallbackError } = await supabase
        .from('invoices')
        .select('status, total')
        .eq('user_id', userId)

      if (fallbackError || !invoices) {
        return NextResponse.json(
          { data: null, error: 'We couldn\'t load your dashboard stats. Please try again.', status: 500 },
          { status: 500 }
        )
      }

      const fallbackStats: DashboardStats = {
        total_invoices: invoices.length,
        total_revenue: invoices
          .filter((invoice) => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + Number(invoice.total), 0),
        outstanding_amount: invoices
          .filter((invoice) => ['sent', 'viewed', 'overdue'].includes(invoice.status))
          .reduce((sum, invoice) => sum + Number(invoice.total), 0),
        overdue_count: invoices.filter((invoice) => invoice.status === 'overdue').length,
      }

      return NextResponse.json(
        { data: fallbackStats, error: null, status: 200 },
        { status: 200 }
      )
    }

    const dashboardStats: DashboardStats = {
      total_invoices: Number(stats.total_invoices) || 0,
      total_revenue: Number(stats.total_revenue) || 0,
      outstanding_amount: Number(stats.outstanding_amount) || 0,
      overdue_count: Number(stats.overdue_count) || 0,
    }

    return NextResponse.json(
      { data: dashboardStats, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[dashboard/stats/GET] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}
