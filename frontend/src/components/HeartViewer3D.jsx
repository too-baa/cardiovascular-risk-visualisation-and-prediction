import React, { useRef, useState, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Activity, 
  RotateCw, 
  Eye, 
  Compass, 
  Sparkles, 
  HelpCircle, 
  X, 
  Stethoscope,
  Tag
} from 'lucide-react';

// Preload the authentic high-definition 3D realistic heart asset
useGLTF.preload('/models/realistic_heart.glb');

// Clinical Risk Band Definitions (ESC / AHA Cardiology Guidelines)
export function getRiskDetails(risk = 0) {
  if (risk > 0.6) {
    return {
      band: 'Critical Stenosis (>60%)',
      severity: 'Critical',
      color: '#ef4444',      // Clinical Crimson
      glowColor: '#f87171',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      pulseSpeed: 4.0,
      clinicalAction: 'High probability of significant lumen occlusion (≥50%). Urgent invasive coronary angiography (Cath lab) or FFR evaluation indicated.'
    };
  }
  if (risk > 0.3) {
    return {
      band: 'Moderate Stenosis (30–60%)',
      severity: 'Moderate',
      color: '#f59e0b',      // Clinical Amber
      glowColor: '#fbbf24',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      pulseSpeed: 2.0,
      clinicalAction: 'Intermediate atherosclerotic burden. Intensive statin therapy, antiplatelet regimen, and stress echocardiography recommended.'
    };
  }
  return {
    band: 'Patent Vessel (<30%)',
    severity: 'Normal',
    color: '#10b981',        // Clinical Emerald
    glowColor: '#34d399',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pulseSpeed: 1.0,
    clinicalAction: 'Normal hemodynamic flow with no hemodynamically significant stenosis detected. Routine preventive lifestyle follow-up.'
  };
}

// Exactly the 3 Project-Target Coronary Arteries (No unnecessary veins or non-target vessels)
// Elevated trajectory coordinates mapped directly to the epicardial surface of realistic_heart.glb
const VASCULAR_NETWORK = {
  LAD: {
    name: 'Left Anterior Descending',
    acronym: 'LAD',
    territory: 'Anterior LV Free Wall, Interventricular Septum & Cardiac Apex',
    clinicalSignificance: 'Widowmaker Artery: Supplies ~50% of the entire left ventricle myocardium. Primary driver of extensive anterior STEMI.',
    labelPos: [0.15, 0.20, 0.64],
    curvePoints: [
      [0.10, 0.72, 0.44],
      [0.14, 0.46, 0.52],
      [0.16, 0.16, 0.58],
      [0.12, -0.18, 0.54],
      [0.08, -0.52, 0.44],
      [0.04, -0.88, 0.30],
      [0.00, -1.16, 0.15]
    ]
  },
  LCX: {
    name: 'Left Circumflex Artery',
    acronym: 'LCX',
    territory: 'Lateral & Posterior Left Ventricular Free Wall, Left Atrium',
    clinicalSignificance: 'Curves along the left atrioventricular sulcus to supply the posterolateral myocardium via obtuse marginal branches.',
    labelPos: [-0.75, 0.18, 0.25],
    curvePoints: [
      [-0.10, 0.68, 0.42],
      [-0.36, 0.55, 0.40],
      [-0.64, 0.32, 0.28],
      [-0.74, 0.06, 0.14],
      [-0.66, -0.28, -0.10],
      [-0.46, -0.62, -0.24],
      [-0.24, -0.92, -0.22]
    ]
  },
  RCA: {
    name: 'Right Coronary Artery',
    acronym: 'RCA',
    territory: 'Right Ventricle, Inferior LV Wall & SA/AV Nodal Conduction System',
    clinicalSignificance: 'Courses down the right coronary sulcus and acute margin to supply the inferior myocardium and conduction nodes.',
    labelPos: [0.74, 0.18, 0.25],
    curvePoints: [
      [0.28, 0.65, 0.38],
      [0.55, 0.45, 0.32],
      [0.72, 0.12, 0.22],
      [0.68, -0.22, 0.10],
      [0.58, -0.55, -0.06],
      [0.38, -0.82, -0.18],
      [0.18, -1.05, -0.22]
    ]
  }
};

