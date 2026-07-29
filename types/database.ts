export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          role: "candidate" | "employer";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "candidate" | "employer";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "candidate" | "employer";
          created_at?: string;
        };
      };
      candidate_profiles: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          location: string | null;
          bio: string | null;
          github_url: string | null;
          linkedin_url: string | null;
          seeking: "internship" | "full_time";
          job_title: string | null;
          years_exp: number | null;
          resume_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          location?: string | null;
          bio?: string | null;
          github_url?: string | null;
          linkedin_url?: string | null;
          seeking: "internship" | "full_time";
          job_title?: string | null;
          years_exp?: number | null;
          resume_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          name?: string;
          location?: string | null;
          bio?: string | null;
          github_url?: string | null;
          linkedin_url?: string | null;
          seeking?: "internship" | "full_time";
          job_title?: string | null;
          years_exp?: number | null;
          resume_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      skills: {
        Row: {
          id: string;
          name: string;
          category: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
        };
      };
      candidate_skills: {
        Row: {
          id: string;
          candidate_id: string;
          skill_id: string;
          level: "beginner" | "mid" | "senior";
          verified: boolean;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          skill_id: string;
          level: "beginner" | "mid" | "senior";
          verified?: boolean;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          skill_id?: string;
          level?: "beginner" | "mid" | "senior";
          verified?: boolean;
        };
      };
      qualifications: {
        Row: {
          id: string;
          candidate_id: string;
          type: "education" | "certificate";
          institution: string;
          title: string;
          field_of_study: string | null;
          start_date: string | null;
          end_date: string | null;
          is_current: boolean;
          grade: string | null;
          document_url: string | null;
          credential_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          type: "education" | "certificate";
          institution: string;
          title: string;
          field_of_study?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          grade?: string | null;
          document_url?: string | null;
          credential_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          type?: "education" | "certificate";
          institution?: string;
          title?: string;
          field_of_study?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          grade?: string | null;
          document_url?: string | null;
          credential_url?: string | null;
          created_at?: string;
        };
      };
      work_experiences: {
        Row: {
          id: string;
          candidate_id: string;
          company: string;
          title: string;
          location: string | null;
          start_date: string;
          end_date: string | null;
          is_current: boolean;
          description: string | null;
          employment_type: "full_time" | "part_time" | "internship" | "contract";
          document_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          company: string;
          title: string;
          location?: string | null;
          start_date: string;
          end_date?: string | null;
          is_current?: boolean;
          description?: string | null;
          employment_type: "full_time" | "part_time" | "internship" | "contract";
          document_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          company?: string;
          title?: string;
          location?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_current?: boolean;
          description?: string | null;
          employment_type?: "full_time" | "part_time" | "internship" | "contract";
          document_url?: string | null;
          created_at?: string;
        };
      };
      portfolio_items: {
        Row: {
          id: string;
          candidate_id: string;
          title: string;
          description: string | null;
          url: string | null;
          tags: string[];
          date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          title: string;
          description?: string | null;
          url?: string | null;
          tags?: string[];
          date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          title?: string;
          description?: string | null;
          url?: string | null;
          tags?: string[];
          date?: string | null;
          created_at?: string;
        };
      };
      coach_sessions: {
        Row: {
          id: string;
          candidate_id: string;
          messages: Json[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          messages?: Json[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          messages?: Json[];
          created_at?: string;
          updated_at?: string;
        };
      };
      career_nodes: {
        Row: {
          id: string;
          title: string;
          level: "entry" | "mid" | "senior" | "lead" | "executive";
          avg_salary_myr_min: number;
          avg_salary_myr_max: number;
          typical_years_in_role: number;
          category: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          level: "entry" | "mid" | "senior" | "lead" | "executive";
          avg_salary_myr_min: number;
          avg_salary_myr_max: number;
          typical_years_in_role?: number;
          category: string;
          description?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          level?: "entry" | "mid" | "senior" | "lead" | "executive";
          avg_salary_myr_min?: number;
          avg_salary_myr_max?: number;
          typical_years_in_role?: number;
          category?: string;
          description?: string | null;
        };
      };
      career_edges: {
        Row: {
          id: string;
          from_node_id: string;
          to_node_id: string;
          avg_transition_months: number;
          skill_gaps: string[];
        };
        Insert: {
          id?: string;
          from_node_id: string;
          to_node_id: string;
          avg_transition_months?: number;
          skill_gaps?: string[];
        };
        Update: {
          id?: string;
          from_node_id?: string;
          to_node_id?: string;
          avg_transition_months?: number;
          skill_gaps?: string[];
        };
      };
      salary_data: {
        Row: {
          id: string;
          role: string;
          location: string;
          experience_band: string;
          p25: number;
          p50: number;
          p75: number;
          source: string;
          year: number;
        };
        Insert: {
          id?: string;
          role: string;
          location: string;
          experience_band: string;
          p25: number;
          p50: number;
          p75: number;
          source?: string;
          year?: number;
        };
        Update: {
          id?: string;
          role?: string;
          location?: string;
          experience_band?: string;
          p25?: number;
          p50?: number;
          p75?: number;
          source?: string;
          year?: number;
        };
      };
      employer_profiles: {
        Row: {
          id: string;
          profile_id: string;
          company_name: string;
          industry: string | null;
          size: string | null;
          website: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_name: string;
          industry?: string | null;
          size?: string | null;
          website?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          company_name?: string;
          industry?: string | null;
          size?: string | null;
          website?: string | null;
          created_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          employer_id: string;
          title: string;
          location: string;
          salary_min: number | null;
          salary_max: number | null;
          required_skills: string[];
          description: string | null;
          employment_type: "full_time" | "part_time" | "internship" | "contract";
          status: "open" | "closed" | "draft";
          created_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          title: string;
          location: string;
          salary_min?: number | null;
          salary_max?: number | null;
          required_skills?: string[];
          description?: string | null;
          employment_type: "full_time" | "part_time" | "internship" | "contract";
          status?: "open" | "closed" | "draft";
          created_at?: string;
        };
        Update: {
          id?: string;
          employer_id?: string;
          title?: string;
          location?: string;
          salary_min?: number | null;
          salary_max?: number | null;
          required_skills?: string[];
          description?: string | null;
          employment_type?: "full_time" | "part_time" | "internship" | "contract";
          status?: "open" | "closed" | "draft";
          created_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          candidate_id: string;
          status: "applied" | "reviewed" | "shortlisted" | "offered" | "rejected";
          applied_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          candidate_id: string;
          status?: "applied" | "reviewed" | "shortlisted" | "offered" | "rejected";
          applied_at?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          candidate_id?: string;
          status?: "applied" | "reviewed" | "shortlisted" | "offered" | "rejected";
          applied_at?: string;
          notes?: string | null;
        };
      };
      talent_pools: {
        Row: {
          id: string;
          employer_id: string;
          candidate_id: string;
          source: "applied" | "scouted" | "alumni";
          added_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          candidate_id: string;
          source: "applied" | "scouted" | "alumni";
          added_at?: string;
        };
        Update: {
          id?: string;
          employer_id?: string;
          candidate_id?: string;
          source?: "applied" | "scouted" | "alumni";
          added_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
