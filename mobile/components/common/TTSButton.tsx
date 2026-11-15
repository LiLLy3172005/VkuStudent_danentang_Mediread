import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
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
        <VolumeX size={compact ? 16 : 18} color={isPlaying ? '#FFFFFF' : Colors.primary} />
      ) : (
        <Volume2 size={compact ? 16 : 18} color={isPlaying ? '#FFFFFF' : Colors.primary} />
      )}
      {!compact && (
        <Text style={[styles.text, isPlaying && styles.textPlaying]}>
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
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E6F4F2',
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontSize: 14,
    fontWeight: '700',
  },
  textPlaying: {
    color: '#FFFFFF',
  },
});