// Prominent, High-Visibility Coronary Artery Tube
// Caliber is bold (0.038) and slightly elevated from the heart surface with glow so it never gets lost
function CoronaryArteryTube({ vesselKey, risk = 0, isSelected, onClick, showLabels = true }) {
  const meshRef = useRef();
  const vData = VASCULAR_NETWORK[vesselKey];
  const riskMeta = getRiskDetails(risk);

  const tubeGeometry = useMemo(() => {
    const points = vData.curvePoints.map(p => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 54, 0.036, 16, false);
  }, [vData]);

  // Dynamic pulsing animation for high-risk stenotic vessels
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      if (risk > 0.6) {
        const pulse = (Math.sin(t * riskMeta.pulseSpeed) + 1) / 2;
        meshRef.current.material.emissiveIntensity = 0.6 + pulse * 0.8;
      } else {
        meshRef.current.material.emissiveIntensity = isSelected ? 1.0 : 0.5;
      }
    }
  });

  const baseColor = isSelected ? riskMeta.glowColor : riskMeta.color;

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick(vesselKey); }}>
      {/* Outer Luminescent Sheath (Ensures visibility against any heart texture) */}
      <mesh geometry={tubeGeometry} renderOrder={15}>
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={isSelected ? 0.4 : 0.22}
          wireframe={false}
        />
      </mesh>

      {/* Main Solid Arterial Lumen */}
      <mesh ref={meshRef} geometry={tubeGeometry} renderOrder={25}>
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isSelected ? 1.0 : 0.5}
          roughness={0.2}
          metalness={0.25}
        />
      </mesh>

      {/* Compact 3D Floating Clinical Tag (Toggleable) */}
      {showLabels && (
        <Html position={vData.labelPos} center zIndexRange={[40, 0]}>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(vesselKey); }}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border shadow-md cursor-pointer transition-all duration-150 backdrop-blur-md select-none text-[10px] font-bold ${
              isSelected 
                ? 'ring-2 ring-white scale-110' 
                : 'hover:scale-105'
            } ${
              risk > 0.6 
                ? 'bg-red-600/90 text-white border-red-300' 
                : risk > 0.3 
                  ? 'bg-amber-500/90 text-white border-amber-300' 
                  : 'bg-emerald-600/90 text-white border-emerald-300'
            }`}
            style={{ whiteSpace: 'nowrap', pointerEvents: 'auto' }}
          >
            <span>{vesselKey}</span>
            <span className="font-mono opacity-90">{Math.round(risk * 100)}%</span>
            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-black/25">
              {risk > 0.6 ? 'Critical' : risk > 0.3 ? 'Moderate' : 'Patent'}
            </span>
          </button>
        </Html>
      )}
    </group>
  );
}

// 3D Realistic Heart Model Scene (Lives safely inside Canvas for R3F hooks)
function RealisticHeartScene({ 
  enableHeartbeat, 
  isTranslucent, 
  vesselRisks, 
  selectedVessel, 
  setSelectedVessel,
  showLabels = true
}) {
  const groupRef = useRef();
  const { scene } = useGLTF('/models/realistic_heart.glb');

  // Normalize, center and scale the authentic anatomical heart asset
  const clonedScene = useMemo(() => {
    const s = scene.clone(true);
    
    const bbox = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    s.position.x -= center.x;
    s.position.y -= center.y;
    s.position.z -= center.z;

    // Increased from 2.5 to 3.15 so the heart is large and prominent
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3.15 / (maxDim || 1);
    s.scale.set(scale, scale, scale);

    // Dynamic material adaptation: Solid photorealistic texture vs semi-transparent X-ray
    s.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        if (isTranslucent) {
          child.material.transparent = true;
          child.material.opacity = 0.38;
          child.material.roughness = 0.25;
          child.material.metalness = 0.15;
          child.material.depthWrite = false;
        } else {
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.roughness = 0.45;
          child.material.metalness = 0.15;
          child.material.depthWrite = true;
        }
      }
    });

    return s;
  }, [scene, isTranslucent]);

  // Cardiac cycle contraction simulation
  useFrame(({ clock }) => {
    if (groupRef.current && enableHeartbeat) {
      const t = clock.getElapsedTime();
      const cycle = (t * 1.3) % 1;
      let scale = 1.0;
      if (cycle < 0.12) {
        scale = 1.0 + Math.sin((cycle / 0.12) * Math.PI) * 0.038;
      } else if (cycle < 0.28) {
        scale = 1.0 + Math.sin(((cycle - 0.12) / 0.16) * Math.PI) * 0.02;
      }
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.16, 0]}>
      {/* Realistic Anatomical Heart Mesh (From photorealistic GLTF) */}
      <primitive object={clonedScene} />

      {/* Exactly the 3 Target Arteries (LAD, LCX, RCA) - Elevated & Bold Caliber */}
      {Object.keys(VASCULAR_NETWORK).map((vKey) => (
        <CoronaryArteryTube
          key={vKey}
          vesselKey={vKey}
          risk={vesselRisks?.[vKey] || 0}
          isSelected={selectedVessel === vKey}
          onClick={setSelectedVessel}
          showLabels={showLabels}
        />
      ))}
    </group>
  );
}

// Camera View Controller
function CameraController({ viewTarget }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!viewTarget) return;

    if (viewTarget === 'anterior') {
      camera.position.set(0, 0.16, 2.85);
    } else if (viewTarget === 'left') {
      camera.position.set(-2.5, 0.35, 1.7);
    } else if (viewTarget === 'right') {
      camera.position.set(2.5, 0.35, 1.7);
    } else if (viewTarget === 'top') {
      camera.position.set(0, 2.9, 0.85);
    }
    camera.lookAt(0, 0.1, 0);
  }, [viewTarget, camera]);

  return null;
}

// Main HeartViewer3D Component
export default function HeartViewer3D({ vesselRisks }) {
  const [autoRotate, setAutoRotate] = useState(false);
  const [enableHeartbeat, setEnableHeartbeat] = useState(true);
  const [isTranslucent, setIsTranslucent] = useState(false); // Default to realistic textured solid
  const [showLabels, setShowLabels] = useState(true);
  const [selectedVessel, setSelectedVessel] = useState('LAD');
  const [viewPreset, setViewPreset] = useState('anterior');
  const [showClinicalGuide, setShowClinicalGuide] = useState(false);

  const activeMeta = VASCULAR_NETWORK[selectedVessel] || VASCULAR_NETWORK['LAD'];
  const activeRisk = vesselRisks?.[selectedVessel] || 0;
  const activeDetails = getRiskDetails(activeRisk);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 flex flex-col relative overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                3D Coronary Anatomy & Stenosis Mapping
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                LAD • LCX • RCA
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Authentic anatomical heart model with prominent high-visibility coronary branches
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Guide Button */}
          <button
            onClick={() => setShowClinicalGuide(g => !g)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition shadow-xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
            <span>Clinical Meaning</span>
          </button>

          {/* Translucent / Solid Mode Toggle */}
          <button
            onClick={() => setIsTranslucent(t => !t)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-xs ${
              isTranslucent 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
            title="Toggle between photorealistic solid muscle and semi-transparent X-ray view"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>{isTranslucent ? 'Translucent X-Ray' : 'Realistic Solid'}</span>
          </button>

          {/* Heartbeat Toggle */}
          <button
            onClick={() => setEnableHeartbeat(h => !h)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-xs ${
              enableHeartbeat 
                ? 'bg-slate-100 text-slate-800 border-slate-300' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-slate-600" />
            <span>Heartbeat</span>
          </button>

          {/* Auto-Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(r => !r)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-xs ${
              autoRotate 
                ? 'bg-sky-50 text-sky-700 border-sky-200' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 text-sky-600 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>Auto-Rotate</span>
          </button>

          {/* 3D Labels Toggle */}
          <button
            onClick={() => setShowLabels(l => !l)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-xs ${
              showLabels 
                ? 'bg-sky-50 text-sky-700 border-sky-200' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
            title="Toggle 3D floating vessel badges on/off"
          >
            <Tag className="w-3.5 h-3.5 text-sky-600" />
            <span>{showLabels ? '3D Tags' : 'No Tags'}</span>
          </button>
        </div>
      </div>

      {/* Clinical Guide Drawer */}
      {showClinicalGuide && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-sky-50/80 to-blue-50/40 border border-sky-200 text-slate-800 text-xs shadow-sm relative transition-all">
          <button 
            onClick={() => setShowClinicalGuide(false)}
            className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-slate-700 bg-white border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>

          <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-sky-600" /> Clinical Diagnostic & Visual Guide
          </h4>
          <p className="text-slate-600 mb-3">
            This digital twin visualizes the 3 primary epicardial coronary arteries responsible for myocardial infarction (heart attack). Each artery is labeled with its estimated stenosis risk:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="font-bold text-slate-900 block mb-1">1. The 3 Coronary Arteries</span>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                <li><strong className="text-red-600">LAD (Left Anterior Descending):</strong> Courses down the front. Supplies ~50% of the left ventricle. Acute blockage causes severe anterior MI.</li>
                <li><strong className="text-amber-600">LCX (Left Circumflex):</strong> Branches across the lateral wall. Supplies posterolateral myocardium.</li>
                <li><strong className="text-emerald-600">RCA (Right Coronary Artery):</strong> Courses along the right side to supply the inferior wall and heart conduction nodes.</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="font-bold text-slate-900 block mb-1">2. Color-Coded Risk Criteria</span>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                <li><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 align-middle"></span><strong>&lt; 30% (Patent):</strong> Normal flow, no hemodynamically significant stenosis.</li>
                <li><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5 align-middle"></span><strong>30% – 60% (Moderate):</strong> Intermediate narrowing; medical therapy & statin recommended.</li>
                <li><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 mr-1.5 align-middle"></span><strong>&gt; 60% (Critical Stenosis):</strong> Severe occlusion (≥50% lumen loss); catheterization indicated.</li>
              </ul>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="font-bold text-slate-900 block mb-1">3. Realistic vs Translucent Mode</span>
              <p className="text-slate-600 text-[11px]">
                Toggle between <strong>Realistic Solid</strong> (authentic cardiac texture) and <strong>Translucent X-Ray</strong> (see-through myocardium) to view all vessels clearly as the heart rotates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Camera Angles & Vessel Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {/* Camera Angles */}
        <div className="flex items-center space-x-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
            <Compass className="w-3 h-3 text-slate-400" /> View Angle:
          </span>
          <button
            onClick={() => setViewPreset('anterior')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              viewPreset === 'anterior' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Anterior (LAD)
          </button>
          <button
            onClick={() => setViewPreset('left')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              viewPreset === 'left' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lateral Left (LCX)
          </button>
          <button
            onClick={() => setViewPreset('right')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              viewPreset === 'right' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Right Branch (RCA)
          </button>
          <button
            onClick={() => setViewPreset('top')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              viewPreset === 'top' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Top Overview
          </button>
        </div>

        {/* Vessel Selector Buttons */}
        <div className="flex items-center space-x-2">
          {['LAD', 'LCX', 'RCA'].map((vKey) => {
            const vRisk = vesselRisks?.[vKey] || 0;
            const vDetails = getRiskDetails(vRisk);
            const isCurrent = selectedVessel === vKey;

            return (
              <button
                key={vKey}
                onClick={() => setSelectedVessel(vKey)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 shadow-xs ${
                  isCurrent 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{vKey}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                  isCurrent ? 'bg-slate-800 text-slate-100 border-slate-700' : vDetails.badgeClass
                }`}>
                  {Math.round(vRisk * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Canvas Viewport - Clean & Unobstructed */}
      <div className="w-full h-[520px] lg:h-[580px] bg-gradient-to-b from-slate-50 via-white to-sky-50/20 rounded-2xl overflow-hidden relative border border-slate-200/80 shadow-inner">
        {/* Navigation Tip */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center space-x-1.5 bg-white/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 text-[11px] font-medium text-slate-600 shadow-xs">
          <Eye className="w-3.5 h-3.5 text-sky-600" />
          <span>Click & Drag to Rotate • Scroll to Zoom</span>
        </div>

        {/* Risk Legend - Compact Single Row Pill */}
        <div className="absolute top-3 right-3 z-10 bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs text-[11px] flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"></span>
            <span className="text-slate-700 font-medium">Patent (&lt;30%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs"></span>
            <span className="text-slate-700 font-medium">Moderate (30–60%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-xs"></span>
            <span className="text-red-700 font-bold">Critical (&gt;60%)</span>
          </div>
        </div>

        {/* Three.js R3F 3D Scene */}
        <Canvas 
          camera={{ position: [0, 0.16, 2.85], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
        >
          {/* Studio Medical Lighting */}
          <ambientLight intensity={1.5} />
          <hemisphereLight skyColor="#ffffff" groundColor="#cbd5e1" intensity={1.1} />
          <directionalLight position={[6, 8, 6]} intensity={1.8} />
          <directionalLight position={[-6, -4, -4]} intensity={0.9} color="#bae6fd" />
          <pointLight position={[0, 2, 3]} intensity={1.2} />

          <Suspense fallback={
            <Html center>
              <div className="flex flex-col items-center justify-center p-4 bg-white/90 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-sm">
                <Activity className="w-6 h-6 text-sky-600 animate-spin mb-1" />
                <span>Loading Anatomical Heart...</span>
              </div>
            </Html>
          }>
            <CameraController viewTarget={viewPreset} />
            <RealisticHeartScene
              enableHeartbeat={enableHeartbeat}
              isTranslucent={isTranslucent}
              vesselRisks={vesselRisks}
              selectedVessel={selectedVessel}
              setSelectedVessel={setSelectedVessel}
              showLabels={showLabels}
            />
          </Suspense>

          {/* Smooth 360° Controls */}
          <OrbitControls
            target={[0, 0.1, 0]}
            enableZoom={true}
            enablePan={false}
            enableRotate={true}
            autoRotate={autoRotate}
            autoRotateSpeed={1.2}
            minDistance={1.8}
            maxDistance={5.2}
            dampingFactor={0.05}
          />
        </Canvas>
      </div>

      {/* Selected Vessel Clinical Detail Card (Cleanly placed BELOW the Canvas) */}
      <div className="mt-3.5 bg-gradient-to-r from-slate-50 via-white to-sky-50/30 p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4 transition-all">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm sm:text-base font-black text-slate-900">{activeMeta.name}</span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
              {activeMeta.acronym}
            </span>
            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${activeDetails.badgeClass}`}>
              {activeDetails.band} • {Math.round(activeRisk * 100)}% Risk
            </span>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-600">
            <span className="text-slate-400 font-semibold">Territory: </span>
            {activeMeta.territory}
          </div>
        </div>

        <div className="text-left md:text-right flex-shrink-0">
          <div className="text-[11px] sm:text-xs font-medium text-slate-600 max-w-sm">
            {activeDetails.clinicalAction}
          </div>
        </div>
      </div>
    </div>
  );
}
