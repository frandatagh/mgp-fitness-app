import React from 'react';
import { Image, Pressable, ScrollView, Text, View, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import {
    getStatisticsHistory,
    deleteStatisticsHistoryRecord,
    clearAllStatisticsHistory,
    type StatisticsHistoryDay,
    type StatisticsHistoryRecord,
    type StatisticsArchivedHistoryItem,
} from '../lib/statisticsHistory';
import {
    getAppDateKey,
    formatAppHistoryDayLabel,
} from '../lib/date';

type HistoryRecord = {
    id: string;
    type: 'run' | 'routine' | 'exercise';
    title: string;
    subtitle: string;
    rating?: number | null;
};

type HistoryDay = {
    date: string;
    label: string;
    records: HistoryRecord[];
};

function normalizeHistoryDaysByAppTimeZone(
    days: StatisticsHistoryDay[]
): StatisticsHistoryDay[] {
    const grouped: Record<string, StatisticsHistoryDay> = {};

    for (const day of days) {
        for (const record of day.records) {
            const dateKey = getAppDateKey(record.createdAt);

            if (!grouped[dateKey]) {
                grouped[dateKey] = {
                    date: dateKey,
                    label: formatAppHistoryDayLabel(record.createdAt),
                    records: [],
                };
            }

            grouped[dateKey].records.push(record);
        }
    }

    return Object.values(grouped).sort((a, b) => {
        if (a.date < b.date) return 1;
        if (a.date > b.date) return -1;
        return 0;
    });
}


function getRecordIcon(type: HistoryRecord['type']) {
    if (type === 'run') {
        return <FontAwesome6 name="person-running" size={16} color={COLORS.primary} />;
    }

    if (type === 'routine') {
        return <FontAwesome6 name="dumbbell" size={15} color="#78DCE8" />;
    }

    return <Ionicons name="barbell-outline" size={17} color="#FACC15" />;
}

function getRecordLabel(type: HistoryRecord['type']) {
    if (type === 'run') return 'Running';
    if (type === 'routine') return 'Rutina';
    return 'Ejercicio';
}

export default function StatisticsHistoryScreen() {
    const [historyItems, setHistoryItems] = React.useState<StatisticsHistoryDay[]>([]);
    const [loadingHistory, setLoadingHistory] = React.useState(true);
    const [historyError, setHistoryError] = React.useState<string | null>(null);

    const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);

    const [recordToDelete, setRecordToDelete] =
        React.useState<StatisticsHistoryRecord | null>(null);

    const [deletingRecord, setDeletingRecord] = React.useState(false);

    const [archivedItems, setArchivedItems] = React.useState<StatisticsArchivedHistoryItem[]>([]);
    const [clearHistoryModalVisible, setClearHistoryModalVisible] = React.useState(false);
    const [clearingHistory, setClearingHistory] = React.useState(false);

    React.useEffect(() => {
        const loadHistory = async () => {
            try {
                setLoadingHistory(true);
                setHistoryError(null);

                const data = await getStatisticsHistory();

                const normalizedItems = normalizeHistoryDaysByAppTimeZone(data.items ?? []);

                setHistoryItems(normalizedItems);
                setArchivedItems(data.archivedItems ?? []);
            } catch (error) {
                console.error('Error cargando historial:', error);
                setHistoryError('No se pudo cargar el historial.');
            } finally {
                setLoadingHistory(false);
            }
        };

        loadHistory();
    }, []);

    const [openDates, setOpenDates] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (historyItems.length > 0) {
            setOpenDates((prev) => ({
                ...prev,
                [historyItems[0].date]: true,
            }));
        }
    }, [historyItems]);

    const toggleDate = (date: string) => {
        setOpenDates((prev) => ({
            ...prev,
            [date]: !prev[date],
        }));
    };

    const handleDeleteRecord = (record: StatisticsHistoryRecord) => {
        setRecordToDelete(record);
        setDeleteModalVisible(true);
    };

    const confirmDeleteRecord = async () => {
        if (!recordToDelete) return;

        try {
            setDeletingRecord(true);

            await deleteStatisticsHistoryRecord(
                recordToDelete.type,
                recordToDelete.id
            );

            setHistoryItems((prev) =>
                prev
                    .map((day) => ({
                        ...day,
                        records: day.records.filter(
                            (item) => item.id !== recordToDelete.id
                        ),
                    }))
                    .filter((day) => day.records.length > 0)
            );

            setDeleteModalVisible(false);
            setRecordToDelete(null);
        } catch (error) {
            console.error('Error borrando registro:', error);

            Alert.alert(
                'Error',
                'No se pudo borrar el registro.'
            );
        } finally {
            setDeletingRecord(false);
        }
    };

    const confirmClearAllHistory = async () => {
        try {
            setClearingHistory(true);

            await clearAllStatisticsHistory();

            setHistoryItems([]);
            setArchivedItems([]);
            setOpenDates({});

            setClearHistoryModalVisible(false);
        } catch (error) {
            console.error('Error limpiando historial:', error);
            Alert.alert('Error', 'No se pudo limpiar el historial.');
        } finally {
            setClearingHistory(false);
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <View
                className="flex-1 w-full px-4 pt-1"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                <View className="items-center mb-1">
                    <Image
                        source={require('../assets/img/icontwist.png')}
                        style={{ width: 170, height: 88 }}
                        resizeMode="contain"
                    />
                </View>

                <View className="self-start px-1 mb-2">
                    <Text className='ml-2  text-md text-gray-500'>
                        Historial de registros
                    </Text>
                </View>

                <View
                    className="flex-1 mt-2 rounded-3xl overflow-hidden"
                    style={{
                        borderWidth: 2,
                        borderColor: COLORS.primary,
                        backgroundColor: '#101010',
                    }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            padding: 12,
                            paddingBottom: 20,
                        }}
                    >
                        <View className="self-start px-2 mb-4">
                            <Text
                                style={{
                                    color: COLORS.textMuted,
                                    fontSize: 13,
                                    lineHeight: 18,
                                    marginTop: 4,
                                }}
                            >
                                Revisa tus sesiones de running, valoraciones de rutinas y ejercicios agrupados por fecha.
                                También puedes borrar registros equivocados.
                            </Text>
                        </View>
                        {loadingHistory && (
                            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={{ color: COLORS.textMuted, marginTop: 8 }}>
                                    Cargando historial...
                                </Text>
                            </View>
                        )}

                        {historyError && !loadingHistory && (
                            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                <Text style={{ color: '#FF6B6B', textAlign: 'center' }}>
                                    {historyError}
                                </Text>
                            </View>
                        )}

                        {!loadingHistory && !historyError && historyItems.length === 0 && (
                            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                <Ionicons name="document-text-outline" size={32} color={COLORS.textMuted} />
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        textAlign: 'center',
                                        marginTop: 10,
                                        fontSize: 13,
                                    }}
                                >
                                    Todavía no hay registros guardados.
                                </Text>
                            </View>
                        )}
                        {!loadingHistory && !historyError && historyItems.map((day) => {
                            const isOpen = !!openDates[day.date];

                            return (
                                <View
                                    key={day.date}
                                    style={{
                                        marginBottom: 10,
                                        backgroundColor: '#151515',
                                        borderRadius: 18,
                                        borderWidth: 1,
                                        borderColor: '#2f2f2f',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Pressable
                                        onPress={() => toggleDate(day.date)}
                                        style={{
                                            paddingHorizontal: 14,
                                            paddingVertical: 13,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <View>
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 14,
                                                    fontWeight: '800',
                                                }}
                                            >
                                                {day.label}
                                            </Text>

                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 11,
                                                    marginTop: 2,
                                                }}
                                            >
                                                {day.records.length} registros
                                            </Text>
                                        </View>

                                        <Ionicons
                                            name={isOpen ? 'chevron-up' : 'chevron-down'}
                                            size={20}
                                            color={COLORS.primary}
                                        />
                                    </Pressable>

                                    {isOpen && (
                                        <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                                            {day.records.map((record) => (
                                                <View
                                                    key={record.id}
                                                    style={{
                                                        backgroundColor: '#1b1b1b',
                                                        borderRadius: 14,
                                                        borderWidth: 1,
                                                        borderColor: '#2c2c2c',
                                                        padding: 11,
                                                        marginTop: 8,
                                                    }}
                                                >
                                                    <View className="flex-row items-start justify-between">
                                                        <View className="flex-row flex-1" style={{ gap: 9 }}>
                                                            <View
                                                                style={{
                                                                    width: 32,
                                                                    height: 32,
                                                                    borderRadius: 16,
                                                                    backgroundColor: '#111111',
                                                                    borderWidth: 1,
                                                                    borderColor: '#333333',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                {getRecordIcon(record.type)}
                                                            </View>

                                                            <View style={{ flex: 1 }}>
                                                                <Text
                                                                    style={{
                                                                        color: COLORS.textLight,
                                                                        fontSize: 13,
                                                                        fontWeight: '800',
                                                                    }}
                                                                >
                                                                    {record.title}
                                                                </Text>

                                                                <Text
                                                                    style={{
                                                                        color: COLORS.textMuted,
                                                                        fontSize: 11,
                                                                        lineHeight: 16,
                                                                        marginTop: 3,
                                                                    }}
                                                                >
                                                                    {record.subtitle}
                                                                </Text>

                                                                {record.rating != null && (
                                                                    <Text
                                                                        style={{
                                                                            color: COLORS.primary,
                                                                            fontSize: 11,
                                                                            fontWeight: '800',
                                                                            marginTop: 4,
                                                                        }}
                                                                    >
                                                                        Valoración: {record.rating}/10
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>

                                                        <Pressable
                                                            onPress={() => handleDeleteRecord(record)}
                                                            hitSlop={8}
                                                            style={{
                                                                width: 30,
                                                                height: 30,
                                                                borderRadius: 15,
                                                                backgroundColor: '#2a1212',
                                                                borderWidth: 1,
                                                                borderColor: '#7f1d1d',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                marginLeft: 8,
                                                            }}
                                                        >
                                                            <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                </View>

                            );

                        })}
                        <View
                            style={{
                                marginTop: 14,
                                backgroundColor: '#151515',
                                borderRadius: 18,
                                borderWidth: 1,
                                borderColor: '#2f2f2f',
                                padding: 14,
                            }}
                        >
                            <View className="flex-row items-center mb-2">
                                <Ionicons name="archive-outline" size={18} color={COLORS.primary} />
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontSize: 14,
                                        fontWeight: '800',
                                        marginLeft: 8,
                                    }}
                                >
                                    Historial antiguo
                                </Text>
                            </View>

                            <Text
                                style={{
                                    color: COLORS.textMuted,
                                    fontSize: 12,
                                    lineHeight: 18,
                                    marginBottom: 12,
                                }}
                            >
                                Estos registros ya fueron resumidos para conservar solo la información mensual importante.
                                No se editan registro por registro.
                            </Text>

                            {archivedItems.length === 0 ? (
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 12,
                                        textAlign: 'center',
                                        paddingVertical: 10,
                                    }}
                                >
                                    Aún no hay historial antiguo archivado.
                                </Text>
                            ) : (
                                archivedItems.map((item) => (
                                    <View
                                        key={item.id}
                                        style={{
                                            backgroundColor: '#1b1b1b',
                                            borderRadius: 14,
                                            borderWidth: 1,
                                            borderColor: '#2c2c2c',
                                            padding: 12,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: COLORS.textLight,
                                                fontSize: 13,
                                                fontWeight: '800',
                                            }}
                                        >
                                            {item.label}
                                        </Text>

                                        <Text
                                            style={{
                                                color: COLORS.textMuted,
                                                fontSize: 11,
                                                lineHeight: 17,
                                                marginTop: 5,
                                            }}
                                        >
                                            {item.subtitle}
                                        </Text>

                                        <Text
                                            style={{
                                                color: COLORS.primary,
                                                fontSize: 11,
                                                fontWeight: '700',
                                                marginTop: 6,
                                            }}
                                        >
                                            Resumen mensual archivado
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                        <Pressable
                            onPress={() => setClearHistoryModalVisible(true)}
                            style={{
                                marginTop: 14,
                                backgroundColor: '#2a1212',
                                borderWidth: 1,
                                borderColor: '#7f1d1d',
                                paddingVertical: 13,
                                borderRadius: 14,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <View className="flex-row items-center">
                                <Ionicons name="trash-outline" size={17} color="#FFB4B4" />
                                <Text
                                    style={{
                                        color: '#FFB4B4',
                                        fontWeight: '800',
                                        fontSize: 13,
                                        marginLeft: 8,
                                    }}
                                >
                                    Limpiar todo el historial
                                </Text>
                            </View>
                        </Pressable>
                    </ScrollView>
                </View>

                <View className="m-2 flex-row justify-between " >
                    <Pressable
                        onPress={() => router.replace('/statistics')}
                        className="flex-1 mr-2 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}>
                            Estadísticas
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => router.replace('/home')}
                        className="flex-1  px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}>
                            Ir al home
                        </Text>
                    </Pressable>
                </View>
            </View>
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!deletingRecord) {
                        setDeleteModalVisible(false);
                    }
                }}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.72)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 340,
                            backgroundColor: '#101010',
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: '#2c2c2c',
                            padding: 18,
                        }}
                    >
                        <View
                            style={{
                                alignItems: 'center',
                                marginBottom: 12,
                            }}
                        >
                            <View
                                style={{
                                    width: 54,
                                    height: 54,
                                    borderRadius: 27,
                                    backgroundColor: '#2a1212',
                                    borderWidth: 1,
                                    borderColor: '#7f1d1d',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons
                                    name="trash-outline"
                                    size={26}
                                    color="#FF6B6B"
                                />
                            </View>
                        </View>

                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 18,
                                fontWeight: '800',
                                textAlign: 'center',
                            }}
                        >
                            ¿Borrar registro?
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 13,
                                lineHeight: 20,
                                textAlign: 'center',
                                marginTop: 10,
                            }}
                        >
                            Este registro será eliminado permanentemente del historial y de las estadísticas.
                        </Text>

                        {recordToDelete && (
                            <View
                                style={{
                                    marginTop: 14,
                                    backgroundColor: '#1a1a1a',
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor: '#2f2f2f',
                                    padding: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontSize: 13,
                                        fontWeight: '700',
                                    }}
                                >
                                    {recordToDelete.title}
                                </Text>

                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 11,
                                        marginTop: 4,
                                        lineHeight: 16,
                                    }}
                                >
                                    {recordToDelete.subtitle}
                                </Text>
                            </View>
                        )}

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginTop: 18,
                            }}
                        >
                            <Pressable
                                disabled={deletingRecord}
                                onPress={() => {
                                    setDeleteModalVisible(false);
                                    setRecordToDelete(null);
                                }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    backgroundColor: '#3a3a3a',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontWeight: '700',
                                    }}
                                >
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={deletingRecord}
                                onPress={confirmDeleteRecord}
                                style={{
                                    flex: 1,
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    backgroundColor: '#FF4D4D',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {deletingRecord ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#fff"
                                    />
                                ) : (
                                    <Text
                                        style={{
                                            color: '#fff',
                                            fontWeight: '800',
                                        }}
                                    >
                                        Borrar
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={clearHistoryModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!clearingHistory) {
                        setClearHistoryModalVisible(false);
                    }
                }}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.78)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 350,
                            backgroundColor: '#101010',
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: '#7f1d1d',
                            padding: 18,
                        }}
                    >
                        <View style={{ alignItems: 'center', marginBottom: 12 }}>
                            <View
                                style={{
                                    width: 58,
                                    height: 58,
                                    borderRadius: 29,
                                    backgroundColor: '#2a1212',
                                    borderWidth: 1,
                                    borderColor: '#7f1d1d',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="warning-outline" size={30} color="#FF6B6B" />
                            </View>
                        </View>

                        <Text
                            style={{
                                color: '#FFB4B4',
                                fontSize: 18,
                                fontWeight: '900',
                                textAlign: 'center',
                            }}
                        >
                            ¿Limpiar todo el historial?
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 13,
                                lineHeight: 20,
                                textAlign: 'center',
                                marginTop: 10,
                            }}
                        >
                            Esta acción eliminará todas tus sesiones de running, valoraciones de rutinas,
                            valoraciones de ejercicios y resúmenes mensuales archivados.
                        </Text>

                        <Text
                            style={{
                                color: '#FF6B6B',
                                fontSize: 12,
                                fontWeight: '800',
                                textAlign: 'center',
                                marginTop: 10,
                            }}
                        >
                            Esta acción no se puede deshacer.
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                            <Pressable
                                disabled={clearingHistory}
                                onPress={() => setClearHistoryModalVisible(false)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    backgroundColor: '#3a3a3a',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ color: COLORS.textLight, fontWeight: '700' }}>
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={clearingHistory}
                                onPress={confirmClearAllHistory}
                                style={{
                                    flex: 1,
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    backgroundColor: '#FF4D4D',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {clearingHistory ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: '900' }}>
                                        Sí, borrar todo
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>

    );
}