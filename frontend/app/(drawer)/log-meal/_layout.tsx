import { Stack } from 'expo-router';

export default function LogMealLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Camera', headerShown: false }} />
      <Stack.Screen name="step2" options={{ title: 'Food Review', headerShown: true }} />
      <Stack.Screen name="step3" options={{ title: 'Nutrition Check', headerShown: true }} />
      <Stack.Screen name="step4" options={{ title: 'Digestion', headerShown: true }} />
      <Stack.Screen name="step5" options={{ title: 'Mood', headerShown: true }} />
      <Stack.Screen name="step6" options={{ title: 'Summary', headerShown: false }} />
    </Stack>
  );
}
