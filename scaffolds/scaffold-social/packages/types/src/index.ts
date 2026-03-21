// API Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  timestamp: string;
  requestId: string;
  version: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    cursor?: string;
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  emailVerifiedAt: Date | null;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "user" | "admin" | "super_admin";

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  planId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  locale?: string;
  [key: string]: unknown;
}

// Team Types
export interface TeamMember {
  id: string;
  tenantId: string;
  userId: string;
  role: TeamRole;
  invitedBy: string | null;
  joinedAt: Date;
  user?: User;
}

export type TeamRole = "member" | "manager" | "owner";

// Permission Types
export type Permission =
  | "team:read"
  | "team:write"
  | "team:delete"
  | "team:invite"
  | "billing:read"
  | "billing:write"
  | "settings:read"
  | "settings:write"
  | "api_keys:read"
  | "api_keys:write"
  | "webhooks:read"
  | "webhooks:write"
  | "admin:access";

export const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  member: ["team:read", "settings:read"],
  manager: [
    "team:read",
    "team:write",
    "team:invite",
    "settings:read",
    "settings:write",
    "api_keys:read",
    "api_keys:write",
    "webhooks:read",
    "webhooks:write",
  ],
  owner: [
    "team:read",
    "team:write",
    "team:delete",
    "team:invite",
    "billing:read",
    "billing:write",
    "settings:read",
    "settings:write",
    "api_keys:read",
    "api_keys:write",
    "webhooks:read",
    "webhooks:write",
  ],
};

// Subscription Types
export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
}

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "incomplete";

// Pricing Plan Types
export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  features: PlanFeature[];
  limits: PlanLimits;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number;
}

export interface PlanLimits {
  teamMembers?: number;
  apiKeys?: number;
  webhooks?: number;
  assistantMessages?: number;
  storageGb?: number;
  [key: string]: number | undefined;
}

// Webhook Types
export interface Webhook {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  headers: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  responseStatusCode: number | null;
  responseBody: string | null;
  attempts: number;
  nextRetryAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

export type WebhookDeliveryStatus = "pending" | "success" | "failed";

export interface WebhookEvent {
  id: string;
  name: string;
  description: string;
  payloadSchema: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
}

// Assistant Types
export interface AssistantThread {
  id: string;
  tenantId: string;
  userId: string;
  title: string | null;
  model: string;
  systemPrompt: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssistantMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  tokensUsed: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type MessageRole = "user" | "assistant" | "system";

export interface AssistantUsage {
  id: string;
  tenantId: string;
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  createdAt: Date;
}

// API Key Types
export interface ApiKey {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

// Session Types (for NextAuth)
export interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: UserRole;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    role: TeamRole;
  } | null;
  expires: string;
}

// Resume Types
export interface ContactInfo {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  websiteUrl?: string;
}

export type PersonalInfo = ContactInfo;

export interface ResumeContent {
  personalInfo?: PersonalInfo;
  contact?: ContactInfo;
  summary?: string;
  sections: ResumeSection[];
}

export type ResumeSectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "awards"
  | "publications"
  | "volunteer"
  | "custom";

export type ResumeSectionItemContent =
  | ExperienceItem
  | EducationItem
  | SkillItem
  | ProjectItem
  | CertificationItem
  | LanguageItem
  | AwardItem
  | PublicationItem
  | VolunteerItem
  | CustomItem;

export type SectionContentType =
  | { text: string }
  | { categories: Array<{ name: string; skills: string[] }> }
  | ResumeSectionItemContent[]
  | Record<string, unknown>;

export type SummaryContent = { text: string };

export interface ResumeSection {
  id: string;
  type: ResumeSectionType;
  title: string;
  order: number;
  visible: boolean;
  content: SectionContentType;
}

export interface ExperienceItem {
  type: "experience";
  company: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  highlights?: string[];
}

export interface EducationItem {
  type: "education";
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  description?: string;
  highlights?: string[];
}

export interface SkillItem {
  type: "skills";
  category?: string;
  skills: string[];
  level?: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface ProjectItem {
  type: "projects";
  name: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  highlights?: string[];
  technologies?: string[];
}

export interface CertificationItem {
  type: "certifications";
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface LanguageItem {
  type: "languages";
  language: string;
  proficiency: "native" | "fluent" | "professional" | "intermediate" | "basic";
}

export interface AwardItem {
  type: "awards";
  title: string;
  issuer: string;
  date?: string;
  description?: string;
}

export interface PublicationItem {
  type: "publications";
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface VolunteerItem {
  type: "volunteer";
  organization: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  highlights?: string[];
}

export interface CustomItem {
  type: "custom";
  title?: string;
  subtitle?: string;
  date?: string;
  description?: string;
  highlights?: string[];
}

export interface ResumeTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: "small" | "medium" | "large";
  spacing?: "compact" | "normal" | "relaxed";
  headerStyle?: "classic" | "modern" | "minimal";
}

export interface Resume {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  slug?: string | null;
  isPublic: boolean;
  isMaster: boolean;
  parentResumeId?: string | null;
  targetJobTitle?: string | null;
  targetJobUrl?: string | null;
  content: ResumeContent;
  template: string;
  theme?: ResumeTheme | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// AI Tool Types for Resume Assistant
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolExecution {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  input: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolExecutions?: ToolExecution[];
  createdAt: Date;
}

// Scraped Profile Types
export interface ExtractedProfileData {
  source: "linkedin" | "github" | "website" | "other";
  personalInfo?: PersonalInfo;
  summary?: string;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  skills?: SkillItem[];
  projects?: ProjectItem[];
  certifications?: CertificationItem[];
  languages?: LanguageItem[];
  publications?: PublicationItem[];
}
