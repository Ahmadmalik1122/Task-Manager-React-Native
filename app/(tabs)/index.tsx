import DateTimePicker from "@react-native-community/datetimepicker";
import { signOut } from "firebase/auth"; // Logout ke liye
import {
  addDoc,
  collection,
  deleteDoc,
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
} from "react-native";
import { auth, db } from "../../firebaseConfig";

export default function Index() {
  const [user, setUser] = useState<any>(auth.currentUser);
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [dueDate, setDueDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;

  useEffect(() => {
    // Auth state check karne ke liye
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });

    if (user) {
      const q = query(
        collection(db, "tasks"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
      );
      const unsubscribe = onSnapshot(q, (s) => {
        const fetched = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTasks(fetched);
      });
      return () => {
        unsubscribe();
        unsubAuth();
      };
    }
  }, [user]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => signOut(auth), style: "destructive" },
    ]);
  };

  const addTask = async () => {
    if (task.trim() && user) {
      try {
        await addDoc(collection(db, "tasks"), {
          text: task,
          completed: false,
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
      {/* USER HEADER & LOGOUT */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.userLabel}>Logged in as:</Text>
          <Text style={styles.userEmail}>
            {user?.email || "Someone@gmail.com"}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.welcomeText}>My Tasks</Text>
        <View style={styles.statsRow}>
          {/* TOTAL CARD */}
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalTasks}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          {/* DONE CARD (Ab bilkul Total jaisa hai) */}
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: "#4CAF50" }]}>
              {completedTasks}
            </Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>
      </View>

      {/* INPUT SECTION */}
      <View style={styles.inputCard}>
        <TextInput
          placeholder="What needs to be done?"
          placeholderTextColor="#999"
          style={styles.input}
          value={task}
          onChangeText={setTask}
        />
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={styles.timeSelector}
          >
            <Text style={styles.timeText}>
              ⏰{" "}
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

      {/* TASK LIST */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>No tasks for today. Relax!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[styles.taskCard, item.completed && styles.taskCompleted]}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() =>
                updateDoc(doc(db, "tasks", item.id), {
                  completed: !item.completed,
                })
              }
            >
              <Text
                style={[styles.taskTitle, item.completed && styles.strikeText]}
              >
                {item.text}
              </Text>
              <Text style={styles.dueLabel}>
                Due:{" "}
                {new Date(item.dueTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteDoc(doc(db, "tasks", item.id))}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 20,
    paddingTop: 50,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  userLabel: { fontSize: 10, color: "#999", fontWeight: "600" },
  userEmail: { fontSize: 13, color: "#444", fontWeight: "bold" },
  logoutBtn: {
    padding: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    elevation: 2,
  },
  logoutIcon: { fontSize: 18 },
  header: { marginBottom: 25 },
  welcomeText: { fontSize: 32, fontWeight: "bold", color: "#1A1A1A" },
  statsRow: { flexDirection: "row", gap: 15, marginTop: 15 },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statNum: { fontSize: 24, fontWeight: "bold", color: "#2D3436" },
  statLabel: { fontSize: 12, color: "#636E72", marginTop: 4 },
  inputCard: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 16,
    marginBottom: 25,
    elevation: 4,
  },
  input: {
    fontSize: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    alignItems: "center",
  },
  timeSelector: { backgroundColor: "#F1F3F5", padding: 8, borderRadius: 8 },
  timeText: { fontSize: 13, color: "#495057" },
  addBtn: {
    backgroundColor: "#2D3436",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: { color: "#FFF", fontWeight: "bold" },
  taskCard: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  taskCompleted: { opacity: 0.6, backgroundColor: "#F8F9FA" },
  taskTitle: { fontSize: 16, color: "#2D3436", fontWeight: "500" },
  strikeText: { textDecorationLine: "line-through" },
  dueLabel: {
    fontSize: 11,
    color: "#FF7675",
    marginTop: 4,
    fontWeight: "bold",
  },
  deleteIcon: { fontSize: 18, marginLeft: 10 },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyText: { color: "#636E72", fontSize: 16 },
});
