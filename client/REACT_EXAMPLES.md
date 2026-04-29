# React Integration Examples

These components demonstrate how to integrate the **Global Image Service** into a React application (e.g., MuseFactory).

## 1. Direct Upload Component
Use this component (`MultipleImageUpload.tsx`) to allow users to select files and upload them **directly** to Cloudflare, bypassing your backend server.

```tsx
import { useState, useRef } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Or your auth/db client
import { showToast } from '../lib/toast';

interface MultipleImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export default function MultipleImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 5 
}: MultipleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        // 1. Validate
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is too large (max 10MB).`);
        
        // 2. Prepare Direct Upload
        const formData = new FormData();
        formData.append('image', file);
        formData.append('client', 'musefactory'); // Change per project

        // 3. Upload to Worker
        const response = await fetch('https://cf-image-worker.sabimage.workers.dev/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error(`Upload failed for ${file.name}`);
        const data = await response.json();
        uploadedUrls.push(data.url);
      }

      // 4. Update UI
      onImagesChange([...images, ...uploadedUrls]);
      showToast.success('Images uploaded successfully');
      
      // Optional: Save to DB here (or let parent component do it)
      // await saveToDb(uploadedUrls);

    } catch (error: any) {
      showToast.error(error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={uploading}
        className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
      >
        {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
        <span>Add Images</span>
      </button>

      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        multiple 
        className="hidden" 
        onChange={handleFileSelect} 
      />

      {/* Preview Grid */}
      <div className="grid grid-cols-3 gap-4">
        {images.map((url, i) => (
          <div key={i} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
            <img src={url} alt="Preview" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 2. Migration Tool
Use this component (`ImageMigration.tsx`) to move legacy images (e.g., from Cloudinary) to the new service.

```tsx
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../lib/toast';

export default function ImageMigration() {
  const [migrating, setMigrating] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const startMigration = async () => {
    if (!confirm('Start migration?')) return;
    setMigrating(true);
    setLog(['Starting...']);

    try {
      // 1. Fetch products
      const { data: products } = await supabase.from('products').select('*');
      
      const toMigrate = products?.filter(p => 
        p.images?.some((img: string) => img.includes('cloudinary.com'))
      ) || [];

      for (const product of toMigrate) {
        setLog(prev => [...prev, `Processing ${product.name}...`]);
        const newImages: string[] = [];
        let changed = false;

        for (const imgUrl of product.images) {
          if (imgUrl.includes('cloudinary.com')) {
            try {
              // Download & Re-upload
              const res = await fetch(imgUrl);
              const blob = await res.blob();
              
              const formData = new FormData();
              formData.append('image', blob);
              formData.append('client', 'musefactory');

              const upRes = await fetch('https://cf-image-worker.sabimage.workers.dev/upload', {
                method: 'POST',
                body: formData
              });
              
              const data = await upRes.json();
              newImages.push(data.url);
              changed = true;
            } catch (e) {
              newImages.push(imgUrl); // Keep old on error
            }
          } else {
            newImages.push(imgUrl);
          }
        }

        if (changed) {
          // Update DB
          await supabase.from('products')
            .update({ images: newImages })
            .eq('id', product.id);
        }
      }
      showToast.success('Done!');
    } catch (e) {
      console.error(e);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3>Migration Tool</h3>
      <button onClick={startMigration} disabled={migrating}>
        {migrating ? 'Migrating...' : 'Start Migration'}
      </button>
      <div className="mt-2 text-xs font-mono h-32 overflow-auto bg-gray-100 p-2">
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
```
