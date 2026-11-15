import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck } from 'lucide-react-native';

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBadge}>
        <Text style={styles.crossIcon}>✚</Text>
      </View>

      <Text style={styles.title}>MediRead AI</Text>
      <Text style={styles.subtitle}>Đọc đơn thuốc & Phiếu xét nghiệm cho người cao tuổi</Text>

      <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 40 }} />

      <View style={styles.footerNote}>
        <ShieldCheck size={16} color="rgba(255,255,255,0.8)" />
        <Text style={styles.footerText}>Bảo mật y tế & Khử định danh PII</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  crossIcon: {
    fontSize: 44,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.primaryLight,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
    lineHeight: 22,
  },
  footerNote: {
    position: 'absolute',
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});
