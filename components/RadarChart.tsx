'use client';

import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface DataPoint {
  category: string;
  score: number;
}

interface Props {
  data: DataPoint[];
  radarColor?: string;
}

export default function RadarChart({ data, radarColor = '#3b82f6' }: Props) {
  // Guard null/undefined scores so the chart never throws
  const safeData = data.map((d) => ({ ...d, score: d.score ?? 0 }));

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={safeData} outerRadius={110}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
          />
          <Radar
            name="Practice Score"
            dataKey="score"
            stroke={radarColor}
            fill={radarColor}
            fillOpacity={0.2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              color: '#f4f4f5',
            }}
            formatter={(value) => [`${value ?? 0} / 100`, 'Practice Score']}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
