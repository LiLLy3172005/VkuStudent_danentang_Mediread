import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { AppText as Text } from './AppText';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, X } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';

interface HeaderBarProps {
  title: string;
  showBack?: boolean;
  subtitle?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title, showBack = false, subtitle }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { fontScale, setFontScale } = usePreferences();
  const [showFontModal, setShowFontModal] = useState<boolean>(false);

  return (
    <View style={styles.header}>
      <View style={[styles.left, showBack && { paddingRight: 0 }]}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={Colors.primaryDark} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandIcon}>
            <Text style={styles.brandCross}>✚</Text>
          </View>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} allowFontScaling={false}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={2} allowFontScaling={false}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {/* Right Controls: Font scale quick switcher & Profile */}
      <View style={styles.rightControls}>
        <TouchableOpacity
          onPress={() => setShowFontModal(true)}
          style={styles.fontBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.fontBtnText} fixedSize allowFontScaling={false}>Aa</Text>
        </TouchableOpacity>

        {/* Only show profile avatar on main screens (not detail/back screens) */}
        {user && !showBack && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile' as any)}
            style={styles.profileBadge}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText} allowFontScaling={false}>
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Font Size Switcher Modal */}
      <Modal visible={showFontModal} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.fontModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFontModal(false)}
        >
          <View style={styles.fontModalBox}>
            <View style={styles.fontModalHeader}>
              <Text style={styles.fontModalTitle} fixedSize>Tùy Chỉnh Cỡ Chữ</Text>
              <TouchableOpacity onPress={() => setShowFontModal(false)} style={{ padding: 4 }}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fontModalDesc} fixedSize>
              Chọn cỡ chữ phù hợp với mắt (áp dụng tức thì toàn ứng dụng):
            </Text>

            <View style={styles.fontScaleRow}>
              {[
                { scale: 1.0, label: 'Chuẩn', sub: '100%' },
                { scale: 1.30, label: 'Lớn', sub: '130%' },
                { scale: 1.45, label: 'Rất lớn', sub: '145%' },
              ].map((item) => {
                const isActive =
                  item.scale === 1.0
                    ? fontScale <= 1.05
                    : item.scale === 1.30
                    ? fontScale > 1.05 && fontScale <= 1.35
                    : fontScale > 1.35;
                return (
                  <TouchableOpacity
                    key={item.scale}
                    style={[styles.fontScaleBtn, isActive && styles.fontScaleBtnActive]}
                    onPress={() => {
                      setFontScale(item.scale);
                      setShowFontModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.fontScaleLabel, isActive && styles.fontScaleLabelActive]} fixedSize>
                      {item.label}
                    </Text>
                    <Text style={[styles.fontScaleSub, isActive && styles.fontScaleSubActive]} fixedSize>
                      {item.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  titleContainer: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandCross: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  profileBadge: {
    padding: 2,
    flexShrink: 0,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  fontBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E6F4F2',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  fontBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  fontModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 63, 70, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fontModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  fontModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fontModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  fontModalDesc: {
    fontSize: 13.5,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  fontScaleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  fontScaleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFA',
    gap: 2,
  },
  fontScaleBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#15803D',
  },
  fontScaleLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
  },
  fontScaleLabelActive: {
    color: '#15803D',
  },
  fontScaleSub: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  fontScaleSubActive: {
    color: '#15803D',
  },
});
