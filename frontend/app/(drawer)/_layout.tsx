import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Home, User, BedSingle, Activity, TrendingUp, AlertTriangle, CalendarDays, Utensils, LogOut } from 'lucide-react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useAppStore } from '../../store/useAppStore';
import { useRouter } from 'expo-router';
import { View, Pressable, Text } from 'react-native';

const CustomDrawerContent = (props: any) => {
  const { logout } = useAppStore();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <View style={{ padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#334155', backgroundColor: '#0f172a' }}>
        <Pressable 
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', padding: 14, borderRadius: 12, gap: 10, justifyContent: 'center' }}
          onPress={() => {
            logout();
            router.replace('/(auth)/login');
          }}
        >
          <LogOut color="#fff" size={20} />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Log Out</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          drawerActiveTintColor: '#0ea5e9',
          drawerInactiveTintColor: '#94a3b8',
          drawerStyle: { backgroundColor: '#0f172a' }
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: 'Dashboard',
            title: 'GutSense',
            drawerIcon: ({ color }) => <Home color={color} size={24} />,
          }}
        />
        <Drawer.Screen
          name="log-meal"
          options={{
            drawerLabel: 'Log Meal',
            title: 'Log Meal',
            drawerIcon: ({ color }) => <Utensils color={color} size={24} />,
            unmountOnBlur: true,
          } as any}
        />
        <Drawer.Screen
          name="log-sleep"
          options={{
            drawerLabel: 'Log Sleep',
            title: 'Log Sleep',
            drawerIcon: ({ color }) => <BedSingle color={color} size={24} />,
            unmountOnBlur: true,
          } as any}
        />
        <Drawer.Screen
          name="history"
          options={{
            drawerLabel: 'History',
            title: 'History',
            drawerIcon: ({ color }) => <CalendarDays color={color} size={24} />,
          }}
        />
        <Drawer.Screen
          name="trends"
          options={{
            drawerLabel: 'My Trends',
            title: 'My Trends',
            drawerIcon: ({ color }) => <TrendingUp color={color} size={24} />,
          }}
        />
        <Drawer.Screen
          name="baselines"
          options={{
            drawerLabel: 'My Baselines',
            title: 'My Baselines',
            drawerIcon: ({ color }) => <Activity color={color} size={24} />,
          }}
        />
        <Drawer.Screen
          name="risk-monitor"
          options={{
            drawerLabel: 'Risk Monitor',
            title: 'Risk Monitor',
            drawerIcon: ({ color }) => <AlertTriangle color={color} size={24} />,
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: 'Profile',
            title: 'Profile',
            drawerIcon: ({ color }) => <User color={color} size={24} />,
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
