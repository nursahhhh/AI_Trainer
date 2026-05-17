// npx expo start -c --tunnel
import { Asset } from "expo-asset";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  buildAnalysisPayload,
  buildDetailedAnalysisPayload,
} from "../services/analysisPayloadService";
import {
  getDetailedAnalysis,
  predictExercise,
} from "../services/analysisService";
import { createMockKeypointFrame } from "../services/poseService";

const MODEL_PATH = require("../../assets/model/model.tflite");

const MAX_ANALYSIS_DURATION_MS = 5 * 60 * 1000; // 5 dakika

export default function AnalysisScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingResult, setIsProcessingResult] = useState(false);
  const [isLoadingDetailedReport, setIsLoadingDetailedReport] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [capturedFramesCount, setCapturedFramesCount] = useState(0);

  const [predictionResult, setPredictionResult] = useState(null);
  const [detailedReport, setDetailedReport] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [exerciseType, setExerciseType] = useState("squat");

  const analysisStartTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const fakeFrameCollectorRef = useRef(null);

  const keypointBufferRef = useRef([]);

  useEffect(() => {
    async function checkModel() {
      try {
        const [{ localUri }] = await Asset.loadAsync(MODEL_PATH);
        console.log("Model loaded successfully, path:", localUri);
      } catch (error) {
        console.log("Model loading error:", error);
      }
    }

    if (permission?.granted) {
      checkModel();
    }
  }, [permission]);

  useEffect(() => {
    return () => {
      stopAllRunningIntervals();
    };
  }, []);

  const stopAllRunningIntervals = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (fakeFrameCollectorRef.current) {
      clearInterval(fakeFrameCollectorRef.current);
      fakeFrameCollectorRef.current = null;
    }
  };

  const resetSessionState = () => {
    setElapsedSeconds(0);
    setCapturedFramesCount(0);
    setPredictionResult(null);
    setDetailedReport("");
    setErrorMessage("");
    keypointBufferRef.current = [];
  };

  const startAnalysis = async () => {
    try {
      resetSessionState();
      setIsAnalyzing(true);

      analysisStartTimeRef.current = Date.now();

      timerIntervalRef.current = setInterval(() => {
        const elapsedMs = Date.now() - analysisStartTimeRef.current;
        const nextElapsedSeconds = Math.floor(elapsedMs / 1000);

        setElapsedSeconds(nextElapsedSeconds);

        if (elapsedMs >= MAX_ANALYSIS_DURATION_MS) {
          stopAnalysis(true);
        }
      }, 1000);

      /**
       * GEÇİCİ MOCK:
       * Burada gerçek MediaPipe frame/keypoint extraction yok.
       * Şimdilik her 300 ms'de sahte bir frame landmark verisi ekliyoruz.
       *
       * Sonra bunu gerçek MediaPipe sonucu ile değiştireceğiz.
       */
      fakeFrameCollectorRef.current = setInterval(() => {
        const fakeFrame = createMockKeypointFrame();
        keypointBufferRef.current.push(fakeFrame);
        setCapturedFramesCount(keypointBufferRef.current.length);
      }, 300);
    } catch (error) {
      console.error("Start analysis error:", error);
      setErrorMessage("Failed to start analysis.");
      setIsAnalyzing(false);
      stopAllRunningIntervals();
    }
  };

  const stopAnalysis = async (stoppedByLimit = false) => {
    try {
      stopAllRunningIntervals();
      setIsAnalyzing(false);

      if (stoppedByLimit) {
        Alert.alert("Analysis finished", "Maximum analysis duration reached.");
      }

      if (keypointBufferRef.current.length === 0) {
        setErrorMessage("No pose data was collected.");
        return;
      }

      setIsProcessingResult(true);

      const payload = buildAnalysisPayload({
        exerciseType,
        elapsedSeconds,
        frames: keypointBufferRef.current.slice(0, 3), // İlk 3 frame'i gönderiyoruz, gerçek son 30 tümünü göndereceğiz
      });

      const result = await predictExercise(payload);
      setPredictionResult(result);
    } catch (error) {
      console.error("Stop analysis error:", error);
      setErrorMessage("Failed to process analysis result.");
    } finally {
      setIsProcessingResult(false);
    }
  };

  const handleDetailedAnalysis = async () => {
    if (!predictionResult) return;

    try {
      setIsLoadingDetailedReport(true);
      setDetailedReport("");

     const payload = buildDetailedAnalysisPayload({
        exerciseType,
        predictionResult,
      });

        
      const response = await getDetailedAnalysis(payload);
      setDetailedReport(response.report);
    } catch (error) {
      console.error("Detailed analysis error:", error);
      setErrorMessage("Failed to generate detailed analysis.");
    } finally {
      setIsLoadingDetailedReport(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.infoText}>
          Camera permission is required for posture analysis.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.cameraWrapper}>
        <CameraView style={styles.camera} facing="front">
          <View style={styles.overlay}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {isAnalyzing ? "Analysis Running" : "Camera Ready"}
              </Text>
            </View>

            <View style={styles.guideBox}>
              <Text style={styles.guideText}>
                Align your whole body with the screen.
              </Text>
              <Text style={styles.guideSubText}>
                Keep enough distance so your full posture is visible.
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Session Status</Text>
        <Text style={styles.metricText}>Exercise Type: {exerciseType}</Text>
        <Text style={styles.metricText}>Elapsed Time: {elapsedSeconds}s</Text>
        <Text style={styles.metricText}>Collected Frames: {capturedFramesCount}</Text>

        {!isAnalyzing ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startAnalysis}
            disabled={isProcessingResult}
          >
            <Text style={styles.primaryButtonText}>Start Analysis</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={() => stopAnalysis(false)}
          >
            <Text style={styles.primaryButtonText}>Stop Analysis</Text>
          </TouchableOpacity>
        )}

        {isProcessingResult && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>Processing posture analysis...</Text>
          </View>
        )}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

   {predictionResult && (
  <View style={styles.resultCard}>
    <Text style={styles.sectionTitle}>Quick Result</Text>
    <Text style={styles.resultText}>
      Exercise: {predictionResult.exercise_name}
    </Text>
    <Text style={styles.resultText}>
      Total Reps: {predictionResult.total_reps}
    </Text>
    <Text style={styles.resultText}>
      Error Count: {predictionResult.errors?.length ?? 0}
    </Text>

    {predictionResult.errors?.length > 0 ? (
      <View style={{ marginTop: 12 }}>
        {predictionResult.errors.map((errorItem, index) => (
          <View key={`${errorItem.rep_id}-${index}`} style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Rep {errorItem.rep_id} — {errorItem.error_type}
            </Text>
            <Text style={styles.resultText}>
              Body Part: {errorItem.body_part}
            </Text>
            <Text style={styles.resultText}>
              Time: {errorItem.timestamp_sec}s | Frame: {errorItem.frame}
            </Text>
            <Text style={styles.resultText}>
              Measured Angle: {errorItem.measured_angle}
            </Text>
            <Text style={styles.resultText}>
              Expected Range: {errorItem.expected_angle_range?.min} -{" "}
              {errorItem.expected_angle_range?.max}
            </Text>
            <Text style={styles.resultText}>
              Deviation: {errorItem.angle_deviation}
            </Text>
            <Text style={styles.resultText}>
              Confidence: {errorItem.confidence}
            </Text>
          </View>
        ))}
      </View>
    ) : (
      <Text style={styles.resultSummary}>
        No significant form errors were detected.
      </Text>
    )}

    <TouchableOpacity
      style={styles.primaryButton}
      onPress={handleDetailedAnalysis}
      disabled={isLoadingDetailedReport}
    >
      <Text style={styles.primaryButtonText}>
        {isLoadingDetailedReport
          ? "Generating Detailed Analysis..."
          : "Get Detailed Analysis"}
      </Text>
    </TouchableOpacity>
  </View>
)}

      {detailedReport ? (
        <View style={styles.reportCard}>
          <Text style={styles.sectionTitle}>Detailed Feedback Report</Text>
          <Text style={styles.reportText}>{detailedReport}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#f4f6f8",
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    padding: 24,
  },
  cameraWrapper: {
    height: 430,
    width: "100%",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "transparent",
  },
  statusBadge: {
    alignSelf: "center",
    marginTop: 20,
    backgroundColor: "rgba(0, 255, 0, 0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  statusText: {
    color: "#111",
    fontWeight: "700",
  },
  guideBox: {
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  guideText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
  },
  guideSubText: {
    color: "#ddd",
    textAlign: "center",
    fontSize: 13,
    marginTop: 6,
  },
  panel: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  resultCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  reportCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
  },
  metricText: {
    fontSize: 15,
    color: "#444",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    textAlign: "center",
    color: "#333",
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  stopButton: {
    backgroundColor: "#E53935",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  loadingText: {
    marginLeft: 8,
    color: "#444",
  },
  resultText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 6,
  },
  resultSummary: {
    marginTop: 6,
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
  reportText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 24,
  },
  errorText: {
    color: "#D32F2F",
    marginTop: 12,
    fontWeight: "600",
  },
  errorCard: {
    backgroundColor: "#f8f9fb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e3e7ee",
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
  },
});