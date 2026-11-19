import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import { Colors } from '../../theme/colors';

interface StatusBadgeProps {
  flag?: string | null;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ flag, label }) => {
  const flagUpper = String(flag || '').toUpperCase();
  const isHigh = flagUpper === 'H' || flagUpper === 'HIGH';
  const isLow = flagUpper === 'L' || flagUpper === 'LOW';
  const isNormal = flagUpper === 'N' || flagUpper === 'NORMAL';

  if (isHigh) {
    return (
      <View style={[styles.badge, styles.badgeHigh]}>
        <Text style={[styles.text, styles.textHigh]} numberOfLines={1} allowFontScaling={false}>
          ▲ {label || 'CAO (H)'}
        </Text>
      </View>
    );
  }

  if (isLow) {
    return (
      <View style={[styles.badge, styles.badgeLow]}>
        <Text style={[styles.text, styles.textLow]} numberOfLines={1} allowFontScaling={false}>
          ▼ {label || 'THẤP (L)'}
        </Text>
      </View>
    );
  }

  if (isNormal) {
    return (
      <View style={[styles.badge, styles.badgeNormal]}>
        <Text style={[styles.text, styles.textNormal]} numberOfLines={1} allowFontScaling={false}>
          ✓ {label || 'Bình thường'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.badgeUnknown]}>
      <Text style={[styles.text, styles.textUnknown]} numberOfLines={1} allowFontScaling={false}>
        {label || 'Chưa rõ'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    flexShrink: 0,
  },
  badgeHigh: {
    backgroundColor: Colors.highBg,
    borderColor: Colors.highBorder,
  },
  badgeLow: {
    backgroundColor: Colors.lowBg,
    borderColor: Colors.lowBorder,
  },
  badgeNormal: {
    backgroundColor: Colors.normalBg,
    borderColor: Colors.normalBorder,
  },
  badgeUnknown: {
    backgroundColor: Colors.unknownBg,
    borderColor: '#E5E7EB',
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
  },
  textHigh: {
    color: Colors.highText,
  },
  textLow: {
    color: Colors.lowText,
  },
  textNormal: {
    color: Colors.normalText,
  },
  textUnknown: {
    color: Colors.unknownText,
  },
});
