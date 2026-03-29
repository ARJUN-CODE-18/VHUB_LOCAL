import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AircraftStoreItem } from '../../state/aircraftStore';

type PadStatusLike = {
  id: string;
  state: string;
  current_aircraft_id: string | null;
};

type DroneFlightScene3DProps = {
  aircraft: AircraftStoreItem[];
  pads: PadStatusLike[];
};

type DroneMetric = {
  id: string;
  targetPad: string;
  distanceM: number;
  near: boolean;
};

type MissionScore = {
  id: string;
  score: number;
  recommendation: string;
};

type AlertItem = {
  id: string;
  text: string;
  severity: 'low' | 'medium' | 'high';
};

type WeatherMode = 'clear' | 'windy' | 'storm';
type CameraMode = 'auto' | 'tower' | 'chase' | 'pad' | 'cinematic';
type OperatorTheme = 'day' | 'night';

type DroneRuntime = {
  mesh: THREE.Group;
  targetPadId: string;
  mode: 'takeoff' | 'landing' | 'taxi' | 'hover';
  seed: number;
  id: string;
  rotors: THREE.Mesh[];
  cone: THREE.Mesh;
  label: THREE.Sprite;
  velocity: THREE.Vector3;
  prevPosition: THREE.Vector3;
  isModel: boolean;
};

type Snapshot = {
  t: number;
  drones: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    tx: number;
    ty: number;
    tz: number;
    targetPad: string;
  }>;
  alerts: AlertItem[];
  metrics: DroneMetric[];
  padHeat: Record<string, number>;
};

type HudWidgets = {
  trafficRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  avgMissionScore: number;
  activeConflicts: number;
  windIndex: number;
  opsMode: string;
  runwayStatus: string;
};

const PAD_POSITIONS: Record<string, THREE.Vector3> = {
  'VP-001': new THREE.Vector3(-4.2, 0.35, 3.5),
  'VP-002': new THREE.Vector3(4.2, 0.35, 3.5),
  CHARGING: new THREE.Vector3(0, 0.35, -2.2),
};

const SKY_ENTRY = new THREE.Vector3(-10, 5.5, -8);
const TAXI_NODE = new THREE.Vector3(0, 0.65, 1);
const METERS_PER_SCENE_UNIT = 26;
const AIRCRAFT_MODEL_URLS = [
  '/models/CesiumAir.glb',
  'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumAir/glTF-Binary/CesiumAir.glb',
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumAir/glTF-Binary/CesiumAir.glb',
];

function normalizePadId(pad?: string | null, fallback = 'VP-001'): string {
  if (!pad) return fallback;
  const value = pad.toUpperCase();
  if (value === 'VP-001' || value === 'PAD_1' || value === 'PAD-1') return 'VP-001';
  if (value === 'VP-002' || value === 'PAD_2' || value === 'PAD-2') return 'VP-002';
  if (value === 'CHARGING') return 'CHARGING';
  return fallback;
}

function createAircraftMesh(color: string): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 1.3, 8, 18), new THREE.MeshStandardMaterial({ color, metalness: 0.68, roughness: 0.22 }));
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  const wingMaterial = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.55, roughness: 0.32 });
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.85), wingMaterial);
  wing.castShadow = true;
  group.add(wing);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.32), wingMaterial);
  tailWing.position.set(-0.9, 0.17, 0);
  tailWing.castShadow = true;
  group.add(tailWing);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.2), wingMaterial);
  fin.position.set(-0.95, 0.28, 0);
  fin.castShadow = true;
  group.add(fin);

  const rotorMaterial = new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: '#64748b', emissiveIntensity: 0.25, metalness: 0.3, roughness: 0.4 });
  const rotorPositions: Array<[number, number]> = [
    [0.7, 0.36],
    [0.7, -0.36],
  ];

  const rotors: THREE.Mesh[] = [];

  rotorPositions.forEach(([x, z]) => {
    const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 28), rotorMaterial);
    rotor.position.set(x, 0.05, z);
    rotor.rotation.x = Math.PI / 2;
    rotor.castShadow = true;
    rotors.push(rotor);
    group.add(rotor);
  });

  group.userData.rotors = rotors;

  return group;
}

function lerpVec(from: THREE.Vector3, to: THREE.Vector3, t: number): THREE.Vector3 {
  return new THREE.Vector3(
    THREE.MathUtils.lerp(from.x, to.x, t),
    THREE.MathUtils.lerp(from.y, to.y, t),
    THREE.MathUtils.lerp(from.z, to.z, t),
  );
}

function createHudLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
    ctx.fillRect(8, 10, 240, 58);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 10, 240, 58);
    ctx.fillStyle = '#dbeafe';
    ctx.font = '700 24px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 46);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.8, 0.55, 1);
  return sprite;
}

async function loadAircraftModelTemplate(): Promise<THREE.Group | null> {
  const loader = new GLTFLoader();

  for (const url of AIRCRAFT_MODEL_URLS) {
    try {
      const gltf = await loader.loadAsync(url);
      const scene = gltf.scene;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      scene.scale.set(0.011, 0.011, 0.011);
      scene.rotation.y = Math.PI;
      return scene;
    } catch {
      // Try next mirror URL.
    }
  }

  return null;
}

