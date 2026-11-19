import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';
import { Volume2, VolumeX } from 'lucide-react-native';
import { speechService } from '../../services/speech';
import { usePreferences } from '../../contexts/PreferencesContext';
import { Colors } from '../../theme/colors';

interface TTSButtonProps {
  text: string;
  label?: string;
  compact?: boolean;
}

export const TTSButton: React.FC<TTSButtonProps> = ({ text, label = 'Nghe', compact = false }) => {
  const { ttsRate } = usePreferences();
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePress = async () => {
    if (isPlaying) {
      await speechService.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await speechService.speak(text, ttsRate);
      setIsPlaying(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.container, compact && styles.compact, isPlaying && styles.playing]}
    >
      {isPlaying ? (
        <VolumeX size={compact ? 15 : 17} color={isPlaying ? '#FFFFFF' : Colors.primary} style={{ flexShrink: 0 }} />
      ) : (
        <Volume2 size={compact ? 15 : 17} color={isPlaying ? '#FFFFFF' : Colors.primary} style={{ flexShrink: 0 }} />
      )}
      {!compact && (
        <Text style={[styles.text, isPlaying && styles.textPlaying]} numberOfLines={1} allowFontScaling={false}>
          {isPlaying ? 'Dừng' : label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E6F4F2',
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  compact: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  playing: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  text: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  textPlaying: {
    color: '#FFFFFF',
  },
});
