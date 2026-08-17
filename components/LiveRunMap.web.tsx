import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';

import type {
    Map as MapLibreMap,
    Marker as MapLibreMarker,
} from 'maplibre-gl';

type RunPoint = {
    latitude: number;
    longitude: number;
    segmentId?: number;
};

type Props = {
    currentPosition: RunPoint;
    routePoints?: RunPoint[];
    shouldFollowUser?: boolean;
    zoomLevel?: number;
    profileImageUrl?: string | null;
    recenterTick?: number;

    onMapPress?: (point: {
        latitude: number;
        longitude: number;
    }) => void;
};

function buildRouteGeoJson(
    points: RunPoint[]
) {
    const segments =
        new Map<number, RunPoint[]>();

    points.forEach((point) => {
        const segmentId =
            point.segmentId ?? 0;

        const existing =
            segments.get(segmentId) ?? [];

        existing.push(point);

        segments.set(
            segmentId,
            existing
        );
    });

    const features =
        Array.from(
            segments.entries()
        )
            .filter(
                ([, segmentPoints]) =>
                    segmentPoints.length >= 2
            )
            .map(
                ([
                    segmentId,
                    segmentPoints,
                ]) => ({
                    type: 'Feature',
                    properties: {
                        segmentId,
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates:
                            segmentPoints.map(
                                (point) => [
                                    point.longitude,
                                    point.latitude,
                                ]
                            ),
                    },
                })
            );

    return {
        type: 'FeatureCollection',
        features,
    };
}

const MAP_STYLE =
    'https://tiles.openfreemap.org/styles/positron';

