import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";

export default function ExploreScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    percent: 0,
  });
  const [showHistory, setShowHistory] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(allTasks);

      let activeTasks = allTasks.filter((t: any) => !t.hidden);
      let comp = activeTasks.filter((t: any) => t.completed).length;
      let total = activeTasks.length;
      let percentage = total > 0 ? Math.round((comp / total) * 100) : 0;

      setStats({
        total,
        completed: comp,
        pending: total - comp,
        percent: percentage,
      });
    });
    return () => unsubscribe();
  }, []);

  const clearHistory = async () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear completed tasks from the dashboard?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Clear All",
          onPress: async () => {
            try {
              const querySnapshot = await getDocs(collection(db, "tasks"));
              const updatePromises: any[] = [];
              querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.completed === true || data.completed === "true") {
                  updatePromises.push(
                    updateDoc(doc(db, "tasks", docSnap.id), { hidden: true }),
                  );
                }
              });
              if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
              }
            } catch (error) {
              Alert.alert("Error", "Failed to update tasks.");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const EmptySection = ({ message, icon }: { message: any; icon: any }) => (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={40} color="#E2E8F0" />
      <Text style={styles.emptySectionText}>{message}</Text>
    </View>
  );

  const TaskCard = ({
    title,
    isDone,
    showStatus = true,
  }: {
    title: any;
    isDone: any;
    showStatus?: boolean;
  }) => (
    <View
      style={[styles.taskCard, isDone ? styles.cardDone : styles.cardPending]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: isDone ? "#d1fae5" : "#e0e7ff" },
        ]}
      >
        <Ionicons
          name={isDone ? "checkmark-done" : "flash"}
          size={18}
          color={isDone ? "#10b981" : "#4f46e5"}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.taskTitle, isDone && styles.textDone]}>
          {title}
        </Text>
        {showStatus && (
          <Text style={styles.statusSub}>
            {isDone ? "Completed" : "Pending"}
          </Text>
        )}
      </View>
    </View>
  );

  const activePending = tasks.filter((t: any) => !t.completed && !t.hidden);
  const activeCompleted = tasks.filter((t: any) => t.completed && !t.hidden);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.welcomeText}>Activity Hub</Text>
        </View>
        <TouchableOpacity onPress={clearHistory} style={styles.trashBtn}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={["#6366f1", "#a855f7"]}
        style={styles.mainProgressCard}
      >
        <View>
          <Text style={styles.progressTitle}>Productivity</Text>
          <Text style={styles.progressSub}>
            {stats.percent}% Tasks Finished
          </Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.percentText}>{stats.percent}%</Text>
        </View>
      </LinearGradient>

      <TouchableOpacity
        style={styles.archiveBtn}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="book-outline" size={20} color="#fff" />
        <Text style={styles.archiveBtnText}>View Full Task Archive</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#10b981" }]}>
            {stats.completed}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* --- Current Focus Section --- */}
      <Text style={styles.sectionHeading}>Current Focus</Text>
      <View style={{ marginTop: 10 }}>
        {activePending.length > 0 ? (
          activePending.map((item: any) => (
            <TaskCard key={item.id} title={item.text} isDone={false} />
          ))
        ) : (
          <EmptySection
            message="No active tasks. Start something new!"
            icon="rocket-outline"
          />
        )}
      </View>

      {/* --- Recent History Section --- */}
      <TouchableOpacity
        onPress={() => setShowHistory(!showHistory)}
        style={styles.toggleHeader}
      >
        <Text style={styles.sectionHeading}>Recent History</Text>
        <Ionicons
          name={showHistory ? "chevron-up" : "chevron-down"}
          size={20}
          color="#6B7280"
        />
      </TouchableOpacity>

      {showHistory && (
        <View>
          {activeCompleted.length > 0 ? (
            activeCompleted.map((item: any) => (
              <TaskCard key={item.id} title={item.text} isDone={true} />
            ))
          ) : (
            <EmptySection
              message="No history yet. Finish a task to see it here!"
              icon="time-outline"
            />
          )}
        </View>
      )}

      {/* Archive Modal */}
      <Modal visible={isModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Permanent Archive</Text>
              <Text style={styles.modalSub}>All tasks ever created</Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close-circle" size={35} color="#6366f1" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={tasks}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: { item: any }) => (
              <TaskCard title={item.text} isDone={item.completed} />
            )}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
              <EmptySection
                message="The archive is empty."
                icon="folder-open-outline"
              />
            }
          />
        </View>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 20,
  },
  welcomeText: { fontSize: 26, fontWeight: "900", color: "#1E293B" },
  dateText: { fontSize: 14, color: "#94A3B8" },
  trashBtn: { padding: 12, backgroundColor: "#FFE4E6", borderRadius: 15 },
  mainProgressCard: {
    borderRadius: 25,
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 8,
  },
  progressTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  progressSub: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fff",
  },
  percentText: { color: "#fff", fontWeight: "bold" },
  archiveBtn: {
    backgroundColor: "#1E293B",
    padding: 15,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 10,
    elevation: 4,
  },
  archiveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  statNum: { fontSize: 22, fontWeight: "bold", color: "#6366f1" },
  statLabel: { fontSize: 12, color: "#64748B" },
  sectionHeading: { fontSize: 18, fontWeight: "bold", color: "#334155" },
  toggleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 10,
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    elevation: 1,
  },
  cardDone: {},
  cardPending: {},
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  taskTitle: { fontSize: 15, fontWeight: "600", color: "#334155" },
  statusSub: { fontSize: 11, color: "#94A3B8" },
  textDone: { textDecorationLine: "line-through", color: "#94A3B8" },

  emptyCard: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderStyle: "dashed",
  },
  emptySectionText: {
    marginTop: 10,
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  modalContainer: { flex: 1, backgroundColor: "#F1F5F9" },
  modalHeader: {
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingTop: 50,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#1E293B" },
  modalSub: { fontSize: 13, color: "#64748B" },
});
