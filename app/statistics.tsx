import React, { useContext, useEffect } from 'react';
import { Image, Pressable, ScrollView, Text, View, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import {
    getMyStatistics,
    type MyStatisticsResponse,
} from '../lib/statistics';

function StatCard({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: '#1b1b1b',
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: '#2d2d2d',
            }}
        >
            <View className="flex-row items-center mb-2">
                {icon}
                <Text style={{ color: '#BDBDBD', fontSize: 12, marginLeft: 8 }}>
                    {label}
                </Text>
            </View>

            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
                {value}
            </Text>

            {sub && (
                <Text style={{ color: '#8A8A8A', fontSize: 11, marginTop: 4 }}>
                    {sub}
                </Text>
            )}
        </View>
    );
}

function Section({
    title,
    icon,
    children,
}: {
    title?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <View style={{ marginBottom: 10 }}>
            {(title || icon) && (
                <View className="flex-row items-center mb-2">
                    {icon}

                    {title && (
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 17,
                                fontWeight: '800',
                                marginLeft: 8,
                            }}
                        >
                            {title}
                        </Text>
                    )}
                </View>
            )}

            <View
                style={{
                    backgroundColor: 'rgba(20,20,20,0.96)',
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: '#2f2f2f',
                    padding: 10,
                }}
            >
                {children}
            </View>
        </View>
    );
}

function BarRow({
    name,
    value,
}: {
    name: string;
    value: string;
}) {
    return (
        <View className="flex-row items-center mb-3">
            <Text style={{ color: '#E5E5E5', fontSize: 13, flex: 1 }}>
                {name}
            </Text>

            <View
                style={{
                    width: 90,
                    height: 12,
                    borderRadius: 8,
                    backgroundColor: '#2a2a2a',
                    overflow: 'hidden',
                    marginHorizontal: 10,
                }}
            >
                <View
                    style={{
                        width: value as `${number}%`,
                        height: '100%',
                        backgroundColor: COLORS.primary,
                        borderRadius: 8,
                    }}
                />
            </View>

            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', width: 36 }}>
                {value.replace('%', '')}
            </Text>
        </View>
    );
}
function InfoButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={8}
            style={{
                width: 22,
                height: 21,
                borderRadius: 13,
                backgroundColor: '#1f1f1f',
                borderWidth: 1,
                borderColor: '#333333',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
            }}
        >
            <Ionicons
                name="information-circle-outline"
                size={20}
                color={'#78DCE8'}
            />
        </Pressable>
    );
}