const DroneFlightScene3D = ({ aircraft, pads }: DroneFlightScene3DProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canopyOverlayRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState<DroneMetric[]>([]);
  const [missionScores, setMissionScores] = useState<MissionScore[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cameraMode, setCameraMode] = useState<CameraMode>('auto');
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('clear');
  const [replayEnabled, setReplayEnabled] = useState(false);
  const [replayFrame, setReplayFrame] = useState(100);
  const [padHeatmap, setPadHeatmap] = useState<Record<string, number>>({ 'VP-001': 0, 'VP-002': 0, CHARGING: 0 });
  const [voiceLog, setVoiceLog] = useState('Voice cockpit ready.');
  const [voiceListening, setVoiceListening] = useState(false);
  const [trafficHold, setTrafficHold] = useState(false);
  const [sunPhase, setSunPhase] = useState<'Morning' | 'Noon' | 'Evening'>('Noon');
  const [modelStatus, setModelStatus] = useState<'Loading Model' | 'Model Loaded' | 'Fallback Mesh'>('Loading Model');
  const [operatorTheme, setOperatorTheme] = useState<OperatorTheme>('day');

  const cameraModeRef = useRef<CameraMode>('auto');
  const weatherModeRef = useRef<WeatherMode>('clear');
  const replayEnabledRef = useRef(false);
  const replayFrameRef = useRef(100);
  const trafficHoldRef = useRef(false);
  const operatorThemeRef = useRef<OperatorTheme>('day');
  const mouseParallaxRef = useRef(new THREE.Vector2(0, 0));
  const historyRef = useRef<Snapshot[]>([]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    weatherModeRef.current = weatherMode;
  }, [weatherMode]);

  useEffect(() => {
    replayEnabledRef.current = replayEnabled;
  }, [replayEnabled]);

  useEffect(() => {
    replayFrameRef.current = replayFrame;
  }, [replayFrame]);

  useEffect(() => {
    trafficHoldRef.current = trafficHold;
  }, [trafficHold]);

  useEffect(() => {
    operatorThemeRef.current = operatorTheme;
  }, [operatorTheme]);

  useEffect(() => {
    const syncCanopyScroll = () => {
      const canopy = canopyOverlayRef.current;
      if (!canopy) return;
      const scrollNorm = Math.min(1, window.scrollY / 1100);
      canopy.style.setProperty('--canopy-scroll', String(scrollNorm));
    };

    syncCanopyScroll();
    window.addEventListener('scroll', syncCanopyScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', syncCanopyScroll);
    };
  }, []);

  const effectiveAircraft = useMemo(() => aircraft.slice(0, 4), [aircraft]);

  const hud = useMemo<HudWidgets>(() => {
    const avgMissionScore = missionScores.length > 0
      ? Math.round(missionScores.reduce((acc, item) => acc + item.score, 0) / missionScores.length)
      : 100;

    const activeConflicts = alerts.filter((a) => a.severity !== 'low').length;
    const windIndex = weatherMode === 'clear' ? 22 : weatherMode === 'windy' ? 61 : 86;

    let trafficRisk: HudWidgets['trafficRisk'] = 'LOW';
    if (activeConflicts >= 2 || avgMissionScore < 72) trafficRisk = 'MEDIUM';
    if (activeConflicts >= 4 || avgMissionScore < 55) trafficRisk = 'HIGH';

    const opsMode = operatorTheme === 'night' ? 'NIGHT OPS' : 'DAY OPS';
    const runwayStatus = trafficHold ? 'HOLD ACTIVE' : 'CLEAR FOR TRANSIT';

    return {
      trafficRisk,
      avgMissionScore,
      activeConflicts,
      windIndex,
      opsMode,
      runwayStatus,
    };
  }, [alerts, missionScores, weatherMode, operatorTheme, trafficHold]);

  useEffect(() => {
    const SpeechRecognitionImpl = (window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
      || (window as Window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const result = event.results?.[event.results.length - 1]?.[0]?.transcript;
      const text = String(result ?? '').toLowerCase().trim();
      if (!text) return;

      setVoiceLog(`Voice: ${text}`);

      if (text.includes('hold')) {
        setTrafficHold(true);
      }
      if (text.includes('resume')) {
        setTrafficHold(false);
      }
      if (text.includes('camera tower')) {
        setCameraMode('tower');
      }
      if (text.includes('camera chase')) {
        setCameraMode('chase');
      }
      if (text.includes('camera pad')) {
        setCameraMode('pad');
      }
      if (text.includes('camera cinematic')) {
        setCameraMode('cinematic');
      }
      if (text.includes('camera auto')) {
        setCameraMode('auto');
      }
      if (text.includes('weather clear')) {
        setWeatherMode('clear');
      }
      if (text.includes('weather windy')) {
        setWeatherMode('windy');
      }
      if (text.includes('weather storm')) {
        setWeatherMode('storm');
      }
      if (text.includes('replay on')) {
        setReplayEnabled(true);
      }
      if (text.includes('replay off')) {
        setReplayEnabled(false);
      }
    };

    if (voiceListening) {
      recognition.start();
    }

    return () => {
      try {
        recognition.stop();
      } catch {
        // no-op if already stopped
      }
    };
  }, [voiceListening]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#2a313d', 14, 58);

    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.1, 1000);
    camera.position.set(0, 11, 17);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight('#f8fafc', 0.62);
    const keyLight = new THREE.DirectionalLight('#fff1d6', 1.15);
    keyLight.position.set(10, 15, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    const fillLight = new THREE.DirectionalLight('#94a3b8', 0.5);
    fillLight.position.set(-8, 8, -9);
    const rimLight = new THREE.PointLight('#f59e0b', 0.62, 48);
    rimLight.position.set(-2, 5, 6);
    scene.add(ambient, keyLight, fillLight);
    scene.add(rimLight);

    const runwayLights: THREE.PointLight[] = [];
    for (let i = -5; i <= 5; i += 1) {
      const left = new THREE.PointLight('#60a5fa', 0.15, 1.8);
      left.position.set(-1.85, 0.24, i + 0.65);
      scene.add(left);
      runwayLights.push(left);

      const right = new THREE.PointLight('#60a5fa', 0.15, 1.8);
      right.position.set(1.85, 0.24, i + 0.65);
      scene.add(right);
      runwayLights.push(right);
    }

    const cameraTargetPosition = new THREE.Vector3(0, 11, 17);
    const cameraTargetLookAt = new THREE.Vector3(0, 0, 0);
    const smoothLookAt = new THREE.Vector3(0, 0, 0);

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(42, 32, 32),
      new THREE.MeshBasicMaterial({ color: '#2a2f3a', side: THREE.BackSide }),
    );
    scene.add(skyDome);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshPhysicalMaterial({ color: '#4b5563', roughness: 0.92, metalness: 0.12, clearcoat: 0.12, clearcoatRoughness: 0.8 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 13),
      new THREE.MeshPhysicalMaterial({ color: '#1f2937', roughness: 0.78, metalness: 0.18, clearcoat: 0.18, clearcoatRoughness: 0.65 }),
    );
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, 0.01, 0.6);
    runway.receiveShadow = true;
    scene.add(runway);

    for (let i = -5; i <= 5; i += 2) {
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.95),
        new THREE.MeshBasicMaterial({ color: '#dbeafe', transparent: true, opacity: 0.82 }),
      );
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(0, 0.02, i + 0.6);
      scene.add(mark);
    }

    for (let i = -5; i <= 5; i += 2) {
      const taxiMark = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 1.2),
        new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#a16207', emissiveIntensity: 0.2 }),
      );
      taxiMark.rotation.x = -Math.PI / 2;
      taxiMark.position.set(1.38, 0.02, i + 0.3);
      scene.add(taxiMark);
    }

    const grid = new THREE.GridHelper(30, 30, '#94a3b8', '#475569');
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.25;
    scene.add(grid);

    const routeMaterial = new THREE.LineDashedMaterial({ color: '#f8fafc', dashSize: 0.45, gapSize: 0.3 });
    const routePoints = [
      new THREE.Vector3(-4.2, 0.02, 3.5),
      new THREE.Vector3(0, 0.02, 1),
      new THREE.Vector3(4.2, 0.02, 3.5),
      new THREE.Vector3(0, 0.02, -2.2),
    ];
    const routeGeometry = new THREE.BufferGeometry().setFromPoints(routePoints);
    const routeLine = new THREE.Line(routeGeometry, routeMaterial);
    routeLine.computeLineDistances();
    scene.add(routeLine);

    const structures: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i += 1) {
      const h = 0.4 + (i % 5) * 0.22;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, h, 0.7),
        new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.48, metalness: 0.28 }),
      );
      const x = -12 + (i % 6) * 4.2;
      const z = i < 6 ? -10.5 : 9.6;
      block.position.set(x, h / 2, z);
      block.castShadow = true;
      block.receiveShadow = true;
      structures.push(block);
      scene.add(block);
    }

    const hangarMaterial = new THREE.MeshPhysicalMaterial({ color: '#64748b', roughness: 0.52, metalness: 0.45, clearcoat: 0.38, clearcoatRoughness: 0.4 });
    const hangarA = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.7, 2.8), hangarMaterial);
    hangarA.position.set(-8.6, 0.85, -5.8);
    hangarA.castShadow = true;
    hangarA.receiveShadow = true;
    scene.add(hangarA);

    const hangarB = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.7, 2.8), hangarMaterial);
    hangarB.position.set(8.6, 0.85, -5.8);
    hangarB.castShadow = true;
    hangarB.receiveShadow = true;
    scene.add(hangarB);

    const padRings: Array<{ ring: THREE.Mesh; phase: number; id: string }> = [];
    const geofenceVolumes: THREE.Mesh[] = [];
    const altitudeCeiling = new THREE.Mesh(
      new THREE.CylinderGeometry(9.8, 9.8, 0.08, 48),
      new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.17 }),
    );
    altitudeCeiling.position.set(0, 4.8, 0);
    scene.add(altitudeCeiling);

    const noFlyZones: Array<{ x: number; z: number; r: number; label: string }> = [
      { x: -7.5, z: 0.4, r: 1.8, label: 'NFZ-A' },
      { x: 7.5, z: -2.8, r: 1.5, label: 'NFZ-B' },
    ];

    noFlyZones.forEach((zone) => {
      const volume = new THREE.Mesh(
        new THREE.CylinderGeometry(zone.r, zone.r, 4.6, 36),
        new THREE.MeshStandardMaterial({ color: '#ef4444', transparent: true, opacity: 0.2, emissive: '#7f1d1d', emissiveIntensity: 0.35 }),
      );
      volume.position.set(zone.x, 2.3, zone.z);
      geofenceVolumes.push(volume);
      scene.add(volume);
    });

    Object.entries(PAD_POSITIONS).forEach(([id, position]) => {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 0.25, 32),
        new THREE.MeshStandardMaterial({
          color: id === 'CHARGING' ? '#16a34a' : '#64748b',
          emissive: id === 'CHARGING' ? '#14532d' : '#1e293b',
          emissiveIntensity: 0.4,
        }),
      );
      pad.position.copy(position);
      pad.castShadow = true;
      pad.receiveShadow = true;
      scene.add(pad);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.05, 16, 40),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', emissive: '#64748b', emissiveIntensity: 0.45 }),
      );
      ring.position.set(position.x, position.y + 0.15, position.z);
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = true;
      scene.add(ring);
      padRings.push({ ring, phase: position.x * 0.14 + position.z * 0.07, id });
    });

    const drones: DroneRuntime[] = effectiveAircraft.map((ac, index) => {
      const state = String(ac.state ?? ac.current_state ?? 'PARKED').toUpperCase();
      const targetPadId = normalizePadId(ac.pad_id ?? ac.assigned_pad ?? null, index % 2 === 0 ? 'VP-001' : 'VP-002');
      const mesh = createAircraftMesh(index % 2 === 0 ? '#d1d5db' : '#f8fafc');

      let mode: DroneRuntime['mode'] = 'taxi';
      if (state.includes('DEPART')) mode = 'takeoff';
      else if (state.includes('APPROACH') || state.includes('LAND') || state.includes('INBOUND')) mode = 'landing';
      else if (state.includes('CHARGING') || state.includes('PARKED') || state.includes('LANDED')) mode = 'hover';

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 1.6, 18),
        new THREE.MeshStandardMaterial({ color: '#f59e0b', transparent: true, opacity: 0.28, emissive: '#b45309', emissiveIntensity: 0.6 }),
      );
      const label = createHudLabelSprite(ac.tail_number ?? ac.id);
      cone.visible = false;
      scene.add(mesh);
      scene.add(cone);
      scene.add(label);

      const rotors = Array.isArray(mesh.userData.rotors) ? (mesh.userData.rotors as THREE.Mesh[]) : [];
      const startPos = new THREE.Vector3(0, 0.9, 0);
      return {
        mesh,
        targetPadId,
        mode,
        seed: index * 0.17,
        id: ac.tail_number ?? ac.id,
        rotors,
        cone,
        label,
        velocity: new THREE.Vector3(),
        prevPosition: startPos,
        isModel: false,
      };
    });

    void loadAircraftModelTemplate().then((template) => {
      if (cancelled) return;
      if (!template) {
        setModelStatus('Fallback Mesh');
        return;
      }

      drones.forEach((drone) => {
        const model = template.clone(true);
        drone.mesh.clear();
        drone.mesh.add(model);
        drone.isModel = true;
      });

      setModelStatus('Model Loaded');
    });

    setModelStatus('Loading Model');

    let frame = 0;
    let lastMetricUpdate = 0;
    let raf = 0;

    const animate = () => {
      frame += 1;
      const time = frame / 60;
      const nextMetrics: DroneMetric[] = [];
      const mode = cameraModeRef.current;
      const weather = weatherModeRef.current;
      const theme = operatorThemeRef.current;

      const dayCycle = (Math.sin(time * 0.06) + 1) / 2;
      let phase: 'Morning' | 'Noon' | 'Evening' = 'Noon';
      if (dayCycle < 0.33) phase = 'Morning';
      else if (dayCycle > 0.66) phase = 'Evening';
      if (time - lastMetricUpdate > 0.22) {
        setSunPhase(phase);
      }

      const sunY = 8 + dayCycle * 8;
      const sunX = -11 + dayCycle * 22;
      keyLight.position.set(sunX, sunY, 7.5);
      keyLight.intensity = 0.7 + dayCycle * 0.85;
      const skyColor = new THREE.Color().setHSL(0.58 - dayCycle * 0.08, 0.24 + dayCycle * 0.06, 0.2 + dayCycle * 0.32);
      const skyMat = skyDome.material;
      if (skyMat instanceof THREE.MeshBasicMaterial) {
        skyMat.color.copy(skyColor);
      }
      const sunColor = dayCycle < 0.45 ? '#fbbf24' : dayCycle > 0.72 ? '#fb7185' : '#fff1d6';
      keyLight.color = new THREE.Color(sunColor);

      if (theme === 'night') {
        ambient.intensity = 0.28;
        fillLight.intensity = 0.2;
        rimLight.intensity = 0.9;
        keyLight.intensity *= 0.45;
        runwayLights.forEach((light) => {
          light.intensity = 0.45;
          light.color = new THREE.Color('#22d3ee');
        });
        const skyMatNight = skyDome.material;
        if (skyMatNight instanceof THREE.MeshBasicMaterial) {
          skyMatNight.color.set('#0f172a');
        }
      } else {
        ambient.intensity = 0.62;
        fillLight.intensity = 0.5;
        rimLight.intensity = 0.62;
        runwayLights.forEach((light) => {
          light.intensity = 0.15;
          light.color = new THREE.Color('#60a5fa');
        });
      }

      const windStrength = weather === 'clear' ? 0.06 : weather === 'windy' ? 0.22 : 0.35;
      const turbulence = weather === 'clear' ? 0.03 : weather === 'windy' ? 0.12 : 0.2;
      const weatherPenalty = weather === 'clear' ? 0 : weather === 'windy' ? 10 : 20;
      const windVector = new THREE.Vector3(Math.sin(time * 0.45) * windStrength, 0, Math.cos(time * 0.31) * windStrength);

      const heatSnapshot: Record<string, number> = { 'VP-001': 0, 'VP-002': 0, CHARGING: 0 };

      padRings.forEach(({ ring, phase, id }) => {
        const heat = heatSnapshot[id] ?? 0;
        const targetScale = 1 + Math.sin(time * 1.8 + phase) * 0.06 + heat * 0.2;
        ring.scale.setScalar(targetScale);
      });

      structures.forEach((block, i) => {
        const mat = block.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissive.set('#334155');
          mat.emissiveIntensity = 0.06 + Math.max(0, Math.sin(time * 0.9 + i * 0.4)) * 0.12;
        }
      });

      geofenceVolumes.forEach((zone, idx) => {
        zone.rotation.y += 0.001 + idx * 0.0002;
      });

      const replay = replayEnabledRef.current;
      const replayHistory = historyRef.current;
      let replaySnapshot: Snapshot | null = null;
      if (replay && replayHistory.length > 0) {
        const idx = Math.floor((replayFrameRef.current / 100) * (replayHistory.length - 1));
        replaySnapshot = replayHistory[Math.max(0, Math.min(replayHistory.length - 1, idx))] ?? null;
      }

      const activeAlerts: AlertItem[] = [];

      if (replaySnapshot) {
        const snapById = new Map(replaySnapshot.drones.map((d) => [d.id, d]));
        drones.forEach((drone) => {
          const snap = snapById.get(drone.id);
          if (!snap) return;
          drone.mesh.position.set(snap.x, snap.y, snap.z);
          drone.mesh.lookAt(new THREE.Vector3(snap.tx, snap.ty, snap.tz));
          drone.label.position.copy(drone.mesh.position).add(new THREE.Vector3(0, 0.85, 0));
        });
        setMetrics(replaySnapshot.metrics);
        setAlerts(replaySnapshot.alerts);
        setPadHeatmap(replaySnapshot.padHeat);
      } else {
        drones.forEach((drone, idx) => {
          const target = PAD_POSITIONS[drone.targetPadId] ?? PAD_POSITIONS['VP-001'];
          const phase = (time * 0.14 + drone.seed + idx * 0.09) % 1;

          let position = target.clone();
          const hold = trafficHoldRef.current;

          if (hold) {
            position = target.clone().setY(1 + Math.sin(time * 2 + idx) * 0.06);
          } else if (drone.mode === 'takeoff') {
            const cruise = new THREE.Vector3(target.x + (idx - 1.5) * 1.5, 5.2, -8.5);
            position = lerpVec(target.clone().setY(0.8), cruise, phase);
          } else if (drone.mode === 'landing') {
            position = lerpVec(SKY_ENTRY.clone().add(new THREE.Vector3(idx * 1.2, 0, 0)), target.clone().setY(0.85), phase);
          } else if (drone.mode === 'taxi') {
            position = lerpVec(TAXI_NODE.clone().setY(0.85), target.clone().setY(0.85), phase);
          } else {
            position = target.clone().setY(0.95 + Math.sin(time * 2.8 + idx) * 0.09);
          }

          position.add(windVector);
          position.y += Math.sin(time * 4.1 + idx * 1.7) * turbulence;

          drone.velocity.copy(position).sub(drone.prevPosition);
          drone.prevPosition.copy(position);

          drone.mesh.position.copy(position);
          const lookPoint = target.clone().setY(position.y);
          drone.mesh.lookAt(lookPoint);
          drone.label.position.copy(position).add(new THREE.Vector3(0, 0.85, 0));
          if (drone.isModel) {
            drone.mesh.rotation.z = Math.sin(time * 1.8 + idx) * 0.06;
            drone.mesh.rotation.x = Math.cos(time * 1.2 + idx) * 0.03;
          } else {
            drone.rotors.forEach((rotor, rotorIndex) => {
              rotor.rotation.z += 0.38 + rotorIndex * 0.03;
            });
          }

          const speed = drone.velocity.length();
          if (speed > 0.02) {
            drone.cone.visible = true;
            const dir = drone.velocity.clone().normalize();
            drone.cone.position.copy(position).add(dir.clone().multiplyScalar(0.7)).add(new THREE.Vector3(0, 0.2, 0));
            drone.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          } else {
            drone.cone.visible = false;
          }

          const distanceScene = position.distanceTo(target);
          const distanceM = Math.max(0, Math.round(distanceScene * METERS_PER_SCENE_UNIT));
          const near = distanceM <= 45;
          const labelMaterial = drone.label.material;
          if (labelMaterial instanceof THREE.SpriteMaterial) {
            labelMaterial.opacity = near ? 1 : 0.82;
          }

          nextMetrics.push({
            id: drone.id,
            targetPad: drone.targetPadId,
            distanceM,
            near,
          });

          const pad = drone.targetPadId;
          heatSnapshot[pad] = Math.min(1, (heatSnapshot[pad] ?? 0) + Math.max(0, 1 - distanceM / 260));

          noFlyZones.forEach((zone) => {
            const zoneDist = Math.hypot(position.x - zone.x, position.z - zone.z);
            if (zoneDist < zone.r + 0.35 && position.y < 4.8) {
              activeAlerts.push({
                id: `${drone.id}-${zone.label}`,
                text: `${drone.id} entered geofence ${zone.label}`,
                severity: 'high',
              });
            }
          });

          if (position.y > 4.8) {
            activeAlerts.push({
              id: `${drone.id}-ceiling`,
              text: `${drone.id} exceeded altitude ceiling`,
              severity: 'medium',
            });
          }
        });

        for (let i = 0; i < drones.length; i += 1) {
          for (let j = i + 1; j < drones.length; j += 1) {
            const a = drones[i];
            const b = drones[j];
            const dist = a.mesh.position.distanceTo(b.mesh.position);
            const relVel = a.velocity.clone().sub(b.velocity).length();
            const closingEstimateSec = relVel > 0.001 ? Math.round((dist / Math.max(relVel, 0.001)) * 2.4) : 99;

            if (dist < 2.5 || closingEstimateSec <= 30) {
              const severity: AlertItem['severity'] = dist < 1.6 ? 'high' : 'medium';
              activeAlerts.push({
                id: `${a.id}-${b.id}`,
                text: `${a.id} vs ${b.id}: conflict in ~${Math.max(1, closingEstimateSec)}s`,
                severity,
              });
            }
          }
        }

        if (time - lastMetricUpdate > 0.22) {
          setMetrics(nextMetrics);
          setAlerts(activeAlerts.slice(0, 6));
          setPadHeatmap(heatSnapshot);

          const scoreCards: MissionScore[] = nextMetrics.map((metric) => {
            const riskCount = activeAlerts.filter((a) => a.text.includes(metric.id)).length;
            const score = Math.max(24, Math.round(100 - metric.distanceM / 7 - riskCount * 16 - weatherPenalty));
            let recommendation = 'Maintain current approach vector.';
            if (score < 70) recommendation = 'Reduce speed and switch to safer corridor.';
            if (score < 50) recommendation = 'Immediate reroute and altitude correction advised.';
            return { id: metric.id, score, recommendation };
          });
          setMissionScores(scoreCards);

          const snapshot: Snapshot = {
            t: time,
            drones: drones.map((drone) => ({
              id: drone.id,
              x: drone.mesh.position.x,
              y: drone.mesh.position.y,
              z: drone.mesh.position.z,
              tx: (PAD_POSITIONS[drone.targetPadId] ?? PAD_POSITIONS['VP-001']).x,
              ty: (PAD_POSITIONS[drone.targetPadId] ?? PAD_POSITIONS['VP-001']).y,
              tz: (PAD_POSITIONS[drone.targetPadId] ?? PAD_POSITIONS['VP-001']).z,
              targetPad: drone.targetPadId,
            })),
            alerts: activeAlerts.slice(0, 6),
            metrics: nextMetrics,
            padHeat: heatSnapshot,
          };
          historyRef.current.push(snapshot);
          if (historyRef.current.length > 900) {
            historyRef.current.shift();
          }
          lastMetricUpdate = time;
        }
      }

      const primaryDrone = drones[0];
      const orbitRadius = 18.2;
      const autoStage = Math.floor((time / 8) % 4);
      const parallaxX = mouseParallaxRef.current.x;
      const parallaxY = mouseParallaxRef.current.y;
      const takeoffActive = !replaySnapshot && !trafficHoldRef.current && drones.some((drone) => drone.mode === 'takeoff');
      const effectiveMode: CameraMode = mode === 'auto'
        ? (autoStage === 0 ? 'tower' : autoStage === 1 ? 'chase' : autoStage === 2 ? 'pad' : 'cinematic')
        : mode;

      if (effectiveMode === 'tower') {
        cameraTargetPosition.set(0, 14.2, 0.01);
        cameraTargetLookAt.set(0, 0, 0);
      } else if (effectiveMode === 'chase' && primaryDrone) {
        const p = primaryDrone.mesh.position;
        cameraTargetPosition.set(p.x - 3.4, p.y + 1.8, p.z - 4.1);
        cameraTargetLookAt.set(p.x + 2.2, p.y, p.z + 2.4);
      } else if (effectiveMode === 'pad') {
        const pad = PAD_POSITIONS['VP-001'];
        cameraTargetPosition.set(pad.x + 1.7, 1.7, pad.z + 2.6);
        cameraTargetLookAt.set(0, 1.6, 0);
      } else {
        cameraTargetPosition.set(
          Math.sin(time * 0.15) * orbitRadius,
          9.8 + Math.sin(time * 0.24) * 0.8,
          Math.cos(time * 0.15) * orbitRadius,
        );
        cameraTargetLookAt.set(0, 0.9, 0);
      }

      camera.position.lerp(cameraTargetPosition, 0.06);
      smoothLookAt.lerp(cameraTargetLookAt, 0.09);
      camera.position.x += parallaxX * 0.45;
      camera.position.y += parallaxY * 0.28;
      if (takeoffActive) {
        camera.position.x += Math.sin(time * 38.5) * 0.028;
        camera.position.y += Math.cos(time * 42.2) * 0.018;
        camera.position.z += Math.sin(time * 35.4 + 0.8) * 0.014;
      }
      smoothLookAt.x += parallaxX * 0.22;
      smoothLookAt.y += parallaxY * 0.16;
      camera.lookAt(smoothLookAt);

      const hasHighAlert = activeAlerts.some((a) => a.severity === 'high');
      const hasMediumAlert = activeAlerts.some((a) => a.severity === 'medium');
      runwayLights.forEach((light, i) => {
        if (hasHighAlert) {
          const strobe = Math.sin(time * 18 + i * 0.7) > 0 ? 1 : 0.2;
          light.intensity = 1.05 * strobe;
          light.color = new THREE.Color(i % 2 === 0 ? '#ef4444' : '#fb7185');
        } else if (hasMediumAlert) {
          light.intensity = 0.75 + Math.sin(time * 8 + i * 0.5) * 0.2;
          light.color = new THREE.Color(i % 2 === 0 ? '#f59e0b' : '#f97316');
        } else {
          const base = theme === 'night' ? 0.68 : 0.2;
          light.intensity = base + Math.sin(time * 2 + i * 0.4) * (theme === 'night' ? 0.16 : 0.05);
          light.color = new THREE.Color(theme === 'night' ? '#22d3ee' : '#60a5fa');
        }
      });

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    animate();

    const onResize = () => {
      if (!host) return;
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [effectiveAircraft]);

  return (
    <div className={`${operatorTheme === 'night' ? 'bg-slate-900/85 border-slate-700 text-slate-100' : 'bg-white/88 border-slate-200 text-slate-900'} rounded-xl border shadow-[0_18px_40px_rgba(15,23,42,0.16)] p-4 backdrop-blur-md transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-lg font-semibold ${operatorTheme === 'night' ? 'text-slate-100' : 'text-slate-900'}`}>Realistic 3D Flight Ops Model</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">Sun: {sunPhase}</span>
          <span className={`text-xs px-2 py-1 rounded border ${operatorTheme === 'night' ? 'bg-slate-800 text-slate-200 border-slate-600' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{modelStatus}</span>
          <button
            type="button"
            onClick={() => setOperatorTheme((v) => (v === 'day' ? 'night' : 'day'))}
            className={`text-xs px-2 py-1 rounded border ${operatorTheme === 'night' ? 'bg-cyan-950 text-cyan-100 border-cyan-700' : 'bg-slate-100 text-slate-700 border-slate-300'}`}
          >
            {operatorTheme === 'night' ? 'Night Ops' : 'Day Ops'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-3 text-xs">
        <div className={`rounded-lg border p-2 ${operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-white/85'}`}>
          <div className={`font-semibold mb-1 ${operatorTheme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>Director Camera</div>
          <select
            value={cameraMode}
            onChange={(e) => setCameraMode(e.target.value as CameraMode)}
            className={`w-full rounded border px-2 py-1 ${operatorTheme === 'night' ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
          >
            <option value="auto">Auto Director</option>
            <option value="tower">Tower Cam</option>
            <option value="chase">Chase Cam</option>
            <option value="pad">Pad Cam</option>
            <option value="cinematic">Cinematic Orbit</option>
          </select>
        </div>

        <div className={`rounded-lg border p-2 ${operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-white/85'}`}>
          <div className={`font-semibold mb-1 ${operatorTheme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>Weather Physics</div>
          <select
            value={weatherMode}
            onChange={(e) => setWeatherMode(e.target.value as WeatherMode)}
            className={`w-full rounded border px-2 py-1 ${operatorTheme === 'night' ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
          >
            <option value="clear">Clear</option>
            <option value="windy">Windy</option>
            <option value="storm">Storm</option>
          </select>
        </div>

        <div className={`rounded-lg border p-2 ${operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-white/85'}`}>
          <div className={`font-semibold mb-1 ${operatorTheme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>Voice Cockpit</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVoiceListening((v) => !v)}
              className={`rounded px-2 py-1 border ${voiceListening ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
            >
              {voiceListening ? 'Stop Mic' : 'Start Mic'}
            </button>
            <button
              type="button"
              onClick={() => setTrafficHold((v) => !v)}
              className={`rounded px-2 py-1 border ${trafficHold ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-300 text-slate-700'}`}
            >
              {trafficHold ? 'Resume Traffic' : 'Hold Traffic'}
            </button>
          </div>
          <div className={`mt-1 ${operatorTheme === 'night' ? 'text-slate-300' : 'text-slate-600'}`}>{voiceLog}</div>
        </div>
      </div>

      <div className={`rounded-lg border p-2 mb-3 text-xs ${operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/85' : 'border-slate-200 bg-white/90'}`}>
        <div className="flex items-center justify-between mb-1">
          <div className={`font-semibold ${operatorTheme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>Flight Replay Timeline</div>
          <button
            type="button"
            onClick={() => setReplayEnabled((v) => !v)}
            className={`rounded px-2 py-1 border ${replayEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-300 text-slate-700'}`}
          >
            {replayEnabled ? 'Replay ON' : 'Replay OFF'}
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={replayFrame}
          onChange={(e) => setReplayFrame(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div
        ref={viewportRef}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
          const px = ((event.clientX - rect.left) / rect.width) * 100;
          const py = ((event.clientY - rect.top) / rect.height) * 100;
          mouseParallaxRef.current.set(nx, -ny);
          if (canopyOverlayRef.current) {
            canopyOverlayRef.current.style.setProperty('--canopy-x', `${px.toFixed(2)}%`);
            canopyOverlayRef.current.style.setProperty('--canopy-y', `${py.toFixed(2)}%`);
          }
        }}
        onMouseLeave={() => {
          mouseParallaxRef.current.set(0, 0);
          if (canopyOverlayRef.current) {
            canopyOverlayRef.current.style.setProperty('--canopy-x', '50%');
            canopyOverlayRef.current.style.setProperty('--canopy-y', '18%');
          }
        }}
        className={`relative h-96 rounded-xl overflow-hidden border ${hud.trafficRisk === 'HIGH' ? 'vams-alert-border-pulse' : ''} ${operatorTheme === 'night' ? 'border-slate-600 bg-[radial-gradient(circle_at_25%_20%,_#334155,_#020617)]' : 'border-slate-500 bg-[radial-gradient(circle_at_25%_20%,_#6b7280,_#111827)]'}`}
      >
        <div ref={hostRef} className="absolute inset-0" />

        <div ref={canopyOverlayRef} className="pointer-events-none absolute inset-0 vams-canopy-reflection" />
        <div className="pointer-events-none absolute inset-x-0 top-[36%] h-20 vams-heat-haze" />
        <div className={`pointer-events-none absolute inset-0 vams-hud-scanlines ${operatorTheme === 'night' ? 'opacity-55' : 'opacity-28'}`} />

        <div className="pointer-events-none absolute right-4 top-4">
          <div className={`vams-radar-shell ${operatorTheme === 'night' ? 'vams-radar-shell-night' : ''}`}>
            <div className="vams-radar-ring vams-radar-ring-1" />
            <div className="vams-radar-ring vams-radar-ring-2" />
            <div className="vams-radar-ring vams-radar-ring-3" />
            <div className={`vams-radar-sweep ${hud.trafficRisk === 'HIGH' ? 'vams-radar-alert-high' : hud.trafficRisk === 'MEDIUM' ? 'vams-radar-alert-medium' : ''}`} />
            <div className="vams-radar-cross-x" />
            <div className="vams-radar-cross-y" />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
        <div className={`rounded-lg border px-2 py-2 ${operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/85 text-slate-200' : 'border-slate-200 bg-white/90 text-slate-700'}`}>
          <div className="opacity-70">Ops Mode</div>
          <div className="font-semibold">{hud.opsMode}</div>
        </div>
        <div className={`rounded-lg border px-2 py-2 ${hud.trafficRisk === 'HIGH' ? 'border-red-300 bg-red-50 text-red-700' : hud.trafficRisk === 'MEDIUM' ? 'border-amber-300 bg-amber-50 text-amber-700' : operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/85 text-slate-200' : 'border-slate-200 bg-white/90 text-slate-700'}`}>
          <div className="opacity-70">Traffic Risk</div>
          <div className="font-semibold">{hud.trafficRisk}</div>
        </div>
        <div className={`rounded-lg border px-2 py-2 ${operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/85 text-slate-200' : 'border-slate-200 bg-white/90 text-slate-700'}`}>
          <div className="opacity-70">Avg Mission Score</div>
          <div className="font-semibold">{hud.avgMissionScore}</div>
        </div>
        <div className={`rounded-lg border px-2 py-2 ${operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/85 text-slate-200' : 'border-slate-200 bg-white/90 text-slate-700'}`}>
          <div className="opacity-70">Active Conflicts</div>
          <div className="font-semibold">{hud.activeConflicts}</div>
        </div>
        <div className={`rounded-lg border px-2 py-2 ${operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/85 text-slate-200' : 'border-slate-200 bg-white/90 text-slate-700'}`}>
          <div className="opacity-70">Wind Index</div>
          <div className="font-semibold">{hud.windIndex}%</div>
        </div>
        <div className={`rounded-lg border px-2 py-2 ${trafficHold ? 'border-amber-300 bg-amber-50 text-amber-700' : operatorTheme === 'night' ? 'border-slate-700 bg-slate-800/85 text-slate-200' : 'border-slate-200 bg-white/90 text-slate-700'}`}>
          <div className="opacity-70">Runway Status</div>
          <div className="font-semibold">{hud.runwayStatus}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs">
        <div className="px-2 py-1 rounded border bg-slate-50 border-slate-200 text-slate-700 lg:col-span-2">
          Active Pads: {pads.map((pad) => pad.id).join(', ') || 'N/A'}
        </div>

        <div className="px-2 py-1 rounded border bg-amber-50 border-amber-200 text-amber-800 lg:col-span-2">
          Geofence Volumes: 2 no-fly zones active | Altitude Ceiling: 4.8 scene units
        </div>

        {metrics.map((metric) => (
          <div key={metric.id} className={`px-2 py-1 rounded border ${metric.near ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            {metric.id}: {metric.distanceM}m to {metric.targetPad} {metric.near ? '(near)' : '(en route)'}
          </div>
        ))}

        {missionScores.map((item) => (
          <div key={`score-${item.id}`} className={`px-2 py-1 rounded border ${item.score >= 70 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : item.score >= 50 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {item.id}: Mission Score {item.score} | {item.recommendation}
          </div>
        ))}

        {Object.entries(padHeatmap).map(([padId, value]) => (
          <div key={`heat-${padId}`} className="px-2 py-1 rounded border bg-slate-50 border-slate-200 text-slate-700">
            Heatmap {padId}: {Math.round(value * 100)}% utilization intensity
          </div>
        ))}

        {alerts.map((alert) => (
          <div key={alert.id} className={`px-2 py-1 rounded border ${alert.severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' : alert.severity === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            Safety Alert: {alert.text}
          </div>
        ))}

        {metrics.length === 0 && (
          <div className="px-2 py-1 rounded border bg-slate-50 border-slate-200 text-slate-700">No drones available for simulation yet.</div>
        )}
      </div>
    </div>
  );
};

export default DroneFlightScene3D;
