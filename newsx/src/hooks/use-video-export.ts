import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { useVideoStore } from '@/lib/stores/video-store';
import { logger } from '@/lib/logger';
import { ultraLogger } from '@/lib/ultra-logger';

export function useVideoExport() {
    const [progress, setProgress] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const { fps = 30, durationInFrames = 900 } = useVideoStore();

    useEffect(() => {
        const loadFFmpeg = async () => {
            ultraLogger.info('video-export-init',
                'Initializing FFmpeg instance for video export capability. ' +
                'FFmpeg is a powerful video encoding library that will be used to convert canvas frames to MP4. ' +
                'This initialization happens once when video editor loads. ' +
                'Expected: FFmpeg object created and ready to load WASM binary on first export.',
                { stage: 'init', library: 'FFmpeg.wasm' }
            );
            const ffmpeg = new FFmpeg();

            ffmpeg.on('log', ({ message }) => {
                ultraLogger.debug('video-export-ffmpeg',
                    `FFmpeg internal log: "${message}". ` +
                    'This is a low-level message from the FFmpeg encoder. ' +
                    'Useful for debugging encoding issues or understanding FFmpeg behavior. ' +
                    'These logs appear during WASM loading and video encoding phases.',
                    { source: 'FFmpeg', message }
                );
            });

            ffmpeg.on('progress', ({ progress: p, time }) => {
                const percentage = Math.round(p * 100);
                setProgress(percentage);
                ultraLogger.info('video-export-progress',
                    `FFmpeg encoding progress: ${percentage}% complete. ` +
                    `Processing time: ${time}ms. ` +
                    `User is waiting for video to finish encoding. ` +
                    `Progress bar on screen shows ${percentage}%. ` +
                    `${percentage < 50 ? 'Still encoding frames' : percentage < 90 ? 'Nearly done' : 'Finalizing output file'}.`,
                    { percentage, time, stage: 'encoding' }
                );
            });

            ffmpegRef.current = ffmpeg;
            ultraLogger.info('video-export-init',
                'FFmpeg instance created and event listeners attached successfully. ' +
                'FFmpeg is now ready for first export. ' +
                'When user clicks "Export MP4", the WASM binary will be downloaded (30MB, ~3-5 seconds). ' +
                'After first load, WASM is cached and exports will be faster.',
                { stage: 'ready', ffmpegReady: true }
            );
        };

        loadFFmpeg();
    }, []);

    const exportVideo = async (playerRef: HTMLDivElement) => {
        const exportTimer = logger.time('video-export', 'Complete MP4 Export');

        const videoLengthSeconds = Math.round(durationInFrames / fps);
        const estimatedTime = 30 + videoLengthSeconds * 2; // ~2 sec per video second

        ultraLogger.info('video-export-start',
            `User initiated MP4 export by clicking "Export MP4" button. ` +
            `Video details: ${videoLengthSeconds} seconds (${durationInFrames} frames) at ${fps}fps. ` +
            `Export process has 4 phases: (1) Load FFmpeg WASM if needed (~3-5s), (2) Capture frames from canvas (~${videoLengthSeconds * 0.5}s), (3) Encode to H.264 (~${videoLengthSeconds * 1.5}s), (4) Download file (instant). ` +
            `Expected total time: ${estimatedTime} seconds on modern hardware. ` +
            `User will see progress bar updating during encoding phase. ` +
            `This is their ${isLoaded ? 'subsequent' : 'first'} export this session (WASM ${isLoaded ? 'already loaded' : 'needs loading'}).`,
            {
                fps,
                durationInFrames,
                videoLengthSeconds,
                estimatedTime,
                isLoaded,
                phases: ['ffmpeg-load', 'frame-capture', 'encoding', 'download']
            }
        );

        if (!ffmpegRef.current) {
            ultraLogger.error('video-export-error',
                'Export failed: FFmpeg instance not initialized. ' +
                'This should never happen as FFmpeg is initialized on component mount. ' +
                'Possible causes: (1) Component unmounted prematurely, (2) JavaScript error during init, (3) Race condition. ' +
                'User saw error alert: "FFmpeg not loaded yet. Please try again." ' +
                'Solution: Refresh page and try export again. If persists, check console for JavaScript errors.',
                { error: 'FFmpeg not initialized', stage: 'pre-check', ffmpegRef: null }
            );
            alert('FFmpeg not loaded yet. Please try again.');
            return;
        }

        setIsExporting(true);
        setProgress(0);

        try {
            const ffmpeg = ffmpegRef.current;

            // Load FFmpeg if not already loaded
            if (!isLoaded) {
                const loadTimer = logger.time('video-export', 'FFmpeg WASM Load');
                setProgress(5);

                ultraLogger.info('video-export-wasm',
                    'Starting FFmpeg WASM download. ' +
                    'FFmpeg WASM binary is ~30MB and will be downloaded from unpkg.com CDN. ' +
                    'Expected download time: 3-5 seconds on normal connection, up to 10-15 seconds on slow connection. ' +
                    'User sees progress bar at 5% with message "Loading FFmpeg...". ' +
                    'This happens only once per session - subsequent exports will skip this step. ' +
                    'Possible failures: (1) No internet connection, (2) Ad blocker blocking unpkg.com, (3) Browser security blocking WASM.',
                    { wasmSize: '~30MB', source: 'unpkg.com', version: '0.12.10', firstLoad: true }
                );

                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });

                setIsLoaded(true);
                const loadTimeMs = loadTimer.end();

                ultraLogger.info('video-export-wasm',
                    `FFmpeg WASM loaded successfully in ${(loadTimeMs / 1000).toFixed(1)} seconds! ` +
                    'WASM binary is now cached in browser memory for this session. ' +
                    'All future exports will skip this loading step and be much faster. ' +
                    'User can now proceed with frame capture phase. ' +
                    'Expected behavior: Progress bar jumps to 10%, frame capture begins immediately.',
                    { loadTimeMs, cached: true, nextPhase: 'frame-capture' }
                );
            }

            setProgress(10);

            // Capture frames from Remotion Player
            const captureTimer = logger.time('video-export', 'Frame Capture');

            ultraLogger.info('video-export-capture',
                `Starting frame capture from video canvas. ` +
                `Will capture ${Math.min(durationInFrames, fps * 60)} frames (max 60 seconds to prevent browser memory overload). ` +
                `Capture method: Convert each canvas frame to PNG image blob. ` +
                `Expected time: ${(Math.min(durationInFrames, fps * 60) / fps * 0.5).toFixed(1)} seconds (varies by device performance). ` +
                `User will see progress bar advance from 10% to 40% during this phase. ` +
                `Memory usage will increase as frames are stored in RAM before encoding. ` +
                `Possible issues: (1) Slow devices may take longer, (2) Very long videos may cause memory errors.`,
                { totalFrames: durationInFrames, framesToCapture: Math.min(durationInFrames, fps * 60), fps, maxSeconds: 60 }
            );
            const frames: Blob[] = [];
            const totalFrames = durationInFrames;
            const framesToCapture = Math.min(totalFrames, fps * 60); // Max 60 seconds

            for (let i = 0; i < framesToCapture; i++) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;

                // Get the Remotion player container
                const playerContainer = playerRef.querySelector('video') || playerRef;

                if (playerContainer instanceof HTMLVideoElement) {
                    canvas.width = playerContainer.videoWidth;
                    canvas.height = playerContainer.videoHeight;
                    ctx.drawImage(playerContainer, 0, 0);
                } else {
                    // Fallback: capture the entire player div
                    // This is a simplified approach - you'll need html-to-image for better capture
                    const { toPng } = await import('html-to-image');
                    const dataUrl = await toPng(playerRef);
                    const img = new Image();
                    img.src = dataUrl;
                    await new Promise(resolve => img.onload = resolve);

                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                }

                const blob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob((b) => resolve(b!), 'image/png');
                });

                frames.push(blob);

                const captureProgress = 10 + (i / framesToCapture) * 30;
                setProgress(Math.round(captureProgress));
            }

            captureTimer.end({ framesCapture: frames.length });

            ultraLogger.info('video-export-capture',
                `Frame capture complete! Captured ${frames.length} frames successfully. ` +
                `Each frame is a PNG blob stored in browser memory (total ~${(frames.length * 0.5).toFixed(1)}MB estimated). ` +
                `All ${frames.length} canvas snapshots are now ready to be written to FFmpeg virtual filesystem. ` +
                `Progress bar is now at 40%. Next phase: Writing frames to FFmpeg (will advance to 60%). ` +
                `User still waiting - total elapsed time so far: ~${((durationInFrames / fps) * 0.5 + 5).toFixed(0)} seconds.`,
                { framesCaptured: frames.length, estimatedMemory: `${(frames.length * 0.5).toFixed(1)}MB`, nextPhase: 'write-frames' }
            );
            setProgress(40);

            // Write frames to FFmpeg virtual filesystem
            const writeTimer = logger.time('video-export', 'Write Frames to FFmpeg');

            ultraLogger.info('video-export-write',
                `Writing ${frames.length} PNG frames to FFmpeg virtual filesystem. ` +
                `Each frame is written as 'frame0000.png', 'frame0001.png', etc. ` +
                `FFmpeg needs all frames in its virtual memory before encoding can begin. ` +
                `Expected time: ${(frames.length * 0.01).toFixed(1)} seconds. ` +
                `Progress bar will advance from 40% to 60% during this write phase. ` +
                `User is still waiting - this is necessary preparation for H.264 encoding.`,
                { framesToWrite: frames.length, estimatedTime: `${(frames.length * 0.01).toFixed(1)}s`, progressRange: '40%-60%' }
            );

            for (let i = 0; i < frames.length; i++) {
                const fileName = `frame${String(i).padStart(4, '0')}.png`;
                await ffmpeg.writeFile(fileName, await fetchFile(frames[i]));

                const writeProgress = 40 + (i / frames.length) * 20;
                setProgress(Math.round(writeProgress));
            }

            writeTimer.end();
            setProgress(60);
            const encodeTimer = logger.time('video-export', 'FFmpeg Encoding');

            ultraLogger.info('video-export-encode',
                `Starting H.264 video encoding with FFmpeg. ` +
                `Input: ${frames.length} PNG frames at ${fps}fps. ` +
                `Output: MP4 video with H.264 codec, CRF 23 quality (high quality), yuv420p color space (universal compatibility). ` +
                `FFmpeg command: '-framerate ${fps} -i frame%04d.png -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart output.mp4'. ` +
                `Expected encoding time: ${(frames.length / fps * 1.5).toFixed(1)} seconds. ` +
                `Progress will advance from 60% to 90% during encoding. ` +
                `User will see encoding progress updates from FFmpeg encoder. ` +
                `This is the most CPU-intensive phase - encoding ${frames.length} frames to compressed video.`,
                { frames: frames.length, fps, codec: 'libx264', quality: 'CRF 23', preset: 'fast', estimatedTime: `${(frames.length / fps * 1.5).toFixed(1)}s` }
            );

            // Encode to MP4
            await ffmpeg.exec([
                '-framerate', fps.toString(),
                '-i', 'frame%04d.png',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                'output.mp4'
            ]);

            encodeTimer.end();
            setProgress(90);

            ultraLogger.info('video-export-encode',
                'FFmpeg encoding completed successfully! ' +
                `All ${frames.length} frames have been compressed into MP4 format. ` +
                'Output file "output.mp4" is now in FFmpeg virtual filesystem. ' +
                'Next step: Read file from virtual filesystem and trigger browser download. ' +
                'Progress bar is at 90%, nearly done!',
                { encodingComplete: true, outputFile: 'output.mp4', nextPhase: 'download' }
            );

            // Read the output file
            const data = await ffmpeg.readFile('output.mp4');

            setProgress(95);

            // Create download link - cast as Uint8Array and convert to array
            const uint8Data = data as Uint8Array;
            // @ts-expect-error - FFmpeg library type definitions issue, works correctly at runtime
            const blob = new Blob([uint8Data], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProgress(100);
            exportTimer.end({ framesExported: frames.length, fileSize: blob.size });

            const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
            const videoDurationSec = frames.length / fps;

            ultraLogger.info('video-export-success',
                `🎉 Video export completed successfully! ` +
                `Final output: ${a.download} (${fileSizeMB}MB MP4 file). ` +
                `Video duration: ${videoDurationSec} seconds at ${fps}fps. ` +
                `Total frames exported: ${frames.length}. ` +
                `File is now downloading to user's device (browser's default download location). ` +
                `User can import this video to social media platforms (Instagram, TikTok, YouTube, etc.). ` +
                `Quality: High (CRF 23), Codec: H.264, Compatible with all modern devices and platforms. ` +
                `Export process complete - cleaning up temporary files now.`,
                {
                    fileName: a.download,
                    fileSize: blob.size,
                    fileSizeMB,
                    totalFrames: frames.length,
                    duration: videoDurationSec,
                    fps,
                    quality: 'CRF 23',
                    codec: 'H.264',
                    compatible: 'Universal'
                }
            );

            // Cleanup
            ultraLogger.info('video-export-cleanup',
                `Cleaning up ${frames.length + 1} temporary files from FFmpeg virtual filesystem. ` +
                `Deleting: frame0000.png through frame${String(frames.length - 1).padStart(4, '0')}.png + output.mp4. ` +
                `This frees up browser memory for next export. ` +
                `User will be able to export again without reloading page (FFmpeg WASM still loaded).`,
                { filesToDelete: frames.length + 1, memoryCleanup: true }
            );

            for (let i = 0; i < frames.length; i++) {
                const fileName = `frame${String(i).padStart(4, '0')}.png`;
                await ffmpeg.deleteFile(fileName);
            }
            await ffmpeg.deleteFile('output.mp4');

            setTimeout(() => {
                setIsExporting(false);
                setProgress(0);

                ultraLogger.info('video-export-complete',
                    'Video export process fully complete. ' +
                    'UI state reset: isExporting=false, progress=0%. ' +
                    'User can now: (1) Export another video, (2) Edit current video, (3) Close video editor. ' +
                    'Export button is enabled again for next export.',
                    { exporterReady: true, uiReset: true }
                );
            }, 1000);

        } catch (error: any) {
            ultraLogger.error('video-export-error',
                `❌ Video export FAILED with error. ` +
                `Error message: "${error.message || 'Unknown error'}". ` +
                `Export failed at ${progress}% progress. ` +
                `User was ${progress < 10 ? 'loading FFmpeg WASM' : progress < 40 ? 'capturing frames' : progress < 60 ? 'writing frames to FFmpeg' : progress < 90 ? 'encoding video' : 'finalizing download'}. ` +
                `Common causes based on progress: ` +
                `${progress < 10 ? '(1) No internet for WASM download, (2) Ad blocker blocking unpkg.com, (3) Browser security' : progress < 40 ? '(1) Canvas rendering issue, (2) Browser memory full, (3) html-to-image failed' : progress < 60 ? '(1) FFmpeg virtual filesystem full, (2) Frame blob corruption' : progress < 90 ? '(1) FFmpeg encoding error, (2) Invalid frame data, (3) Browser CPU throttling' : '(1) File read failed, (2) Download blocked by browser'}. ` +
                `User saw alert: "Export failed: ${error.message || 'Unknown error'}". ` +
                `Export state reset - user can try again. ` +
                `Troubleshooting: ${progress < 10 ? 'Check internet connection, disable ad blockers' : progress < 90 ? 'Try shorter video or lower FPS' : 'Check browser permissions for downloads'}.`,
                {
                    error: error.message,
                    stack: error.stack,
                    fps,
                    durationInFrames,
                    isLoaded,
                    progress,
                    failureStage: progress < 10 ? 'wasm-load' : progress < 40 ? 'frame-capture' : progress < 60 ? 'frame-write' : progress < 90 ? 'encoding' : 'download'
                }
            );
            logger.exception('video-export', error, {
                fps,
                durationInFrames,
                isLoaded,
                progress
            });
            alert(`Export failed: ${error.message || 'Unknown error'}`);
            setIsExporting(false);
            setProgress(0);
        }
    };

    return {
        exportVideo,
        progress,
        isExporting,
        isLoaded
    };
}
