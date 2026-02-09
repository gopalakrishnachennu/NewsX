import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, Check, AlertCircle, ArrowRight, Download, RefreshCw, Table as TableIcon, Sparkles } from "lucide-react";
import { ParsedData, parseFile, suggestMapping } from "@/lib/utils/csv-parser";
import { TemplateConfig } from "@/lib/templates";
import { BulkRenderService } from "@/lib/services/bulk-render-service";
import { BulkDataEditor } from "../bulk/bulk-data-editor";

interface BulkGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: TemplateConfig;
    onGenerate: (data: ParsedData, mapping: Record<string, string>) => Promise<void>;
}

export function BulkGenerateModal({ isOpen, onClose, template, onGenerate }: BulkGenerateModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [mode, setMode] = useState<'csv' | 'manual'>('manual');
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);

    // Initial Manual Data Setup
    const handleManualDataChange = (data: ParsedData) => {
        setParsedData(data);
        // In manual mode, keys match IDs, so mapping is identity
        const map: Record<string, string> = {};
        template.dataFields.forEach(f => map[f.id] = f.id);
        setMapping(map);
    };

    const handleFileUpload = async (uploadedFile: File) => {
        try {
            setFile(uploadedFile);
            setIsProcessing(true);
            const data = await parseFile(uploadedFile);
            setParsedData(data);
            setMode('csv');

            // Auto-suggest mapping
            const suggested = suggestMapping(
                data.headers,
                template.dataFields.map(f => ({ id: f.id, label: f.label }))
            );
            setMapping(suggested);

            setStep(2);
        } catch (error) {
            console.error(error);
            alert("Failed to parse file");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMappingChange = (fieldId: string, header: string) => {
        setMapping(prev => ({
            ...prev,
            [fieldId]: header
        }));
    };

    const handleGenerate = async () => {
        if (!parsedData) return;
        setIsProcessing(true);
        try {
            await onGenerate(parsedData, mapping);
        } catch (error) {
            console.error(error);
            // Show the user the actual error message from the service
            alert((error as Error).message || "Generation failed");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                                Bulk Generate
                            </h2>
                            <p className="text-sm text-gray-500">
                                {mode === 'manual' ? "Enter your content in the table below" : "Map your CSV columns"}
                            </p>
                        </div>
                        <div className="flex bg-gray-200 rounded-lg p-1 mr-4">
                            <button
                                onClick={() => { setMode('manual'); setStep(1); }}
                                className={`px - 3 py - 1.5 rounded - md text - sm font - medium transition ${mode === 'manual' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'} `}
                            >
                                Manual Entry
                            </button>
                            <button
                                onClick={() => { setMode('csv'); setStep(1); }}
                                className={`px - 3 py - 1.5 rounded - md text - sm font - medium transition ${mode === 'csv' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'} `}
                            >
                                Upload CSV
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-hidden bg-gray-50/30 p-6 flex flex-col">

                        {mode === 'manual' && (
                            <BulkDataEditor
                                template={template}
                                onDataChange={handleManualDataChange}
                            />
                        )}

                        {mode === 'csv' && step === 1 && (
                            <div className="h-full border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-4 hover:border-indigo-500 hover:bg-indigo-50/50 transition cursor-pointer bg-white"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFileUpload(file);
                                }}
                            >
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <Upload className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-900">Upload CSV or JSON</h3>
                                    <p className="text-gray-500 mt-1">Drag & drop or click to browse</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".csv,.json"
                                    className="hidden"
                                    id="bulk-upload"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(file);
                                    }}
                                />
                                <label
                                    htmlFor="bulk-upload"
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition cursor-pointer"
                                >
                                    Select File
                                </label>
                            </div>
                        )}

                        {mode === 'csv' && step === 2 && parsedData && (
                            <div className="h-full overflow-y-auto bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-6">
                                    <FileText className="w-4 h-4" />
                                    <span>Found <strong>{parsedData.totalRows} rows</strong> in {file?.name}</span>
                                </div>

                                <div className="space-y-4">
                                    {template.dataFields.map(field => (
                                        <div key={field.id} className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition">
                                            <div className="flex items-center gap-3">
                                                <div className={`w - 3 h - 3 rounded - full ${mapping[field.id] ? 'bg-green-500' : 'bg-gray-300'} `} />
                                                <div>
                                                    <div className="font-medium text-gray-900">{field.label}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{field.id}</div>
                                                </div>
                                            </div>

                                            <ArrowRight className="w-4 h-4 text-gray-300" />

                                            <div>
                                                <select
                                                    value={mapping[field.id] || ""}
                                                    onChange={(e) => handleMappingChange(field.id, e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                >
                                                    <option value="">-- Select Column --</option>
                                                    {parsedData.headers.map(header => (
                                                        <option key={header} value={header}>{header}</option>
                                                    ))}
                                                </select>
                                                {mapping[field.id] && parsedData.rows.length > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                                                        e.g. {parsedData.rows[0][mapping[field.id]]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between flex-shrink-0">
                        {mode === 'csv' && step === 2 ? (
                            <button onClick={() => setStep(1)} className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition">
                                Back
                            </button>
                        ) : (
                            <button onClick={onClose} className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition">
                                Cancel
                            </button>
                        )}

                        {(mode === 'manual' || (mode === 'csv' && step === 2)) && (
                            <button
                                onClick={handleGenerate}
                                disabled={isProcessing || !parsedData}
                                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        Generate {parsedData?.totalRows || 0} Posts
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
