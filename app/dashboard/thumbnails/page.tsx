'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Image as ImageIcon, Download, Wand2, Sparkles, Loader2, Brain, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ThumbnailGeneratorPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState('');
  const [finalCanvas, setFinalCanvas] = useState<string>('');
  const [aiDecision, setAiDecision] = useState({ text: '', position: '' });
  const [retryCount, setRetryCount] = useState(0);
  
  const [formData, setFormData] = useState({
    prompt: '',
    style: 'clickbait',
    platform: 'youtube'
  });

  const platforms = [
    { id: 'youtube', name: 'YouTube', emoji: '▶️', size: '1280x720', desc: 'Video Thumbnail' },
    { id: 'instagram-post', name: 'Instagram Post', emoji: '📸', size: '1080x1080', desc: 'Square Post' },
    { id: 'instagram-story', name: 'Instagram Story', emoji: '📱', size: '1080x1920', desc: 'Story/Reel' },
    { id: 'facebook', name: 'Facebook', emoji: '👥', size: '1200x630', desc: 'Post/Ad' },
    { id: 'tiktok', name: 'TikTok', emoji: '🎵', size: '1080x1920', desc: 'Video Cover' },
  ];

  const styles = [
    { id: 'clickbait', name: 'Clickbait', emoji: '🔥', desc: 'High CTR' },
    { id: 'minimal', name: 'Minimalist', emoji: '✨', desc: 'Clean & Pro' },
    { id: 'gaming', name: 'Gaming', emoji: '🎮', desc: 'Neon & Action' },
    { id: 'vlog', name: 'Vlog', emoji: '📹', desc: 'Personal' },
    { id: 'tech', name: 'Tech Review', emoji: '💻', desc: 'Sleek' },
    { id: 'cinematic', name: 'Cinematic', emoji: '🎬', desc: 'Movie Style' },
  ];

  const stylePrompts: Record<string, string> = {
    clickbait: 'YouTube thumbnail style, clickbait, shocked face, bright colors, bold text space, high contrast, dramatic lighting, 4k, ultra detailed',
    minimal: 'minimalist design, clean layout, professional, soft colors, elegant, modern aesthetic, simple',
    gaming: 'gaming style, neon colors, action packed, dynamic composition, glowing effects, esports aesthetic, vibrant',
    vlog: 'vlog style, bright and cheerful, personal touch, warm lighting, lifestyle aesthetic, inviting',
    tech: 'tech review, sleek modern design, dark background, blue accents, futuristic, product showcase, professional',
    cinematic: 'cinematic movie poster style, dramatic lighting, epic composition, film grain, Hollywood quality'
  };

  const platformDimensions: Record<string, { width: number; height: number }> = {
    'youtube': { width: 1280, height: 720 },
    'instagram-post': { width: 1080, height: 1080 },
    'instagram-story': { width: 1080, height: 1920 },
    'facebook': { width: 1200, height: 630 },
    'tiktok': { width: 1080, height: 1920 },
  };

  const getSmartAIDecision = (prompt: string, style: string) => {
    const p = prompt.toLowerCase();
    let bestText = "WATCH NOW";
    let bestPosition = "bottom";

    if (p.includes('shock') || p.includes('scary') || style === 'clickbait') bestText = "SHOCKING!";
    else if (p.includes('secret') || p.includes('hidden') || p.includes('raaz')) bestText = "SECRET REVEALED!";
    else if (p.includes('money') || p.includes('earn') || p.includes('views') || p.includes('viral')) bestText = "10X VIEWS!";
    else if (p.includes('game') || style === 'gaming') bestText = "EPIC WIN!";
    else if (p.includes('tech') || p.includes('review') || p.includes('phone') || p.includes('ai') || p.includes('brain')) bestText = "AI HACKS";
    else if (p.includes('vlog') || p.includes('travel') || p.includes('day')) bestText = "DAY IN LIFE";
    else if (p.includes('tutorial') || p.includes('how to') || p.includes('kaise')) bestText = "EASY TUTORIAL";

    if (p.includes('face') || p.includes('shock') || p.includes('person') || p.includes('man') || p.includes('woman') || style === 'clickbait') {
      bestPosition = "bottom";
    } else if (p.includes('landscape') || p.includes('scenery') || p.includes('nature') || style === 'cinematic') {
      bestPosition = "center";
    } else if (style === 'gaming' || style === 'tech') {
      bestPosition = "top";
    } else {
      bestPosition = "bottom";
    }

    return { text: bestText, position: bestPosition };
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prompt) {
      toast.error('Please enter a prompt first!');
      return;
    }
    
    setIsGenerating(true);
    setFinalCanvas('');
    setGeneratedImage('');
    
    const decision = getSmartAIDecision(formData.prompt, formData.style);
    setAiDecision(decision);

    const fullPrompt = `${formData.prompt}, ${stylePrompts[formData.style]}`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 100000);
    const dims = platformDimensions[formData.platform];
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dims.width}&height=${dims.height}&seed=${seed}&nologo=true&model=flux`;
    
    const loadImage = (url: string, maxRetries = 3): Promise<string> => {
      return new Promise((resolve, reject) => {
        let retries = 0;
        const tryLoad = () => {
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => {
            retries++;
            if (retries < maxRetries) {
              setTimeout(tryLoad, 2000);
            } else {
              reject(new Error('Image load failed after retries'));
            }
          };
          img.src = url;
        };
        tryLoad();
        setTimeout(() => reject(new Error('Timeout')), 30000);
      });
    };

    try {
      const loadedUrl = await loadImage(imageUrl);
      setGeneratedImage(loadedUrl);
      
      // FIXED CANVAS DRAWING CODE
      try {
        const canvas = document.createElement('canvas');
        canvas.width = dims.width;
        canvas.height = dims.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = loadedUrl;
        });
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        ctx.font = 'bold 90px Arial';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 8;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        
        let yPos = canvas.height / 2;
        if (decision.position === 'top') yPos = 150;
        if (decision.position === 'bottom') yPos = canvas.height - 120;
        
        ctx.strokeText(decision.text.toUpperCase(), canvas.width / 2, yPos);
        ctx.fillText(decision.text.toUpperCase(), canvas.width / 2, yPos);
        
        setFinalCanvas(canvas.toDataURL('image/png'));
      } catch (canvasError) {
        console.log('Canvas drawing failed, showing image without text overlay');
      }
      
      setIsGenerating(false);
      toast.success(`AI ne "${decision.text}" ko "${decision.position}" par lagaya! 🎨`);
      
    } catch (error) {
      setIsGenerating(false);
      toast.error('Image generation failed. Please try again!');
      console.error('Generation error:', error);
    }
  };

  const handleDownload = () => {
    const downloadUrl = finalCanvas || generatedImage;
    if (!downloadUrl) return;
    
    const link = document.createElement('a');
    link.download = `nova-ai-thumbnail-${Date.now()}.png`;
    link.href = downloadUrl;
    link.click();
    toast.success('Thumbnail downloaded! 📥');
  };

  const handleRetry = () => {
    if (formData.prompt) {
      setRetryCount(prev => prev + 1);
      handleGenerate(new Event('submit') as any);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6 sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center space-x-2 text-gray-400 hover:text-white transition mr-6">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold">AI Thumbnail Generator</h1>
          <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full flex items-center space-x-1">
            <Brain className="w-3 h-3" />
            <span>Smart Auto-Text AI</span>
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 h-fit">
          <h2 className="text-lg font-semibold mb-6 flex items-center space-x-2">
            <Wand2 className="w-5 h-5 text-orange-400" />
            <span>Thumbnail Settings</span>
          </h2>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Video Topic / Prompt *</label>
              <textarea 
                value={formData.prompt}
                onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition resize-none"
                placeholder="e.g., A shocked YouTuber discovering a secret..."
                required
              />
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-start space-x-3">
              <Brain className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-300">AI Agent Mode Active</p>
                <p className="text-xs text-purple-200/70 mt-1">AI khud prompt parhega, best text chunega, aur sahi jagah par likhega.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Select Platform</label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => setFormData({...formData, platform: platform.id})}
                    className={`p-3 rounded-lg border transition text-left ${
                      formData.platform === platform.id 
                        ? 'bg-orange-600 border-orange-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{platform.emoji}</span>
                      <div>
                        <div className="font-medium text-sm">{platform.name}</div>
                        <div className="text-xs opacity-75">{platform.size}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center space-x-1">
                <Sparkles className="w-4 h-4" /> <span>Thumbnail Style</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {styles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setFormData({...formData, style: style.id})}
                    className={`p-2 rounded-lg border transition text-center ${
                      formData.style === style.id 
                        ? 'bg-orange-600 border-orange-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-xl mb-1">{style.emoji}</div>
                    <div className="text-xs font-medium">{style.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isGenerating} className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-4">
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span>AI is thinking & creating...</span></>
              ) : (
                <><Brain className="w-5 h-5" /><span>Let AI Create Thumbnail</span></>
              )}
            </button>
          </form>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col h-[700px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-orange-400" />
              <span>Final AI Thumbnail</span>
            </h2>
            {(finalCanvas || generatedImage) && !isGenerating && (
              <button onClick={handleRetry} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-400 hover:text-white transition flex items-center space-x-1" title="Regenerate">
                <RefreshCw className="w-4 h-4" />
                <span className="text-xs">Retry</span>
              </button>
            )}
          </div>

          <div className="flex-1 bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 space-y-6 overflow-hidden">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                <p className="text-orange-400 animate-pulse">AI is analyzing prompt & designing...</p>
                <p className="text-xs text-gray-500">This may take 15-30 seconds...</p>
              </div>
            ) : finalCanvas || generatedImage ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <img src={finalCanvas || generatedImage} alt="Final AI Thumbnail" className="w-full h-auto rounded-lg shadow-2xl border border-gray-700 object-cover" style={{ maxHeight: '350px' }} />
                
                <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center space-x-3 w-full">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-300 font-medium">AI Auto-Decided:</p>
                    <p className="text-xs text-green-200/70">
                      Text: <span className="font-bold text-white">"{aiDecision.text}"</span> | Position: <span className="font-bold text-white capitalize">{aiDecision.position}</span>
                    </p>
                  </div>
                </div>

                <button onClick={handleDownload} className="mt-4 flex items-center space-x-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-medium transition">
                  <Download className="w-4 h-4" />
                  <span>Download Final Thumbnail</span>
                </button>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <Brain className="w-10 h-10 text-orange-400 opacity-50" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-300">AI Agent Ready</p>
                  <p className="text-sm mt-2">Prompt likhein, AI baaki sab khud karega!</p>
                  {retryCount > 0 && <p className="text-xs text-orange-400 mt-2">Attempt #{retryCount + 1}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}