export default function StatisticsScreen() {

    const chartWidth = Math.min(Dimensions.get('window').width - 64, 720);
    const [ratingChartWidth, setRatingChartWidth] = React.useState(0);
    const { isAuthenticated, user } = useAuth();

    const [stats, setStats] = React.useState<MyStatisticsResponse | null>(null);
    const [loadingStats, setLoadingStats] = React.useState(true);
    const [statsError, setStatsError] = React.useState<string | null>(null);

    const [infoModalVisible, setInfoModalVisible] = React.useState(false);
    const [infoModalTitle, setInfoModalTitle] = React.useState('');
    const [infoModalText, setInfoModalText] = React.useState('');



    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/');
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoadingStats(true);
                setStatsError(null);

                const data = await getMyStatistics();
                setStats(data);
            } catch (error) {
                console.error('Error cargando estadísticas:', error);
                setStatsError('No se pudieron cargar tus estadísticas.');
            } finally {
                setLoadingStats(false);
            }
        };

        loadStats();
    }, []);


    useEffect(() => {
        const loadStats = async () => {
            try {
                if (!isAuthenticated) return;

                setLoadingStats(true);
                setStatsError(null);

                const data = await getMyStatistics();
                setStats(data);
            } catch (error) {
                console.error('Error cargando estadísticas:', error);
                setStatsError('No se pudieron cargar tus estadísticas.');
            } finally {
                setLoadingStats(false);
            }
        };

        loadStats();
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: COLORS.background }}
            >
                <Text style={{ color: COLORS.textLight }}>
                    Redirigiendo al inicio de sesión...
                </Text>
            </SafeAreaView>
        );
    }




    const openInfoModal = (title: string, text: string) => {
        setInfoModalTitle(title);
        setInfoModalText(text);
        setInfoModalVisible(true);
    };

    const formatStatDistance = (meters?: number | null) => {
        if (!meters) return '--';
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(2)} km`;
    };

    const formatStatDuration = (totalSeconds?: number | null) => {
        if (!totalSeconds) return '--';

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const formatStatPace = (seconds?: number | null) => {
        if (!seconds) return '--';

        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);

        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const formatStatSpeed = (speedMps?: number | null) => {
        if (!speedMps) return '--';
        return `${(speedMps * 3.6).toFixed(1)} km/h`;
    };

    const formatRating = (value?: number | null) => {
        if (value == null) return '--';
        return `${value.toFixed(1)} / 10`;
    };

    const toPercent = (value?: number | null) => {
        if (value == null) return '0%';
        return `${Math.min(100, Math.max(0, Math.round(value * 10)))}%` as `${number}%`;
    };

    const chartLabels = stats?.performance.chart.labels?.length
        ? stats.performance.chart.labels
        : ['1', '2', '3', '4', '5', '6'];

    const gymChartData = stats?.performance.chart.gym?.length
        ? stats.performance.chart.gym
        : [0];

    const runningChartData = stats?.performance.chart.running?.length
        ? stats.performance.chart.running
        : [0];

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="flex-1 w-full px-2"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >

                <View className="items-center mt-1" style={{ marginBottom: -10 }}>
                    <Image
                        source={require('../assets/img/iconrun.png')}
                        style={{ width: 170, height: 90 }}
                        resizeMode="contain"
                    />
                </View>

                <Text
                    className="ml-5 pl-1 pb-1 text-md text-gray-500"
                >
                    Tus estadísticas
                </Text>

                <View
                    style={{
                        borderWidth: 2,
                        borderColor: COLORS.primary,
                        borderRadius: 22,
                        backgroundColor: '#101010',
                        marginHorizontal: 8,
                        marginTop: 10,
                        flex: 1,
                        overflow: 'hidden',
                    }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            padding: 18,
                            paddingBottom: 100,
                        }}
                    >
                        {loadingStats && (
                            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={{ color: COLORS.textMuted, marginTop: 8 }}>
                                    Cargando estadísticas...
                                </Text>
                            </View>
                        )}

                        {statsError && !loadingStats && (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#FF6B6B', textAlign: 'center' }}>
                                    {statsError}
                                </Text>
                            </View>
                        )}

                        {!loadingStats && !statsError && (
                            <>
                                <Text className="text-gray-200 ml-1 mb-5 mt-2" style={{ fontSize: 13 }}>
                                    Aquí podrás visualizar la evolución de tus entrenamientos, running y valoraciones personales.
                                    Las estadísticas se generan automáticamente a partir de tus registros y te ayudarán a comprender
                                    tu rendimiento, constancia y nivel de esfuerzo con el paso del tiempo.
                                    {"\n"}{"\n"}
                                    También podrás acceder al historial completo de registros para revisar o eliminar sesiones si lo deseas.
                                </Text>


                                <Section>
                                    <View className='flex-row m-2 pb-2 items-center justify-between'>
                                        <View className='flex-row items-center'>
                                            <Ionicons className='mr-2' name="star" size={18} color={COLORS.primary} />
                                            <Text className='text-md font-bold' style={{ color: '#fff' }}>
                                                Resumen General
                                            </Text>
                                        </View>

                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Resumen general',
                                                    'Sesiones: cantidad de entrenamientos registrados esta semana.\n\nDistancia total: suma total de kilómetros registrados en tus sesiones de running.\n\nEsfuerzo promedio: promedio de valoraciones registradas en tus entrenamientos. Mientras más registros cargues, más precisa será esta métrica.'
                                                )
                                            }
                                        />


                                    </View>
                                    <View className="flex-row " style={{ gap: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="calendar-outline" size={17} color={COLORS.primary} />}
                                            label="Sesiones"
                                            value={String(stats?.summary.weeklySessions ?? 0)}
                                            sub="esta semana"
                                        />
                                        <StatCard
                                            icon={<Ionicons name="walk-outline" size={17} color="#78DCE8" />}
                                            label="Distancia"
                                            value={formatStatDistance(stats?.summary.totalDistanceMeters)}
                                            sub="total"
                                        />
                                    </View>

                                    <View style={{ marginTop: 10 }}>
                                        <StatCard
                                            icon={<FontAwesome6 name="fire-flame-curved" size={16} color={COLORS.primary} />}
                                            label="Esfuerzo promedio"
                                            value={formatRating(stats?.summary.avgEffort)}
                                            sub="últimos entrenamientos"
                                        />
                                    </View>
                                </Section>

                                <Section>
                                    <View className='flex-row m-2 pb-2 items-center justify-between'>
                                        <View className='flex-row items-center'>
                                            <Ionicons className='mr-2' name="bulb-outline" size={18} color={COLORS.primary} />
                                            <Text className='text-md font-bold' style={{ color: '#fff' }}>
                                                Insights
                                            </Text>
                                        </View>

                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Insights',
                                                    'Los insights son observaciones automáticas creadas a partir de tus registros.\n\nLa app compara tus sesiones, valoraciones y rendimiento para mostrarte tendencias simples, como mejoras de ritmo, constancia semanal o esfuerzo alto acumulado.'
                                                )
                                            }
                                        />
                                    </View>
                                    <View className="p-1">
                                        {(stats?.insights?.length ? stats.insights : []).map((insight) => (
                                            <View key={insight.id} style={{ marginBottom: 10 }}>
                                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 5 }}>
                                                    {insight.title}
                                                </Text>
                                                <Text style={{ color: '#BDBDBD', fontSize: 13, lineHeight: 19 }}>
                                                    {insight.description}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </Section>

                                <Section>
                                    <View
                                        className="flex-row m-2 pb-2 items-center justify-between"
                                    >
                                        <View className="flex-row items-center">
                                            <Ionicons
                                                className="mr-2"
                                                name="analytics-outline"
                                                size={18}
                                                color={COLORS.primary}
                                            />

                                            <Text
                                                className="text-md font-bold"
                                                style={{ color: '#fff' }}
                                            >
                                                Rendimiento
                                            </Text>
                                        </View>

                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Rendimiento',
                                                    'Promedio semanal: valoración promedio de tus entrenamientos durante la semana.\n\nMejor día: día con mejor promedio de valoración.\n\nPeor día: día con menor promedio de valoración.\n\nGráfico: compara la evolución de tus valoraciones de gimnasio y running.\n\nLa línea azul representa entrenamientos de gimnasio y la línea verde representa sesiones de running.'
                                                )
                                            }
                                        />
                                    </View>
                                    <View className='overflow-hidden'>
                                        <Text
                                            style={{
                                                color: COLORS.textMuted,
                                                fontSize: 12,
                                                marginBottom: 4,
                                                marginLeft: 10,
                                            }}
                                        >
                                            Gráfico de evolución por sesión
                                        </Text>
                                        <View className='px-18'>
                                            <View
                                                style={{ marginTop: 14, width: '100%' }}
                                                onLayout={(event) => {
                                                    const width = event.nativeEvent.layout.width;
                                                    setRatingChartWidth(width);
                                                }}
                                            >


                                                {ratingChartWidth > 0 && (
                                                    <LineChart
                                                        data={{
                                                            labels: chartLabels,
                                                            datasets: [
                                                                {
                                                                    data: gymChartData,
                                                                    color: () => '#78DCE8',
                                                                    strokeWidth: 3,
                                                                },
                                                                {
                                                                    data: runningChartData,
                                                                    color: () => COLORS.primary,
                                                                    strokeWidth: 3,
                                                                },
                                                            ]
                                                        }}
                                                        width={ratingChartWidth}
                                                        height={170}
                                                        fromZero
                                                        yAxisInterval={0.9}
                                                        chartConfig={{
                                                            backgroundGradientFrom: '#151515',
                                                            backgroundGradientTo: '#151515',
                                                            decimalPlaces: 1,
                                                            color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                                                            labelColor: (opacity = 1) => `rgba(189,189,189,${opacity})`,
                                                            propsForDots: {
                                                                r: '4',
                                                                strokeWidth: '1',
                                                                stroke: '#111',
                                                            },
                                                            propsForBackgroundLines: {
                                                                stroke: 'rgba(255,255,255,0.08)',
                                                            },
                                                        }}
                                                        bezier
                                                        style={{
                                                            borderRadius: 18,
                                                            marginLeft: -12,
                                                        }}
                                                    />
                                                )}
                                            </View>

                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'center',
                                                    gap: 16,
                                                    marginTop: 8,
                                                    marginBottom: 15,
                                                }}
                                            >
                                                <Text style={{ color: '#78DCE8', fontSize: 12, fontWeight: '700' }}>
                                                    ● Gimnasio
                                                </Text>
                                                <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>
                                                    ● Running
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View className='mb-3'>
                                        <StatCard
                                            icon={<Ionicons name="analytics-outline" size={17} color={COLORS.primary} />}
                                            label="Promedio semanal"
                                            value={formatRating(stats?.performance.weeklyAverage)}
                                            sub="promedio de tus sesiones de esta semana"
                                        />
                                    </View>
                                    <View className="flex-row" style={{ gap: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="alert-circle-outline" size={17} color="#FACC15" />}
                                            label="Peor día"
                                            value={stats?.performance.worstDay ?? '--'}
                                        />
                                        <StatCard
                                            icon={<Ionicons name="checkmark-circle-outline" size={17} color="#78DCE8" />}
                                            label="Mejor día"
                                            value={stats?.performance.bestDay ?? '--'}
                                        />
                                    </View>


                                </Section>
                                <Section >
                                    <View className='flex-row m-2 pb-2 items-center justify-between'>
                                        <View className='flex-row items-center'>
                                            <FontAwesome6 className='mr-2' name="person-running" size={18} color={COLORS.primary} />
                                            <Text className='text-md font-bold' style={{ color: '#fff' }}>
                                                Running
                                            </Text>
                                        </View>
                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Running',
                                                    'Tiempo semanal: suma del tiempo corrido durante la semana actual.\n\nTiempo mensual: suma del tiempo corrido durante el mes actual.\n\nRitmo semanal: promedio de minutos por kilómetro de tus sesiones semanales.\n\nRitmo mensual: promedio de minutos por kilómetro de tus sesiones mensuales.\n\nDistancia semanal y mensual: kilómetros acumulados en cada período.\n\nVelocidad máxima promedio: promedio de las velocidades máximas registradas en tus sesiones.'
                                                )
                                            }
                                        />
                                    </View>
                                    <View className='flex-row mb-4 justify-around'>
                                        <View className='flex-col items-center'>
                                            <Ionicons className='mb-2' name="stopwatch-outline" size={40} color={'#78DCE8'} />
                                            <Text className='mb-1' style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>
                                                Tiempo semanal
                                            </Text>
                                            <Text style={{ color: '#BDBDBD', fontSize: 18, fontWeight: '900' }}>
                                                {formatStatDuration(stats?.running.weeklyDurationSeconds)}
                                            </Text>
                                        </View>
                                        <View className='flex-col items-center'>
                                            <Ionicons className='mb-2' name="calendar-outline" size={40} color={'#78DCE8'} />
                                            <Text className='mb-1' style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>
                                                Tiempo mensual
                                            </Text>
                                            <Text style={{ color: '#BDBDBD', fontSize: 18, fontWeight: '900' }}>
                                                {formatStatDuration(stats?.running.monthlyDurationSeconds)}
                                            </Text>
                                        </View>


                                    </View>
                                    <View style={{ marginBottom: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="flash-outline" size={17} color={COLORS.primary} />}
                                            label="Velocidad máxima promedio"
                                            value={formatStatSpeed(stats?.running.avgMaxSpeedMps)}
                                        />
                                    </View>
                                    <View className="flex-row" style={{ gap: 10, marginBottom: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="speedometer-outline" size={17} color={COLORS.primary} />}
                                            label="Ritmo semanal"
                                            value={formatStatPace(stats?.running.weeklyAvgPaceSecPerKm)}
                                            sub="min/km"
                                        />
                                        <StatCard
                                            icon={<Ionicons name="speedometer" size={17} color="#78DCE8" />}
                                            label="Ritmo mensual"
                                            value={formatStatPace(stats?.running.monthlyAvgPaceSecPerKm)}
                                            sub="min/km"
                                        />
                                    </View>

                                    <View className="flex-row" style={{ gap: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="map-outline" size={17} color={COLORS.primary} />}
                                            label="Distancia Semanal"
                                            value={formatStatDistance(stats?.running.weeklyDistanceMeters)}
                                        />
                                        <StatCard
                                            icon={<Ionicons name="trending-up-outline" size={17} color="#78DCE8" />}
                                            label="Distancia Mensual"
                                            value={formatStatDistance(stats?.running.monthlyDistanceMeters)}
                                        />
                                    </View>


                                </Section>

                                <Section >
                                    <View className='flex-row m-2 pb-2 items-center justify-between'>
                                        <View className='flex-row items-center'>
                                            <FontAwesome6 className='mr-2' name="dumbbell" size={18} color={COLORS.primary} />
                                            <Text className='text-md font-bold' style={{ color: '#fff' }}>
                                                Esfuerzo
                                            </Text>
                                        </View>
                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Esfuerzo',
                                                    'Ejercicios más difíciles: ejercicios con mayor promedio de esfuerzo registrado.\n\nEjercicios más fáciles: ejercicios con menor promedio de esfuerzo registrado.\n\nEsfuerzo promedio por ejercicio: promedio general de las valoraciones que hiciste en tus ejercicios.\n\nEstas métricas ayudan a detectar qué ejercicios te exigen más y cuáles vas dominando mejor.'
                                                )
                                            }
                                        />
                                    </View>
                                    <View className='mb-3'>
                                        <StatCard
                                            icon={<FontAwesome6 name="chart-simple" size={16} color={COLORS.primary} />}
                                            label="Esfuerzo promedio por ejercicio"
                                            value={formatRating(
                                                stats?.effort.avgEffortByExercise?.length
                                                    ? stats.effort.avgEffortByExercise.reduce((sum, item) => sum + item.avgEffort, 0) /
                                                    stats.effort.avgEffortByExercise.length
                                                    : null
                                            )}
                                        />
                                    </View>
                                    <View className='mx-2'>
                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 10 }}>
                                            Top ejercicios mejor rendimiento
                                        </Text>

                                        {stats?.effort.topHardestExercises?.length ? (
                                            stats.effort.topHardestExercises.slice(0, 3).map((item) => (
                                                <BarRow
                                                    key={item.exerciseId ?? item.exerciseName}
                                                    name={item.exerciseName}
                                                    value={toPercent(item.avgEffort)}
                                                />
                                            ))
                                        ) : (
                                            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 10 }}>
                                                Aún no hay datos suficientes.
                                            </Text>
                                        )}

                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginTop: 8, marginBottom: 10 }}>
                                            Ejercicios que fueron más difíciles
                                        </Text>

                                        {stats?.effort.topBestExercises?.length ? (
                                            stats.effort.topBestExercises.slice(0, 3).map((item) => (
                                                <BarRow
                                                    key={item.exerciseId ?? item.exerciseName}
                                                    name={item.exerciseName}
                                                    value={toPercent(item.avgEffort)}
                                                />
                                            ))
                                        ) : (
                                            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 10 }}>
                                                Aún no hay datos suficientes.
                                            </Text>
                                        )}
                                    </View>

                                </Section>
                            </>
                        )}

                    </ScrollView>
                </View>


                <View
                    className="m-2 flex-row justify-between px-2"
                >
                    <Pressable
                        onPress={() => router.replace('/home')}
                        className="flex-1 mr-2 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}>
                            Regresar al home
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => router.push('/statistics-history')}
                        className="flex-1  px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text

                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}>
                            Ver historial
                        </Text>
                    </Pressable>
                </View>
            </View>
            <Modal
                visible={infoModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setInfoModalVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.65)',
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
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <View className="flex-row items-center justify-between mb-3">
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 18,
                                    fontWeight: '800',
                                    flex: 1,
                                }}
                            >
                                {infoModalTitle}
                            </Text>

                            <Pressable
                                onPress={() => setInfoModalVisible(false)}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    backgroundColor: '#1b1b1b',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="close" size={18} color={COLORS.textLight} />
                            </Pressable>
                        </View>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 13,
                                lineHeight: 20,
                            }}
                        >
                            {infoModalText}
                        </Text>

                        <Pressable
                            onPress={() => setInfoModalVisible(false)}
                            style={{
                                marginTop: 16,
                                backgroundColor: COLORS.primary,
                                paddingVertical: 13,
                                borderRadius: 14,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#111', fontWeight: '800' }}>
                                Entendido
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>

    );
}