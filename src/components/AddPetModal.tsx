import React, { useState } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { X, Plus, AlertCircle, Sparkles, Smile } from "lucide-react";

interface AddPetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPetModal({ onClose, onSuccess }: AddPetModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("公 (Male)");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [featuresInput, setFeaturesInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preset default photos for convenience
  const defaultPhotos: Record<string, string> = {
    Dog: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=60",
    Cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=60",
    Rabbit: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&auto=format&fit=crop&q=60"
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !breed.trim() || !age.trim()) {
      setError("請完整填寫寵物姓名、品種與年齡資料");
      return;
    }

    setLoading(true);
    setError(null);
    const path = "pets";

    try {
      // Split tags by comma or space
      const features = featuresInput
        ? featuresInput.split(/[,，\s]+/).filter((t) => t.length > 0)
        : ["乖巧懂事", "親人溫馴"];

      const finalImageUrl = imageUrl.trim() || defaultPhotos[type] || defaultPhotos.Dog;
      
      const petId = "pet_" + Date.now();
      const payload = {
        id: petId,
        name: name.trim(),
        type,
        breed: breed.trim(),
        age: age.trim(),
        gender,
        description: description.trim() || "這隻可愛的寶貝正在等待溫暖的避風港，歡迎聯絡了解更多故事！",
        imageUrl: finalImageUrl,
        status: "Available" as const,
        features,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, path, petId), payload);
      onSuccess();
    } catch (err: any) {
      setError("上傳至資料庫時出錯，請檢視 Firebase rules 設定。");
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐾</span>
            <h3 className="font-serif text-lg font-bold text-sage-900">登錄待認養寵物資料</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form Scroll container */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              寵物類型 *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Dog", "Cat", "Rabbit"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    type === t
                      ? "border-sage-700 bg-sage-100 text-sage-900 shadow-sm"
                      : "border-sage-200 bg-white text-sage-600 hover:bg-sage-50"
                  }`}
                >
                  {t === "Dog" ? "🐶 狗狗" : t === "Cat" ? "🐱 貓咪" : "🐰 兔兔"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                寵物姓名 *
              </label>
              <input
                type="text"
                placeholder="例如: 圓圓"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Breed */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                品種 *
              </label>
              <input
                type="text"
                placeholder="例如: 柴犬 / 米克斯"
                required
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                年齡大小 *
              </label>
              <input
                type="text"
                placeholder="例如: 3個月 / 2歲"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                性別 *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="公 (Male)">公 (Male)</option>
                <option value="母 (Female)">母 (Female)</option>
              </select>
            </div>
          </div>

          {/* Photo URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
              <span>照片連結 (選填，留空將使用預設精美圖片)</span>
            </label>
            <input
              type="url"
              placeholder="請輸入 Unsplash 或其他圖片 URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Features Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Smile className="h-3.5 w-3.5 text-slate-400" />
              個性特質標籤 (用英文/中文逗號或空格分隔)
            </label>
            <input
              type="text"
              placeholder="例如: 親人, 活潑, 適應力強, 不愛叫"
              value={featuresInput}
              onChange={(e) => setFeaturesInput(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              寵物故事/個性描述 *
            </label>
            <textarea
              rows={4}
              placeholder="請描述他的流浪經歷、親人程度、特徵或是需要注意的事項..."
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Footer inside modal */}
          <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-xs font-semibold text-white bg-sage-700 hover:bg-sage-800 focus:ring-2 focus:ring-sage-400 px-5 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loading ? "登錄中..." : "確認登錄"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
