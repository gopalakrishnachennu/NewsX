import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface UploadOptions {
    folder?: string;
    preserveName?: boolean;
    skipOptimization?: boolean;
    onProgress?: (progress: number) => void;
}

export class StorageService {
    static async uploadFile(file: File, userId: string, options: UploadOptions = {}) {
        const folder = options.folder || "uploads";
        const preserveName = options.preserveName ?? false;
        const safeName = preserveName ? file.name : `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
        const path = `${folder}/${userId}/${safeName}`;

        const fileRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(fileRef, file);

        return new Promise<{ url: string; path: string }>((resolve, reject) => {
            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    if (options.onProgress) {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        options.onProgress(progress);
                    }
                },
                (error) => reject(error),
                async () => {
                    try {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({ url, path });
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        });
    }
}
