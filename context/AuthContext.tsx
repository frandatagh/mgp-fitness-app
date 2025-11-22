// context/AuthContext.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../lib/auth';
import { setAuthToken } from '../lib/api';

const TOKEN_KEY = 'mgp_token';
const USER_KEY = 'mgp_user';

type AuthContextValue = {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (user: AuthUser, token: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Helpers de almacenamiento cross-platform
async function storageGetItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
}

async function storageSetItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(key, value);
    } else {
        await SecureStore.setItemAsync(key, value);
    }
}

async function storageDeleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}

type AuthProviderProps = {
    children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 👇 Se carga UNA sola vez
    useEffect(() => {
        const loadSession = async () => {
            try {
                const storedToken = await storageGetItem(TOKEN_KEY);
                const storedUser = await storageGetItem(USER_KEY);

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                    setAuthToken(storedToken);
                }
            } catch (error) {
                console.log('Error cargando sesión:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, []); // <- IMPORTANTE: array vacío

    const login = async (newUser: AuthUser, newToken: string) => {
        setUser(newUser);
        setToken(newToken);
        setAuthToken(newToken);

        try {
            await storageSetItem(TOKEN_KEY, newToken);
            await storageSetItem(USER_KEY, JSON.stringify(newUser));
        } catch (error) {
            console.log('Error guardando sesión:', error);
        }
    };

    const logout = async () => {
        setUser(null);
        setToken(null);
        setAuthToken(null);

        try {
            await storageDeleteItem(TOKEN_KEY);
            await storageDeleteItem(USER_KEY);
        } catch (error) {
            console.log('Error eliminando sesión:', error);
        }
    };

    const value: AuthContextValue = {
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return ctx;
};
