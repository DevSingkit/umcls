'use client'
// components/ui/MultimodalDock.tsx
//
// 3-button submission dock for K-5 multimodal input:
//   1. Voice Note  (Mic icon)   — native MediaRecorder
//   2. Draw Canvas (Palette icon) — react-sketch-canvas
//   3. Take Photo  (Camera icon)  — react-webcam
//
// All three modes produce File objects via the onFileCaptured callback,
// integrating seamlessly with the existing pendingFiles state pattern
// used by SubmissionUploadForm.tsx.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Palette, Camera, X, Undo2, Eraser, Trash2, Check } from 'lucide-react'
import Webcam from 'react-webcam'
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas'

// ─── Crayon color palette for the drawing canvas ────────────────────
const CRAYON_COLORS = [
    { name: 'Black', hex: '#1A241E' },
    { name: 'Red', hex: '#EA2B2B' },
    { name: 'Green', hex: '#15803D' },
    { name: 'Purple', hex: '#8854C0' },
    { name: 'Orange', hex: '#E8963C' },
    { name: 'Pink', hex: '#8F1349' },
]

interface MultimodalDockProps {
    onFileCaptured: (file: File) => void
    disabled?: boolean
}

type ActiveModal = 'voice' | 'draw' | 'photo' | null

export function MultimodalDock({ onFileCaptured, disabled = false }: MultimodalDockProps) {
    const [activeModal, setActiveModal] = useState<ActiveModal>(null)

    function closeModal() {
        setActiveModal(null)
    }

    return (
        <>
            {/* ── 3-Button Dock ─────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setActiveModal('voice')}
                    className="clay-button flex flex-col items-center justify-center gap-1.5 flex-1 py-3 bg-brand text-on-ink font-heading text-caption disabled:opacity-50"
                >
                    <Mic size={24} aria-hidden="true" />
                    <span>Voice</span>
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setActiveModal('draw')}
                    className="clay-button flex flex-col items-center justify-center gap-1.5 flex-1 py-3 bg-gamified-purple text-on-ink font-heading text-caption disabled:opacity-50 border-gamified-purple-dark"
                >
                    <Palette size={24} aria-hidden="true" />
                    <span>Draw</span>
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setActiveModal('photo')}
                    className="clay-button flex flex-col items-center justify-center gap-1.5 flex-1 py-3 bg-info text-on-ink font-heading text-caption disabled:opacity-50 border-gamified-pink-dark"
                >
                    <Camera size={24} aria-hidden="true" />
                    <span>Photo</span>
                </button>
            </div>

            {/* ── Modals ────────────────────────────────────────── */}
            {activeModal === 'voice' && (
                <VoiceModal
                    onCapture={(file) => { onFileCaptured(file); closeModal() }}
                    onClose={closeModal}
                />
            )}
            {activeModal === 'draw' && (
                <DrawModal
                    onCapture={(file) => { onFileCaptured(file); closeModal() }}
                    onClose={closeModal}
                />
            )}
            {activeModal === 'photo' && (
                <PhotoModal
                    onCapture={(file) => { onFileCaptured(file); closeModal() }}
                    onClose={closeModal}
                />
            )}
        </>
    )
}

