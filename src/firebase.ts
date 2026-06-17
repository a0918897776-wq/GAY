import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  getDocFromServer,
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy, 
  limit, 
  onSnapshot 
} from "firebase/firestore";

import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Mandatory error handler conforming to firebase-integration guidelines
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Info: ', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on initialization
export async function testConnection(): Promise<boolean> {
  try {
    // Attempt load from server for test collection
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Firestore connection verified successfully.");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.", error);
    } else {
      console.log("Firestore connection test done (might be empty/not found, which is normal).");
    }
    return false;
  }
}

// Seeding Default Pets if empty
export const DEFAULT_PETS = [
  {
    id: "pet_mochi",
    name: "麻糬 (Mochi)",
    type: "Cat",
    breed: "米克斯 (Mixed Tabby)",
    age: "8 個月 (8 Months)",
    gender: "公 (Male)",
    description: "超級愛撒嬌的橘白貓，對人類非常親切。喜歡抱抱、呼嚕嚕，還有追雷射筆。是個吃飯非常踴躍的貪吃鬼，適合溫馨熱鬧的家庭。",
    imageUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=60",
    status: "Available",
    features: ["親人撒嬌", "活潑好動", "親貓貓", "貪吃好餵"],
    createdAt: new Date().toISOString()
  },
  {
    id: "pet_happy",
    name: "Happy",
    type: "Dog",
    breed: "黃金獵犬 (Golden Retriever)",
    age: "2 歲 (2 Years)",
    gender: "公 (Male)",
    description: "性格沉穩穩重、親和力十足的黃金大男孩。懂得坐下、握手等基本指令，熱愛戶外接球遊戲。適合有定時戶外散步習慣的活力家庭。",
    imageUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=60",
    status: "Available",
    features: ["溫和親人", "聰明聽話", "活力接球", "親其他狗"],
    createdAt: new Date().toISOString()
  },
  {
    id: "pet_snowball",
    name: "雪球 (Snowball)",
    type: "Rabbit",
    breed: "雷克斯兔 (Rex Rabbit)",
    age: "1 歲 (1 Year)",
    gender: "母 (Female)",
    description: "雪白毛茸茸、耳朵直立的小精靈。個性稍微安靜內斂，但只要拿出乾草甜點，就會主動蹦蹦跳跳靠近。適合喜歡安靜陪伴、公寓生活的精緻飼主。",
    imageUrl: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&auto=format&fit=crop&q=60",
    status: "Available",
    features: ["安靜乖巧", "觸感柔軟", "愛吃甜草", "適合公寓"],
    createdAt: new Date().toISOString()
  },
  {
    id: "pet_kuro",
    name: "黑嚕嚕 (Kuro)",
    type: "Dog",
    breed: "台灣犬 (Formosan Mountain Dog)",
    age: "1 歲半 (1.5 Years)",
    gender: "母 (Female)",
    description: "身材精實、毛色烏黑閃亮的土狗女孩。特別警覺且忠心耿耿，初期面對陌生人會有些微害羞，一旦熟絡後會是無比貼心可靠的大寶貝。",
    imageUrl: "https://images.unsplash.com/photo-1534361960057-19889db9621e?w=500&auto=format&fit=crop&q=60",
    status: "Available",
    features: ["忠心守護", "敏捷活潑", "親熟人", "體力極佳"],
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_HEALTH_LOGS = [
  {
    id: "log_1",
    petId: "pet_mochi",
    date: "2026-05-10",
    weight: 3.2,
    vaccinationStatus: "已施打三合一疫苗、狂犬病疫苗。",
    medicalNotes: "食慾極佳，體重發育良好。已完成體內外驅蟲作業。",
    loggedBy: "徐愛心 獸醫",
    createdAt: new Date().toISOString()
  },
  {
    id: "log_2",
    petId: "pet_mochi",
    date: "2026-06-12",
    weight: 3.6,
    vaccinationStatus: "無疫苗施打項目",
    medicalNotes: "例行年度體檢：耳道乾淨無發炎，心肺音正常，精神奕奕。",
    loggedBy: "林護理師",
    createdAt: new Date().toISOString()
  },
  {
    id: "log_3",
    petId: "pet_happy",
    date: "2026-04-18",
    weight: 29.5,
    vaccinationStatus: "已施打十合一疫苗、萊姆病疫苗。",
    medicalNotes: "體格健壯。關節保養狀況優良，有適當補充葡萄糖胺。",
    loggedBy: "王醫師",
    createdAt: new Date().toISOString()
  },
  {
    id: "log_4",
    petId: "pet_snowball",
    date: "2026-05-30",
    weight: 1.8,
    vaccinationStatus: "無",
    medicalNotes: "牙齒咬合正常，無過長現象。排便正常、形狀圓潤乾燥。",
    loggedBy: "周義工",
    createdAt: new Date().toISOString()
  }
];

// Helper to seed database
export async function seedBaseDataIfEmpty() {
  try {
    const querySnapshot = await getDocs(collection(db, "pets"));
    if (querySnapshot.empty) {
      console.log("Pets collection is empty. Seeding baseline pet data...");
      for (const pet of DEFAULT_PETS) {
        await setDoc(doc(db, "pets", pet.id), pet);
      }
      
      const logsSnapshot = await getDocs(collection(db, "health_logs"));
      if (logsSnapshot.empty) {
        console.log("Health logs collection is empty. Seeding baseline logs...");
        for (const log of DEFAULT_HEALTH_LOGS) {
          await setDoc(doc(db, "health_logs", log.id), log);
        }
      }
      console.log("Database seeded successfully with mockup entries.");
    }
  } catch (error) {
    console.error("Error seeding pets:", error);
  }
}
