export interface DropboxAccount {
  accountId: string;
  displayName: string;
  email: string;
  profilePhotoUrl?: string;
}

export interface DropboxSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Timestamp em milissegundos
  account: DropboxAccount;
  autoUploadEnabled: boolean;
  targetFolder: string;
  folderPresets?: string[];
  recentFolders?: string[];
}

export interface DropboxUploadResult {
  id: string;
  name: string;
  pathDisplay: string;
  sizeBytes: number;
  serverModified: string;
}

export interface DropboxAuthState {
  isConnected: boolean;
  isLoading: boolean;
  account: DropboxAccount | null;
  autoUploadEnabled: boolean;
  targetFolder: string;
  folderPresets: string[];
  recentFolders: string[];
  lastSyncTime: string | null;
  error: string | null;
}