// ─── Shared modal wrapper ───────────────────────────────────────────
function ModalOverlay({
    title,
    onClose,
    children,
}: {
    title: string
    onClose: () => void
    children: React.ReactNode
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-4">
            <div
                className="clay-card w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 sm:p-6 space-y-4 animate-drawer-up sm:animate-bounce-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="font-heading text-h3 text-ink">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex items-center justify-center min-h-touch min-w-touch rounded-pill bg-surface-sunken text-ink-soft hover:bg-hairline transition-colors"
                    >
                        <X size={22} aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

// ─── Voice Note Modal ───────────────────────────────────────────────
function VoiceModal({
    onCapture,
    onClose,
}: {
    onCapture: (file: File) => void
    onClose: () => void
}) {
    const [isRecording, setIsRecording] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const blobRef = useRef<Blob | null>(null)

    async function startRecording() {
        try {
            setError(null)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            chunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                blobRef.current = blob
                setAudioUrl(URL.createObjectURL(blob))
                // Stop all tracks so the mic indicator goes away
                stream.getTracks().forEach((t) => t.stop())
            }

            mediaRecorderRef.current = recorder
            recorder.start()
            setIsRecording(true)
        } catch {
            setError('Could not access microphone. Please allow microphone access.')
        }
    }

    function stopRecording() {
        mediaRecorderRef.current?.stop()
        setIsRecording(false)
    }

    function handleSave() {
        if (!blobRef.current) return
        const file = new File(
            [blobRef.current],
            `voice-note-${Date.now()}.webm`,
            { type: 'audio/webm' }
        )
        onCapture(file)
    }

    function handleReRecord() {
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
        blobRef.current = null
    }

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl)
            mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <ModalOverlay title="Record Voice Note" onClose={onClose}>
            {error && (
                <p className="text-caption text-error" role="alert">{error}</p>
            )}

            <div className="flex flex-col items-center gap-4 py-4">
                {!audioUrl ? (
                    <>
                        {/* Recording indicator */}
                        <div className={`flex items-center justify-center w-24 h-24 rounded-full transition-colors ${
                            isRecording ? 'bg-error-soft' : 'bg-surface-sunken'
                        }`}>
                            {isRecording ? (
                                <MicOff size={36} className="text-error animate-pulse" aria-hidden="true" />
                            ) : (
                                <Mic size={36} className="text-ink-soft" aria-hidden="true" />
                            )}
                        </div>
                        <p className="text-body-md text-ink-soft text-center">
                            {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                        </p>
                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`clay-button px-8 py-3 font-heading text-body-emphasis text-on-ink ${
                                isRecording ? 'bg-error border-error-border' : 'bg-brand'
                            }`}
                        >
                            {isRecording ? 'Stop' : 'Record'}
                        </button>
                    </>
                ) : (
                    <>
                        {/* Playback */}
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <audio src={audioUrl} controls className="w-full max-w-xs" />
                        <div className="flex items-center gap-3 w-full">
                            <button
                                type="button"
                                onClick={handleReRecord}
                                className="flex-1 h-14 rounded-2xl border-2 border-hairline text-ink font-heading text-body-emphasis hover:bg-surface-sunken transition-colors"
                            >
                                Re-record
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="clay-button flex-1 px-6 py-3 bg-brand text-on-ink font-heading text-body-emphasis"
                            >
                                Use this
                            </button>
                        </div>
                    </>
                )}
            </div>
        </ModalOverlay>
    )
}

