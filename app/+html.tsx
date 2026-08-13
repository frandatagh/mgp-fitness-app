import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, shrink-to-fit=no"
                />

                <title>Mardel Fitness</title>

                <meta
                    name="description"
                    content="App gratuita para crear, guardar y seguir rutinas de entrenamiento."
                />

                <meta name="theme-color" content="#0B0B0B" />

                <link rel="manifest" href="/mgp-fitness-app/manifest.json" />
                <link
                    rel="apple-touch-icon"
                    href="/mgp-fitness-app/icons/icon-192.png"
                />

                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-title" content="Mardel Fitness" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />

                <ScrollViewStyleReset />
            </head>

            <body>{children}</body>
        </html>
    );
}