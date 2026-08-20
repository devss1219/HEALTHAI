import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Mic, PhoneOff, Activity, FileText, User, AlertCircle, Clock, HeartPulse, Heart, Plus, Info } from 'lucide-react';

// Vapi Configuration
const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY);

export default function App() {
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'loading' | 'active'
  const [transcripts, setTranscripts] = useState([]);
  const [report, setReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const transcriptEndRef = useRef(null);
  const transcriptsRef = useRef([]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus('active');
      setIsAnalyzing(false);
    };

    const onCallEnd = async () => {
      setCallStatus('idle');
      
      const fullTranscript = transcriptsRef.current.join('\n');
      if (fullTranscript.trim() !== '') {
        setIsAnalyzing(true);
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          const res = await fetch(`${backendUrl}/api/generate-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: fullTranscript }),
          });
          const data = await res.json();
          setReport(data);
        } catch (err) {
          console.error('Report Generation Error:', err);
        } finally {
          setIsAnalyzing(false);
        }
      }
    };

    const onMessage = (message) => {
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        const newText = `${message.role}: ${message.transcript}`;
        setTranscripts((prev) => [...prev, newText]);
        transcriptsRef.current.push(newText);
      }
    };

    const onError = (e) => {
      console.error('Vapi Error:', e);
      setCallStatus('idle');
    };

    // Attach Vapi Event Listeners
    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('message', onMessage);
    vapi.on('error', onError);

    // Cleanup listeners on unmount
    return () => {
      vapi.off('call-start', onCallStart);
      vapi.off('call-end', onCallEnd);
      vapi.off('message', onMessage);
      vapi.off('error', onError);
    };
  }, []);

  const handleStartCall = async () => {
    setCallStatus('loading');
    setReport(null);
    setTranscripts([]);
    transcriptsRef.current = [];

    try {
      // Step 1: Explicit Microphone Permission Request
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Step 2: Start Vapi with your Dashboard Assistant ID
      await vapi.start(import.meta.env.VITE_VAPI_ASSISTANT_ID);
    } catch (err) {
      console.error('Failed to start call:', err);
      alert('Call Error: ' + (err.message || 'Microphone access issue'));
      setCallStatus('idle');
    }
  };

  const handleEndCall = () => {
    vapi.stop();
  };

  return (
    <div className="min-h-screen bg-green-50 text-green-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden bg-grid-pattern">
      
      {/* Background Animated Heartbeat Line */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-30">
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 1000 200" 
          preserveAspectRatio="none"
          className="text-emerald-500"
        >
          <path 
            d="M0 100 L200 100 L250 50 L300 150 L350 20 L400 180 L450 100 L1000 100" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="animate-heartbeat-line"
          />
        </svg>
      </div>

      <div className="max-w-xl w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-200/60 p-6 sm:p-8 border border-emerald-100/80 text-center relative z-10 overflow-hidden">
        
        {/* Header Section */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Activity className="text-emerald-600 w-7 h-7 animate-pulse" />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-900">
            AI Health Assistant
          </h1>
        </div>
        <p className="text-emerald-600 text-sm mb-6 font-medium">
          Voice-based intake & preliminary health screening
        </p>

        {/* Instructions Section */}
        {callStatus === 'idle' && !isAnalyzing && !report && (
          <div className="bg-emerald-50 text-emerald-800 text-sm text-left p-4 rounded-2xl mb-8 border border-emerald-100 shadow-inner">
            <h3 className="font-bold flex items-center gap-2 mb-2 text-emerald-900">
              <Info size={18} className="text-emerald-600" /> How to Start
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click <strong>Start Screening Call</strong> to begin.</li>
              <li>Allow microphone access when prompted.</li>
              <li>Speak naturally and describe your symptoms.</li>
              <li>When finished, click <strong>End Call</strong> to generate your medical report.</li>
            </ul>
          </div>
        )}

        {/* Call Controls & Status */}
        <div className="flex flex-col items-center justify-center mb-8">
          {callStatus === 'idle' && !isAnalyzing && (
            <button
              onClick={handleStartCall}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-full flex items-center gap-3 shadow-lg shadow-emerald-600/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Mic size={22} /> Start Screening Call
            </button>
          )}

          {callStatus === 'loading' && (
            <div className="flex items-center gap-3 text-emerald-700 font-semibold text-lg bg-emerald-100 px-6 py-3 rounded-full border border-emerald-200 animate-pulse">
              <Clock className="animate-spin" size={20} /> Connecting Call...
            </div>
          )}

          {callStatus === 'active' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold bg-emerald-100 px-5 py-2 rounded-full border border-emerald-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping"></span>
                Call Active - Speak Naturally
              </div>

              {/* Live Transcript Box */}
              <div className="w-full bg-emerald-50 p-4 rounded-2xl border border-emerald-100 h-48 overflow-y-auto flex flex-col gap-3 shadow-inner">
                {transcripts.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-emerald-400 font-medium italic animate-pulse">
                    Listening for conversation...
                  </div>
                ) : (
                  <>
                    {transcripts.map((t, idx) => {
                      const role = t.split(':')[0];
                      const text = t.split(':').slice(1).join(':');
                      const isUser = role === 'user';
                      return (
                        <div key={idx} className={`p-3 rounded-xl max-w-[85%] text-sm text-left ${isUser ? 'bg-emerald-600 text-white self-end rounded-br-none shadow-md' : 'bg-white text-emerald-950 self-start rounded-bl-none border border-emerald-200 shadow-sm'}`}>
                          <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 block ${isUser ? 'text-emerald-100' : 'text-emerald-600'}`}>
                            {role}
                          </span>
                          {text}
                        </div>
                      );
                    })}
                    <div ref={transcriptEndRef} />
                  </>
                )}
              </div>

              <button
                onClick={handleEndCall}
                className="bg-rose-500 hover:bg-rose-400 text-white font-bold px-8 py-4 rounded-full flex items-center gap-3 shadow-lg shadow-rose-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer mt-2"
              >
                <PhoneOff size={22} /> End Call & Extract Report
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-emerald-700 font-semibold text-base flex items-center gap-2 animate-pulse bg-emerald-100 px-6 py-3 rounded-full border border-emerald-200">
              <HeartPulse className="animate-bounce" size={20} /> Generating Structured Patient Report...
            </div>
          )}
        </div>

        {/* Structured Medical Report Display */}
        {report && (
          <div className="bg-white text-left p-6 rounded-2xl border border-emerald-100 shadow-xl shadow-emerald-100/60">
            <h2 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2 border-b border-emerald-100 pb-3">
              <FileText size={20} className="text-emerald-600" /> Patient Intake Report
            </h2>

            <div className="space-y-3 text-sm text-emerald-900">
              <div className="flex items-start gap-2">
                <User size={16} className="text-emerald-500 mt-0.5" />
                <p><span className="font-bold text-emerald-950">Patient Name:</span> {report.name || 'Not provided'}</p>
              </div>

              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-emerald-500 mt-0.5" />
                <p><span className="font-bold text-emerald-950">Primary Symptom:</span> {report.primarySymptom || 'Not provided'}</p>
              </div>

              <div className="flex items-start gap-2">
                <Clock size={16} className="text-emerald-500 mt-0.5" />
                <p><span className="font-bold text-emerald-950">Duration:</span> {report.duration || 'Not provided'}</p>
              </div>

              <p><span className="font-bold text-emerald-950 pl-6">Severity Scale:</span> {report.severity || 'N/A'} / 10</p>
              <p><span className="font-bold text-emerald-950 pl-6">Additional Symptoms:</span> {report.additionalSymptoms || 'None reported'}</p>

              <div className="mt-4 pt-3 border-t border-emerald-100 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-700 text-xs tracking-wider uppercase block mb-1">
                  Preliminary Summary
                </span>
                <p className="text-emerald-900 text-xs leading-relaxed">{report.doctorSummary || 'Call ended early.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}