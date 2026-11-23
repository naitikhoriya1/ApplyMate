export interface ContactInfo {
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
}

export interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  skills?: string[];
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  bio?: string;
  contact: ContactInfo;
  education: Education[];
  experience: Experience[];
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

