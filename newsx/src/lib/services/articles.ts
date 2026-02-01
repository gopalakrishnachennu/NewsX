import { db } from "@/lib/firebase";
import { Article, ArticleLifecycle } from "@/types";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    addDoc
} from "firebase/firestore";

const COLLECTION = "articles";

export const ArticleService = {
    async getRecent(limitCount = 20) {
        const q = query(
            collection(db, COLLECTION),
            orderBy("publishedAt", "desc"),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
    },

    async getById(id: string) {
        const docRef = doc(db, COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return { id: snapshot.id, ...snapshot.data() } as Article;
    },

    async create(article: Omit<Article, "id">) {
        // Generate a stable ID if possible, otherwise let Firestore auto-gen typical for simpler usage
        // For features.md requirement (stable hash), we'd do that before calling this.
        // For now, using auto-id for speed.
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...article,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        return docRef.id;
    },

    async updateLifecycle(id: string, lifecycle: ArticleLifecycle) {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            lifecycle,
            updatedAt: Timestamp.now()
        });
    },

    async getByLifecycle(lifecycle: ArticleLifecycle, limitCount = 20) {
        const q = query(
            collection(db, COLLECTION),
            where("lifecycle", "==", lifecycle),
            orderBy("publishedAt", "desc"),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
    },

    async processArticle(id: string, content: string, title: string) {
        const { QualityFilters } = await import("../quality");

        // Check quality
        const clickbaitCheck = QualityFilters.isClickbait(title);
        const wordCountCheck = QualityFilters.hasMinWordCount(content, 100);
        const prCheck = QualityFilters.isPressRelease(title, content);

        const isLowQuality = clickbaitCheck.isClickbait || !wordCountCheck || prCheck;
        const qualityScore = 100 - (clickbaitCheck.score) - (prCheck ? 50 : 0) - (wordCountCheck ? 0 : 30);

        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            qualityScore: Math.max(0, qualityScore),
            lifecycle: isLowQuality ? 'blocked' : 'processed',
            updatedAt: Timestamp.now()
        });

        return { isLowQuality, qualityScore };
    }
};
