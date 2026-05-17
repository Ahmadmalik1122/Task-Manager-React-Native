import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { signOut, onAuthStateChanged } from "firebase/auth"; // Added onAuthStateChanged
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
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator, // Loading dikhane ke liye
} from "react-native";
import { auth, db } from "../../firebaseConfig";

export default function Index() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true); // Initial loading state
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [dueDate, setDueDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const totalTasks = tasks.length;

  useEffect(() => {
    // 1. Auth Listener: Ye check karega ke user logged in hai ya nahi
    const unsubscribeAuth = onAuthStateChanged(auth, (authenticatedUser) => {
      if (authenticatedUser) {
        setUser(authenticatedUser);
        setLoading(false);
      } else {
        setLoading(false);
        router.replace("/(auth)/login");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // 2. Firestore Listener: Sirf tab chale jab user mil jaye
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
          console.error("Firestore Error:", error);
        },
      );

      return () => unsubscribeSnap();
    }
  }, [user]);

  // Loading Screen: Jab tak auth confirm na ho
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

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await signOut(auth);
          router.replace("/(auth)/login");
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
        setTask("");
      } catch (e) {
        Alert.alert("Error", "Task save nahi ho saka.");
      }
    }
  };

  return (
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
          placeholder="Plan your next move..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={task}
          onChangeText={setTask}
        />
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={styles.timeSelector}
          >
            <Ionicons name="calendar-outline" size={18} color="#6366f1" />
            <Text style={styles.timeText}>
              {dueDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={addTask}>
            <Text style={styles.addBtnText}>Add Task</Text>
          </TouchableOpacity>
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
            <Ionicons name="clipboard-outline" size={70} color="#E2E8F0" />
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

            <View style={{ flex: 1 }}>
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
            </View>

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
  );
}

// ... Styles (Wahi hain jo tumne bhejey)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 20 },
  topRow: {
    marginTop: 60,
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
    fontSize: 38,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  totalTasksCard: {
    backgroundColor: "#1E293B",
    padding: 24,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    elevation: 12,
    shadowColor: "#1E293B",
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  totalInfo: { gap: 2 },
  totalTasksNum: { fontSize: 36, fontWeight: "900", color: "#fff" },
  totalTasksLabel: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  iconCircle: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    borderRadius: 18,
  },
  inputCard: {
    backgroundColor: "#fff",
    padding: 22,
    borderRadius: 28,
    marginBottom: 30,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  input: {
    fontSize: 17,
    color: "#1E293B",
    fontWeight: "500",
    borderBottomWidth: 1.5,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    alignItems: "center",
  },
  timeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 15,
    gap: 8,
  },
  timeText: { fontSize: 14, fontWeight: "700", color: "#475569" },
  addBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    elevation: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  taskCardDone: { opacity: 0.6, backgroundColor: "#F9FAFB" },
  checkCircle: { marginRight: 15 },
  taskText: { fontSize: 16, fontWeight: "700", color: "#334155" },
  textDone: { textDecorationLine: "line-through", color: "#94A3B8" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  dueLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: {
    marginTop: 12,
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "500",
  },
});
