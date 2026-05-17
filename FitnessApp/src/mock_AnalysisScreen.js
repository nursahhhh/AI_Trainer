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

      const payload = {
        exercise_type: "squat",
        session_duration_seconds: elapsedSeconds,
        frame_count: keypointBufferRef.current.length,
        frames: keypointBufferRef.current,
      };

      /**
       * GEÇİCİ MOCK:
       * Burada gerçek backend çağrısı yerine sahte response dönüyoruz.
       * Sonra bunu fetch ile gerçek endpoint'e bağlayacağız.
       */
      const result = await mockPredictRequest(payload);
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

      const payload = {
        exercise_type: "squat",
        prediction: predictionResult.prediction,
        confidence: predictionResult.confidence,
        summary: predictionResult.summary,
        feedback_input: predictionResult.feedback_input,
      };

      /**
       * GEÇİCİ MOCK:
       * Burada gerçek LLM endpoint yerine sahte response dönüyoruz.
       */
      const response = await mockDetailedAnalysisRequest(payload);
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

/**
 * Şimdilik sahte keypoint frame üretiyoruz.
 * Sonra bunu MediaPipe landmark çıktısı ile değiştireceğiz.
 */
function createMockKeypointFrame() {
  return {
    timestamp: Date.now(),
    landmarks: [
      { name: "left_shoulder", x: 0.42, y: 0.28, z: -0.12, visibility: 0.98 },
      { name: "right_shoulder", x: 0.58, y: 0.27, z: -0.11, visibility: 0.97 },
      { name: "left_hip", x: 0.45, y: 0.53, z: -0.08, visibility: 0.95 },
      { name: "right_hip", x: 0.55, y: 0.54, z: -0.09, visibility: 0.95 },
      { name: "left_knee", x: 0.44, y: 0.73, z: -0.03, visibility: 0.93 },
      { name: "right_knee", x: 0.56, y: 0.74, z: -0.02, visibility: 0.92 },
    ],
  };
}

async function mockPredictRequest(payload) {
  console.log("Predict payload:", payload);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        schema_version: "1.0",
        exercise_name: "squat",
        total_reps: 5,
        errors: [
          {
            rep_id: 2,
            timestamp_sec: 12.4,
            frame: 372,
            error_type: "knee_valgus",
            body_part: "left_knee",
            measured_angle: 148,
            expected_angle_range: {
              min: 160,
              max: 180,
            },
            angle_deviation: -12,
            confidence: 0.91,
          },
          {
            rep_id: 4,
            timestamp_sec: 24.7,
            frame: 741,
            error_type: "forward_lean",
            body_part: "torso",
            measured_angle: 52,
            expected_angle_range: {
              min: 70,
              max: 90,
            },
            angle_deviation: -18,
            prediction_confidence: 0.88,
          },
        ],
      });
    }, 1500);
  });
}

async function mockDetailedAnalysisRequest(payload) {
  console.log("Detailed analysis payload:", payload);

return new Promise((resolve) => {
  setTimeout(() => {
    resolve({
      report: `
Overall assessment:
You knocked out a solid set of 5 squats with good depth and control on most reps. The movement looked strong overall, but a couple of small form slips popped up that are worth tightening up.

Key form issues:
In rep 2 your left knee drifted inward (knee valgus) as you came out of the bottom. Then in rep 4 your torso leaned forward more than ideal during the ascent.

Why this matters:
Knee valgus puts extra stress on the knee joint and can reduce power from the glutes, which limits how much weight you can safely handle over time. The forward lean shifts too much load onto your lower back and makes it harder to drive through your heels, so you lose some of the quad and glute strength that should be doing the work.

How to improve next time:
Focus on pushing your knees outward over your toes the whole way up—think about spreading the floor apart with your feet. For the torso, keep your chest up and imagine a string pulling the top of your head toward the ceiling so you stay more upright. Try doing the next set a little slower on the way up so you can feel those positions and correct them before they happen.

Keep it up—you’re already moving well and these are easy fixes with a bit of focus.`
    });
  }, 1800);
});
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
});