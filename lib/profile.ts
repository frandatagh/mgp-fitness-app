import { apiFetch } from './api';

export type PlanType = 'standard' | 'pro' | 'professional';

export type ProfileUser = {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    updatedAt: string;
};

export type UserProfile = {
    id: string;
    userId: string;
    goal: string | null;
    heightCm: number | null;
    weightKg: number | null;
    birthDate: string | null;
    profileImageUrl: string | null;
    planType: PlanType;
    weeklyKmGoal: number | null;
    createdAt: string;
    updatedAt: string;
};

export type MyProfileResponse = {
    user: ProfileUser;
    profile: UserProfile;
};

export type UpdateMyProfilePayload = {
    name?: string;
    goal?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    birthDate?: string | null;
    profileImageUrl?: string | null;
    planType?: PlanType;
    weeklyKmGoal?: number | null;
};

export async function getMyProfile(): Promise<MyProfileResponse> {
    const res = await apiFetch('/profile/me', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = (await res.json().catch(() => null)) as
        | MyProfileResponse
        | { message?: string }
        | null;

    if (!res.ok) {
        throw new Error(
            (data && 'message' in data && data.message) ||
            'No se pudo cargar el perfil'
        );
    }

    return data as MyProfileResponse;
}

export async function updateMyProfile(
    payload: UpdateMyProfilePayload
): Promise<MyProfileResponse & { message: string }> {
    const res = await apiFetch('/profile/me', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => null)) as
        | (MyProfileResponse & { message: string })
        | { message?: string }
        | null;

    if (!res.ok) {
        throw new Error(
            (data && 'message' in data && data.message) ||
            'No se pudo actualizar el perfil'
        );
    }

    return data as MyProfileResponse & { message: string };
}