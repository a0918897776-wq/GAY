export interface Pet {
  id: string;
  name: string;
  type: string; // e.g. "Cat", "Dog", "Rabbit", "Other"
  breed: string;
  age: string;
  gender: string; // "公 (Male)" | "母 (Female)"
  description: string;
  imageUrl: string;
  status: "Available" | "Pending" | "Adopted";
  features: string[];
  createdAt: string;
}

export interface HealthLog {
  id: string;
  petId: string;
  date: string; // YYYY-MM-DD
  weight: number; // in kg
  vaccinationStatus: string;
  medicalNotes: string;
  loggedBy: string;
  createdAt: string;
}

export interface MatchInquiry {
  id: string;
  petId: string;
  petName: string;
  adopterName: string;
  adopterEmail: string;
  adopterPhone: string;
  housing: string;
  workingHours: string;
  activityLevel: string;
  hasOtherPets: boolean;
  message: string;
  aiScore: number;
  aiFeedback: string;
  status: "Pending" | "Contacted" | "Matched" | "Declined";
  createdAt: string;
}
