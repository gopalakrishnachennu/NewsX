"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Wand2, Loader2, ArrowRight, Upload, Image as ImageIcon, CheckCircle, Palette } from "lucide-react";
import { TemplateConfig, DataField } from "@/lib/templates";
import { StorageService } from "@/lib/services/storage-service";
import { useAuthStore, useEditorStore } from "@/lib/stores";
import { getSystemVariables } from "@/lib/variables";

interface TemplateFillModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: TemplateConfig | null;
    onGenerate: (variables: Record<string, string>) => Promise<void>;
    initialValues?: Record<string, string>;
}

export function TemplateFillModal({ isOpen, onClose, template, onGenerate, initialValues }: TemplateFillModalProps) {
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [optimizeImages, setOptimizeImages] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const { user } = useAuthStore();
    const { currentBrandKit, loadBrandKits, brandKits } = useEditorStore();

    // Use new dataFields schema
    const dataFields = template?.dataFields || [];
    const textFields = dataFields.filter(f => f.type === 'text');
    const imageFields = dataFields.filter(f => f.type === 'image');
    const colorFields = dataFields.filter(f => f.type === 'color');

    // Load brand kits if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (user && brandKits.length === 0) {
            loadBrandKits(user.id);
        }
    }, [user, brandKits.length]); // specialized dependency to avoid loops

    // Initialize variables when modal opens or template changes
    useEffect(() => {
        if (!template || !isOpen) return;

        const next: Record<string, string> = {};
        const systemVars = getSystemVariables(user, currentBrandKit);

        template.dataFields.forEach(field => {
            if (initialValues && initialValues[field.id]) {
                next[field.id] = initialValues[field.id];
                return;
            }
            let value = field.defaultValue || "";
            if (value) {
                const resolved = value.replace(/\{\{([^}]+)\}\}/g, (_, k) => systemVars[k] || "");
                if (resolved) {
                    next[field.id] = resolved;
                }
            }
        });

        setVariables(next);
        setErrors({});
    }, [template, isOpen, currentBrandKit, user, initialValues]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        dataFields.forEach(field => {
            const value = variables[field.id] || "";
            const constraints = field.constraints || {};

            // Required check
            if (field.required && !value && (!variables[field.id] || variables[field.id].trim() === "")) {
                newErrors[field.id] = "This field is required";
                isValid = false;
            }

            // Text constraints
            if (field.type === 'text' && value) {
                if (constraints.minLength && value.length < constraints.minLength) {
                    newErrors[field.id] = `Minimum ${constraints.minLength} characters required`;
                    isValid = false;
                }
                if (constraints.maxLength && value.length > constraints.maxLength) {
                    newErrors[field.id] = `Maximum ${constraints.maxLength} characters allowed`;
                    isValid = false;
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleGenerate = async () => {
        // Check if any uploads are still in progress
        const isUploading = Object.values(uploadProgress).some(p => p < 100 && p > 0);
        if (isUploading) {
            alert("Please wait for images to finish uploading.");
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsGenerating(true);
        try {
            await onGenerate(variables);
            // onClose is handled by parent or navigation
        } catch (error) {
            console.error("Failed to generate", error);
            setIsGenerating(false);
        }
    };

    const handleInputChange = (fieldId: string, value: string) => {
        setVariables(prev => ({
            ...prev,
            [fieldId]: value
        }));
        // Clear error on change
        if (errors[fieldId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldId];
                return newErrors;
            });
        }
    };

    const handleImageUpload = async (fieldId: string, file: File) => {
        if (!user) {
            alert("You must be logged in to upload images.");
            return;
        }

        // OPTIMISTIC UPDATE: Show image immediately
        const objectUrl = URL.createObjectURL(file);
        setVariables(prev => ({
            ...prev,
            [fieldId]: objectUrl
        }));

        try {
            // Start progress with a clear state
            setUploadProgress(prev => ({ ...prev, [fieldId]: optimizeImages ? 5 : 1 }));

            // Upload via StorageService
            const result = await StorageService.uploadFile(file, user.id, {
                folder: `templates/${template?.id || 'temp'}`,
                preserveName: false,
                skipOptimization: !optimizeImages,
                onProgress: (progress) => {
                    setUploadProgress(prev => ({ ...prev, [fieldId]: progress }));
                }
            });

            // Complete progress (ensure it hits 100)
            setUploadProgress(prev => ({ ...prev, [fieldId]: 100 }));

            // Save the real URL to variables (replacing the blob URL)
            setVariables(prev => ({
                ...prev,
                [fieldId]: result.url
            }));

        } catch (error) {
            console.error('Failed to upload image:', error);
            alert("Failed to upload image. Please try again.");
            setUploadProgress(prev => ({ ...prev, [fieldId]: 0 }));
            // Revert variable if failed
            setVariables(prev => {
                const newVars = { ...prev };
                delete newVars[fieldId];
                return newVars;
            });
        }
    };

    if (!isOpen || !template) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header with Template Preview */}
                    <div className="relative h-40 bg-gray-900 flex items-end overflow-hidden">
                        {template.thumbnail && (
                            <img
                                src={template.thumbnail}
                                alt={template.name}
                                className="absolute inset-0 w-full h-full object-cover opacity-60"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                        <div className="relative z-10 w-full p-6">
                            <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-1">
                                <Wand2 className="w-4 h-4" />
                                {template.category.toUpperCase()} TEMPLATE
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                {template.name}
                            </h2>
                            <p className="text-gray-300 text-sm mt-1">
                                {template.description}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        {/* Info Banner */}
                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl flex gap-3 text-indigo-700 text-sm">
                            <Sparkles className="w-5 h-5 flex-shrink-0" />
                            <p>
                                Fill in the fields below to generate your post. Brand info like your logo and website will be auto-filled!
                            </p>
                        </div>

                        {/* Text Fields */}
                        {textFields.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Content</h3>
                                {textFields.map((field) => (
                                    <div key={field.id}>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium text-gray-700">
                                                {field.label}
                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                            </label>
                                            {/* Constraint Hints */}
                                            {field.constraints?.maxLength && (
                                                <span className={`text-xs ${(variables[field.id]?.length || 0) > field.constraints.maxLength!
                                                    ? 'text-red-500 font-bold'
                                                    : 'text-gray-400'
                                                    }`}>
                                                    {variables[field.id]?.length || 0}/{field.constraints.maxLength}
                                                </span>
                                            )}
                                        </div>

                                        {field.id === 'headline' || field.id === 'quote' || (field.constraints?.maxLength && field.constraints.maxLength > 60) ? (
                                            <textarea
                                                value={variables[field.id] || ""}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition resize-none ${errors[field.id]
                                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                                    : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                                    }`}
                                                placeholder={field.placeholder}
                                                rows={3}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={variables[field.id] || ""}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition ${errors[field.id]
                                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                                    : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                                    }`}
                                                placeholder={field.placeholder}
                                            />
                                        )}
                                        {/* Error Message */}
                                        {errors[field.id] && (
                                            <p className="text-red-500 text-xs mt-1 animate-in slide-in-from-left-2 fade-in">
                                                {errors[field.id]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Image Fields */}
                        {imageFields.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Images</h3>

                                    {/* Optimization Toggle */}
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={optimizeImages}
                                                onChange={(e) => setOptimizeImages(e.target.checked)}
                                                className="peer sr-only"
                                            />
                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-600 transition">
                                            {optimizeImages ? "⚡ Super HD (2560px)" : "💎 Original Quality"}
                                        </span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {imageFields.map((field) => (
                                        <div key={field.id}>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    {field.label}
                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                {/* Aspect Ratio Hint */}
                                                {field.constraints?.aspectRatio && (
                                                    <span className="text-xs text-gray-400">
                                                        Ratio: {field.constraints.aspectRatio}
                                                    </span>
                                                )}
                                            </div>

                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={el => { fileInputRefs.current[field.id] = el; }}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload(field.id, file);
                                                }}
                                                className="hidden"
                                            />

                                            {/* Upload Progress State */}
                                            {uploadProgress[field.id] !== undefined && uploadProgress[field.id] < 100 && uploadProgress[field.id] > 0 ? (
                                                <div className="w-full aspect-video bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center gap-3">
                                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                                    <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress[field.id]}%` }} />
                                                    </div>
                                                    <span className="text-xs text-gray-500 font-medium">
                                                        {uploadProgress[field.id] <= 10 ? "Optimizing..." : "Uploading HD Image..."}
                                                    </span>
                                                </div>
                                            ) : variables[field.id] ? (
                                                <div
                                                    className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden cursor-pointer group"
                                                    onClick={() => fileInputRefs.current[field.id]?.click()}
                                                >
                                                    <img
                                                        src={variables[field.id]}
                                                        alt={field.label}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                        <span className="text-white text-sm font-medium">Change Image</span>
                                                    </div>
                                                    {/* Success Indicator */}
                                                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg scale-100 transition animate-in fade-in zoom-in">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRefs.current[field.id]?.click()}
                                                    className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition"
                                                >
                                                    <ImageIcon className="w-8 h-8 text-gray-400" />
                                                    <span className="text-sm text-gray-500">{field.placeholder}</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Color Fields */}
                        {colorFields.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-purple-500" />
                                    Color Theme
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {colorFields.map((field) => (
                                        <div key={field.id} className="space-y-1">
                                            <label className="block text-xs font-medium text-gray-700">
                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            <div className="flex items-center gap-2 p-1 border rounded-lg hover:border-indigo-300 transition bg-white shadow-sm">
                                                <div className="relative w-8 h-8 flex-shrink-0">
                                                    <input
                                                        type="color"
                                                        value={variables[field.id] || '#000000'}
                                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div
                                                        className="w-full h-full rounded border border-gray-200 shadow-inner"
                                                        style={{ backgroundColor: variables[field.id] || '#000000' }}
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={variables[field.id] || ''}
                                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                    className="flex-1 min-w-0 text-xs text-gray-600 font-mono outline-none uppercase bg-transparent"
                                                    placeholder="#000000"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="h-px bg-gray-100" />
                            </div>
                        )}

                        {/* No fields case */}
                        {dataFields.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p>This template uses default values.</p>
                                <p className="text-sm mt-2">Click below to open in the editor and customize.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                            {textFields.length} text fields • {imageFields.length} images
                        </span>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        Generate Post
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
