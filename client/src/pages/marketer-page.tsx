import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Film, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ScriptGenerationRequest {
  productDescription: string;
  targetAudience: string;
  adGoals: string;
  model: "grok" | "llama";
}

interface ScriptGenerationResponse {
  script: string;
  voiceover: string;
  visualCues: string[];
}

interface VideoGenerationRequest {
  script: string;
  duration: 4 | 6 | 8;
}

interface VideoGenerationResponse {
  videoPath: string;
  videoUrl: string;
}

export function MarketerPage() {
  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [adGoals, setAdGoals] = useState("");
  const [selectedModel, setSelectedModel] = useState<"grok" | "llama">("grok");
  const [generatedScript, setGeneratedScript] = useState<ScriptGenerationResponse | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<VideoGenerationResponse | null>(null);
  const [videoDuration, setVideoDuration] = useState<4 | 6 | 8>(6);

  const { toast } = useToast();

  const scriptMutation = useMutation({
    mutationFn: async (data: ScriptGenerationRequest) => {
      const response = await apiRequest("/api/marketer/script", "POST", data);
      return response.json() as Promise<ScriptGenerationResponse>;
    },
    onSuccess: (data) => {
      setGeneratedScript(data);
      toast({
        title: "Script Generated",
        description: "Your video ad script has been created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate script",
        variant: "destructive",
      });
    },
  });

  const videoMutation = useMutation({
    mutationFn: async (data: VideoGenerationRequest) => {
      const response = await apiRequest("/api/marketer/video", "POST", data);
      return response.json() as Promise<VideoGenerationResponse>;
    },
    onSuccess: (data) => {
      setGeneratedVideo(data);
      toast({
        title: "Video Generated",
        description: "Your video ad has been created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate video",
        variant: "destructive",
      });
    },
  });

  const handleGenerateScript = () => {
    if (!productDescription.trim() || !targetAudience.trim() || !adGoals.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to generate a script",
        variant: "destructive",
      });
      return;
    }

    scriptMutation.mutate({
      productDescription,
      targetAudience,
      adGoals,
      model: selectedModel,
    });
  };

  const handleGenerateVideo = () => {
    if (!generatedScript) {
      toast({
        title: "No Script",
        description: "Generate a script first before creating a video",
        variant: "destructive",
      });
      return;
    }

    videoMutation.mutate({
      script: generatedScript.script,
      duration: videoDuration,
    });
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-marketer">
            <Film className="w-8 h-8" />
            Video Ad Creator
          </h1>
          <p className="text-secondary-foreground mt-2">
            Generate compelling video ad scripts and create professional video ads with AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Create Your Ad Brief
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium" data-testid="label-product">
                  Product/Service Description
                </label>
                <Textarea
                  placeholder="Describe your product or service in detail..."
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="mt-1 min-h-24"
                  data-testid="textarea-product"
                />
              </div>

              <div>
                <label className="text-sm font-medium" data-testid="label-audience">
                  Target Audience
                </label>
                <Textarea
                  placeholder="Who is your ideal customer? (e.g., young professionals, tech enthusiasts, families with children)"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="mt-1 min-h-24"
                  data-testid="textarea-audience"
                />
              </div>

              <div>
                <label className="text-sm font-medium" data-testid="label-goals">
                  Ad Goals
                </label>
                <Textarea
                  placeholder="What do you want the ad to achieve? (e.g., drive sales, increase awareness, promote limited-time offer)"
                  value={adGoals}
                  onChange={(e) => setAdGoals(e.target.value)}
                  className="mt-1 min-h-24"
                  data-testid="textarea-goals"
                />
              </div>

              <div>
                <label className="text-sm font-medium" data-testid="label-model">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as "grok" | "llama")}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  data-testid="select-model"
                >
                  <option value="grok">Grok (xAI) - Creative & Witty</option>
                  <option value="llama">Llama (Meta) - Professional & Detailed</option>
                </select>
              </div>

              <Button
                onClick={handleGenerateScript}
                disabled={scriptMutation.isPending}
                className="w-full"
                data-testid="button-generate-script"
              >
                {scriptMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Script
              </Button>
            </div>
          </Card>

          {/* Script Output */}
          {generatedScript && (
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Generated Script</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-secondary-foreground">
                    Main Script
                  </h3>
                  <p className="mt-2 text-foreground whitespace-pre-wrap" data-testid="text-script">
                    {generatedScript.script}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-secondary-foreground">
                    Voiceover
                  </h3>
                  <p className="mt-2 text-foreground whitespace-pre-wrap" data-testid="text-voiceover">
                    {generatedScript.voiceover}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-secondary-foreground">
                    Visual Cues
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {generatedScript.visualCues.map((cue, i) => (
                      <li key={i} className="text-foreground" data-testid={`text-cue-${i}`}>
                        • {cue}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium" data-testid="label-duration">
                    Video Duration
                  </label>
                  <select
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(parseInt(e.target.value) as 4 | 6 | 8)}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    data-testid="select-duration"
                  >
                    <option value="4">4 seconds</option>
                    <option value="6">6 seconds (recommended)</option>
                    <option value="8">8 seconds</option>
                  </select>
                </div>

                <Button
                  onClick={handleGenerateVideo}
                  disabled={videoMutation.isPending}
                  className="w-full"
                  data-testid="button-generate-video"
                >
                  {videoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Video
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Video Output */}
        {generatedVideo && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Video Ad</h2>
            <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              <video
                src={generatedVideo.videoUrl}
                controls
                className="w-full h-full"
                data-testid="video-player"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = generatedVideo.videoUrl;
                  a.download = "video-ad.mp4";
                  a.click();
                }}
                data-testid="button-download"
              >
                Download Video
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedScript(null);
                  setGeneratedVideo(null);
                }}
                data-testid="button-create-new"
              >
                Create New Ad
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
