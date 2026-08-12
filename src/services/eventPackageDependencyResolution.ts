import type {
  EventPackage,
  EventPackageValidationIssue
} from '../types/eventPackage';

const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-[A-Za-z0-9.-]+)?$/;
const supportedRangePattern = /^(\^|~)?(\d+)\.(\d+)\.(\d+)$/;

function blocking(code: string, path: string, messageAr: string): EventPackageValidationIssue {
  return { code, path, messageAr, severity: 'blocking' };
}

function parseVersion(value: string): [number, number, number] | null {
  const match = semverPattern.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function isSupportedEventPackageVersionRange(value: string): boolean {
  return supportedRangePattern.test(value);
}

export function eventPackageVersionSatisfies(version: string, range: string): boolean {
  const versionParts = parseVersion(version);
  const rangeMatch = supportedRangePattern.exec(range);
  if (!versionParts || !rangeMatch) return false;
  const requested: [number, number, number] = [
    Number(rangeMatch[2]),
    Number(rangeMatch[3]),
    Number(rangeMatch[4])
  ];
  const operator = rangeMatch[1] ?? '';
  if (!operator) return versionParts.every((part, index) => part === requested[index]);
  if (versionParts[0] !== requested[0]) return false;
  if (operator === '~' && versionParts[1] !== requested[1]) return false;
  if (operator === '^' && requested[0] === 0 && versionParts[1] !== requested[1]) return false;
  if (operator === '^' && requested[0] === 0 && requested[1] === 0 && versionParts[2] !== requested[2]) return false;
  const versionNumber = versionParts[0] * 1_000_000 + versionParts[1] * 1_000 + versionParts[2];
  const requestedNumber = requested[0] * 1_000_000 + requested[1] * 1_000 + requested[2];
  return versionNumber >= requestedNumber;
}

export function validateEventPackageDependencies(
  eventPackage: EventPackage,
  catalogPackages: Iterable<EventPackage> = []
): EventPackageValidationIssue[] {
  const issues: EventPackageValidationIssue[] = [];
  const catalog = new Map<string, EventPackage>();
  for (const candidate of catalogPackages) {
    if (!catalog.has(candidate.packageId)) catalog.set(candidate.packageId, candidate);
  }
  catalog.set(eventPackage.packageId, eventPackage);
  const dependencyIds = eventPackage.dependencies.map((dependency) => dependency.packageId);
  const seen = new Set<string>();
  dependencyIds.forEach((packageId, index) => {
    if (seen.has(packageId)) {
      issues.push(blocking(
        'duplicate-package-dependency',
        `$.dependencies[${index}].packageId`,
        `اعتماد الحزمة ${packageId} مكرر ولا يمكن حله بشكل حتمي.`
      ));
    }
    seen.add(packageId);
  });

  eventPackage.dependencies.forEach((dependency, index) => {
    const path = `$.dependencies[${index}]`;
    if (dependency.packageId === eventPackage.packageId) {
      issues.push(blocking('package-self-dependency', `${path}.packageId`, 'لا يمكن أن تعتمد حزمة الفعالية على نفسها.'));
      return;
    }
    if (!isSupportedEventPackageVersionRange(dependency.versionRange)) {
      issues.push(blocking(
        'unsupported-package-version-range',
        `${path}.versionRange`,
        'نطاق إصدار الاعتماد غير مدعوم؛ استخدم إصداراً دلالياً دقيقاً أو بادئة ^ أو ~ فقط.'
      ));
      return;
    }
    const resolved = catalog.get(dependency.packageId);
    if (!resolved) {
      issues.push(blocking(
        'missing-package-dependency',
        `${path}.packageId`,
        `الاعتماد ${dependency.packageId} غير موجود في كتالوج الحزم المحلي المقدم.`
      ));
      return;
    }
    if (!eventPackageVersionSatisfies(resolved.packageVersion, dependency.versionRange)) {
      issues.push(blocking(
        'package-dependency-version-mismatch',
        `${path}.versionRange`,
        `إصدار الحزمة ${dependency.packageId} لا يطابق النطاق المطلوب ${dependency.versionRange}.`
      ));
    }
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (packageId: string, ancestry: string[]): void => {
    if (visited.has(packageId)) return;
    if (visiting.has(packageId)) {
      const cycleStart = ancestry.indexOf(packageId);
      const cycle = [...ancestry.slice(Math.max(0, cycleStart)), packageId];
      issues.push(blocking(
        'package-dependency-cycle',
        '$.dependencies',
        `توجد دورة اعتماد بين الحزم المحلية: ${cycle.join(' ← ')}.`
      ));
      return;
    }
    const candidate = catalog.get(packageId);
    if (!candidate) return;
    visiting.add(packageId);
    candidate.dependencies.forEach((dependency) => {
      if (catalog.has(dependency.packageId)) visit(dependency.packageId, [...ancestry, packageId]);
    });
    visiting.delete(packageId);
    visited.add(packageId);
  };
  visit(eventPackage.packageId, []);
  return issues;
}
