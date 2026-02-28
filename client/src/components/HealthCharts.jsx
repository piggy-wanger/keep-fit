import { useMemo } from 'react';
import { Card, Row, Col, Typography } from 'antd';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area,
} from 'recharts';

const { Title } = Typography;

function HealthCharts({ records, threshold }) {
  // 准备体重折线图数据
  const weightData = useMemo(() => {
    return records
      .filter(r => r.weight != null)
      .map(r => ({
        date: r.record_date,
        weight: r.weight,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [records]);

  // 准备血压折线图数据
  const bpData = useMemo(() => {
    return records
      .filter(r => r.systolic != null || r.diastolic != null)
      .map(r => ({
        date: r.record_date,
        systolic: r.systolic,
        diastolic: r.diastolic,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [records]);

  // 准备步数面积图数据
  const stepsData = useMemo(() => {
    return records
      .filter(r => r.steps != null)
      .map(r => ({
        date: r.record_date,
        steps: r.steps,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [records]);

  // 准备雷达图数据 - 综合健康评分
  const radarData = useMemo(() => {
    const weights = records.filter(r => r.weight != null).map(r => r.weight);
    const systolics = records.filter(r => r.systolic != null).map(r => r.systolic);
    const diastolics = records.filter(r => r.diastolic != null).map(r => r.diastolic);
    const stepsList = records.filter(r => r.steps != null).map(r => r.steps);

    // 计算各项得分 (0-100)
    let weightScore = 50;
    let bpScore = 50;
    let stepsScore = 50;
    let consistencyScore = 50;

    // 体重评分 (在范围内得高分)
    if (weights.length > 0 && threshold.weight_min && threshold.weight_max) {
      const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
      const mid = (threshold.weight_min + threshold.weight_max) / 2;
      const range = threshold.weight_max - threshold.weight_min;
      const deviation = Math.abs(avgWeight - mid);
      weightScore = Math.max(0, Math.min(100, 100 - (deviation / range) * 100));
    }

    // 血压评分
    if (systolics.length > 0 && threshold.systolic_min && threshold.systolic_max) {
      const avgSystolic = systolics.reduce((a, b) => a + b, 0) / systolics.length;
      const avgDiastolic = diastolics.length > 0
        ? diastolics.reduce((a, b) => a + b, 0) / diastolics.length
        : avgSystolic * 0.6;

      const systolicInRange = avgSystolic >= threshold.systolic_min && avgSystolic <= threshold.systolic_max;
      const diastolicInRange = avgDiastolic >= (threshold.diastolic_min || 60) && avgDiastolic <= (threshold.diastolic_max || 90);

      if (systolicInRange && diastolicInRange) {
        bpScore = 100;
      } else if (systolicInRange || diastolicInRange) {
        bpScore = 70;
      } else {
        bpScore = 40;
      }
    }

    // 步数评分
    if (stepsList.length > 0 && threshold.steps_goal) {
      const avgSteps = stepsList.reduce((a, b) => a + b, 0) / stepsList.length;
      stepsScore = Math.min(100, Math.round((avgSteps / threshold.steps_goal) * 100));
    }

    // 记录一致性评分 (记录频率)
    if (records.length > 0) {
      const dates = [...new Set(records.map(r => r.record_date))];
      consistencyScore = Math.min(100, dates.length * 15); // 每天记录得15分，最多100
    }

    return [
      { metric: '体重', score: weightScore, fullMark: 100 },
      { metric: '血压', score: bpScore, fullMark: 100 },
      { metric: '步数', score: stepsScore, fullMark: 100 },
      { metric: '记录', score: consistencyScore, fullMark: 100 },
    ];
  }, [records, threshold]);

  // 准备热力图数据 - 最近30天活动
  const heatmapData = useMemo(() => {
    const data = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayRecords = records.filter(r => r.record_date === dateStr);
      const hasRecord = dayRecords.length > 0;
      const steps = dayRecords.reduce((sum, r) => sum + (r.steps || 0), 0);

      data.push({
        date: dateStr,
        day: date.getDate(),
        weekday: date.getDay(),
        count: hasRecord ? 1 : 0,
        level: steps > 10000 ? 4 : steps > 7000 ? 3 : steps > 3000 ? 2 : hasRecord ? 1 : 0,
      });
    }

    return data;
  }, [records]);

  // 颜色配置
  const colors = {
    weight: '#8884d8',
    systolic: '#ff7875',
    diastolic: '#ffa940',
    steps: '#52c41a',
  };

  const heatmapColors = ['#f0f0f0', '#d9f7be', '#95de64', '#52c41a', '#237804'];

  return (
    <div className="space-y-6">
      {/* 体重趋势图 */}
      {weightData.length > 0 && (
        <Card title="体重趋势">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip />
              <Legend />
              {threshold.weight_min && (
                <Line
                  type="monotone"
                  dataKey={() => threshold.weight_min}
                  stroke="#ccc"
                  strokeDasharray="5 5"
                  name="最小目标"
                  dot={false}
                />
              )}
              {threshold.weight_max && (
                <Line
                  type="monotone"
                  dataKey={() => threshold.weight_max}
                  stroke="#ccc"
                  strokeDasharray="5 5"
                  name="最大目标"
                  dot={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke={colors.weight}
                strokeWidth={2}
                name="体重"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 血压趋势图 */}
      {bpData.length > 0 && (
        <Card title="血压趋势">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={bpData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[40, 200]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="systolic"
                stroke={colors.systolic}
                strokeWidth={2}
                name="收缩压"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                stroke={colors.diastolic}
                strokeWidth={2}
                name="舒张压"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 步数趋势图 */}
      {stepsData.length > 0 && (
        <Card title="步数趋势">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stepsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
              {threshold.steps_goal && (
                <Line
                  type="monotone"
                  dataKey={() => threshold.steps_goal}
                  stroke="#ccc"
                  strokeDasharray="5 5"
                  name="目标"
                  dot={false}
                />
              )}
              <Area
                type="monotone"
                dataKey="steps"
                stroke={colors.steps}
                fill={colors.steps}
                fillOpacity={0.3}
                name="步数"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 综合健康评分雷达图 */}
      <Card title="综合健康评分">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="得分"
              dataKey="score"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* 活动热力图 */}
      <Card title="近30天活动热力图">
        <div className="flex flex-wrap gap-1">
          {heatmapData.map((day, index) => (
            <div
              key={index}
              className="w-4 h-4 rounded-sm cursor-pointer transition-transform hover:scale-125"
              style={{
                backgroundColor: heatmapColors[day.level],
              }}
              title={`${day.date}: ${day.level > 0 ? '有记录' : '无记录'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
          <span>少</span>
          {heatmapColors.map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          <span>多</span>
        </div>
      </Card>
    </div>
  );
}

export default HealthCharts;
