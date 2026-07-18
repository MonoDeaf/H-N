/**
 * God-tier compression engine
 * Targets specific file sizes by iteratively adjusting dimensions and quality
 */
export class CompressionEngine {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.sharpenCanvas = document.createElement('canvas');
        this.sharpenCtx = this.sharpenCanvas.getContext('2d', { alpha: false });
    }

    async compress(file, targetKiB = 200, resolutionPercent = 100) {
        const targetBytes = targetKiB * 1024;
        const sourceImg = await this._loadImage(file);
        
        const maxWidth = Math.floor(sourceImg.width * (resolutionPercent / 100));
        const maxHeight = Math.floor(sourceImg.height * (resolutionPercent / 100));
        const minDimension = 80; // Minimum width/height to maintain readability

        let lowScale = Math.max(0.05, minDimension / Math.max(maxWidth, maxHeight));
        let highScale = 1.0;
        let bestResult = null;

        // Outer loop: binary search on resolution/dimensions
        for (let outer = 0; outer < 6; outer++) {
            const scale = (lowScale + highScale) / 2;
            const w = Math.max(minDimension, Math.floor(maxWidth * scale));
            const h = Math.max(minDimension, Math.floor(maxHeight * scale));

            const blob = await this._compressAtSize(sourceImg, w, h, targetBytes);
            
            if (blob.size <= targetBytes) {
                bestResult = { blob, width: w, height: h };
                lowScale = scale; // Try larger dimensions for better quality
                
                // Early exit if we're within 5% of target
                if (blob.size >= targetBytes * 0.95) break;
            } else {
                highScale = scale; // Still too big, reduce dimensions
            }
        }

        // Fallback if no result found
        if (!bestResult) {
            const w = Math.max(minDimension, Math.floor(maxWidth * lowScale));
            const h = Math.max(minDimension, Math.floor(maxHeight * lowScale));
            const blob = await this._compressAtSize(sourceImg, w, h, targetBytes);
            bestResult = { blob, width: w, height: h };
        }

        return {
            blob: bestResult.blob,
            width: bestResult.width,
            height: bestResult.height,
            originalSize: file.size,
            compressedSize: bestResult.blob.size
        };
    }

    async _compressAtSize(sourceImg, width, height, targetBytes) {
        // Use pyramid downscaling for better quality
        await this._drawScaled(sourceImg, width, height);
        
        // Apply subtle contrast
        this.sharpenCanvas.width = width;
        this.sharpenCanvas.height = height;
        this.sharpenCtx.filter = 'contrast(1.05)';
        this.sharpenCtx.drawImage(this.canvas, 0, 0);
        this.sharpenCtx.filter = 'none';

        let bestBlob = null;
        let lowQ = 0.15; 
        let highQ = 1.0;

        // Inner loop: binary search for optimal quality
        for (let i = 0; i < 9; i++) {
            const currentQuality = (lowQ + highQ) / 2;
            const blob = await new Promise(resolve => 
                this.sharpenCanvas.toBlob(resolve, 'image/jpeg', currentQuality)
            );
            
            if (blob.size <= targetBytes) {
                bestBlob = blob;
                lowQ = currentQuality; 
                
                if (blob.size >= targetBytes * 0.97) break;
            } else {
                highQ = currentQuality; 
            }
        }

        if (!bestBlob) {
            bestBlob = await new Promise(resolve => 
                this.sharpenCanvas.toBlob(resolve, 'image/jpeg', lowQ)
            );
        }

        return bestBlob;
    }

    async _drawScaled(sourceImg, targetWidth, targetHeight) {
        let currentWidth = sourceImg.width;
        let currentHeight = sourceImg.height;
        
        const stepCanvas = document.createElement('canvas');
        const stepCtx = stepCanvas.getContext('2d', { alpha: false });
        stepCanvas.width = currentWidth;
        stepCanvas.height = currentHeight;
        stepCtx.drawImage(sourceImg, 0, 0);

        while (currentWidth > targetWidth * 2 || currentHeight > targetHeight * 2) {
            const nextW = Math.max(Math.floor(currentWidth / 2), targetWidth);
            const nextH = Math.max(Math.floor(currentHeight / 2), targetHeight);
            const temp = document.createElement('canvas');
            const tempCtx = temp.getContext('2d', { alpha: false });
            temp.width = nextW;
            temp.height = nextH;
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(stepCanvas, 0, 0, nextW, nextH);
            stepCanvas.width = nextW;
            stepCanvas.height = nextH;
            stepCtx.drawImage(temp, 0, 0);
            currentWidth = nextW;
            currentHeight = nextH;
        }

        this.canvas.width = targetWidth;
        this.canvas.height = targetHeight;
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, targetWidth, targetHeight);
        this.ctx.drawImage(stepCanvas, 0, 0, targetWidth, targetHeight);
    }

    async _loadImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            
            const timeoutId = setTimeout(() => {
                URL.revokeObjectURL(url);
                reject(new Error("Image loading timed out"));
            }, 30000);
            
            img.onload = () => {
                clearTimeout(timeoutId);
                URL.revokeObjectURL(url);
                resolve(img);
            };
            
            img.onerror = (err) => {
                clearTimeout(timeoutId);
                URL.revokeObjectURL(url);
                reject(new Error(`Failed to load image`));
            };
            
            img.src = url;
        });
    }
}