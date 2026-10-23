import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  HeartPulse, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Bot, 
  Sparkles, 
  Play, 
  Square,
  HelpCircle
} from 'lucide-react';

export default function RiskDashboard({ predictionResult }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState('');
  const [speechStatus, setSpeechStatus] = useState('idle'); // 'idle' | 'speaking' | 'listening'
  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Clean up speech when component unmounts or prediction changes
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [predictionResult]);

  if (!predictionResult) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 mb-3">
          <HeartPulse className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">No Patient Assessment Loaded</h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Select a patient preset or enter clinical vitals to run real-time inference, view SHAP attributions, and hear the AI Doctor Voice Briefing.
        </p>
      </div>
    );
  }

  const { overall_cad_risk = 0, vessels = {}, top_factors = [], disclaimer = '' } = predictionResult;
  const cadPct = Math.round(overall_cad_risk * 100);

  // Generate Authoritative Clinical Text Script for Voice Synthesis
  const generateClinicalScript = (questionType = 'full') => {
    const ladPct = Math.round((vessels.LAD || 0) * 100);
    const lcxPct = Math.round((vessels.LCX || 0) * 100);
    const rcaPct = Math.round((vessels.RCA || 0) * 100);

    const criticalVessels = [];
    if (vessels.LAD > 0.6) criticalVessels.push(`the Left Anterior Descending artery at ${ladPct}%`);
    if (vessels.LCX > 0.6) criticalVessels.push(`the Left Circumflex artery at ${lcxPct}%`);
    if (vessels.RCA > 0.6) criticalVessels.push(`the Right Coronary artery at ${rccaPct}%`);

    const topRiskDriver = top_factors.find(f => f.effect === 'Increases Risk')?.feature || 'hemodynamic biomarkers';
    const topProtective = top_factors.find(f => f.effect === 'Protective' || f.effect === 'Lowers Risk')?.feature;

    if (questionType === 'artery') {
      if (criticalVessels.length > 0) {
        return `Critical stenosis is detected in ${criticalVessels.join(' and ')}. Immediate cardiac catheterization is advised to evaluate lumen narrowing.`;
      }
      return `Coronary vessels are currently in a non-critical hemodynamic state. LAD is at ${ladPct}%, LCX is at ${lcxPct}%, and RCA is at ${rcaPct}%. Routine preventive follow-up is appropriate.`;
    }

    if (questionType === 'shap') {
      return `Based on game-theoretic SHAP explainability, the primary clinical driver escalating this patient's risk is ${topRiskDriver}. ${topProtective ? `Conversely, ${topProtective} acted as a protective clinical factor.` : ''}`;
    }

    if (questionType === 'action') {
      if (overall_cad_risk > 0.6) {
        return `Emergency clinical protocol recommended: Urgent invasive coronary angiography and Fractional Flow Reserve evaluation in the Cath Lab.`;
      }
      if (overall_cad_risk > 0.3) {
        return `Intermediate risk detected: Initiate intensive statin and antiplatelet medical therapy, paired with stress echocardiography.`;
      }
      return `Low risk profile: Reassure the patient and maintain standard lifestyle optimization and routine annual outpatient review.`;
    }

    // Default Full Comprehensive Briefing
    let script = `Clinical Diagnostic Briefing for current patient. Overall Coronary Artery Disease probability is evaluated at ${cadPct} percent. `;
    if (criticalVessels.length > 0) {
      script += `Warning: Significant stenosis is identified in ${criticalVessels.join(' and ')}. `;
    } else {
      script += `All three epicardial arteries demonstrate normal or moderate perfusion. `;
    }
    script += `The leading biomarker escalating risk is ${topRiskDriver}. `;
    if (overall_cad_risk > 0.6) {
      script += `Immediate catheterization laboratory referral is indicated.`;
    } else {
      script += `Conservative lifestyle management is advised.`;
    }
    return script;
  };

  // Speak Text using Native Web Speech API
  const speakText = (text) => {
    if (!synthRef.current) return;

    synthRef.current.cancel(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick natural English voice if available
    const voices = synthRef.current.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Samantha')));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeechStatus('speaking');
      setActiveSpeechText(text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechStatus('idle');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechStatus('idle');
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setSpeechStatus('idle');
    }
  };

  // Speech Recognition (Ask with Voice)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speakText(generateClinicalScript('full'));
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      setSpeechStatus('idle');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus('listening');
        setActiveSpeechText('Listening... (e.g., Ask "Which artery is blocked?" or "What is the diagnosis?")');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        setIsListening(false);
        setSpeechStatus('idle');

        if (transcript.includes('artery') || transcript.includes('vessel') || transcript.includes('lad') || transcript.includes('block')) {
          speakText(generateClinicalScript('artery'));
        } else if (transcript.includes('why') || transcript.includes('factor') || transcript.includes('shap') || transcript.includes('cause')) {
          speakText(generateClinicalScript('shap'));
        } else if (transcript.includes('action') || transcript.includes('do') || transcript.includes('treat') || transcript.includes('surgery')) {
          speakText(generateClinicalScript('action'));
        } else {
          speakText(generateClinicalScript('full'));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setSpeechStatus('idle');
        speakText(generateClinicalScript('full'));
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
      setSpeechStatus('idle');
      speakText(generateClinicalScript('full'));
    }
  };

  const getRiskBadge = (risk) => {
    if (risk > 0.6) {
      return (
        <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
          Stenotic (Critical &gt;60%)
        </span>
      );
    }
    if (risk > 0.3) {
      return (
        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Moderate (30-60%)
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Patent (&lt;30%)
      </span>
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 flex flex-col space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Clinical Risk & Explainability Breakdown
            </h2>
            <p className="text-xs text-slate-500">Multimodal probability analysis, SHAP feature attributions & AI Voice Doctor</p>
          </div>
        </div>

        {/* AI Voice Doctor Briefing Trigger Button */}
        <div className="flex items-center space-x-2">
          {isSpeaking ? (
            <button
              onClick={stopSpeaking}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Voice</span>
            </button>
          ) : (
            <button
              onClick={() => speakText(generateClinicalScript('full'))}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sm transition hover:shadow-md"
            >
              <Volume2 className="w-4 h-4" />
              <span>Voice Doctor Briefing</span>
            </button>
          )}

          <button
            onClick={toggleListening}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              isListening 
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Ask a clinical question using your microphone"
          >
            {isListening ? <MicOff className="w-3.5 h-3.5 text-rose-600" /> : <Mic className="w-3.5 h-3.5 text-sky-600" />}
            <span>{isListening ? 'Listening...' : 'Ask Doctor'}</span>
          </button>
        </div>
      </div>

      {/* AI Voice Doctor Interactive Console */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold tracking-wide uppercase text-sky-400">
              AI Voice Clinical Consultant
            </span>
          </div>

          {/* Equalizer Soundwave Indicator */}
          {isSpeaking && (
            <div className="flex items-center space-x-1">
              <span className="w-1 h-3 bg-sky-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
              <span className="w-1 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
              <span className="w-1 h-4 bg-sky-400 rounded-full animate-bounce [animation-delay:0.45s]"></span>
              <span className="text-[11px] font-mono text-sky-300 ml-1.5">Speaking...</span>
            </div>
          )}
        </div>

        {/* Live Audio Transcript Box */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed mb-3 min-h-[44px] flex items-center">
          {activeSpeechText || (
            <span className="text-slate-500 italic">
              Click "Voice Doctor Briefing" or click one of the quick questions below to hear the clinical diagnosis aloud.
            </span>
          )}
        </div>

        {/* Quick Question Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Voice Q&A:</span>
          <button
            onClick={() => speakText(generateClinicalScript('full'))}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
          >
            📋 Full Diagnosis
          </button>
          <button
            onClick={() => speakText(generateClinicalScript('artery'))}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
          >
            🫀 Which Artery is in Danger?
          </button>
          <button
            onClick={() => speakText(generateClinicalScript('shap'))}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
          >
            🔍 Why Did the Risk Increase?
          </button>
          <button
            onClick={() => speakText(generateClinicalScript('action'))}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
          >
            🏥 Surgical Triage Action
          </button>
        </div>
      </div>

      {/* Top Cards: Overall CAD Risk + Vessel Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Risk Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-sky-50/50 border border-slate-200/80 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                CAD Disease Risk
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                Math.round(Math.max(overall_cad_risk, 1 - overall_cad_risk) * 100) >= 80 
                  ? 'bg-sky-50 text-sky-700 border-sky-200' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {Math.round(Math.max(overall_cad_risk, 1 - overall_cad_risk) * 100)}% Confidence
              </span>
            </div>

            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-black text-slate-900">{cadPct}%</span>
              <span className="text-xs text-slate-500 font-medium">Risk Score</span>
            </div>

            <p className="text-[11px] text-slate-500 mt-1">
              Model is <strong>{Math.round(Math.max(overall_cad_risk, 1 - overall_cad_risk) * 100)}% confident</strong> patient is{' '}
              <strong className={overall_cad_risk >= 0.5 ? 'text-red-700' : 'text-emerald-700'}>
                {overall_cad_risk >= 0.5 ? 'Stenotic (CAD)' : 'Normal (Healthy)'}
              </strong>.
            </p>
          </div>
          <div className="mt-3">{getRiskBadge(overall_cad_risk)}</div>
        </div>

        {/* Vessel Risk Cards (LAD, LCX, RCA) */}
        {Object.entries(vessels).map(([vName, vRisk]) => {
          const vPct = Math.round(vRisk * 100);
          const isHigh = vRisk > 0.6;
          const isMed = vRisk > 0.3;

          return (
            <div 
              key={vName} 
              className={`p-4 rounded-xl border flex flex-col justify-between shadow-2xs transition ${
                isHigh 
                  ? 'bg-red-50/40 border-red-200' 
                  : isMed 
                    ? 'bg-amber-50/40 border-amber-200' 
                    : 'bg-emerald-50/30 border-emerald-200'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-800">{vName} Artery</span>
                  <span className={`text-xs font-mono font-bold ${
                    isHigh ? 'text-red-700' : isMed ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {vPct}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {vName === 'LAD' ? 'Left Anterior Descending' : vName === 'LCX' ? 'Left Circumflex' : 'Right Coronary'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/70 h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    isHigh ? 'bg-red-600' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${vPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* SHAP Clinical Drivers Section */}
      <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Top Clinical Drivers (SHAP Attribution)
            </span>
            <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-medium">
              Patient Specific
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Positive impact increases CAD likelihood
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {top_factors.map((factor, idx) => {
            const isIncrease = factor.effect === 'Increases Risk';
            return (
              <div 
                key={idx}
                className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between"
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="text-xs font-bold text-slate-800 truncate" title={factor.feature}>
                    {factor.feature}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Impact: <span className="font-mono font-semibold text-slate-600">{factor.impact > 0 ? `+${factor.impact}` : factor.impact}</span>
                  </div>
                </div>

                <div className={`px-2 py-1 rounded text-[11px] font-bold flex items-center space-x-1 whitespace-nowrap ${
                  isIncrease ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {isIncrease ? <TrendingUp className="w-3.5 h-3.5 text-red-600" /> : <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{isIncrease ? 'Increases Risk' : 'Protective'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mandatory Clinical Safety Disclaimer */}
      <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-xl flex items-start space-x-3 text-xs text-amber-800 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Medical Decision Support Disclaimer: </span>
          <span>{disclaimer || 'Predictions are for clinical decision support and educational purposes at INNOTECH 2026. Not a substitute for formal diagnostic coronary angiography.'}</span>
        </div>
      </div>
    </div>
  );
}
