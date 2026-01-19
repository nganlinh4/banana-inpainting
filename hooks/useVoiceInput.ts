
import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../services/geminiService';

interface UseVoiceInputProps {
  apiKey: string;
  onTranscriptionComplete: (text: string) => void;
  onError: (message: string) => void;
}

export const useVoiceInput = ({ apiKey, onTranscriptionComplete, onError }: UseVoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);
  const micRippleRef = useRef<HTMLDivElement>(null);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Cleanup Audio Context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, []);

  const processAudio = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for(let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;

    // Visual Aura update
    if (micRippleRef.current) {
      const scale = 1 + (average / 40);
      const opacity = Math.min(0.8, average / 60);
      micRippleRef.current.style.transform = `scale(${scale})`;
      micRippleRef.current.style.opacity = `${opacity}`;
    }

    // Threshold for "speaking"
    if (average > 20) { 
      lastSpeechTimeRef.current = Date.now();
      hasSpokenRef.current = true;
    }

    // Auto-stop logic
    if (hasSpokenRef.current && Date.now() - lastSpeechTimeRef.current > 800) {
      stopRecording();
    } else {
      animationFrameRef.current = requestAnimationFrame(processAudio);
    }
  }, [isRecording, stopRecording]);

  useEffect(() => {
    if (isRecording) {
      processAudio();
    } else {
      if (micRippleRef.current) {
        micRippleRef.current.style.transform = `scale(1)`;
        micRippleRef.current.style.opacity = `0`;
      }
    }
  }, [isRecording, processAudio]);

  const toggleRecording = async () => {
    if (!apiKey) {
      onError("MISSING_KEY");
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            const text = await transcribeAudio(base64Audio, apiKey);
            if (text) {
               onTranscriptionComplete(text);
            }
          } catch (error) {
            console.error(error);
            onError("TRANSCRIPTION_FAILED");
          } finally {
            setIsTranscribing(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      lastSpeechTimeRef.current = Date.now();
      hasSpokenRef.current = false;
      
      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      onError("MIC_ACCESS_DENIED");
    }
  };

  return {
    isRecording,
    isTranscribing,
    toggleRecording,
    micRippleRef
  };
};
