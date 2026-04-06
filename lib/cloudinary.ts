const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

type CloudinaryUploadResponse = {
    asset_id: string;
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    width: number;
    height: number;
};

function guessMimeType(uri: string) {
    const lower = uri.toLowerCase();

    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';

    return 'image/jpeg';
}

export async function uploadProfileImageToCloudinary(
    asset: { uri: string; file?: File | null }
): Promise<CloudinaryUploadResponse> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Faltan variables de Cloudinary en el frontend.');
    }

    const formData = new FormData();

    // WEB: usar File real
    if (asset.file) {
        formData.append('file', asset.file);
    } else {
        // MOBILE: usar uri estilo React Native
        formData.append('file', {
            uri: asset.uri,
            type: guessMimeType(asset.uri),
            name: `profile_${Date.now()}.jpg`,
        } as any);
    }

    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'mgp/profile-images');

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
            method: 'POST',
            body: formData,
        }
    );

    const data = (await response.json().catch(() => null)) as
        | CloudinaryUploadResponse
        | { error?: { message?: string } }
        | null;

    if (!response.ok) {
        throw new Error(
            data && 'error' in data
                ? data.error?.message || 'No se pudo subir la imagen'
                : 'No se pudo subir la imagen'
        );
    }

    return data as CloudinaryUploadResponse;
}