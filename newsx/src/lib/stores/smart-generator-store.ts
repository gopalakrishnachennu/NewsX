import { create } from 'zustand';
import { Asset, SmartTemplateResult } from '@/lib/services/smart-template-service';
import { CanvasState } from '@/lib/services/canvas-state-builder';

interface SmartGeneratorState {
    // State
    step: "input" | "results";
    assets: Asset[];
    headline: string;
    subtext: string;
    results: SmartTemplateResult[];
    generatedPreviews: Map<string, string>;
    generatedCanvasStates: Map<string, CanvasState>;
    isGenerating: boolean;

    // Actions
    setStep: (step: "input" | "results") => void;
    setAssets: (assets: Asset[] | ((prev: Asset[]) => Asset[])) => void;
    addAsset: (asset: Asset) => void;
    removeAsset: (id: string) => void;
    updateAssetContent: (id: string, content: string) => void;
    setHeadline: (headline: string) => void;
    setSubtext: (subtext: string) => void;
    setResults: (results: SmartTemplateResult[]) => void;
    setIsGenerating: (isGenerating: boolean) => void;
    setGeneratedPreviews: (previews: Map<string, string>) => void;
    setGeneratedCanvasStates: (states: Map<string, CanvasState>) => void;
    reset: () => void;
}

export const useSmartGeneratorStore = create<SmartGeneratorState>((set) => ({
    // Initial State
    step: "input",
    assets: [],
    headline: "",
    subtext: "",
    results: [],
    generatedPreviews: new Map(),
    generatedCanvasStates: new Map(),
    isGenerating: false,

    // Actions
    setStep: (step) => set({ step }),

    setAssets: (assets) => set((state) => ({
        assets: typeof assets === 'function' ? assets(state.assets) : assets
    })),

    addAsset: (asset) => set((state) => ({
        assets: [...state.assets, asset]
    })),

    removeAsset: (id) => set((state) => ({
        assets: state.assets.filter(a => a.id !== id)
    })),

    updateAssetContent: (id, content) => set((state) => ({
        assets: state.assets.map(a => a.id === id ? { ...a, content } : a)
    })),

    setHeadline: (headline) => set({ headline }),
    setSubtext: (subtext) => set({ subtext }),
    setResults: (results) => set({ results }),
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setGeneratedPreviews: (generatedPreviews) => set({ generatedPreviews }),
    setGeneratedCanvasStates: (generatedCanvasStates) => set({ generatedCanvasStates }),

    reset: () => set({
        step: "input",
        assets: [],
        headline: "",
        subtext: "",
        results: [],
        generatedPreviews: new Map(),
        generatedCanvasStates: new Map(),
        isGenerating: false
    })
}));
