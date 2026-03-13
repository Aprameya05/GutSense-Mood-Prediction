import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { 
  Activity, 
  Camera, 
  Moon, 
  Clock, 
  LineChart, 
  MenuSquare,
  AlertTriangle,
  User
} from 'lucide-react-native';

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#0f172a', borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1 },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          drawerStyle: { backgroundColor: '#020617', width: 280 },
          drawerActiveBackgroundColor: 'rgba(56,189,248,0.15)',
          drawerActiveTintColor: '#38bdf8',
          drawerInactiveTintColor: '#94a3b8',
          drawerLabelStyle: { fontSize: 16, fontWeight: '600' },
        }}>
        
        <Drawer.Screen
          name="index"
          options={{
            title: 'Dashboard (home)',
            drawerIcon: ({ color, size }) => <Activity size={size} color={color} />,
          }}
        />
        
        <Drawer.Screen
          name="food-logs"
          options={{
            title: 'Log Meal',
            drawerIcon: ({ color, size }) => <Camera size={size} color={color} />,
          }}
        />

        <Drawer.Screen
          name="log-sleep"
          options={{
            title: 'Log Sleep',
            drawerIcon: ({ color, size }) => <Moon size={size} color={color} />,
          }}
        />

        <Drawer.Screen
          name="history"
          options={{
            title: 'History',
            drawerIcon: ({ color, size }) => <Clock size={size} color={color} />,
          }}
        />

        <Drawer.Screen
          name="trends"
          options={{
            title: 'My Trends',
            drawerIcon: ({ color, size }) => <LineChart size={size} color={color} />,
          }}
        />

        <Drawer.Screen
          name="baselines"
          options={{
            title: 'My Baselines',
            drawerIcon: ({ color, size }) => <MenuSquare size={size} color={color} />,
          }}
        />

        <Drawer.Screen
          name="risk-monitor"
          options={{
            title: 'Risk Monitor',
            drawerIcon: ({ color, size }) => <AlertTriangle size={size} color={color} />,
          }}
        />

        <Drawer.Screen
          name="profile"
          options={{
            title: 'My Profile',
            drawerIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />

      </Drawer>
    </GestureHandlerRootView>
  );
}
