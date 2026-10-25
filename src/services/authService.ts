import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  type User 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase';
import type { AdminUser } from '../types';

const LOCAL_ADMIN_KEY = 'cinepwa_local_admin_session';

type AuthListener = (user: AdminUser | null) => void;
const listeners: AuthListener[] = [];

let currentAdmin: AdminUser | null = null;

// Tentar restaurar sessão local se estiver em modo offline
try {
  const saved = localStorage.getItem(LOCAL_ADMIN_KEY);
  if (saved) {
    currentAdmin = JSON.parse(saved);
  }
} catch {
  currentAdmin = null;
}

export const AuthService = {
  init() {
    if (isFirebaseConfigured && auth) {
      const activeAuth = auth;
      onAuthStateChanged(activeAuth, async (user: User | null) => {
        if (user) {
          // Verificar se é admin ativo na coleção admins
          const adminData = await this.verifyAdminRole(user.uid, user.email || '');
          if (adminData) {
            currentAdmin = adminData;
          } else {
            // Usuário comum tentou logar, desconectar
            await signOut(activeAuth);
            currentAdmin = null;
            alert('Acesso negado: Este usuário não possui privilégios de administrador no Firestore.');
          }
        } else {
          currentAdmin = null;
        }
        this.notifyListeners();
      });
    }
  },

  async verifyAdminRole(uid: string, email: string): Promise<AdminUser | null> {
    if (!db) return null;
    try {
      const adminSnap = await getDoc(doc(db, 'admins', uid));
      if (adminSnap.exists()) {
        const data = adminSnap.data();
        if (data.active === true && data.role === 'admin') {
          return {
            uid,
            email: email || data.email || 'admin@cinepwa.com',
            role: 'admin',
            active: true
          };
        }
      }
      return null;
    } catch (err) {
      console.warn('Erro ao verificar permissão no Firestore:', err);
      return null;
    }
  },

  getCurrentAdmin(): AdminUser | null {
    return currentAdmin;
  },

  isAdminLoggedIn(): boolean {
    return currentAdmin !== null && currentAdmin.active === true;
  },

  async loginWithPassword(pass: string): Promise<AdminUser> {
    const trimmed = (pass || '').trim();
    const storedCustomPass = localStorage.getItem('cinepwa_admin_password');
    const validPasswords = ['51997403703', 'engel2026', 'admin123'];

    const isValid = (storedCustomPass && trimmed === storedCustomPass) || validPasswords.includes(trimmed);

    if (!isValid) {
      throw new Error('Senha incorreta! Acesso restrito ao administrador.');
    }

    const admin: AdminUser = {
      uid: 'admin-engelmobile',
      email: 'admin@engelmobile.com',
      role: 'admin',
      active: true
    };
    currentAdmin = admin;
    localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(admin));
    this.notifyListeners();
    return admin;
  },

  async login(email: string, pass: string): Promise<AdminUser> {
    if (isFirebaseConfigured && auth) {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const adminData = await this.verifyAdminRole(credential.user.uid, credential.user.email || email);
      if (!adminData) {
        await signOut(auth);
        throw new Error('Acesso negado: O usuário autenticado não possui papel de administrador ativo na coleção admins do Firestore.');
      }
      currentAdmin = adminData;
      this.notifyListeners();
      return adminData;
    }

    // Autenticação direta por senha do administrador
    return this.loginWithPassword(pass);
  },

  async logout(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    currentAdmin = null;
    localStorage.removeItem(LOCAL_ADMIN_KEY);
    this.notifyListeners();
  },

  onStateChange(fn: AuthListener): () => void {
    listeners.push(fn);
    fn(currentAdmin);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },

  notifyListeners() {
    for (const fn of listeners) {
      try {
        fn(currentAdmin);
      } catch (e) {
        console.error(e);
      }
    }
  }
};
