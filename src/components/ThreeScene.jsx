import {useEffect, useRef, useState} from 'react';
import {
    Box,
    IconButton,
    ButtonGroup,
    Button,
    Typography,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import {useLanguage} from '../contexts/LanguageContext';
import {styled} from '@mui/material/styles';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {toast} from 'react-toastify';
import {Tooltip} from '@mui/material';

//重置按钮
const ResetButton = styled(IconButton)(({theme}) => ({
    position: 'absolute',
    top: '180px',
    right: '50px',
    backgroundColor: 'rgba(45, 45, 45, 0.7)',
    color: '#fff',
    '&:hover': {backgroundColor: 'rgba(45, 45, 45, 0.9)'},
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
}));
//校准按钮
const CalibrateButton = styled(IconButton)(({theme}) => ({
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: '#ff4040',
    color: '#fff',
    '&:hover': {backgroundColor: '#cc0000'},
    '&:active': {
        backgroundColor: '#8b0000',
        transform: 'scale(0.95)',
    },
}));
//变形场和分布力
const ViewButton = styled(Button)(({theme}) => ({
    minWidth: '40px',
    padding: '8px 28px',
    margin: '2px 0px',
    backgroundColor: 'rgba(45, 45, 45, 0.7)',
    color: '#fff',
    borderRadius: '8px',
    '&:hover': {backgroundColor: 'rgba(45, 45, 45, 0.9)'},
    '&.Mui-selected': {
        backgroundColor: '#ff0000',
        '&:hover': {backgroundColor: '#cc0000'},
    },
}));
const ViewControls = styled(Box)(({theme}) => ({
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    gap: '8px',
}));

//滑动条
const SliderContainer = styled(Box)(({theme}) => ({
    position: 'absolute',
    bottom: '50px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '80%',
    maxWidth: '600px',
    minWidth: '400px',
    padding: '10px 20px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '8px',
}));

//两边的数字提示
const CircleValue = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'isRight',
})(({theme, isRight}) => ({
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: isRight ? '#888' : '#111',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#fff',
    fontSize: '12px',
    flexShrink: 0,
}));

const CustomHandle = (props) => {
    const {value, dragging, index, ...restProps} = props;
    console.log('CustomHandle 渲染:', { value, dragging, index }); // 调试日志
    return (
        <Box
            {...restProps}
            sx={{
                width: '2px',
                height: '16px',
                backgroundColor: '#ff4040',
                position: 'relative',
                cursor: 'pointer',
                '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#888',
                },
            }}
        />
    );
};

//帧率
const InfoContainer = styled(Box)(({theme}) => ({
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    color: '#fff',
}));

//输入序列号
const SequenceContainer = styled(Box)(({theme}) => ({
    position: 'absolute',
    top: '250px',
    right: '20px',
    width: '200px',
    backgroundColor: 'transparent',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
}));
//添加序列号按钮
const AddButton = styled(IconButton)(({theme}) => ({
    backgroundColor: '#ff4040',
    color: '#fff',
    borderRadius: '10px',
    '&:hover': {backgroundColor: '#cc0000'},
}));


