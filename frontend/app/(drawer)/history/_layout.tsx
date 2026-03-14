import { Stack } from 'expo-router';

export default function HistoryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'History Calendar', headerShown: false }} />
      <Stack.Screen name="[date]" options={{ title: 'Day Overview', headerShown: true }} />
    </Stack>
  );
}
