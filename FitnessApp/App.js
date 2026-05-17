import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AnalysisScreen from "./src/screens/AnalysisScreen";
import HomeScreen from "./src/screens/HomeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "FitnessApp Home Screen" }}
        />
        <Stack.Screen
          name="Analysis"
          component={AnalysisScreen}
          options={{ title: "Posture Analysis" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
