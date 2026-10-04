import type { Project, User } from './types';

export type ClientProperty = { projectSlug: string; lotRef: string };

export function clientProperties(user: Pick<User, 'properties' | 'projectSlug' | 'lotRef'>): ClientProperty[] {
  const saved = user.properties ?? (user.projectSlug && user.lotRef ? [{ projectSlug: user.projectSlug, lotRef: user.lotRef }] : []);
  const seen = new Set<string>();
  return saved.filter(item => {
    if (!item?.projectSlug || !item?.lotRef) return false;
    const key = `${item.projectSlug}\u0000${item.lotRef}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function setClientProperties(user: User, properties: ClientProperty[]) {
  if (user.projectSlug && user.lotRef) for (const payment of user.payments ?? []) {
    if (!payment.projectSlug && !payment.lotRef) {
      payment.projectSlug = user.projectSlug;
      payment.lotRef = user.lotRef;
    }
  }
  user.properties = properties;
  user.projectSlug = properties[0]?.projectSlug;
  user.lotRef = properties[0]?.lotRef;
}

export function clientPaymentsForProperty(user: Pick<User, 'payments' | 'projectSlug' | 'lotRef'>, property?: ClientProperty) {
  if (!property) return [];
  return (user.payments ?? []).filter(payment => payment.projectSlug && payment.lotRef
    ? payment.projectSlug === property.projectSlug && payment.lotRef === property.lotRef
    : user.projectSlug === property.projectSlug && user.lotRef === property.lotRef);
}

export function resolvedClientProperties(user: Pick<User, 'properties' | 'projectSlug' | 'lotRef'>, projects: Project[]) {
  return clientProperties(user).flatMap(property => {
    const project = projects.find(item => item.slug === property.projectSlug);
    const lot = project?.lots.find(item => item.ref === property.lotRef);
    return project && lot ? [{ project, lot }] : [];
  });
}

export function selectedClientProperty(
  properties: ReturnType<typeof resolvedClientProperties>,
  selection?: { project?: string; lot?: string },
) {
  return properties.find(item => item.project.slug === selection?.project && item.lot.ref === selection?.lot) ?? properties[0];
}

export function clientPropertyQuery(projectSlug: string, lotRef: string) {
  return `?project=${encodeURIComponent(projectSlug)}&lot=${encodeURIComponent(lotRef)}`;
}
