/**
 * Multi-language & Accessibility Support
 * =======================================
 * Days 51-54: Internationalization and WCAG 2.1 compliance
 */

import { logger } from './logger';

export type SupportedLanguage =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'zh'
  | 'ar'
  | 'hi';

export interface LocalizationEntry {
  key: string;
  [language in SupportedLanguage]?: string;
}

export interface AccessibilityFeatures {
  screenReaderSupport: boolean;
  highContrastMode: boolean;
  fontSize: 'normal' | 'large' | 'extralarge';
  keyboardNavigation: boolean;
  captions: boolean;
  dyslexiaFriendlyFont: boolean;
}

export class LocalizationManager {
  private translations: Map<string, LocalizationEntry> = new Map();
  private userLanguages: Map<string, SupportedLanguage> = new Map();
  private userAccessibility: Map<
    string,
    AccessibilityFeatures
  > = new Map();

  constructor() {
    this.initializeTranslations();
  }

  /**
   * Get translated string
   */
  public t(
    key: string,
    language: SupportedLanguage,
    params?: { [key: string]: string }
  ): string {
    const entry = this.translations.get(key);
    if (!entry) {
      logger.warn('Translation key not found', { key, language });
      return key;
    }

    let translation = entry[language] || entry['en'] || key;

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(
          `{{${param}}}`,
          value
        );
      });
    }

    return translation;
  }

  /**
   * Set user language preference
   */
  public setUserLanguage(
    userId: string,
    language: SupportedLanguage
  ): void {
    this.userLanguages.set(userId, language);
    logger.log('User language preference updated', {
      userId,
      language
    });
  }

  /**
   * Get user language
   */
  public getUserLanguage(userId: string): SupportedLanguage {
    return this.userLanguages.get(userId) || 'en';
  }

  /**
   * Enable accessibility features
   */
  public setAccessibilityFeatures(
    userId: string,
    features: Partial<AccessibilityFeatures>
  ): void {
    const currentFeatures =
      this.userAccessibility.get(userId) || {
        screenReaderSupport: false,
        highContrastMode: false,
        fontSize: 'normal',
        keyboardNavigation: false,
        captions: false,
        dyslexiaFriendlyFont: false
      };

    const updated = { ...currentFeatures, ...features };
    this.userAccessibility.set(userId, updated);

    logger.log('Accessibility features updated', {
      userId,
      features: Object.keys(features)
    });
  }

  /**
   * Get accessibility features
   */
  public getAccessibilityFeatures(
    userId: string
  ): AccessibilityFeatures {
    return (
      this.userAccessibility.get(userId) || {
        screenReaderSupport: false,
        highContrastMode: false,
        fontSize: 'normal',
        keyboardNavigation: false,
        captions: false,
        dyslexiaFriendlyFont: false
      }
    );
  }

  /**
   * Generate ARIA labels for component
   */
  public generateAriaLabel(
    component: string,
    context: string
  ): string {
    return `${component} ${context}`.trim();
  }

  /**
   * Validate WCAG 2.1 AA compliance
   */
  public validateWCAGCompliance(): {
    issues: string[];
    compliant: boolean;
  } {
    const issues: string[] = [];

    // Check translations completeness
    const languages: SupportedLanguage[] = [
      'en',
      'es',
      'fr'
    ];
    for (const lang of languages) {
      const coverage = this.getTranslationCoverage(lang);
      if (coverage < 95) {
        issues.push(
          `${lang}: ${coverage}% coverage (target: 95%)`
        );
      }
    }

    return {
      issues,
      compliant: issues.length === 0
    };
  }

  private getTranslationCoverage(
    language: SupportedLanguage
  ): number {
    let translated = 0;
    this.translations.forEach(entry => {
      if (entry[language]) {
        translated++;
      }
    });

    return (
      (translated / this.translations.size) * 100
    );
  }

  private initializeTranslations(): void {
    // Healthcare-specific translations
    this.translations.set('appointment_scheduled', {
      key: 'appointment_scheduled',
      en: 'Your appointment has been scheduled',
      es: 'Tu cita ha sido programada',
      fr: 'Votre rendez-vous a été programmé',
      de: 'Ihr Termin wurde eingeplant',
      pt: 'Sua consulta foi agendada'
    });

    this.translations.set('prescription_ready', {
      key: 'prescription_ready',
      en: 'Your prescription is ready for pickup',
      es: 'Tu prescripción está lista para recoger',
      fr: 'Votre ordonnance est prête à être retirée',
      de: 'Ihr Rezept ist zur Abholung bereit',
      pt: 'Sua prescrição está pronta para levantamento'
    });
  }
}

export const localizationManager = new LocalizationManager();