const LiveRunMapWeb = forwardRef<any, Props>(
    (
        {
            currentPosition,
            routePoints = [],
            shouldFollowUser = true,
            zoomLevel = 16,
            recenterTick = 0,
            onMapPress,
        },
        ref
    ) => {
        const containerRef = useRef<HTMLDivElement | null>(null);

        const mapRef = useRef<MapLibreMap | null>(null);
        const userMarkerRef = useRef<MapLibreMarker | null>(null);
        const routePointsRef =
            useRef<RunPoint[]>(routePoints);

        useEffect(() => {
            routePointsRef.current =
                routePoints;
        }, [routePoints]);

        /*
         * 1. Crear mapa solamente una vez.
         *
         * Usamos import dinámico para que MapLibre se cargue
         * exclusivamente en el navegador.
         */
        useEffect(() => {
            if (!containerRef.current) return;

            let disposed = false;
            let localMap: MapLibreMap | null = null;
            let localMarker: MapLibreMarker | null = null;

            void import('maplibre-gl').then((module) => {
                const maplibregl = (module.default ?? module) as typeof module;

                if (disposed || !containerRef.current) return;

                const map = new maplibregl.Map({
                    container: containerRef.current,
                    style: MAP_STYLE,
                    center: [
                        currentPosition.longitude,
                        currentPosition.latitude,
                    ],
                    zoom: zoomLevel,
                });

                localMap = map;
                mapRef.current = map;
                map.on('load', () => {
                    if (!map.getSource('run-route')) {
                        map.addSource('run-route', {
                            type: 'geojson',
                            data: buildRouteGeoJson(
                                routePointsRef.current
                            ) as any,
                        });
                    }

                    if (!map.getLayer('run-route-shadow')) {
                        map.addLayer({
                            id: 'run-route-shadow',
                            type: 'line',
                            source: 'run-route',

                            layout: {
                                'line-cap': 'round',
                                'line-join': 'round',
                            },

                            paint: {
                                'line-color': '#65A30D',
                                'line-width': 9,
                                'line-opacity': 0.55,
                            },
                        });
                    }

                    if (!map.getLayer('run-route-line')) {
                        map.addLayer({
                            id: 'run-route-line',
                            type: 'line',
                            source: 'run-route',

                            layout: {
                                'line-cap': 'round',
                                'line-join': 'round',
                            },

                            paint: {
                                'line-color': '#C6FF00',
                                'line-width': 5,
                                'line-opacity': 1,
                            },
                        });
                    }
                });

                /*
                 * Marcador personalizado del usuario.
                 *
                 * Por ahora es sencillo.
                 * Después vamos a poner foto de perfil,
                 * igual que en mobile.
                 */
                const markerElement = document.createElement('div');

                markerElement.style.width = '26px';
                markerElement.style.height = '26px';
                markerElement.style.borderRadius = '50%';
                markerElement.style.backgroundColor = '#C6FF00';
                markerElement.style.border = '4px solid #111111';
                markerElement.style.boxShadow =
                    '0 2px 10px rgba(0,0,0,0.45)';

                const marker = new maplibregl.Marker({
                    element: markerElement,
                    anchor: 'center',
                })
                    .setLngLat([
                        currentPosition.longitude,
                        currentPosition.latitude,
                    ])
                    .addTo(map);

                localMarker = marker;
                userMarkerRef.current = marker;

                /*
                 * Click/tap del mapa.
                 *
                 * Todavía no lo usamos, pero lo dejamos preparado
                 * para el futuro punto de llegada.
                 */
                map.on('click', (event) => {
                    onMapPress?.({
                        latitude: event.lngLat.lat,
                        longitude: event.lngLat.lng,
                    });
                });

                map.on('error', (event) => {
                    console.error(
                        'MapLibre web error:',
                        event.error
                    );
                });
            });

            return () => {
                disposed = true;

                localMarker?.remove();
                localMap?.remove();

                userMarkerRef.current = null;
                mapRef.current = null;
            };
        }, []);

        /*
         * 2. Cada vez que cambia el GPS,
         * mover el marcador.
         */
        useEffect(() => {
            if (!currentPosition) return;

            const coords: [number, number] = [
                currentPosition.longitude,
                currentPosition.latitude,
            ];

            userMarkerRef.current?.setLngLat(coords);

            /*
             * Si estamos siguiendo al corredor,
             * mover también la cámara.
             */
            if (shouldFollowUser && mapRef.current) {
                mapRef.current.easeTo({
                    center: coords,
                    zoom: zoomLevel,
                    duration: 700,
                });
            }
        }, [
            currentPosition.latitude,
            currentPosition.longitude,
            shouldFollowUser,
            zoomLevel,
        ]);

        /*
         * 3. Recentrar cuando cambie recenterTick.
         */
        useEffect(() => {
            if (!mapRef.current) return;

            mapRef.current.easeTo({
                center: [
                    currentPosition.longitude,
                    currentPosition.latitude,
                ],
                zoom: zoomLevel,
                duration: 600,
            });
        }, [recenterTick]);

        useEffect(() => {
            const map = mapRef.current;

            if (!map) return;

            const updateRoute = () => {
                const source =
                    map.getSource(
                        'run-route'
                    ) as any;

                if (!source) return;

                source.setData(
                    buildRouteGeoJson(
                        routePoints
                    ) as any
                );
            };

            if (map.isStyleLoaded()) {
                updateRoute();
            } else {
                map.once(
                    'load',
                    updateRoute
                );
            }
        }, [routePoints]);

        /*
         * 4. Métodos que podrá llamar liverun.web.
         *
         * Los hacemos equivalentes a los que ya usamos
         * en la implementación mobile.
         */
        useImperativeHandle(ref, () => ({
            recenterOnUser: (
                coordinate?: [number, number],
                requestedZoom?: number
            ) => {
                const center: [number, number] =
                    coordinate ?? [
                        currentPosition.longitude,
                        currentPosition.latitude,
                    ];

                mapRef.current?.easeTo({
                    center,
                    zoom: requestedZoom ?? zoomLevel,
                    duration: 600,
                });
            },

            fitBounds: (
                ne: [number, number],
                sw: [number, number],
                padding = 60,
                duration = 600
            ) => {
                mapRef.current?.fitBounds(
                    [sw, ne],
                    {
                        padding,
                        duration,
                    }
                );
            },
        }));

        return (
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 300,
                    backgroundColor: '#111111',
                }}
            />
        );
    }
);

LiveRunMapWeb.displayName = 'LiveRunMapWeb';

export default LiveRunMapWeb;