import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const HomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome to the FitnessApp</Text>
      <Text style={styles.subText}>
        Start from the bottom for posture analysis.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Analysis")}
      >
        <Text style={styles.buttonText}>Start Exercise</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  welcomeText: { fontSize: 26, fontWeight: "bold", color: "#333" },
  subText: { fontSize: 16, color: "#666", marginBottom: 30 },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});

export default HomeScreen;
