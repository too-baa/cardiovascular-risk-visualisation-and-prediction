import React, { useState, useEffect, useMemo } from 'react';
import demoPresets from '../../../demo_presets.json';
import { 
  Users, 
  Stethoscope, 
  FlaskConical, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  ArrowRight,
  Search,
  Database,
  Hash,
  FileText,
  HeartPulse,
  ClipboardList
} from 'lucide-react';

// Comprehensive Clinical Grouping of all 55 features from Z-Alizadeh Sani / UCI dataset
const ALL_55_FEATURE_GROUPS = {
  vitals: {
    id: 'vitals',
    title: 'Demographics & Vitals',
    icon: Stethoscope,
    badge: '13 Features',
    fields: [
      { key: 'Age', label: 'Patient Age', unit: 'yrs', type: 'number', min: 20, max: 100 },
      { key: 'Sex', label: 'Biological Sex', type: 'select', options: ['Male', 'Fmale'] },
      { key: 'Weight', label: 'Body Weight', unit: 'kg', type: 'number', min: 30, max: 200 },
      { key: 'Length', label: 'Height / Length', unit: 'cm', type: 'number', min: 100, max: 220 },
      { key: 'BMI', label: 'Body Mass Index (BMI)', unit: 'kg/m²', type: 'number', step: 0.1 },
      { key: 'BP', label: 'Systolic Blood Pressure', unit: 'mmHg', type: 'number', min: 70, max: 240 },
      { key: 'PR', label: 'Pulse Rate', unit: 'bpm', type: 'number', min: 40, max: 180 },
      { key: 'DM', label: 'Diabetes Mellitus', type: 'select', options: [0, 1] },
      { key: 'HTN', label: 'Hypertension', type: 'select', options: [0, 1] },
      { key: 'Current Smoker', label: 'Current Smoker', type: 'select', options: [0, 1] },
      { key: 'EX-Smoker', label: 'Ex-Smoker', type: 'select', options: [0, 1] },
      { key: 'FH', label: 'Family History CAD', type: 'select', options: [0, 1] },
      { key: 'Obesity', label: 'Obesity Status', type: 'select', options: ['Y', 'N'] }
    ]
  },
  history: {
    id: 'history',
    title: 'Medical History',
    icon: ClipboardList,
    badge: '6 Features',
    fields: [
      { key: 'CRF', label: 'Chronic Renal Failure (CRF)', type: 'select', options: ['N', 'Y'] },
      { key: 'CVA', label: 'Cerebrovascular Accident / Stroke (CVA)', type: 'select', options: ['N', 'Y'] },
      { key: 'Airway disease', label: 'Chronic Airway Disease (COPD/Asthma)', type: 'select', options: ['N', 'Y'] },
      { key: 'Thyroid Disease', label: 'Thyroid Disease', type: 'select', options: ['N', 'Y'] },
      { key: 'CHF', label: 'Congestive Heart Failure (CHF)', type: 'select', options: ['N', 'Y'] },
      { key: 'DLP', label: 'Dyslipidemia (DLP)', type: 'select', options: ['Y', 'N'] }
    ]
  },
  exam: {
    id: 'exam',
    title: 'Physical Exam',
    icon: HeartPulse,
    badge: '5 Features',
    fields: [
      { key: 'Edema', label: 'Peripheral Edema', type: 'select', options: [0, 1] },
      { key: 'Weak Peripheral Pulse', label: 'Weak Peripheral Pulse', type: 'select', options: ['N', 'Y'] },
      { key: 'Lung rales', label: 'Pulmonary Rales', type: 'select', options: ['N', 'Y'] },
      { key: 'Systolic Murmur', label: 'Systolic Murmur', type: 'select', options: ['N', 'Y'] },
      { key: 'Diastolic Murmur', label: 'Diastolic Murmur', type: 'select', options: ['N', 'Y'] }
    ]
  },
  symptoms: {
    id: 'symptoms',
    title: 'Symptoms & Angina',
    icon: Activity,
    badge: '7 Features',
    fields: [
      { key: 'Typical Chest Pain', label: 'Typical Angina', type: 'select', options: [0, 1] },
      { key: 'Dyspnea', label: 'Shortness of Breath (Dyspnea)', type: 'select', options: ['N', 'Y'] },
      { key: 'Function Class', label: 'NYHA Function Class', unit: '0–3', type: 'number', min: 0, max: 3 },
      { key: 'Atypical', label: 'Atypical Chest Pain', type: 'select', options: ['N', 'Y'] },
      { key: 'Nonanginal', label: 'Non-Anginal Chest Pain', type: 'select', options: ['N', 'Y'] },
      { key: 'Exertional CP', label: 'Exertional Chest Pain', type: 'select', options: ['N', 'Y'] },
      { key: 'LowTH Ang', label: 'Low Threshold Angina', type: 'select', options: ['N', 'Y'] }
    ]
  },
  ecg: {
    id: 'ecg',
    title: 'ECG & Echocardiogram',
    icon: FileText,
    badge: '10 Features',
    fields: [
      { key: 'Q Wave', label: 'Pathological Q Wave', type: 'select', options: [0, 1] },
      { key: 'St Elevation', label: 'ST Segment Elevation', type: 'select', options: [0, 1] },
      { key: 'St Depression', label: 'ST Segment Depression', type: 'select', options: [0, 1] },
      { key: 'Tinversion', label: 'T-Wave Inversion', type: 'select', options: [0, 1] },
      { key: 'LVH', label: 'Left Ventricular Hypertrophy (LVH)', type: 'select', options: ['N', 'Y'] },
      { key: 'Poor R Progression', label: 'Poor R-Wave Progression', type: 'select', options: ['N', 'Y'] },
      { key: 'BBB', label: 'Bundle Branch Block (BBB)', type: 'select', options: ['N', 'LBBB', 'RBBB'] },
      { key: 'EF-TTE', label: 'Ejection Fraction (EF-TTE)', unit: '%', type: 'number', min: 10, max: 80 },
      { key: 'Region RWMA', label: 'Regional Wall Motion (RWMA)', unit: '0–4', type: 'number', min: 0, max: 4 },
      { key: 'VHD', label: 'Valvular Heart Disease (VHD)', type: 'select', options: ['N', 'mild', 'Moderate', 'Severe'] }
    ]
  },
  labs: {
    id: 'labs',
    title: 'Biomarkers & Labs',
    icon: FlaskConical,
    badge: '14 Features',
    fields: [
      { key: 'FBS', label: 'Fasting Blood Sugar', unit: 'mg/dL', type: 'number', min: 50, max: 500 },
      { key: 'CR', label: 'Serum Creatinine', unit: 'mg/dL', type: 'number', step: 0.1, min: 0.3, max: 15 },
      { key: 'TG', label: 'Triglycerides (TG)', unit: 'mg/dL', type: 'number', min: 30, max: 1000 },
      { key: 'LDL', label: 'LDL Cholesterol', unit: 'mg/dL', type: 'number', min: 20, max: 400 },
      { key: 'HDL', label: 'HDL Cholesterol', unit: 'mg/dL', type: 'number', min: 10, max: 150 },
      { key: 'BUN', label: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', type: 'number', min: 5, max: 100 },
      { key: 'ESR', label: 'Erythrocyte Sedimentation (ESR)', unit: 'mm/hr', type: 'number', min: 1, max: 120 },
      { key: 'HB', label: 'Hemoglobin (HB)', unit: 'g/dL', type: 'number', step: 0.1, min: 5, max: 22 },
      { key: 'K', label: 'Serum Potassium (K+)', unit: 'mEq/L', type: 'number', step: 0.1, min: 2, max: 8 },
      { key: 'Na', label: 'Serum Sodium (Na+)', unit: 'mEq/L', type: 'number', min: 110, max: 165 },
      { key: 'WBC', label: 'White Blood Cell Count', unit: '/mcL', type: 'number', min: 2000, max: 30000 },
      { key: 'Lymph', label: 'Lymphocyte Ratio', unit: '%', type: 'number', min: 1, max: 80 },
      { key: 'Neut', label: 'Neutrophil Ratio', unit: '%', type: 'number', min: 10, max: 95 },
      { key: 'PLT', label: 'Platelet Count (PLT)', unit: '10³/mcL', type: 'number', min: 50, max: 900 }
    ]
  }
};

const PRESET_SUMMARIES = {
  'Patient 1 - Healthy / Low Risk': {
    id: 3,
    label: 'Case 1: Low Risk (Normal)',
    badge: 'Patent (<30%)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    details: '66yo Female, Non-smoker, Normal Lipids, 10% LAD'
  },
  'Patient 2 - Single-Vessel (LAD) Stenosis': {
    id: 1,
    label: 'Case 2: Acute LAD ("Widowmaker")',
    badge: 'LAD Stenosis (92%)',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    details: '55yo Male, Ex-smoker, ST Elevation + T Inversion'
  },
  'Patient 3 - Severe Multi-Vessel CAD': {
    id: 0,
    label: 'Case 3: Severe Multi-Vessel CAD',
    badge: 'Multi-Vessel (86% LAD, 77% RCA)',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    details: '50yo Male, Active Smoker, Multi-vessel occlusion'
  }
};

export default function VitalsForm({ onPredict, loading }) {
  const [formData, setFormData] = useState({});
  const [selectedPreset, setSelectedPreset] = useState('Patient 1 - Healthy / Low Risk');
  const [activeTab, setActiveTab] = useState('vitals');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real patient records (303 records from UCI dataset)
  const [datasetPatients, setDatasetPatients] = useState([]);
  const [patientIdInput, setPatientIdInput] = useState(3);
  const [activeGroundTruth, setActiveGroundTruth] = useState(null);

  // Load all 303 real patient records from public/dataset_patients.json
  useEffect(() => {
    fetch('/dataset_patients.json')
      .then(res => res.json())
      .then(data => {
        setDatasetPatients(data);
        if (data && data.length > 3) {
          const defaultPatient = data[3]; // Patient #3 (healthy)
          setPatientIdInput(3);
          setActiveGroundTruth(defaultPatient.ground_truth);
          setFormData(defaultPatient.patient_data);
          onPredict(defaultPatient.patient_data);
        }
      })
      .catch(err => {
        console.warn('Could not load dataset_patients.json, using fallback presets', err);
        const firstKey = Object.keys(demoPresets)[0];
        if (firstKey) {
          setFormData(demoPresets[firstKey].patient_data);
          onPredict(demoPresets[firstKey].patient_data);
        }
      });
  }, []);

  const handleSelectPatientNumber = (num) => {
    const id = parseInt(num, 10);
    if (isNaN(id) || id < 0 || id >= (datasetPatients.length || 303)) return;

    setPatientIdInput(id);
    setSelectedPreset('');

    if (datasetPatients[id]) {
      const p = datasetPatients[id];
      setActiveGroundTruth(p.ground_truth);
      setFormData(p.patient_data);
      onPredict(p.patient_data);
    }
  };

  const handleSelectPreset = (key) => {
    setSelectedPreset(key);
    if (demoPresets[key]) {
      const data = demoPresets[key].patient_data;
      setFormData(data);
      const matched = PRESET_SUMMARIES[key];
      if (matched && datasetPatients[matched.id]) {
        setPatientIdInput(matched.id);
        setActiveGroundTruth(datasetPatients[matched.id].ground_truth);
      }
      onPredict(data);
    }
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: isNaN(value) ? value : Number(value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict(formData);
  };

  // Filter fields if user typed a search query
  const allFields = useMemo(() => {
    const list = [];
    Object.values(ALL_55_FEATURE_GROUPS).forEach(grp => {
      grp.fields.forEach(f => list.push({ ...f, groupTitle: grp.title }));
    });
    return list;
  }, []);

  const searchedFields = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allFields.filter(f => 
      f.key.toLowerCase().includes(q) || 
      f.label.toLowerCase().includes(q) || 
      f.groupTitle.toLowerCase().includes(q)
    );
  }, [searchQuery, allFields]);

  const currentGroup = ALL_55_FEATURE_GROUPS[activeTab] || ALL_55_FEATURE_GROUPS['vitals'];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 flex flex-col h-full">
      {/* Title */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Patient Clinical Vitals
          </h2>
          <p className="text-xs text-slate-500">UCI Z-Alizadeh Sani Cohort (303 Hospital Patients)</p>
        </div>
        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          All 55 Features Active
        </span>
      </div>

      {/* Real Patient Record Search Stepper (#0 to #302) */}
      <div className="mb-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-sky-600" />
            Test Real Patient Record:
          </label>
          <span className="text-[10px] text-slate-500 font-mono">Row 0 to 302</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">#</span>
            <input
              type="number"
              min="0"
              max="302"
              value={patientIdInput}
              onChange={(e) => handleSelectPatientNumber(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-1.5 text-xs font-bold text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="e.g. 0 to 302"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSelectPatientNumber(Math.max(0, patientIdInput - 1))}
            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-700"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => handleSelectPatientNumber(Math.min(302, patientIdInput + 1))}
            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-700"
          >
            Next →
          </button>
        </div>

        {/* Hospital Angiography Ground Truth */}
        {activeGroundTruth && (
          <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-[11px]">
            <span className="font-bold text-slate-600">Actual Hospital Finding:</span>
            <div className="flex items-center space-x-1.5 font-mono">
              <span className={`px-1.5 py-0.2 rounded font-semibold ${
                activeGroundTruth.LAD === 'Stenotic' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                LAD: {activeGroundTruth.LAD}
              </span>
              <span className={`px-1.5 py-0.2 rounded font-semibold ${
                activeGroundTruth.LCX === 'Stenotic' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                LCX: {activeGroundTruth.LCX}
              </span>
              <span className={`px-1.5 py-0.2 rounded font-semibold ${
                activeGroundTruth.RCA === 'Stenotic' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                RCA: {activeGroundTruth.RCA}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Benchmark Case Studies */}
      <div className="mb-4">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
          Or Select Benchmark Case Study
        </label>
        <div className="space-y-1.5">
          {Object.entries(PRESET_SUMMARIES).map(([key, meta]) => {
            const isSelected = selectedPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-1 ring-sky-400'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{meta.label}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{meta.details}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                  {meta.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input across all 55 features */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter any of 55 clinical features..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Feature Group Navigation Tabs (Shown when not actively searching) */}
      {!searchQuery && (
        <div className="grid grid-cols-3 gap-1 mb-3 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
          {Object.values(ALL_55_FEATURE_GROUPS).map((group) => {
            const Icon = group.icon;
            const isActive = activeTab === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveTab(group.id)}
                className={`flex items-center justify-center space-x-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                title={group.title}
              >
                <Icon className="w-3 h-3 text-sky-600 flex-shrink-0" />
                <span className="truncate">{group.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input Fields Area */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4 max-h-[320px]">
          {searchedFields ? (
            searchedFields.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No feature matches "{searchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {searchedFields.map((field) => (
                  <div key={field.key} className="bg-slate-50/80 p-2 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700 truncate" title={field.label}>{field.label}</span>
                      {field.unit && <span className="text-slate-400 text-[10px] ml-1">{field.unit}</span>}
                    </div>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] ?? ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900 font-medium focus:border-sky-500"
                      >
                        {field.options.map((opt) => (
                          <option key={String(opt)} value={opt}>
                            {String(opt)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        step={field.step || '1'}
                        value={formData[field.key] ?? ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900 font-medium focus:border-sky-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {currentGroup.fields.map((field) => (
                <div key={field.key} className="bg-slate-50/80 p-2 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-700 truncate" title={field.label}>{field.label}</span>
                    {field.unit && <span className="text-slate-400 text-[10px] ml-1">{field.unit}</span>}
                  </div>
                  {field.type === 'select' ? (
                    <select
                      value={formData[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900 font-medium focus:border-sky-500"
                    >
                      {field.options.map((opt) => (
                        <option key={String(opt)} value={opt}>
                          {String(opt)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      step={field.step || '1'}
                      value={formData[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900 font-medium focus:border-sky-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prediction Submission Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <span>Computing 55-Feature ML Inference...</span>
          ) : (
            <>
              <span>Run Full 55-Feature Prediction</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
