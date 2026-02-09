/**
 * Feature Tracker - Track implementation of editor features
 * Enterprise-level feature management with logging
 */

import { logger } from '@/lib/logger';

// Feature implementation status
export type FeatureStatus = 'implemented' | 'partial' | 'planned' | 'in_progress';

// Feature definition
export interface FeatureDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
    status: FeatureStatus;
    implementedVersion?: string;
    dependencies?: string[];
    complexity: 'low' | 'medium' | 'high' | 'very_high';
}

// All editor features
export const EDITOR_FEATURES: FeatureDefinition[] = [
    // Canvas & Core Editor - P0
    { id: 'fixed_canvas', name: 'Fixed-size Canvas', description: 'Canvas with preset dimensions', category: 'canvas', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'zoom_buttons', name: 'Zoom (Buttons)', description: 'Zoom in/out with buttons', category: 'canvas', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'zoom_wheel', name: 'Mouse Wheel Zoom', description: 'Zoom with mouse wheel', category: 'canvas', priority: 'P0', status: 'in_progress', complexity: 'medium' },
    { id: 'zoom_pinch', name: 'Trackpad Pinch Zoom', description: 'Zoom with trackpad gesture', category: 'canvas', priority: 'P1', status: 'planned', complexity: 'medium' },
    { id: 'spacebar_pan', name: 'Spacebar Pan', description: 'Pan canvas with spacebar + drag', category: 'canvas', priority: 'P0', status: 'in_progress', complexity: 'medium' },
    { id: 'grid_overlay', name: 'Grid Overlay', description: 'Toggle grid visibility', category: 'canvas', priority: 'P0', status: 'in_progress', complexity: 'medium' },
    { id: 'snap_to_grid', name: 'Snap to Grid', description: 'Elements snap to grid lines', category: 'canvas', priority: 'P0', status: 'in_progress', complexity: 'high' },
    { id: 'rulers', name: 'Rulers', description: 'Horizontal and vertical rulers', category: 'canvas', priority: 'P1', status: 'planned', complexity: 'medium' },
    { id: 'guides', name: 'Draggable Guides', description: 'Custom guide lines', category: 'canvas', priority: 'P1', status: 'planned', complexity: 'high' },
    { id: 'snap_to_guides', name: 'Snap to Guides', description: 'Elements snap to guides', category: 'canvas', priority: 'P1', status: 'planned', complexity: 'high' },

    // Selection & Manipulation - P0
    { id: 'single_select', name: 'Single Select', description: 'Click to select element', category: 'selection', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'selection_box', name: 'Selection Bounding Box', description: 'Visual selection indicator', category: 'selection', priority: 'P0', status: 'implemented', complexity: 'medium', implementedVersion: '1.0.0' },
    { id: 'resize_handles', name: 'Resize Handles', description: '8 handles for resizing', category: 'selection', priority: 'P0', status: 'implemented', complexity: 'medium', implementedVersion: '1.0.0' },
    { id: 'rotation_handle', name: 'Rotation Handle', description: 'Rotate by dragging handle', category: 'selection', priority: 'P0', status: 'in_progress', complexity: 'medium' },
    { id: 'flip', name: 'Flip Horizontal/Vertical', description: 'Flip elements', category: 'selection', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'duplicate', name: 'Duplicate (Ctrl+D)', description: 'Duplicate selected element', category: 'selection', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'lock_unlock', name: 'Lock/Unlock', description: 'Prevent element editing', category: 'selection', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'visibility', name: 'Hide/Show Element', description: 'Toggle visibility', category: 'selection', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'nudge', name: 'Arrow Key Nudge', description: 'Move with arrow keys', category: 'selection', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'aspect_resize', name: 'Resize with Aspect Lock', description: 'Shift+drag to maintain ratio', category: 'selection', priority: 'P0', status: 'in_progress', complexity: 'medium' },
    { id: 'multi_select', name: 'Multi-select', description: 'Shift+click or drag box', category: 'selection', priority: 'P1', status: 'planned', complexity: 'high' },

    // Layers & Structure - P0
    { id: 'layers_panel', name: 'Layers Panel', description: 'View all layers', category: 'layers', priority: 'P0', status: 'implemented', complexity: 'medium', implementedVersion: '1.0.0' },
    { id: 'reorder_layers', name: 'Reorder Layers', description: 'Drag to reorder', category: 'layers', priority: 'P0', status: 'planned', complexity: 'medium' },
    { id: 'layer_ordering', name: 'Bring/Send Layer', description: 'Front/back ordering', category: 'layers', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'rename_layers', name: 'Rename Layers', description: 'Custom layer names', category: 'layers', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'grouping', name: 'Group/Ungroup', description: 'Group elements', category: 'layers', priority: 'P1', status: 'planned', complexity: 'high' },

    // Text System - P0
    { id: 'text_presets', name: 'Text Presets', description: 'Heading/Subheading/Body', category: 'text', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'inline_edit', name: 'Double-click Edit', description: 'Edit text on canvas', category: 'text', priority: 'P0', status: 'in_progress', complexity: 'high' },
    { id: 'font_family', name: 'Font Family Selection', description: 'Choose fonts', category: 'text', priority: 'P0', status: 'in_progress', complexity: 'medium' },
    { id: 'font_weight', name: 'Font Weight', description: 'Bold toggle', category: 'text', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'font_size', name: 'Font Size', description: 'Size control', category: 'text', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'text_align', name: 'Text Alignment', description: 'Left/Center/Right', category: 'text', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'text_color', name: 'Text Color', description: 'Color picker', category: 'text', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'text_bg', name: 'Text Background', description: 'Highlight background', category: 'text', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },

    // Export - P0
    { id: 'export_png', name: 'Export PNG', description: 'Download as PNG', category: 'export', priority: 'P0', status: 'implemented', complexity: 'medium', implementedVersion: '1.0.0' },
    { id: 'export_jpg', name: 'Export JPG', description: 'Download as JPG', category: 'export', priority: 'P0', status: 'implemented', complexity: 'low', implementedVersion: '1.0.0' },
    { id: 'undo_redo', name: 'Undo/Redo', description: 'History management', category: 'export', priority: 'P0', status: 'implemented', complexity: 'medium', implementedVersion: '1.0.0' },
    { id: 'autosave', name: 'Autosave', description: 'Auto-save to cloud', category: 'export', priority: 'P0', status: 'planned', complexity: 'medium' },
];

