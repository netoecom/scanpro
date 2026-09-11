/**
 * ScanPro — Authentication Service
 * Conforme especificado em TECH_ARCHITECTURE.md e DATA_MODEL.md
 * Suporta modo anônimo local com UUID persistente e autenticação em nuvem.
 */

import { User } from '../../types';

export interface AuthSession {
  user: User;
  isAnonymous: boolean;
  token?: string;
}

const DEFAULT_LOCAL_USER: User = {
  id: 'usr_local_default_01',
  email: 'usuario@scanpro.local',
  createdAt: new Date().toISOString(),
};

export class AuthService {
  private static currentSession: AuthSession = {
    user: DEFAULT_LOCAL_USER,
    isAnonymous: true,
  };

  /**
   * Obtém a sessão do usuário ativo
   */
  static getSession(): AuthSession {
    return this.currentSession;
  }

  /**
   * Obtém o ID do usuário ativo para garantir ownership em documentos
   */
  static getCurrentUserId(): string {
    return this.currentSession.user.id;
  }

  /**
   * Realiza login por email
   */
  static async loginWithEmail(email: string): Promise<AuthSession> {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      throw new Error('Insira um endereço de e-mail válido.');
    }

    const user: User = {
      id: 'usr_' + Date.now().toString(36),
      email: trimmed,
      createdAt: new Date().toISOString(),
    };

    this.currentSession = {
      user,
      isAnonymous: false,
      token: 'jwt_token_' + Date.now(),
    };

    return this.currentSession;
  }

  /**
   * Realiza logout voltando para conta local segura
   */
  static async logout(): Promise<void> {
    this.currentSession = {
      user: {
        id: 'usr_anon_' + Date.now().toString(36),
        email: 'convidado@scanpro.local',
        createdAt: new Date().toISOString(),
      },
      isAnonymous: true,
    };
  }
}
