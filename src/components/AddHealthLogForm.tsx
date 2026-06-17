import React, { useState } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { PlusCircle, Activity, Scale, Calendar, User, FileText, Check, AlertCircle } from "lucide-react";

interface AddHealthLogFormProps {
  petId: string;
  petName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddHealthLogForm({ petId, petName, onSuccess, onCancel }: AddHealthLogFormProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [weight, setWeight] = useState<string>("");
  const [vaccinationStatus, setVaccinationStatus] = useState<string>("");
  const [medicalNotes, setMedicalNotes] = useState<string>("");
  const [loggedBy, setLoggedBy] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) {
      setError("請填寫體重數據");
      return;
    }
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setError("體重必須是個大於 0 的數字");
      return;
    }

    setLoading(true);
    setError(null);
    const path = "health_logs";

    try {
      const payload = {
        petId,
        date,
        weight: weightNum,
        vaccinationStatus: vaccinationStatus.trim() || "無施打疫苗記錄",
        medicalNotes: medicalNotes.trim() || "日常體檢，狀態正常。",
        loggedBy: loggedBy.trim() || "志工小組",
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, path), payload);
      onSuccess();
    } catch (err: any) {
      setError("寫入 Firestore 失敗，請確認資料庫權限或網路狀況。");
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-sage-100/40 rounded-2xl border border-sage-200/60 p-5 mt-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-sage-200/50 pb-3">
        <Activity className="h-5 w-5 text-sage-700" />
        <h4 className="text-sm font-serif font-extrabold text-sage-955">為 {petName} 新增健康狀況記錄</h4>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            診斷/記錄日期 *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Weight Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-slate-400" />
            體重 (kg) *
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="例如: 3.5"
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* vaccination field */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          疫苗施打項目 (選填)
        </label>
        <input
          type="text"
          placeholder="例如: 已接種狂犬病疫苗、貓三合一第二劑"
          value={vaccinationStatus}
          onChange={(e) => setVaccinationStatus(e.target.value)}
          className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* medical notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          健康狀態說明/醫囑 *
        </label>
        <textarea
          rows={3}
          placeholder="例如: 貓咪精神良好，食慾旺盛。耳朵需每日清理。"
          required
          value={medicalNotes}
          onChange={(e) => setMedicalNotes(e.target.value)}
          className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* recorder name */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-slate-400" />
          記錄人/獸醫簽名 *
        </label>
        <input
          type="text"
          placeholder="例如: 王醫師 或 志工小陳"
          required
          value={loggedBy}
          onChange={(e) => setLoggedBy(e.target.value)}
          className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-sage-700 hover:text-sage-900 bg-white border border-sage-300 hover:bg-sage-50 px-3.5 py-2 rounded-lg cursor-pointer transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="text-xs font-semibold text-white bg-sage-700 hover:bg-sage-800 focus:ring-2 focus:ring-sage-400 px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? "寫入中..." : "確認送出"}
        </button>
      </div>
    </form>
  );
}
