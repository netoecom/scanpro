/**
 * ScanPro — Dropbox Service & Cloud Sync Integration
 * Implementação Local-First com OAuth 2.0 PKCE (sem client_secret no código)
 * e upload de PDFs via Dropbox API v2.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import {
  DropboxAccount,
  DropboxSession,
  DropboxUploadResult,
  DropboxAuthState,
} from './types';

const STORAGE_KEY = 'scanpro_dropbox_session_v1';
const NATIVE_SESSION_FILE = (FileSystem.documentDirectory || '') + 'dropbox_session.json';

// Chave pública do app (App Key) no Dropbox App Console
// Para OAuth 2.0 PKCE em mobile e web, apenas a App Key pública é necessária.
const DROPBOX_CLIENT_ID =
  process.env.EXPO_PUBLIC_DROPBOX_CLIENT_ID || '1rted05j9p2sb5b';

export class DropboxService {
  private static session: DropboxSession | null = null;
  private static isInitialized = false;
  private static listeners: Array<(state: DropboxAuthState) => void> = [];
  private static lastSyncTime: string | null = null;
  private static lastCodeVerifier: string | null = null;

  /**
   * Inicializa e recupera a sessão salva no armazenamento físico do dispositivo
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      let rawJson: string | null = null;

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          rawJson = localStorage.getItem(STORAGE_KEY);
        }
      } else {
        const fileInfo = await FileSystem.getInfoAsync(NATIVE_SESSION_FILE);
        if (fileInfo.exists) {
          rawJson = await FileSystem.readAsStringAsync(NATIVE_SESSION_FILE);
        }
      }

      if (rawJson) {
        const parsed = JSON.parse(rawJson) as DropboxSession;
        // Valida se os campos mínimos estão presentes
        if (parsed.accessToken && parsed.account) {
          this.session = parsed;
        }
      }
    } catch (err) {
      console.warn('Erro ao restaurar sessão do Dropbox:', err);
    } finally {
      this.isInitialized = true;
      this.notifyListeners();
    }
  }

  /**
   * Retorna o estado atual da autenticação
   */
  static getState(): DropboxAuthState {
    return {
      isConnected: !!this.session,
      isLoading: !this.isInitialized,
      account: this.session ? this.session.account : null,
      autoUploadEnabled: this.session ? this.session.autoUploadEnabled : false,
      targetFolder: this.session ? this.session.targetFolder : '/ScanPro',
      lastSyncTime: this.lastSyncTime,
      error: null,
    };
  }

  /**
   * Adiciona um ouvinte para alterações no estado da conexão
   */
  static subscribe(listener: (state: DropboxAuthState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.warn('Erro ao notificar ouvinte do Dropbox:', err);
      }
    });
  }

  /**
   * Salva a sessão no armazenamento persistente
   */
  private static async persistSession(): Promise<void> {
    try {
      if (!this.session) {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          const fileInfo = await FileSystem.getInfoAsync(NATIVE_SESSION_FILE);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(NATIVE_SESSION_FILE, { idempotent: true });
          }
        }
      } else {
        const rawJson = JSON.stringify(this.session);
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, rawJson);
          }
        } else {
          await FileSystem.writeAsStringAsync(NATIVE_SESSION_FILE, rawJson);
        }
      }
    } catch (err) {
      console.warn('Erro ao persistir sessão do Dropbox:', err);
    }
    this.notifyListeners();
  }

  /**
   * Gera um code_verifier aleatório e seu respectivo code_challenge via SHA-256 (PKCE)
   */
  static async generatePkceChallenge(): Promise<{ verifier: string; challenge: string }> {
    const array = await Crypto.getRandomBytesAsync(32);
    // Transforma bytes em string base64url segura
    let binary = '';
    for (let i = 0; i < array.length; i++) {
      binary += String.fromCharCode(array[i]);
    }
    const verifier = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    const challenge = digest
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    this.lastCodeVerifier = verifier;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('scanpro_dropbox_code_verifier', verifier);
      } catch {}
    }
    return { verifier, challenge };
  }

  /**
   * Obtém o redirect URI dinamicamente respeitando o domínio atual no Web ou scheme mobile
   */
  static getCallbackUri(redirectUri?: string): string {
    if (redirectUri) return redirectUri;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}/profile`;
    }
    return Linking.createURL('dropbox-auth');
  }

  /**
   * Constrói a URL de autorização OAuth 2.0 PKCE do Dropbox
   */
  static async getAuthorizationUrl(redirectUri?: string): Promise<{ url: string; verifier: string }> {
    const callbackUri = this.getCallbackUri(redirectUri);
    const { verifier, challenge } = await this.generatePkceChallenge();

    const params = new URLSearchParams({
      client_id: DROPBOX_CLIENT_ID,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      token_access_type: 'offline',
      redirect_uri: callbackUri,
    });

    const url = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
    return { url, verifier };
  }

  /**
   * Troca o authorization code pelo access token (com refresh token) usando PKCE
   */
  static async exchangeCodeForToken(code: string, verifier?: string, redirectUri?: string): Promise<DropboxSession> {
    let codeVerifier = verifier || this.lastCodeVerifier;
    if (!codeVerifier && Platform.OS === 'web' && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      try {
        codeVerifier = sessionStorage.getItem('scanpro_dropbox_code_verifier');
      } catch {}
    }

    const callbackUri = this.getCallbackUri(redirectUri);

    const bodyParams = new URLSearchParams({
      code: code.trim(),
      grant_type: 'authorization_code',
      client_id: DROPBOX_CLIENT_ID,
      redirect_uri: callbackUri,
      code_verifier: codeVerifier || '',
    });

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha na autorização do Dropbox (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const accessToken = data.access_token as string;
    const refreshToken = data.refresh_token as string | undefined;
    const expiresIn = (data.expires_in || 14400) as number;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Busca detalhes da conta logada
    const account = await this.fetchCurrentAccount(accessToken);

    const session: DropboxSession = {
      accessToken,
      refreshToken,
      expiresAt,
      account,
      autoUploadEnabled: true, // Habilitado por padrão ao conectar
      targetFolder: '/ScanPro',
    };

    this.session = session;
    await this.persistSession();
    return session;
  }

  /**
   * Conecta diretamente via Access Token (útil para testes de desenvolvedor ou token pessoal)
   */
  static async connectWithAccessToken(token: string, autoUpload: boolean = true): Promise<DropboxSession> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      throw new Error('O token de acesso não pode ser vazio.');
    }

    const account = await this.fetchCurrentAccount(cleanToken);

    const session: DropboxSession = {
      accessToken: cleanToken,
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // Token de longa duração / teste
      account,
      autoUploadEnabled: autoUpload,
      targetFolder: '/ScanPro',
    };

    this.session = session;
    await this.persistSession();
    return session;
  }

  /**
   * Consulta os dados do perfil do usuário no Dropbox
   */
  private static async fetchCurrentAccount(accessToken: string): Promise<DropboxAccount> {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Não foi possível obter dados da conta Dropbox: ${err}`);
    }

    const data = await response.json();
    return {
      accountId: data.account_id,
      displayName: data.name?.display_name || 'Usuário Dropbox',
      email: data.email || 'Email não disponível',
      profilePhotoUrl: data.profile_photo_url,
    };
  }

  /**
   * Altera a configuração de upload automático de novos scans
   */
  static async setAutoUpload(enabled: boolean): Promise<void> {
    if (!this.session) return;
    this.session.autoUploadEnabled = enabled;
    await this.persistSession();
  }

  /**
   * Altera a pasta de destino dentro do Dropbox (ex: '/Documentos/ScanPro')
   */
  static async setTargetFolder(folder: string): Promise<void> {
    if (!this.session) return;
    let cleanFolder = folder.trim();
    if (!cleanFolder.startsWith('/')) {
      cleanFolder = '/' + cleanFolder;
    }
    this.session.targetFolder = cleanFolder;
    await this.persistSession();
  }

  /**
   * Envia um arquivo PDF para a pasta do usuário no Dropbox
   */
  static async uploadPdf(
    fileUri: string,
    fileName: string,
    subFolder?: string
  ): Promise<DropboxUploadResult> {
    if (!this.session) {
      throw new Error('Dropbox não está conectado. Conecte sua conta para fazer o upload.');
    }

    const baseFolder = subFolder || this.session.targetFolder || '/ScanPro';
    // Sanitiza o nome do arquivo para padrão PDF
    let safeName = fileName.replace(/[/\\?%*:|"<>]/g, '_').trim();
    if (!safeName.toLowerCase().endsWith('.pdf')) {
      safeName += '.pdf';
    }

    const dropboxPath = `${baseFolder.replace(/\/$/, '')}/${safeName}`;
    const uploadArg = JSON.stringify({
      path: dropboxPath,
      mode: 'add',
      autorename: true,
      mute: false,
    });

    const uploadUrl = 'https://content.dropboxapi.com/2/files/upload';
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.session.accessToken}`,
      'Dropbox-API-Arg': uploadArg,
      'Content-Type': 'application/octet-stream',
    };

    let resultJson: any = null;

    if (Platform.OS === 'web') {
      let blob: Blob;
      if (fileUri.startsWith('data:')) {
        const parts = fileUri.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        blob = new Blob([array], { type: mime });
      } else {
        const resp = await fetch(fileUri);
        blob = await resp.blob();
      }

      const uploadResp = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: blob,
      });

      if (!uploadResp.ok) {
        const errorText = await uploadResp.text();
        throw new Error(`Erro no upload para o Dropbox (${uploadResp.status}): ${errorText}`);
      }

      resultJson = await uploadResp.json();
    } else {
      // No dispositivo móvel nativo (Android / iOS)
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers,
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(
          `Falha no upload para o Dropbox (${uploadResult.status}): ${uploadResult.body}`
        );
      }

      resultJson = JSON.parse(uploadResult.body);
    }

    this.lastSyncTime = new Date().toISOString();
    this.notifyListeners();

    return {
      id: resultJson.id || 'id_uploaded',
      name: resultJson.name || safeName,
      pathDisplay: resultJson.path_display || dropboxPath,
      sizeBytes: resultJson.size || 0,
      serverModified: resultJson.server_modified || new Date().toISOString(),
    };
  }

  /**
   * Desconecta a conta e apaga as credenciais locais
   */
  static async disconnect(): Promise<void> {
    this.session = null;
    this.lastSyncTime = null;
    await this.persistSession();
  }
}
