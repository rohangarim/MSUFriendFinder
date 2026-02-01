'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImg, Area } from '@/lib/cropImage'

interface ImageCropperProps {
  imageSrc: string
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [loading, setLoading] = useState(false)

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location)
  }, [])

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const onCropAreaChange = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return

    setLoading(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 400)
      onCropComplete(croppedBlob)
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-black text-gray-800">Adjust Photo</h3>
          <p className="text-xs text-gray-500 mt-1">Pinch or use slider to zoom</p>
        </div>

        {/* Cropper Area */}
        <div className="relative h-80 bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
          />
        </div>

        {/* Zoom Slider */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">-</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-5
                         [&::-webkit-slider-thumb]:h-5
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-msu-green
                         [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-webkit-slider-thumb]:shadow-lg"
            />
            <span className="text-xs text-gray-400">+</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 flex gap-3 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm
                       bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors
                       disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm text-white
                       bg-msu-gradient hover:opacity-90 transition-opacity
                       disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Photo'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
