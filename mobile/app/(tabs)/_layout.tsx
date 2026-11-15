import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Home, Scan, FileText, TrendingUp, User } from 'lucide-react-native';
import { Colors } from '../../theme/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 6,
          paddingTop: 6,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <Home size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color }) => <FileText size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Quét',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.scanButton, focused && styles.scanButtonActive]}>
              <Scan size={34} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Xu hướng',
          tabBarIcon: ({ color }) => <TrendingUp size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color }) => <User size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    top: -12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  scanButtonActive: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 1.05 }],
  },
});
