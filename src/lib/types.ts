export type UserRow = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  profileImage: string | null;
  bio: string | null;
  role: "user" | "admin";
  createdAt: string;
};

export type PublicUser = Omit<UserRow, "passwordHash" | "email"> & {
  email?: string;
};

export type SoundRow = {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  duration: number;
  category: string;
  tags: string; // JSON string
  userId: string;
  playCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SoundWithUploader = SoundRow & {
  uploaderUsername: string;
  uploaderProfileImage: string | null;
  favoriteCount: number;
  isFavorited?: 0 | 1;
};

export type FavoriteRow = {
  id: string;
  userId: string;
  soundId: string;
  createdAt: string;
};

export type ReportRow = {
  id: string;
  soundId: string;
  reporterId: string | null;
  reason: string;
  detail: string;
  status: "pending" | "resolved";
  createdAt: string;
};
