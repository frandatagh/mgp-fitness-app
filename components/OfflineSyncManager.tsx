
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { useAuth } from '../context/AuthContext';
import { useFitnessInsights } from '../context/FitnessInsightsContext';
import { syncPendingActions } from '../lib/offlineSync';

export default function OfflineSyncManager() {
    const {
        user,
        token,
        isAuthenticated,
        isLoading,
    } = useAuth();

    const {
        refreshFitnessInsights,
    } = useFitnessInsights();

    useEffect(() => {
        // No sincronizamos sin una sesión autenticada.
        if (
            isLoading ||
            !isAuthenticated ||
            !user?.id ||
            !token
        ) {
            return;
        }

        const sessionUserId = user.id;

        // Se invalida cuando cambia la sesión
        // o se desmonta este administrador.
        let cancelled = false;

        let previousStatus:
            'online' | 'offline' | null = null;

        const isSessionActive = () => !cancelled;

        const runSync = async () => {
            if (!isSessionActive()) {
                return;
            }

            try {
                const result = await syncPendingActions(
                    sessionUserId,
                    isSessionActive
                );

                // La sesión podría haber cambiado
                // mientras esperábamos al servidor.
                if (!isSessionActive()) {
                    return;
                }

                if (result.processed > 0) {
                    console.log(
                        '[OfflineSyncManager] Acciones sincronizadas:',
                        result.processed
                    );

                    // Refrescamos estadísticas y consejos
                    // solo cuando hubo acciones procesadas.
                    await refreshFitnessInsights();
                }
            } catch (error) {
                if (isSessionActive()) {
                    console.error(
                        '[OfflineSyncManager] Error de sincronización:',
                        error
                    );
                }
            }
        };

        const unsubscribe = NetInfo.addEventListener(
            (state) => {
                if (!isSessionActive()) {
                    return;
                }

                const hasConnection =
                    state.isConnected === true &&
                    state.isInternetReachable !== false;

                const currentStatus = hasConnection
                    ? 'online'
                    : 'offline';

                // Evitamos ejecutar la misma transición
                // de conexión repetidamente.
                if (currentStatus === previousStatus) {
                    return;
                }

                previousStatus = currentStatus;

                if (currentStatus === 'online') {
                    console.log(
                        '[OfflineSyncManager] Internet disponible. Comprobando acciones pendientes.'
                    );

                    void runSync();
                } else {
                    console.log(
                        '[OfflineSyncManager] Sin conexión. Acciones pendientes conservadas.'
                    );
                }
            }
        );

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [
        isLoading,
        isAuthenticated,
        user?.id,
        token,
        refreshFitnessInsights,
    ]);

    return null;
}
