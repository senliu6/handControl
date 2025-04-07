import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, ButtonGroup, Button, Typography, TextField, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { styled } from '@mui/material/styles';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { toast } from 'react-toastify';

const ResetButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '180px',
  right: '50px',
  backgroundColor: 'rgba(45, 45, 45, 0.7)',
  color: '#fff',
  '&:hover': { backgroundColor: 'rgba(45, 45, 45, 0.9)' },
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const CalibrateButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '10px',
  left: '10px',
  backgroundColor: '#ff4040',
  color: '#fff',
  '&:hover': { backgroundColor: '#cc0000' },
  '&:active': {
    backgroundColor: '#8b0000',
    transform: 'scale(0.95)',
  },
}));

const ViewButton = styled(Button)(({ theme }) => ({
  minWidth: '40px',
  padding: '8px 28px',
  margin: '2px 0px',
  backgroundColor: 'rgba(45, 45, 45, 0.7)',
  color: '#fff',
  borderRadius: '8px',
  '&:hover': { backgroundColor: 'rgba(45, 45, 45, 0.9)' },
  '&.Mui-selected': {
    backgroundColor: '#ff0000',
    '&:hover': { backgroundColor: '#cc0000' },
  },
}));

const ViewControls = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '20px',
  right: '20px',
  display: 'flex',
  gap: '8px',
}));

const SliderContainer = styled(Box)(({ theme }) => ({
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
})(({ theme, isRight }) => ({
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  backgroundColor: isRight ? '#888' : '#333',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: '#fff',
  fontSize: '12px',
  flexShrink: 0,
}));

const CustomHandle = (props) => {
  const { value, dragging, index, ...restProps } = props;
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
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#888',
            },
          }}
      />
  );
};

const InfoContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '20px',
  left: '20px',
  color: '#fff',
}));

const SequenceContainer = styled(Box)(({ theme }) => ({
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

const AddButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: '#ff4040',
  color: '#fff',
  borderRadius: '10px',
  '&:hover': { backgroundColor: '#cc0000' },
}));




