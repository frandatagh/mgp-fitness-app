import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import AppHeader from '../../components/AppHeader';
import { parseRoutineText } from '../../utils/parseRoutineText';
import { uploadRoutineImageForOcr } from '../../lib/ocr';

export default function ScanPhotoScreen() {
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [processStep, setProcessStep] = useState('');

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
            Alert.alert(
                'Permiso necesario',
                'Necesitamos permiso para usar la cámara y poder escanear tu rutina.'
            );
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.85,
        });

        if (result.canceled) return;

        const image = result.assets?.[0];

        if (!image?.uri) {
            Alert.alert('Error', 'No se pudo obtener la imagen.');
            return;
        }

        setSelectedImageUri(image.uri);
    };

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert(
                'Permiso necesario',
                'Necesitamos permiso para acceder a tus imágenes.'
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.85,
        });

        if (result.canceled) return;

        const image = result.assets?.[0];

        if (!image?.uri) {
            Alert.alert('Error', 'No se pudo obtener la imagen.');
            return;
        }

        setSelectedImageUri(image.uri);
    };

    const processRoutineImage = async () => {
        if (!selectedImageUri) {
            Alert.alert(
                'Falta una imagen',
                'Primero sacá una foto o seleccioná una imagen de tu rutina.'
            );
            return;
        }

        try {
            setProcessing(true);

            setProcessStep('Preparando imagen...');
            await wait(500);

            setProcessStep('Enviando imagen al lector OCR...');
            const ocrResult = await uploadRoutineImageForOcr(selectedImageUri);

            const rawText = ocrResult.rawText?.trim() ?? '';

            console.log('\n\n================ OCR TEXTO COMPLETO ================');
            console.log(rawText);
            console.log('================ FIN OCR TEXTO COMPLETO ================\n\n');

            if (!rawText) {
                setProcessing(false);

                Alert.alert(
                    'No se detectó texto',
                    'No pudimos leer texto en la imagen. Probá con una foto más clara, buena luz y el papel bien enfocado.'
                );
                return;
            }

            setProcessStep('Detectando ejercicios, series y repeticiones...');
            await wait(500);

            const parsedResult = parseRoutineText(rawText);

            console.log('\n\n================ RESULTADO PARSER OCR ================');
            console.log(JSON.stringify(parsedResult, null, 2));
            console.log('================ FIN RESULTADO PARSER OCR ================\n\n');

            if (parsedResult.exercises.length === 0) {
                setProcessing(false);

                Alert.alert(
                    'No se detectaron ejercicios',
                    'Se leyó texto en la imagen, pero no pudimos convertirlo en ejercicios. Probá con una rutina más clara o revisá el formato.'
                );
                return;
            }

            setProcessStep('Preparando pantalla de revisión...');
            await wait(500);

            setProcessing(false);

            router.push({
                pathname: '/routine/review-import',
                params: {
                    imageUri: selectedImageUri,
                    title: parsedResult.title,
                    parsedExercises: JSON.stringify(parsedResult.exercises),
                    source: 'scan-photo-ocr',
                },
            });
        } catch (error) {
            console.log('Error procesando imagen:', error);

            setProcessing(false);

            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No se pudo procesar la imagen. Probá con otra foto más clara.'
            );
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#111111' }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 28,
                }}
            >
                <AppHeader showProfile={false} />

                <View
                    style={{
                        backgroundColor: '#1A1A1A',
                        borderRadius: 26,
                        borderWidth: 1,
                        borderColor: 'rgba(198,255,0,0.35)',
                        padding: 16,
                        marginTop: 8,
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                    >
                        <View
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 16,
                                backgroundColor: '#111111',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                                borderWidth: 1,
                                borderColor: '#333333',
                            }}
                        >
                            <Ionicons
                                name="camera-outline"
                                size={26}
                                color={COLORS.primary}
                            />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    color: COLORS.primary,
                                    fontSize: 13,
                                    fontWeight: '900',
                                }}
                            >
                                Escaneo inteligente
                            </Text>

                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 21,
                                    fontWeight: '900',
                                    marginTop: 2,
                                }}
                            >
                                Escanear rutina con foto
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 13,
                            lineHeight: 20,
                            marginBottom: 14,
                        }}
                    >
                        Sacá una foto a una rutina en papel o elegí una imagen de tu galería.
                        La app intentará detectar ejercicios, series, repeticiones y notas para crear una rutina editable.
                    </Text>

                    <View
                        style={{
                            backgroundColor: 'rgba(255,193,7,0.08)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,193,7,0.25)',
                            borderRadius: 18,
                            padding: 13,
                            marginBottom: 16,
                        }}
                    >
                        <Text
                            style={{
                                color: '#FFD36A',
                                fontSize: 13,
                                fontWeight: '900',
                                marginBottom: 5,
                            }}
                        >
                            Recomendaciones
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 12,
                                lineHeight: 18,
                            }}
                        >
                            Usá buena iluminación, enfocá bien el papel y evitá sombras. Esta primera versión funcionará mejor con texto impreso o letra muy clara. No se garantiza lectura correcta de manuscritos, fotos borrosas o tablas muy complejas.
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                            onPress={takePhoto}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: pressed
                                    ? 'rgba(198,255,0,0.18)'
                                    : COLORS.primary,
                                borderRadius: 16,
                                paddingVertical: 13,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                            })}
                        >
                            <Ionicons
                                name="camera"
                                size={18}
                                color="#111111"
                                style={{ marginRight: 7 }}
                            />

                            <Text
                                style={{
                                    color: '#111111',
                                    fontSize: 13,
                                    fontWeight: '900',
                                }}
                            >
                                Sacar foto
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={pickImage}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: pressed ? '#333333' : '#2A2A2A',
                                borderRadius: 16,
                                paddingVertical: 13,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                borderWidth: 1,
                                borderColor: '#3A3A3A',
                            })}
                        >
                            <Ionicons
                                name="image-outline"
                                size={18}
                                color={COLORS.textLight}
                                style={{ marginRight: 7 }}
                            />

                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 13,
                                    fontWeight: '900',
                                }}
                            >
                                Galería
                            </Text>
                        </Pressable>
                    </View>
                </View>

                <View
                    style={{
                        backgroundColor: '#1A1A1A',
                        borderRadius: 26,
                        borderWidth: 1,
                        borderColor: '#2F2F2F',
                        padding: 16,
                        marginTop: 14,
                    }}
                >
                    <Text
                        style={{
                            color: COLORS.textLight,
                            fontSize: 16,
                            fontWeight: '900',
                            marginBottom: 10,
                        }}
                    >
                        Imagen seleccionada
                    </Text>

                    {selectedImageUri ? (
                        <>
                            <Image
                                source={{ uri: selectedImageUri }}
                                style={{
                                    width: '100%',
                                    height: 260,
                                    borderRadius: 20,
                                    backgroundColor: '#111111',
                                    borderWidth: 1,
                                    borderColor: '#333333',
                                }}
                                resizeMode="cover"
                            />

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                                <Pressable
                                    onPress={() => setSelectedImageUri(null)}
                                    style={({ pressed }) => ({
                                        flex: 1,
                                        backgroundColor: pressed ? '#333333' : '#2A2A2A',
                                        borderRadius: 16,
                                        paddingVertical: 13,
                                        alignItems: 'center',
                                    })}
                                >
                                    <Text
                                        style={{
                                            color: COLORS.textLight,
                                            fontSize: 13,
                                            fontWeight: '900',
                                        }}
                                    >
                                        Quitar
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={processRoutineImage}
                                    disabled={processing}
                                    style={({ pressed }) => ({
                                        flex: 1,
                                        backgroundColor: pressed
                                            ? '#B8F000'
                                            : COLORS.primary,
                                        borderRadius: 16,
                                        paddingVertical: 13,
                                        alignItems: 'center',
                                    })}
                                >
                                    <Text
                                        style={{
                                            color: '#111111',
                                            fontSize: 13,
                                            fontWeight: '900',
                                        }}
                                    >
                                        Procesar rutina
                                    </Text>
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        <View
                            style={{
                                minHeight: 190,
                                borderRadius: 20,
                                backgroundColor: '#111111',
                                borderWidth: 1,
                                borderColor: '#333333',
                                borderStyle: 'dashed',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 18,
                            }}
                        >
                            <Ionicons
                                name="image-outline"
                                size={42}
                                color={COLORS.textMuted}
                                style={{ marginBottom: 10 }}
                            />

                            <Text
                                style={{
                                    color: COLORS.textMuted,
                                    fontSize: 13,
                                    textAlign: 'center',
                                    lineHeight: 19,
                                }}
                            >
                                Todavía no seleccionaste ninguna imagen. Sacá una foto o elegí una desde tu galería.
                            </Text>
                        </View>
                    )}
                </View>

                <Pressable
                    onPress={() => router.back()}
                    style={{
                        marginTop: 14,
                        backgroundColor: '#2A2A2A',
                        borderRadius: 16,
                        paddingVertical: 13,
                        alignItems: 'center',
                    }}
                >
                    <Text
                        style={{
                            color: COLORS.textLight,
                            fontSize: 14,
                            fontWeight: '900',
                        }}
                    >
                        Volver
                    </Text>
                </Pressable>
            </ScrollView>

            <Modal visible={processing} transparent animationType="fade">
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
                            maxWidth: 340,
                            backgroundColor: '#111111',
                            borderRadius: 26,
                            borderWidth: 1,
                            borderColor: 'rgba(198,255,0,0.35)',
                            padding: 22,
                            alignItems: 'center',
                        }}
                    >
                        <ActivityIndicator size="large" color={COLORS.primary} />

                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 19,
                                fontWeight: '900',
                                marginTop: 16,
                                marginBottom: 8,
                                textAlign: 'center',
                            }}
                        >
                            Procesando rutina...
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 13,
                                lineHeight: 19,
                                textAlign: 'center',
                            }}
                        >
                            {processStep || 'Preparando escaneo...'}
                        </Text>

                        <View
                            style={{
                                marginTop: 18,
                                backgroundColor: 'rgba(255,193,7,0.08)',
                                borderWidth: 1,
                                borderColor: 'rgba(255,193,7,0.25)',
                                borderRadius: 16,
                                padding: 12,
                            }}
                        >
                            <Text
                                style={{
                                    color: '#FFD36A',
                                    fontSize: 12,
                                    fontWeight: '900',
                                    marginBottom: 4,
                                }}
                            >
                                Importante
                            </Text>

                            <Text
                                style={{
                                    color: COLORS.textMuted,
                                    fontSize: 11,
                                    lineHeight: 16,
                                    textAlign: 'center',
                                }}
                            >
                                Al finalizar, siempre podrás revisar y corregir los ejercicios antes de guardar la rutina.
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}