import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, ButtonGroup, Button, Slider, Typography } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { styled } from '@mui/material/styles';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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
  padding: '6px',
  backgroundColor: 'rgba(45, 45, 45, 0.7)',
  color: '#fff',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
  },
  '&.Mui-selected': {
    backgroundColor: '#4080ff',
    '&:hover': {
      backgroundColor: '#3070ff',
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
  const [displayMode, setDisplayMode] = useState('none');
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
      1000
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x2d2d2d);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const initScene = () => {
      camera.position.set(0, 0, 8);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    initScene();

    const axesHelper = new THREE.AxesHelper(2);
    axesHelper.position.set(2, 2, 0);
    scene.add(axesHelper);

    const createLabel = (text, position) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 64;
      canvas.height = 64;
      context.fillStyle = '#ffffff';
      context.font = 'bold 32px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(position);
      sprite.scale.set(0.3, 0.3, 0.3);
      return sprite;
    };

    scene.add(createLabel('X', new THREE.Vector3(4.5, 2, 0)));
    scene.add(createLabel('Y', new THREE.Vector3(2, 4.5, 0)));
    scene.add(createLabel('Z', new THREE.Vector3(2, 2, 2.5)));

    const textureLoader = new THREE.TextureLoader();
    const imageUrl = new URL('../assets/model.png', import.meta.url);
    textureLoader.load(
      imageUrl.href,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.needsUpdate = true;
        const aspectRatio = texture.image.width / texture.image.height;
        const geometry = new THREE.PlaneGeometry(5 * aspectRatio, 5);
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(0, 0, 0);
        scene.add(plane);
      },
      undefined,
      (error) => console.error("Texture load error:", error)
    );

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

    isAnimating.current = false;
    controls.dispose();

    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.updateMatrixWorld(true);

    const newControls = new OrbitControls(camera, renderer.domElement);
    newControls.enableDamping = true;
    newControls.target.set(0, 0, 0);
    newControls.update();
    controlsRef.current = newControls;

    renderer.render(scene, camera);

    isAnimating.current = true;

    console.log("✅ Reset Completed! New Position:", camera.position);
  };

  const handleViewChange = (view) => {
    if (!cameraRef.current || !controlsRef.current || !rendererRef.current || !sceneRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;

    isAnimating.current = false;
    controls.dispose();

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

    const newControls = new OrbitControls(camera, renderer.domElement);
    newControls.enableDamping = true;
    newControls.target.set(0, 0, 0);
    newControls.update();
    controlsRef.current = newControls;

    renderer.render(scene, camera);
    isAnimating.current = true;
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
        <ButtonGroup variant="contained" size="small">
          <ViewButton 
            onClick={() => setDisplayMode(displayMode === 'deformation' ? 'none' : 'deformation')}
            sx={displayMode === 'deformation' ? { backgroundColor: '#4080ff' } : {}}
          >
            {t('deformation')}
          </ViewButton>
          <ViewButton 
            onClick={() => setDisplayMode(displayMode === 'force' ? 'none' : 'force')}
            sx={displayMode === 'force' ? { backgroundColor: '#4080ff' } : {}}
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