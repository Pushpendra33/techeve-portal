// Types representing the database schema after migration-001.sql.
export type UserRole = "super_admin" | "admin" | "instructor" | "student";
export type AccountStatus = "active" | "disabled";
export type InviteStatus = "pending" | "accepted" | "revoked";
export type CourseTrack = "mern" | "data_science";
export type EnrollmentTrackType = "short" | "extended";
export type EnrollmentStatus = "active" | "completed" | "dropped";
export type CapstoneStatus = "not_started" | "in_progress" | "submitted" | "reviewed";
export type AnnouncementType = "workshop" | "opportunity" | "general";

export type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
export type ModuleWithLessons = Database["public"]["Tables"]["modules"]["Row"] & {
  lessons: LessonRow[];
};
export type CourseWithModules = Database["public"]["Tables"]["courses"]["Row"] & {
  modules: ModuleWithLessons[];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          status: AccountStatus;
          permissions: Record<string, boolean>;
          avatar_url: string | null;
          email: string | null;
          phone: string | null;
          college: string | null;
          year_of_study: string | null;
          notes: string | null;
          github_url: string | null;
          linkedin_url: string | null;
          twitter_url: string | null;
          portfolio_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      invites: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          permissions: Record<string, boolean>;
          course_id: string | null;
          track_type: EnrollmentTrackType | null;
          invited_by: string | null;
          status: InviteStatus;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["invites"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["invites"]["Row"]>;
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          track: CourseTrack;
          cover_image_url: string | null;
          duration_weeks: number | null;
          level: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["courses"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["courses"]["Row"]>;
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["modules"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["modules"]["Row"]>;
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          content: string | null;
          video_url: string | null;
          resource_url: string | null;
          order_index: number;
          duration_minutes: number | null;
          reference_links: { label: string; url: string }[] | any;
          lesson_type: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lessons"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["lessons"]["Row"]>;
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          track_type: EnrollmentTrackType;
          status: EnrollmentStatus;
          enrolled_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["enrollments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Row"]>;
      };
      lesson_progress: {
        Row: {
          id: string;
          student_id: string;
          lesson_id: string;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["lesson_progress"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["lesson_progress"]["Row"]>;
      };
      attendance: {
        Row: {
          id: string;
          enrollment_id: string;
          session_date: string;
          present: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["attendance"]["Row"]>;
      };
      quizzes: {
        Row: { id: string; module_id: string; title: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["quizzes"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["quizzes"]["Row"]>;
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question: string;
          options: string[];
          correct_index: number;
          order_index: number;
        };
        Insert: Partial<Database["public"]["Tables"]["quiz_questions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["quiz_questions"]["Row"]>;
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          student_id: string;
          score: number;
          answers: Record<string, number>;
          attempted_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quiz_attempts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["quiz_attempts"]["Row"]>;
      };
      capstones: {
        Row: {
          id: string;
          enrollment_id: string;
          student_id: string | null;
          title: string | null;
          description: string | null;
          repo_url: string | null;
          deploy_url: string | null;
          jira_url: string | null;
          tech_stack: string | null;
          status: CapstoneStatus;
          feedback: string | null;
          score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["capstones"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["capstones"]["Row"]>;
      };
      capstone_reviews: {
        Row: {
          id: string;
          capstone_id: string;
          reviewer_id: string;
          feedback: string | null;
          score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["capstone_reviews"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["capstone_reviews"]["Row"]>;
      };
      certificates: {
        Row: {
          id: string;
          enrollment_id: string;
          issued: boolean;
          issued_at: string | null;
          credential_url: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["certificates"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["certificates"]["Row"]>;
      };
      announcements: {
        Row: {
          id: string;
          type: AnnouncementType;
          title: string;
          body: string | null;
          event_date: string | null;
          end_date: string | null;
          location: string | null;
          cover_image_url: string | null;
          link: string | null;
          capacity: number | null;
          is_published: boolean;
          is_public: boolean;
          notified_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["announcements"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["announcements"]["Row"]>;
      };
      announcement_interests: {
        Row: {
          id: string;
          announcement_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["announcement_interests"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["announcement_interests"]["Row"]>;
      };
      subscribers: {
        Row: {
          id: string;
          email: string;
          source: string | null;
          confirmed: boolean;
          unsubscribed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscribers"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["subscribers"]["Row"]>;
      };
    };
  };
}
