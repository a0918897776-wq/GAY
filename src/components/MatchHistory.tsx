import React from "react";
import { MatchInquiry } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { MessageSquare, Award, CheckCircle2, User, Phone, Mail, Home, Clock, Trash2, ShieldAlert } from "lucide-react";

interface MatchHistoryProps {
  inquiries: MatchInquiry[];
  onRefresh: () => void;
}

export default function MatchHistory({ inquiries, onRefresh }: MatchHistoryProps) {
  
  const handleStatusChange = async (id: string, currentStatus: MatchInquiry["status"]) => {
    // Standard progression status
    const statusCycle: MatchInquiry["status"][] = ["Pending", "Contacted", "Matched", "Declined"];
    const nextIndex = (statusCycle.indexOf(currentStatus) + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    const path = `match_inquiries/${id}`;
    try {
      await updateDoc(doc(db, "match_inquiries", id), {
        status: nextStatus
      });
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("確定要刪除這筆媒合意向記錄嗎？此動作將無法復原。")) {
      return;
    }
    const path = `match_inquiries/${id}`;
    try {
      await deleteDoc(doc(db, "match_inquiries", id));
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-sage-100 text-sage-900 border-sage-300";
    if (score >= 60) return "bg-amber-50 text-amber-900 border-amber-200";
    return "bg-rose-50 text-rose-800 border-rose-200";
  };

  const getStatusBadge = (status: MatchInquiry["status"]) => {
    switch (status) {
      case "Pending":
        return <span className="bg-sage-50/80 text-sage-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-sage-300 cursor-pointer hover:bg-sage-100">待預審 (Pending) ⇄</span>;
      case "Contacted":
        return <span className="bg-[#D4D4C8] text-sage-900 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-sage-400/40 cursor-pointer hover:opacity-90">已聯絡 (Contacted) ⇄</span>;
      case "Matched":
        return <span className="bg-sage-700 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-sage-800 cursor-pointer hover:bg-sage-800">成功契合 (Matched) 🎉⇄</span>;
      case "Declined":
        return <span className="bg-rose-50 text-rose-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-rose-200 cursor-pointer hover:bg-rose-100">不甚合適 (Declined) ⇄</span>;
    }
  };

  if (inquiries.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 p-8">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-sm text-slate-500 font-medium">目前尚無認養媒合意向申請</p>
        <p className="text-xs text-slate-400 mt-1">填寫右方「AI 智慧生活型態媒合配對」並送出意向，即可看見歷史評估報告與狀態追蹤！</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {inquiries.map((inq) => (
        <div
          key={inq.id}
          className="relative bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow transition-all group"
        >
          {/* Header Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sage-100 pb-3 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 font-serif">
                對像：
                <span className="text-sage-800 font-sans font-black bg-sage-200/50 px-2.5 py-0.5 rounded-md border border-sage-300/40">
                   {inq.petName}
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Status Badge clickable to toggle status */}
              <button
                type="button"
                onClick={() => handleStatusChange(inq.id, inq.status)}
                title="點擊切換認養審核狀態度"
                className="focus:outline-none"
              >
                {getStatusBadge(inq.status)}
              </button>

              <button
                onClick={() => handleDelete(inq.id)}
                className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition"
                title="刪除紀錄"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Adopter Demographics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>
                <strong className="text-slate-700">申請者：</strong> {inq.adopterName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 font-mono">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{inq.adopterEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 font-mono">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>{inq.adopterPhone}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-sage-100/40 border border-sage-200/40 rounded-xl p-3 mb-4 text-[#333]">
            <div>
              <span className="font-semibold block text-slate-700 mb-0.5">🏡 居住型態：</span>
              <span>{inq.housing}</span>
            </div>
            <div>
              <span className="font-semibold block text-slate-700 mb-0.5">💼 陪伴與活動量：</span>
              <span>
                {inq.workingHours} / {inq.activityLevel} / {inq.hasOtherPets ? "家中有其他毛孩" : "目前獨享無毛孩"}
              </span>
            </div>
            {inq.message && (
              <div className="col-span-1 sm:col-span-2 border-t border-slate-200/40 pt-2 mt-1">
                <span className="font-semibold block text-slate-700 mb-0.5">✉️ 領養自述/給毛孩的話：</span>
                <p className="italic text-slate-500">{inq.message}</p>
              </div>
            )}
          </div>

          {/* AI Result Block */}
          <div className="border border-sage-200 rounded-xl overflow-hidden">
            <div className="bg-sage-100/60 px-4 py-2 flex items-center justify-between border-b border-sage-200/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sage-900">
                <Award className="h-4 w-4 text-amber-600" />
                <span>Gemini AI 智能匹配評估指標</span>
              </div>
              <div className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getScoreColor(inq.aiScore)}`}>
                ▲ 媒合度: {inq.aiScore} 分
              </div>
            </div>
            <div className="p-4 bg-white text-xs text-[#333] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {inq.aiFeedback}
            </div>
          </div>

          {/* Creation date */}
          <div className="flex justify-between items-center mt-3 text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>申請時間：{new Date(inq.createdAt).toLocaleString("zh-TW")}</span>
            </div>
            <div className="text-slate-400 text-[9px] font-mono select-all">
              REF_ID: {inq.id}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
