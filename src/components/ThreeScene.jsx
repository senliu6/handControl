import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, ButtonGroup, Button, Slider, Typography } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { styled } from '@mui/material/styles';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { parse } from 'numpy-parser';

const ResetButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '10px',
  left: '10px',
  backgroundColor: 'rgba(45, 45, 45, 0.7)',
  color: '#fff',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
  },
}));

const ViewButton = styled(Button)(({ theme }) => ({
  minWidth: '40px',
  padding: '8px 28px',
  margin: '2px 0px',
  backgroundColor: 'rgba(45, 45, 45, 0.7)',
  color: '#fff',
  borderRadius: '8px',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
  },
  '&.Mui-selected': {
    backgroundColor: '#ff0000',
    '&:hover': {
      backgroundColor: '#cc0000',
    },
  },
}));

const ViewControls = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '8px',
}));

const SliderContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '20px',
  right: '20px',
  width: '200px',
  backgroundColor: 'rgba(45, 45, 45, 0.7)',
  padding: '10px',
  borderRadius: '4px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px'
}));

const ThreeScene = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const isAnimating = useRef(true);
  const [displayMode, setDisplayMode] = useState('deformation');
  const [sliderValue, setSliderValue] = useState(1);
  const { t } = useLanguage();

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;
  
    const scene = new THREE.Scene();
    sceneRef.current = scene;
  
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      2000 // 增加远裁剪面，防止溢出
    );
    cameraRef.current = camera;
  
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x2d2d2d);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
  
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 2; // 最小距离
    controls.maxDistance = 30; // 增加最大距离
    controlsRef.current = controls;
  
    const initScene = () => {
      camera.position.set(0, 0, 15); // 进一步增加初始 Z 距离
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    initScene();
  
    // 创建独立的坐标轴场景
    const axesScene = new THREE.Scene();
    const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 30); // 增加远裁剪面
    axesCamera.position.set(7, 7, 7); // 增加相机位置范围
    axesCamera.lookAt(0, 0, 0);
  
    const axesRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    axesRenderer.setSize(120, 120);
    axesRenderer.setClearColor(0x000000, 0);
    axesRenderer.domElement.style.position = 'absolute';
    axesRenderer.domElement.style.top = '20px';
    axesRenderer.domElement.style.right = '20px';
  
    // 创建坐标轴容器
    const axesContainer = document.createElement('div');
    axesContainer.style.position = 'absolute';
    axesContainer.style.top = '20px';
    axesContainer.style.right = '20px';
    axesContainer.style.width = '180px';
    axesContainer.style.height = '180px';
    axesContainer.style.backgroundColor = 'rgba(45, 45, 45, 0.7)';
    axesContainer.style.borderRadius = '50%';
    axesContainer.style.overflow = 'hidden';
    axesContainer.appendChild(axesRenderer.domElement);
    containerRef.current.appendChild(axesContainer);
  
    // 创建坐标轴和轴端标识
    const radius = 2; // 进一步增加轴线长度
    const segments = 32;
    const sphereRadius = 0.35; // 球形半径
  
    const createAxisWithLabel = (direction, axisColor, label, sphereColor) => {
      const group = new THREE.Group();
  
      // 创建轴线
      const axis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          direction.clone().multiplyScalar(radius)
        ]),
        new THREE.LineBasicMaterial({ color: axisColor })
      );
      group.add(axis);
  
      // 创建轴端球形，替换圆形
      const sphereGeometry = new THREE.SphereGeometry(sphereRadius, segments, segments);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: sphereColor });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(direction.clone().multiplyScalar(radius));
  
      // 根据轴的方向调整球形的朝向（球形无需额外旋转）
      group.add(sphere);
  
      // 创建文字标识，紧贴球面
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
      const labelMaterial = new THREE.SpriteMaterial({
        map: texture,
        sizeAttenuation: false,
        depthTest: false
      });
      const sprite = new THREE.Sprite(labelMaterial);
      sprite.scale.set(0.15, 0.15, 1);
      sprite.position.copy(direction.clone().multiplyScalar(radius)); // 文字位置与球形重合
  
      // 确保标签始终面向相机
      sprite.onBeforeRender = function (renderer, scene, camera) {
        this.lookAt(camera.position);
        this.updateMatrix();
      };
  
      group.add(sprite);
  
      return group;
    };
  
    // 创建三个轴，调整颜色以匹配要求
    const xAxis = createAxisWithLabel(new THREE.Vector3(1, 0, 0), 0xff0000, 'X', 0xff0000); // X轴：红色轴线，红色球
    const yAxis = createAxisWithLabel(new THREE.Vector3(0, 1, 0), 0xffff00, 'Y', 0x808080); // Y轴：黄色轴线，灰色球
    const zAxis = createAxisWithLabel(new THREE.Vector3(0, 0, 1), 0x00ff00, 'Z', 0x808080); // Z轴：绿色轴线，灰色球
  
    axesScene.add(xAxis);
    axesScene.add(yAxis);
    axesScene.add(zAxis);
  
    // 更新坐标轴视图
    const animateAxes = () => {
      requestAnimationFrame(animateAxes);
      axesCamera.position.copy(camera.position).normalize().multiplyScalar(7); // 进一步扩大范围
      axesCamera.lookAt(0, 0, 0);
      axesRenderer.render(axesScene, axesCamera);
    };
    animateAxes();
  
    // 创建主场景中的点云
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const gridSize = 10;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i / (gridSize - 1) - 0.5) * 5;
        const y = (j / (gridSize - 1) - 0.5) * 5;
        const z = Math.sin(x * Math.PI) * Math.cos(y * Math.PI);
        vertices.push(x, y, z);
        
        const color = new THREE.Color();
        color.setHSL(0.6 + z * 0.1, 1.0, 0.5);
        colors.push(color.r, color.g, color.b);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
  
    // 动画循环
    const animate = () => {
      if (!isAnimating.current) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
  
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const handleResetView = () => {
    if (!cameraRef.current || !controlsRef.current || !rendererRef.current || !sceneRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;

    console.log("📍 Before Reset Position:", camera.position);

    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.updateMatrixWorld(true);

    controls.target.set(0, 0, 0);
    controls.update();

    console.log("✅ Reset Completed! New Position:", camera.position);
  };

  const handleViewChange = (view) => {
    if (!cameraRef.current || !controlsRef.current || !rendererRef.current || !sceneRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;

    switch (view) {
      case 'x':
        camera.position.set(8, 0, 0);
        break;
      case 'y':
        camera.position.set(0, 8, 0);
        break;
      case 'z':
        camera.position.set(0, 0, 8);
        break;
    }

    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.updateMatrixWorld(true);

    controls.target.set(0, 0, 0);
    controls.update();
  };

  const handleModeChange = (mode) => {
    setDisplayMode(prevMode => mode === prevMode ? mode : mode);
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        height: '100%',
        backgroundColor: '#2d2d2d',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <ResetButton onClick={handleResetView} title={t('resetView')}>
        <RestartAltIcon />
      </ResetButton>
      <ViewControls>
        <ButtonGroup variant="contained" size="small" sx={{ backgroundColor: 'rgba(45, 45, 45, 0.7)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)', borderRadius: '4px', padding: '4px' }}>
          <ViewButton 
            onClick={() => handleModeChange('deformation')}
            sx={{
              minWidth: '80px',
              backgroundColor: displayMode === 'deformation' ? '#FF4040' : 'rgba(60, 60, 60, 0.7)',
              '&:hover': {
                backgroundColor: displayMode === 'deformation' ? '#8B0000' : 'rgba(70, 70, 70, 0.7)'
              }
            }}
          >
            {t('deformation')}
          </ViewButton>
          <ViewButton 
            onClick={() => handleModeChange('force')}
            sx={{
              minWidth: '80px',
              backgroundColor: displayMode === 'force' ? '#FF4040' : 'rgba(60, 60, 60, 0.7)',
              '&:hover': {
                backgroundColor: displayMode === 'force' ? '#8B0000' : 'rgba(70, 70, 70, 0.7)'
              }
            }}
          >
            {t('forceDistribution')}
          </ViewButton>
        </ButtonGroup>
      </ViewControls>
      <SliderContainer>
        <Typography variant="caption" sx={{ color: '#fff' }}>
          {sliderValue}
        </Typography>
        <Slider
          value={sliderValue}
          onChange={(_, value) => setSliderValue(value)}
          min={1}
          max={20}
          step={1}
          sx={{
            color: '#4080ff',
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
              '&:hover, &.Mui-focusVisible': {
                boxShadow: '0 0 0 8px rgba(64, 128, 255, 0.16)'
              }
            },
            '& .MuiSlider-rail': {
              opacity: 0.32
            }
          }}
        />
      </SliderContainer>
    </Box>
  );
};

export default ThreeScene;