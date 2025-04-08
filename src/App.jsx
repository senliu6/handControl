import { Box, Typography, IconButton, Chip } from '@mui/material';
import ChartPanel from './components/ChartPanel';
import ThreeScene from './components/ThreeScene';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import LanguageIcon from '@mui/icons-material/Language';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
    const { toggleLanguage, t } = useLanguage();
    const socketRef = useRef(null);
    const [forceData, setForceData] = useState(null);
    const [socketStatus, setSocketStatus] = useState('disconnected');
    const lastLogTime = useRef(0);
    const prevSocketStatus = useRef('disconnected');
    const [serverFps, setServerFps] = useState(0); // 新增状态用于存储服务器帧率

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

        socketRef.current.on('data', (data) => {
            const t_receive = Date.now();
            const server_time = data.timestamp * 1000;
            // console.log('接收到的原始 WebSocket 数据:', data); // 打印原始数据
            try {
                const normalFlat = new Float32Array(new Uint8Array(data.normal).buffer);
                const shearFlat = new Float32Array(new Uint8Array(data.shear).buffer);
                const [height, width] = data.shape;

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


                const forceDataParsed = {
                    normal: normal2D,
                    shear: shear2D,
                    arrows: data.arrows, // 添加 arrows 字段
                    timestamp: data.timestamp
                };
                // console.log('解析后的 forceData:', forceDataParsed); // 打印解析后的数据
                // console.log('forceData.arrows:', forceDataParsed.arrows); // 专门打印 arrows
                setForceData(forceDataParsed);
                setServerFps(data.serverFps || 0); // 设置服务器帧率
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

        // 监听校准响应
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
                        height: '50px',
                        backgroundColor: '#1a1a1a',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, padding: '10px' }}>
                        <img src="/src/assets/logo.png" alt="Logo" style={{ width: 200, height: 30 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: '#fff' }}>
                                {t('connectionStatus')}:
                            </Typography>
                            {getStatusChip()}
                        </Box>
                    </Box>
                    <IconButton onClick={toggleLanguage} sx={{ color: '#fff', ml: 2 }}>
                        <LanguageIcon />
                    </IconButton>
                </Box>
                <Box sx={{ display: 'flex', height: 'calc(100% - 70px)', mb: 2 }}>
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
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                            <Typography variant="h3" sx={{ color: '#fff', margin: '0px 20px' }}>
                                {t('DM-Tac')}
                            </Typography>
                        </Box>
                        <ThreeScene forceData={forceData} socket={socketRef.current} serverFps={serverFps} style={{ flexGrow: 1 }} />
                    </Box>
                </Box>
            </Box>
            <ToastContainer position="top-right" autoClose={3000} />
        </LanguageProvider>
    );
};

export default App;