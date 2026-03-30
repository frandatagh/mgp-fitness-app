// app/contact.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

import { submitContactMessage, type InquiryType, type ContactPayload } from '../lib/contact';

type InquiryTypeForm = '' | 'technical' | 'general' | 'suggestion' | 'bug' | 'other';

type ContactFormData = {
    name: string;
    email: string;
    inquiryType: InquiryTypeForm;
    subject: string;
    message: string;
};


const inquiryOptions: { value: InquiryType; label: string }[] = [
    { value: 'technical', label: 'Problema técnico' },
    { value: 'general', label: 'Consulta general' },
    { value: 'suggestion', label: 'Sugerencia' },
    { value: 'bug', label: 'Reporte de error' },
    { value: 'other', label: 'Otro' },
];

export default function ContactScreen() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();

    const [sending, setSending] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);



    // 👇 nuevo modal de error
    const [errorVisible, setErrorVisible] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);


    const didPrefillRef = useRef(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContactFormData>({
        defaultValues: {
            name: '',
            email: '',
            inquiryType: '',
            subject: '',
            message: '',
        },
        mode: 'onSubmit',
        reValidateMode: 'onChange',
    });

    useEffect(() => {
        if (didPrefillRef.current) return;

        if (isAuthenticated) {
            reset({
                name: user?.name ?? '',
                email: user?.email ?? '',
                inquiryType: '',
                subject: '',
                message: '',
            });
            didPrefillRef.current = true;
        }
    }, [isAuthenticated, user, reset]);

    const handleBack = () => {
        router.replace(isAuthenticated ? '/home' : '/');
    };

    const onSubmit = async (data: ContactFormData) => {
        try {
            setSending(true);
            setSubmitError(null);

            const payload: ContactPayload = {
                name: data.name,
                email: data.email,
                inquiryType: data.inquiryType as InquiryType,
                subject: data.subject,
                message: data.message,
                sentFrom: isAuthenticated ? 'authenticated' : 'guest',
                platform: Platform.OS,
                accountName: user?.name ?? null,
                accountEmail: user?.email ?? null,
            };

            await submitContactMessage(payload);

            reset({
                name: '',
                email: '',
                inquiryType: '',
                subject: '',
                message: '',
            });

            setSuccessVisible(true);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'No se pudo enviar el mensaje. Intenta nuevamente.';

            setSubmitError(message);
            setErrorVisible(true);
        } finally {
            setSending(false);
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View
                    className="flex-1 px-4 pt-1"
                    style={{ maxWidth: 800, alignSelf: 'center' }}
                >
                    {/* LOGO */}
                    <View className="items-center">
                        <Image
                            source={require('../assets/img/iconmgp.png')}
                            style={{ width: 85, height: 85, resizeMode: 'contain' }}
                        />
                    </View>

                    {/* TÍTULO */}
                    <View className="mb-2 px-4">
                        <Text
                            className="text-md text-gray-500"
                        >
                            Contáctanos
                        </Text>
                    </View>

                    {/* PANEL PRINCIPAL */}
                    <View
                        className="flex-1 rounded-3xl px-3 py-4"
                        style={{ borderWidth: 2, borderColor: COLORS.primary }}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Introducción */}
                            <Text
                                className="text-[13px] mt-2 mb-4 leading-5 px-4"
                                style={{ color: COLORS.textMuted }}
                            >
                                Si tienes una duda, un problema o una sugerencia, puedes escribirnos
                                desde aquí. Responderemos tan pronto como sea posible y te mantendremos al tanto.
                                {'\n'}Intenta describir tu consulta con la máxima claridad para poder
                                ayudarte mejor.
                            </Text>

                            {/* Nombre */}
                            <Text
                                className="text-[13px] font-semibold mt-2 px-4"
                                style={{ color: COLORS.textLight }}
                            >
                                Nombre
                            </Text>
                            <Controller
                                control={control}
                                name="name"
                                rules={{
                                    required: 'Ingresa tu nombre.',
                                    minLength: {
                                        value: 2,
                                        message: 'El nombre debe tener al menos 2 caracteres.',
                                    },
                                }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="Tu nombre"
                                        placeholderTextColor={COLORS.textMuted}
                                        className="rounded-2xl px-4 py-3 m-2"
                                        style={{
                                            fontSize: 13,
                                            backgroundColor: '#111111',
                                            color: COLORS.textLight,
                                            borderWidth: 1,
                                            borderColor: errors.name ? '#FF8A8A' : '#2B2B2B',
                                        }}
                                    />
                                )}
                            />
                            {errors.name && (
                                <Text
                                    className="text-[12px] mb-3 px-4"
                                    style={{ color: '#7EA61A' }}
                                >
                                    {errors.name.message}
                                </Text>
                            )}

                            {/* Email */}
                            <Text
                                className="text-[13px] font-semibold px-4"
                                style={{ color: COLORS.textLight }}
                            >
                                Correo electrónico
                            </Text>
                            <Controller
                                control={control}
                                name="email"
                                rules={{
                                    required: 'Ingresa tu correo electrónico.',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: 'Ingresa un correo electrónico válido.',
                                    },
                                }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        value={value}
                                        onChangeText={text => onChange(text.trim())}
                                        onBlur={onBlur}
                                        placeholder="correo@ejemplo.com"
                                        placeholderTextColor={COLORS.textMuted}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        className="rounded-2xl px-4 py-3 m-2"
                                        style={{
                                            fontSize: 13,
                                            backgroundColor: '#111111',
                                            color: COLORS.textLight,
                                            borderWidth: 1,
                                            borderColor: errors.email ? '#FF8A8A' : '#2B2B2B',
                                        }}
                                    />
                                )}
                            />
                            {errors.email && (
                                <Text
                                    className="text-[12px] mb-3 px-4"
                                    style={{ color: '#7EA61A' }}
                                >
                                    {errors.email.message}
                                </Text>
                            )}

                            {/* Tipo de consulta */}
                            <Text
                                className="text-[13px] font-semibold px-4 mb-1"
                                style={{ color: COLORS.textLight }}
                            >
                                Tipo de consulta
                            </Text>
                            <Controller
                                control={control}
                                name="inquiryType"
                                rules={{
                                    required: 'Selecciona un tipo de consulta.',
                                }}
                                render={({ field: { onChange, value } }) => (
                                    <View className="flex-row flex-wrap mb-1 px-3">
                                        {inquiryOptions.map(option => {
                                            const selected = value === option.value;

                                            return (
                                                <Pressable
                                                    key={option.value}
                                                    onPress={() => onChange(option.value)}
                                                    className="mr-2 mb-2 px-3 py-2 rounded-full"
                                                    style={{
                                                        backgroundColor: selected ? COLORS.primary : '#111111',
                                                        borderWidth: 1,
                                                        borderColor: selected ? COLORS.primary : '#2B2B2B',
                                                    }}
                                                >
                                                    <Text
                                                        className="text-[13px] font-medium"
                                                        style={{
                                                            color: selected ? '#111111' : COLORS.textLight,
                                                        }}
                                                    >
                                                        {option.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}
                            />
                            {errors.inquiryType && (
                                <Text
                                    className="text-[12px] mb-3 px-4"
                                    style={{ color: '#7EA61A' }}
                                >
                                    {errors.inquiryType.message}
                                </Text>
                            )}

                            {/* Asunto */}
                            <Text
                                className="text-[13px] font-semibold px-4"
                                style={{ color: COLORS.textLight }}
                            >
                                Asunto
                            </Text>
                            <Controller
                                control={control}
                                name="subject"
                                rules={{
                                    required: 'Ingresa un asunto.',
                                    minLength: {
                                        value: 4,
                                        message: 'El asunto debe tener al menos 4 caracteres.',
                                    },
                                    maxLength: {
                                        value: 80,
                                        message: 'El asunto no debe superar los 80 caracteres.',
                                    },
                                }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="Ej: No puedo guardar una rutina"
                                        placeholderTextColor={COLORS.textMuted}
                                        className="rounded-2xl px-4 py-3 m-1"
                                        style={{
                                            fontSize: 13,
                                            backgroundColor: '#111111',
                                            color: COLORS.textLight,
                                            borderWidth: 1,
                                            borderColor: errors.subject ? '#FF8A8A' : '#2B2B2B',
                                        }}
                                    />
                                )}
                            />
                            {errors.subject && (
                                <Text
                                    className="text-[12px] mb-3 px-4"
                                    style={{ color: '#7EA61A' }}
                                >
                                    {errors.subject.message}
                                </Text>
                            )}

                            {/* Mensaje */}
                            <Text
                                className="text-[13px] font-semibold px-4"
                                style={{ color: COLORS.textLight }}
                            >
                                Mensaje
                            </Text>
                            <Controller
                                control={control}
                                name="message"
                                rules={{
                                    required: 'Describe tu consulta o problema.',
                                    minLength: {
                                        value: 15,
                                        message: 'El mensaje debe tener al menos 15 caracteres.',
                                    },
                                    maxLength: {
                                        value: 1000,
                                        message: 'El mensaje no debe superar los 1000 caracteres.',
                                    },
                                }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="Escribe aquí tu mensaje..."
                                        placeholderTextColor={COLORS.textMuted}
                                        multiline
                                        textAlignVertical="top"
                                        className="rounded-2xl px-4 py-3 m-1"
                                        style={{
                                            minHeight: 130,
                                            fontSize: 13,
                                            backgroundColor: '#111111',
                                            color: COLORS.textLight,
                                            borderWidth: 1,
                                            borderColor: errors.message ? '#FF8A8A' : '#2B2B2B',
                                        }}
                                    />
                                )}
                            />
                            {errors.message && (
                                <Text
                                    className="text-[12px] mb-3 px-4"
                                    style={{ color: '#7EA61A' }}
                                >
                                    {errors.message.message}
                                </Text>
                            )}

                            {/* Botón Enviar */}
                            <View className="mt-2 mb-4">
                                <Pressable
                                    onPress={handleSubmit(onSubmit)}
                                    disabled={sending}
                                    className="mx-1 px-4 py-4 rounded-xl items-center justify-center"
                                    style={{
                                        backgroundColor: sending ? '#7EA61A' : COLORS.primary,
                                    }}
                                >
                                    <Text
                                        className="text-[14px] font-semibold"
                                        style={{ color: '#111111' }}
                                    >
                                        {sending ? 'Enviando...' : 'Enviar mensaje'}
                                    </Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>

                    {/* FOOTER: un solo botón */}
                    <View className="mt-2 px-2 pb-2">
                        <Pressable
                            onPress={handleBack}
                            className="px-4 py-4 rounded-xl items-center justify-center"
                            style={{ backgroundColor: '#111111', borderColor: '#2B2B2B', borderWidth: 1 }}
                        >
                            <Text
                                className="text-[14px] font-normal"
                                style={{ color: COLORS.textLight }}
                            >
                                Volver
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* MODAL DE ÉXITO */}
            <Modal
                visible={successVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSuccessVisible(false)}
            >
                <View
                    className="flex-1 justify-center items-center px-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    <View
                        className="w-full max-w-xs rounded-3xl px-5 py-5"
                        style={{
                            backgroundColor: '#111111',
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                        }}
                    >
                        {/* Cerrar modal */}
                        <View className="items-end">
                            <Pressable
                                onPress={() => setSuccessVisible(false)}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={20} color={COLORS.textLight} />
                            </Pressable>
                        </View>

                        {/* Ícono de listo */}
                        <View className="items-center mt-1 mb-3">
                            <Ionicons
                                name="checkmark-circle"
                                size={65}
                                color={COLORS.primary}
                            />
                        </View>

                        {/* Título */}
                        <Text
                            className="text-[20px] font-semibold text-center mb-2"
                            style={{ color: COLORS.textLight }}
                        >
                            ¡Tu mensaje ha sido enviado correctamente!
                        </Text>

                        {/* Subtítulo */}
                        <Text
                            className="text-[13px] text-center mb-4"
                            style={{ color: COLORS.textMuted }}
                        >
                            Mensaje enviado correctamente. Nos pondremos en contacto contigo
                            lo antes posible.
                        </Text>

                        {/* Volver */}
                        <Pressable
                            onPress={() => {
                                setSuccessVisible(false);
                                handleBack();
                            }}
                            className="items-center"
                            style={{
                                backgroundColor: '#111111',
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                                borderRadius: 9999
                            }}
                        >
                            <Text
                                className="text-[13px] font-semibold underline"
                                style={{
                                    color: COLORS.textLight
                                }}
                            >
                                Volver
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
            {/* MODAL DE ERROR */}
            <Modal
                visible={errorVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setErrorVisible(false)}
            >
                <View
                    className="flex-1 justify-center items-center px-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    <View
                        className="w-full max-w-xs rounded-3xl px-5 py-5"
                        style={{
                            backgroundColor: '#111111',
                            borderWidth: 1,
                            borderColor: '#FF8A8A',
                        }}
                    >
                        <Text
                            className="text-[16px] font-semibold text-center mb-2"
                            style={{ color: COLORS.textLight }}
                        >
                            No se pudo enviar el mensaje
                        </Text>

                        <Text
                            className="text-[13px] text-center mb-4"
                            style={{ color: COLORS.textMuted }}
                        >
                            {submitError ?? 'Ocurrió un error inesperado. Intenta nuevamente.'}
                        </Text>

                        <Pressable
                            onPress={() => setErrorVisible(false)}
                            className="px-4 py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: '#444444' }}
                        >
                            <Text
                                className="text-[14px] font-semibold"
                                style={{ color: COLORS.textLight }}
                            >
                                Cerrar
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
}