import React, { useState, useEffect } from "react";
import { 
  db, 
  auth, 
  googleProvider, 
  seedBaseDataIfEmpty, 
  testConnection, 
  handleFirestoreError,
  OperationType 
} from "./firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  doc, 
  setDoc,
  updateDoc 
} from "firebase/firestore";
import { 
  signInWithPopup, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { Pet, HealthLog, MatchInquiry } from "./types";
import PetCard from "./components/PetCard";
import AddHealthLogForm from "./components/AddHealthLogForm";
import AddPetModal from "./components/AddPetModal";
import MatchHistory from "./components/MatchHistory";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, 
  Activity, 
  ChevronRight, 
  Sparkles, 
  Plus, 
  FileCheck, 
  CheckCircle2, 
  User as UserIcon, 
  Users, 
  LogOut, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Award,
  Scale,
  Calendar,
  Check
} from "lucide-react";

export default function App() {
  // Database state
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [inquiries, setInquiries] = useState<MatchInquiry[]>([]);

  // Category filters
  const [petFilter, setPetFilter] = useState<string>("All");

  // User auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Modal UI triggers
  const [showAddPet, setShowAddPet] = useState<boolean>(false);
  const [showAddHealth, setShowAddHealth] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"health" | "matching">("matching");

  // Questionnaire Input States
  const [adopterName, setAdopterName] = useState<string>("");
  const [adopterEmail, setAdopterEmail] = useState<string>("");
  const [adopterPhone, setAdopterPhone] = useState<string>("");
  const [housing, setHousing] = useState<string>("一般公寓 (Apartment)");
  const [workingHours, setWorkingHours] = useState<string>("朝九晚五上班族 (9-to-5 Office)");
  const [activityLevel, setActivityLevel] = useState<string>("定期散步散心 (Moderate Walks)");
  const [hasOtherPets, setHasOtherPets] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // AI Matching request state
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ aiScore: number; aiFeedback: string } | null>(null);
  const [submittedInquiryId, setSubmittedInquiryId] = useState<string | null>(null);

  // App initialization & seeding trigger
  useEffect(() => {
    let usersUnsubscribe = () => {};
    let inquiriesUnsubscribe = () => {};

    const initialize = async () => {
      try {
        await testConnection();
        await seedBaseDataIfEmpty();
      } catch (err) {
        console.error("Initialization hook issue:", err);
      }
    };

    initialize();

    // Setup Auth Listener
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      // Seed prefilled information based on Google profile for user delight
      if (user) {
        setAdopterName(user.displayName || "");
        setAdopterEmail(user.email || "");
      }
    });

    // Real-time listener for Pets
    const petsUnsubscribe = onSnapshot(collection(db, "pets"), (snapshot) => {
      const list: Pet[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Pet);
      });
      // Sort pets so newer or specific stays first
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setPets(list);
      
      // Auto select first pet if none selected
      if (list.length > 0) {
        setActivePet((prev) => {
          if (prev) {
            const updated = list.find((p) => p.id === prev.id);
            return updated || list[0];
          }
          return list[0];
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "pets");
    });

    // Real-time listener for Match Inquiries / Applications
    const queryInquiries = collection(db, "match_inquiries");
    inquiriesUnsubscribe = onSnapshot(queryInquiries, (snapshot) => {
      const list: MatchInquiry[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as MatchInquiry);
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setInquiries(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "match_inquiries");
    });

    return () => {
      authUnsubscribe();
      petsUnsubscribe();
      inquiriesUnsubscribe();
    };
  }, []);

  // Listen to Health Logs in real-time when active pet changes
  useEffect(() => {
    if (!activePet) {
      setHealthLogs([]);
      return;
    }

    const q = query(
      collection(db, "health_logs"),
      where("petId", "==", activePet.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: HealthLog[] = [];
      snapshot.forEach((d) => {
        logs.push({ id: d.id, ...d.data() } as HealthLog);
      });
      logs.sort((a, b) => b.date.localeCompare(a.date));
      setHealthLogs(logs);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "health_logs");
    });

    // Reset AI result when selecting a different pet
    setAiResult(null);
    setSubmittedInquiryId(null);

    return unsubscribe;
  }, [activePet?.id]);

  const handleLoginGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google sign in failure:", err);
      // Fallback: anonymous sign in so the user can still write/interact with Firestore
      await signInAnonymously(auth);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failure:", err);
    }
  };

  // Perform AI match correlation via server side route
  const handleStartAiMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePet) {
      alert("請先在左側清單中選取您有興趣認養的寵物！");
      return;
    }
    if (!adopterName.trim() || !adopterEmail.trim()) {
      alert("請填寫領養人真實姓名與電子郵件以進行資料審核");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setSubmittedInquiryId(null);

    try {
      const response = await fetch("/api/gemini/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pet: activePet,
          answers: {
            adopterName: adopterName.trim(),
            housing,
            workingHours,
            activityLevel,
            hasOtherPets,
            message: message.trim(),
          }
        }),
      });

      if (!response.ok) {
        throw new Error("伺服器媒合引擎回應失敗，請稍後再試。");
      }

      const matchData = await response.json();
      setAiResult({
        aiScore: matchData.aiScore ?? 80,
        aiFeedback: matchData.aiFeedback || "未能取得完整分析評語"
      });
    } catch (err: any) {
      console.error("AI Match Calculation client error:", err);
      setAiError(err.message || "媒合連線逾時");
    } finally {
      setAiLoading(false);
    }
  };

  // Save the calculated AI Match request permanently to Firestore
  const handleFinalSubmitApplication = async () => {
    if (!activePet || !aiResult) return;
    const path = "match_inquiries";

    try {
      const inquiryId = "inq_" + Date.now();
      const payload: Omit<MatchInquiry, "id"> = {
        petId: activePet.id,
        petName: activePet.name,
        adopterName: adopterName.trim(),
        adopterEmail: adopterEmail.trim(),
        adopterPhone: adopterPhone.trim() || "未填寫",
        housing,
        workingHours,
        activityLevel,
        hasOtherPets,
        message: message.trim() || "希望有機會能看看寶貝！",
        aiScore: aiResult.aiScore,
        aiFeedback: aiResult.aiFeedback,
        status: "Pending",
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "match_inquiries", inquiryId), payload);
      setSubmittedInquiryId(inquiryId);
      
      // Update pet status to pending
      await updateDoc(doc(db, "pets", activePet.id), {
        status: "Pending"
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  // Quick Seed Button functionality for full testing capability
  const triggerManualSeed = async () => {
    if (window.confirm("這將會補足預設的精美寵物及其健康履歷資料。確定要執行嗎？")) {
      const path = "pets";
      try {
        await seedBaseDataIfEmpty();
        alert("資料登入完成！");
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const filteredPets = pets.filter((pet) => {
    if (petFilter === "All") return true;
    return pet.type === petFilter;
  });

  return (
    <div className="min-h-screen bg-sage-100 text-slate-800 antialiased flex flex-col font-sans">
      
      {/* Dynamic Navigation Bar */}
      <header id="app_header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sage-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sage-700 p-2.5 rounded-[16px] text-white shadow-md">
              <Heart className="h-6 w-6 animate-pulse text-sage-100" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-black tracking-tight text-sage-700 flex items-center gap-2">
                寵物認養與智慧媒合系統
                <span className="text-xs bg-sage-100 text-sage-800 px-2 py-0.5 rounded-full font-bold border border-sage-300/40">FIREBASE v9</span>
              </h1>
              <p className="text-xs text-[#5A5A40]/70 font-semibold hidden sm:block font-serif">
                記錄毛孩健康歷程，結合 Gemini AI 進行多層面生活契合度雙向評估
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seed convenience */}
            <button
              onClick={triggerManualSeed}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 text-xs text-sage-800 font-bold bg-sage-100 border border-sage-300/60 hover:bg-sage-200 rounded-lg transition-colors cursor-pointer"
              title="一鍵匯入4隻寵物與健康診斷預設資料"
            >
              <RefreshCw className="h-3 w-3 text-sage-700" />
              補足預設資料
            </button>

            {/* Auth State Button */}
            {authLoading ? (
              <span className="text-xs text-slate-400 font-medium">認證載入中...</span>
            ) : currentUser ? (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800 leading-none">{currentUser.displayName || "愛心領養人"}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
                </div>
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || ""} className="h-8 w-8 rounded-full ring-2 ring-sage-200" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-sage-200 text-sage-700 flex items-center justify-center font-bold text-xs">
                    {currentUser.displayName?.substring(0, 1) || "P"}
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-[#5A5A40] hover:text-rose-500 rounded-lg hover:bg-red-50 transition"
                  title="登出"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLoginGoogle}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-sage-700 hover:bg-sage-800 rounded-xl transition shadow-sm cursor-pointer"
              >
                <UserIcon className="h-3.5 w-3.5" />
                使用 Google 快速登入
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Pet explorer (4 cols) */}
        <div id="col_left" className="lg:col-span-4 flex flex-col space-y-4 max-h-[85vh] lg:overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-extrabold text-sage-900 tracking-wider uppercase">
              待認養毛孩大廳 ({filteredPets.length})
            </h2>
            <button
              onClick={() => setShowAddPet(true)}
              className="flex items-center gap-1 text-xs font-extrabold text-white bg-sage-700 hover:bg-sage-800 px-3 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-sage-100" />
              登錄新寵物
            </button>
          </div>

          {/* Filtering row */}
          <div className="flex gap-1 bg-sage-200/40 p-1.5 rounded-xl border border-sage-300/40">
            {["All", "Dog", "Cat", "Rabbit"].map((cat) => (
              <button
                key={cat}
                onClick={() => setPetFilter(cat)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  petFilter === cat
                    ? "bg-sage-700 text-white shadow-sm"
                    : "text-sage-800 hover:text-sage-900 hover:bg-white/40"
                }`}
              >
                {cat === "All" ? "全部" : cat === "Dog" ? "🐶 狗" : cat === "Cat" ? "🐱 貓" : "🐰 兔"}
              </button>
            ))}
          </div>

          {/* Pet Listing */}
          <div className="space-y-4 overflow-y-auto">
            {filteredPets.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-sage-200 p-6">
                <p className="text-sage-650 text-lg">🐾</p>
                <p className="text-sm font-serif font-semibold text-sage-800 mt-2">目前無此分類寵物</p>
                <p className="text-xs text-sage-500 mt-1">您可以點擊右上角新增寵物完成登錄</p>
              </div>
            ) : (
              filteredPets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  isSelected={activePet?.id === pet.id}
                  onClick={() => {
                    setActivePet(pet);
                    setShowAddHealth(false);
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Tab details (8 cols) */}
        <div id="col_right" className="lg:col-span-8 flex flex-col space-y-6">
          
          <AnimatePresence mode="wait">
            {activePet ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[32px] border border-sage-200/80 p-6 shadow-sm overflow-hidden flex flex-col space-y-6"
              >
                {/* Pet Banner Brief */}
                <div className="flex flex-col md:flex-row gap-6 border-b border-sage-100 pb-5">
                  <div className="h-32 w-32 rounded-2xl overflow-hidden shadow-inner bg-sage-50 shrink-0 mx-auto md:mx-0 border border-sage-200/60">
                    <img 
                      src={activePet.imageUrl} 
                      alt={activePet.name} 
                      className="h-full w-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <h2 className="text-2xl font-serif font-black text-sage-950">{activePet.name}</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-sage-100 text-sage-800 font-bold border border-sage-200/80 shadow-xs">
                        {activePet.breed}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-semibold text-slate-500 font-serif">
                      <span>類型: <strong className="text-sage-800">{activePet.type === "Dog" ? "狗" : activePet.type === "Cat" ? "貓" : "兔子"}</strong></span>
                      <span>年齡: <strong className="text-sage-800">{activePet.age}</strong></span>
                      <span>性別: <strong className="text-sage-800">{activePet.gender}</strong></span>
                      <span>階段: 
                        <strong className="text-sage-900 ms-1 bg-sage-100 px-1.5 py-0.5 rounded border border-sage-200/65 shadow-xs">
                          {activePet.status === "Available" ? "開放認養" : activePet.status === "Pending" ? "媒合進度中" : "已找到溫馨家園"}
                        </strong>
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed italic pt-1 text-left">
                      「 {activePet.description} 」
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1 justify-center md:justify-start">
                      {(activePet.features || []).map((feat, i) => (
                        <span key={i} className="text-xs bg-sage-50/50 hover:bg-sage-100 border border-sage-200/60 text-sage-850 font-medium px-2 py-0.5 rounded transition">
                          ✨ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sub-tab navigation */}
                <div className="flex border-b border-sage-100">
                  <button
                    onClick={() => setActiveTab("matching")}
                    className={`flex-1 pb-3 text-sm font-bold font-serif transition border-b-2 cursor-pointer ${
                      activeTab === "matching"
                        ? "border-sage-700 text-sage-900"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    🔮 Gemini AI 智能領養媒合
                  </button>
                  <button
                    onClick={() => setActiveTab("health")}
                    className={`flex-1 pb-3 text-sm font-bold font-serif transition border-b-2 cursor-pointer ${
                      activeTab === "health"
                        ? "border-sage-700 text-sage-900"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    🏥 健康履歷紀錄 ({healthLogs.length})
                  </button>
                </div>

                {/* Tab Content Display */}
                <div>
                  
                  {/* TAB 1: AI Matchmaking questionnaire and results */}
                  {activeTab === "matching" && (
                    <div className="space-y-6">
                      
                      {/* Interactive form */}
                      {!aiResult ? (
                        <form onSubmit={handleStartAiMatch} className="space-y-4">
                          <div className="p-4 bg-sage-100/50 rounded-2xl border border-sage-200 text-xs text-sage-900 leading-relaxed font-serif">
                            <h3 className="font-extrabold mb-1 flex items-center gap-1.5 text-sage-800">
                              <Sparkles className="h-4 w-4 text-sage-700 animate-spin" />
                              智慧媒合專屬評估：
                            </h3>
                            <span>請如實反映您的日常生活型態、空間大小與陪伴意願。我們將以 <strong>gemini-3.5-flash</strong> 模型評定與 <strong>{activePet.name}</strong> 的生活配對分數，並提供具體飼主指南與行為調適建議。</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Contact Name */}
                            <div>
                              <label className="block text-xs font-bold text-slate-650 mb-1">領養申請人姓名 *</label>
                              <input
                                type="text"
                                placeholder="例如: 林小明"
                                required
                                value={adopterName}
                                onChange={(e) => setAdopterName(e.target.value)}
                                className="w-full text-xs rounded-lg border border-sage-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 bg-white"
                              />
                            </div>

                            {/* Email */}
                            <div>
                              <label className="block text-xs font-bold text-slate-650 mb-1">電子信箱 *</label>
                              <input
                                type="email"
                                placeholder="example@email.com"
                                required
                                value={adopterEmail}
                                onChange={(e) => setAdopterEmail(e.target.value)}
                                className="w-full text-xs rounded-lg border border-sage-200 px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 bg-white"
                              />
                            </div>

                            {/* Phone */}
                            <div>
                              <label className="block text-xs font-bold text-slate-650 mb-1">手機號碼 (選填)</label>
                              <input
                                type="tel"
                                placeholder="..."
                                value={adopterPhone}
                                onChange={(e) => setAdopterPhone(e.target.value)}
                                className="w-full text-xs rounded-lg border border-sage-200 px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Housing Select */}
                            <div>
                              <label className="block text-xs font-bold text-slate-650 mb-1">
                                🏠 您的居住居住空間
                              </label>
                              <select
                                value={housing}
                                onChange={(e) => setHousing(e.target.value)}
                                className="w-full text-xs rounded-lg border border-sage-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                              >
                                <option value="一般公寓 (套房/無陽台)">一般公寓 (套房/無陽台)</option>
                                <option value="中大坪數大樓 (有前後陽台)">中大坪數大樓 (有前後陽台)</option>
                                <option value="透天厝/別墅 (空間極為寬廣)">透天厝/別墅 (空間極為寬廣)</option>
                                <option value="附帶封閉式私人庭院/草皮">附帶封閉式私人庭院/草皮</option>
                              </select>
                            </div>

                            {/* Working situation */}
                            <div>
                              <label className="block text-xs font-bold text-slate-650 mb-1">
                                💼 工作型態 (陪伴時間)
                              </label>
                              <select
                                value={workingHours}
                                onChange={(e) => setWorkingHours(e.target.value)}
                                className="w-full text-xs rounded-lg border border-sage-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                              >
                                <option value="全遠端工作 / 自由職業者 (時時有人陪伴)">全遠端工作 / 自由職業者 (時時陪伴)</option>
                                <option value="朝九晚五一般工作族 (每日規律外出8小時)">朝九晚五 (每日規律外出8-9小時)</option>
                                <option value="排班制 / 晚班工作族">排班制 / 晚班工作族</option>
                                <option value="經常需要中短期出差 (需要交由寵物旅館託管)">經常出差/時程彈性大</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Leisure level */}
                            <div>
                              <label className="block text-xs font-bold text-slate-650 mb-1">
                                🏃‍♂️ 您的日常活動量與散步意願
                              </label>
                              <select
                                value={activityLevel}
                                onChange={(e) => setActivityLevel(e.target.value)}
                                className="w-full text-xs rounded-lg border border-sage-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                              >
                                <option value="高強度運動 (每天慢跑2小時、週末戶外登山)">高強度運動 (每日慢跑/活力玩鬧)</option>
                                <option value="定期散步散心 (每天清晨與傍晚各散步30分鐘)">定期散步 (每日2次適中散步)</option>
                                <option value="室內為主 (以玩玩具、室內逗弄為主，時間較短)">室內逗弄 (休閒安靜)</option>
                              </select>
                            </div>

                            {/* Other pets checkbox */}
                            <div className="flex items-center gap-2 pt-6">
                              <input
                                id="other_pets"
                                type="checkbox"
                                checked={hasOtherPets}
                                onChange={(e) => setHasOtherPets(e.target.checked)}
                                className="h-4 w-4 rounded border-sage-300 text-sage-700 focus:ring-sage-500"
                              />
                              <label htmlFor="other_pets" className="text-xs font-bold text-[#5A5A40] cursor-pointer font-serif">
                                🐶 貓犬相容性：我目前家中有其他毛孩 (需考量適應相處期)
                              </label>
                            </div>
                          </div>

                          {/* Message motivations */}
                          <div>
                            <label className="block text-xs font-bold text-slate-650 mb-1">
                              自我介紹與領養動機 (例如: 曾否養過、為什麼想帶他回家)
                            </label>
                            <textarea
                              rows={3}
                              placeholder="親愛的收容志工，我們全家都很喜歡他，我們過去曾養過貓咪......"
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              className="w-full text-xs rounded-lg border border-sage-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-550 bg-white"
                            />
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={aiLoading}
                              className="flex items-center gap-1.5 px-6 py-3.5 text-xs font-extrabold text-white bg-sage-700 hover:bg-sage-800 rounded-xl shadow-md cursor-pointer disabled:opacity-75 transition-all"
                            >
                              <Sparkles className="h-4 w-4 text-sage-100" />
                              {aiLoading ? "Gemini 專家分析中 (請稍候)..." : `與 ${activePet.name} 進行 AI 智慧配對`}
                            </button>
                          </div>
                        </form>
                      ) : (
                        
                        // Result page
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-sage-50/50 border border-sage-200/80 rounded-2xl p-5 md:p-6 space-y-5"
                        >
                          <div className="flex border-b border-sage-200 pb-4 justify-between items-center">
                            <div>
                              <h3 className="text-sm font-serif font-black text-sage-900 flex items-center gap-2">
                                <Award className="h-5 w-5 text-amber-600" />
                                智慧評估配對結果出來了！
                              </h3>
                              <p className="text-[10px] text-[#5A5A40] mt-1 font-serif">
                                已針對 <strong>{activePet.name}</strong> 與 <strong>{adopterName}</strong> 的生活環境完成分析
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setAiResult(null);
                                setSubmittedInquiryId(null);
                              }}
                              className="text-xs bg-white text-sage-800 border border-sage-200 hover:bg-sage-50 px-3 py-1.5 rounded-lg transition font-bold cursor-pointer"
                            >
                              重新評估 ↺
                            </button>
                          </div>

                          <div className="flex flex-col md:flex-row gap-6 items-center">
                            {/* Score Display Wheel */}
                            <div className="relative flex items-center justify-center shrink-0">
                              <svg className="w-24 h-24 transform -rotate-90">
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="42"
                                  className="text-sage-100"
                                  strokeWidth="8"
                                  stroke="currentColor"
                                  fill="transparent"
                                />
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="42"
                                  className="text-sage-700"
                                  strokeWidth="8"
                                  strokeDasharray={2 * Math.PI * 42}
                                  strokeDashoffset={(2 * Math.PI * 42) * (1 - aiResult.aiScore / 100)}
                                  strokeLinecap="round"
                                  stroke="currentColor"
                                  fill="transparent"
                                />
                              </svg>
                              <div className="absolute text-center">
                                <span className="text-2xl font-black text-sage-955 font-serif">{aiResult.aiScore}</span>
                                <span className="text-[10px] text-sage-700 font-bold block leading-none">速配度分</span>
                              </div>
                            </div>

                            {/* Brief interpretation */}
                            <div className="flex-1 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-xl border border-sage-200/50 shadow-inner max-h-60 overflow-y-auto">
                              {aiResult.aiFeedback}
                            </div>
                          </div>

                          {!submittedInquiryId ? (
                            <div className="flex flex-col sm:flex-row gap-2 justify-end/between pt-3 border-t border-sage-200">
                              <p className="text-[10px] text-slate-400 self-center mb-2 sm:mb-0">
                                💡 這個評分是基於 AI 諮詢。若符合您的意願，請點擊「確定認養建立檔案」回傳給收容志工。
                              </p>
                              <button
                                onClick={handleFinalSubmitApplication}
                                className="px-5 py-2.5 text-xs font-black text-white bg-sage-700 hover:bg-sage-800 rounded-lg flex items-center gap-1.5 shadow-sm transition justify-center cursor-pointer"
                              >
                                <FileCheck className="h-4 w-4 text-sage-100" />
                                確定並送出認養意向 ➜
                              </button>
                            </div>
                          ) : (
                            <div className="bg-sage-100/60 p-4 border border-sage-350 rounded-xl text-center flex flex-col items-center gap-2">
                              <CheckCircle2 className="h-6 w-6 text-sage-700" />
                              <div>
                                <h4 className="text-xs font-black text-sage-900 font-serif">認養意向已成功登入系統！</h4>
                                <p className="text-[10px] text-sage-850 mt-0.5">
                                  紀錄碼：<code className="bg-sage-200/60 font-mono px-1 rounded text-sage-900">{submittedInquiryId}</code>。您隨時可在下方的媒合案件追蹤查看志工審查狀態。
                                </p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: HEALTH TIMELINE & SUBMIT LOG */}
                  {activeTab === "health" && (
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-serif font-extrabold text-sage-850 uppercase tracking-widest">
                          歷史健診診斷與體重歷程 ({healthLogs.length})
                        </h3>
                        {!showAddHealth && (
                          <button
                            onClick={() => setShowAddHealth(true)}
                            className="text-xs text-sage-700 font-extrabold hover:text-sage-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 text-sage-750" />
                            新增健康診斷記錄
                          </button>
                        )}
                      </div>

                      {showAddHealth && (
                        <AddHealthLogForm
                          petId={activePet.id}
                          petName={activePet.name}
                          onSuccess={() => {
                            setShowAddHealth(false);
                          }}
                          onCancel={() => setShowAddHealth(false)}
                        />
                      )}

                      {/* Health Logs List */}
                      <div className="space-y-3 mt-2">
                        {healthLogs.length === 0 ? (
                          <div className="text-center py-10 bg-sage-50/50 rounded-2xl border border-sage-200 p-6">
                            <Activity className="h-5 w-5 text-sage-400 mx-auto" />
                            <p className="text-xs text-sage-700 font-semibold mt-2">目前尚無這隻毛孩的健康回報歷程</p>
                            <button
                              onClick={() => setShowAddHealth(true)}
                              className="text-xs text-sage-800 hover:text-sage-955 underline font-black mt-1 cursor-pointer"
                            >
                              立即新增第一條健康數據記錄
                            </button>
                          </div>
                        ) : (
                          healthLogs.map((log) => (
                            <div
                              key={log.id}
                              className="bg-sage-100/30 rounded-xl p-4 border border-sage-200/50 shadow-sm flex flex-col sm:flex-row sm:items-start gap-4"
                            >
                              <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1 p-2 bg-white rounded-lg border border-sage-200/60 font-mono text-center shrink-0">
                                <span className="text-[10px] text-sage-700 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  日期
                                </span>
                                <span className="text-xs font-extrabold text-slate-800">{log.date}</span>
                                <span className="hidden sm:inline border-t border-sage-200 my-1 w-full"></span>
                                <span className="text-[10px] text-sage-700 flex items-center gap-1">
                                  <Scale className="h-3 w-3" />
                                  重
                                </span>
                                <span className="text-xs font-black text-rose-700">{log.weight} kg</span>
                              </div>

                              <div className="flex-1 space-y-2 text-left">
                                <p className="text-xs font-bold text-[#333] leading-snug">
                                  👩‍⚕️ 診斷評估/照護醫囑:
                                </p>
                                <p className="text-xs text-[#444] line-clamp-4 leading-relaxed font-sans">
                                  {log.medicalNotes}
                                </p>

                                <div className="flex flex-wrap gap-4 text-[10px] text-[#5A5A40] border-t border-dashed border-sage-300 pt-2 font-medium">
                                  <span>💉 疫苗情形：<strong className="text-slate-800">{log.vaccinationStatus}</strong></span>
                                  <span>📝 記錄人：<strong className="text-slate-800">{log.loggedBy}</strong></span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                </div>

              </motion.div>
            ) : (
              <div className="bg-white rounded-[32px] border border-sage-200 p-12 text-center shadow-inner flex flex-col items-center justify-center py-24">
                <div className="text-6xl mb-4 animate-bounce">🐹</div>
                <h3 className="font-serif text-xl font-bold text-sage-900">尚未選取認養寵物</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-sm">
                  請由左側毛孩清單選取感興趣的寵物，您即可瀏覽其健康數據歷程並與其進行智慧媒合互聯！
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* BELOW BLOCK: Match Status Inquiries permanent feed */}
          <div id="section_feed" className="bg-white rounded-[32px] border border-sage-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-sage-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-serif font-extrabold text-sage-900 flex items-center gap-1.55">
                  <FileCheck className="h-4 w-4 text-sage-700" />
                  認養申請與媒合案件追蹤 ({inquiries.length})
                </h3>
                <p className="text-[10px] text-sage-600 mt-1">
                  案件狀態：待預審 ➜ 已聯絡 ➜ 成功契合 / 未符合。您可以點擊狀態標籤，模擬志工進行流程審核。
                </p>
              </div>
            </div>

            <MatchHistory
              inquiries={inquiries}
              onRefresh={() => {
                // Instantly sync
              }}
            />
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#2D2D24] text-sage-300 px-6 py-8 border-t border-sage-800 text-center text-xs mt-12 space-y-2">
        <p className="font-serif font-bold text-sage-100">🐾 Firebase 雙向寵物媒合審查與健康狀況存取系統 🐾</p>
        <p className="text-sage-300/80">
          由 Google AI Studio Build 構建，透過雙端 Express 與 Vite 結合 Gemini 全功能伺服端安全 proxy 加密。
        </p>
        <p className="text-sage-400/65 font-mono text-[10px]">
          專案 ID: rege-4b2a8 | 寵物健康與愛心媒合大廳
        </p>
      </footer>

      {/* NEW PET MODAL */}
      {showAddPet && (
        <AddPetModal
          onClose={() => setShowAddPet(false)}
          onSuccess={() => {
            setShowAddPet(false);
          }}
        />
      )}

    </div>
  );
}
