import { Box, Typography, IconButton, Chip } from '@mui/material';
import ChartPanel from './components/ChartPanel';
import ThreeScene from './components/ThreeScene';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import LanguageIcon from '@mui/icons-material/Language';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import pako from 'pako';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
    const { toggleLanguage, t, language } = useLanguage();
    const socketRef = useRef(null);
    const [forceData, setForceData] = useState(null);
    const [socketStatus, setSocketStatus] = useState('disconnected');
    const lastLogTime = useRef(0);
    const prevSocketStatus = useRef('disconnected');
    const [serverFps, setServerFps] = useState(0);

    useEffect(() => {
        socketRef.current = io('http://localhost:5000', {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
            setSocketStatus('connected');
        });

        socketRef.current.on('status', (data) => {
            console.log('Server status:', data.message);
        });

        socketRef.current.on('sensor_initialized', (response) => {
            if (response.status === 'success') {
                toast.success(t('sensorInitialized'));
            } else {
                toast.error(t('sensorInitFailed') + ': ' + response.message);
            }
        });

        socketRef.current.on('data', (data) => {
            const tStart = performance.now();
            const { metadata, normal, shear, arrows } = data;
            const [height, width] = metadata.shape;

            try {
                const tDecompStart = performance.now();
                const normalDecompressed = pako.inflate(new Uint8Array(normal)).buffer;
                const shearDecompressed = pako.inflate(new Uint8Array(shear)).buffer;
                const arrowsDecompressed = pako.inflate(new Uint8Array(arrows)).buffer;
                const tDecompEnd = performance.now();

                const tParseStart = performance.now();
                const normalFlat = new Float32Array(normalDecompressed);
                const shearFlat = new Float32Array(shearDecompressed);
                const arrowsFlat = new Float32Array(arrowsDecompressed);

                const normal2D = Array.from({ length: height }, (_, i) =>
                    Array.from(normalFlat.slice(i * width, (i + 1) * width))
                );
                const shear2D = Array.from({ length: height }, (_, i) => {
                    const row = [];
                    for (let j = 0; j < width; j++) {
                        const idx = (i * width + j) * 2;
                        const shearX = shearFlat[idx];
                        const shearY = shearFlat[idx + 1];
                        const cleanedShearX = isFinite(shearX) && shearX !== null ? shearX : 0;
                        const cleanedShearY = isFinite(shearY) && shearY !== null ? shearY : 0;
                        const clampedShearX = Math.max(-100, Math.min(100, cleanedShearX));
                        const clampedShearY = Math.max(-100, Math.min(100, cleanedShearY));
                        row.push([clampedShearX, clampedShearY]);
                    }
                    return row;
                });

                const arrowCount = arrowsFlat.length / 4;
                const arrowsData = [];
                for (let i = 0; i < arrowCount; i++) {
                    const idx = i * 4;
                    arrowsData.push({
                        start: [arrowsFlat[idx], arrowsFlat[idx + 1]],
                        end: [arrowsFlat[idx + 2], arrowsFlat[idx + 3]],
                    });
                }

                const forceDataParsed = {
                    normal: normal2D,
                    shear: shear2D,
                    arrows: arrowsData,
                    timestamp: metadata.timestamp
                };
                const tParseEnd = performance.now();

                const tSetStart = performance.now();
                setForceData(forceDataParsed);
                setServerFps(metadata.serverFps || 0);
                const tSetEnd = performance.now();

            } catch (error) {
                console.error('处理数据出错:', error);
            }
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('连接错误:', error.message);
            setSocketStatus('error');
        });

        socketRef.current.on('disconnect', () => {
            setSocketStatus('disconnected');
        });

        socketRef.current.on('calibrate_response', (response) => {
            if (response.status === 'success') {
                toast.success(t('calibrationSuccess'));
            } else {
                toast.error(t('calibrationFailed') + ': ' + response.message);
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [t]);

    useEffect(() => {
        if (prevSocketStatus.current !== socketStatus) {
            if (socketStatus === 'connected') {
                toast.success(t('socketConnected'), {
                    position: 'top-right',
                    autoClose: 3000,
                });
            } else if (socketStatus === 'error' || socketStatus === 'disconnected') {
                toast.error(t('socketDisconnected'), {
                    position: 'top-right',
                    autoClose: 3000,
                });
            }
            prevSocketStatus.current = socketStatus;
        }
    }, [socketStatus, t]);

    const getStatusChip = () => {
        switch (socketStatus) {
            case 'connected':
                return (
                    <Chip
                        label={t('connected')}
                        color="success"
                        size="small"
                        sx={{ backgroundColor: '#4caf50', color: '#fff' }}
                    />
                );
            case 'disconnected':
                return (
                    <Chip
                        label={t('disconnected')}
                        color="error"
                        size="small"
                        sx={{ backgroundColor: '#f44336', color: '#fff' }}
                    />
                );
            case 'error':
                return (
                    <Chip
                        label={t('error')}
                        color="error"
                        size="small"
                        sx={{ backgroundColor: '#f44336', color: '#fff' }}
                    />
                );
            default:
                return (
                    <Chip
                        label={t('unknown')}
                        color="default"
                        size="small"
                        sx={{ backgroundColor: '#757575', color: '#fff' }}
                    />
                );
        }
    };

    const handleLanguageSwitch = () => {
        toggleLanguage();
        window.location.reload();
    };

    return (
        <LanguageProvider>
            <Box
                sx={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#121212',
                    overflow: 'hidden',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                }}
            >
                <Box
                    sx={{
                        height: '120px',
                        backgroundColor: '#121212',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, padding: '10px' }}>
                    <img src={new URL('./assets/logo.png', import.meta.url).href} alt="Logo" style={{ width: 360, height: 60 }} />                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: '#fff' }}>
                                {t('connectionStatus')}:
                            </Typography>
                            {getStatusChip()}
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                        <Typography variant="h3" sx={{ color: '#fff', margin: '0px 20px' }}>
                            {t('DM_Tac')}
                        </Typography>
                    </Box>
                    <IconButton onClick={handleLanguageSwitch} sx={{ color: '#fff', ml: 2 }}>
                        <LanguageIcon />
                    </IconButton>
                </Box>
                <Box sx={{ display: 'flex', height: 'calc(100% - 10px)', mb: 2 }}>
                    <Box sx={{ flex: '0 0 30%', height: '100%', overflow: 'hidden' }}>
                        <ChartPanel forceData={forceData} socketStatus={socketStatus} />
                    </Box>
                    <Box
                        sx={{
                            flex: '0 0 70%',
                            height: '100%',
                            overflow: 'hidden',
                            mr: 2,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {console.log('[App] Rendering ThreeScene, forceData:', forceData ? 'present' : 'null')}
                       { socketStatus === 'connected' && (
    <ThreeScene
        forceData={forceData}
        socket={socketRef.current}
        serverFps={serverFps}
        language={language}
        style={{ flexGrow: 1 }}
    />
)}
                    </Box>
                </Box>
            </Box>
            <ToastContainer position="top-right" autoClose={3000} />
        </LanguageProvider>
    );
};

export default App;