const ThreeScene = ({forceData, socket, serverFps}) => {
    const { t} = useLanguage();
    const containerRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const meshRef = useRef(null);
    const geometryRef = useRef(null);
    const arrowsGroupRef = useRef(null);
    const arrowPoolRef = useRef([]);
    const axesRendererRef = useRef(null);
    const axesCameraRef = useRef(null);
    const axesSceneRef = useRef(null);
    const [displayMode, setDisplayMode] = useState('deformation');
    const [sliderValue, setSliderValue] = useState(5);
    // 修改 marks 为 11 个刻度
    const marks = Array.from({ length: 11 }, (_, i) => ({
        value: i,
        label: i, // 每个刻度显示数字 0 到 10
    })).reduce((acc, mark) => {
        acc[mark.value] = mark.label;
        return acc;
    }, {});
    const isInitialRender = useRef(true);
    const lastLogTime = useRef(0);
    const lastNormalMax = useRef(null);
    const lastUpdateTime = useRef(0);
    const animationFrameId = useRef(null);
    const isMounted = useRef(false);
    const [sequenceNumber, setSequenceNumber] = useState('');
    const [sequenceList, setSequenceList] = useState([]);
    const [frameRate, setFrameRate] = useState(0);
    const [renderKey, setRenderKey] = useState(0); // 新增状态用于强制渲染
    const [isTooltipOpen, setIsTooltipOpen] = useState(false); // 添加状态控制 Tooltip 显示

    console.log('[ThreeScene] Rendering component', {
        forceData: forceData ? 'present' : 'null',
        socketConnected: socket?.connected,
        sequenceNumber,
        sequenceListLength: sequenceList.length,
        displayMode,
        sliderValue
    });

    const handleCalibrate = () => {
        if (socket && socket.connected) {
            socket.emit('calibrate', {message: t('calibrationTriggered')});
            toast.info(t('calibrationTriggered')); // 临时提示
        } else {
            toast.error(t('socketNotConnected'));
        }
    };

    const interpolateColor = (t, colors) => {
        const clampedT = Math.max(0, Math.min(1, t));
        const numSegments = colors.length - 1;
        const segment = 1 / numSegments;
        const segmentIndex = Math.min(Math.floor(clampedT / segment), numSegments - 1);
        const segmentT = (clampedT - segmentIndex * segment) / segment;

        const color1 = colors[segmentIndex];
        const color2 = colors[segmentIndex + 1];

        const r = color1.r + (color2.r - color1.r) * segmentT;
        const g = color1.g + (color2.g - color1.g) * segmentT;
        const b = color1.b + (color2.b - color1.b) * segmentT;

        return {r, g, b};
    };

    const calculateArrowCounts = (sliderValue) => {
        const n = sliderValue;
        const horizontalArrows = Math.round(3 * ((n - 1) / 2));
        const verticalArrows = Math.round(3 * ((n - 1) / 2));
        return {horizontalArrows, verticalArrows};
    };

    const updateMesh = (data) => {
        try {
            const t_start = Date.now();
    
            if (!data || !data.normal || !Array.isArray(data.normal) || data.normal.length === 0) {
                console.log('[ThreeScene] forceData invalid or empty');
                return;
            }
    
            const height = data.normal.length;
            const width = data.normal[0]?.length || 0;
            const normal = data.normal;
            const shear = data.shear;
    
            if (width === 0 || !Array.isArray(normal[0])) {
                console.log('[ThreeScene] Invalid normal data dimensions');
                return;
            }
    
            if (!shear || !Array.isArray(shear) || shear.length !== height || shear[0].length !== width) {
                console.warn('[ThreeScene] Shear data invalid or mismatched with normal data');
                return;
            }
    
            const containerWidth = containerRef.current.clientWidth;
            const targetWidth = containerWidth / 3;
            const step = 1;
            const newWidth = Math.floor(width / step);
            const newHeight = Math.floor(height / step);
            const scale = targetWidth / (newWidth * step);
    
            const baseDepthScale = 10.0;
            const depthScale = baseDepthScale * 5;
            const hotColors = [
                { r: 1.0, g: 1.0, b: 1.0 },
                { r: 240 / 255, g: 121 / 255, b: 138 / 255 },
                { r: 230 / 255, g: 78 / 255, b: 100 / 255 },
                { r: 230 / 255, g: 25 / 255, b: 55 / 255 },
                { r: 230 / 255, g: 0 / 255, b: 18 / 255 },
            ];
    
            const arrowColors = [
                { r: 5 / 255, g: 0 / 255, b: 20 / 255 },
                { r: 80 / 255, g: 0 / 255, b: 120 / 255 },
                { r: 200 / 255, g: 50 / 255, b: 50 / 255 },
                { r: 255 / 255, g: 150 / 255, b: 50 / 255 },
                { r: 255 / 255, g: 230 / 255, b: 150 / 255 },
                { r: 5 / 255, g: 0 / 255, b: 20 / 255 },
            ];
    
            let normalMin = Infinity, normalMax = -Infinity;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const n = normal[y][x];
                    if (isFinite(n)) {
                        normalMin = Math.min(normalMin, n);
                        normalMax = Math.max(normalMax, n);
                    }
                }
            }
            const normalRange = normalMax - normalMin > 0 ? normalMax - normalMin : 0;
    
            const currentTime = Date.now();
            const shouldLog =
                currentTime - lastLogTime.current > 1000 ||
                (lastNormalMax.current !== null && Math.abs(normalMax - lastNormalMax.current) > 0.1 * normalRange);
            if (shouldLog) {
                lastLogTime.current = currentTime;
                lastNormalMax.current = normalMax;
            }
    
            let geometry = geometryRef.current || new THREE.BufferGeometry();
            geometryRef.current = geometry;
    
            const vertices = new Float32Array(newHeight * newWidth * 3);
            const colors = new Float32Array(newHeight * newWidth * 3);
            const indices = [];
    
            const maxNormalValue = 0.5;
            const normalMaxFactor = Math.min(normalMax / maxNormalValue, 1.0);
    
            let minZ = Infinity, maxZ = -Infinity;
            for (let y = 0; y < newHeight; y++) {
                for (let x = 0; x < newWidth; x++) {
                    const origY = y * step;
                    const origX = x * step;
                    const n = isFinite(normal[origY][origX]) ? normal[origY][origX] : 0;
                    let z;
    
                    if (normalRange === 0) {
                        z = 0;
                    } else {
                        const minThreshold = 0.05;
                        const dynamicThreshold = normalMax * 0.3;
                        const threshold = Math.max(minThreshold, dynamicThreshold);
    
                        const absoluteThreshold = 0.1;
                        if (n <= threshold || n < absoluteThreshold) {
                            z = 0;
                        } else {
                            const adjustedNormal = (n - threshold) / (normalMax - threshold);
                            z = -adjustedNormal * depthScale * normalMaxFactor;
                        }
                    }
    
                    const idx = (y * newWidth + x) * 3;
                    vertices[idx] = x * scale * step;
                    vertices[idx + 1] = y * scale * step;
                    vertices[idx + 2] = z;
                    minZ = Math.min(minZ, z);
                    maxZ = Math.max(maxZ, z);
                }
            }
    
            const zRange = maxZ - minZ > 0 ? maxZ - minZ : 0;
            const hasDeformation = zRange > 0.01;
    
            for (let y = 0; y < newHeight; y++) {
                for (let x = 0; x < newWidth; x++) {
                    const idx = (y * newWidth + x) * 3;
                    const z = vertices[idx + 2];
                    const normalizedZ = zRange > 0 ? (maxZ - z) / zRange : 0;
                    const color = interpolateColor(normalizedZ, hotColors);
                    colors[idx] = color.r;
                    colors[idx + 1] = color.g;
                    colors[idx + 2] = color.b;
                }
            }
    
            for (let y = 0; y < newHeight - 1; y++) {
                for (let x = 0; x < newWidth - 1; x++) {
                    const topLeft = y * newWidth + x;
                    const topRight = topLeft + 1;
                    const bottomLeft = (y + 1) * newWidth + x;
                    const bottomRight = bottomLeft + 1;
                    indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
                }
            }
    
            if (geometry.attributes.position) {
                geometry.attributes.position.array.set(vertices);
                geometry.attributes.color.array.set(colors);
            } else {
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            }
            geometry.setIndex(indices);
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
            geometry.computeVertexNormals();
    
            if (!meshRef.current) {
                const material = new THREE.MeshBasicMaterial({
                    vertexColors: true,
                    side: THREE.DoubleSide,
                });
                const mesh = new THREE.Mesh(geometry, material);
                meshRef.current = mesh;
                sceneRef.current.add(mesh);
    
                geometry.computeBoundingBox();
                const box = geometry.boundingBox;
                const center = box.getCenter(new THREE.Vector3());
                mesh.position.set(-center.x, -center.y, -center.z);
            }
    
            const baseArrowLength = 2.0;
            const maxArrowLength = 10.0;
            const baseArrowHeadLength = 0.5;
            const baseArrowHeadWidth = 0.5;
    
            const minArrowLength = 4.0;
            const maxArrowLengthScale = 1.0;
            const minArrowHeadLength = 8;
            const maxArrowHeadLength = 0.5;
            const minArrowHeadWidth = 3;
            const maxArrowHeadWidth = 0.5;
    
            const depressionPointsSet = new Set();
            if (hasDeformation) {
                const normalThreshold = normalMax * 0.3;
                for (let y = 0; y < newHeight; y++) {
                    for (let x = 0; x < newWidth; x++) {
                        const origY = y * step;
                        const origX = x * step;
                        const n = isFinite(normal[origY][origX]) ? normal[origY][origX] : 0;
                        if (n > normalThreshold) {
                            depressionPointsSet.add(`${origX},${origY}`);
                        }
                    }
                }
            }
    
            const arrows = data.arrows;
            if (!arrows || !Array.isArray(arrows)) {
                console.warn('[ThreeScene] Invalid or empty arrow data:', arrows);
                return;
            }
    
            const totalArrows = arrows.length;
            const sliderMax = 10;
            const sliderMid = 5;
            let targetArrowCount;
    
            let adjustedSliderValue = sliderValue;
            if (sliderValue === 7) {
                adjustedSliderValue = 8;
            } else if (sliderValue === 14) {
                adjustedSliderValue = 15;
            } else if (sliderValue === 21) {
                adjustedSliderValue = 20;
            } else if (sliderValue === 24) {
                adjustedSliderValue = 25;
            }
    
            if (adjustedSliderValue === 0) {
                targetArrowCount = 0;
            } else if (adjustedSliderValue === sliderMax) {
                targetArrowCount = totalArrows;
            } else if (adjustedSliderValue <= sliderMid) {
                targetArrowCount = Math.round((adjustedSliderValue / sliderMid) * (totalArrows / 2));
            } else {
                targetArrowCount = Math.round(
                    (totalArrows / 2) + ((adjustedSliderValue - sliderMid) / (sliderMax - sliderMid)) * (totalArrows / 2)
                );
            }
    
            while (arrowPoolRef.current.length < arrows.length) {
                const arrow = new THREE.ArrowHelper(
                    new THREE.Vector3(0, 0, 1),
                    new THREE.Vector3(0, 0, 0),
                    1,
                    0xffffff,
                    baseArrowHeadLength,
                    baseArrowHeadWidth
                );
                arrow.line.material.depthTest = false;
                arrow.cone.material.depthTest = false;
                arrow.visible = false;
                arrowsGroupRef.current.add(arrow);
                arrowPoolRef.current.push(arrow);
            }
    
            const styleFactor = Math.pow(sliderValue / 120, 2);
            const arrowLengthScale = minArrowLength + (maxArrowLengthScale - minArrowLength) * styleFactor;
            const arrowHeadLength = minArrowHeadLength + (maxArrowHeadLength - minArrowHeadLength) * styleFactor;
            const arrowHeadWidth = minArrowHeadWidth + (maxArrowHeadWidth - minArrowHeadWidth) * styleFactor;
    
            let minArrowX = Infinity, maxArrowX = -Infinity;
            let minArrowY = Infinity, maxArrowY = -Infinity;
            for (let i = 0; i < arrows.length; i++) {
                const arrowData = arrows[i];
                const start = arrowData.start;
                const end = arrowData.end;
                minArrowX = Math.min(minArrowX, start[0], end[0]);
                maxArrowX = Math.max(maxArrowX, start[0], end[0]);
                minArrowY = Math.min(minArrowY, start[1], end[1]);
                maxArrowY = Math.max(maxArrowY, start[1], end[1]);
            }
    
            const arrowRangeX = maxArrowX - minArrowX;
            const arrowRangeY = maxArrowY - minArrowY;
            const gridRangeX = width - 1;
            const gridRangeY = height - 1;
            const scaleFactorX = arrowRangeX > 0 ? gridRangeX / arrowRangeX : 1;
            const scaleFactorY = arrowRangeY > 0 ? gridRangeY / arrowRangeY : 1;
    
            const selectedIndices = [];
            if (targetArrowCount > 0) {
                const stepSize = totalArrows / Math.max(1, targetArrowCount);
                for (let i = 0; i < targetArrowCount; i++) {
                    const index = Math.floor(i * stepSize);
                    if (index < totalArrows) {
                        selectedIndices.push(index);
                    }
                }
            }
    
            let arrowCount = 0;
            for (let i = 0; i < arrowPoolRef.current.length; i++) {
                const arrow = arrowPoolRef.current[i];
                if (i < arrows.length && selectedIndices.includes(i)) {
                    const arrowData = arrows[i];
                    const start = arrowData.start;
                    const end = arrowData.end;
    
                    const origX = (start[0] - minArrowX) * scaleFactorX;
                    const origY = (start[1] - minArrowY) * scaleFactorY;
    
                    const tolerance = 1;
                    let isInDepression = false;
                    for (let dx = -tolerance; dx <= tolerance; dx++) {
                        for (let dy = -tolerance; dy <= tolerance; dy++) {
                            const checkX = Math.round(origX) + dx;
                            const checkY = Math.round(origY) + dy;
                            const key = `${checkX},${checkY}`;
                            if (depressionPointsSet.has(key)) {
                                isInDepression = true;
                                break;
                            }
                        }
                        if (isInDepression) break;
                    }
    
                    if (!isInDepression) {
                        arrow.visible = false;
                        continue;
                    }
    
                    let posX = origX * scale * step;
                    let posY = origY * scale * step;
    
                    const mesh = meshRef.current;
                    const adjustedPosX = posX + mesh.position.x;
                    const adjustedPosY = posY + mesh.position.y;
    
                    const mappedX = Math.floor(origX / step);
                    const mappedY = Math.floor(origY / step);
                    let posZ = 0;
                    if (mappedX >= 0 && mappedX < newWidth && mappedY >= 0 && mappedY < newHeight) {
                        const idx = (mappedY * newWidth + mappedX) * 3;
                        posZ = vertices[idx + 2];
                    }
                    const adjustedPosZ = posZ + mesh.position.z;
    
                    arrow.position.set(adjustedPosX, adjustedPosY, adjustedPosZ);
    
                    const shearX = (end[0] - minArrowX) * scaleFactorX - origX;
                    const shearY = (end[1] - minArrowY) * scaleFactorY - origY;
                    let direction = new THREE.Vector3(shearX, shearY, 0);
                    if (direction.lengthSq() === 0) {
                        direction.set(1, 0, 0);
                    } else {
                        direction.normalize();
                    }
    
                    const depth = zRange > 0 ? (maxZ - posZ) / zRange : 0;
                    const baseLength = baseArrowLength + (maxArrowLength - baseArrowLength) * depth * 0.5;
                    const arrowLength = baseLength * arrowLengthScale;
                    const adjustedArrowHeadLength = arrowHeadLength * (1 + depth * 0.5);
                    const adjustedArrowHeadWidth = adjustedArrowHeadLength * 0.5;
    
                    const color = interpolateColor(depth, arrowColors);
                    const arrowColor = new THREE.Color(color.r, color.g, color.b);
    
                    arrow.setDirection(direction);
                    arrow.setLength(arrowLength, adjustedArrowHeadLength, adjustedArrowHeadWidth);
                    arrow.setColor(arrowColor);
                    arrow.visible = true;
                    arrowCount++;
                } else {
                    arrow.visible = false;
                }
            }
    
            // 移除原有的清空逻辑，避免箭头闪烁
            console.log('[ThreeScene] Arrows rendered:', { arrowCount, targetArrowCount });
    
            const t_end = Date.now();
            if (shouldLog) {
                setFrameRate(Math.round(1000 / (t_end - t_start)));
            }
    
            console.log('[ThreeScene] updateMesh completed');
        } catch (error) {
            console.error('[ThreeScene] Error in updateMesh:', error);
        }
    };

   // 用于防抖 updateMesh
