"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Link2,
    Unlink,
    Type as TypeIcon,
    Image as ImageIcon,
    Palette,
    AlertCircle,
    Check,
    Hash,
    Sparkles
} from "lucide-react";
import { SYSTEM_VARIABLES } from "@/lib/variables";

export interface BindConfig {
    fieldId: string;
    label: string;
    placeholder: string;
    required: boolean;
    defaultValue?: string;
    fieldType: 'text' | 'image' | 'color';
    constraints?: {
        minLength?: number;
        maxLength?: number;
        minWidth?: number;
        minHeight?: number;
        aspectRatio?: string;
    };
}

interface BindFieldPanelProps {
    isOpen: boolean;
    onClose: () => void;
    elementId: string;
    elementName: string;
    elementType: 'text' | 'image' | 'shape';
    currentConfig?: BindConfig | null;
    onSave: (config: BindConfig | null) => void;
}

export function BindFieldPanel({
    isOpen,
    onClose,
    elementId,
    elementName,
    elementType,
    currentConfig,
    onSave,
}: BindFieldPanelProps) {
    const [isBindable, setIsBindable] = useState(!!currentConfig);
    const [label, setLabel] = useState(currentConfig?.label || elementName || '');
    const [placeholder, setPlaceholder] = useState(currentConfig?.placeholder || '');
    const [defaultValue, setDefaultValue] = useState(currentConfig?.defaultValue || '');
    const [required, setRequired] = useState(currentConfig?.required ?? true);
    const [fieldType, setFieldType] = useState<'text' | 'image' | 'color'>(
        currentConfig?.fieldType || (elementType === 'image' ? 'image' : 'text')
    );

    // Constraints
    const [minLength, setMinLength] = useState(currentConfig?.constraints?.minLength || 0);
    const [maxLength, setMaxLength] = useState(currentConfig?.constraints?.maxLength || 500);
    const [aspectRatio, setAspectRatio] = useState(currentConfig?.constraints?.aspectRatio || '');
    const [showConstraints, setShowConstraints] = useState(false);

    // Reset form when element changes
    useEffect(() => {
        setIsBindable(!!currentConfig);
        setLabel(currentConfig?.label || elementName || '');
        setPlaceholder(currentConfig?.placeholder || '');
        setDefaultValue(currentConfig?.defaultValue || '');
        setRequired(currentConfig?.required ?? true);
        setFieldType(currentConfig?.fieldType || (elementType === 'image' ? 'image' : 'text'));
        setMinLength(currentConfig?.constraints?.minLength || 0);
        setMaxLength(currentConfig?.constraints?.maxLength || 500);
        setAspectRatio(currentConfig?.constraints?.aspectRatio || '');
    }, [currentConfig, elementName, elementType]);

    const handleSave = () => {
        if (!isBindable) {
            onSave(null);
        } else {
            onSave({
                fieldId: `field-${elementId}`,
                label,
                placeholder,
                defaultValue,
                required,
                fieldType,
                constraints: {
                    ...(fieldType === 'text' ? {
                        minLength: minLength > 0 ? minLength : undefined,
                        maxLength: maxLength < 500 ? maxLength : undefined,
                    } : {}),
                    ...(fieldType === 'image' ? {
                        aspectRatio: aspectRatio || undefined,
                    } : {})
                },
            });
        }
        onClose();
    };

    const handleRemoveBinding = () => {
        setIsBindable(false);
        onSave(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-0 top-0 h-full w-80 bg-[#1a1a2e] border-l border-gray-700 shadow-xl z-50 flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-white font-medium">Bind Field</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Element Info */}
                    <div className="bg-gray-800/50 rounded-xl p-3">
                        <div className="text-gray-400 text-xs mb-1">Element</div>
                        <div className="text-white font-medium flex items-center gap-2">
                            {elementType === 'text' && <TypeIcon className="w-4 h-4 text-blue-400" />}
                            {elementType === 'image' && <ImageIcon className="w-4 h-4 text-green-400" />}
                            {elementType === 'shape' && <Palette className="w-4 h-4 text-purple-400" />}
                            {elementName}
                        </div>
                    </div>

                    {/* Enable Binding Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                        <div>
                            <div className="text-white text-sm font-medium">User Fillable</div>
                            <div className="text-gray-400 text-xs">Users will input this value</div>
                        </div>
                        <button
                            onClick={() => setIsBindable(!isBindable)}
                            className={`w-12 h-6 rounded-full transition-colors ${isBindable ? 'bg-indigo-600' : 'bg-gray-600'
                                }`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isBindable ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                        </button>
                    </div>

                    {isBindable && (
                        <>
                            {/* Field Label */}
                            <div>
                                <label className="block text-gray-400 text-xs mb-1.5">
                                    Field Label <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="e.g., Your Headline"
                                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition text-sm"
                                />
                                <div className="text-gray-500 text-xs mt-1">
                                    Shown to users in the fill form
                                </div>
                            </div>

                            {/* Data Key (For CSV/JSON Mapping) */}
                            <div>
                                <label className="flex items-center gap-1.5 text-gray-400 text-xs mb-1.5">
                                    <Hash className="w-3 h-3 text-emerald-400" />
                                    Data Key <span className="text-xs text-gray-500">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={elementId.replace('field-', '')} // This is a hack, ideally we store a separate key
                                    readOnly
                                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 text-sm font-mono cursor-not-allowed"
                                    title="This ID is auto-generated. Use this header in your CSV file."
                                />
                                <div className="text-gray-500 text-[10px] mt-1">
                                    Match this ID in your CSV/JSON file to auto-map data.
                                </div>
                            </div>

                            {/* Placeholder */}
                            <div>
                                <label className="block text-gray-400 text-xs mb-1.5">
                                    Placeholder Text
                                </label>
                                <input
                                    type="text"
                                    value={placeholder}
                                    onChange={(e) => setPlaceholder(e.target.value)}
                                    placeholder="e.g., Enter your inspiring quote..."
                                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition text-sm"
                                />
                            </div>

                            {/* Default Value & Variables */}
                            <div>
                                <label className="flex items-center gap-1.5 text-gray-400 text-xs mb-1.5">
                                    <Sparkles className="w-3 h-3 text-indigo-400" />
                                    Default Smart Value
                                </label>
                                <input
                                    type="text"
                                    value={defaultValue}
                                    onChange={(e) => setDefaultValue(e.target.value)}
                                    placeholder="Enter text or pick variable..."
                                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition text-sm font-mono"
                                />
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {SYSTEM_VARIABLES.filter(v => {
                                        if (fieldType === 'color') return v.key.includes('color');
                                        if (fieldType === 'image') return v.key.includes('logo');
                                        return !v.key.includes('color') && !v.key.includes('logo');
                                    }).map(v => (
                                        <button
                                            key={v.key}
                                            onClick={() => setDefaultValue(prev => prev + `{{${v.key}}}`)}
                                            className="px-2 py-1 bg-gray-700 hover:bg-indigo-900/40 hover:text-indigo-300 hover:border-indigo-500/50 rounded text-[10px] text-gray-300 transition border border-gray-600"
                                            title={v.label}
                                        >
                                            {v.key}
                                        </button>
                                    ))}
                                </div>
                                <div className="text-gray-500 text-[10px] mt-1.5">
                                    Use variables to auto-fill data from user/brand profile.
                                </div>
                            </div>

                            {/* Field Type */}
                            <div>
                                <label className="block text-gray-400 text-xs mb-1.5">
                                    Input Type
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setFieldType('text')}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition ${fieldType === 'text'
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        <TypeIcon className="w-5 h-5" />
                                        <span className="text-xs">Text</span>
                                    </button>
                                    <button
                                        onClick={() => setFieldType('image')}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition ${fieldType === 'image'
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                        <span className="text-xs">Image</span>
                                    </button>
                                    <button
                                        onClick={() => setFieldType('color')}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition ${fieldType === 'color'
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        <Palette className="w-5 h-5" />
                                        <span className="text-xs">Color</span>
                                    </button>
                                </div>
                            </div>

                            {/* Required Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-400" />
                                    <span className="text-white text-sm">Required field</span>
                                </div>
                                <button
                                    onClick={() => setRequired(!required)}
                                    className={`w-10 h-5 rounded-full transition-colors ${required ? 'bg-amber-500' : 'bg-gray-600'
                                        }`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${required ? 'translate-x-5' : 'translate-x-0.5'
                                        }`} />
                                </button>
                            </div>

                            {/* Text Constraints */}
                            {fieldType === 'text' && (
                                <div>
                                    <button
                                        onClick={() => setShowConstraints(!showConstraints)}
                                        className="flex items-center gap-2 text-gray-400 text-sm hover:text-white transition"
                                    >
                                        <Hash className="w-4 h-4" />
                                        {showConstraints ? 'Hide' : 'Show'} character limits
                                    </button>

                                    {showConstraints && (
                                        <div className="mt-3 grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-gray-500 text-xs mb-1">Min chars</label>
                                                <input
                                                    type="number"
                                                    value={minLength}
                                                    onChange={(e) => setMinLength(parseInt(e.target.value) || 0)}
                                                    min={0}
                                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-gray-500 text-xs mb-1">Max chars</label>
                                                <input
                                                    type="number"
                                                    value={maxLength}
                                                    onChange={(e) => setMaxLength(parseInt(e.target.value) || 500)}
                                                    min={1}
                                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Image Constraints */}
                            {fieldType === 'image' && (
                                <div>
                                    <label className="block text-gray-400 text-xs mb-1.5">
                                        Aspect Ratio Constraint
                                    </label>
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white outline-none text-sm focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="">No Constraint (Free)</option>
                                        <option value="1:1">Square (1:1)</option>
                                        <option value="4:5">Portrait (4:5)</option>
                                        <option value="16:9">Landscape (16:9)</option>
                                        <option value="9:16">Story (9:16)</option>
                                    </select>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 space-y-2">
                    {currentConfig && (
                        <button
                            onClick={handleRemoveBinding}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition text-sm font-medium"
                        >
                            <Unlink className="w-4 h-4" />
                            Remove Binding
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isBindable && !label.trim()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                    >
                        <Check className="w-4 h-4" />
                        {isBindable ? 'Save Binding' : 'Close'}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
