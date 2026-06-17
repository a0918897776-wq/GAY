import React from "react";
import { Pet } from "../types";

interface PetCardProps {
  key?: string;
  pet: Pet;
  isSelected: boolean;
  onClick: () => void;
}

export default function PetCard({ pet, isSelected, onClick }: PetCardProps) {
  const getStatusBadge = (status: Pet["status"]) => {
    switch (status) {
      case "Available":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2.5 py-1 text-xs font-extrabold text-sage-700 ring-1 ring-sage-700/20 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-500"></span>
            待認養
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-800 ring-1 ring-orange-600/20 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
            媒合中
          </span>
        );
      case "Adopted":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-extrabold text-zinc-650 ring-1 ring-zinc-500/10 shadow-sm">
            <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full"></span>
            已領養
          </span>
        );
    }
  };

  const getPetTypeBadge = (type: string) => {
    const isDog = type.toLowerCase() === "dog";
    const isCat = type.toLowerCase() === "cat";
    return (
      <span className={`inline-block px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg shadow-sm ${
        isDog ? "bg-amber-50 text-amber-900 border border-amber-200/60" :
        isCat ? "bg-indigo-50 text-indigo-950 border border-indigo-200/60" :
        "bg-teal-50 text-teal-980 border border-teal-200/60"
      }`}>
        {type === "Dog" ? "🐶 狗狗" : type === "Cat" ? "🐱 貓咪" : "🐰 兔兔"}
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-[24px] border transition-all duration-300 cursor-pointer ${
        isSelected
          ? "border-sage-700 ring-2 ring-sage-300 shadow-md bg-white translate-y-[-2px]"
          : "border-sage-300/40 bg-white hover:border-sage-300 hover:shadow-md hover:translate-y-[-1px]"
      }`}
    >
      <div className="relative h-44 w-full bg-slate-50 overflow-hidden">
        <img
          src={pet.imageUrl || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=60"}
          alt={pet.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {getStatusBadge(pet.status)}
        </div>
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          {getPetTypeBadge(pet.type)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-sans text-lg font-bold text-slate-800 flex items-center gap-1.5">
            {pet.name}
            {pet.gender === "母 (Female)" ? (
              <span className="text-pink-500 text-sm">♀</span>
            ) : (
              <span className="text-indigo-500 text-sm">♂</span>
            )}
          </h3>
          <span className="text-xs text-slate-400 font-mono">{pet.age}</span>
        </div>
        
        <p className="text-xs text-slate-500 mb-2 font-medium">
          品種: <span className="text-slate-700">{pet.breed}</span>
        </p>

        <p className="text-xs text-slate-500 line-clamp-2 mb-3 pr-2 flex-grow">
          {pet.description}
        </p>

        <div className="flex flex-wrap gap-1 mt-auto">
          {(pet.features || []).slice(0, 3).map((feat, i) => (
            <span
              key={i}
              className="inline-block bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 text-[10px] text-slate-600 font-medium"
            >
              {feat}
            </span>
          ))}
          {(pet.features || []).length > 3 && (
            <span className="inline-block bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 text-[10px] text-slate-400">
              +{pet.features.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
