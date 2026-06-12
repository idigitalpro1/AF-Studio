import React, { useState, useEffect } from 'react';
import { Video, Sparkles, Loader2, Play, Download } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { saveCreation } from '../lib/db';

interface RunwayProps {
  generatedImage: string | null;
  generatedPrompt?: string | null;
}

export function Runway({ generatedImage, generatedPrompt }: RunwayProps) {
  const [prompt, setPrompt] = useState('A cinematic slow-motion runway walk of a model wearing high-end avant-garde fashion, in a high-end fashion magazine editorial style, with a professional studio backdrop and dramatic lighting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  useEffect(() => {
    if (generatedPrompt) {
      setPrompt(`A cinematic slow-motion runway walk of a model. Theme and context: ${generatedPrompt}. High-end fashion magazine editorial style, dramatic lighting.`);
    }
  }, [generatedPrompt]);

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'runway-editorial.mp4';
    a.click();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setProgress('Initializing video generation...');

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API key is missing.');
      }

      const ai = new GoogleGenAI({ apiKey });

      let imagePayload = undefined;
      if (generatedImage) {
        const base64Data = generatedImage.split(',')[1];
        const mimeType = generatedImage.split(',')[0].split(':')[1].split(';')[0];
        imagePayload = {
          imageBytes: base64Data,
          mimeType: mimeType,
        };
      }

      setProgress('Submitting request to Veo...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt,
        image: imagePayload,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16'
        }
      });

      setProgress('Generating video... This may take a few minutes.');
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        setProgress('Still generating... Crafting the perfect runway moment.');
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!downloadLink) {
        throw new Error('Failed to retrieve video URL from the response.');
      }

      setProgress('Downloading generated video...');
      
      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setProgress('');
      
      // Save to database (we need to convert blob to base64 data url for saving)
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        saveCreation('video', base64data, prompt);
      };

    } catch (err: any) {
      console.error('Error generating video:', err);
      setError(err.message || 'An error occurred while generating the video.');
      setProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-serif uppercase tracking-widest mb-4">The Runway</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto">
          Bring your fashion concepts to life. Generate dynamic runway videos and fashion show clips using Veo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Controls */}
        <div className="space-y-8">
          <div className="bg-white p-6 border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Video className="w-4 h-4" />
              Video Direction
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                  Scene Description
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-32 p-3 border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black outline-none resize-none text-sm"
                  placeholder="Describe the runway walk, lighting, and camera movement..."
                />
              </div>

              {generatedImage && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 flex items-start gap-4">
                  <img src={generatedImage} alt="Reference" className="w-16 h-16 object-cover border border-zinc-300" />
                  <div>
                    <p className="text-sm font-medium">Using Studio Image as Reference</p>
                    <p className="text-xs text-zinc-500 mt-1">The video will start with your generated fashion look.</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-black text-white py-4 uppercase tracking-widest text-sm font-bold hover:bg-zinc-800 transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Runway Video
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm border border-red-100">
                  {error}
                </div>
              )}
              
              {isGenerating && progress && (
                <div className="p-4 bg-blue-50 text-blue-600 text-sm border border-blue-100 text-center animate-pulse">
                  {progress}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-100 border border-zinc-200 aspect-[9/16] flex items-center justify-center relative overflow-hidden shadow-inner max-h-[700px] mx-auto w-full max-w-[400px]">
            {videoUrl ? (
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-cover"
              />
            ) : isGenerating ? (
              <div className="text-center p-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-zinc-400" />
                <p className="text-sm text-zinc-500 uppercase tracking-widest">Processing Video</p>
              </div>
            ) : (
              <div className="text-center p-8 text-zinc-400">
                <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm uppercase tracking-widest">Ready to Generate</p>
              </div>
            )}
          </div>
          {videoUrl && (
            <button
              onClick={handleDownload}
              className="w-full max-w-[400px] mx-auto bg-black text-white py-3 uppercase tracking-widest text-sm font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Download Video
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
