import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { AppText as Text } from '../common/AppText';
import { Colors } from '../../theme/colors';
import { usePreferences } from '../../contexts/PreferencesContext';

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
  const { fs } = usePreferences();
  const { width: screenWidth } = useWindowDimensions();

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { fontSize: fs(15) }]}>
          Chưa có đủ dữ liệu lịch sử để vẽ biểu đồ.
        </Text>
      </View>
    );
  }

  const width = Math.min(screenWidth - 64, 360);
  const height = 210;
  const paddingX = 42;
  const paddingY = 32;

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

  const valueFontSize = Math.round(fs(11));
  const dateFontSize = Math.round(fs(9));

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Safe Range Shading */}
        <Rect
          x={paddingX}
          y={refHighY}
          width={width - 2 * paddingX}
          height={Math.max(refLowY - refHighY, 4)}
          fill="rgba(220, 252, 231, 0.65)"
        />
        {/* Reference High Line */}
        <Line
          x1={paddingX}
          y1={refHighY}
          x2={width - paddingX}
          y2={refHighY}
          stroke="#15803D"
          strokeDasharray="5, 4"
          strokeWidth="1.5"
        />
        {/* Reference Low Line */}
        <Line
          x1={paddingX}
          y1={refLowY}
          x2={width - paddingX}
          y2={refLowY}
          stroke="#15803D"
          strokeDasharray="5, 4"
          strokeWidth="1.5"
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
              strokeWidth="4"
            />
          );
        })}

        {/* Data Circles & Value Labels */}
        {points.map((p, idx) => (
          <React.Fragment key={`point-${idx}`}>
            <Circle
              cx={p.x}
              cy={p.y}
              r="7"
              fill="#FFFFFF"
              stroke={Colors.primaryDark}
              strokeWidth="3.5"
            />
            <SvgText
              x={p.x}
              y={p.y - 12}
              fontSize={valueFontSize}
              fontWeight="900"
              fill={Colors.primaryDark}
              textAnchor="middle"
            >
              {p.val}
            </SvgText>
            <SvgText
              x={p.x}
              y={height - 8}
              fontSize={dateFontSize}
              fontWeight="700"
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
          <Text style={[styles.legendText, { fontSize: fs(12) }]}>
            Khoảng an toàn ({refLow} - {refHigh} {unit})
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
  },
  emptyText: {
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendBox: {
    width: 18,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  legendText: {
    color: '#15803D',
    fontWeight: '700',
  },
});

