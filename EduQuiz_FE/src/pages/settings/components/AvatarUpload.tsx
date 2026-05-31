import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  currentUrl?: string;
  username: string;
  onFileSelect: (file: File | null) => void;
}

export function AvatarUpload({ currentUrl, username, onFileSelect }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP files are allowed");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onFileSelect(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-6">
      <Avatar className="h-24 w-24 border-2 border-muted">
        <AvatarImage src={preview || currentUrl} alt={username} />
        <AvatarFallback className="text-2xl">{username.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" /> Upload new
          </Button>
          {preview && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <X className="mr-2 h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG or WebP. Max 2MB.
        </p>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
