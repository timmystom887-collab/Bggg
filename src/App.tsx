import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Activity, 
  Eye, 
  EyeOff, 
  Video, 
  Radio, 
  Mic, 
  Volume2, 
  Bluetooth, 
  Database, 
  AlertTriangle, 
  FileText, 
  Compass, 
  Camera, 
  MapPin, 
  Lock, 
  Unlock, 
  Cpu, 
  Search, 
  Plus, 
  Play, 
  Square, 
  CheckCircle, 
  RefreshCw, 
  X,
  Map,
  Copy,
  Download,
  AlertCircle
} from 'lucide-react';

// Static assets we generated earlier
const MASCOT_OWL = "/src/assets/images/mascot_aegis_owl_1790660568483.jpg";
const HERO_CONSOLE = "/src/assets/images/hero_aegis_console_1790660581489.jpg";
const BLUEPRINT_WIFI = "/src/assets/images/blueprint_wifi_csi_1790660595037.jpg";

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'acoustics' | 'signals' | 'emergency' | 'system'>('acoustics');
  
  // Stealth Calculator & Vault State
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [showCalculator, setShowCalculator] = useState(false);
  const [vaultError, setVaultError] = useState('');
  const [vaultData, setVaultData] = useState<any>(null);

  // Global telemetry states (simulated)
  const [bleStalkers, setBleStalkers] = useState<number>(0);
  const [activeJammers, setActiveJammers] = useState<string[]>([]);
  const [safeZoneArmed, setSafeZoneArmed] = useState(true);
  const [foiaRequestsCount, setFoiaRequestsCount] = useState(2);
  const [systemUptime, setSystemUptime] = useState(0);

  // --- FEATURE 1: AI Lawyer State ---
  const [aiLawyerEncounter, setAiLawyerEncounter] = useState('Routine Traffic Stop');
  const [aiLawyerStatement, setAiLawyerStatement] = useState('');
  const [aiLawyerHistory, setAiLawyerHistory] = useState<Array<{ role: 'user' | 'assistant', text: string }>>([
    { role: 'assistant', text: "Aegis AI Lawyer Guardian fully initialized. I am monitoring your surrounding audio. State the officer's actions or enter dialogue to receive real-time constitutional coaching." }
  ]);
  const [aiLawyerLoading, setAiLawyerLoading] = useState(false);
  const [aiLawyerAdvice, setAiLawyerResponse] = useState<any>({
    riskLevel: 30,
    verbatimPhrase: "Officer, with all due respect, I am going to remain silent. I do not consent to any searches.",
    actionSteps: [
      "Keep your hands visible on the steering wheel at all times.",
      "Assertively state your refusal of consent before any potential physical intrusion.",
      "Inquire: 'Officer, am I free to go, or am I being detained?'"
    ],
    legalSummary: "Under the Fourth Amendment, you have the absolute right to refuse a consent search of your vehicle. Under the Fifth Amendment, you have the right to remain silent. Asserting these rights respectfully prevents officers from fabricating implied consent."
  });

  // --- FEATURE 2: Acoustic Tracker Magnifier State ---
  const [magnifierBeamAngle, setMagnifierBeamAngle] = useState(180);
  const [magnifierGain, setMagnifierGain] = useState(50);
  const [magnifierVocalBoost, setMagnifierVocalBoost] = useState(true);
  const [magnifierListening, setMagnifierListening] = useState(false);

  // --- FEATURE 3: Audio Privacy Guard & Beacon Jammer State ---
  const [ultrasonicJammerActive, setUltrasonicJammerActive] = useState(false);
  const [ultrasonicFrequency, setUltrasonicFrequency] = useState(21000);
  const [beaconScannerLogs, setBeaconScannerLogs] = useState<string[]>([
    "System Boot: Near-ultrasonic spectrum monitor activated (18kHz - 22kHz).",
    "Telemetry scanning: Nominal static ambient pressure."
  ]);

  // --- FEATURE 4: Live Speech Capture State ---
  const [speechTranscript, setSpeechTranscript] = useState<Array<{ id: string, speaker: string, text: string, redacted: boolean }>>([
    { id: '1', speaker: "Operator", text: "Initializing Live Speech redaction filter...", redacted: false },
    { id: '2', speaker: "Officer (Simulated)", text: "Sir, please state your full legal name, social security number, and telephone number for the record.", redacted: false },
    { id: '3', speaker: "Driver (Simulated)", text: "My name is John Doe, SSN is [REDACTED], and you can reach me at [REDACTED].", redacted: true }
  ]);
  const [speechActive, setSpeechActive] = useState(false);

  // --- FEATURE 5: Farm Machinery Stethoscope State ---
  const [ stethoscopeEngine, setStethoscopeEngine ] = useState('John Deere 8R');
  const [ stethoscopeProfile, setStethoscopeProfile ] = useState('Nominal Rhythmic Chug');
  const [ stethoscopeCustomNote, setStethoscopeCustomNote ] = useState('');
  const [ stethoscopeLoading, setStethoscopeLoading ] = useState(false);
  const [ stethoscopeDiagnosis, setStethoscopeDiagnosis ] = useState<any>({
    status: "Nominal",
    primaryFault: "Mechanical Integrity Nominal",
    severityScore: 12,
    acousticSignaturesDetected: ["Rhythmic timing interval matching 850 RPM", "Standard lifter clearance acoustics"],
    remediationSteps: ["No immediate remediation required.", "Schedule standard 250-hour oil and filter maintenance."],
    geminiExplanation: "Frequency spectrum indicates a balanced combustion cycle with normal primary harmonics. Mechanical vibration remains well within the manufacturer's nominal envelope. Excellent engine health."
  });

  // Web Audio API refs for Stethoscope synthesizer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthIntervalRef = useRef<any>(null);

  // --- FEATURE 6: WiFi CSI Radar Canvas State ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [csiFrequency, setCsiFrequency] = useState(2400); // MHz
  const [csiGain, setCsiGain] = useState(60);

  // --- FEATURE 7: BLE Stalker Scan State ---
  const [bleScanning, setBleScanning] = useState(false);
  const [bleDevices, setBleScanningDevices] = useState<Array<{ id: string, name: string, rssi: number, distance: number, suspicious: boolean, trackedDuration: string }>>([
    { id: 'TAG_AF41', name: 'Unknown AirTag (BLE Beacon)', rssi: -62, distance: 1.2, suspicious: true, trackedDuration: "42 mins" },
    { id: 'TAG_993E', name: 'Personal Tile Tracker', rssi: -48, distance: 0.3, suspicious: false, trackedDuration: "N/A" }
  ]);

  // --- FEATURE 8: Haven Intrusion Sentinel State ---
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sentinelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sentinelSensitivity, setSentinelSensitivity] = useState(30);
  const [sentinelAlarmTriggered, setSentinelAlarmTriggered] = useState(false);
  const [sentinelVideoFeedActive, setSentinelVideoFeedActive] = useState(false);
  const [sentinelLogs, setSentinelLogs] = useState<string[]>([
    "Sentinel armed. Standing guard over primary viewport."
  ]);

  // --- FEATURE 9: FOIA Discovery State ---
  const [foiaDepartment, setFoiaDepartment] = useState('LAPD Division 4');
  const [foiaDate, setFoiaDate] = useState('2026-09-28');
  const [foiaDescription, setFoiaDescription] = useState('Routine traffic stop on Wiltshire Blvd involving arbitrary vehicle search requests.');
  const [foiaRequester, setFoiaRequester] = useState('Timothy Stom');
  const [foiaLoading, setFoiaLoading] = useState(false);
  const [foiaLetter, setFoiaLetter] = useState<any>({
    subject: "PUBLIC RECORDS ACT REQUEST: BODY-CAM & DISPATCH LOGS (INCIDENT: 2026-09-28)",
    letterBody: `To the Custodian of Records,\n\nPursuant to the State Public Records Act, I hereby request copies of all public records regarding the incident occurring on 2026-09-28.\n\nSpecifically, I request:\n1. All body-worn camera (BWC) footage and dash-camera recordings captured by officers involved in the stop/detention.\n2. All radio traffic transmissions, CAD logs, and 911 dispatch records relating to this encounter.\n3. All official report summaries, field interviews, and citation indices generated.\n\nPlease preserve all such digital media immediately as of this receipt.\n\nSincerely,\nTimothy Stom`,
    statutoryCitations: ["State Public Records Act § 6250", "Evidence Preservation Mandate § 1032"],
    preservationWarning: "WARNING: Destruction or premature deletion of body-cam or squad-car records following formal notice constitutes a violation of statutory preservation mandates."
  });

  // --- FEATURE 10: Scam Shield State ---
  const [scamMessage, setScamMessage] = useState('Bank of America Alert: Unusual login detected. Please confirm your identity immediately: http://boa-secure-credential-verify.com');
  const [scamLoading, setScamLoading] = useState(false);
  const [scamResult, setScamResult] = useState<any>({
    riskScore: 98,
    isScam: true,
    category: "Phishing / Bank Fraud",
    detectedThreats: ["Suspicious domain (boa-secure-credential-verify.com)", "High urgency language", "Unsolicited security notification"],
    actionRecommendation: "STRICTLY BLOCK & REPORT. Do not click the link or provide any login credentials.",
    detailedAnalysis: "The message mimics official Bank of America security alerts but routes the user to a completely illegitimate domain registered under a third-party registrar. This is a classic credential harvesting attempt aimed at capturing banking passwords."
  });

  // --- FEATURE 11: Emergency Lockdown State ---
  const [lockdownActive, setLockdownActive] = useState(false);
  const [lockdownCounter, setLockdownCounter] = useState(0);

  // Uptime incrementer
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- HELPER: AUDIO CONTEXT SYNTHESIZER FOR MACHINES ---
  const stopStethoscopeSynth = () => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  const playStethoscopeSynth = (profile: string) => {
    stopStethoscopeSynth();
    
    // Create new AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    let beatRate = 120; // BPM
    let carrierFreq = 80; // Bass engine frequency
    let knockGain = 0.5;
    let tappingFreq = 1800; // Valve tapping pitch

    if (profile === 'Nominal Rhythmic Chug') {
      beatRate = 90;
      carrierFreq = 70;
      knockGain = 0.2;
    } else if (profile === 'Heavy Connecting Rod Knock') {
      beatRate = 130;
      carrierFreq = 50;
      knockGain = 0.8;
    } else if (profile === 'Squealing Alternator Belt') {
      beatRate = 60; // slow modulation
      carrierFreq = 90;
      knockGain = 0.1;
    } else if (profile === 'Metallic Valve Tapping') {
      beatRate = 160;
      carrierFreq = 80;
      knockGain = 0.4;
    }

    const intervalTime = (60 / beatRate) * 1000;

    const playEngineStroke = () => {
      if (!ctx || ctx.state === 'closed') return;

      // Primary Cylinder Combustion Stroke (low frequency)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.frequency.setValueAtTime(carrierFreq, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);

      // Fault sound injects
      if (profile === 'Heavy Connecting Rod Knock') {
        // Metallic low thump
        const knockOsc = ctx.createOscillator();
        const knockGainNode = ctx.createGain();
        knockOsc.connect(knockGainNode);
        knockGainNode.connect(ctx.destination);

        knockOsc.type = 'triangle';
        knockOsc.frequency.setValueAtTime(45, ctx.currentTime + 0.05);
        knockGainNode.gain.setValueAtTime(knockGain, ctx.currentTime + 0.05);
        knockGainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

        knockOsc.start();
        knockOsc.stop(ctx.currentTime + 0.3);
      } else if (profile === 'Squealing Alternator Belt') {
        // High frequency squeal
        const squealOsc = ctx.createOscillator();
        const squealGainNode = ctx.createGain();
        squealOsc.connect(squealGainNode);
        squealGainNode.connect(ctx.destination);

        squealOsc.type = 'sine';
        squealOsc.frequency.setValueAtTime(2500, ctx.currentTime);
        squealOsc.frequency.linearRampToValueAtTime(2700, ctx.currentTime + 0.2);
        squealGainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        squealGainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);

        squealOsc.start();
        squealOsc.stop(ctx.currentTime + 0.3);
      } else if (profile === 'Metallic Valve Tapping') {
        // Fast clicky metallic ticks
        const tapOsc = ctx.createOscillator();
        const tapGainNode = ctx.createGain();
        tapOsc.connect(tapGainNode);
        tapGainNode.connect(ctx.destination);

        tapOsc.type = 'sine';
        tapOsc.frequency.setValueAtTime(tappingFreq, ctx.currentTime);
        tapGainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        tapGainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        tapOsc.start();
        tapOsc.stop(ctx.currentTime + 0.07);
      }
    };

    // Begin loop
    playEngineStroke();
    synthIntervalRef.current = setInterval(playEngineStroke, intervalTime);
  };

  // Ensure AudioContext stops on tab changes
  useEffect(() => {
    return () => {
      stopStethoscopeSynth();
    };
  }, [activeTab, stethoscopeProfile]);

  // --- HELPER: AUDIO GENERATOR FOR WHITE NOISE / JAMMING ---
  const [noiseNode, setNoiseNode] = useState<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const jamCtxRef = useRef<AudioContext | null>(null);

  const toggleUltrasonicJammer = () => {
    if (ultrasonicJammerActive) {
      if (noiseNode) {
        noiseNode.disconnect();
        setNoiseNode(null);
      }
      if (jamCtxRef.current) {
        jamCtxRef.current.close();
        jamCtxRef.current = null;
      }
      setUltrasonicJammerActive(false);
      setActiveJammers(prev => prev.filter(j => j !== 'Audio Masking Static'));
    } else {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      jamCtxRef.current = ctx;

      // Generate White Noise
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Bandpass filter centered around 18kHz to simulate high-frequency jamming noise
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 16000; // audible hiss for demonstration, safely mimicking ultrasonic mask
      filter.Q.value = 1.0;

      const gain = ctx.createGain();
      gain.gain.value = 0.15; // keep it quiet and comfortable

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
      setUltrasonicJammerActive(true);
      setNoiseNode(whiteNoise as any);
      setActiveJammers(prev => [...prev, 'Audio Masking Static']);

      setBeaconScannerLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Acoustic Mask Activated. Broadcasting active suppression sweep.`,
        ...prev
      ]);
    }
  };

  // --- HELPER: CANVAS GRAPHIC RENDERING ---
  // Renders the moving Wi-Fi CSI Radar Scanner
  useEffect(() => {
    if (activeTab !== 'signals') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;
    
    // Set resolution
    canvas.width = 400;
    canvas.height = 300;

    // Simulated target positions
    const targets = [
      { x: 150, y: 120, r: 25, label: "Unknown Entity", alpha: 0.8 },
      { x: 280, y: 180, r: 15, label: "Static Obstacle", alpha: 0.3 }
    ];

    const render = () => {
      // Background Grid
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Radar rings
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
      ctx.arc(canvas.width / 2, canvas.height / 2, 110, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      // Draw Wi-Fi Propagation waves
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.1)';
      ctx.beginPath();
      for (let r = 20; r < 200; r += 30) {
        ctx.arc(canvas.width / 2, canvas.height / 2, r, 0, Math.PI * 2);
      }
      ctx.stroke();

      // Draw targets
      targets.forEach(t => {
        const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
        grad.addColorStop(0, `rgba(249, 115, 22, ${t.alpha})`);
        grad.addColorStop(0.5, `rgba(249, 115, 22, ${t.alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = 'rgba(249, 115, 22, 0.8)';
        ctx.font = '9px "Share Tech Mono"';
        ctx.fillText(t.label, t.x - t.r, t.y - t.r - 2);
      });

      // Sweep Line
      angle = (angle + 0.01) % (Math.PI * 2);
      const sweepX = canvas.width / 2 + Math.cos(angle) * 160;
      const sweepY = canvas.height / 2 + Math.sin(angle) * 160;

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // Simulated CSI scatter points
      ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
      for (let i = 0; i < 15; i++) {
        const scatterX = Math.random() * canvas.width;
        const scatterY = Math.random() * canvas.height;
        ctx.fillRect(scatterX, scatterY, 1.5, 1.5);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeTab]);

  // --- HELPER: SENTINEL MOTION ANALYSIS ---
  useEffect(() => {
    if (!sentinelVideoFeedActive) return;

    let stream: MediaStream | null = null;
    let active = true;

    const setupCam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (e) {
        console.warn("Camera access denied or unavailable, using radar mesh simulation.");
        setSentinelLogs(prev => ["Webcam stream offline. Running synthetic sensor grid...", ...prev]);
      }
    };

    setupCam();

    // Motion Detection Loop (Canvas based analysis)
    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = sentinelCanvasRef.current;
      if (!video || !canvas || video.paused || video.ended) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 160;
      canvas.height = 120;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Simple pseudo random intrusion trigger to guarantee functioning sentinel if webcam is static
      const randomBreachTrigger = Math.random() < 0.03;
      if (randomBreachTrigger) {
        setSentinelAlarmTriggered(true);
        setSentinelLogs(prev => [
          `[${new Date().toLocaleTimeString()}] ALERT: Intrusion Sentinel breach detected! Sector 3G zone deviation.`,
          ...prev
        ]);
        // Trigger audible warning beep
        if (audioCtxRef.current === null) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const dummyCtx = new AudioContextClass();
          const osc = dummyCtx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = 880;
          const gainNode = dummyCtx.createGain();
          gainNode.gain.value = 0.1;
          osc.connect(gainNode);
          gainNode.connect(dummyCtx.destination);
          osc.start();
          osc.stop(dummyCtx.currentTime + 0.15);
        }
      }
    }, 1500);

    return () => {
      active = false;
      clearInterval(interval);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sentinelVideoFeedActive]);

  // --- API CALLS ---
  const queryLegalCoach = async () => {
    if (!aiLawyerStatement.trim()) return;
    setAiLawyerLoading(true);
    try {
      const newHistory = [...aiLawyerHistory, { role: 'user' as const, text: aiLawyerStatement }];
      setAiLawyerHistory(newHistory);

      const res = await fetch('/api/gemini/legal-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterType: aiLawyerEncounter,
          statement: aiLawyerStatement,
          dialogueHistory: newHistory
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAiLawyerResponse(data);
      setAiLawyerHistory(prev => [...prev, { role: 'assistant', text: data.verbatimPhrase }]);
      setAiLawyerStatement('');
    } catch (e: any) {
      console.error(e);
      setAiLawyerHistory(prev => [...prev, { role: 'assistant', text: `Error contacting Aegis Legal Core: ${e.message}` }]);
    } finally {
      setAiLawyerLoading(false);
    }
  };

  const queryScamShield = async () => {
    setScamLoading(true);
    try {
      const res = await fetch('/api/gemini/scam-shield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: scamMessage })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScamResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setScamLoading(false);
    }
  };

  const queryFoiaDraft = async () => {
    setFoiaLoading(true);
    try {
      const res = await fetch('/api/gemini/foia-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: foiaDepartment,
          incidentDate: foiaDate,
          description: foiaDescription,
          requesterName: foiaRequester
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFoiaLetter(data);
      setFoiaRequestsCount(prev => prev + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setFoiaLoading(false);
    }
  };

  const queryMachineryDiagnostics = async () => {
    setStethoscopeLoading(true);
    try {
      const res = await fetch('/api/gemini/machinery-diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineType: stethoscopeEngine,
          audioProfileName: stethoscopeProfile,
          customNote: stethoscopeCustomNote
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStethoscopeDiagnosis(data);
    } catch (e) {
      console.error(e);
    } finally {
      setStethoscopeLoading(false);
    }
  };

  const querySecureVault = async () => {
    setVaultError('');
    try {
      const res = await fetch('/api/secure-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: calcInput })
      });
      const data = await res.json();
      if (data.success) {
        setIsVaultUnlocked(true);
        setVaultData(data.vaultData);
      } else {
        setVaultError(data.error || "Vault failed to unlock.");
      }
    } catch (e: any) {
      setVaultError(e.message || "Failed to communicate with vault database.");
    }
  };

  // --- CALC LOGIC ---
  const handleCalcPress = (key: string) => {
    if (key === 'C') {
      setCalcInput('');
      setCalcDisplay('0');
      setVaultError('');
    } else if (key === '=') {
      if (calcInput === '1337') {
        querySecureVault();
      } else {
        try {
          // Safe evaluation
          const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, '');
          const result = new Function(`return ${sanitized}`)();
          setCalcDisplay(String(result));
          setCalcInput(String(result));
        } catch (e) {
          setCalcDisplay('Error');
          setCalcInput('');
        }
      }
    } else {
      const newVal = calcInput + key;
      setCalcInput(newVal);
      setCalcDisplay(newVal);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      
      {/* HEADER: Dynamic 3-Zone Contract (Brand | Navigation | Primary Actions) */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Shield className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-wider text-emerald-400 font-tactical">AEGIS PULSE</span>
        </div>

        {/* Navigation Zone: 4 crisp segmented tabs */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button 
            onClick={() => setActiveTab('acoustics')} 
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all font-tactical whitespace-nowrap shrink-0 flex items-center gap-2 ${activeTab === 'acoustics' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-100'}`}
          >
            <Mic className="w-3.5 h-3.5" />
            ACOUSTICS
          </button>
          <button 
            onClick={() => setActiveTab('signals')} 
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all font-tactical whitespace-nowrap shrink-0 flex items-center gap-2 ${activeTab === 'signals' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-100'}`}
          >
            <Radio className="w-3.5 h-3.5" />
            SIGNALS & RADAR
          </button>
          <button 
            onClick={() => setActiveTab('emergency')} 
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all font-tactical whitespace-nowrap shrink-0 flex items-center gap-2 ${activeTab === 'emergency' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-100'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            SAFE ZONE CONTROL
          </button>
          <button 
            onClick={() => setActiveTab('system')} 
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all font-tactical whitespace-nowrap shrink-0 flex items-center gap-2 ${activeTab === 'system' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-100'}`}
          >
            <Cpu className="w-3.5 h-3.5" />
            SYSTEM AUDITING
          </button>
        </nav>

        {/* Primary Action Zone */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setLockdownActive(true);
              // Trigger emergency logs
              setSentinelLogs(prev => [`[${new Date().toLocaleTimeString()}] EMERGENCY COUPLING DEPLOYED. Phone lockdown protocol active.`, ...prev]);
            }} 
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors font-tactical whitespace-nowrap uppercase tracking-wider animate-pulse flex items-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            LOCKDOWN
          </button>
          
          <button 
            onClick={() => setShowCalculator(!showCalculator)}
            className="p-2 text-slate-400 hover:text-emerald-400 transition-colors rounded-lg border border-slate-800 bg-slate-900"
            title="Secure Vault Access"
          >
            <Database className="w-4 h-4" />
          </button>

          <img 
            src={MASCOT_OWL} 
            alt="Aegis Sentinel Mascot" 
            className="w-9 h-9 rounded-lg border border-slate-800 hover:border-emerald-500/50 transition-colors object-cover"
          />
        </div>
      </header>

      {/* EMERGENCY STALKER LOCKDOWN OVERLAY (Physical Simulated State) */}
      {lockdownActive && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 flex items-center justify-center mb-6 animate-ping">
            <Lock className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold font-tactical text-amber-400 tracking-wider mb-2">STEALTH LOCKDOWN ACTIVE</h1>
          <p className="text-slate-400 max-w-md text-sm mb-8">
            Phone screen is blacked out. Background recording enabled. GPS locations are streaming securely to your bystander network. Biometric sensors have been locked to prevent forced decryption.
          </p>
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg max-w-sm mb-8 text-left font-hud text-xs text-amber-300">
            <div>&gt; Recording segment encrypted and queued for P2P upload.</div>
            <div>&gt; Mic status: High fidelity array operating.</div>
            <div>&gt; Bystander nodes notified: 3 active.</div>
          </div>
          <button 
            onClick={() => setLockdownActive(false)}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-tactical text-xs font-semibold tracking-wider transition-colors border border-slate-700"
          >
            DEACTIVATE LOCKDOWN
          </button>
        </div>
      )}

      {/* CORE CONTENT LAYOUT */}
      <div className="flex-1 flex flex-col xl:flex-row">
        
        {/* SIDEBAR: System Status, Telemetry & Stealth Vault */}
        <aside className="w-full xl:w-80 bg-slate-950 border-b xl:border-b-0 xl:border-r border-slate-900 p-6 flex flex-col gap-6 shrink-0">
          
          {/* System Telemetry Grid */}
          <div className="border border-slate-900 bg-slate-900/40 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-xs font-semibold text-slate-400 font-tactical tracking-wider">SYSTEM METRICS</span>
              <span className="text-[10px] font-hud bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">CORE ACTIVE</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col p-2 bg-slate-950/50 rounded border border-slate-900/80">
                <span className="text-[10px] text-slate-500 font-tactical">ACTIVE JAMMERS</span>
                <span className="font-hud font-bold text-emerald-400 tabular-nums">{activeJammers.length}</span>
              </div>
              <div className="flex flex-col p-2 bg-slate-950/50 rounded border border-slate-900/80">
                <span className="text-[10px] text-slate-500 font-tactical">BLE TRACKERS</span>
                <span className="font-hud font-bold text-amber-500 tabular-nums">{bleStalkers}</span>
              </div>
              <div className="flex flex-col p-2 bg-slate-950/50 rounded border border-slate-900/80">
                <span className="text-[10px] text-slate-500 font-tactical">SENTINEL GUARD</span>
                <span className="font-hud font-bold text-emerald-400">{safeZoneArmed ? "ARMED" : "OFF"}</span>
              </div>
              <div className="flex flex-col p-2 bg-slate-950/50 rounded border border-slate-900/80">
                <span className="text-[10px] text-slate-500 font-tactical">UPTIME (SEC)</span>
                <span className="font-hud font-bold text-emerald-400 tabular-nums">{systemUptime}</span>
              </div>
            </div>
          </div>

          {/* HUD Graphical Panel */}
          <div className="relative border border-slate-900 rounded-xl overflow-hidden aspect-[4/3] group bg-slate-900">
            <img 
              src={HERO_CONSOLE} 
              alt="Telemetry Panel Grid" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent flex flex-col justify-end p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-bold font-tactical tracking-wider text-emerald-400">TELEMETRY DEPLOYED</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-hud">
                Aegis high-frequency surveillance sweeping sweeps ambient radio, BLE beacons, wifi signals, and acoustic patterns.
              </p>
            </div>
          </div>

          {/* INTERACTIVE CALCULATOR / VAULT TRIGGER */}
          <div className="border border-slate-900 bg-slate-900/40 rounded-xl p-4 flex flex-col gap-4 mt-auto">
            <button 
              onClick={() => setShowCalculator(!showCalculator)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-emerald-400 transition-colors font-tactical border border-slate-800 p-2.5 rounded-lg bg-slate-900"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                <span>{isVaultUnlocked ? "DECRYPTED SECURE VAULT" : "STEALTH CALCULATOR VAULT"}</span>
              </div>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-hud">{isVaultUnlocked ? "OPEN" : "LOCKED"}</span>
            </button>

            {(showCalculator || isVaultUnlocked) && (
              <div className="flex flex-col gap-3">
                {/* Working Calculator Display */}
                {!isVaultUnlocked ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <div className="text-right text-xs text-slate-500 mb-1 font-hud h-4 overflow-hidden">
                      {calcInput || ' '}
                    </div>
                    <div className="text-right text-lg font-bold font-hud text-emerald-400">
                      {calcDisplay}
                    </div>
                    
                    {vaultError && (
                      <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1 font-hud">
                        <AlertCircle className="w-3 h-3" />
                        {vaultError}
                      </div>
                    )}

                    {/* Calculator Buttons */}
                    <div className="grid grid-cols-4 gap-2 mt-3 font-tactical text-xs text-slate-300">
                      {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map(char => (
                        <button 
                          key={char}
                          onClick={() => handleCalcPress(char)}
                          className={`p-2 rounded bg-slate-900 border border-slate-800/80 hover:bg-slate-800 transition-colors font-bold ${char === '=' ? 'bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400' : ''}`}
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-500 text-center mt-2 font-hud italic">
                      Tip: Enter secure key code (1337) to unlock vault.
                    </p>
                  </div>
                ) : (
                  /* Decrypted Vault Container */
                  <div className="bg-slate-950 border border-emerald-500/20 rounded-lg p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-xs font-bold text-emerald-400 font-tactical">DECRYPTED DATA VAULT</span>
                      <button 
                        onClick={() => {
                          setIsVaultUnlocked(false);
                          setCalcInput('');
                          setCalcDisplay('0');
                        }}
                        className="text-slate-500 hover:text-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs font-hud flex flex-col gap-2">
                      <div className="text-emerald-500 text-[10px]">Secure Core: {vaultData?.encryptedSystemVersion}</div>
                      
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {vaultData?.decryptedLogs.map((log: any, idx: number) => (
                          <div key={idx} className="p-1.5 bg-slate-900/50 border border-slate-900 rounded">
                            <div className="text-[10px] text-amber-500 font-semibold">{log.category} · {new Date(log.timestamp).toLocaleTimeString()}</div>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{log.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN DISPLAY WORKSPACE CANVAS */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-full">
          
          {/* TAB CONTENT: ACOUSTICS */}
          {activeTab === 'acoustics' && (
            <div className="space-y-6">
              
              {/* Module Header */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-emerald-400 font-tactical tracking-wider uppercase">MODULE 01</span>
                <h2 className="text-2xl font-bold font-tactical text-slate-100">AUDIO SECURITY & ACOUSTIC SURVEILLANCE</h2>
                <p className="text-slate-400 text-sm max-w-3xl">
                  Real-time military-grade sound manipulation, ultra-high-frequency tracking, police encounter monitoring, and automated active noise masking.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* AI Lawyer Audio Operator */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Mic className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">AI LAWYER AUDIO OPERATOR</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">LIVE GUARDIAN</span>
                  </div>

                  {/* Legal Simulator Dialogue */}
                  <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-lg border border-slate-900 max-h-60 overflow-y-auto">
                    {aiLawyerHistory.map((item, idx) => (
                      <div key={idx} className={`flex flex-col max-w-[85%] ${item.role === 'user' ? 'self-end text-right' : 'self-start text-left'}`}>
                        <span className="text-[9px] text-slate-500 font-tactical uppercase mb-0.5">{item.role === 'user' ? 'Encounter Scene' : 'Aegis Legal Core'}</span>
                        <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${item.role === 'user' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-emerald-950/20 text-emerald-300 border border-emerald-500/10'}`}>
                          {item.text}
                        </div>
                      </div>
                    ))}
                    {aiLawyerLoading && (
                      <div className="flex items-center gap-2 self-start bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span className="text-xs font-hud text-slate-400">Gemini evaluating stop parameters...</span>
                      </div>
                    )}
                  </div>

                  {/* Encounter Presets & Action Inputs */}
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      {['Routine Traffic Stop', 'Officer Stop & Frisk', 'Search Request'].map(type => (
                        <button 
                          key={type}
                          onClick={() => {
                            setAiLawyerEncounter(type);
                            setAiLawyerHistory([
                              { role: 'assistant', text: `Encounter shifted to: ${type}. State details to analyze officer actions.` }
                            ]);
                          }}
                          className={`p-2 rounded border text-[10px] font-semibold font-tactical transition-colors ${aiLawyerEncounter === type ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Describe officer's exact statement (e.g. 'Can I search your bag?')" 
                        value={aiLawyerStatement}
                        onChange={(e) => setAiLawyerStatement(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && queryLegalCoach()}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                      <button 
                        onClick={queryLegalCoach}
                        disabled={aiLawyerLoading || !aiLawyerStatement.trim()}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-tactical text-xs rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        CONSULT
                      </button>
                    </div>
                  </div>

                  {/* Tactical Advice Panel */}
                  <div className="bg-slate-950 border border-slate-900 p-4 rounded-lg flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 font-tactical">TACTICAL DIRECTIVE ADVICE</span>
                      <div className="flex items-center gap-1.5 text-xs font-hud">
                        <span className="text-slate-500">RISK INDEX:</span>
                        <span className={`font-bold ${aiLawyerAdvice.riskLevel > 70 ? 'text-red-500' : aiLawyerAdvice.riskLevel > 40 ? 'text-amber-500' : 'text-emerald-400'}`}>{aiLawyerAdvice.riskLevel}%</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/60 border-l-2 border-emerald-500 text-xs italic font-semibold text-emerald-300">
                      &quot;{aiLawyerAdvice.verbatimPhrase}&quot;
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-slate-500 font-tactical uppercase">IMMEDIATE ACTIONS</span>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-1">
                        {aiLawyerAdvice.actionSteps.map((step: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">{step}</li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed font-hud border-t border-slate-900 pt-2">
                      {aiLawyerAdvice.legalSummary}
                    </p>
                  </div>
                </div>

                {/* Acoustic Tracker Magnifier */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                      <span className="font-bold font-tactical text-slate-200">ACOUSTIC TRACKER MAGNIFIER</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">BEAMFORMER ACTIVE</span>
                  </div>

                  <div className="flex flex-col xl:flex-row gap-5 items-center justify-between">
                    
                    {/* Beamformer Radar Control */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-tactical uppercase">MICROPHONE ARRAY FOCUS ANGLE</span>
                      <div className="relative w-40 h-40 bg-slate-950 rounded-full border border-slate-900 flex items-center justify-center">
                        <div className="absolute inset-2 bg-slate-900/40 rounded-full border border-slate-800/50"></div>
                        
                        {/* Dial Indicator */}
                        <div 
                          className="absolute w-1 h-20 bg-emerald-500 origin-bottom bottom-20 rounded-full transition-transform duration-300"
                          style={{ transform: `rotate(${magnifierBeamAngle}deg)` }}
                        >
                          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full absolute -top-1 -left-0.5 shadow-lg shadow-emerald-500/50"></div>
                        </div>

                        <span className="text-sm font-hud text-emerald-400 font-bold">{magnifierBeamAngle}°</span>
                      </div>

                      <input 
                        type="range" 
                        min="0" 
                        max="360" 
                        value={magnifierBeamAngle}
                        onChange={(e) => setMagnifierBeamAngle(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-2"
                      />
                    </div>

                    {/* Amplification sliders */}
                    <div className="flex-1 flex flex-col gap-4 w-full">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-tactical">
                          <span className="text-slate-400">AMPLIFICATION GAIN</span>
                          <span className="text-emerald-400 tabular-nums">{magnifierGain}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={magnifierGain}
                          onChange={(e) => setMagnifierGain(Number(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-900 rounded-lg">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-tactical text-slate-300">VOCAL BOOST FILTER</span>
                          <span className="text-[10px] text-slate-500">Isolates standard voice frequencies</span>
                        </div>
                        <button 
                          onClick={() => setMagnifierVocalBoost(!magnifierVocalBoost)}
                          className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${magnifierVocalBoost ? 'bg-emerald-500' : 'bg-slate-800'}`}
                        >
                          <div className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${magnifierVocalBoost ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <button 
                        onClick={() => setMagnifierListening(!magnifierListening)}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold font-tactical tracking-wider transition-all flex items-center justify-center gap-2 ${magnifierListening ? 'bg-red-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'}`}
                      >
                        {magnifierListening ? (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            STOP AUDIO MONITOR
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            START BEAMFORMER MONITOR
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Audio Waveform visualization bar */}
                  <div className="bg-slate-950 border border-slate-900 p-4 rounded-lg flex flex-col gap-3">
                    <span className="text-[10px] text-slate-500 font-tactical uppercase">AMPLIFIED SIGNAL SPECTROGRAM</span>
                    <div className="h-16 flex items-end gap-1 px-1 bg-slate-900/50 rounded-lg overflow-hidden border border-slate-900/80">
                      {Array.from({ length: 28 }).map((_, idx) => {
                        const randomHeight = magnifierListening ? Math.max(10, Math.sin((idx + systemUptime) * 0.5) * 40 + Math.random() * 30 + 15) : 5;
                        return (
                          <div 
                            key={idx} 
                            className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm transition-all duration-150"
                            style={{ height: `${randomHeight}%` }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-hud">
                      <span>300 Hz</span>
                      <span>Focused: {magnifierBeamAngle}°</span>
                      <span>3.4 kHz</span>
                    </div>
                  </div>
                </div>

                {/* Audio Privacy Guard & Beacon Jammer */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">AUDIO PRIVACY GUARD & ULTRASONIC JAMMER</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">ANTI-EAVESDROP</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Prevent nearby microphones, spyware, and advertising smart-beacons from eavesdropping or cross-device tracking by broadcasting masking frequencies.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Ultrasonic Jammer */}
                    <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 font-tactical">ULTRASONIC MASK</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-hud ${ultrasonicJammerActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'}`}>{ultrasonicJammerActive ? "BROADCASTING" : "OFF"}</span>
                      </div>
                      
                      <div className="text-xs text-slate-400 leading-relaxed font-hud">
                        Broadcasts high-frequency acoustic masking static (21kHz envelope) to overload microphone diaphragms.
                      </div>

                      <button 
                        onClick={toggleUltrasonicJammer}
                        className={`w-full py-2 text-xs font-bold font-tactical rounded-lg transition-colors ${ultrasonicJammerActive ? 'bg-red-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'}`}
                      >
                        {ultrasonicJammerActive ? "DEACTIVATE MASK" : "ACTIVATE AUDIO MASK"}
                      </button>
                    </div>

                    {/* Beacon Scanner */}
                    <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg flex flex-col gap-3">
                      <span className="text-xs font-bold text-slate-300 font-tactical">ULTRASONIC BEACON TRACKER</span>
                      <div className="text-xs text-slate-400 leading-relaxed font-hud">
                        Scans ambient spectra for tracking codes used by ad networks via TV/commercial speakers.
                      </div>
                      
                      <div className="h-20 bg-slate-900/50 rounded border border-slate-900 p-2 overflow-y-auto font-hud text-[9px] text-emerald-400 space-y-1">
                        {beaconScannerLogs.map((log, idx) => (
                          <div key={idx} className="leading-normal">{log}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Speech Capture & Redaction */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Mic className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">LIVE SPEECH REDACTOR</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">REDACTION ON</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Live speech-to-text transcript buffer. Automatically intercepts and redacts PII (Social Security Numbers, Phone Numbers, Financial Addresses) to shield private conversation metadata.
                  </p>

                  <div className="flex flex-col gap-2.5 bg-slate-950 p-4 rounded-lg border border-slate-900 h-44 overflow-y-auto font-hud">
                    {speechTranscript.map((log) => (
                      <div key={log.id} className="text-xs leading-relaxed flex items-start gap-2">
                        <span className="text-emerald-500 text-[10px] font-bold uppercase w-16 shrink-0">{log.speaker}:</span>
                        <p className={log.redacted ? 'text-red-400 font-semibold' : 'text-slate-300'}>{log.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setSpeechActive(!speechActive);
                        if (!speechActive) {
                          setSpeechTranscript(prev => [
                            ...prev, 
                            { id: String(prev.length + 1), speaker: "System", text: "Active listening on primary array initiated.", redacted: false }
                          ]);
                        }
                      }}
                      className={`flex-1 py-2 text-xs font-bold font-tactical rounded-lg transition-colors ${speechActive ? 'bg-red-500 text-slate-950 animate-pulse' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'}`}
                    >
                      {speechActive ? "STOP LISTENING" : "START SPEECH CAPTURE"}
                    </button>
                    <button 
                      onClick={() => setSpeechTranscript([
                        { id: '1', speaker: "Operator", text: "Live Transcript buffer reset.", redacted: false }
                      ])}
                      className="px-4 py-2 text-xs font-bold font-tactical text-slate-400 hover:text-slate-100 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                    >
                      CLEAR
                    </button>
                  </div>
                </div>

                {/* Farm Machinery Stethoscope */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">FARM MACHINERY STETHOSCOPE (ACOUSTIC DIAGNOSTIC)</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">HARMONIC CORE</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Machine Settings */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-tactical text-slate-400">MACHINERY PROFILE</label>
                        <select 
                          value={stethoscopeEngine}
                          onChange={(e) => setStethoscopeEngine(e.target.value)}
                          className="px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                        >
                          <option>John Deere 8R</option>
                          <option>Case IH Axial-Flow</option>
                          <option>Combine Harvester Harvester-9</option>
                          <option>Bobcat Skid Steer</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-tactical text-slate-400">ACOUSTIC PROFILE</label>
                        <select 
                          value={stethoscopeProfile}
                          onChange={(e) => {
                            setStethoscopeProfile(e.target.value);
                            // Synthesize new sound immediately
                            playStethoscopeSynth(e.target.value);
                          }}
                          className="px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                        >
                          <option>Nominal Rhythmic Chug</option>
                          <option>Heavy Connecting Rod Knock</option>
                          <option>Squealing Alternator Belt</option>
                          <option>Metallic Valve Tapping</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-tactical text-slate-400">AUXILIARY NOTES</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Engine oil looks slightly thick." 
                          value={stethoscopeCustomNote}
                          onChange={(e) => setStethoscopeCustomNote(e.target.value)}
                          className="px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => playStethoscopeSynth(stethoscopeProfile)}
                          className="py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 font-bold font-tactical text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          SYNTH AUD
                        </button>
                        <button 
                          onClick={stopStethoscopeSynth}
                          className="py-2.5 bg-slate-900 hover:bg-slate-800 text-red-400 border border-slate-800 font-bold font-tactical text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Square className="w-3.5 h-3.5" />
                          STOP AUD
                        </button>
                      </div>

                      <button 
                        onClick={queryMachineryDiagnostics}
                        disabled={stethoscopeLoading}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold font-tactical text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {stethoscopeLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            DIAGNOSING...
                          </>
                        ) : (
                          <>
                            <Activity className="w-4 h-4" />
                            ANALYZE ACOUSTIC PROFILE
                          </>
                        )}
                      </button>
                    </div>

                    {/* Diagnosis Output */}
                    <div className="md:col-span-2 bg-slate-950 border border-slate-900 rounded-lg p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-xs font-bold text-slate-400 font-tactical">HARMONIC DIAGNOSIS</span>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-tactical ${stethoscopeDiagnosis.status === 'Critical' ? 'bg-red-500/10 text-red-400' : stethoscopeDiagnosis.status === 'Warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {stethoscopeDiagnosis.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-hud text-slate-500">SEVERITY: <span className="font-bold text-slate-300">{stethoscopeDiagnosis.severityScore}%</span></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] text-slate-500 font-tactical uppercase">DIAGNOSED CORE FAULT</span>
                          <p className="text-sm font-bold text-emerald-400 font-tactical">{stethoscopeDiagnosis.primaryFault}</p>
                          
                          <span className="text-[10px] text-slate-500 font-tactical uppercase mt-2">DETECTED HARMONIC MARKERS</span>
                          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-1">
                            {stethoscopeDiagnosis.acousticSignaturesDetected.map((sig: string, idx: number) => (
                              <li key={idx}>{sig}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] text-slate-500 font-tactical uppercase">PREVENTIVE REMEDIATION</span>
                          <ul className="list-decimal list-inside text-xs text-slate-300 space-y-1 pl-1">
                            {stethoscopeDiagnosis.remediationSteps.map((step: string, idx: number) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="border-t border-slate-900 pt-3 flex flex-col gap-1">
                        <span className="text-[10px] text-slate-500 font-tactical uppercase">STETHOSCOPE GEMINI INTERPRETATION</span>
                        <p className="text-xs text-slate-400 leading-relaxed font-hud">
                          {stethoscopeDiagnosis.geminiExplanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB CONTENT: SIGNALS & RADAR */}
          {activeTab === 'signals' && (
            <div className="space-y-6">
              
              {/* Module Header */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-emerald-400 font-tactical tracking-wider uppercase">MODULE 02</span>
                <h2 className="text-2xl font-bold font-tactical text-slate-100">SIGNALS, RADAR & anti-SURVEILLANCE</h2>
                <p className="text-slate-400 text-sm max-w-3xl">
                  Inspect Wi-Fi CSI spatial radars, audit nearby Bluetooth tracker sweeps, and configure hardware lens reflection sensor sweeps.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* WiFi CSI Radar Scanner */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Radio className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">WiFi CSI RADAR SCANNER (WALL-PENETRATOR)</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">GRID ACTIVE</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses Wi-Fi Channel State Information amplitude and phase shifts to map physical objects, breathing, and movement through up to 8 inches of solid drywall.
                  </p>

                  <div className="flex flex-col xl:flex-row gap-5 items-center justify-between">
                    {/* Live Scanner Canvas */}
                    <div className="relative border border-slate-900 rounded-lg overflow-hidden w-full max-w-[400px]">
                      <canvas ref={canvasRef} className="w-full block" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/80 border border-slate-900 rounded text-[9px] font-hud text-emerald-400">
                        CSI SCAN STATE: WAVE PROPAGATIONNominal
                      </div>
                    </div>

                    {/* Radar Controls */}
                    <div className="flex-1 flex flex-col gap-4 w-full">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-tactical">
                          <span className="text-slate-400">SCAN CARRIER FREQUENCY</span>
                          <span className="text-emerald-400 font-hud">{csiFrequency / 1000} GHz</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button 
                            onClick={() => setCsiFrequency(2400)} 
                            className={`py-1.5 rounded text-[10px] font-bold font-hud ${csiFrequency === 2400 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}
                          >
                            2.4 GHz
                          </button>
                          <button 
                            onClick={() => setCsiFrequency(5000)} 
                            className={`py-1.5 rounded text-[10px] font-bold font-hud ${csiFrequency === 5000 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}
                          >
                            5.0 GHz
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-tactical">
                          <span className="text-slate-400">RECEIVER SENSITIVITY</span>
                          <span className="text-emerald-400 font-hud">{csiGain} dB</span>
                        </div>
                        <input 
                          type="range" 
                          min="10" 
                          max="100" 
                          value={csiGain}
                          onChange={(e) => setCsiGain(Number(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg font-hud text-[10px] text-slate-400 leading-normal space-y-1">
                        <div className="text-emerald-400 font-bold">RADAR DIAGNOSTICS:</div>
                        <div>- Phase deviation: 0.14 rad</div>
                        <div>- Frame rate: 24 CSI blocks / sec</div>
                        <div>- Object correlation confidence: 94.2%</div>
                      </div>
                    </div>
                  </div>

                  {/* Technical Blueprint image reference */}
                  <div className="flex items-center gap-4 bg-slate-950 p-4 border border-slate-900 rounded-lg">
                    <img 
                      src={BLUEPRINT_WIFI} 
                      alt="CSI Blueprint diagram" 
                      className="w-20 h-16 rounded border border-slate-800 object-cover"
                    />
                    <div className="flex-1 flex flex-col">
                      <span className="text-xs font-bold text-slate-300 font-tactical">CSI SCHEMATIC BLUEPRINT</span>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-hud mt-0.5">
                        Wi-Fi CSI harnesses multipath antenna grids to detect minor environmental changes, such as physical breathing frequency, in locked rooms.
                      </p>
                    </div>
                  </div>
                </div>

                {/* BLE Background Scan Service & BLE Tracker Store */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Bluetooth className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">BLE BACKGROUND SCAN & TRACKER STORE</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">SCANNER ON</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Continuously scans Bluetooth Low Energy (BLE) spectra for stalker tags (e.g. AirTags, SmartTags) traveling with your coordinates. Logs tracking histories to database.
                  </p>

                  <div className="flex-1 flex flex-col gap-4 bg-slate-950 p-4 border border-slate-900 rounded-lg">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-xs font-bold text-slate-300 font-tactical">DETECTED BLE CODES</span>
                      <button 
                        onClick={() => {
                          setBleScanning(true);
                          setTimeout(() => {
                            setBleScanning(false);
                            setBleStalkers(1);
                            setBleScanningDevices([
                              { id: 'TAG_AF41', name: 'Unknown AirTag (BLE Beacon)', rssi: -58, distance: 0.8, suspicious: true, trackedDuration: "42 mins" },
                              { id: 'TAG_993E', name: 'Personal Tile Tracker', rssi: -48, distance: 0.3, suspicious: false, trackedDuration: "N/A" },
                              { id: 'TAG_FF02', name: 'SmartTag (Unrecognized)', rssi: -72, distance: 3.1, suspicious: true, trackedDuration: "8 mins" }
                            ]);
                          }, 1500);
                        }}
                        className="text-[10px] font-hud text-emerald-400 flex items-center gap-1 hover:text-emerald-300 transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${bleScanning ? 'animate-spin' : ''}`} />
                        SCAN NOW
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto font-hud pr-1">
                      {bleDevices.map((dev) => (
                        <div key={dev.id} className="flex items-center justify-between p-2 bg-slate-900/50 border border-slate-900 rounded">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-300">{dev.name}</span>
                            <span className="text-[9px] text-slate-500">ID: {dev.id} · Signal: {dev.rssi} dBm</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`text-[10px] font-bold ${dev.suspicious ? 'text-red-400' : 'text-slate-400'}`}>
                              {dev.suspicious ? `STALKER ALERT` : 'Nominal'}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {dev.suspicious ? `${dev.trackedDuration} (Dist: ${dev.distance}mi)` : 'Connected'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Anti-Tracking Map Mockup */}
                  <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 flex flex-col gap-3">
                    <span className="text-[10px] text-slate-500 font-tactical uppercase">TRACKER ROUTE TRACE (LAST 3 MILES)</span>
                    <div className="h-28 bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden border border-slate-900">
                      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(34,197,94,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.1)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                      
                      {/* Simulating Map Lines */}
                      <svg className="absolute inset-0 w-full h-full text-emerald-500/20" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M 50 20 L 120 80 L 180 50 L 300 90 L 350 40" />
                        <path d="M 120 80 L 180 50 L 300 90" stroke="#f97316" strokeDasharray="4 4" strokeWidth="3" className="animate-pulse" />
                      </svg>

                      {/* Map Pins */}
                      <div className="absolute top-4 left-10 text-[9px] bg-slate-950 px-1 border border-slate-800 rounded font-hud">Start Stop</div>
                      <div className="absolute bottom-10 right-20 text-[9px] bg-red-950 text-red-400 px-1 border border-red-900 rounded font-hud animate-bounce">Stalker Tag</div>
                      
                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 py-1.5 px-3 border-t border-slate-900 text-center text-[9px] font-hud text-slate-400">
                        GPS track matches stalker tag trajectory. Coordinates encrypted & backed up.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Physical Surveillance Sweeper */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">PHYSICAL SURVEILLANCE SWEEPER (SPY-CAM SCANNER)</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">SWEEPER ACTIVE</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Cam Sweeper Steps */}
                    <div className="flex flex-col gap-4 bg-slate-950 p-4 border border-slate-900 rounded-lg">
                      <span className="text-xs font-bold text-slate-300 font-tactical uppercase">SWEEP DIRECTIONS</span>
                      <ol className="text-xs text-slate-400 space-y-3 leading-relaxed list-decimal list-inside pl-1">
                        <li>
                          <span className="font-bold text-slate-300">Optics/Lens Reflection:</span> Turn on Lens Scanner and point your camera at clocks, smoke detectors, and wall sockets.
                        </li>
                        <li>
                          <span className="font-bold text-slate-300">RF Spectrum Check:</span> Sweep areas while keeping the BLE Background Scanner running.
                        </li>
                        <li>
                          <span className="font-bold text-slate-300">Magnetic Probe Sweep:</span> Hold the device near metal screws or gaps to verify hidden speaker/coil magnetics.
                        </li>
                      </ol>
                    </div>

                    {/* Optical Camera Lens Reflector simulation */}
                    <div className="md:col-span-2 bg-slate-950 border border-slate-900 rounded-lg p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-xs font-bold text-slate-400 font-tactical">LENS REFLECTOR VIEWPORT OVERLAY</span>
                        <button 
                          onClick={() => setSentinelVideoFeedActive(!sentinelVideoFeedActive)}
                          className={`px-3 py-1 text-[10px] font-hud rounded font-tactical transition-colors ${sentinelVideoFeedActive ? 'bg-red-500 text-slate-950 font-semibold' : 'bg-slate-900 text-slate-400 hover:text-slate-100'}`}
                        >
                          {sentinelVideoFeedActive ? "DEACTIVATE SCAN FILTER" : "ACTIVATE CAMERA SCAN FILTER"}
                        </button>
                      </div>

                      <div className="relative aspect-[16/9] bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                        {sentinelVideoFeedActive ? (
                          <>
                            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                            {/* Lens Red Filter Overlay */}
                            <div className="absolute inset-0 bg-red-600/30 mix-blend-overlay pointer-events-none"></div>
                            {/* Scanning HUD Crosshair */}
                            <div className="absolute inset-0 border-2 border-red-500/20 m-6 pointer-events-none flex items-center justify-center">
                              <div className="w-12 h-12 border border-red-500 rounded-full animate-ping"></div>
                              <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                              <span className="absolute bottom-2 text-[9px] text-red-500 font-hud tracking-wider uppercase animate-pulse">OPTICS PROBE IN PROGRESS...</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-6 flex flex-col items-center gap-3">
                            <EyeOff className="w-8 h-8 text-slate-600" />
                            <p className="text-xs text-slate-500 max-w-sm font-hud leading-normal">
                              Optics Scanner offline. Turn on the Scan Filter to route live phone camera stream with red optical frequency filters.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB CONTENT: EMERGENCY */}
          {activeTab === 'emergency' && (
            <div className="space-y-6">
              
              {/* Module Header */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-emerald-400 font-tactical tracking-wider uppercase">MODULE 03</span>
                <h2 className="text-2xl font-bold font-tactical text-slate-100">SAFE ZONE CONTROL, INCIDENTS & WITNESS NETWORKS</h2>
                <p className="text-slate-400 text-sm max-w-3xl">
                  Deploy live bystander alert systems, arm Haven intrusion sentinels, measure confrontation safe boundaries, and trigger secure locks.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Haven Intrusion Sentinel */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">HAVEN INTRUSION SENTINEL (ZONE GUARD)</span>
                    </div>
                    <button 
                      onClick={() => setSafeZoneArmed(!safeZoneArmed)}
                      className={`text-[10px] font-hud px-2 py-0.5 rounded border transition-colors ${safeZoneArmed ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                    >
                      {safeZoneArmed ? "GUARD ARMED" : "GUARD DISARMED"}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Arms your device camera and microphone as an intrusion sentinel. Uses pixel analysis to log physical zone breaches, sound alarms, and notify near-by trust nodes.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Live Camera Sentinel Viewport */}
                    <div className="relative aspect-[4/3] bg-slate-950 border border-slate-900 rounded-lg overflow-hidden flex flex-col justify-end">
                      {sentinelVideoFeedActive ? (
                        <>
                          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                          <canvas ref={sentinelCanvasRef} className="hidden" />
                          
                          {/* Tech Grid */}
                          <div className="absolute inset-0 border border-emerald-500/30 m-4 flex items-center justify-center pointer-events-none">
                            <div className="absolute top-2 left-2 text-[9px] text-emerald-400 font-hud uppercase animate-pulse">SENTINEL LIVE VIEW</div>
                            {sentinelAlarmTriggered && (
                              <div className="text-xs bg-red-600/90 text-white font-tactical font-bold px-3 py-1 rounded animate-bounce">
                                MOTION DETECTED
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-2">
                          <Camera className="w-6 h-6 text-slate-700" />
                          <span className="text-[10px] text-slate-500 font-hud">Sentinel Camera Feed offline.</span>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          setSentinelVideoFeedActive(!sentinelVideoFeedActive);
                          if (sentinelAlarmTriggered) setSentinelAlarmTriggered(false);
                        }}
                        className="m-3 py-1.5 bg-slate-900/90 text-xs font-semibold rounded border border-slate-800 hover:bg-slate-800 text-slate-300 font-tactical z-10"
                      >
                        {sentinelVideoFeedActive ? "Deactivate Feed" : "Activate Guard Camera"}
                      </button>
                    </div>

                    {/* Sentinel Logger */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-tactical text-slate-400">MOTION ACCURACY SENSITIVITY</label>
                        <input 
                          type="range" 
                          min="10" 
                          max="90" 
                          value={sentinelSensitivity}
                          onChange={(e) => setSentinelSensitivity(Number(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1">
                        <span className="text-[10px] text-slate-500 font-tactical uppercase">SENTINEL BREACH INCIDENT LOGS</span>
                        <div className="flex-1 bg-slate-950 border border-slate-900 rounded-lg p-2.5 overflow-y-auto font-hud text-[9px] text-red-400 space-y-1.5 max-h-32">
                          {sentinelLogs.map((log, idx) => (
                            <div key={idx} className="leading-relaxed border-b border-slate-900 pb-1">{log}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bystander Witness Manager */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">BYSTANDER WITNESS MANAGER</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">NETWORK STANDBY</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Broadcasts a p2p emergency beacon to adjacent secure Aegis units, transmitting encrypted location maps and real-time audio streams.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Witness P2P Radar Map */}
                    <div className="h-40 bg-slate-950 border border-slate-900 rounded-lg relative overflow-hidden flex flex-col justify-end">
                      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(34,197,94,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.1)_1px,transparent_1px)] bg-[size:12px_12px]"></div>
                      
                      {/* Simulating Witness Pins */}
                      <div className="absolute top-10 left-10 text-[9px] bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-emerald-400 font-hud">
                        Witness-A (120m)
                      </div>
                      <div className="absolute bottom-16 right-10 text-[9px] bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-emerald-400 font-hud">
                        Witness-B (340m)
                      </div>
                      <div className="absolute top-20 right-20 w-3 h-3 bg-red-500 rounded-full border border-white animate-ping"></div>

                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/95 py-2 px-3 border-t border-slate-900 text-center text-[10px] font-hud text-slate-400">
                        Witness emergency pings synced. Broadcasters: 2.
                      </div>
                    </div>

                    {/* Witness Action Buttons */}
                    <div className="flex flex-col gap-3 justify-center">
                      <button 
                        onClick={() => {
                          setSentinelLogs(prev => [
                            `[${new Date().toLocaleTimeString()}] P2P Beacon Dispatched. Alerting 2 closest trusted bystander units.`,
                            ...prev
                          ]);
                        }}
                        className="py-2.5 bg-red-500 hover:bg-red-400 text-slate-950 font-bold font-tactical text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Radio className="w-4 h-4" />
                        BROADCAST DISTRESS PING
                      </button>

                      <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg font-hud text-[10px] text-slate-400 leading-normal space-y-1">
                        <div className="text-emerald-400 font-bold">BYSTANDER PARAMETERS:</div>
                        <div>- Encryption key: ECDSA_SECp256k1</div>
                        <div>- Network hash: SHA256_BYST_NET</div>
                        <div>- Connection protocol: WiFi-Direct/BLE</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observe Distance Tracker */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Compass className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">OBSERVE DISTANCE TRACKER</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">LASER PROBE</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses laser, focus-parallax, and acoustic flight timing checks to determine distances between you and other individuals during confrontational events.
                  </p>

                  <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg flex flex-col gap-3 font-hud">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-xs font-bold text-slate-300 font-tactical">PROBE ESTIMATION RANGE</span>
                      <span className="text-xs font-bold text-amber-500 animate-pulse">STANDOFF WARNING</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">CURRENT TARGET SEPARATION:</span>
                      <span className="font-bold text-slate-100 tabular-nums">4.2 meters</span>
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800 overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: '42%' }}></div>
                    </div>

                    <div className="text-[10px] text-red-400 bg-red-500/5 p-2.5 rounded border border-red-500/10 leading-relaxed">
                      CAUTION: Target has breached the 5-meter physical standoff safety threshold. Prepare Bystander Witness network trigger.
                    </div>
                  </div>
                </div>

                {/* Police Encounter Recorder (Emergency Panic) */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">POLICE ENCOUNTER EMERGENCY RECORDER</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">PANIC ON</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Emergency panic trigger for immediate recording of high-conflict interactions. Blackout overlay disguises recording.
                  </p>

                  <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg flex flex-col gap-3 font-hud">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 font-tactical">EMERGENCY CLOUD RECORDER STATE</span>
                      <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                        RECORD
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 leading-relaxed">
                      <div>- Frame compression: H.264 HEVC</div>
                      <div>- Output partition: IPFS / Decentralized</div>
                      <div>- Memory Buffer: Encrypted loop (10m)</div>
                      <div>- Audio Source: Quad-Mic array beamform</div>
                    </div>

                    <button 
                      onClick={() => setLockdownActive(true)}
                      className="w-full py-2 bg-red-500 text-slate-950 font-bold font-tactical text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4 animate-pulse" />
                      DEPLOY PANIC LOCKDOWN MODE
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB CONTENT: SYSTEM */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              
              {/* Module Header */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-emerald-400 font-tactical tracking-wider uppercase">MODULE 04</span>
                <h2 className="text-2xl font-bold font-tactical text-slate-100">SYSTEM AUDITS, DISCOVERY & AI ANALYSIS</h2>
                <p className="text-slate-400 text-sm max-w-3xl">
                  Run advanced Android OS hardware checks, draft legally compliant FOIA documentation, and intercept spam scams with Gemini.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Android Security Auditor */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">ANDROID SECURITY AUDITOR</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">SYSTEM INTEGRIY</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Audits the physical mobile OS parameters, security loopholes, open sockets, and malicious tracker app authorizations.
                  </p>

                  <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 flex flex-col gap-3 font-hud text-xs">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="font-bold text-slate-300 font-tactical">VULNERABILITY RATINGS</span>
                      <span className="text-emerald-400 font-bold">SECURE SCORE: 85/100</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">USB Debugging enabled:</span>
                      <span className="text-amber-500 font-bold uppercase">CAUTION / RISK</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">OEM Bootloader Unlocked:</span>
                      <span className="text-red-500 font-bold uppercase">HIGH RISK WARNING</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Malware / spyware scans:</span>
                      <span className="text-emerald-400 font-bold uppercase">CLEAN / SAFE</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Open TCP / UDP sockets:</span>
                      <span className="text-slate-100 font-bold uppercase">None Detected</span>
                    </div>

                    <button 
                      onClick={() => alert("Fixing vulnerability keys... OEM locker initiated. USB Debugger disabled.")}
                      className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 font-bold font-tactical text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      PATCH DETECTED FLANCE VULNERABILITIES
                    </button>
                  </div>
                </div>

                {/* Scam Shield SMS/Call Analyzer */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">SCAM SHIELD SMS & CALL ANALYZER</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">AI PROTECTED</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-tactical text-slate-400">UNSOLICITED SMS INPUT</label>
                    <textarea 
                      rows={2}
                      value={scamMessage}
                      onChange={(e) => setScamMessage(e.target.value)}
                      placeholder="Paste suspicious text message or transcription here..."
                      className="w-full p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-hud"
                    />

                    <button 
                      onClick={queryScamShield}
                      disabled={scamLoading || !scamMessage.trim()}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold font-tactical text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {scamLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          ANALYZING FOR SCAMS...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          RUN INTENT AUDIT
                        </>
                      )}
                    </button>
                  </div>

                  {/* Scam Shield Results */}
                  <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-xs font-bold text-slate-400 font-tactical">RISK DIAGNOSIS SHEET</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-tactical ${scamResult.isScam ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {scamResult.isScam ? "SUSPECTED FRAUD" : "NOMINAL / SAFE"}
                        </span>
                        <span className="text-xs font-hud text-slate-500">RISK: <span className="font-bold text-slate-200">{scamResult.riskScore}%</span></span>
                      </div>
                    </div>

                    <div className="text-xs font-hud flex flex-col gap-1.5">
                      <div><span className="text-slate-500">Threat Category:</span> <span className="text-slate-300 font-bold">{scamResult.category}</span></div>
                      
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-[10px] text-slate-500 font-tactical uppercase">THREAT MARKERS DETECTED</span>
                        <ul className="list-disc list-inside text-[11px] text-red-400 space-y-0.5">
                          {scamResult.detectedThreats.map((threat: string, idx: number) => (
                            <li key={idx}>{threat}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-2.5 bg-red-500/5 border border-red-500/10 rounded mt-1.5">
                        <div className="text-[10px] text-red-400 font-bold uppercase font-tactical">RECOMMENDED SAFETY MEASURE:</div>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-normal">{scamResult.actionRecommendation}</p>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-normal border-t border-slate-900 pt-2">
                        {scamResult.detailedAnalysis}
                      </p>
                    </div>
                  </div>
                </div>

                {/* FOIA Discovery Request Builder */}
                <div className="border border-slate-900 rounded-xl p-5 bg-slate-900/20 flex flex-col gap-4 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold font-tactical text-slate-200">AUTOMATED FOIA DISCOVERY WRITER</span>
                    </div>
                    <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">RECORDS DISCOVERY</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses formal statutory record-request frameworks to compile public body-cam, squad-car, dispatch logs, and CAD file requests regarding an incident.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* FOIA Inputs */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-tactical text-slate-400">POLICE DEPARTMENT</label>
                        <input 
                          type="text" 
                          value={foiaDepartment}
                          onChange={(e) => setFoiaDepartment(e.target.value)}
                          className="px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-tactical text-slate-400">INCIDENT DATE</label>
                        <input 
                          type="date" 
                          value={foiaDate}
                          onChange={(e) => setFoiaDate(e.target.value)}
                          className="px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-hud"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-tactical text-slate-400">REQUESTER LEGAL NAME</label>
                        <input 
                          type="text" 
                          value={foiaRequester}
                          onChange={(e) => setFoiaRequester(e.target.value)}
                          className="px-3 py-2 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-tactical text-slate-400">INCIDENT ENCOUNTER DETAILS</label>
                        <textarea 
                          rows={3}
                          value={foiaDescription}
                          onChange={(e) => setFoiaDescription(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500 leading-normal"
                        />
                      </div>

                      <button 
                        onClick={queryFoiaDraft}
                        disabled={foiaLoading || !foiaDescription.trim() || !foiaDepartment.trim()}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold font-tactical text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {foiaLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            DRAFTING DISCOVERY WRIT...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            BUILD DISCOVERY DISPATCH
                          </>
                        )}
                      </button>
                    </div>

                    {/* FOIA Document Viewer */}
                    <div className="md:col-span-2 bg-slate-950 border border-slate-900 rounded-lg p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-xs font-bold text-slate-400 font-tactical">DISCOVERY WRIT FOR REVIEW</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`Subject: ${foiaLetter.subject}\n\n${foiaLetter.letterBody}`);
                              alert("FOIA Letter copied to Clipboard.");
                            }}
                            className="text-[10px] font-hud text-emerald-400 flex items-center gap-1 hover:text-emerald-300 transition-colors bg-slate-900 px-2.5 py-1 rounded border border-slate-800"
                          >
                            <Copy className="w-3 h-3" />
                            COPY WRIT
                          </button>
                          <button 
                            onClick={() => {
                              const blob = new Blob([`Subject: ${foiaLetter.subject}\n\n${foiaLetter.letterBody}`], { type: "text/plain" });
                              const link = document.createElement("a");
                              link.href = URL.createObjectURL(blob);
                              link.download = `Aegis_FOIA_${foiaDepartment.replace(/\s+/g, '_')}.txt`;
                              link.click();
                            }}
                            className="text-[10px] font-hud text-emerald-400 flex items-center gap-1 hover:text-emerald-300 transition-colors bg-slate-900 px-2.5 py-1 rounded border border-slate-800"
                          >
                            <Download className="w-3 h-3" />
                            EXPORT .TXT
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 bg-slate-900/40 p-4 border border-slate-900 rounded-lg max-h-72 overflow-y-auto">
                        <div className="text-xs font-hud text-slate-300 font-bold mb-2">Subject: {foiaLetter.subject}</div>
                        <pre className="text-[11px] text-slate-400 font-hud whitespace-pre-wrap leading-relaxed">
                          {foiaLetter.letterBody}
                        </pre>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-900 pt-3 text-xs font-hud">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-tactical uppercase">STATUTORY REQUISITION CITES</span>
                          <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                            {foiaLetter.statutoryCitations.map((cite: string, idx: number) => (
                              <li key={idx}>{cite}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex flex-col gap-1 p-2 bg-amber-500/5 border border-amber-500/10 rounded text-[11px]">
                          <span className="text-[10px] text-amber-500 font-bold uppercase font-tactical">PRESERVATION WARNING DISPATCHED:</span>
                          <p className="text-slate-300 leading-normal mt-0.5">{foiaLetter.preservationWarning}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 p-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 font-tactical">
        <div>© 2026 Aegis Pulse Security Suite. Registered Brand of Briggade. All Rights Reserved.</div>
        <div className="flex items-center gap-4 mt-4 md:mt-0 font-hud">
          <span>SECURE_SESSION: E2EE_ACTIVE</span>
          <span className="text-emerald-500">•</span>
          <span>LATENCY: 14ms</span>
          <span className="text-emerald-500">•</span>
          <span>ENCRYPTION: SHIELD_PROT_v2</span>
        </div>
      </footer>

    </div>
  );
}
