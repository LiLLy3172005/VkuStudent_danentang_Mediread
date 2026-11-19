import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { HeaderBar } from '../../components/common/HeaderBar';
import { SimpleSvgChart } from '../../components/charts/SimpleSvgChart';
import { TTSButton } from '../../components/common/TTSButton';
import { Info, Activity, Camera, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react-native';

interface IndicatorItem {
  code: string;
  name: string;
  unit: string;
  low?: number | null;
  high?: number | null;
  count?: number;
  latest_value?: number | null;
  latest_flag?: string | null;
  latest_date?: string | null;
}

export default function TrendsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [indicators, setIndicators] = useState<IndicatorItem[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [chartData, setChartData] = useState<Array<{ date: string; value: number }>>([]);
  const [latestPoint, setLatestPoint] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadUserIndicators();
  }, [user?.id]);

  useEffect(() => {
    if (selectedCode) {
      loadTrendsForIndicator(selectedCode);
    }
  }, [selectedCode]);

  const loadUserIndicators = async () => {
    setLoading(true);
    try {
      const data = await api.getLabIndicators();
      if (data && data.length > 0) {
        setIndicators(data);
        setSelectedCode(data[0].code);
      } else {
        setIndicators([]);
        setSelectedCode('');
        setChartData([]);
      }
    } catch {
      setIndicators([]);
      setSelectedCode('');
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserIndicators();
    setRefreshing(false);
  };

  const loadTrendsForIndicator = async (code: string) => {
    setLoading(true);
    try {
      const records: any[] = await api.getTrends(code);
      if (records && records.length > 0) {
        // Sort by date ascending
        const sorted = [...records].sort((a, b) =>
          String(a.measured_at || '').localeCompare(String(b.measured_at || ''))
        );

        setLatestPoint(sorted[sorted.length - 1]);

        setChartData(
          sorted.map((r: any) => {
            let dStr = 'Gần đây';
            if (r.measured_at) {
              const parts = r.measured_at.split('-');
              if (parts.length === 3) {
                dStr = `${parts[2]}/${parts[1]}`;
              } else {
                dStr = r.measured_at.slice(5);
              }
            }
            return {
              date: dStr,
              value: Number(r.value_num) || 0,
            };
          })
        );
      } else {
        setChartData([]);
        setLatestPoint(null);
      }
    } catch {
      setChartData([]);
      setLatestPoint(null);
    } finally {
      setLoading(false);
    }
  };

  const currentIndicator = indicators.find((i) => i.code === selectedCode) || indicators[0];

  const speechText = currentIndicator && chartData.length > 0
    ? `Chỉ số ${currentIndicator.name}. Kết quả gần nhất là ${latestPoint?.value_num ?? currentIndicator.latest_value ?? ''} ${currentIndicator.unit}. Bác có ${chartData.length} lần đo được ghi nhận trong hồ sơ.`
    : 'Chưa có dữ liệu xét nghiệm của bác.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="Xu Hướng Sức Khỏe" subtitle="Theo dõi biến động chỉ số xét nghiệm thực tế của bác" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {indicators.length === 0 && !loading ? (
          /* Real Empty State: User has no lab results yet */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Activity size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có kết quả xét nghiệm</Text>
            <Text style={styles.emptyDesc}>
              Hồ sơ y tế của bác chưa có chỉ số sinh hóa nào được lưu. Bác hãy chụp hoặc quét phiếu xét nghiệm tại trang "Quét" để hệ thống tự động vẽ biểu đồ theo dõi riêng cho bác nhé!
            </Text>
            <TouchableOpacity
              style={styles.scanNowBtn}
              onPress={() => router.push('/scan' as any)}
              activeOpacity={0.85}
            >
              <Camera size={20} color="#FFFFFF" />
              <Text style={styles.scanNowBtnText}>Chụp & Quét Phiếu Xét Nghiệm Ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Top Indicator Selection Scroll */}
            <View style={styles.indicatorSection}>
              <Text style={styles.sectionHeading}>Các chỉ số có trong hồ sơ của bác:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsScroll}
              >
                {indicators.map((ind) => {
                  const isSelected = selectedCode === ind.code;
                  return (
                    <TouchableOpacity
                      key={ind.code}
                      style={[styles.indicatorTab, isSelected && styles.indicatorTabActive]}
                      onPress={() => setSelectedCode(ind.code)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.indicatorTabText, isSelected && styles.indicatorTabTextActive]}
                        numberOfLines={1}
                      >
                        {ind.name}
                      </Text>
                      {ind.count ? (
                        <View style={[styles.tabCountBadge, isSelected && styles.tabCountBadgeActive]}>
                          <Text style={[styles.tabCountText, isSelected && { color: Colors.primaryDark }]}>
                            {ind.count}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Current Metric Highlight Card */}
            {currentIndicator && (
              <View style={styles.metricHighlightCard}>
                <View style={styles.metricHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.metricTitle}>{currentIndicator.name}</Text>
                    <Text style={styles.metricSub}>
                      {currentIndicator.low !== null && currentIndicator.high !== null
                        ? `Khoảng chuẩn: ${currentIndicator.low} - ${currentIndicator.high} ${currentIndicator.unit}`
                        : 'Khoảng chuẩn: Theo chỉ định của bác sĩ'}
                    </Text>
                  </View>

                  <TTSButton text={speechText} label="Nghe" compact />
                </View>

                {/* Latest Result Banner */}
                {latestPoint && (
                  <View style={styles.latestBanner}>
                    <Text style={styles.latestLabel}>KẾT QUẢ GẦN NHẤT</Text>

                    <View style={styles.latestRow}>
                      <View style={styles.latestValueWrap}>
                        <Text style={styles.latestValue}>{latestPoint.value_num}</Text>
                        <Text style={styles.latestUnit}>{currentIndicator.unit}</Text>
                      </View>

                      {/* Status Flag Badge */}
                      <View style={styles.flagContainer}>
                        {String(latestPoint.flag || '').toUpperCase() === 'H' ? (
                          <View style={[styles.flagBadge, { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }]}>
                            <Text style={[styles.flagBadgeText, { color: '#DC2626' }]}>▲ CAO (H)</Text>
                          </View>
                        ) : String(latestPoint.flag || '').toUpperCase() === 'L' ? (
                          <View style={[styles.flagBadge, { backgroundColor: '#EFF6FF', borderColor: '#1D4ED8' }]}>
                            <Text style={[styles.flagBadgeText, { color: '#1D4ED8' }]}>▼ THẤP (L)</Text>
                          </View>
                        ) : (
                          <View style={[styles.flagBadge, { backgroundColor: '#DCFCE7', borderColor: '#15803D' }]}>
                            <Text style={[styles.flagBadgeText, { color: '#15803D' }]}>✓ Bình thường</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Text style={styles.latestDate}>
                      🗓️ Ngày đo: {latestPoint.measured_at || 'Gần đây'}
                    </Text>
                  </View>
                )}

                {/* Chart Display */}
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 30 }} />
                ) : chartData.length >= 2 ? (
                  <View style={{ marginTop: 8 }}>
                    <SimpleSvgChart
                      data={chartData}
                      unit={currentIndicator.unit}
                      refLow={currentIndicator.low ?? undefined}
                      refHigh={currentIndicator.high ?? undefined}
                    />
                  </View>
                ) : chartData.length === 1 ? (
                  <View style={styles.singlePointBox}>
                    <TrendingUp size={24} color={Colors.primary} style={{ flexShrink: 0 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.singlePointTitle}>Đã ghi nhận 1 lần đo trong hồ sơ</Text>
                      <Text style={styles.singlePointDesc}>
                        Khi bác quét thêm các lần tái khám tiếp theo, hệ thống sẽ tự động nối các điểm đo thành đường biểu đồ xu hướng.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noDataBox}>
                    <Text style={styles.noDataText}>Chưa có dữ liệu đo cho chỉ số này.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Clinical Interpretation for Elderly */}
            {currentIndicator && (
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Info size={20} color={Colors.primaryDark} style={{ flexShrink: 0 }} />
                  <Text style={styles.infoTitle}>Lời khuyên y khoa cho người cao tuổi</Text>
                </View>
                {currentIndicator.low !== null && currentIndicator.high !== null ? (
                  <Text style={styles.infoText}>
                    • Vùng an toàn chuẩn y tế cho chỉ số này là từ {currentIndicator.low} đến {currentIndicator.high} {currentIndicator.unit}.
                  </Text>
                ) : null}
                <Text style={styles.infoText}>
                  • Kết quả được trích xuất hoàn toàn tự động từ phiếu xét nghiệm của bác. Bác nên mang bảng kết quả này trao đổi trực tiếp với bác sĩ điều trị trong các đợt tái khám định kỳ.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginBottom: 8,
  },
  indicatorSection: {
    gap: 6,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    paddingRight: 16,
  },
  indicatorTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    minHeight: 46,
  },
  indicatorTabActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  indicatorTabText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  indicatorTabTextActive: {
    color: '#FFFFFF',
  },
  tabCountBadge: {
    backgroundColor: '#E6F4F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tabCountBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  metricHighlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  metricTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.primaryDark,
    lineHeight: 24,
  },
  metricSub: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  latestBanner: {
    gap: 8,
    backgroundColor: '#F8FAFA',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  latestLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  latestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  latestValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexShrink: 1,
  },
  latestValue: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  latestUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  flagContainer: {
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  flagBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  flagBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  latestDate: {
    fontSize: 12.5,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  singlePointBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
  },
  singlePointTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  singlePointDesc: {
    fontSize: 13.5,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 19,
  },
  noDataBox: {
    padding: 24,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textMain,
    lineHeight: 20,
    fontWeight: '500',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  scanNowBtn: {
    backgroundColor: '#15803D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 8,
    width: '100%',
  },
  scanNowBtnText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