// ─── Draw Canvas Modal ──────────────────────────────────────────────
function DrawModal({
    onCapture,
    onClose,
}: {
    onCapture: (file: File) => void
    onClose: () => void
}) {
    const canvasRef = useRef<ReactSketchCanvasRef | null>(null)
    const [strokeColor, setStrokeColor] = useState(CRAYON_COLORS[0]!.hex)
    const [isEraser, setIsEraser] = useState(false)

    const handleDone = useCallback(async () => {
        if (!canvasRef.current) return
        try {
            const dataUrl = await canvasRef.current.exportImage('png')
            const res = await fetch(dataUrl)
            const blob = await res.blob()
            const file = new File(
                [blob],
                `drawing-${Date.now()}.png`,
                { type: 'image/png' }
            )
            onCapture(file)
        } catch {
            // Silently fail — canvas might be empty
        }
    }, [onCapture])

    return (
        <ModalOverlay title="Draw Something" onClose={onClose}>
            {/* Color picker */}
            <div className="flex items-center gap-2 flex-wrap">
                {CRAYON_COLORS.map((c) => (
                    <button
                        key={c.hex}
                        type="button"
                        aria-label={c.name}
                        onClick={() => { setStrokeColor(c.hex); setIsEraser(false) }}
                        className={`w-10 h-10 rounded-full border-2 transition-transform ${
                            strokeColor === c.hex && !isEraser
                                ? 'border-ink scale-110 ring-2 ring-ink ring-offset-2'
                                : 'border-hairline'
                        }`}
                        style={{ backgroundColor: c.hex }}
                    />
                ))}
                <button
                    type="button"
                    aria-label="Eraser"
                    aria-pressed={isEraser}
                    onClick={() => setIsEraser(!isEraser)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                        isEraser
                            ? 'border-ink bg-surface-sunken ring-2 ring-ink ring-offset-2'
                            : 'border-hairline bg-surface hover:bg-surface-sunken'
                    }`}
                >
                    <Eraser size={18} aria-hidden="true" />
                </button>
            </div>

            {/* Canvas */}
            <div className="clay-well rounded-2xl overflow-hidden" style={{ touchAction: 'none' }}>
                <ReactSketchCanvas
                    ref={canvasRef}
                    width="100%"
                    height="300px"
                    strokeWidth={isEraser ? 20 : 4}
                    strokeColor={isEraser ? '#EAE6DC' : strokeColor}
                    canvasColor="#EAE6DC"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => canvasRef.current?.undo()}
                    aria-label="Undo"
                    className="flex items-center justify-center min-h-touch min-w-touch rounded-pill bg-surface-sunken text-ink-soft hover:bg-hairline transition-colors"
                >
                    <Undo2 size={20} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => canvasRef.current?.clearCanvas()}
                    aria-label="Clear canvas"
                    className="flex items-center justify-center min-h-touch min-w-touch rounded-pill bg-surface-sunken text-ink-soft hover:bg-hairline transition-colors"
                >
                    <Trash2 size={20} aria-hidden="true" />
                </button>
                <div className="flex-1" />
                <button
                    type="button"
                    onClick={handleDone}
                    className="clay-button flex items-center justify-center gap-2 px-8 py-3 bg-brand text-on-ink font-heading text-body-emphasis"
                >
                    <Check size={20} aria-hidden="true" />
                    Done
                </button>
            </div>
        </ModalOverlay>
    )
}

// ─── Photo Capture Modal ────────────────────────────────────────────
function PhotoModal({
    onCapture,
    onClose,
}: {
    onCapture: (file: File) => void
    onClose: () => void
}) {
    const webcamRef = useRef<Webcam | null>(null)
    const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    function handleCapture() {
        if (!webcamRef.current) return
        const screenshot = webcamRef.current.getScreenshot()
        if (screenshot) {
            setCapturedUrl(screenshot)
        }
    }

    async function handleSave() {
        if (!capturedUrl) return
        try {
            const res = await fetch(capturedUrl)
            const blob = await res.blob()
            const file = new File(
                [blob],
                `photo-${Date.now()}.jpg`,
                { type: 'image/jpeg' }
            )
            onCapture(file)
        } catch {
            setError('Could not save photo.')
        }
    }

    return (
        <ModalOverlay title="Take a Photo" onClose={onClose}>
            {error && (
                <p className="text-caption text-error" role="alert">{error}</p>
            )}

            {!capturedUrl ? (
                <div className="space-y-4">
                    <div className="clay-well rounded-2xl overflow-hidden">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'environment' }}
                            onUserMediaError={() => setError('Could not access camera. Please allow camera access.')}
                            className="w-full aspect-[4/3] object-cover"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleCapture}
                        className="clay-button w-full px-6 py-3 bg-brand text-on-ink font-heading text-body-emphasis flex items-center justify-center gap-2"
                    >
                        <Camera size={22} aria-hidden="true" />
                        Capture
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="clay-well rounded-2xl overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={capturedUrl} alt="Captured photo" className="w-full aspect-[4/3] object-cover" />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setCapturedUrl(null)}
                            className="flex-1 h-14 rounded-2xl border-2 border-hairline text-ink font-heading text-body-emphasis hover:bg-surface-sunken transition-colors"
                        >
                            Retake
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="clay-button flex-1 px-6 py-3 bg-brand text-on-ink font-heading text-body-emphasis"
                        >
                            Use this
                        </button>
                    </div>
                </div>
            )}
        </ModalOverlay>
    )
}