const updateMeshTimeout = useRef(null);

useEffect(() => {
    console.log('[ThreeScene] Initializing useEffect');
    if (!containerRef.current || sceneRef.current) {
        console.log('[ThreeScene] Skipping initialization', {
            containerRef: !!containerRef.current,
            sceneRef: !!sceneRef.current
        });
        return;
    }

    console.log('[ThreeScene] Setting up Three.js scene');
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    console.log('[ThreeScene] WebGL supported:', !!gl);
    console.log('[ThreeScene] OrbitControls available:', !!OrbitControls);
    isMounted.current = true;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 2000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x2d2d2d, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 1000;
    controlsRef.current = controls;

    // 计算初始网格尺寸
    let newWidth = 100;
    let newHeight = 100;
    const step = 1;
    const containerWidth = containerRef.current.clientWidth;
    const targetWidth = containerWidth / 3;
    const scale = targetWidth / (newWidth * step);

    // 设置初始相机位置
    const tempGeometry = new THREE.BufferGeometry();
    const tempVertices = new Float32Array(newWidth * newHeight * 3);
    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const idx = (y * newWidth + x) * 3;
            tempVertices[idx] = x * scale * step;
            tempVertices[idx + 1] = y * scale * step;
            tempVertices[idx + 2] = 0;
        }
    }
    tempGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tempVertices, 3));
    tempGeometry.computeBoundingBox();
    const box = tempGeometry.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2;

    camera.position.set(0, 0, -cameraZ);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();

    const light1 = new THREE.DirectionalLight(0xffffff, 2.0);
    light1.position.set(0, 0, 10);
    scene.add(light1);
    const light2 = new THREE.DirectionalLight(0xffffff, 1.5);
    light2.position.set(0, 0, -10);
    scene.add(light2);
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const axesScene = new THREE.Scene();
    axesSceneRef.current = axesScene;
    const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 30);
    axesCameraRef.current = axesCamera;
    axesCamera.position.set(7, 7, 7);
    axesCamera.lookAt(0, 0, 0);

    const axesRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    axesRenderer.setSize(120, 120);
    axesRenderer.setClearColor(0x000000, 0);
    axesRenderer.domElement.style.position = 'absolute';
    axesRenderer.domElement.style.top = '20px';
    axesRenderer.domElement.style.right = '20px';
    axesRendererRef.current = axesRenderer;

    const axesContainer = document.createElement('div');
    axesContainer.style.position = 'absolute';
    axesContainer.style.top = '20px';
    axesContainer.style.right = '20px';
    axesContainer.style.width = '180px';
    axesContainer.style.height = '180px';
    axesContainer.style.backgroundColor = 'transparent';
    axesContainer.style.borderRadius = '50%';
    axesContainer.style.overflow = 'hidden';
    axesContainer.appendChild(axesRenderer.domElement);
    containerRef.current.appendChild(axesContainer);

    const radius = 2;
    const segments = 32;
    const sphereRadius = 0.5;

    const createAxisWithLabel = (direction, axisColor, label, sphereColor) => {
        const group = new THREE.Group();
        const axis = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                direction.clone().multiplyScalar(radius),
            ]),
            new THREE.LineBasicMaterial({ color: axisColor })
        );
        group.add(axis);

        const sphereGeometry = new THREE.SphereGeometry(sphereRadius, segments, segments);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: sphereColor });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(direction.clone().multiplyScalar(radius));
        group.add(sphere);

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(label, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({ map: texture, sizeAttenuation: false, depthTest: false });
        const sprite = new THREE.Sprite(labelMaterial);
        sprite.scale.set(0.15, 0.15, 1);
        sprite.position.copy(direction.clone().multiplyScalar(radius));
        sprite.onBeforeRender = function (renderer, scene, camera) {
            this.lookAt(camera.position);
            this.updateMatrix();
        };
        group.add(sprite);

        return group;
    };

    const xAxis = createAxisWithLabel(new THREE.Vector3(1, 0, 0), 0xffff00, 'X', 0x808080);
    const yAxis = createAxisWithLabel(new THREE.Vector3(0, 1, 0), 0xffff00, 'Y', 0x808080);
    const zAxis = createAxisWithLabel(new THREE.Vector3(0, 0, 1), 0xff0000, 'Z', 0xff0000);

    axesScene.add(xAxis);
    axesScene.add(yAxis);
    axesScene.add(zAxis);

    arrowsGroupRef.current = new THREE.Group();
    sceneRef.current.add(arrowsGroupRef.current);
    console.log('[ThreeScene] Three.js scene setup complete, renderer:', !!rendererRef.current);

    const animate = () => {
        if (!isMounted.current || !rendererRef.current || !axesRendererRef.current) {
            console.log('[ThreeScene] Stopping animation loop', {
                isMounted: isMounted.current,
                rendererExists: !!rendererRef.current,
                axesRendererExists: !!axesRendererRef.current
            });
            return;
        }
        animationFrameId.current = requestAnimationFrame(animate);
        controlsRef.current.update();
        axesCameraRef.current.position.copy(cameraRef.current.position).normalize().multiplyScalar(7);
        axesCameraRef.current.lookAt(0, 0, 0);
        axesRendererRef.current.render(axesSceneRef.current, axesCameraRef.current);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    const handleResize = () => {
        if (!containerRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (cameraRef.current) {
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
        }
        if (rendererRef.current) {
            rendererRef.current.setSize(width, height);
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
        console.log('[ThreeScene] Cleaning up useEffect');
        isMounted.current = false;
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            console.log('[ThreeScene] Animation frame cancelled');
        }
        window.removeEventListener('resize', handleResize);
        if (containerRef.current && rendererRef.current?.domElement) {
            containerRef.current.removeChild(rendererRef.current.domElement);
            console.log('[ThreeScene] Removed renderer domElement');
        }
        if (containerRef.current && axesRendererRef.current?.domElement) {
            containerRef.current.removeChild(axesRendererRef.current.domElement.parentElement);
            console.log('[ThreeScene] Removed axesRenderer domElement');
        }
        if (rendererRef.current) {
            rendererRef.current.dispose();
            console.log('[ThreeScene] Disposed renderer');
        }
        if (axesRendererRef.current) {
            axesRendererRef.current.dispose();
            console.log('[ThreeScene] Disposed axesRenderer');
        }
        sceneRef.current = null;
        console.log('[ThreeScene] Cleared sceneRef');
        console.log('[ThreeScene] Cleanup complete');
    };
}, []); // 无依赖，仅挂载时运行

