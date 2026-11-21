import { useEffect, useRef, useState } from 'react'

export function CameraCapture({ onCapture, disabled = false, facingMode = 'environment' }: { onCapture: (photo: string) => void; disabled?: boolean; facingMode?: 'user' | 'environment' }) {
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const video = useRef<HTMLVideoElement>(null)
  const nativeCamera = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  function close() {
    setOpen(false)
    trigger.current?.focus()
  }
  async function selectPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onCapture(String(reader.result))
      close()
    }
    reader.onerror = () => setError('Could not read this photo. Please try again.')
    reader.readAsDataURL(file)
  }
  useEffect(() => {
    if (!open) return
    let disposed = false
    let stream: MediaStream | undefined
    setReady(false)
    setError('')
    navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1280 } }, audio: false }).then(result => {
          if (disposed) { result.getTracks().forEach(track => track.stop()); return }
          stream = result
          if (video.current) video.current.srcObject = result
        }).catch(() => { if (!disposed) setError('Camera unavailable. Allow camera access in your browser, or close this window and upload a photo instead.') })
      : setError('Camera access is unavailable in this browser. Close this window and upload a photo instead.')
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopImmediatePropagation(); close() } }
    window.addEventListener('keydown', escape)
    return () => { disposed = true; stream?.getTracks().forEach(track => track.stop()); window.removeEventListener('keydown', escape) }
  }, [open, facingMode])
  function capture() {
    const source = video.current
    if (!source || !source.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = source.videoWidth
    canvas.height = source.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(source, 0, 0)
    onCapture(canvas.toDataURL('image/jpeg', 0.85))
    close()
  }
  return <>
    <input ref={nativeCamera} type="file" accept="image/*" capture={facingMode} onChange={selectPhoto} className="hidden" aria-label="Take a photo with your device camera" />
    <button ref={trigger} type="button" disabled={disabled} onClick={() => setOpen(true)} className="mt-3 rounded-xl border border-[#c4b5fd] bg-[#faf5ff] px-4 py-2.5 text-xs font-700 text-[#7c3aed] disabled:opacity-40">Take a photo</button>
    {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#160d20]/80 p-4" role="dialog" aria-modal="true" aria-label="Take a photo">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-800 text-[#241335]">Take a photo</h2><button type="button" autoFocus onClick={close} aria-label="Close camera" className="rounded-full px-3 py-2 text-[#57445f]">Close</button></div>
        {error ? <p role="alert" className="my-6 text-sm text-[#75647e]">{error}</p> : <><video ref={video} autoPlay playsInline muted onCanPlay={() => setReady(true)} className="mt-4 aspect-[4/3] w-full rounded-xl bg-black object-contain" />{!ready && <p role="status" className="mt-2 text-xs text-[#75647e]">Waiting for camera access...</p>}<button type="button" disabled={!ready} onClick={capture} className="mt-4 w-full rounded-xl brand-gradient py-3 text-sm font-700 text-white disabled:opacity-40">Capture photo</button></>}
        <button type="button" onClick={() => nativeCamera.current?.click()} className="mt-3 w-full rounded-xl border border-[#c4b5fd] px-4 py-3 text-sm font-700 text-[#7c3aed]">Use device camera</button>
      </div>
    </div>}
  </>
}
