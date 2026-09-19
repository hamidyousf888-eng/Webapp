import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Scan, Camera, Keyboard, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Reusable barcode/QR scanner using the native BarcodeDetector API.
 * Falls back to manual entry when the API or camera is unavailable.
 *
 * Props:
 * - open: boolean (controls dialog visibility)
 * - onDetected: (code: string) => void
 * - onClose: () => void
 */
export default function BarcodeScanner({ open, onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [supported, setSupported] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setManualCode('');
    setDetected(false);
    setScanning(false);

    let cancelled = false;

    const startCamera = async () => {
      try {
        if (!('BarcodeDetector' in window)) {
          setSupported(false);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScanning(true);

        const detector = new window.BarcodeDetector({
          formats: ['code_39', 'code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'itf'],
        });

        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || detected) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const value = codes[0].rawValue;
              if (value) {
                setDetected(true);
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                onDetected(value);
              }
            }
          } catch (e) {
            /* detection frame error — ignore */
          }
        }, 400);
      } catch (e) {
        setError(e.message || 'Camera access failed. Enter the code manually below.');
        setSupported(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    onDetected(manualCode.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" /> Scan Barcode / QR
          </DialogTitle>
        </DialogHeader>

        {supported && !error ? (
          <div className="space-y-3">
            <div className="relative aspect-square bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {!detected && scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-1 bg-emerald-400/80 rounded-full animate-pulse" />
                </div>
              )}
              {detected && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                </div>
              )}
            </div>
            <p className="text-center text-sm text-slate-500">
              {detected ? 'Code detected!' : 'Point the camera at a barcode or QR code'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error || 'Camera scanning not supported on this browser. Enter the code manually.'}</span>
            </div>
          </div>
        )}

        {/* Manual entry fallback (always available) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Keyboard className="w-4 h-4" /> Or enter manually
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter barcode..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              autoFocus={!supported}
            />
            <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
              Use
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}