/**
 * Loads the ECS logo and renders it onto a canvas with a white background,
 * returning a PNG data URL that is safe to embed in jsPDF without transparency
 * rendering as black.
 */
export const loadLogoForPDF = (logoPath: string = '/LOGO.png'): Promise<string | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }

                // Fill with white so any PNG transparency becomes white (not black)
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw the logo on top
                ctx.drawImage(img, 0, 0);

                resolve(canvas.toDataURL('image/png'));
            } catch {
                resolve(null);
            }
        };

        img.onerror = () => {
            // Fallback: try fetch + FileReader approach
            fetch(logoPath)
                .then(res => res.blob())
                .then(blob => new Promise<string>((res2, rej2) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const raw = reader.result as string;
                        // Composite on canvas
                        const img2 = new Image();
                        img2.onload = () => {
                            try {
                                const canvas = document.createElement('canvas');
                                canvas.width = img2.width;
                                canvas.height = img2.height;
                                const ctx = canvas.getContext('2d');
                                if (!ctx) { rej2(new Error('no ctx')); return; }
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(img2, 0, 0);
                                res2(canvas.toDataURL('image/png'));
                            } catch (e) { rej2(e); }
                        };
                        img2.onerror = () => res2(raw); // last resort: return raw
                        img2.src = raw;
                    };
                    reader.onerror = rej2;
                    reader.readAsDataURL(blob);
                }))
                .then(dataUrl => resolve(dataUrl))
                .catch(() => resolve(null));
        };

        img.src = logoPath;
    });
};