const ThreeScene = ({ forceData,socket }) => {
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
  const [sliderValue, setSliderValue] = useState(20);
  const marks = Array.from({ length: 42 }, (_, i) => {
    if (i % 5 === 0) {
      return { value: i, label: i };
    }
    return { value: i };
  }).reduce((acc, mark) => {
    acc[mark.value] = mark.label || '';
    return acc;
  }, {});
  const { t } = useLanguage();
  const isInitialRender = useRef(true);
  const lastLogTime = useRef(0);
  const lastNormalMax = useRef(null);
  const lastUpdateTime = useRef(0);
  const animationFrameId = useRef(null);
  const isMounted = useRef(false);
  const [sequenceNumber, setSequenceNumber] = useState('');
  const [sequenceList, setSequenceList] = useState([]);
  const [frameRate, setFrameRate] = useState(0);

  const handleCalibrate = () => {
    if (socket && socket.connected) {
      socket.emit('calibrate', { message: '请求校准' });
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

    return { r, g, b };
  };

  const calculateArrowCounts = (sliderValue) => {
    const n = sliderValue;
    const horizontalArrows = Math.round(3 * ((n - 1) / 2));
    const verticalArrows = Math.round(3 * ((n - 1) / 2));
    return { horizontalArrows, verticalArrows };
  };

  const updateMesh = (data) => {
    const t_start = Date.now();

    const currentTime = Date.now();
    if (currentTime - lastUpdateTime.current < 100) {
      return;
    }
    lastUpdateTime.current = currentTime;

    if (!data || !data.normal || !Array.isArray(data.normal) || data.normal.length === 0) {
      console.log('forceData 无效或为空');
      return;
    }

    const height = data.normal.length;
    const width = data.normal[0]?.length || 0;
    const normal = data.normal;
    const shear = data.shear;

    if (width === 0 || !Array.isArray(normal[0])) return;

    if (!shear || !Array.isArray(shear) || shear.length !== height || shear[0].length !== width) {
      console.warn('剪切数据无效或与法线数据尺寸不匹配');
      return;
    }

    const containerWidth = containerRef.current.clientWidth;
    const targetWidth = containerWidth / 3;
    const step = 1;
    const newWidth = Math.floor(width / step);
    const newHeight = Math.floor(height / step);
    const scale = targetWidth / (newWidth * step);

    const baseDepthScale = 10.0;
    const depthScale = baseDepthScale * 5; // 下陷程度调节
    // const hotColors = [
    //   { r: 160 / 255, g: 165 / 255, b: 168 / 255 },
    //   { r: 240 / 255, g: 121 / 255, b: 138 / 255 },
    //   { r: 230 / 255, g: 78 / 255, b: 100 / 255 },
    //   { r: 230 / 255, g: 25 / 255, b: 55 / 255 },
    //   { r: 230 / 255, g: 0 / 255, b: 18 / 255 },
    // ];

    // 修改颜色范围，使网格背景更接近白色
    const hotColors = [
      { r: 1.0, g: 1.0, b: 1.0 }, // 底色为纯白色
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

    const shouldLog =
        currentTime - lastLogTime.current > 1000 ||
        (lastNormalMax.current !== null && Math.abs(normalMax - lastNormalMax.current) > 0.1 * normalRange);
    if (shouldLog) {
      lastLogTime.current = currentTime;
      lastNormalMax.current = normalMax;
      // console.log('normal 范围:', { normalMin, normalMax });
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


    if (shouldLog) {
      // console.log('Z 值范围:', { minZ, maxZ });
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
      const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 30,
      });

    //控制网格背景颜色

    // if (!meshRef.current) {
    //   const material = new THREE.MeshBasicMaterial({
    //     vertexColors: true, // 保留顶点颜色以支持下陷区域变色
    //     side: THREE.DoubleSide,
    //     // shininess: 0, // 移除高光，避免光照影响颜色
    //   });

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
    const baseArrowHeadWidth = 0.3;

    const minArrowLength = 5.0;
    const maxArrowLengthScale = 1.0;
    const minArrowHeadLength = 4;
    const maxArrowHeadLength = 0.3;
    const minArrowHeadWidth = 4;
    const maxArrowHeadWidth = 0.5;

    const arrowCandidates = [];

    if (hasDeformation) {
      const zPointsMap = new Map();
      // 动态计算 minZThreshold 和 minZSignificant
      const zRangeAbs = Math.abs(minZ - maxZ);
      const minZThreshold = maxZ - zRangeAbs * 0.1; // 取 Z 值范围的上 30% 作为下陷阈值
      const minZSignificant = maxZ - zRangeAbs * 0.3; // 取 Z 值范围的上 70% 作为显著下陷阈值
      let significantPoints = [];

      // 第一次遍历：收集所有下陷点并按 Z 值分组
      for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
          const idx = (y * newWidth + x) * 3;
          const z = vertices[idx + 2];
          if (z < minZThreshold) {
            const positionLocal = new THREE.Vector3(vertices[idx], vertices[idx + 1], vertices[idx + 2]);
            const positionWorld = positionLocal.clone().applyMatrix4(meshRef.current.matrixWorld);
            const depth = Math.abs(z - maxZ);
            const maxDepth = Math.abs(minZ - maxZ);
            const normalizedDepth = maxDepth > 0 ? depth / maxDepth : 0;

            const point = {
              position: positionWorld,
              positionLocal: positionLocal,
              depth: normalizedDepth,
              z: z,
              x: x,
              y: y,
            };

            const roundedZ = Number(z.toFixed(4));
            if (!zPointsMap.has(roundedZ)) {
              zPointsMap.set(roundedZ, []);
            }
            zPointsMap.get(roundedZ).push(point);

            if (z < minZSignificant) {
              significantPoints.push(point);
            }
          }
        }
      }

      // 筛选 Z 值：优先保留 Z 值较小的点
      const depressionPoints = [];
      const zValues = Array.from(zPointsMap.keys()).sort((a, b) => a - b); // 按 Z 值从小到大排序
      let totalPoints = 0;
      const maxPoints = newWidth * newHeight * 0.99;
      for (const z of zValues) {
        const points = zPointsMap.get(z);
        if (totalPoints + points.length <= maxPoints) {
          depressionPoints.push(...points);
          totalPoints += points.length;
        }
      }

      // if (shouldLog) {
      //   if (depressionPoints.length > 0) {
      //     let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      //     for (const point of depressionPoints) {
      //       minX = Math.min(minX, point.x);
      //       maxX = Math.max(maxX, point.x);
      //       minY = Math.min(minY, point.y);
      //       maxY = Math.max(maxY, point.y);
      //     }
      //   }
      //   if (significantPoints.length > 0) {
      //     let minXSig = Infinity, maxXSig = -Infinity, minYSig = Infinity, maxYSig = -Infinity;
      //     for (const point of significantPoints) {
      //       minXSig = Math.min(minXSig, point.x);
      //       maxXSig = Math.max(maxXSig, point.x);
      //       minYSig = Math.min(minYSig, point.y);
      //       maxYSig = Math.max(maxYSig, point.y);
      //     }
      //   }
      // }

      if (significantPoints.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const point of significantPoints) {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }

        const depressionWidth = maxX - minX + 1;
        const depressionHeight = maxY - minY + 1;

        // 验证下陷区域大小,控制是否绘制箭头
        const maxDepressionArea = newWidth * newHeight * 0.99; // 最大下陷区域面积为网格的 80%
        if (depressionWidth * depressionHeight > maxDepressionArea) {
          significantPoints = [];
        }

        if (significantPoints.length > 0) {
          const expandedPoints = [];
          const expansionRadius = 2;
          for (const point of depressionPoints) {
            if (
                point.x >= minX - expansionRadius &&
                point.x <= maxX + expansionRadius &&
                point.y >= minY - expansionRadius &&
                point.y <= maxY + expansionRadius
            ) {
              expandedPoints.push(point);
            }
          }

          if (expandedPoints.length > 0) {
            const maxArrowsXAtFull = newWidth;
            const maxArrowsYAtFull = newHeight;
            const sliderFactor = sliderValue / 150;

            const maxArrowsX = Math.max(1, Math.round(maxArrowsXAtFull * sliderFactor * 2));
            const maxArrowsY = Math.max(1, Math.round(maxArrowsX * (newHeight / newWidth)));

            const arrowsX = Math.max(1, Math.round(maxArrowsX * (depressionWidth / newWidth)));
            const arrowsY = Math.max(1, Math.round(maxArrowsY * (depressionHeight / newHeight)));

            const stepX = depressionWidth / Math.max(1, arrowsX - 1);
            const stepY = depressionHeight / Math.max(1, arrowsY - 1);

            const candidates = [];
            const usedPoints = new Set();

            const pointMap = new Map();
            for (const point of expandedPoints) {
              const key = `${point.x},${point.y}`;
              pointMap.set(key, point);
            }

            const maxDistance = Math.max(depressionWidth, depressionHeight) * 0.5;

            for (let i = 0; i < arrowsX; i++) {
              for (let j = 0; j < arrowsY; j++) {
                const x = Math.round(minX + i * stepX);
                const y = Math.round(minY + j * stepY);

                if (x < minX || x > maxX || y < minY || y > maxY) continue;

                const key = `${x},${y}`;
                if (pointMap.has(key)) {
                  const point = pointMap.get(key);
                  if (!usedPoints.has(key)) {
                    candidates.push(point);
                    usedPoints.add(key);
                  }
                  continue;
                }

                let closestPoint = null;
                let minDist = Infinity;
                for (const point of expandedPoints) {
                  const key = `${point.x},${point.y}`;
                  if (usedPoints.has(key)) continue;
                  const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
                  if (dist < minDist && dist <= maxDistance) {
                    minDist = dist;
                    closestPoint = point;
                  }
                }

                if (closestPoint) {
                  const key = `${closestPoint.x},${closestPoint.y}`;
                  if (!usedPoints.has(key)) {
                    if (closestPoint.x >= minX && closestPoint.x <= maxX && closestPoint.y >= minY && closestPoint.y <= maxY) {
                      candidates.push(closestPoint);
                      usedPoints.add(key);
                    }
                  }
                }
              }
            }

            arrowCandidates.push(...candidates);

            if (shouldLog) {
              // console.log('箭头候选点数量:', candidates.length);
              if (candidates.length > 0) {
                let minXCand = Infinity, maxXCand = -Infinity, minYCand = Infinity, maxYCand = -Infinity;
                for (const cand of candidates) {
                  minXCand = Math.min(minXCand, cand.x);
                  maxXCand = Math.max(maxXCand, cand.x);
                  minYCand = Math.min(minYCand, cand.y);
                  maxYCand = Math.max(maxYCand, cand.y);
                }
                // console.log('箭头候选点范围:', { minXCand, maxXCand, minYCand, maxYCand });
              }
            }
          }
        }
      }
    }

    while (arrowPoolRef.current.length < arrowCandidates.length) {
      const arrow = new THREE.ArrowHelper(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, 0),
          1,
          0xffffff,
          baseArrowHeadLength,
          baseArrowHeadWidth
      );
      arrow.visible = false;
      arrowsGroupRef.current.add(arrow);
      arrowPoolRef.current.push(arrow);
    }

    const styleFactor = Math.pow(sliderValue / 120, 2);
    const arrowLengthScale = minArrowLength + (maxArrowLengthScale - minArrowLength) * styleFactor;
    const arrowHeadLength = minArrowHeadLength + (maxArrowHeadLength - minArrowHeadLength) * styleFactor;
    const arrowHeadWidth = minArrowHeadWidth + (maxArrowHeadWidth - minArrowHeadWidth) * styleFactor;

    let arrowCount = 0;
    for (let i = 0; i < arrowPoolRef.current.length; i++) {
      const arrow = arrowPoolRef.current[i];
      if (i < arrowCandidates.length) {
        const candidate = arrowCandidates[i];

        const baseLength = baseArrowLength + (maxArrowLength - baseArrowLength) * candidate.depth * 0.5;
        const arrowLength = baseLength * arrowLengthScale;
        const adjustedArrowHeadLength = arrowHeadLength * (1 + candidate.depth * 0.5);
        const adjustedArrowHeadWidth = adjustedArrowHeadLength * 0.5; // 调整比例，使头部更接近三角形
        // const adjustedArrowHeadWidth = arrowHeadWidth * (1 + candidate.depth * 0.5);

        const color = interpolateColor(candidate.depth, arrowColors);
        const arrowColor = new THREE.Color(color.r, color.g, color.b);

        const normal = new THREE.Vector3();
        const index = (candidate.y * newWidth + candidate.x);
        if (geometryRef.current.attributes.normal) {
          const normals = geometryRef.current.attributes.normal.array;
          normal.set(
              normals[index * 3],
              normals[index * 3 + 1],
              normals[index * 3 + 2]
          );
        } else {
          normal.set(0, 0, -1);
        }

        arrow.position.copy(candidate.position);
        arrow.setDirection(normal);
        arrow.setLength(arrowLength, adjustedArrowHeadLength, adjustedArrowHeadWidth);
        arrow.setColor(arrowColor);
        arrow.visible = true;

        arrowCount++;
      } else {
        arrow.visible = false;
      }
    }

    if (shouldLog) {
      // console.log('绘制的箭头数量:', arrowCount);
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    const t_end = Date.now();
    if (shouldLog) {
      // console.log(`渲染耗时: ${t_end - t_start} ms`);
      setFrameRate(Math.round(1000 / (t_end - t_start)));
    }
  };

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    console.log('Initializing ThreeScene');

    isMounted.current = true;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 2000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    //设置3D控件背景颜色
    renderer.setClearColor(0x2d2d2d,1);//def 0x2d2d2d
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 1000;
    controlsRef.current = controls;

    // 计算初始网格尺寸（假设 forceData 尚未加载，使用默认值或等待 forceData）
    let newWidth = 100; // 默认宽度
    let newHeight = 100; // 默认高度
    const step = 1;
    const containerWidth = containerRef.current.clientWidth;
    const targetWidth = containerWidth / 3;

    // 如果 forceData 已加载，则使用实际尺寸
    if (forceData && forceData.normal && Array.isArray(forceData.normal) && forceData.normal.length > 0) {
      const height = forceData.normal.length;
      const width = forceData.normal[0]?.length || 0;
      newWidth = Math.floor(width / step);
      newHeight = Math.floor(height / step);
    }

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

    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(0, 0, 10);
    scene.add(light1);
    const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    light2.position.set(0, 0, -10);
    scene.add(light2);
    const ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);

    // 增强光照，确保网格底色显示为纯白色
    // const light1 = new THREE.DirectionalLight(0xffffff, 2.0); // 强光，确保白色不偏灰
    // light1.position.set(0, 0, 10);
    // scene.add(light1);
    // const light2 = new THREE.DirectionalLight(0xffffff, 1.5);
    // light2.position.set(0, 0, -10);
    // scene.add(light2);
    // const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 强环境光，避免阴影
    // scene.add(ambientLight);

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
    const sphereRadius = 0.35;

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

    const xAxis = createAxisWithLabel(new THREE.Vector3(1, 0, 0), 0xff0000, 'X', 0xff0000);
    const yAxis = createAxisWithLabel(new THREE.Vector3(0, 1, 0), 0xffff00, 'Y', 0x808080);
    const zAxis = createAxisWithLabel(new THREE.Vector3(0, 0, 1), 0x00ff00, 'Z', 0x808080);

    axesScene.add(xAxis);
    axesScene.add(yAxis);
    axesScene.add(zAxis);

    arrowsGroupRef.current = new THREE.Group();
    sceneRef.current.add(arrowsGroupRef.current);

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

    return () => {
      console.log('Cleaning up ThreeScene');
      isMounted.current = false;

      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current?.domElement) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      if (containerRef.current && axesRendererRef.current?.domElement) {
        containerRef.current.removeChild(axesContainer);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (axesRendererRef.current) {
        axesRendererRef.current.dispose();
      }
    };
  }, [forceData]); // 添加 forceData 依赖，确保 forceData 变化时重新初始化

  useEffect(() => {
    if (forceData && forceData.normal) {
      updateMesh(forceData);
    }else {
      console.log('forceData 未准备好或无效');
    }
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
    if (sequenceNumber.trim()) {
      setSequenceList([...sequenceList, sequenceNumber.trim()]);
      setSequenceNumber('');
    }
  };

  const handleDeleteSequence = (index) => {
    setSequenceList(sequenceList.filter((_, i) => i !== index));
  };

  const handleSequenceClick = (sequence) => {
    toast.info(`序列号: ${sequence}`);
  };

  return (
      <Box
          ref={containerRef}
          sx={{
            position: 'relative',
            height: '88%',
            backgroundColor: '#2d2d2d',
            borderRadius: '18px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            margin:'0 20px'
          }}
      >
        <ResetButton onClick={handleResetView} title={t('resetView')}>
          <RestartAltIcon />
          <Typography variant="caption" sx={{ color: '#fff', margin: '4px' }}>
            {t('resetView')}
          </Typography>
        </ResetButton>

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
            title="校准"
        >
          <Typography variant="caption">校准</Typography>
        </CalibrateButton>

        <ViewControls>
          <ButtonGroup
              variant="contained"
              size="small"
              sx={{
                backgroundColor: 'rgba(45, 45, 45, 0.7)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                padding: '4px',
              }}
          >
            <ViewButton
                onClick={() => handleModeChange('deformation')}
                sx={{
                  minWidth: '180px',
                  backgroundColor: displayMode === 'deformation' ? '#FF4040' : 'rgba(60, 60, 60, 0.7)',
                  '&:hover': {
                    backgroundColor: displayMode === 'deformation' ? '#8B0000' : 'rgba(70, 70, 70, 0.7)',
                  },
                }}
            >
              {t('deformation')}
            </ViewButton>
            <ViewButton
                onClick={() => handleModeChange('force')}
                sx={{
                  minWidth: '180px',
                  backgroundColor: displayMode === 'force' ? '#FF4040' : 'rgba(60, 60, 60, 0.7)',
                  '&:hover': {
                    backgroundColor: displayMode === 'force' ? '#8B0000' : 'rgba(70, 70, 70, 0.7)',
                  },
                }}
            >
              {t('forceDistribution')}
            </ViewButton>
          </ButtonGroup>
        </ViewControls>

        <SliderContainer>
          <CircleValue isRight={false}>
            <Typography variant="caption">0</Typography>
          </CircleValue>
          <Box sx={{ flex: 1, position: 'relative' }}>
            <Slider
                min={0}
                max={41}
                step={1}
                value={sliderValue}
                onChange={(value) => setSliderValue(value)}
                handle={CustomHandle}
                railStyle={{
                  backgroundColor: 'transparent',
                  height: 2,
                }}
                dotStyle={{
                  border: 'none',
                  backgroundColor: '#fff',
                  width: 1,
                  height: 8,
                  top: -3,
                }}
                marks={marks}
                style={{ width: '100%' }}
            />
            <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: '-20px',
                  left: `calc(${(sliderValue / 42) * 100}% - 10px)`,
                  color: '#fff',
                  transform: 'translateX(-50%)',
                }}
            >
              {sliderValue}
            </Typography>
          </Box>
          <CircleValue isRight={true}>
            <Typography variant="caption">41</Typography>
          </CircleValue>
        </SliderContainer>

        <InfoContainer>
          <Typography variant="caption" sx={{ color: '#fff' }}>
            帧率: {frameRate} FPS &nbsp;&nbsp;&nbsp; ID: AD2-0077L &nbsp;&nbsp;&nbsp; 温度: 36°C
          </Typography>
        </InfoContainer>

        <SequenceContainer>
          <Typography variant="caption" sx={{ color: '#fff', fontSize: '16px' }}>
            {t('請輸入序列号')}
          </Typography>
          <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'gray', borderRadius: '10px', padding: '2px 8px' }}>
            <TextField
                value={sequenceNumber}
                onChange={(e) => setSequenceNumber(e.target.value)}
                size="small"
                placeholder="請輸入序列号" // 添加 placeholder 属性
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
              <AddIcon />
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
                      primaryTypographyProps={{ style: { color: '#fff' } }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                        edge="end"
                        onClick={() => handleDeleteSequence(index)}
                        sx={{ color: '#888' }}
                    >
                      <DeleteIcon />
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