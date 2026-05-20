import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../firebaseConfig";
import { processTaskWithAI } from "../../services/geminiService";

export default function Index() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [dueDate, setDueDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingDate, setEditingDate] = useState(new Date());
  const [showEditPicker, setShowEditPicker] = useState(false);

  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationText, setNotificationText] = useState("");
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const totalTasks = tasks.length;
  const triggerNotification = (message: string) => {
    setNotificationText(message);
    setNotificationVisible(true);

    Animated.timing(slideAnim, {
      toValue: Platform.OS === "android" ? 20 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setNotificationVisible(false));
    }, 3500);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (authenticatedUser) => {
      if (authenticatedUser) {
        setUser(authenticatedUser);
      } else {
        setUser(null);
        router.replace("/(auth)/login");
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, "tasks"),
        where("userId", "==", user.uid),
        where("isDeleted", "==", false),
        orderBy("createdAt", "desc"),
      );

      const unsubscribeSnap = onSnapshot(
        q,
        (snapshot) => {
          const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTasks(fetched);
        },
        (error) => {
          console.error("Firestore Snapshot Error:", error);
        },
      );

      return () => unsubscribeSnap();
    }
  }, [user]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to exit your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (e) {
            Alert.alert(
              "Authentication Error",
              "Failed to sign out. Please try again.",
            );
          }
        },
        style: "destructive",
      },
    ]);
  };

  const addTask = async () => {
    if (task.trim() && user) {
      try {
        await addDoc(collection(db, "tasks"), {
          text: task,
          completed: false,
          isDeleted: false,
          userId: user.uid,
          createdAt: serverTimestamp(),
          dueTime: dueDate.getTime(),
        });

        triggerNotification(`Task "${task}" has been created successfully.`);
        setTask("");
      } catch (e) {
        Alert.alert(
          "Database Error",
          "Failed to save your task. Please check your network connection.",
        );
      }
    }
  };

  const handleAddWithAI = async () => {
    if (!task.trim()) {
      Alert.alert(
        "Empty Input",
        "Please enter a prompt or details before activating the AI Assistant.",
      );
      return;
    }

    setIsAiLoading(true);
    try {
      const aiResult = await processTaskWithAI(task);

      if (aiResult && aiResult.title) {
        let finalTimestamp = dueDate.getTime();

        if (aiResult.dueDate && aiResult.dueTime) {
          const dateString = aiResult.dueDate.trim();
          const timeString = aiResult.dueTime.trim();

          const combinedDateTime = new Date(`${dateString}T${timeString}:00`);

          if (!isNaN(combinedDateTime.getTime())) {
            finalTimestamp = combinedDateTime.getTime();
          }
        }

        await addDoc(collection(db, "tasks"), {
          text: aiResult.title,
          completed: false,
          isDeleted: false,
          userId: user.uid,
          createdAt: serverTimestamp(),
          dueTime: finalTimestamp,
        });

        triggerNotification(
          `AI Assistant successfully scheduled: "${aiResult.title}"`,
        );
        setTask("");
      } else {
        Alert.alert(
          "AI Extraction Error",
          "The AI system failed to extract structured data. Please try again with a clearer message.",
        );
      }
    } catch (error) {
      console.error("AI Interface Error:", error);
      Alert.alert(
        "Service Error",
        "AI processing failed. Please verify your system configuration or Gemini API key.",
      );
    } finally {
      setIsAiLoading(false);
    }
  };
  const openEditModal = (
    id: string,
    currentText: string,
    currentDueTime: number,
  ) => {
    setEditingTaskId(id);
    setEditingText(currentText);
    setEditingDate(new Date(currentDueTime));
    setIsEditModalVisible(true);
  };
  const handleUpdateTask = async () => {
    if (!editingText.trim() || !editingTaskId) {
      Alert.alert("Invalid Input", "Task text cannot be left empty.");
      return;
    }

    try {
      await updateDoc(doc(db, "tasks", editingTaskId), {
        text: editingText,
        dueTime: editingDate.getTime(),
      });

      setIsEditModalVisible(false);
      setEditingTaskId(null);
      triggerNotification("Task management registry updated successfully.");
    } catch (error) {
      console.error("Firestore Update Error:", error);
      Alert.alert(
        "Database Error",
        "Failed to update changes. Check your system link.",
      );
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 🔔 ULTIMATE PROFESSIONAL NOTIFICATION BANNER UI */}
      {notificationVisible && (
        <Animated.View
          style={[
            styles.notificationBanner,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.notificationIconCircle}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.notificationTitle}>Notification Alert</Text>
            <Text style={styles.notificationBody} numberOfLines={2}>
              {notificationText}
            </Text>
          </View>
        </Animated.View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.userLabel}>Logged in as:</Text>
            <Text style={styles.userEmail}>{user?.email || "User"}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.welcomeText}>Daily Tasks</Text>
        </View>

        <View style={styles.totalTasksCard}>
          <View style={styles.totalInfo}>
            <Text style={styles.totalTasksNum}>{totalTasks}</Text>
            <Text style={styles.totalTasksLabel}>Tasks Organized</Text>
          </View>
          <View style={styles.iconCircle}>
            <Ionicons name="layers-outline" size={28} color="#6366f1" />
          </View>
        </View>

        <View style={styles.inputCard}>
          <TextInput
            placeholder="Ask AI or type..."
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={task}
            onChangeText={setTask}
            editable={!isAiLoading}
          />
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={styles.timeSelector}
              disabled={isAiLoading}
            >
              <Ionicons name="calendar-outline" size={18} color="#6366f1" />
              <Text style={styles.timeText}>
                {dueDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>

            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <TouchableOpacity
                style={[styles.aiBtn, isAiLoading && styles.disabledBtn]}
                onPress={handleAddWithAI}
                disabled={isAiLoading}
              >
                {isAiLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="sparkles" size={18} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={addTask}
                disabled={isAiLoading}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showPicker && (
          <DateTimePicker
            value={dueDate}
            mode="time"
            is24Hour={true}
            onChange={(e, d) => {
              setShowPicker(false);
              if (d) setDueDate(d);
            }}
          />
        )}

        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={70} color="#CBD5E1" />
              <Text style={styles.emptyText}>Everything is clear. Relax!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[styles.taskCard, item.completed && styles.taskCardDone]}
            >
              <TouchableOpacity
                style={styles.checkCircle}
                onPress={() =>
                  updateDoc(doc(db, "tasks", item.id), {
                    completed: !item.completed,
                  })
                }
              >
                <Ionicons
                  name={item.completed ? "checkmark-circle" : "ellipse-outline"}
                  size={26}
                  color={item.completed ? "#10b981" : "#6366f1"}
                />
              </TouchableOpacity>

              {/* 🔄 Clickable Body area to launch Edit Modal */}
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => openEditModal(item.id, item.text, item.dueTime)}
              >
                <Text
                  style={[styles.taskText, item.completed && styles.textDone]}
                >
                  {item.text}
                </Text>
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={12} color="#94A3B8" />
                  <Text style={styles.dueLabel}>
                    {new Date(item.dueTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  updateDoc(doc(db, "tasks", item.id), { isDeleted: true })
                }
              >
                <Ionicons name="trash-outline" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
          )}
        />
      </KeyboardAvoidingView>

      {/* ✍️ PREMIUM TASK EDITING MODAL FRAMEWORK */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modify Task Record</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Task Heading Description</Text>
              <TextInput
                style={styles.modalInput}
                value={editingText}
                onChangeText={setEditingText}
                placeholder="Update details..."
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Adjust Target Timeline</Text>
              <TouchableOpacity
                onPress={() => setShowEditPicker(true)}
                style={styles.modalTimeSelector}
              >
                <Ionicons name="alarm-outline" size={20} color="#6366f1" />
                <Text style={styles.modalTimeText}>
                  {editingDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>

              {showEditPicker && (
                <DateTimePicker
                  value={editingDate}
                  mode="time"
                  is24Hour={true}
                  onChange={(e, d) => {
                    setShowEditPicker(false);
                    if (d) setEditingDate(d);
                  }}
                />
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveUpdateBtn}
                onPress={handleUpdateTask}
              >
                <Text style={styles.saveUpdateBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 20 },
  notificationBanner: {
    position: "absolute",
    top: 15,
    left: 15,
    right: 15,
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  notificationIconCircle: {
    backgroundColor: "#10B981",
    padding: 6,
    borderRadius: 50,
  },
  notificationTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  notificationBody: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  topRow: {
    marginTop: Platform.OS === "android" ? 15 : 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  userEmail: { fontSize: 14, color: "#1E293B", fontWeight: "bold" },
  logoutBtn: { padding: 10, backgroundColor: "#FFE4E6", borderRadius: 14 },
  header: { marginTop: 15, marginBottom: 10 },
  welcomeText: {
    fontSize: 34,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  totalTasksCard: {
    backgroundColor: "#1E293B",
    padding: 22,
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  totalInfo: { gap: 2 },
  totalTasksNum: { fontSize: 32, fontWeight: "900", color: "#fff" },
  totalTasksLabel: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  iconCircle: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    borderRadius: 18,
  },
  inputCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
    borderBottomWidth: 1.5,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 10,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    alignItems: "center",
  },
  timeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  timeText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  aiBtn: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  disabledBtn: { backgroundColor: "#a78bfa", opacity: 0.7 },
  addBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  taskCardDone: { opacity: 0.6, backgroundColor: "#F9FAFB" },
  checkCircle: { marginRight: 12 },
  taskText: { fontSize: 15, fontWeight: "700", color: "#334155" },
  textDone: { textDecorationLine: "line-through", color: "#94A3B8" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  dueLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: {
    marginTop: 12,
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  modalBody: { marginBottom: 24 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
    marginBottom: 16,
  },
  modalTimeSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalTimeText: { fontSize: 15, fontWeight: "700", color: "#334155" },
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: { color: "#64748B", fontWeight: "700", fontSize: 14 },
  saveUpdateBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#6366f1",
  },
  saveUpdateBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