useEffect(() => {
    console.log('[ThreeScene] Mesh update useEffect', {
        forceData: forceData ? {
            normalRows: forceData.normal?.length,
            arrows: forceData.arrows?.length,
            timestamp: forceData.timestamp
        } : 'null',
        displayMode,
        sliderValue
    });
    if (!forceData || !forceData.normal) {
        console.log('[ThreeScene] forceData invalid or missing');
        return;
    }

    // 防抖更新
    if (updateMeshTimeout.current) {
        clearTimeout(updateMeshTimeout.current);
    }
    updateMeshTimeout.current = setTimeout(() => {
        console.log('[ThreeScene] Updating mesh with valid forceData');
        updateMesh(forceData);
    }, 100); // 100ms 防抖
}, [forceData, displayMode, sliderValue]);



    const handleResetView = () => {
        if (!cameraRef.current || !controlsRef.current || !geometryRef.current) return;
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        const geometry = geometryRef.current;

        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2;


        if (meshRef.current) {
            meshRef.current.position.set(-center.x, -center.y, -center.z);
        }

        // 将相机位置设置为负Z轴方向
        camera.position.set(0, 0, -cameraZ);
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0);
        camera.updateMatrixWorld(true);
        controls.target.set(0, 0, 0);
        controls.update();
    };


    const handleModeChange = (mode) => {
        setDisplayMode(prevMode => mode === prevMode ? mode : mode);
    };

    const handleAddSequence = () => {
        const trimmedNumber = sequenceNumber.trim();
        const parsedNumber = parseInt(trimmedNumber, 10);
        if (trimmedNumber && !isNaN(parsedNumber)) {
            setSequenceList([...sequenceList, parsedNumber]);  // 存储整数
            setSequenceNumber('');
        } else {
            toast.error(t('invalidSerialNumber'));
        }
    };

    const handleDeleteSequence = (index) => {
        setSequenceList(sequenceList.filter((_, i) => i !== index));
    };

    // ThreeScene.jsx 修改部分
    const handleSequenceClick = (sequence) => {
        if (socket && socket.connected) {
            const camId = parseInt(sequence, 10);  // 将序列号转换为整数
            if (isNaN(camId)) {
                toast.error(t('invalidSerialNumber'));
                return;
            }
            socket.emit('set_cam_id', { cam_id: camId });
            toast.info(t('fetchingSensorData'));
        } else {
            toast.error(t('socketNotConnected'));
        }
    };

    return (
        <Box
            ref={containerRef}
            sx={{
                position: 'relative',
                height: '95%',
                backgroundColor: '#2d2d2d',
                borderRadius: '18px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                margin: '10PX 20px',
                marginRight:'50px',
            }}
        >
            <ResetButton onClick={handleResetView} title={t('resetView')}>
                <RestartAltIcon/>
                <Typography variant="caption" sx={{color: '#fff', margin: '4px'}}>
                    {t('resetView')}
                </Typography>
            </ResetButton>

            <Tooltip
                title={t('notPressSensor')}
                placement="bottom" // 提示显示在按钮上方
                arrow // 显示箭头
                componentsProps={{
                    tooltip: {
                        sx: {
                            backgroundColor: '#322', // 深色背景
                            color: '#fff', // 白色文本
                            borderRadius: '8px', // 圆角
                            padding: '10px 20px', // 内边距
                            fontSize: '14px', // 字体大小
                        },
                    },
                    arrow: {
                        sx: {
                            color: '#322', // 箭头颜色与背景一致
                        },
                    },
                }}
            >

                <CalibrateButton
                    sx={{
                        width: '100px',
                        borderRadius: '10px',
                        margin: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onClick={handleCalibrate}
                >
                    <Typography variant="caption">{t('calibrate')}</Typography>
                </CalibrateButton>
            </Tooltip>

            {/*<ViewControls>*/}
            {/*    <ButtonGroup*/}
            {/*        variant="contained"*/}
            {/*        size="small"*/}
            {/*        sx={{*/}
            {/*            backgroundColor: 'rgba(45, 45, 45, 0.7)',*/}
            {/*            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',*/}
            {/*            borderRadius: '4px',*/}
            {/*            padding: '4px',*/}
            {/*        }}*/}
            {/*    >*/}
            {/*        <ViewButton*/}
            {/*            onClick={() => handleModeChange('deformation')}*/}
            {/*            sx={{*/}
            {/*                minWidth: '180px',*/}
            {/*                backgroundColor: displayMode === 'deformation' ? '#FF4040' : 'rgba(60, 60, 60, 0.7)',*/}
            {/*                '&:hover': {*/}
            {/*                    backgroundColor: displayMode === 'deformation' ? '#8B0000' : 'rgba(70, 70, 70, 0.7)',*/}
            {/*                },*/}
            {/*            }}*/}
            {/*        >*/}
            {/*            {t('deformation')}*/}
            {/*        </ViewButton>*/}
            {/*        <ViewButton*/}
            {/*            onClick={() => handleModeChange('force')}*/}
            {/*            sx={{*/}
            {/*                minWidth: '180px',*/}
            {/*                backgroundColor: displayMode === 'force' ? '#FF4040' : 'rgba(60, 60, 60, 0.7)',*/}
            {/*                '&:hover': {*/}
            {/*                    backgroundColor: displayMode === 'force' ? '#8B0000' : 'rgba(70, 70, 70, 0.7)',*/}
            {/*                },*/}
            {/*            }}*/}
            {/*        >*/}
            {/*            {t('forceDistribution')}*/}
            {/*        </ViewButton>*/}
            {/*    </ButtonGroup>*/}
            {/*</ViewControls>*/}


            <SliderContainer>
                <CircleValue isRight={false}>
                    <Typography variant="caption">0</Typography>
                </CircleValue>
                <Tooltip
                    title={t('slideButtonDensity')}
                    placement="top"
                    arrow
                    open={isTooltipOpen}
                    componentsProps={{
                        tooltip: {
                            sx: {
                                backgroundColor: '#322',
                                color: '#fff',
                                borderRadius: '8px',
                                padding: '5px 10px',
                                fontSize: '12px',
                            },
                        },
                        arrow: {
                            sx: {
                                color: '#322',
                            },
                        },
                    }}
                >
                <Box sx={{flex: 1, position: 'relative'}}
                     onMouseEnter={() => setIsTooltipOpen(true)} // 鼠标进入时显示 Tooltip
                     onMouseLeave={() => setIsTooltipOpen(false)} >
                    <Slider
                        min={0}
                        max={10}
                        step={1}
                        value={sliderValue}
                        onChange={(value) => setSliderValue(value)}
                        // handle={CustomHandleWithTooltip}
                        handleStyle={{
                            width: '20px', // 直接设置手柄样式
                            height: '20px',
                            backgroundColor: '#777',
                            border: 'none',
                            marginTop: '-10px', // 调整位置以居中
                        }}
                        railStyle={{
                            backgroundColor: '#333', // 滑块经过的轨道颜色
                            height: 16,
                            top:-3,
                        }}
                        trackStyle={{
                            backgroundColor: '#555', // 滑块经过的底层轨道颜色
                            height: 16,
                            top:-3,
                        }}
                        dotStyle={{
                            border: 'none',
                            backgroundColor: '#fff',//刻度条
                            width: 1,
                            height: 8,
                            top: -3,
                        }}
                        activeDotStyle={{
                            backgroundColor: '#fff',
                        }}
                        marks={marks}
                        style={{width: '100%'}}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            //滑动进度数值提示
                            position: 'absolute',
                            top: '-25px',
                            left: `calc(${(sliderValue / 11) * 100}%)`,
                            color: '#fff',
                            transform: 'translateX(-50%)',
                        }}
                    >
                        {sliderValue}
                    </Typography>
                </Box>
                </Tooltip>
                <CircleValue isRight={true}>
                    <Typography variant="caption">11</Typography>
                </CircleValue>
            </SliderContainer>

            <InfoContainer>
                <Typography variant="caption" sx={{color: '#fff'}}>
                    {t('Framerate')}: {serverFps.toFixed(2)} FPS &nbsp;&nbsp;&nbsp; ID: AD2-0077L &nbsp;&nbsp;&nbsp; {t('Temperature')}: 36°C
                </Typography>
            </InfoContainer>

            <SequenceContainer>
                <Typography variant="caption" sx={{color: '#fff', fontSize: '16px'}}>
                    {t('inputSerialNumber')}
                </Typography>
                <Box sx={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    backgroundColor: 'gray',
                    borderRadius: '10px',
                    padding: '2px 8px'
                }}>
                    <TextField
                        value={sequenceNumber}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*$/.test(value)) {  // 只允许空字符串或数字
                                setSequenceNumber(value);
                            }
                        }}
                        size="small"
                        placeholder={t('inputSerialNumber')}
                        sx={{
                            backgroundColor: 'rgba(45, 45, 45, 0)',
                            input: { color: '#fff' },
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: 'transparent' },
                                '&:hover fieldset': { borderColor: 'transparent' },
                                '&.Mui-focused fieldset': { borderColor: 'transparent' },
                            },
                            width: '150px',
                        }}
                    />
                    <AddButton onClick={handleAddSequence}>
                        <AddIcon/>
                    </AddButton>
                </Box>
                <List
                    dense
                    sx={{
                        minHeight: '140px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        backgroundColor: '#121212',
                        borderRadius: '20px',
                        padding: '4px 10px',
                        '&::-webkit-scrollbar': {
                            display: 'none',
                        },
                        scrollbarWidth: 'none',
                    }}
                >
                    {sequenceList.map((sequence, index) => (
                        <ListItem
                            key={index}
                            button
                            onClick={() => handleSequenceClick(sequence)}
                            sx={{
                                backgroundColor: 'rgba(45, 45, 45, 0.7)',
                                marginBottom: '4px',
                                borderRadius: '10px',
                            }}
                        >
                            <ListItemText
                                primary={sequence}
                                primaryTypographyProps={{style: {color: '#fff'}}}
                            />
                            <ListItemSecondaryAction>
                                <IconButton
                                    edge="end"
                                    onClick={() => handleDeleteSequence(index)}
                                    sx={{color: '#888'}}
                                >
                                    <DeleteIcon/>
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            </SequenceContainer>
        </Box>
    );
};

export default ThreeScene;