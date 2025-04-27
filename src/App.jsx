import { Box, Typography, IconButton, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import ChartPanel from './components/ChartPanel';
import ThreeScene from './components/ThreeScene';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsIcon from '@mui/icons-material/Settings';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import pako from 'pako';
import 'react-toastify/dist/ReactToastify.css';



// 获取 WebSocket 地址
const getWebSocketUrl = () => {
    // 从 localStorage 获取用户配置
    const savedConfig = localStorage.getItem('websocketConfig');
    if (savedConfig) {
        const { ip, port } = JSON.parse(savedConfig);
        return `ws://${ip}:${port}`;
    }
    // 默认地址
    const host = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${host}:5000`;
};

const App = () => {
    const { toggleLanguage, t, language } = useLanguage();
    const socketRef = useRef(null);
    const [forceData, setForceData] = useState(null);
    const [socketStatus, setSocketStatus] = useState('disconnected');
    const [connectedDevices, setConnectedDevices] = useState([]);
    const lastLogTime = useRef(0);
    const prevSocketStatus = useRef('disconnected');
    const [serverFps, setServerFps] = useState(0);
    const [fetchDevicesTrigger, setFetchDevicesTrigger] = useState(0);
    // 配置窗口状态
    const [openConfigDialog, setOpenConfigDialog] = useState(false);
    const [configIp, setConfigIp] = useState('');
    const [configPort, setConfigPort] = useState('');

    // 根据语言设置文档标题
    useEffect(() => {
        document.title = t('titleTop');
    }, [language, t]);

    // 初始化时加载保存的配置
    useEffect(() => {
        const savedConfig = localStorage.getItem('websocketConfig');
        if (savedConfig) {
            const { ip, port } = JSON.parse(savedConfig);
            setConfigIp(ip);
            setConfigPort(port);
        } else {
            setConfigIp(window.location.hostname || 'localhost');
            setConfigPort('5000');
        }
    }, []);

    // WebSocket 连接逻辑
    useEffect(() => {
        const wsUrl = getWebSocketUrl();
        console.log(`正在连接到 WebSocket: ${wsUrl}`);
        socketRef.current = io(wsUrl, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
            setSocketStatus('connected');
        });

        socketRef.current.on('status', (data) => {
            console.log('服务器状态:', data.message);
        });

        socketRef.current.on('sensor_initialized', (response) => {
            if (response.status === 'success') {
                toast.success(t('sensorInitialized'));
            } else {
                toast.error(t('sensorInitFailed') + ': ');
            }
        });

        socketRef.current.on('connected_devices', (response) => {
            if (response.status === 'success') {
                setConnectedDevices(response.devices || []);
                if (response.devices.length === 0) {
                    toast.info(t('noDevicesFound'));
                }
            } else {
                toast.error(t('fetchDevicesFailed') + ': ');
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
                    timestamp: metadata.timestamp,
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
                toast.error(t('calibrationFailed') + ': ');
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [t]);

    useEffect(() => {
        if (fetchDevicesTrigger > 0 && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('get_connected_devices', {});
        }
    }, [fetchDevicesTrigger]);

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
                        size="14px"
                        sx={{ backgroundColor: '#4caf50', color: '#fff', padding: '10px' }}
                    />
                );
            case 'disconnected':
                return (
                    <Chip
                        label={t('disconnected')}
                        color="error"
                        size="14px"
                        sx={{ backgroundColor: '#f44336', color: '#fff' }}
                    />
                );
            case 'error':
                return (
                    <Chip
                        label={t('disconnected')}
                        color="error"
                        size="14px"
                        sx={{ backgroundColor: '#f44336', color: '#fff' }}
                    />
                );
            default:
                return (
                    <Chip
                        label={t('unknown')}
                        color="default"
                        size="14px"
                        sx={{ backgroundColor: '#757575', color: '#fff' }}
                    />
                );
        }
    };

    const handleLanguageSwitch = () => {
        toggleLanguage();
        window.location.reload();
    };

    const handleFetchDevices = () => {
        setFetchDevicesTrigger(prev => prev + 1);
    };

    // 配置窗口处理
    const handleOpenConfigDialog = () => {
        setOpenConfigDialog(true);
    };

    const handleCloseConfigDialog = () => {
        setOpenConfigDialog(false);
    };

    const handleSaveConfig = () => {
        if (!configIp || !configPort) {
            toast.error(t('invalidConfig'));
            return;
        }
        // 验证 IP 和端口格式
        const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(configIp)) {
            toast.error(t('invalidIp'));
            return;
        }
        const portNum = parseInt(configPort, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            toast.error(t('invalidPort'));
            return;
        }

        // 保存配置到 localStorage
        const config = { ip: configIp, port: configPort };
        localStorage.setItem('websocketConfig', JSON.stringify(config));
        toast.success(t('configSaved'));

        // 断开当前 WebSocket 连接
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        // 触发重新连接
        const wsUrl = `ws://${configIp}:${configPort}`;
        console.log(`重新连接到 WebSocket: ${wsUrl}`);
        socketRef.current = io(wsUrl, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket'],
        });

        setOpenConfigDialog(false);
    };

    return (
        <LanguageProvider>
            <Box
                sx={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#000000',
                    overflow: 'hidden',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                }}
            >
                <Box
                    sx={{
                        height: '120px',
                        backgroundColor: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, padding: '10px' }}>
                        <img
                            src={new URL('./assets/logo.png', import.meta.url).href}
                            alt="Logo"
                            style={{ width: 350, height: 60, marginLeft: '20px' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: '#fff', fontSize: '18px' }}>
                                {t('connectionStatus')}:
                            </Typography>
                            {getStatusChip()}
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Typography variant="h4" sx={{ color: '#fff', margin: '10px 20px' }}>
                            {t('DM_Tac')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginRight: '20px' }}>
                        <IconButton onClick={handleOpenConfigDialog} sx={{ color: '#fff', ml: 2 }}>
                            <SettingsIcon />
                        </IconButton>
                        <IconButton onClick={handleLanguageSwitch} sx={{ color: '#fff', ml: 2 }}>
                            <LanguageIcon />
                        </IconButton>
                        <Typography variant="body1" sx={{ color: '#fff', ml: 1, fontSize: '16px' }}>
                            {language === 'en' ? 'EN >' : 'ZH >'}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', height: 'calc(92% - 10px)', mb: 2 }}>
                    <Box sx={{ flex: '0 0 25%', height: '100%', overflow: 'hidden' }}>
                        <ChartPanel forceData={forceData} socketStatus={socketStatus} />
                    </Box>
                    <Box
                        sx={{
                            flex: '0 0 75%',
                            height: '100%',
                            overflow: 'hidden',
                            mr: 2,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <ThreeScene
                            forceData={forceData}
                            socket={socketRef.current}
                            serverFps={serverFps}
                            language={language}
                            connectedDevices={connectedDevices}
                            onFetchDevices={handleFetchDevices}
                            style={{ flexGrow: 1 }}
                        />
                    </Box>
                </Box>
                <Dialog open={openConfigDialog} onClose={handleCloseConfigDialog}>
                    <DialogTitle>{t('configureWebSocket')}</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label={t('ipAddress')}
                            type="text"
                            fullWidth
                            value={configIp}
                            onChange={(e) => setConfigIp(e.target.value)}
                        />
                        <TextField
                            margin="dense"
                            label={t('port')}
                            type="text"
                            fullWidth
                            value={configPort}
                            onChange={(e) => setConfigPort(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseConfigDialog}>{t('cancel')}</Button>
                        <Button onClick={handleSaveConfig}>{t('save')}</Button>
                    </DialogActions>
                </Dialog>
                <ToastContainer position="top-right" autoClose={3000} />
            </Box>
        </LanguageProvider>
    );
};

export default App;