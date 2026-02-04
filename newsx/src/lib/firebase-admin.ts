import 'server-only';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

function formatPrivateKey(key: string | undefined) {
    return key?.replace(/\\n/g, '\n');
}

export function initAdmin() {
    if (!admin.apps.length) {
        const envProjectId = process.env.FIREBASE_PROJECT_ID;
        const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const envPrivateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

        let serviceAccount: { projectId: string; clientEmail: string; privateKey: string } | null = null;

        if (envProjectId && envClientEmail && envPrivateKey) {
            serviceAccount = {
                projectId: envProjectId,
                clientEmail: envClientEmail,
                privateKey: envPrivateKey,
            };
        } else {
            const fallbackPath =
                process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                path.join(process.cwd(), 'newsx-f140b-firebase-adminsdk-fbsvc-462e35a69c.json');

            if (fs.existsSync(fallbackPath)) {
                const raw = fs.readFileSync(fallbackPath, 'utf8');
                const parsed = JSON.parse(raw);
                serviceAccount = {
                    projectId: parsed.project_id,
                    clientEmail: parsed.client_email,
                    privateKey: parsed.private_key,
                };
            }
        }

        if (!serviceAccount) {
            throw new Error("Firebase admin credentials are not configured");
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: serviceAccount.projectId,
                clientEmail: serviceAccount.clientEmail,
                privateKey: formatPrivateKey(serviceAccount.privateKey),
            }),
        });
    }
    return admin;
}

export const dbAdmin = () => {
    if (process.env.FIREBASE_FEEDS_BACKUP_ONLY === "true") {
        throw new Error("Firebase DB access disabled (feeds backup only)");
    }
    initAdmin();
    return getFirestore();
};

export const dbAdminFeedsBackup = () => {
    initAdmin();
    return getFirestore();
};

export const authAdmin = () => {
    initAdmin();
    return getAuth();
};
