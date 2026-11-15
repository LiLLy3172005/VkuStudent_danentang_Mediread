import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../theme/colors';

interface DataPoint {
  date: string;
  value: number;
}

interface SimpleSvgChartProps {
  data: DataPoint[];
  unit?: string;
  refLow?: number;
  refHigh?: number;
}

export const SimpleSvgChart: React.FC<SimpleSvgChartProps> = ({
  data,
  unit = 'mmol/L',
  refLow = 3.9,
  refHigh = 6.4,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Chưa có đủ dữ liệu lịch sử để vẽ biểu đồ.</Text>
      </View>
    );
  }

  const width = 320;
  const height = 180;
  const paddingX = 35;
  const paddingY = 25;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, refLow) * 0.85;
  const maxVal = Math.max(...values, refHigh) * 1.15;

  const getY = (val: number) => {
    return height - paddingY - ((val - minVal) / (maxVal - minVal || 1)) * (height - 2 * paddingY);
  };

  const getX = (idx: number) => {
    if (data.length === 1) return width / 2;
    return paddingX + (idx / (data.length - 1)) * (width - 2 * paddingX);
  };

  const points = data.map((d, idx) => ({
    x: getX(idx),
    y: getY(d.value),
    val: d.value,
    date: d.date,
  }));

  const refLowY = getY(refLow);
  const refHighY = getY(refHigh);

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Safe Range Shading */}
        <Rect
          x={paddingX}
          y={refHighY}
          width={width - 2 * paddingX}
          height={Math.max(refLowY - refHighY, 2)}
          fill="rgba(220, 252, 231, 0.5)"
        />
        {/* Reference High Line */}
        <Line
          x1={paddingX}
          y1={refHighY}
          x2={width - paddingX}
          y2={refHighY}
          stroke="#15803D"
          strokeDasharray="4, 4"
          strokeWidth="1"
        />
        {/* Reference Low Line */}
        <Line
          x1={paddingX}
          y1={refLowY}
          x2={width - paddingX}
          y2={refLowY}
          stroke="#15803D"
          strokeDasharray="4, 4"
          strokeWidth="1"
        />

        {/* Connecting Lines */}
        {points.map((p, idx) => {
          if (idx === 0) return null;
          const prev = points[idx - 1];
          return (
            <Line
              key={`line-${idx}`}
              x1={prev.x}
              y1={prev.y}
              x2={p.x}
              y2={p.y}
              stroke={Colors.primary}
              strokeWidth="3"
            />
          );
        })}

        {/* Data Circles & Value Labels */}
        {points.map((p, idx) => (
          <React.Fragment key={`point-${idx}`}>
            <Circle cx={p.x} cy={p.y} r="5" fill="#FFFFFF" stroke={Colors.primaryDark} strokeWidth="3" />
            <SvgText
              x={p.x}
              y={p.y - 10}
              fontSize="11"
              fontWeight="bold"
              fill={Colors.primaryDark}
              textAnchor="middle"
            >
              {p.val}
            </SvgText>
            <SvgText
              x={p.x}
              y={height - 6}
              fontSize="9"
              fill={Colors.textMuted}
              textAnchor="middle"
            >
              {p.date}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#DCFCE7', borderColor: '#15803D' }]} />
          <Text style={styles.legendText}>Khoảng chuẩn ({refLow} - {refHigh} {unit})</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 14,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
