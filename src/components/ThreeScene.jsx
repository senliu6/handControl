import {useEffect, useRef, useState} from 'react';
import {
    Box,
    IconButton,
    Typography,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import {useLanguage} from '../contexts/LanguageContext';
import {styled} from '@mui/material/styles';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {toast} from 'react-toastify';
import {Tooltip} from '@mui/material';

// 样式定义保持不变
const ResetButton = styled(IconButton)(({theme}) => ({
    position: 'absolute',
    top: '180px',
    right: '50px',
    backgroundColor: 'rgba(35, 37, 40, 0.7)',
    color: '#fff',
    '&:hover': {backgroundColor: 'rgba(45, 45, 45, 0.9)'},
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
}));
const CalibrateButton = styled(IconButton)(({theme}) => ({
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: '#e61937',
    color: '#fff',
    '&:hover': {backgroundColor: '#cc0000'},
    '&:active': {
        backgroundColor: '#8b0000',
        transform: 'scale(0.95)',
    },
}));
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
const CircleValue = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'isRight',
})(({theme, isRight}) => ({
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: isRight ? '#6e7274' : '#121314',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#fff',
    fontSize: '12px',
    flexShrink: 0,
}));
const CustomHandle = (props) => {
    const {value, dragging, index, ...restProps} = props;
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
const InfoContainer = styled(Box)(({theme}) => ({
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    color: '#fff',
}));
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
const AddButton = styled(IconButton)(({theme}) => ({
    backgroundColor: '#e61937',
    color: '#fff',
    borderRadius: '10px',
    '&:hover': {backgroundColor: '#cc0000'},
}));
const ArrowToggleContainer = styled(Box)(({theme}) => ({
    position: 'absolute',
    top: '80px',
    left: '20px',
    backgroundColor: 'rgba(35, 37, 40, 0.7)',
    borderRadius: '10px',
    padding: '5px 10px',
}));

const ThreeScene = ({forceData, socket, serverFps, language, connectedDevices, onFetchDevices}) => {
    const {t} = useLanguage();
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
    const [displayMode] = useState('deformation');
    const [sliderValue, setSliderValue] = useState(5);
    const [showArrows, setShowArrows] = useState(false);
    const arrowsInitialized = useRef(false);
    const marks = Array.from({length: 12}, (_, i) => ({value: i, label: i})).reduce((acc, mark) => {
        if (mark.label === 0 || mark.label === 11) {
        } else {
            acc[mark.value] = mark.label;
        }
        return acc;
    }, {});
    const lastLogTime = useRef(0);
    const lastNormalMax = useRef(null);
    const lastUpdateTime = useRef(0);
    const animationFrameId = useRef(null);
    const isMounted = useRef(false);
    const [sequenceNumber, setSequenceNumber] = useState('');
    // 修改后的代码：
    const [sequenceList, setSequenceList] = useState(() => {
        const saved = localStorage.getItem('sequenceList');
        return saved ? JSON.parse(saved) : [];
    });
    const [frameRate, setFrameRate] = useState(0);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    const selectedArrowsRef = useRef([]);
    const lastSliderValue = useRef(sliderValue);
    const lastNormalMaxValue = useRef(null);
    const [selectedSequence, setSelectedSequence] = useState('0');
    const scaleRef = useRef(null); // 存储固定的 scale 值
    const stepRef = useRef(1); // 固定 step 值
    const meshCenterRef = useRef(null); // 存储初始化的 mesh 中心位置
    const lastClickTime = useRef(0);

    // 控制服务器箭头数据发送
    useEffect(() => {
        if (socket && socket.connected) {
            socket.emit('toggle_arrows', {enable: showArrows});
            if (showArrows) {
                toast.info(t('enabled'));
            } else {
                toast.info(t('Disabled'));
            }
        } else if (showArrows) {
            toast.error(t('failedToEnable'));
        }
    }, [showArrows, socket]);

    useEffect(() => {
        if (connectedDevices && connectedDevices.length > 0) {
            setSequenceList(connectedDevices.map(id => id.toString()));
        } else {
            // setSequenceList([]);
        }
    }, [connectedDevices]);

    // 新增：保存 sequenceList 到 localStorage
    useEffect(() => {
        localStorage.setItem('sequenceList', JSON.stringify(sequenceList));
    }, [sequenceList]);

    const handleCalibrate = () => {
        if (socket && socket.connected) {
            socket.emit('calibrate', {message: t('calibrationTriggered')});
            toast.info(t('calibrationTriggered'));
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

    const updateMesh = (data) => {
        const tStart = performance.now();

        if (!data || !data.normal || !Array.isArray(data.normal) || data.normal.length === 0) {
            console.log(`渲染耗时: 0ms (无有效数据)`);
            return;
        }

        // 添加日志：打印 forceData 结构
        const height = data.normal.length;
        const width = data.normal[0]?.length || 0;
        const normal = data.normal;
        const shear = data.shear;


        if (width === 0 || !Array.isArray(normal[0])) {
            console.log(`渲染耗时: 0ms (数据格式错误)`);
            return;
        }

        if (!shear || !Array.isArray(shear) || shear.length !== height || shear[0].length !== width) {
            console.log(`渲染耗时: 0ms (shear 数据无效)`);
            return;
        }

        const step = stepRef.current;
        const newWidth = Math.floor(width / step);
        const newHeight = Math.floor(height / step);
        const scale = scaleRef.current;

        const baseDepthScale = 10.0;
        const depthScale = baseDepthScale * 5;
        const hotColors = [
            { r: 113 / 255, g: 114 / 255, b: 114 / 255 },
            { r: 219 / 255, g: 117 / 255, b: 121 / 255 },
            { r: 229 / 255, g: 50 / 255, b: 50 / 255 },
        ];

        const arrowColors = [
            { r: 66 / 255, g: 198 / 255, b: 175 / 255 },
            { r: 49 / 255, g: 133 / 255, b: 255 / 255 },
            { r: 126 / 255, g: 44 / 255, b: 255 / 255 },
        ];

        const tStatsStart = performance.now();
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
        const tStatsEnd = performance.now();
        console.log(`[ThreeScene.jsx] normal 统计耗时: ${(tStatsEnd - tStatsStart).toFixed(2)}ms (min: ${normalMin}, max: ${normalMax})`);

        // 添加日志：打印 normal 数据范围
        // console.log(`normal 数据: min=${normalMin}, max=${normalMax}, range=${normalRange}`);

        let geometry = geometryRef.current || new THREE.BufferGeometry();
        geometryRef.current = geometry;

        const tVertexStart = performance.now();
        const vertices = new Float32Array(newHeight * newWidth * 3);
        const colors = new Float32Array(newHeight * newWidth * 3);
        const indices = [];

        const maxNormalValue = 0.5;
        const normalMaxFactor = Math.min(normalMax / maxNormalValue, 1.0);

        let minZ = Infinity, maxZ = -Infinity;

        // z 计算：固定阈值减少缩放
        const zThreshold = 0.1;
        const absoluteThreshold = 0.1;

        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                const origY = y * step;
                const origX = x * step;
                const n = isFinite(normal[origY][origX]) ? normal[origY][origX] : 0;
                let z;

                if (normalRange === 0) {
                    z = 0;
                } else {
                    // const minThreshold = 0.05;
                    // const dynamicThreshold = Math.min(normalMax * 0.3, 0.15); // 限制 dynamicThreshold 上限
                    // const threshold = Math.max(minThreshold, dynamicThreshold);

                    // const threshold = 0.1; // 固定阈值
                    //
                    // const absoluteThreshold = 0.1;
                    // if (n <= threshold || n < absoluteThreshold) {
                    //     z = 0;
                    // } else {
                    //     const adjustedNormal = (n - threshold) / (normalMax - threshold);
                    //     z = -adjustedNormal * depthScale * normalMaxFactor;
                    // }
                    if (n <= zThreshold || n < absoluteThreshold) {
                        z = 0;
                    } else {
                        const adjustedNormal = (n - zThreshold) / (normalMax - zThreshold);
                        z = -adjustedNormal * depthScale * normalMaxFactor;
                    }
                }

                const idx = (y * newWidth + x) * 3;
                vertices[idx] = x * scale * step;
                vertices[idx + 1] = y * scale * step;
                vertices[idx + 2] = z;
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);

                //添加日志：打印部分顶点坐标（避免日志过多）
                // if (x === 0 && y === 0 || x === newWidth-1 && y === newHeight-1) {
                //     console.log(`顶点[${x},${y}]: x=${vertices[idx]}, y=${vertices[idx + 1]}, z=${vertices[idx + 2]}, normal=${n}`);
                // }
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
        const tVertexEnd = performance.now();
        console.log(`[ThreeScene.jsx] 顶点和颜色计算耗时: ${(tVertexEnd - tVertexStart).toFixed(2)}ms (vertices: ${newWidth}x${newHeight})`);

        const tGeometryStart = performance.now();
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
        const tGeometryEnd = performance.now();
        console.log(`[ThreeScene.jsx] 几何体更新耗时: ${(tGeometryEnd - tGeometryStart).toFixed(2)}ms`);


        // 网格初始化或定位
        const tMeshStart = performance.now();
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
            meshCenterRef.current = mesh.position.clone();
        } else {
            meshRef.current.position.copy(meshCenterRef.current);
        }
        const tMeshEnd = performance.now();
        console.log(`[ThreeScene.jsx] 网格初始化/定位耗时: ${(tMeshEnd - tMeshStart).toFixed(2)}ms`);

        if (showArrows) {
            const tArrowsStart = performance.now();
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

            const arrows = data.arrows;
            if (!arrows || !Array.isArray(arrows)) {
                const tEnd = performance.now();
                console.log(`[ThreeScene.jsx] 渲染耗时: ${(tEnd - tStart).toFixed(2)}ms (无箭头数据)`);
                return;
            }

            if (!arrowsInitialized.current) {
                arrowsGroupRef.current = new THREE.Group();
                sceneRef.current.add(arrowsGroupRef.current);
                arrowPoolRef.current = []; // 清空箭头池
                arrowsInitialized.current = true;
            }

            // 箭头范围计算
            const tArrowRangeStart = performance.now();
            let arrowMinX = Infinity, arrowMaxX = -Infinity;
            let arrowMinY = Infinity, arrowMaxY = -Infinity;
            arrows.forEach(arrow => {
                const start = arrow.start;
                arrowMinX = Math.min(arrowMinX, start[0]);
                arrowMaxX = Math.max(arrowMaxX, start[0]);
                arrowMinY = Math.min(arrowMinY, start[1]);
                arrowMaxY = Math.max(arrowMaxY, start[1]);
            });

            const arrowRangeX = arrowMaxX - arrowMinX > 0 ? arrowMaxX - arrowMinX : 1;
            const arrowRangeY = arrowMaxY - arrowMinY > 0 ? arrowMaxY - arrowMinY : 1;
            const tArrowRangeEnd = performance.now();
            console.log(`[ThreeScene.jsx] 箭头范围计算耗时: ${(tArrowRangeEnd - tArrowRangeStart).toFixed(2)}ms`);

            // 箭头数量选择
            const tArrowSelectStart = performance.now();
            const totalArrows = arrows.length;
            const sliderMax = 11;
            let targetArrowCount;

            if (sliderValue === 0) {
                targetArrowCount = 0;
            } else {
                const fraction = sliderValue / sliderMax;
                targetArrowCount = Math.round(totalArrows * fraction);
                targetArrowCount = Math.max(targetArrowCount, Math.round(totalArrows * 0.1));
            }

            // 初始化箭头池
            while (arrowPoolRef.current.length < totalArrows) {
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

            const normalChanged = lastNormalMaxValue.current === null || Math.abs(normalMax - lastNormalMaxValue.current) > 0.01 * normalMax;
            const sliderChanged = sliderValue !== lastSliderValue.current;

            let selectedArrows = selectedArrowsRef.current;
            if (normalChanged || sliderChanged) {
                selectedArrows = []; // 重置 selectedArrows
                if (targetArrowCount > 0) {
                    const gridStepX = Math.max(1, Math.floor(newWidth / Math.sqrt(targetArrowCount) * 0.5)); // 增加网格密度
                    const gridStepY = Math.max(1, Math.floor(newHeight / Math.sqrt(targetArrowCount) * 0.5));
                    const numPointsX = Math.floor(newWidth / gridStepX);
                    const numPointsY = Math.floor(newHeight / gridStepY);
                    const totalPoints = numPointsX * numPointsY;
                    const actualTargetCount = Math.min(targetArrowCount, totalPoints);

                    // console.log(`totalPoints: ${totalPoints}, numPointsX: ${numPointsX}, numPointsY: ${numPointsY}, gridStepX: ${gridStepX}, gridStepY: ${gridStepY}, actualTargetCount: ${actualTargetCount}`);

                    if (totalPoints < targetArrowCount) {
                        // 直接随机选择 targetArrowCount 个箭头
                        const indices = Array.from({ length: arrows.length }, (_, i) => i);
                        for (let i = indices.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [indices[i], indices[j]] = [indices[j], indices[i]];
                        }
                        const selectedIndices = indices.slice(0, targetArrowCount);
                        selectedArrows = selectedIndices.map(index => ({
                            index,
                            arrowData: arrows[index]
                        }));
                    } else {
                        // 现有网格点选择逻辑
                        const targetPoints = [];
                        for (let y = 0; y < numPointsY; y++) {
                            for (let x = 0; x < numPointsX; x++) {
                                const posX = (x + 0.5) * gridStepX;
                                const posY = (y + 0.5) * gridStepY;
                                if (posX < newWidth && posY < newHeight) {
                                    targetPoints.push({ x: posX, y: posY });
                                }
                            }
                        }

                        for (let i = targetPoints.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [targetPoints[i], targetPoints[j]] = [targetPoints[j], targetPoints[i]];
                        }
                        const selectedPoints = targetPoints.slice(0, actualTargetCount);

                        const usedIndices = new Set();
                        for (const point of selectedPoints) {
                            const { x, y } = point;
                            const origX = (x / newWidth) * arrowRangeX + arrowMinX;
                            const origY = (y / newHeight) * arrowRangeY + arrowMinY;

                            let closestArrow = null;
                            let minDistance = Infinity;
                            let closestIndex = -1;

                            for (let i = 0; i < arrows.length; i++) {
                                if (usedIndices.has(i)) continue;
                                const arrowData = arrows[i];
                                const start = arrowData.start;
                                const dx = start[0] - origX;
                                const dy = start[1] - origY;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestArrow = arrowData;
                                    closestIndex = i;
                                }
                            }

                            if (closestArrow) {
                                selectedArrows.push({ index: closestIndex, arrowData: closestArrow });
                                usedIndices.add(closestIndex);
                            }
                        }
                    }
                }
                selectedArrowsRef.current = selectedArrows;
                lastSliderValue.current = sliderValue;
                lastNormalMaxValue.current = normalMax;

                // console.log(`sliderValue: ${sliderValue}, targetArrowCount: ${targetArrowCount}, selectedArrows.length: ${selectedArrows.length}`);
            }
            const tArrowSelectEnd = performance.now();
            console.log(`[ThreeScene.jsx] 箭头选择耗时: ${(tArrowSelectEnd - tArrowSelectStart).toFixed(2)}ms (target: ${targetArrowCount}, selected: ${selectedArrows.length})`);

            // 确保箭头池足够支持 selectedArrows.length
            // 箭头渲染
            const tArrowRenderStart = performance.now();
            if (arrowPoolRef.current.length < selectedArrows.length) {
                console.warn(`Extending arrowPoolRef.current from ${arrowPoolRef.current.length} to ${selectedArrows.length}`);
                while (arrowPoolRef.current.length < selectedArrows.length) {
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
            }

            // 重置所有箭头
            // console.log(`arrowPoolRef.current length: ${arrowPoolRef.current.length}, selectedArrows.length: ${selectedArrows.length}`);
            // console.log(`arrowPoolRef.current undefined elements: ${arrowPoolRef.current.some((arrow, i) => arrow === undefined ? (console.log(`Undefined at index ${i}`), true) : false)}`);
            arrowPoolRef.current.forEach((arrow, index) => {
                if (!arrow) {
                    console.warn(`Undefined arrow at index ${index}`);
                    return;
                }
                arrow.visible = false;
            });

            let arrowCount = 0;
            const positionCounts = {};
            const zThreshold = -0.1;
            let validArrowCount = 0;

            // 箭头渲染：动态阈值
            const arrowMinThreshold = 0.05;
            const arrowDynamicThreshold = Math.min(normalMax * 0.3, 0.15);
            const arrowThreshold = Math.max(arrowMinThreshold, arrowDynamicThreshold);
            const strictZThreshold = -0.5; // 严格筛选

            // 箭头渲染循环
            for (let i = 0; i < selectedArrows.length; i++) {
                const arrow = arrowPoolRef.current[i];
                const selectedArrow = selectedArrows[i];

                if (!arrow) {
                    console.warn(`Undefined arrow at index ${i}`);
                    continue;
                }
                if (!selectedArrow) continue;

                const arrowData = selectedArrow.arrowData;
                const start = arrowData.start;
                const end = arrowData.end;

                const origX = ((start[0] - arrowMinX) / arrowRangeX) * newWidth;
                const origY = ((start[1] - arrowMinY) / arrowRangeY) * newHeight;

                const mappedX = Math.floor(origX);
                const mappedY = Math.floor(origY);
                let posX = mappedX * scale * step;
                let posY = mappedY * scale * step;
                let posZ = 0;
                let arrowZ = 0;

                let isInDepression = false;
                if (mappedX >= 0 && mappedX < newWidth && mappedY >= 0 && mappedY < newHeight) {
                    const idx = (mappedY * newWidth + mappedX) * 3;
                    posZ = vertices[idx + 2];
                    // const adjustedZThreshold = zThreshold * 0.5; // 临时放宽，例如从 -0.1 到 -0.05
                    // if (posZ < adjustedZThreshold || posZ < 0) {
                    //     isInDepression = true;
                    //     validArrowCount++;
                    // }

                    // 独立的 arrowZ 计算
                    const n = isFinite(normal[mappedY][mappedX]) ? normal[mappedY][mappedX] : 0;
                    if (n > arrowThreshold) {
                        const adjustedNormal = (n - arrowThreshold) / (normalMax - arrowThreshold);
                        arrowZ = -adjustedNormal * depthScale * normalMaxFactor;
                    }

                    if (arrowZ < strictZThreshold) {
                        isInDepression = true;
                        validArrowCount++;
                    }
                }

                if (!isInDepression) {
                    arrow.visible = false;
                    continue;
                }

                const mesh = meshRef.current;
                posX += mesh.position.x;
                posY += mesh.position.y;
                posZ += mesh.position.z;

                arrow.position.set(posX, posY, posZ);

                const endX = ((end[0] - arrowMinX) / arrowRangeX) * newWidth;
                const endY = ((end[1] - arrowMinY) / arrowRangeY) * newHeight;
                const shearX = (endX - origX) / step * scale;
                const shearY = (endY - origY) / step * scale;
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

                const posKey = `${Math.floor(mappedX / 10)}-${Math.floor(mappedY / 10)}`;
                positionCounts[posKey] = (positionCounts[posKey] || 0) + 1;
            }

            const tArrowRenderEnd = performance.now();
            console.log(`[ThreeScene.jsx] 箭头渲染耗时: ${(tArrowRenderEnd - tArrowRenderStart).toFixed(2)}ms (rendered: ${arrowCount}, valid: ${validArrowCount})`);

            // console.log(`After rendering: arrowCount=${arrowCount}, validArrowCount=${validArrowCount}`);
            // console.log("箭头数量" + arrowCount + "---目标" + targetArrowCount + "select" + selectedArrows.length);
            if (arrowCount > targetArrowCount * 0.96 && arrowCount > 0) {
                for (let i = 0; i < arrowPoolRef.current.length; i++) {
                    const arrow = arrowPoolRef.current[i];
                    if (!arrow) {
                        console.warn(`Undefined arrow at index ${i} during reset`);
                        continue;
                    }
                    arrow.visible = false;
                }
                arrowCount = 0;
            }
            const tArrowsEnd = performance.now();
            console.log(`[ThreeScene.jsx] 箭头总耗时: ${(tArrowsEnd - tArrowsStart).toFixed(2)}ms`);
        } else {
            const tArrowHideStart = performance.now();
            arrowPoolRef.current.forEach((arrow, index) => {
                if (!arrow) {
                    console.warn(`Undefined arrow at index ${index}`);
                    return;
                }
                arrow.visible = false;
            });
            const tArrowHideEnd = performance.now();
            console.log(`[ThreeScene.jsx] 隐藏箭头耗时: ${(tArrowHideEnd - tArrowHideStart).toFixed(2)}ms`);
        }

        const tRenderStart = performance.now();
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }

        const tRenderEnd = performance.now();
        console.log(`[ThreeScene.jsx] Three.js 渲染耗时: ${(tRenderEnd - tRenderStart).toFixed(2)}ms`);

        const tEnd = performance.now();
        console.log(`[ThreeScene.jsx] 总渲染耗时: ${(tEnd - tStart).toFixed(2)}ms`);
    };

    useEffect(() => {
        if (!containerRef.current || sceneRef.current) return;

        isMounted.current = true;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            2000
        );
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setClearColor(0x232528, 1);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 1000;
        controlsRef.current = controls;

        // 初始化时固定网格尺寸
        let newWidth = 60;
        let newHeight = 60;
        const step = 1;
        stepRef.current = step;
        const containerWidth = containerRef.current.clientWidth;
        const targetWidth = containerWidth / 3;
        const scale = targetWidth / (newWidth * step);
        scaleRef.current = scale;

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
        const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;

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

        const axesRenderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
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
                new THREE.LineBasicMaterial({color: axisColor})
            );
            group.add(axis);

            const sphereGeometry = new THREE.SphereGeometry(sphereRadius, segments, segments);
            const sphereMaterial = new THREE.MeshBasicMaterial({color: sphereColor});
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
            const labelMaterial = new THREE.SpriteMaterial({map: texture, sizeAttenuation: false, depthTest: false});
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

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            axesCamera.position.copy(camera.position).normalize().multiplyScalar(7);
            axesCamera.lookAt(0, 0, 0);
            axesRenderer.render(axesScene, axesCamera);
            renderer.render(scene, camera);
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
        handleResetView();


        return () => {
            isMounted.current = false;
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            window.removeEventListener('resize', handleResize);
            if (containerRef.current && rendererRef.current?.domElement) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }
            if (containerRef.current && axesRendererRef.current?.domElement) {
                containerRef.current.removeChild(axesRendererRef.current.domElement.parentElement);
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
            if (axesRendererRef.current) {
                axesRendererRef.current.dispose();
            }
        };
    }, []);

    useEffect(() => {
        if (forceData && forceData.normal) {
            updateMesh(forceData);
        }
    }, [forceData, sliderValue, showArrows]);

    const handleResetView = () => {
        if (!cameraRef.current || !controlsRef.current || !geometryRef.current) return;
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        const geometry = geometryRef.current;

        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2;

        camera.position.set(0, 0, -cameraZ);
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0);
        camera.updateMatrixWorld(true);
        controls.target.set(0, 0, 0);
        controls.update();
    };

    const handleAddSequence = () => {
        const trimmedNumber = sequenceNumber.trim();
        const parsedNumber = parseInt(trimmedNumber, 10);
        if (trimmedNumber && !isNaN(parsedNumber)) {
            setSequenceList(prev => {
                const newList = [...prev, parsedNumber.toString()];
                return newList;
            });
            setSequenceNumber('');
        } else {
            toast.error(t('invalidSerialNumber'));
        }
    };

    // 修改 handleDeleteSequence
    const handleDeleteSequence = (index) => {
        setSequenceList(prev => {
            const newList = prev.filter((_, i) => i !== index);
            return newList;
        });
    };

    const handleSequenceClick = (sequence) => {
        const now = Date.now();

        if (now - lastClickTime.current < 2000) {
            return; // 忽略 2 秒内的点击
        }

        lastClickTime.current = now;

        if (socket && socket.connected) {
            const camId = parseInt(sequence, 10);
            if (isNaN(camId)) {
                toast.error(t('invalidSerialNumber'));
                return;
            }
            socket.emit('set_cam_id', { cam_id: camId });
            setSelectedSequence(sequence);
            toast.info(t('fetchingSensorData'));
        } else {
            toast.error(t('socketNotConnected'));
        }
    };

    const handleFetchDevicesClick = () => {
        if (socket && socket.connected) {
            onFetchDevices();
            toast.info(t('fetchingDevices'));
        } else {
            toast.error(t('socketNotConnected'));
        }
    };

    return (
        <Box
            ref={containerRef}
            sx={{
                position: 'relative',
                height: '96%',
                backgroundColor: '#232528',
                borderRadius: '18px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                margin: '0px 20px',
                marginRight: '30px',
                marginTop:'10px'

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
                placement="bottom"
                arrow
                componentsProps={{
                    tooltip: {
                        sx: {
                            backgroundColor: '#322',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                        },
                    },
                    arrow: {
                        sx: {
                            color: '#322',
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

            <ArrowToggleContainer>
                <Tooltip
                    title={t('arrowDrawingPerformanceWarning')}
                    placement="bottom"
                    arrow
                    componentsProps={{
                        tooltip: {
                            sx: {
                                backgroundColor: '#322',
                                color: '#fff',
                                borderRadius: '8px',
                                padding: '10px 20px',
                                fontSize: '14px',
                            },
                        },
                        arrow: {
                            sx: {
                                color: '#322',
                            },
                        },
                    }}
                >
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showArrows}
                                onChange={(e) => setShowArrows(e.target.checked)}
                                sx={{
                                    color: '#fff',
                                    '&.Mui-checked': {
                                        color: '#e61937',
                                    },
                                }}
                            />
                        }
                        label={<Typography variant="caption" sx={{color: '#fff'}}>{t('showArrows')}</Typography>}
                    />
                </Tooltip>
            </ArrowToggleContainer>

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
                    <Box
                        sx={{flex: 1, position: 'relative', padding: '0 5px'}}
                        onMouseEnter={() => setIsTooltipOpen(true)}
                        onMouseLeave={() => setIsTooltipOpen(false)}
                    >
                        <Slider
                            min={0}
                            max={11}
                            step={1}
                            value={sliderValue}
                            onChange={(value) => setSliderValue(value)}
                            handleStyle={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: '#a0a5a7',
                                border: 'none',
                                marginTop: '-10px',
                            }}
                            railStyle={{
                                backgroundColor: '#121314',
                                height: 16,
                                top: -3,
                            }}
                            trackStyle={{
                                backgroundColor: '#535657',
                                height: 16,
                                top: -3,
                            }}
                            dotStyle={{
                                border: 'none',
                                backgroundColor: '#fff',
                                width: 1,
                                height: 8,
                                top: -3,
                            }}
                            activeDotStyle={{
                                backgroundColor: '#fff',
                            }}
                            marks={marks}
                            style={{
                                width: '100%',
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
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
                    {t('Framerate')}: {serverFps.toFixed(2)} FPS ID: {selectedSequence}
                </Typography>
            </InfoContainer>

            <SequenceContainer>
                <Box sx={{display: 'flex', alignItems: 'center'}}>
                    <Box
                        // onClick={handleFetchDevicesClick} //获取序列号列表
                        sx={{
                            cursor: socket && socket.connected ? 'pointer' : 'not-allowed',
                            opacity: socket && socket.connected ? 1 : 0.5,
                        }}
                    >
                        <img
                            src={new URL('../assets/tips.png', import.meta.url).href}
                            alt="tips"
                            style={{width: 30, height: 20}}
                        />
                    </Box>
                    <Typography variant="caption" sx={{color: '#fff', fontSize: '18px', marginLeft: '10px'}}>
                        {t('sequencePlaceholder')}
                    </Typography>
                </Box>
                <Typography variant="caption" sx={{color: '#a0a5a7', fontSize: '14px'}}>
                    {t('onlySupports')}
                </Typography>
                <Box sx={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    backgroundColor: 'rgba(160, 165, 167, 1)',
                    borderRadius: '10px',
                    padding: '2px 8px'
                }}>
                    <TextField
                        value={sequenceNumber}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*$/.test(value)) {
                                setSequenceNumber(value);
                            }
                        }}
                        size="small"
                        placeholder={t('inputSerialNumber')}
                        sx={{
                            backgroundColor: 'rgba(160, 165, 167, 0)',
                            input: {color: '#36393c'},
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {borderColor: 'transparent'},
                                '&:hover fieldset': {borderColor: 'transparent'},
                                '&.Mui-focused fieldset': {borderColor: 'transparent'},
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
                        backgroundColor: '#121314',
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