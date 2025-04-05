/**
 * Bundle Size Optimization & Code Splitting
 * ============================================
 * Days 10-11: Reduce frontend bundle and improve load times
 */

import fs from 'fs';
import path from 'path';

export interface BundleAnalysis {
  totalSize: number;
  chunks: Array<{
    name: string;
    size: number;
    sizeKB: string;
    percentage: number;
    canBeOptimized: boolean;
    suggestions: string[];
  }>;
  opportunities: string[];
}

export class BundleOptimizer {
  private bundleDir: string;

  constructor(bundleDir: string) {
    this.bundleDir = bundleDir;
  }

  /**
   * Analyze bundle composition
   */
  public analyzeBundleSize(): BundleAnalysis {
    const chunks: BundleAnalysis['chunks'] = [];
    let totalSize = 0;

    // Mock analysis - in production would read actual build output
    const mockChunks = [
      {
        name: 'next-framework',
        size: 185000,
        canBeOptimized: false,
        suggestions: []
      },
      {
        name: 'react-vendor',
        size: 142000,
        canBeOptimized: false,
        suggestions: []
      },
      {
        name: 'appwrite-sdk',
        size: 98000,
        canBeOptimized: true,
        suggestions: [
          'Tree-shake unused modules',
          'Use dynamic imports for optional features'
        ]
      },
      {
        name: 'ui-components',
        size: 256000,
        canBeOptimized: true,
        suggestions: [
          'Remove unused Shadcn components',
          'Split large component files',
          'Lazy load heavy components'
        ]
      },
      {
        name: 'form-validation',
        size: 87000,
        canBeOptimized: true,
        suggestions: [
          'Defer Zod validation to server',
          'Use lightweight alternatives for client validation'
        ]
      },
      {
        name: 'charts-library',
        size: 156000,
        canBeOptimized: true,
        suggestions: [
          'Move to dynamic import with suspense',
          'Consider lighter charting library'
        ]
      },
      {
        name: 'utilities',
        size: 78000,
        canBeOptimized: true,
        suggestions: [
          'Remove dead code',
          'Tree-shake lodash',
          'Use native alternatives'
        ]
      },
      {
        name: 'styles',
        size: 45000,
        canBeOptimized: true,
        suggestions: [
          'Purge unused CSS',
          'Use CSS variables for theming',
          'Extract critical CSS'
        ]
      }
    ];

    mockChunks.forEach(chunk => {
      totalSize += chunk.size;
      chunks.push({
        name: chunk.name,
        size: chunk.size,
        sizeKB: `${(chunk.size / 1024).toFixed(1)} KB`,
        percentage: 0,
        canBeOptimized: chunk.canBeOptimized,
        suggestions: chunk.suggestions
      });
    });

    // Calculate percentages
    chunks.forEach(chunk => {
      chunk.percentage = Math.round(
        (chunk.size / totalSize) * 100
      );
    });

    const opportunities = this.identifyOptimizations(chunks);

    return {
      totalSize,
      chunks: chunks.sort((a, b) => b.size - a.size),
      opportunities
    };
  }

  private identifyOptimizations(chunks: BundleAnalysis['chunks']): string[] {
    const opportunities: string[] = [];

    const largeChunks = chunks.filter(c => c.percentage > 20);
    if (largeChunks.length > 0) {
      opportunities.push(
        `${largeChunks.map(c => c.name).join(', ')} are large chunks - consider code splitting`
      );
    }

    const optimizableSize = chunks
      .filter(c => c.canBeOptimized)
      .reduce((sum, c) => sum + c.size, 0);
    const savingsPotential = (
      (optimizableSize / chunks.reduce((sum, c) => sum + c.size, 0)) *
      100
    ).toFixed(1);
    opportunities.push(
      `Potential ${savingsPotential}% bundle size reduction through optimizations`
    );

    if (chunks.some(c => c.name.includes('vendor'))) {
      opportunities.push(
        'Review vendor dependencies - consider webpack-bundle-analyzer'
      );
    }

    return opportunities;
  }

  /**
   * Code splitting strategy
   */
  public getCodeSplittingStrategy(): {
    [key: string]: string[];
  } {
    return {
      'Main Bundle': [
        'Next.js framework core',
        'React core',
        'Layout components',
        'Navigation'
      ],
      'Vendor Bundle': [
        'Third-party libraries (split by size)',
        'Authentication utilities',
        'Logging'
      ],
      'Patient Portal Chunk': [
        'Patient dashboard',
        'Appointment booking',
        'Medical records',
        'Prescriptions'
      ],
      'Doctor Dashboard Chunk': [
        'Doctor dashboard',
        'Patient management',
        'Appointment management',
        'Prescription management'
      ],
      'Admin Chunk': [
        'Admin dashboard',
        'User management',
        'System settings',
        'Analytics'
      ],
      'Lazy-loaded Components': [
        'Charts and data visualization',
        'File uploads',
        'Complex modals',
        'Rich text editors'
      ]
    };
  }

  /**
   * Generate optimization report
   */
  public generateOptimizationReport(): string {
    const analysis = this.analyzeBundleSize();

    let report = `# Bundle Optimization Report\n\n`;
    report += `## Overall Size\n`;
    report +=
      `Total Bundle Size: ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB\n\n`;

    report += `## Top Chunks\n`;
    analysis.chunks.slice(0, 5).forEach(chunk => {
      report += `- **${chunk.name}**: ${chunk.sizeKB} (${chunk.percentage}%)\n`;
    });

    report += `\n## Optimization Opportunities\n`;
    analysis.opportunities.forEach(opp => {
      report += `- ${opp}\n`;
    });

    report += `\n## Recommended Actions\n`;
    report += `1. Implement dynamic imports for heavy components\n`;
    report += `2. Move validation to server-side where possible\n`;
    report += `3. Review and remove unused dependencies\n`;
    report += `4. Implement aggressive code splitting by route\n`;
    report += `5. Consider alternative lighter libraries for charts\n`;

    return report;
  }
}

/**
 * Next.js configuration optimization
 */
export const nextConfigOptimizations = {
  compression: {
    enabled: true,
    algorithm: 'gzip',
    threshold: 1024
  },
  imageOptimization: {
    enabled: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    caching: 'public, max-age=31536000, immutable'
  },
  swc: {
    minified: true,
    jscTarget: 'esnext',
    loose: false
  },
  preloadFonts: true,
  enableProfiling: false,
  enableSourceMaps: false
};
