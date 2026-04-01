'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TransparencyStats() {
  const [liveCount, setLiveCount] = useState(2);

  const fetchStats = useCallback(async () => {
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from('zo_products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'live');

      if (count !== null) setLiveCount(count);
    } catch (e) {
      console.log('Transparency stats fetch skipped:', e);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="metrics-grid reveal">
      <div className="metric">
        <div className="metric-value">{liveCount}</div>
        <div className="metric-label">Products Live</div>
      </div>
      <div className="metric">
        <div className="metric-value">40</div>
        <div className="metric-label">Cognitive Skills</div>
      </div>
      <div className="metric">
        <div className="metric-value">$38</div>
        <div className="metric-label">Total API Spend</div>
      </div>
      <div className="metric">
        <div className="metric-value">$0</div>
        <div className="metric-label">Revenue So Far</div>
      </div>
      <div className="metric">
        <div className="metric-value">$704</div>
        <div className="metric-label">Monthly Budget</div>
      </div>
      <div className="metric">
        <div className="metric-value">$0</div>
        <div className="metric-label">Founder Salary</div>
      </div>
    </div>
  );
}
