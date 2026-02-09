"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (date: Date) => Promise<void>;
    currentScheduledDate?: Date;
}

export function ScheduleModal({ isOpen, onClose, onSchedule, currentScheduledDate }: ScheduleModalProps) {
    // Default to tomorrow at 9 AM if no date set
    const getDefaultDate = () => {
        if (currentScheduledDate) return currentScheduledDate;
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
    };

    // Format date for datetime-local input (YYYY-MM-DDThh:mm)
    const formatDateForInput = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    const [selectedDate, setSelectedDate] = useState<string>(formatDateForInput(getDefaultDate()));
    const [isScheduling, setIsScheduling] = useState(false);

    const handleSchedule = async () => {
        if (!selectedDate) return;
        setIsScheduling(true);
        try {
            await onSchedule(new Date(selectedDate));
            onClose();
        } catch (error) {
            console.error("Scheduling failed", error);
        } finally {
            setIsScheduling(false);
        }
    };

    if (!isOpen) return null;

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
                    className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                >
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                Schedule Post
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Date & Time
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="datetime-local"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                                        min={formatDateForInput(new Date())}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Post will be automatically published at this time.
                                </p>
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-xl flex gap-3 items-start border border-indigo-100">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Send className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-indigo-900">Auto-Publish Enabled</h4>
                                    <p className="text-xs text-indigo-700 mt-1">
                                        We'll handle the posting to your connected accounts.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSchedule}
                                disabled={isScheduling}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                {isScheduling ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Scheduling...
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="w-4 h-4" />
                                        Confirm Schedule
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
