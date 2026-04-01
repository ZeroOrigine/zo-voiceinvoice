'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LiveStatsData {
  liveCount: number;
  totalCount: number;
}

export default function LiveStats() {
  const [stats, setStats] = useState<LiveStatsData>({
    liveCount: 2,
    totalCount: 5,
  });

  const fetchStats = useCallback(async () => {
    try {
      const supabase = createClient();

      // Fetch live products count from zo_products
      const { count: liveCount } = await supabase
        .from('zo_products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'live');

      // Fetch total products count
      const { count: totalCount } = await supabase
        .from('zo_products')
        .select('id', { count: 'exact', head: true });

      setStats({
        liveCount: liveCount ?? 2,
        totalCount: totalCount ?? 5,
      });
    } catch (e) {
      console.log('Stats fetch skipped:', e);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="hero-stats">
      <div className="stat">
        <div className="stat-value">8</div>
        <div className="stat-label">AI Minds</div>
      </div>
      <div className="stat">
        <div className="stat-value">{stats.liveCount}</div>
        <div className="stat-label">Products Live</div>
      </div>
      <div className="stat">
        <div className="stat-value">{stats.totalCount}</div>
        <div className="stat-label">Total Products</div>
      </div>
      <div className="stat">
        <div className="stat-value">$0</div>
        <div className="stat-label">Revenue So Far</div>
      </div>
    </div>
  );
}