/**
 * Feature Tracker Class
 */
export class FeatureTracker {
    private features: Map<string, FeatureDefinition>;

    constructor() {
        this.features = new Map(EDITOR_FEATURES.map(f => [f.id, f]));

        const stats = this.getStats();
        logger.info('system', 'FeatureTracker initialized', {
            totalFeatures: this.features.size,
            implementedCount: stats.implemented,
            percentComplete: stats.percentComplete,
        });
    }

    getFeature(id: string): FeatureDefinition | undefined {
        return this.features.get(id);
    }

    isImplemented(id: string): boolean {
        const feature = this.features.get(id);
        return feature?.status === 'implemented';
    }

    getByStatus(status: FeatureStatus): FeatureDefinition[] {
        return Array.from(this.features.values()).filter(f => f.status === status);
    }

    getByPriority(priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4'): FeatureDefinition[] {
        return Array.from(this.features.values()).filter(f => f.priority === priority);
    }

    getByCategory(category: string): FeatureDefinition[] {
        return Array.from(this.features.values()).filter(f => f.category === category);
    }

    updateStatus(id: string, status: FeatureStatus, version?: string): void {
        const feature = this.features.get(id);
        if (!feature) {
            logger.warn('system', 'Feature not found', { id });
            return;
        }

        this.features.set(id, {
            ...feature,
            status,
            implementedVersion: version || feature.implementedVersion,
        });

        logger.info('system', 'Feature status updated', { id, status, version });
    }

    getStats(): {
        total: number;
        implemented: number;
        partial: number;
        inProgress: number;
        planned: number;
        percentComplete: number;
    } {
        const all = Array.from(this.features.values());
        const implemented = all.filter(f => f.status === 'implemented').length;
        const partial = all.filter(f => f.status === 'partial').length;
        const inProgress = all.filter(f => f.status === 'in_progress').length;
        const planned = all.filter(f => f.status === 'planned').length;

        return {
            total: all.length,
            implemented,
            partial,
            inProgress,
            planned,
            percentComplete: Math.round((implemented / all.length) * 100),
        };
    }

    getNextToImplement(count = 5): FeatureDefinition[] {
        const priorities = ['P0', 'P1', 'P2', 'P3', 'P4'] as const;
        const result: FeatureDefinition[] = [];

        for (const priority of priorities) {
            const planned = this.getByPriority(priority)
                .filter(f => f.status === 'planned' || f.status === 'in_progress')
                .sort((a, b) => {
                    const complexityOrder = { low: 0, medium: 1, high: 2, very_high: 3 };
                    return complexityOrder[a.complexity] - complexityOrder[b.complexity];
                });

            result.push(...planned);
            if (result.length >= count) break;
        }

        return result.slice(0, count);
    }

    generateReport(): string {
        const stats = this.getStats();
        const categories = [...new Set(EDITOR_FEATURES.map(f => f.category))];

        let report = `# Feature Implementation Report\n\n`;
        report += `**Generated:** ${new Date().toISOString()}\n\n`;
        report += `## Summary\n\n`;
        report += `| Metric | Value |\n|--------|-------|\n`;
        report += `| Total Features | ${stats.total} |\n`;
        report += `| Implemented | ${stats.implemented} |\n`;
        report += `| In Progress | ${stats.inProgress} |\n`;
        report += `| Planned | ${stats.planned} |\n`;
        report += `| Completion | ${stats.percentComplete}% |\n\n`;

        report += `## By Category\n\n`;
        for (const category of categories) {
            const catFeatures = this.getByCategory(category);
            report += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
            report += `| Feature | Status | Priority |\n|---------|--------|----------|\n`;
            for (const feature of catFeatures) {
                const statusEmoji = {
                    implemented: '✅',
                    partial: '🟡',
                    in_progress: '⏳',
                    planned: '📋',
                }[feature.status];
                report += `| ${feature.name} | ${statusEmoji} ${feature.status} | ${feature.priority} |\n`;
            }
            report += `\n`;
        }

        return report;
    }
}

// Singleton
let trackerInstance: FeatureTracker | null = null;

export function getFeatureTracker(): FeatureTracker {
    if (!trackerInstance) {
        trackerInstance = new FeatureTracker();
    }
    return trackerInstance;
}
